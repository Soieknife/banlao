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

const OCR_ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/bmp'
]);

const FIELD_KEYS = [
    'drug_name',
    'ingredients',
    'indications',
    'dosage',
    'warnings',
    'contraindications',
    'adverse_reactions',
    'storage',
    'specification',
    'package',
    'validity_period',
    'note_for_elder'
];

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
        const result = await baiduOcr.recognizePrintedText(base64);
        return { ...result, provider };
    }
    return { ok: false, error: '未配置可用的 OCR 服务', provider };
}

function normalizeText(text) {
    return String(text || '')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

function normalizeFieldText(text, maxLen = 300) {
    return normalizeText(text).slice(0, maxLen);
}

function dedupeList(list) {
    const result = [];
    for (const item of Array.isArray(list) ? list : []) {
        const value = normalizeFieldText(item, 80);
        if (!value) continue;
        if (!result.includes(value)) result.push(value);
    }
    return result;
}

function pickSection(text, labels) {
    const source = normalizeText(text);
    if (!source) return '';
    for (const label of labels) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // 增强的正则表达式，支持更多格式和字段
        const pattern = new RegExp(`(?:^|\\n)\\s*(?:【|\\[|（|\\()?\\s*${escaped}\\s*(?:】|\\]|）|\\))?\\s*[:：]?\\s*([\\s\\S]*?)(?=\\n\\s*(?:【|\\[|（|\\()?\\s*[一二三四五六七八九十0-9]*\\s*[、.)）]?\\s*(?:药品名称|通用名称|品名|成分|主要成分|功能主治|适应症|用法用量|用量用法|注意事项|禁忌|不良反应|贮藏|储藏|规格|包装|有效期|批准文号|生产企业)\\s*(?:】|\\]|）|\\))?\\s*[:：]|$)`, 'i');
        const match = source.match(pattern);
        if (match && match[1]) {
            return normalizeFieldText(match[1], 500);
        }
    }
    return '';
}

function scoreDrugNameLine(line) {
    const value = normalizeFieldText(line, 60);
    if (!value) return -999;
    let score = 0;
    if (/片|胶囊|颗粒|口服液|滴丸|滴剂|糖浆|注射液|喷雾剂|软膏|乳膏|栓|丸|散|剂|药/.test(value)) score += 6;
    if (/说明书|批准文号|生产企业|功能主治|用法用量|注意事项|禁忌/.test(value)) score -= 8;
    if (value.length >= 3 && value.length <= 24) score += 3;
    if (/^[A-Za-z0-9\s-]+$/.test(value)) score -= 2;
    return score;
}

function findLikelyDrugName(text) {
    const source = normalizeText(text);
    const lines = source.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 12);
    let best = '';
    let bestScore = -999;
    for (const line of lines) {
        const score = scoreDrugNameLine(line);
        if (score > bestScore) {
            best = line;
            bestScore = score;
        }
    }
    return bestScore > 0 ? normalizeFieldText(best, 40) : normalizeFieldText(lines[0] || '', 40);
}

function fallbackExtract(text) {
    const source = normalizeText(text);
    if (!source) {
        return {
            extracted: null,
            method: 'empty',
            parseError: 'OCR 未识别出可用文字'
        };
    }

    const extracted = {
        drug_name: pickSection(source, ['药品名称', '通用名称', '品名']) || findLikelyDrugName(source),
        ingredients: pickSection(source, ['成分', '主要成分']),
        indications: pickSection(source, ['功能主治', '适应症']),
        dosage: pickSection(source, ['用法用量', '用量用法']),
        warnings: pickSection(source, ['注意事项']),
        contraindications: pickSection(source, ['禁忌']),
        adverse_reactions: pickSection(source, ['不良反应']),
        storage: pickSection(source, ['贮藏', '储藏']),
        note_for_elder: ''
    };

    return {
        extracted,
        method: 'rule_based',
        parseError: ''
    };
}

