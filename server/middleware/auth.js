import Router from 'koa-router'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import knex from '../db/knex.js'

const router = new Router()

// 注册
router.post('/register', async (ctx) => {
  const { username, password } = ctx.request.body
  const exists = await knex('users').where({ username }).first()
  if (exists) {
    ctx.body = { success: false, message: '用户名已存在' }
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  await knex('users').insert({ username, password: hashed })
  ctx.body = { success: true, message: '注册成功' }
})

// 登录
router.post('/login', async (ctx) => {
  const { username, password } = ctx.request.body
  const user = await knex('users').where({ username }).first()
  if (!user) {
    ctx.body = { success: false, message: '用户不存在' }
    return
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    ctx.body = { success: false, message: '密码错误' }
    return
  }

  const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET, { expiresIn: '1d' })
  ctx.body = { success: true, token, username }
})

export default router