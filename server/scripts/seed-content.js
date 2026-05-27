/**
 * 内容初始化脚本 —— 戏曲天地 & 防诈骗专区
 * 运行方式: node scripts/seed-content.js
 */
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 戏曲种子数据
const operas = [
    {
        name: '豫剧《穆桂英挂帅》',
        category: '豫剧',
        intro: '豫剧经典剧目，展现巾帼英雄的豪情壮志',
        story: '北宋年间，西夏进犯中原，宋王下旨比武选帅。穆桂英之子杨文广刀劈王伦，夺得帅印。穆桂英因对宋王刻薄寡恩深感不满，不愿挂帅出征。佘太君以国家大义相劝，穆桂英终被感动，毅然挂帅出征，大败敌军，保卫家国。全剧唱腔高亢激昂，气势磅礴，是豫剧"五大名旦"常香玉的代表剧目，深受观众喜爱。',
        sort_order: 1
    },
    {
        name: '京剧《霸王别姬》',
        category: '京剧',
        intro: '千古绝唱，京剧艺术的巅峰之作',
        story: '楚汉相争末期，项羽被刘邦大军围困于垓下，四面楚歌。项羽自知大势已去，慷慨悲歌"力拔山兮气盖世"。虞姬为不拖累项羽，在帐中舞剑后拔剑自刎。项羽突围至乌江，自觉无颜见江东父老，亦自刎而死。这段凄美的爱情故事成为千古绝唱，是梅兰芳大师的经典代表作。',
        sort_order: 2
    },
    {
        name: '黄梅戏《天仙配》',
        category: '黄梅戏',
        intro: '黄梅戏经典，七仙女与董永的爱情传说',
        story: '七仙女不甘天宫寂寞，私自下凡，与卖身葬父的孝子董永在槐荫树下相遇。二人情投意合，结为夫妻，过着男耕女织的幸福生活。好景不长，玉帝得知七仙女下凡，令其即刻返回天庭。七仙女忍痛与董永在槐荫树下含泪分别。"树上的鸟儿成双对，绿水青山带笑颜"，这段传唱不衰的旋律感动了无数观众。',
        sort_order: 3
    },
    {
        name: '越剧《梁山伯与祝英台》',
        category: '越剧',
        intro: '中国版"罗密欧与朱丽叶"，越剧四大经典之一',
        story: '祝英台女扮男装前往书院求学，途中与梁山伯结拜为兄弟。同窗三年，二人情谊深厚。英台归家后，山伯前往探访，方知英台为女儿身，二人互生情愫。然而祝父已将英台许配马家。山伯闻讯忧郁成疾，不久病逝。英台出嫁途中经过山伯坟墓，坟墓裂开，英台纵身跃入，化蝶双飞。"十八相送"与"化蝶"是最动人的段落。',
        sort_order: 4
    },
    {
        name: '评剧《花为媒》',
        category: '评剧',
        intro: '评剧经典喜剧，才子佳人的欢乐故事',
        story: '书生王俊卿与表姐李月娥相爱，但月娥之父嫌贫爱富，反对这门亲事。王母托媒婆另说张家之女张五可。五可才貌双全，但俊卿心中只有月娥，拒绝相亲。后来在丫鬟的帮助下，五可与俊卿花园相会，互生好感。最终两对有情人终成眷属。全剧轻松幽默，唱词优美，是评剧新派的代表作。',
        sort_order: 5
    },
    {
        name: '昆曲《牡丹亭》',
        category: '昆曲',
        intro: '昆曲瑰宝，"情不知所起，一往而深"',
        story: '太守之女杜丽娘深居闺阁，一日游园赏春，在梦中与书生柳梦梅相遇，一见倾心。梦醒后相思成疾，郁郁而终。三年后，柳梦梅赴京赶考，途经此地，拾得丽娘自画像，惊为天人。丽娘鬼魂与梦梅相会，终得还魂复生，二人结为夫妇。全曲文辞典雅，"原来姹紫嫣红开遍，似这般都付与断井颓垣"一折尤为动人。',
        sort_order: 6
    }
];

