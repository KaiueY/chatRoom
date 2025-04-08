/**
 * 消息API路由
 */
import Router from 'koa-router';
import { getUserMessages, getRoomMessages } from '../services/messageService.js';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import authMiddleware from '../middleware/authMiddleware.js';



const router = new Router();

// 中间件：验证JWT令牌
// const authMiddleware = async (ctx, next) => {
//   const token = ctx.headers.authorization?.split(' ')[1];
  
//   if (!token) {
//     ctx.status = 401;
//     ctx.body = { message: '未提供认证令牌' };
//     return;
//   }
  
//   try {
//     const decoded = jwt.verify(token, config.jwt.secret);
//     ctx.state.user = decoded;
//     await next();
//   } catch (error) {
//     ctx.status = 401;
//     ctx.body = { message: '认证令牌无效' };
//   }
// };

/**
 * 获取用户的消息历史
 * GET /messages/user
 */
// 更清晰的参数处理
router.get('/user/messages', authMiddleware, async (ctx) => {
  console.log('已接受用户消息请求');
  try {
    
    const { limit = 50, offset = 0 } = ctx.query;
    const userId = ctx.state.user.id; // 从认证中间件获取

    const messages = await getUserMessages(userId, parseInt(limit), parseInt(offset));
    console.log('用户消息获取成功');
    
    ctx.body = {
      code: 200,  // 统一使用code字段
      data: messages,
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { code: 500, message: '服务器错误' };
  }
});

/**
 * 获取聊天室的消息历史
 * GET /messages/room/:roomId
 */
router.get('/room/messages', authMiddleware, async (ctx) => {
  try {
    // const roomId = parseInt(ctx.params.roomId) || 1;
    const { roomId, limit, offset = 0 } = ctx.query;
    // const limit = parseInt(ctx.query.limit) || 50;
    // const offset = parseInt(ctx.query.offset) || 0;
    console.log('已接受聊天室消息请求',roomId,limit,offset);
        
    const messages = await getRoomMessages(roomId, limit, offset);
    
    ctx.body = {
      code: 200,
      message: '操作成功',
      data: messages.reverse()
    };
  } catch (error) {
    console.error('获取聊天室消息错误:', error);
    ctx.status = 500;
    ctx.body = { message: '服务器错误' };
  }
});

export default router;