function mergeExtracted(primary, fallback) {
    const merged = {};
    for (const key of FIELD_KEYS) {
        merged[key] = normalizeFieldText(primary && primary[key] ? primary[key] : (fallback && fallback[key] ? fallback[key] : ''), key === 'note_for_elder' ? 180 : 500);
    }
    return merged;
}

function buildSafetyAlerts(extracted) {
    const alerts = [];
    const candidates = [
        extracted.contraindications,
        extracted.warnings,
        extracted.adverse_reactions
    ].filter(Boolean).join('\n');

    const lines = normalizeText(candidates).split('\n').map((line) => line.replace(/^[0-9一二三四五六七八九十、.（）()\-\s]+/, '').trim()).filter(Boolean);
    for (const line of lines) {
        if (/禁用|禁止|慎用|过敏|肝|肾|孕妇|哺乳|儿童|老人|不良反应|不适|就医/.test(line)) {
            alerts.push(normalizeFieldText(line, 60));
        }
    }
    return dedupeList(alerts).slice(0, 4);
}

function buildUsageTips(extracted) {
    const tips = [];
    if (extracted.dosage) {
        for (const part of normalizeText(extracted.dosage).split('\n')) {
            const value = normalizeFieldText(part, 60);
            if (value) tips.push(value);
        }
    }
    if (extracted.storage) {
        tips.push(`贮藏：${normalizeFieldText(extracted.storage, 40)}`);
    }
    return dedupeList(tips).slice(0, 4);
}

function buildElderSummary(extracted, rawText) {
    if (extracted && extracted.note_for_elder) {
        return normalizeFieldText(extracted.note_for_elder, 180);
    }

    const parts = [];
    if (extracted && extracted.drug_name) parts.push(`这是${extracted.drug_name}`);
    if (extracted && extracted.indications) parts.push(`主要用于${normalizeFieldText(extracted.indications, 40)}`);
    if (extracted && extracted.dosage) parts.push(`用法用量重点看${normalizeFieldText(extracted.dosage, 38)}`);
    if (extracted && extracted.warnings) parts.push(`注意${normalizeFieldText(extracted.warnings, 34)}`);

    let summary = parts.join('，');
    if (!summary) summary = normalizeFieldText(rawText, 100);
    if (!summary) summary = '已完成说明书识别，请重点核对药名、用法用量和注意事项。';
    if (!/医嘱|就医/.test(summary)) summary += '，请按医嘱使用，如有不适及时就医。';
    return normalizeFieldText(summary, 180);
}

function finalizeExtracted(extracted, rawText) {
    const merged = mergeExtracted(extracted, fallbackExtract(rawText).extracted || {});
    const missingFields = FIELD_KEYS.filter((key) => key !== 'note_for_elder' && !merged[key]);
    const safetyAlerts = buildSafetyAlerts(merged);
    const usageTips = buildUsageTips(merged);
    const completionScore = Math.max(10, Math.round(((FIELD_KEYS.length - 1 - missingFields.length) / (FIELD_KEYS.length - 1)) * 100));
    const elderSummary = buildElderSummary(merged, rawText);

    return {
        extracted: {
            ...merged,
            safety_alerts: safetyAlerts,
            usage_tips: usageTips,
            missing_fields: missingFields,
            completion_score: completionScore
        },
        elderSummary
    };
}

