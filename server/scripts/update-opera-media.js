/**
 * 更新戏曲音频和视频地址
 * 用法: node scripts/update-opera-media.js
 *
 * 把音频/视频文件放到 server/static/opera/ 目录下
 * 然后修改下面的 mediaData 对应关系，再运行此脚本
 */
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// ========== 在这里配置每部戏曲的音频和视频 ==========
// 路径格式: /static/opera/文件名
// 文件放到 server/static/opera/ 目录下即可

const mediaData = [
    { id: 1, audio_url: '/static/opera/muguiying.mp3',   video_url: '/static/opera/muguiying.mp4'   },
    { id: 2, audio_url: '/static/opera/bawang.mp3',      video_url: '/static/opera/bawang.mp4'      },
    { id: 3, audio_url: '/static/opera/tianxianpei.mp3',  video_url: '/static/opera/tianxianpei.mp4'  },
    { id: 4, audio_url: '/static/opera/liangzhu.mp3',     video_url: '/static/opera/liangzhu.mp4'     },
    { id: 5, audio_url: '/static/opera/huawei.mp3',       video_url: '/static/opera/huawei.mp4'       },
    { id: 6, audio_url: '/static/opera/mudanting.mp3',    video_url: '/static/opera/mudanting.mp4'    },
];

// ========== 执行更新 ==========

const stmt = db.prepare('UPDATE opera_works SET audio_url = ?, video_url = ? WHERE id = ?');
let updated = 0;

mediaData.forEach(item => {
    stmt.run(item.audio_url, item.video_url, item.id, function(err) {
        if (err) {
            console.error(`更新 id=${item.id} 失败:`, err.message);
        } else if (this.changes > 0) {
            updated++;
            console.log(`[OK] id=${item.id} 音频=${item.audio_url} 视频=${item.video_url}`);
        } else {
            console.log(`[跳过] id=${item.id} 不存在`);
        }
    });
});

stmt.finalize(() => {
    console.log(`\n更新完成，共更新 ${updated} 条记录`);
    console.log('\n请确保音频/视频文件已放到 server/static/opera/ 目录下');
    db.close();
});
