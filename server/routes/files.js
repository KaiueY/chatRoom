/**
 * 文件上传和下载API路由
 */
import Router from 'koa-router';
import { getFileInfo } from '../services/fileService.js';

const router = new Router();

router.get('/files/:fileId', async (ctx) => {
  const fileId = ctx.params.fileId;
  const fileInfo = await getFileInfo(fileId);
  if (!fileInfo) {
    ctx.status = 404;
    ctx.body = {
      code: 404,
      data: null,
      message:'文件不存在'
    };
    return;
  }
  ctx.body = {
    code: 200,
    data: fileInfo,
    message: 'success'
  }
})

/**
 * 保存文件信息到数据库
 */
// router.post('/files', async (ctx) => {
//   const fileInfo = ctx.request.body;
//   const fileId = await saveFileInfo(fileInfo);
//   ctx.body = {
//     code: 200,
//     data: fileId,
//     message:'success'
//   }
// });

export default router;