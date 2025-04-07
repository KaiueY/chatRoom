/**
 * 用户认证路由
 */

import Router from 'koa-router';
const router = new Router();
import { genSalt, hash, compare } from 'bcryptjs';
// Fix the jsonwebtoken import
import jwt from 'jsonwebtoken';
import knex from '../db/knex.js';
import config from '../config.js';

const _jwt = config.jwt;
/**
 * 用户注册
 * @route POST /api/auth/register
 */
router.post('/register', async (ctx) => {
  try {
    const { username, password } = ctx.request.body;
    
    // 验证请求数据
    if (!username || !password) {
      ctx.status = 400;
      ctx.body = { message: '用户名和密码不能为空' };
      return;
    }
    
    // 检查用户名是否已存在
    const existingUser = await knex('users').where({ username }).first();
    if (existingUser) {
      ctx.status = 409;
      ctx.body = { message: '用户名已存在' };
      return;
    }
    
    // 密码加密
    const salt = await genSalt(10);
    const hashedPassword = await hash(password, salt);
    
    // 创建新用户
    const [userId] = await knex('users').insert({
      username,
      password: hashedPassword,
      created_at: new Date()
    });
    

    
    ctx.status = 201;
    ctx.body = {
      message: '注册成功',
      user: { id: userId, username },
    };
  } catch (error) {
    console.error('注册错误:', error);
    ctx.status = 500;
    ctx.body = { message: '服务器错误' };
  }
});

/**
 * 用户登录
 * @route POST /api/auth/login
 */
router.post('/login', async (ctx) => {
  try {
    const { username, password } = ctx.request.body;
    
    // 验证请求数据
    if (!username || !password) {
      ctx.status = 400;
      ctx.body = { message: '用户名和密码不能为空' };
      return;
    }
    
    // 查找用户
    const user = await knex('users').where({ username }).first();
    if (!user) {
      ctx.status = 401;
      ctx.body = { message: '用户名或密码错误' };
      return;
    }
    
    // 验证密码
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      ctx.status = 401;
      ctx.body = { message: '用户名或密码错误' };
      return;
    }
    
    // 生成JWT令牌 - use jwt.sign instead of sign
    const token = jwt.sign(
      { id: user.id, username: user.username },
      _jwt.secret,
      { expiresIn: _jwt.expiresIn }
    );
    
    ctx.body = {
      message: '登录成功',
      user: { id: user.id, username: user.username },
      token
    };
  } catch (error) {
    console.error('登录错误:', error);
    ctx.status = 500;
    ctx.body = { message: '服务器错误' };
  }
});

/**
 * 获取当前用户信息
 * @route GET /api/auth/me
 */
router.get('/me', async (ctx, next) => {
  // 这里需要实现Koa版本的auth中间件
  // 暂时注释掉，等待auth中间件实现后再启用
  
  try {
    const user = await knex('users')
      .select('id', 'username', 'created_at')
      .where({ id: ctx.state.user.id })
      .first();
      
    if (!user) {
      ctx.status = 404;
      ctx.body = { message: '用户不存在' };
      return;
    }
    
    ctx.body = { user };
  } catch (error) {
    console.error('获取用户信息错误:', error);
    ctx.status = 500;
    ctx.body = { message: '服务器错误' };
  }
  
});

export default router;