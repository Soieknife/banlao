const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

/**
 * 防诈骗专区 - API 路由
 */

// 获取防诈骗文章列表（公开接口）
router.get('/list', (req, res) => {
    const { category, page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let whereSql = 'WHERE status = 1';
    const params = [];
    if (category) {
        whereSql += ' AND category = ?';
        params.push(category);
    }

    db.get(`SELECT COUNT(*) as total FROM anti_fraud_articles ${whereSql}`, params, (err, countRow) => {
        if (err) {
            console.error('查询防诈文章数量失败:', err.message);
            return res.error('查询失败', 500);
        }

        const total = countRow ? countRow.total : 0;
        db.all(
            `SELECT id, title, preview, category, is_top, view_count, created_at FROM anti_fraud_articles ${whereSql} ORDER BY is_top DESC, created_at DESC LIMIT ? OFFSET ?`,
            [...params, Number(pageSize), offset],
            (err2, rows) => {
                if (err2) {
                    console.error('查询防诈文章列表失败:', err2.message);
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

// 获取防诈骗文章详情
router.get('/detail/:id', (req, res) => {
    const { id } = req.params;

    // 增加阅读量
    db.run('UPDATE anti_fraud_articles SET view_count = view_count + 1 WHERE id = ?', [id]);

    db.get('SELECT * FROM anti_fraud_articles WHERE id = ? AND status = 1', [id], (err, row) => {
        if (err) {
            console.error('查询防诈文章详情失败:', err.message);
            return res.error('查询失败', 500);
        }
        if (!row) {
            return res.error('文章不存在', 404);
        }
        res.success(row);
    });
});

// 获取防诈骗分类列表
router.get('/categories', (req, res) => {
    db.all('SELECT DISTINCT category FROM anti_fraud_articles WHERE status = 1 AND category IS NOT NULL AND category != "" ORDER BY category', [], (err, rows) => {
        if (err) {
            console.error('查询防诈分类失败:', err.message);
            return res.error('查询失败', 500);
        }
        res.success((rows || []).map(r => r.category));
    });
});

// ---- 管理接口（需要登录） ----

// 新增防诈文章
router.post('/add', auth, (req, res) => {
    const { title, content, preview, tips, category, is_top = 0 } = req.body;
    if (!title || !content) {
        return res.error('标题和内容不能为空', 400);
    }

    db.run(
        `INSERT INTO anti_fraud_articles (title, content, preview, tips, category, is_top) VALUES (?, ?, ?, ?, ?, ?)`,
        [title, content, preview || '', tips || '', category || '', is_top],
        function (err) {
            if (err) {
                console.error('新增防诈文章失败:', err.message);
                return res.error('新增失败', 500);
            }
            res.success({ id: this.lastID }, '新增成功');
        }
    );
});

// 修改防诈文章
router.put('/update/:id', auth, (req, res) => {
    const { id } = req.params;
    const { title, content, preview, tips, category, is_top, status } = req.body;

    db.get('SELECT id FROM anti_fraud_articles WHERE id = ?', [id], (err, row) => {
        if (err) return res.error('查询失败', 500);
        if (!row) return res.error('文章不存在', 404);

        db.run(
            `UPDATE anti_fraud_articles SET title = COALESCE(?, title), content = COALESCE(?, content),
             preview = COALESCE(?, preview), tips = COALESCE(?, tips), category = COALESCE(?, category),
             is_top = COALESCE(?, is_top), status = COALESCE(?, status),
             updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [title, content, preview, tips, category, is_top, status, id],
            function (updateErr) {
                if (updateErr) {
                    console.error('修改防诈文章失败:', updateErr.message);
                    return res.error('修改失败', 500);
                }
                res.success(null, '修改成功');
            }
        );
    });
});

// 删除防诈文章
router.delete('/delete/:id', auth, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM anti_fraud_articles WHERE id = ?', [id], function (err) {
        if (err) {
            console.error('删除防诈文章失败:', err.message);
            return res.error('删除失败', 500);
        }
        if (this.changes === 0) {
            return res.error('文章不存在', 404);
        }
        res.success(null, '删除成功');
    });
});

module.exports = router;
