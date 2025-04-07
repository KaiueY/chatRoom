/**
 * JWT认证中间件
 * 用于验证请求中的JWT令牌
 */

import jwt from 'jsonwebtoken';
import config from '../config.js';

/**
 * 验证JWT令牌的中间件
 * 将解码后的用户信息存储在ctx.state.user中
 */
export default async function authMiddleware(ctx, next) {
  try {
    // 从请求头中获取Authorization
    const authHeader = ctx.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = { message: '未提供认证令牌' };
      return;
    }
    
    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    try {
      // 验证令牌
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // 将用户信息存储在ctx.state中
      ctx.state.user = decoded;
      
      // 继续处理请求
      await next();
    } catch (error) {
      ctx.status = 401;
      ctx.body = { message: '无效的认证令牌' };
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = { message: '服务器错误' };
  }
}