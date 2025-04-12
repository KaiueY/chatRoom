-- 用户表
CREATE TABLE IF NOT EXISTS user (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  status ENUM('online', 'offline') NOT NULL DEFAULT 'offline',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 聊天室表
CREATE TABLE IF NOT EXISTS chatRooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文件表
CREATE TABLE IF NOT EXISTS file (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  fileUrl VARCHAR(255) NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  fileSize INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

-- 聊天室消息表
CREATE TABLE IF NOT EXISTS roomMessages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  roomId INT NOT NULL DEFAULT 1,
  userId INT NOT NULL,
  fileId INT DEFAULT NULL,
  content TEXT NOT NULL,
  messageType ENUM('text', 'file', 'image', 'system') NOT NULL DEFAULT 'text',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (roomId) REFERENCES chatRooms(id) ON DELETE CASCADE,
  FOREIGN KEY (fileId) REFERENCES file(id) ON DELETE CASCADE
);

-- 插入默认聊天室
INSERT INTO chatRooms (name, description)
VALUES ('公共聊天室', '默认的公共聊天室')
ON DUPLICATE KEY UPDATE name = name;

-- 索引
CREATE INDEX idx_username ON user(username);
CREATE INDEX idx_room_id ON roomMessages(roomId);
CREATE INDEX idx_user_id ON roomMessages(userId);
CREATE INDEX idx_created_at ON roomMessages(created_at);
CREATE INDEX idx_user_file ON file(userId, created_at);