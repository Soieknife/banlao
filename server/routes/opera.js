const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

/**
 * 戏曲天地 - API 路由
 */

// 获取戏曲列表（公开接口，所有人可查看）
router.get('/list', (req, res) => {
    const { category, page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let whereSql = '';
    const params = [];
    if (category) {
        whereSql = 'WHERE category = ?';
        params.push(category);
    }

    db.get(`SELECT COUNT(*) as total FROM opera_works ${whereSql}`, params, (err, countRow) => {
        if (err) {
            console.error('查询戏曲数量失败:', err.message);
            return res.error('查询失败', 500);
        }

        const total = countRow ? countRow.total : 0;
        db.all(
            `SELECT * FROM opera_works ${whereSql} ORDER BY sort_order ASC, id DESC LIMIT ? OFFSET ?`,
            [...params, Number(pageSize), offset],
            (err2, rows) => {
                if (err2) {
                    console.error('查询戏曲列表失败:', err2.message);
                    return res.error('查询失败', 500);
                }
                res.success({
                    list: rows || [],
                    total,
                    page: Number(page),
                    pageSize: Number(pageSize)
                });
            }
        );
    });
});

// 获取戏曲详情
router.get('/detail/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM opera_works WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('查询戏曲详情失败:', err.message);
            return res.error('查询失败', 500);
        }
        if (!row) {
            return res.error('戏曲不存在', 404);
        }
        res.success(row);
    });
});

// 获取戏曲分类列表
router.get('/categories', (req, res) => {
    db.all('SELECT DISTINCT category FROM opera_works WHERE category IS NOT NULL AND category != "" ORDER BY category', [], (err, rows) => {
        if (err) {
            console.error('查询戏曲分类失败:', err.message);
            return res.error('查询失败', 500);
        }
        res.success((rows || []).map(r => r.category));
    });
});

// ---- 管理接口（需要登录） ----

// 新增戏曲
router.post('/add', auth, (req, res) => {
    const { name, category, cover_url, intro, story, sort_order = 0 } = req.body;
    if (!name || !story) {
        return res.error('剧名和剧情简介不能为空', 400);
    }

    db.run(
        `INSERT INTO opera_works (name, category, cover_url, intro, story, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, category || '', cover_url || '', intro || '', story, sort_order],
        function (err) {
            if (err) {
                console.error('新增戏曲失败:', err.message);
                return res.error('新增失败', 500);
            }
            res.success({ id: this.lastID }, '新增成功');
        }
    );
});

// 修改戏曲
router.put('/update/:id', auth, (req, res) => {
    const { id } = req.params;
    const { name, category, cover_url, intro, story, sort_order } = req.body;

    db.get('SELECT id FROM opera_works WHERE id = ?', [id], (err, row) => {
        if (err) return res.error('查询失败', 500);
        if (!row) return res.error('戏曲不存在', 404);

        db.run(
            `UPDATE opera_works SET name = COALESCE(?, name), category = COALESCE(?, category),
             cover_url = COALESCE(?, cover_url), intro = COALESCE(?, intro),
             story = COALESCE(?, story), sort_order = COALESCE(?, sort_order),
             updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [name, category, cover_url, intro, story, sort_order, id],
            function (updateErr) {
                if (updateErr) {
                    console.error('修改戏曲失败:', updateErr.message);
                    return res.error('修改失败', 500);
                }
                res.success(null, '修改成功');
            }
        );
    });
});

// 删除戏曲
router.delete('/delete/:id', auth, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM opera_works WHERE id = ?', [id], function (err) {
        if (err) {
            console.error('删除戏曲失败:', err.message);
            return res.error('删除失败', 500);
        }
        if (this.changes === 0) {
            return res.error('戏曲不存在', 404);
        }
        res.success(null, '删除成功');
    });
});

module.exports = router;
