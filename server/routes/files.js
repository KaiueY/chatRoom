/**
 * 文件上传和下载API路由
 */
import Router from 'koa-router';
import multer from '@koa/multer';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import authMiddleware from '../middleware/authMiddleware.js';
import { saveFileChunk, mergeFileChunks, getFilePath } from '../services/fileService.js';

const router = new Router({ prefix: '/files' });

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

const upload = multer({ storage: storage });

/**
 * 上传文件分片
 * POST /files/chunk
 */
router.post('/chunk', authMiddleware, upload.single('chunk'), async (ctx) => {
  try {
    const { fileId, chunkIndex, totalChunks } = ctx.request.body;
    
    // 验证参数
    if (!fileId || chunkIndex === undefined || !totalChunks) {
      ctx.status = 400;
      ctx.body = { code: 400, message: '参数不完整' };
      return;
    }
    
    // 读取上传的文件内容
    const chunkData = await fsPromises.readFile(ctx.file.path);
    
    // 保存分片
    const result = await saveFileChunk({
      fileId,
      chunkIndex: parseInt(chunkIndex),
      totalChunks: parseInt(totalChunks),
      chunkData
    });
    
    // 删除临时文件
    await fsPromises.unlink(ctx.file.path);
    
    ctx.body = {
      code: 200,
      message: '分片上传成功',
      data: result
    };
  } catch (error) {
    console.error('上传分片错误:', error);
    ctx.status = 500;
    ctx.body = { code: 500, message: '服务器错误' };
  }
});

/**
 * 合并文件分片
 * POST /files/merge
 */
router.post('/merge', authMiddleware, async (ctx) => {
  try {
    const { fileId, fileName, fileType, fileSize, totalChunks } = ctx.request.body;
    
    // 验证参数
    if (!fileId || !fileName || !fileType || !fileSize || !totalChunks) {
      ctx.status = 400;
      ctx.body = { code: 400, message: '参数不完整' };
      return;
    }
    
    // 合并文件分片
    const result = await mergeFileChunks({
      fileId,
      fileName,
      fileType,
      fileSize: parseInt(fileSize),
      totalChunks: parseInt(totalChunks),
      userId: ctx.state.user.id
    });
    
    ctx.body = {
      code: 200,
      message: '文件合并成功',
      data: result
    };
  } catch (error) {
    console.error('合并文件错误:', error);
    ctx.status = 500;
    ctx.body = { code: 500, message: error.message || '服务器错误' };
  }
});

/**
 * 下载文件
 * GET /files/:fileId
 */
router.get('/:fileId', async (ctx) => {
    console.log(filePath,'---s');
  try {
    const fileId = parseInt(ctx.params.fileId);
    
    if (!fileId) {
      ctx.status = 400;
      ctx.body = { code: 400, message: '无效的文件ID' };
      return;
    }
    
    // 获取文件路径
    const filePath = await getFilePath(fileId);
    console.log(filePath,'---s');
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      ctx.status = 404;
      ctx.body = { code: 404, message: '文件不存在' };
      return;
    }
    
    // 设置响应头
    ctx.attachment(path.basename(filePath));
    ctx.type = path.extname(filePath);
    
    // 发送文件
    ctx.body = fs.createReadStream(filePath);
  } catch (error) {
    console.error('下载文件错误:', error);
    ctx.status = 500;
    ctx.body = { code: 500, message: '服务器错误' };
  }
});

export default router;