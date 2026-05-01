# 暖阳陪伴

暖阳陪伴是一个面向老人和子女的适老化陪伴应用，采用前后端分离结构：

- `client`：`uni-app + Vue 3` 前端，可运行在 H5，也可打包到 Android
- `server`：`Node.js + Express` 后端，默认支持 `SQLite`，也可切换到 `PostgreSQL`

## 目录结构

```text
banlao/
├─ client/                 前端项目（uni-app）
├─ server/                 后端项目（Express）
├─ DEVELOPMENT.md          开发说明
├─ CHAT_FEATURE.md         聊天模块说明
└─ VOICE_CONFIG.md         语音相关说明
```

## 环境要求

- Node.js 18+
- npm 9+
- Android 预览建议使用 `HBuilderX`

## 服务端启动

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

在 `server` 目录下创建 `.env` 文件，最简配置如下：

```env
PORT=3000
HOST=0.0.0.0
JWT_SECRET=warm_sun_secret

# 本地开发默认可直接使用 SQLite
DB_CLIENT=sqlite

# 可选：初始化管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
ADMIN_NICKNAME=管理员
```

说明：

- `HOST=0.0.0.0` 表示允许局域网内其他设备访问这台电脑上的服务
- 如果只写 `localhost`，手机通常无法访问电脑上的后端

### 3. 启动服务端

开发模式：

```bash
cd server
npm run dev
```

生产模式：

```bash
cd server
npm start
```

启动成功后，默认地址为：

- `http://你的电脑IP:3000`
- 健康检查接口：`http://你的电脑IP:3000/api/health`

例如你的电脑局域网 IP 是 `192.168.1.100`，则服务端地址为：

- `http://192.168.1.100:3000`

## 客户端启动

### 1. 安装依赖

```bash
cd client
npm install
```

### 2. H5 开发预览

```bash
cd client
npm run dev:h5
```

### 3. H5 打包

```bash
cd client
npm run build:h5
```

### 4. Android 预览

推荐使用 `HBuilderX`：

1. 用 `HBuilderX` 打开 `client` 目录
2. 点击“运行”
3. 选择：
   - 运行到 Android 模拟器
   - 或运行到 Android 基座 / 真机

如果需要生成安装包：

1. 在 `HBuilderX` 中点击“发行”
2. 选择“原生 App-云打包”
3. 生成 `apk`

## 如何让客户端连接到指定 IP 的服务端

客户端连接地址统一配置在：

[client/src/config/index.js](D:/Project/SC/banlao/client/src/config/index.js)

当前关键代码：

```js
const serverHost = '192.168.1.100';
const serverPort = 3000;
const serverOrigin = `http://${serverHost}:${serverPort}`;
```

### 需要修改的地方

如果服务端 IP 改了，只需要修改这一行：

```js
const serverHost = '192.168.1.100';
```

例如改成：

```js
const serverHost = '192.168.1.120';
```

如果端口变了，再改：

```js
const serverPort = 3000;
```

改完后重新运行前端，或重新打包 Android App。

## 客户端连接服务端的完整条件

除了修改前端 IP，还需要同时满足下面几点：

1. 服务端已经启动
2. 服务端监听的是 `0.0.0.0` 或电脑实际网卡地址
3. 手机和电脑在同一个局域网下
4. 电脑防火墙放行了 `3000` 端口
5. 前端配置的 IP 是“运行后端的那台电脑”的局域网 IP

## 常见示例

### 场景 1：本机浏览器访问

- 服务端：`http://127.0.0.1:3000`
- 前端 H5：通常浏览器可打开前端页面
- 但如果前端配置的是手机要访问的地址，建议统一写电脑局域网 IP，而不是 `localhost`

### 场景 2：Android 手机访问电脑上的后端

假设：

- 电脑 IP：`192.168.1.100`
- 后端端口：`3000`

那么：

- 服务端启动地址：`http://192.168.1.100:3000`
- 前端配置文件中应写：

```js
const serverHost = '192.168.1.100';
const serverPort = 3000;
```

## 登录与播报逻辑说明

当前版本中，客户端每次打开应用会先向服务端确认登录状态：

- 已登录：进入主页面
- 未登录：停留在登录页
- 只有长辈端在“服务端确认已登录”后，才会启动消息播报

相关后端接口：

- `POST /api/user/login`
- `POST /api/user/logout`
- `GET /api/user/session-status`

## 数据库说明

默认本地开发使用：

- `SQLite`
- 数据库文件位置：`server/database.sqlite`

如果要切换到 PostgreSQL，可在 `server/.env` 中补充例如：

```env
DB_CLIENT=postgres
DATABASE_URL=postgres://username:password@host:5432/database
```

## 常见问题

### 1. 手机连不上服务端

优先检查：

- `server/.env` 中是否设置了 `HOST=0.0.0.0`
- `client/src/config/index.js` 中的 `serverHost` 是否是正确的电脑 IP
- 电脑和手机是否在同一个 Wi-Fi
- Windows 防火墙是否拦截了 `3000` 端口

### 2. 改了 IP 还是连不上

请确认你已经：

- 重启后端
- 重新运行前端
- 如果是 Android 包，重新打包或重新运行到基座

### 3. 为什么不能写 `localhost`

因为在 Android 手机上，`localhost` 指的是“手机自己”，不是你的电脑。  
所以手机访问电脑上的服务端时，必须写电脑的局域网 IP，比如 `192.168.1.100`。

## 常用命令

服务端：

```bash
cd server
npm run dev
npm start
```

客户端：

```bash
cd client
npm run dev:h5
npm run build:h5
```
