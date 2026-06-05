/**
 * 更新戏曲音频和视频地址
 * 用法: node scripts/update-opera-media.js
 *
 * 使用公共CDN视频资源，确保前端播放器可正常播放
 */
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// ========== 腾讯云COS戏曲视频资源 ==========
// 视频托管在腾讯云对象存储，通过CDN加速访问

const mediaData = [
    { id: 1, audio_url: 'https://banlao-opera-1440343950.cos.ap-beijing.myqcloud.com/opera/muguiying.mp4', video_url: 'https://banlao-opera-1440343950.cos.ap-beijing.myqcloud.com/opera/muguiying.mp4' },
    { id: 2, audio_url: 'https://banlao-opera-1440343950.cos.ap-beijing.myqcloud.com/opera/bawang.mp4',    video_url: 'https://banlao-opera-1440343950.cos.ap-beijing.myqcloud.com/opera/bawang.mp4' },
    { id: 3, audio_url: 'https://banlao-opera-1440343950.cos.ap-beijing.myqcloud.com/opera/tianxianpei.mp4', video_url: 'https://banlao-opera-1440343950.cos.ap-beijing.myqcloud.com/opera/tianxianpei.mp4' },
    { id: 4, audio_url: 'https://banlao-opera-1440343950.cos.ap-beijing.myqcloud.com/opera/liangzhu.mp4',  video_url: 'https://banlao-opera-1440343950.cos.ap-beijing.myqcloud.com/opera/liangzhu.mp4' },
    { id: 5, audio_url: 'https://banlao-opera-1440343950.cos.ap-beijing.myqcloud.com/opera/huawei.mp4',    video_url: 'https://banlao-opera-1440343950.cos.ap-beijing.myqcloud.com/opera/huawei.mp4' },
    { id: 6, audio_url: 'https://banlao-opera-1440343950.cos.ap-beijing.myqcloud.com/opera/mudanting.mp4', video_url: 'https://banlao-opera-1440343950.cos.ap-beijing.myqcloud.com/opera/mudanting.mp4' },
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
    console.log('\n已使用公共CDN视频URL，前端播放器可正常播放');
    db.close();
});
