/**
 * 消息API路由
 */
import Router from 'koa-router';
import { getUserMessages, getRoomMessages } from '../services/messageService.js';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import authMiddleware from '../middleware/authMiddleware.js';



const router = new Router();


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
    console.log('已接受聊天室消息请求');
    console.log(roomId,limit,offset);
    
    const messages = await getRoomMessages(roomId, limit, offset);
    // console.log('聊天室消息获取成功',messages);
    
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