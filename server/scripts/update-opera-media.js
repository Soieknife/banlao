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

// ========== 公共CDN视频资源 ==========
// 使用可公开访问的CDN链接，确保视频播放器正常工作
// 如需替换为真正的戏曲视频，修改下面的URL即可

const mediaData = [
    { id: 1, audio_url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', video_url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4' },
    { id: 2, audio_url: 'https://vjs.zencdn.net/v/oceans.mp4',                                                      video_url: 'https://vjs.zencdn.net/v/oceans.mp4' },
    { id: 3, audio_url: 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',                video_url: 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4' },
    { id: 4, audio_url: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',           video_url: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4' },
    { id: 5, audio_url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4',           video_url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4' },
    { id: 6, audio_url: 'https://www.w3schools.com/html/movie.mp4',                                                  video_url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
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
