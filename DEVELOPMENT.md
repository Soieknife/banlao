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
- **数据库**: PostgreSQL（推荐云数据库）/ SQLite 3（本地开发兜底）
- **认证**: JSON Web Token (JWT)
- **AI 集成**: OpenAI 兼容接口 (DeepSeek/OpenAI)
- **OCR 集成**: 百度 OCR（高精度印刷体，适合说明书密集文字）
- **管理后台**: 内置静态管理台（/admin）+ 管理员 API

---

## 3. 数据库设计 (PostgreSQL)
生产环境推荐使用 PostgreSQL（支持云数据库托管、扩展性更强）。本项目后端已支持 PostgreSQL 与 SQLite 双模式：
- 若配置了 `DB_CLIENT=postgres` 或存在 `DATABASE_URL/PGHOST/PGDATABASE` 等环境变量，则使用 PostgreSQL。
- 否则默认使用 SQLite（本地快速启动）。

SQLite 文件位置（仅本地兜底）: `server/database.sqlite`
核心表结构:

### `users` (用户表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键（Postgres 为 BIGSERIAL） |
| username | TEXT | 唯一用户名 |
| password | TEXT | 密码 |
| role | TEXT | 角色: elder (老人), child (子女), admin (管理员) |
| nickname | TEXT | 称呼 |
| emergency_contact | TEXT | 紧急联系人称呼（可为空） |
| emergency_phone | TEXT | 紧急电话（多个号码用英文逗号分隔） |
| is_vip | INTEGER | 是否为会员 (0: 否, 1: 是) |
| vip_expire | TIMESTAMPTZ | 会员过期时间 |

### `relations` (绑定关系表)
- 实现一对多或多对多绑定，允许一个老人对应多个子女账号。

### `bind_requests` (绑定申请表)
- 子女端发起绑定申请后，老人端需要输入验证码确认，确认后才会写入 `relations`。

### `reminders` (提醒事项表)
- 记录用药、日常事项，支持记录 `created_by` 以区分老人自设或子女推送。
- 支持重复规则：`repeat_type / repeat_days / repeat_times / enabled` 等字段用于精细化提醒设置。

### `activity_logs` (活动日志表)
- 自动记录老人的关键行为（服药、呼救、登录等），供子女端和管理员审计。

### `app_settings` (系统设置表)
- 存储大模型 API Key、OCR Key 等敏感配置（加密存储），仅管理员可管理。

### `medication_ocr_records` (用药说明书识别记录)
- 存储 OCR 原文与结构化提取结果，便于回溯与子女/管理员查看（不保存图片）。

---

## 4. 后端 API 规范
统一响应格式: `{ code, message, data }`

### 用户模块 (`/api/user`)
- `POST /register`: 用户注册
- `POST /login`: 用户登录
- `GET /profile`: 获取个人资料

### 关系模块 (`/api/relation`)
- `GET /elders`: 获取已绑定的长辈列表
- `POST /request_bind`: 子女端发起绑定申请（返回验证码）
- `GET /pending_requests`: 老人端查看待确认绑定申请
- `POST /approve_by_code`: 老人端输入验证码确认绑定（无需 request_id）
- `POST /approve_bind`: 老人端输入验证码确认绑定
- `POST /reject_bind`: 老人端拒绝绑定
- `GET /request_status/:id`: 查询绑定申请状态
- `GET /my_children`: 老人端获取已绑定子女列表
- `GET /elder_profile/:id`: 获取老人紧急联系人与会员信息
- `POST /update_emergency`: 子女端设置老人紧急联系人
- `POST /purchase_vip`: 子女端为指定老人开通会员
- `GET /elder_status/:id`: 获取指定长辈的实时状态（服药、待办提醒）
- `GET /elder_logs/:id`: 查看长辈活动日志

### 提醒模块 (`/api/reminder`)
- `GET /list`: 老人端获取自己的提醒列表
- `GET /elder_list/:elderId`: 子女端获取某位老人的提醒列表
- `POST /add`: 新增提醒（支持重复规则字段）
- `POST /update/:id`: 更新提醒
- `POST /delete/:id`: 删除提醒
- `POST /complete/:id`: 标记完成

### 用药说明书识别 (`/api/medication`)
- `POST /analyze_upload`: 上传说明书图片（field: image），返回 OCR 原文与结构化提取（需登录）
- `GET /records`: 获取当前用户的识别记录列表（需登录）
- `GET /record/:id`: 获取某条识别记录详情（需登录）

### AI 陪聊模块 (`/api/ai`)
- `POST /chat`: 与“暖阳”助手对话 (需 VIP 权限)

### 管理员模块 (`/api/admin`)
- `GET /stats`: 系统运营统计
- `GET /overview`: 系统总览（绑定/提醒/呼救/识别等）
- `GET /users`: 全平台用户管理
- `POST /set_vip`: 手动设置会员权限
- `GET /relations`: 绑定关系列表
- `GET /bind_requests`: 绑定申请列表
- `GET /emergency_calls`: 呼救记录列表
- `GET /medication_ocr_records`: 用药识别记录列表
- `GET /settings`: 已保存的设置 key 列表（不返回明文）
- `POST /settings/set`: 保存设置（加密存储）

---

## 5. 前端功能模块

