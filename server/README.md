# 聊天室应用后端

这是聊天室应用的后端服务，提供用户认证、WebSocket通信等功能。

## 项目结构

```
server/
├── db/                  # 数据库相关
│   └── knex.js          # knex 初始化配置
├── routes/
│   └── auth.js          # 登录注册接口
├── middleware/
│   └── auth.js          # JWT 中间件
├── app.js               # 启动服务
└── config.js            # 配置（数据库连接、JWT密钥等）
```

## 安装

1. 安装依赖：

```bash
cd server
npm install
```

2. 配置数据库：

在MySQL中创建名为`chat_room`的数据库，并创建用户表：

```sql
CREATE DATABASE chat_room;
USE chat_room;

CREATE TABLE user (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

3. 配置环境变量（可选）：

创建`.env`文件并设置以下变量：

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=chat_room
JWT_SECRET=your_secret_key
PORT=3000
```

## 运行

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

服务器将在 http://localhost:3000 上运行。

## API接口

### 用户认证

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息（需要认证）

### WebSocket

连接到 `ws://localhost:3000` 进行实时通信。

消息格式：

```json
// 加入聊天
{
  "type": "join",
  "userId": "user_id",
  "username": "username"
}

// 发送消息
{
  "type": "message",
  "userId": "user_id",
  "username": "username",
  "content": "Hello, world!"
}
```