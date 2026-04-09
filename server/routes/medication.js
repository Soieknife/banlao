const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const router = express.Router();

const db = require('../db');
const auth = require('../middleware/auth');
const settings = require('../utils/settings');
const aiService = require('../services/ai');
const baiduOcr = require('../services/ocr_baidu');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function safeJsonParse(text) {
    try {
        return { ok: true, value: JSON.parse(text) };
    } catch (e) {
        const match = String(text).match(/\{[\s\S]*\}/);
        if (!match) return { ok: false, value: null };
        try {
            return { ok: true, value: JSON.parse(match[0]) };
        } catch (e2) {
            return { ok: false, value: null };
        }
    }
}

function getOcrProvider() {
    return new Promise((resolve) => {
        settings.getSecret('OCR_PROVIDER', (err, val) => {
            if (!err && val) return resolve(String(val).trim().toLowerCase());
            resolve(String(process.env.OCR_PROVIDER || 'baidu').trim().toLowerCase());
        });
    });
}

async function ocrImage(buffer) {
    const provider = await getOcrProvider();
    const base64 = buffer.toString('base64');

    if (provider === 'baidu') {
        return baiduOcr.recognizePrintedText(base64);
    }
    return { ok: false, error: '未配置可用的 OCR 服务' };
}

async function parseLeaflet(text) {
    const prompt = [
        '你是一名药品说明书信息整理助手。',
        '请根据用户提供的药品说明书文字，提取并整理以下信息，输出严格 JSON（不要包含多余文字）：',
        '{',
        '  "drug_name": "",',
        '  "ingredients": "",',
        '  "indications": "",',
        '  "dosage": "",',
        '  "warnings": "",',
        '  "contraindications": "",',
        '  "adverse_reactions": "",',
        '  "storage": "",',
        '  "note_for_elder": ""',
        '}',
        '',
        '要求：',
        '- 如果无法确定某项，用空字符串',
        '- "note_for_elder" 用通俗易懂的话总结给老人听（不超过 180 字），避免专业术语，强调“按医嘱/不适就医”',
        '',
        '说明书文字：',
        text
    ].join('\n');

    const answer = await aiService.chat(prompt);
    const parsed = safeJsonParse(answer);
    if (parsed.ok) {
        return { ok: true, extracted: parsed.value, raw: answer };
    }
    return { ok: false, extracted: null, raw: answer };
}

router.post('/analyze_upload', auth, upload.single('image'), async (req, res) => {
    if (!req.file || !req.file.buffer) {
        return res.error('请上传图片', 400);
    }

    const userId = req.user.id;
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

    try {
        const ocr = await ocrImage(req.file.buffer);
        if (!ocr.ok) {
            return res.error(ocr.error || 'OCR 失败', 501);
        }

        const rawText = ocr.text || '';
        const parsed = await parseLeaflet(rawText);

        const extractedJson = parsed.ok ? JSON.stringify(parsed.extracted) : '';
        const elderSummary = parsed.ok ? String(parsed.extracted.note_for_elder || '') : '';

        db.run(
            `INSERT INTO medication_ocr_records (user_id, image_hash, raw_text, extracted_json, elder_summary) VALUES (?, ?, ?, ?, ?)`,
            [userId, hash, rawText, extractedJson, elderSummary],
            function(err) {
                if (err) return res.error(err.message, 500);
                res.success({
                    record_id: this.lastID,
                    image_hash: hash,
                    raw_text: rawText,
                    extracted: parsed.ok ? parsed.extracted : null,
                    elder_summary: elderSummary,
                    parse_raw: parsed.raw
                });
            }
        );
    } catch (e) {
        res.error(e.message || '解析失败', 500);
    }
});

router.get('/records', auth, (req, res) => {
    const userId = req.user.id;
    db.all(
        `SELECT id, image_hash, created_at, substr(elder_summary, 1, 180) as elder_summary FROM medication_ocr_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
        [userId],
        (err, rows) => {
            if (err) return res.error(err.message, 500);
            res.success(rows || []);
        }
    );
});

router.get('/record/:id', auth, (req, res) => {
    const id = req.params.id;
    const userId = req.user.id;
    db.get(
        `SELECT * FROM medication_ocr_records WHERE id = ? AND user_id = ? LIMIT 1`,
        [id, userId],
        (err, row) => {
            if (err) return res.error(err.message, 500);
            if (!row) return res.error('记录不存在', 404);
            let extracted = null;
            try { extracted = row.extracted_json ? JSON.parse(row.extracted_json) : null; } catch (e) {}
            res.success({
                id: row.id,
                created_at: row.created_at,
                raw_text: row.raw_text,
                extracted,
                elder_summary: row.elder_summary
            });
        }
    );
});

module.exports = router;