// 防诈骗种子数据
const articles = [
    {
        title: '警惕"养老保健品"诈骗！',
        content: '很多骗子会打着"免费体检""专家义诊""健康讲座"的旗号，向老年人推销高价保健品，声称能治病、延年益寿。他们通常会夸大保健品功效，甚至伪造病历、夸大病情，让老年人产生恐慌心理，从而购买昂贵的产品。\n\n这些所谓的"神药"往往只是普通食品或廉价保健品，成本极低却卖到几千甚至上万元。骗子还会用"限时优惠""名额有限"等话术制造紧迫感，让您来不及思考就掏钱购买。',
        preview: '骗子常打着"免费体检"的旗号推销高价保健品，成本极低却卖到几千甚至上万元...',
        tips: '保健品不是药品，不能治疗疾病！遇到推销高价保健品的情况，一定要和子女商量，不要轻易掏钱购买。正规药品请到医院或正规药房购买。',
        category: '保健品诈骗',
        is_top: 1
    },
    {
        title: '电信诈骗常见套路，老年人必看',
        content: '1. 冒充公检法诈骗：骗子自称警察、检察官或法官，说你涉嫌洗钱、贩毒等犯罪，要求你把钱转到"安全账户"进行核查。他们会伪造通缉令、法院传票等文件来吓唬你。\n\n2. 客服退款诈骗：骗子冒充网购平台客服，说你购买的商品有质量问题需要退款，诱导你点击陌生链接、下载APP或提供银行卡信息。\n\n3. 中奖诈骗：骗子说你中了大奖，需要先交"手续费""个人所得税"才能领奖，诱导你反复汇款。\n\n4. 冒充领导诈骗：骗子冒充单位领导，以各种理由要求你转账汇款。',
        preview: '冒充公检法、客服退款、中奖诈骗，这些套路要认清，牢记"不听不信不转账"...',
        tips: '公检法机关不会通过电话办案，更不会让你转账！凡是要求你转账、透露验证码的，一律是诈骗！有疑问请拨打96110全国反诈热线。',
        category: '电信诈骗',
        is_top: 1
    },
    {
        title: '"冒充熟人借钱"诈骗如何防范？',
        content: '骗子会通过盗号、换头像昵称等方式，伪装成你的子女、亲友、同事，以"急事用钱""生病住院""出车祸"等紧急理由向你借钱。\n\n很多老年人因为担心亲人来不及核实就转了账，导致被骗。骗子还会模仿亲友的说话方式，甚至用AI合成语音/视频来增加可信度。\n\n请记住：任何涉及转账的情况，务必先核实对方身份！',
        preview: '骗子伪装成子女或亲友借钱，利用您的担心心理骗钱。如何快速识破？...',
        tips: '凡是亲友在微信/QQ上借钱，一定要打电话或视频核实身份！不要仅凭文字消息就转账！可以问一些只有对方知道的问题来验证身份。',
        category: '冒充熟人'
    },
    {
        title: '投资理财骗局要当心！',
        content: '骗子常以"高收益""零风险""保本保息"为诱饵，吸引老年人投资。常见的骗局包括：\n\n1. 非法集资：以投资养老项目、养老公寓为名，承诺高额回报，实际上是庞氏骗局，用后来者的钱支付前面人的利息。\n\n2. 虚假理财：冒充银行或证券公司员工，推荐虚假理财产品，骗取投资款。\n\n3. 数字货币诈骗：打着"区块链""虚拟货币"旗号，忽悠老年人投入毕生积蓄。\n\n4. 荐股诈骗：假借"专家"名义推荐股票，收取高额"会员费"，推荐的股票往往是庄家要出货的垃圾股。',
        preview: '"高收益零风险"的投资往往是骗局，守住您的养老钱...',
        tips: '投资有风险，收益越高风险越大！凡是承诺"保本保息""高额回报"的，基本都是骗局。投资前请咨询子女或正规金融机构。',
        category: '投资理财'
    },
    {
        title: '免费领鸡蛋？小心"温情陷阱"！',
        content: '不少骗子利用老年人节俭、爱占小便宜的心理，以"免费领鸡蛋""免费领米面油""免费旅游"等方式吸引老年人参加活动。\n\n到了现场后，骗子会热情地嘘寒问暖，端茶倒水，比亲儿子还亲。在取得信任后，就开始推销高价商品、保健品，或者诱导老人签订投资合同、办理贷款。\n\n这种"温情陷阱"比直接诈骗更可怕，因为它利用的是老人的孤独感和对关爱的渴望。',
        preview: '免费鸡蛋背后是温情陷阱，骗子用"比亲儿子还亲"的方式骗取信任...',
        tips: '天上不会掉馅饼！免费的东西往往最贵。遇到陌生人过度热情要提高警惕，不要因为小恩小惠就放松防备。多和子女沟通。',
        category: '温情诈骗'
    },
    {
        title: '冒充"社保局"来电？当心诈骗！',
        content: '骗子冒充社保局工作人员，声称你的社保卡存在异常，如"社保卡被盗用""社保补贴未领取""医保账户异常"等，要求你提供身份证号、银行卡号等个人信息，甚至要求你转账到"安全账户"进行核查。\n\n真实的社保局不会通过电话要求你提供银行账户信息或转账。社保相关问题请到当地社保中心窗口办理或拨打12333咨询。',
        preview: '"您的社保卡异常"——接到这样的电话千万别慌，这很可能是诈骗...',
        tips: '社保局不会通过电话索要银行信息！社保问题请到窗口办理或拨打12333咨询。切勿向陌生人透露身份证号、银行卡号和验证码。',
        category: '冒充公职'
    }
];

