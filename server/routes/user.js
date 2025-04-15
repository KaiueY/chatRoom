import Router from 'koa-router';
import jwt from 'jsonwebtoken';
import { genSalt, hash, compare } from 'bcryptjs';
import config from '../config.js';
import { getUserInfo, registerUser, userLogin } from '../services/userService.js';

const router = new Router({ prefix: '/user' });


function generateToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
    });
}
// 注册接口
router.post('/register', async (ctx, next) => {
    const { username, password } = ctx.request.body;
    try {
        // 检查用户名是否已存在
        const user = await getUserInfo(username);
        if (user) {
            ctx.status = 400;
            ctx.body = { error: '用户名已存在' };
            return;
        }
        // 生成盐值
        const salt = await genSalt(10);
        // 对密码进行哈希
        const hashedPassword = await hash(password, salt);
        // 将用户信息存储到数据库
        const id = await registerUser(username, hashedPassword);
        console.log('123123',id);
        
        if (id) {
            // 注册成功
            //生成token
            const token = generateToken({
                id,
                username,
            });
            await userLogin(id, token);
            ctx.status = 200;
            ctx.body = {
                code: '200',
                message: '注册成功',
                data: {
                    user: {
                        id,
                        username,
                    },
                    token,
                }
            }
        } else {
            ctx.status = 500;
            ctx.body = { error: '注册失败' };
        }
    } catch (error) {
        console.error('注册错误:', error);
        ctx.status = 500;
        ctx.body = { error: '服务器错误' };
    }
})

router.post('/login', async (ctx, next) => {
    const { username, password } = ctx.request.body;
    try {
        const user = await getUserInfo(username);
        if (!user) {
            ctx.status = 401;
            ctx.body = { code: '401', error: '用户不存在' };
            return;
        }
        if (user.status === '1') {
            ctx.status = 401;
            ctx.body = { code: '401', error: '用户已在别处登录' };
            return;
        }
        if (user.status === '2') {
            ctx.status = 401;
            ctx.body = { code: '401', error: '用户已被禁用' };
            return;
        }
        // 验证密码
        const isPasswordValid = compare(password, user.password);
        if (!isPasswordValid) {
            ctx.status = 401;
            ctx.body = {
                code: '401',
                error: '用户名或密码错误'
            };
        }

        // 生成JWT令牌
        const token = generateToken({
            id: user.id,
            username: user.username,
        })
        // 更新用户状态为在线
        await userLogin(user, token);
        ctx.status = 200;
        ctx.body = {
            code: '200',
            message: '登录成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                },
                token,
            }
        };
    } catch (error) {
        console.error('登录错误:', error);
        ctx.status = 500;
        ctx.body = { error: '服务器错误' };
    }
});

export default router;