async function parseLeaflet(text) {
    const extractorSystemPrompt = [
        '你是药品说明书结构化提取助手。',
        '你的唯一任务是从用户提供的药品说明书文字中提取字段，并输出严格合法的 JSON。',
        '不要输出解释、不要输出 Markdown、不要输出代码块、不要补充多余前后缀。',
        '如果某个字段无法确认，请输出空字符串。'
    ].join(' ');

    const prompt = [
        '你是一名专业的药品说明书信息提取专家，擅长从各种格式的药品说明书中准确提取关键信息。',
        '请根据用户提供的药品说明书文字，提取并整理以下信息，输出严格 JSON（不要包含任何多余文字）：',
        '{',
        '  "drug_name": "",',
        '  "ingredients": "",',
        '  "indications": "",',
        '  "dosage": "",',
        '  "warnings": "",',
        '  "contraindications": "",',
        '  "adverse_reactions": "",',
        '  "storage": "",',
        '  "specification": "",',
        '  "package": "",',
        '  "validity_period": "",',
        '  "note_for_elder": ""',
        '}',
        '',
        '提取要求：',
        '- 严格按照 JSON 格式输出，不要添加任何解释或多余文字',
        '- 如果无法确定某项信息，使用空字符串',
        '- 药品名称：优先提取通用名称，其次是商品名称',
        '- 成分：提取主要成分，包括活性成分及其含量',
        '- 功能主治/适应症：提取药品的主要治疗作用和适用范围',
        '- 用法用量：提取具体的使用方法、剂量和频率',
        '- 注意事项：提取使用时需要注意的事项',
        '- 禁忌：提取禁止使用的情况',
        '- 不良反应：提取可能出现的不良反应',
        '- 贮藏：提取存储条件和要求',
        '- 规格：提取药品的规格信息',
        '- 包装：提取包装信息',
        '- 有效期：提取有效期信息',
        '- note_for_elder：用通俗易懂的话总结给老人听，不超过 180 字，重点强调用法用量、注意事项和不适及时就医',
        '',
        '请仔细分析以下说明书文字，确保提取的信息准确完整：',
        text
    ].join('\n');

    const answer = await aiService.chat(prompt, {
        systemPrompt: extractorSystemPrompt,
        temperature: 0.1,
        maxTokens: 1400
    });
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
    if (req.file.mimetype && !OCR_ALLOWED_TYPES.has(String(req.file.mimetype).toLowerCase())) {
        return res.error('仅支持 jpg、png、webp、bmp 图片', 400);
    }

    const userId = req.user.id;
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

    try {
        const ocr = await ocrImage(req.file.buffer);
        if (!ocr.ok) {
            return res.error(ocr.error || 'OCR 失败', 501);
        }

        const rawText = normalizeText(ocr.text || '');
        if (!rawText) {
            return res.error('图片中文字识别结果为空，请重新拍摄清晰的说明书正面', 422);
        }

        const parsed = await parseLeaflet(rawText);
        const fallback = fallbackExtract(rawText);
        const finalized = finalizeExtracted(parsed.ok ? parsed.extracted : fallback.extracted, rawText);
        const extracted = finalized.extracted;
        const elderSummary = finalized.elderSummary;
        const parseStatus = parsed.ok ? 'success' : (fallback.extracted ? 'fallback' : 'failed');
        const parseMethod = parsed.ok ? 'llm+rule' : fallback.method;
        const parseError = parsed.ok ? '' : ((parsed.raw && String(parsed.raw).slice(0, 200)) || fallback.parseError || '结构化提取失败');
        const extractedJson = JSON.stringify(extracted);

        db.run(
            `INSERT INTO medication_ocr_records (user_id, image_hash, ocr_provider, raw_text, extracted_json, elder_summary, parse_status, parse_method, parse_error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, hash, ocr.provider || '', rawText, extractedJson, elderSummary, parseStatus, parseMethod, parseError],
            function(err) {
                if (err) return res.error(err.message, 500);
                res.success({
                    record_id: this.lastID,
                    image_hash: hash,
                    ocr_provider: ocr.provider || '',
                    raw_text: rawText,
                    extracted,
                    elder_summary: elderSummary,
                    parse_status: parseStatus,
                    parse_method: parseMethod,
                    parse_error: parseError,
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
        `SELECT id, image_hash, ocr_provider, created_at, parse_status, parse_method, substr(elder_summary, 1, 180) as elder_summary FROM medication_ocr_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
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
                image_hash: row.image_hash,
                created_at: row.created_at,
                ocr_provider: row.ocr_provider || '',
                raw_text: row.raw_text,
                extracted,
                elder_summary: row.elder_summary,
                parse_status: row.parse_status || '',
                parse_method: row.parse_method || '',
                parse_error: row.parse_error || ''
            });
        }
    );
});

