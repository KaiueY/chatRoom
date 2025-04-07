-- 创建用户消息表 (存储用户的所有聊天记录)
CREATE TABLE IF NOT EXISTS userMessages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  content TEXT NOT NULL,
  messageType ENUM('text', 'file', 'image') NOT NULL DEFAULT 'text',
  fileUrl VARCHAR(255) NULL,
  fileName VARCHAR(255) NULL,
  fileSize INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建聊天室表 (未来可能会有多个聊天室)
CREATE TABLE IF NOT EXISTS chatRooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建聊天室消息表 (存储聊天室的所有消息)
CREATE TABLE IF NOT EXISTS roomMessages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  roomId INT NOT NULL DEFAULT 1, -- 默认为第一个聊天室
  userId INT NOT NULL,
  content TEXT NOT NULL,
  messageType ENUM('text', 'file', 'image', 'system') NOT NULL DEFAULT 'text',
  fileUrl VARCHAR(255) NULL,
  fileName VARCHAR(255) NULL,
  fileSize INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (roomId) REFERENCES chatRooms(id) ON DELETE CASCADE
);

-- 创建一个默认的聊天室
INSERT INTO chatRooms (name, description) VALUES ('公共聊天室', '默认的公共聊天室') ON DUPLICATE KEY UPDATE name = name;

-- 创建索引以提高查询性能
CREATE INDEX idx_userMessages_userId ON userMessages(userId);
CREATE INDEX idx_userMessages_created_at ON userMessages(created_at);
CREATE INDEX idx_roomMessages_roomId ON roomMessages(roomId);
CREATE INDEX idx_roomMessages_userId ON roomMessages(userId);
CREATE INDEX idx_roomMessages_created_at ON roomMessages(created_at);