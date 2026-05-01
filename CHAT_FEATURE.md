# 老人子女聊天功能说明

## 概述
实现了完整的老人子女实时聊天功能，支持文字和语音消息，基于WebSocket实现实时通信。

## 功能特性

### 1. 实时聊天
- 基于WebSocket的实时消息传输
- 消息送达状态显示
- 消息时间戳显示
- 消息撤回功能

### 2. 语音消息
- 按住说话录音
- 自动语音识别转文字
- 语音消息播放
- 语音输入模式切换

### 3. 聊天界面
- 适老化设计：大字体、高对比度
- 消息气泡样式
- 头像显示
- 未读消息提醒

### 4. 会话管理
- 会话列表显示
- 最近消息预览
- 未读消息计数
- 会话删除功能

## 技术实现

### 前端实现
- **WebSocket连接**: 使用uni-app WebSocket API
- **消息存储**: Pinia状态管理
- **语音功能**: 百度AI语音识别/合成
- **UI组件**: Vue 3 + 适老化样式

### 后端实现
- **WebSocket服务**: Socket.IO
- **消息存储**: SQLite数据库
- **实时广播**: 房间机制实现会话隔离

### 数据库结构
```sql
-- 聊天会话表
CREATE TABLE chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  elder_id INTEGER NOT NULL,
  child_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 聊天消息表
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  sender_role TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_read INTEGER DEFAULT 0
);
```

## 使用流程

### 1. 初始化聊天
1. 用户登录后自动连接WebSocket
2. 加载用户的聊天会话列表
3. 显示最近消息和未读计数

### 2. 发送消息
1. 进入聊天详情页面
2. 选择输入模式（文字/语音）
3. 输入内容或按住录音
4. 点击发送或自动发送

### 3. 接收消息
1. WebSocket推送新消息
2. 实时更新消息列表
3. 播放提示音（可选）
4. 更新未读计数

## 适老化设计

### 界面设计
- 大字体显示（32rpx+）
- 高对比度颜色
- 大按钮设计（最小80rpx高度）
- 清晰的视觉层次

### 交互设计
- 语音优先：支持语音输入输出
- 简化操作：减少文字输入
- 直观反馈：录音状态明显提示
- 错误处理：友好的错误提示

### 无障碍支持
- 语音播报消息内容
- 大图标和按钮
- 清晰的状态指示
- 简洁的界面布局

## 配置说明

### 环境变量
```env
# WebSocket配置
WS_PORT=3000
WS_CORS_ORIGIN=*

# 数据库配置
DB_PATH=./database.sqlite
```

### 前端配置
```javascript
// WebSocket连接地址
const WS_URL = 'ws://localhost:3000'

// API基础地址
const API_BASE_URL = 'http://localhost:3000/api'
```

## 测试验证

### 功能测试
1. **连接测试**: 验证WebSocket连接状态
2. **消息发送**: 测试文字和语音消息发送
3. **消息接收**: 测试实时消息接收
4. **语音功能**: 测试录音、识别、合成

### 性能测试
1. **并发连接**: 多用户同时在线
2. **消息频率**: 高频消息发送接收
3. **语音处理**: 语音识别和合成响应时间

### 兼容性测试
1. **设备兼容**: 不同手机型号
2. **网络环境**: WiFi/4G/5G切换
3. **系统版本**: 不同uni-app平台

## 注意事项

1. **权限要求**: 需要麦克风权限进行语音输入
2. **网络依赖**: WebSocket需要稳定网络连接
3. **存储限制**: 消息历史记录需要定期清理
4. **安全考虑**: 敏感信息通过HTTPS传输

## 故障排除

### 连接问题
- 检查网络连接
- 验证服务器状态
- 查看防火墙设置

### 消息发送失败
- 检查用户权限
- 验证会话有效性
- 查看服务器日志

### 语音功能异常
- 检查麦克风权限
- 验证百度AI配置
- 测试网络连接