/**
 * 通过条码查询药品信息
 * @route GET /api/medication/barcode/:barcode
 */
router.get('/barcode/:barcode', auth, (req, res) => {
    const barcode = req.params.barcode;
    
    // 模拟药品条码数据库
    const mockDrugDatabase = {
        '6901234567890': {
            drug_name: '阿莫西林胶囊',
            specification: '0.25g*24粒',
            indications: '用于敏感菌所致的感染，如中耳炎、鼻窦炎、咽炎、扁桃体炎等上呼吸道感染',
            dosage: '成人一次1-2粒，一日3次',
            warnings: '对青霉素类药物过敏者禁用',
            contraindications: '青霉素过敏者禁用',
            adverse_reactions: '可能出现皮疹、恶心、呕吐等不良反应',
            storage: '密封，在阴凉处保存',
            package: '铝塑包装',
            validity_period: '24个月'
        },
        '6901234567891': {
            drug_name: '布洛芬缓释胶囊',
            specification: '0.3g*10粒',
            indications: '用于缓解轻至中度疼痛，如头痛、关节痛、偏头痛、牙痛、肌肉痛、神经痛、痛经',
            dosage: '成人一次1粒，一日2次',
            warnings: '肝肾功能不全者慎用',
            contraindications: '对布洛芬及其他非甾体抗炎药过敏者禁用',
            adverse_reactions: '可能出现胃肠道不适、头痛、头晕等不良反应',
            storage: '密封，在阴凉处保存',
            package: '铝塑包装',
            validity_period: '36个月'
        },
        '6901234567892': {
            drug_name: '盐酸伐地那非片',
            specification: '20mg*1片',
            indications: '治疗勃起功能障碍',
            dosage: '建议剂量为10mg，在性活动前约25-60分钟服用',
            warnings: '正在使用任何形式的有机硝酸酯或NO供体药物者禁用',
            contraindications: '对伐地那非过敏者禁用',
            adverse_reactions: '可能出现头痛、潮红、鼻塞等不良反应',
            storage: '密封，在25℃以下保存',
            package: '铝塑包装',
            validity_period: '24个月'
        }
    };
    
    // 查找药品信息
    const drugInfo = mockDrugDatabase[barcode] || {
        drug_name: '未知药品',
        specification: '未知',
        indications: '未知',
        dosage: '未知',
        warnings: '未知',
        contraindications: '未知',
        adverse_reactions: '未知',
        storage: '未知',
        package: '未知',
        validity_period: '未知'
    };
    
    // 生成老人友好的说明
    const elderSummary = `这是${drugInfo.drug_name}，主要用于${drugInfo.indications}，用法用量为${drugInfo.dosage}，注意${drugInfo.warnings}，请按医嘱使用，如有不适及时就医。`;
    
    // 构建响应数据
    const response = {
        barcode: barcode,
        elder_summary: elderSummary,
        extracted: {
            drug_name: drugInfo.drug_name,
            specification: drugInfo.specification,
            indications: drugInfo.indications,
            dosage: drugInfo.dosage,
            warnings: drugInfo.warnings,
            contraindications: drugInfo.contraindications,
            adverse_reactions: drugInfo.adverse_reactions,
            storage: drugInfo.storage,
            package: drugInfo.package,
            validity_period: drugInfo.validity_period,
            safety_alerts: [drugInfo.warnings, drugInfo.contraindications].filter(Boolean),
            usage_tips: [drugInfo.dosage, drugInfo.storage].filter(Boolean),
            missing_fields: [],
            completion_score: 100
        },
        ocr_provider: 'Barcode Scanner',
        parse_status: 'success',
        parse_method: 'barcode_query'
    };
    
    res.success(response);
});

module.exports = router;
