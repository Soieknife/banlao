# 暖阳陪伴 - 老年人智能助手 开发文档 (v1.0 Commercial)

## 1. 项目概述
“暖阳陪伴”是一款专为老年人设计的智能助手应用，旨在通过大字大图标适配、语音播报、AI 智能陪聊以及子女远程守护功能，解决老年人使用智能手机难、孤独感强以及居家安全等问题。

### 核心价值
- **适老化适配**：零学习成本，核心功能一键触达。
- **情感陪伴**：基于大模型的 AI 语音陪聊，缓解孤独。
- **安全守护**：紧急呼救、定位发送、活动日志实时监控。
- **商业闭环**：会员订阅体系，支持多子女协作管理。

---

## 2. 技术栈
### 前端 (Mobile/H5/MiniProgram)
- **框架**: uni-app (Vue 3 + Vite)
- **样式**: SCSS (适老化样式变量规范)
- **通信**: uni.request (封装 JWT 认证)

### 后端 (Server)
- **运行环境**: Node.js 18+
- **框架**: Express 4.x
- **数据库**: SQLite 3 (轻量级、零配置)
- **认证**: JSON Web Token (JWT)
- **AI 集成**: OpenAI 兼容接口 (DeepSeek/OpenAI)

---

## 3. 数据库设计 (SQLite)
文件位置: `server/database.sqlite`
核心表结构:

### `users` (用户表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| username | TEXT | 唯一用户名 |
| password | TEXT | 密码 |
| role | TEXT | 角色: elder (老人), child (子女), admin (管理员) |
| nickname | TEXT | 称呼 |
| is_vip | INTEGER | 是否为会员 (0: 否, 1: 是) |
| vip_expire | DATETIME | 会员过期时间 |

### `relations` (绑定关系表)
- 实现一对多或多对多绑定，允许一个老人对应多个子女账号。

### `reminders` (提醒事项表)
- 记录用药、日常事项，支持记录 `created_by` 以区分老人自设或子女推送。

### `activity_logs` (活动日志表)
- 自动记录老人的关键行为（服药、呼救、登录等），供子女端和管理员审计。

---

## 4. 后端 API 规范
统一响应格式: `{ code, message, data }`

### 用户模块 (`/api/user`)
- `POST /register`: 用户注册
- `POST /login`: 用户登录
- `GET /profile`: 获取个人资料

### 关系模块 (`/api/relation`)
- `POST /bind`: 绑定老人账号
- `GET /elders`: 获取已绑定的长辈列表
- `GET /elder_status/:id`: 获取指定长辈的实时状态 (步数、服药、提醒)
- `GET /elder_logs/:id`: 查看长辈活动日志

### AI 陪聊模块 (`/api/ai`)
- `POST /chat`: 与“暖阳”助手对话 (需 VIP 权限)

### 管理员模块 (`/api/admin`)
- `GET /stats`: 系统运营统计
- `GET /users`: 全平台用户管理
- `POST /set_vip`: 手动设置会员权限

---

## 5. 前端功能模块

### 老人端 (client)
- **首页**: 大图标网格，包含紧急呼救、提醒、健康、生活查询、AI 陪聊入口。
- **语音播报**: 工具类 `utils/voice.js` 封装，支持页面进入提示及操作反馈。
- **会员中心**: `pages/vip/vip.vue` 盈利入口。

### 子女端 (child-client)
- **长辈列表**: 实时查看多位长辈的健康达标状态。
- **远程管理**: 远程为长辈设置用药提醒，查看详细活动轨迹。

---

## 6. 开发与部署

### 环境变量配置
在 `server` 目录下创建 `.env`:
```env
PORT=3000
JWT_SECRET=warm_sun_secret
AI_API_KEY=your_api_key_here
AI_API_URL=https://api.deepseek.com/v1/chat/completions
AI_MODEL=deepseek-chat
```

### 启动步骤
1. **安装依赖**: 分别在 `server`, `client`, `child-client` 执行 `npm install`。
2. **启动后端**: `cd server && npm run dev`
3. **启动老人端**: `cd client && npm run dev:h5`
4. **启动子女端**: `cd child-client && npm run dev:h5`

---

## 7. 后续优化方向
1. **真实支付集成**: 接入微信/支付宝支付 SDK。
2. **推送服务**: 集成个推或极光推送，实现提醒事项的强提醒。
3. **视频通话**: 基于 WebRTC 实现子女与老人的即时视频。
4. **数据大屏**: 为管理员提供更直观的可视化运营看板。