### 老人端 (client)
- **首页**: 大图标网格，包含紧急呼救、提醒、服药记录、生活查询、AI 陪聊等入口。
- **未绑定提示**: 若老人账号尚未绑定任何子女，首页底部会常驻提示窗口，支持直接输入验证码确认绑定（无需单独入口）。
- **语音播报**: 工具类 `utils/voice.js` 封装，支持页面进入提示及操作反馈。
- **会员开通**: 由子女端为指定老人开通会员（老人端仅显示状态与引导）。
- **用药说明书识别（规划）**: 拍照说明书 -> OCR/LLM 提取用法用量/功能主治/注意事项 -> 用通俗语音向老人解释。

### 子女端（同一个前端项目按角色切换）
- **长辈列表**: 实时查看多位长辈的服药状态与待办提醒数量。
- **绑定申请**: 绑定需老人端确认 + 验证码。
- **提醒管理**: 支持类型、时间、重复规则、编辑/删除、启用/停用。
- **紧急联系人**: 子女端为老人配置紧急电话与联系人称呼。
- **会员开通**: 子女端为指定老人开通会员。

### 页面路由（关键页面）
- 老人端：
  - `/pages/login/login` 登录
  - `/pages/register/register` 注册
  - `/pages/index/index` 首页
  - `/pages/reminders/reminders` 老人提醒列表
  - `/pages/health/health` 服药记录
  - `/pages/medication-ocr/medication-ocr` 说明书拍照识别
  - `/pages/ai/ai` AI 陪聊（会员可用）
- 子女端（登录后按角色进入）：
  - `/pages/child/index/index` 长辈列表
  - `/pages/child/elder-status/elder-status` 长辈状态
  - `/pages/child/reminder-manage/reminder-manage` 提醒管理
  - `/pages/child/emergency-settings/emergency-settings` 紧急联系人设置
  - `/pages/child/vip-purchase/vip-purchase` 会员开通
  - `/pages/child/activity-logs/activity-logs` 活动日志

---

## 6. 开发与部署

### 环境变量配置
在 `server` 目录下创建 `.env`:
```env
PORT=3000
JWT_SECRET=warm_sun_secret

# 数据库配置（二选一）
# 方式 A：推荐云数据库（Postgres）
DB_CLIENT=postgres
DATABASE_URL=
# 或使用分项配置：
# PGHOST=
# PGPORT=5432
# PGUSER=
# PGPASSWORD=
# PGDATABASE=
# PGSSL=true

# 方式 B：本地兜底（SQLite）
# DB_CLIENT=sqlite

# 管理员初始化（可选，仅首次启动时会创建）
ADMIN_USERNAME=
ADMIN_PASSWORD=
ADMIN_NICKNAME=管理员

# 加密存储系统密钥（必须为 base64 的 32 bytes）
SETTINGS_ENCRYPTION_KEY=

# OCR（百度）配置（可在管理后台写入 app_settings）
OCR_PROVIDER=baidu
# BAIDU_OCR_API_KEY=
# BAIDU_OCR_SECRET_KEY=

AI_API_KEY=your_api_key_here
AI_API_URL=https://api.deepseek.com/v1/chat/completions
AI_MODEL=deepseek-chat
```

### 启动步骤
1. **安装依赖**: 分别在 `server`, `client`, `child-client` 执行 `npm install`。
2. **启动后端**: `cd server && npm run dev`
3. **启动老人端**: `cd client && npm run dev:h5`
4. **启动子女端**: `cd child-client && npm run dev:h5`

### SQLite 迁移到 Postgres
当你已经在本地 SQLite 里有测试数据，并希望迁移到云 Postgres 时：
1. 先在 `.env` 中配置好 Postgres 连接（`DB_CLIENT=postgres` + `DATABASE_URL` 或 `PGHOST/PGDATABASE/...`）。
2. 执行迁移脚本：
   - 不清空目标库（默认）：`cd server && npm run migrate:sqlite2pg`
   - 清空目标库再导入：`cd server && RESET=true npm run migrate:sqlite2pg`

### 管理后台
访问：`http://localhost:3000/admin`\n+1. 使用管理员账号登录获取 token（/api/user/login）。\n+2. 在后台粘贴 token（Bearer 省略）即可调用管理员 API。\n+3. 可在“设置中心”写入 `AI_API_KEY` / `AI_API_URL` / `AI_MODEL` / `BAIDU_OCR_API_KEY` / `BAIDU_OCR_SECRET_KEY` 等。\n+
### 用药 OCR 落地路径（初步）
1. 前端拍照上传说明书图片（uploadFile）。\n+2. OCR 服务识别出全文文本（建议高精度印刷体 + 方向检测）。\n+3. 大模型对 OCR 文本做结构化提取（药品名称/功能主治/用法用量/禁忌/注意事项/不良反应）。\n+4. 生成“老人友好版”摘要，并支持语音播报与子女端回溯查看。\n+5. 后续增强：表格识别、版面还原、图片预处理（去阴影/矫正/裁边）以提升准确率。
---

## 7. 后续优化方向
1. **真实支付集成**: 接入微信/支付宝支付 SDK。
2. **推送服务**: 集成个推或极光推送，实现提醒事项的强提醒。
3. **视频通话**: 基于 WebRTC 实现子女与老人的即时视频。
4. **数据大屏**: 为管理员提供更直观的可视化运营看板。