// 创建表 + 插入数据
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS opera_works (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT DEFAULT '',
        cover_url TEXT DEFAULT '',
        audio_url TEXT DEFAULT '',
        intro TEXT DEFAULT '',
        story TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS anti_fraud_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        preview TEXT DEFAULT '',
        tips TEXT DEFAULT '',
        category TEXT DEFAULT '',
        is_top INTEGER DEFAULT 0,
        status INTEGER DEFAULT 1,
        view_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 检查并插入戏曲数据
    db.get('SELECT COUNT(*) as cnt FROM opera_works', [], (err, row) => {
        if (!err && row && row.cnt === 0) {
            const stmt = db.prepare(
                `INSERT INTO opera_works (name, category, intro, story, sort_order) VALUES (?, ?, ?, ?, ?)`
            );
            operas.forEach(op => {
                stmt.run(op.name, op.category, op.intro, op.story, op.sort_order);
            });
            stmt.finalize(() => {
                console.log('已插入戏曲种子数据 (' + operas.length + ' 条)');
            });
        } else {
            console.log('戏曲数据已存在，跳过插入');
        }
    });

    // 检查并插入防诈骗数据
    db.get('SELECT COUNT(*) as cnt FROM anti_fraud_articles', [], (err, row) => {
        if (!err && row && row.cnt === 0) {
            const stmt = db.prepare(
                `INSERT INTO anti_fraud_articles (title, content, preview, tips, category, is_top) VALUES (?, ?, ?, ?, ?, ?)`
            );
            articles.forEach(a => {
                stmt.run(a.title, a.content, a.preview, a.tips, a.category, a.is_top || 0);
            });
            stmt.finalize(() => {
                console.log('已插入防诈骗种子数据 (' + articles.length + ' 条)');
                // 所有操作完成后关闭数据库
                db.close((closeErr) => {
                    if (closeErr) console.error('关闭数据库失败:', closeErr.message);
                    else console.log('数据库操作完成');
                });
            });
        } else {
            console.log('防诈骗数据已存在，跳过插入');
            db.close((closeErr) => {
                if (closeErr) console.error('关闭数据库失败:', closeErr.message);
                else console.log('数据库操作完成');
            });
        }
    });
});
