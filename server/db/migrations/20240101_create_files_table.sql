-- 创建文件表 (存储上传文件的元数据)
CREATE TABLE IF NOT EXISTS files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  originalName VARCHAR(255) NOT NULL,
  fileType VARCHAR(100) NOT NULL,
  fileSize BIGINT NOT NULL,
  filePath VARCHAR(255) NOT NULL,
  fileUrl VARCHAR(255) NOT NULL,
  uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX idx_files_userId ON files(userId);
CREATE INDEX idx_files_uploadedAt ON files(uploadedAt);