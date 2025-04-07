import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import http from 'http';
import cors from '@koa/cors'; // 新增跨域支持
import { initSocketIO } from './socket.js';
import messageRoutes from './routes/messages.js';
import config from './config.js';

const app = new Koa();
const router = new Router({prefix:'/api'});

// 全局错误处理
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('服务器错误:', err);
    ctx.status = err.status || 500;
    ctx.body = { 
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || '服务器内部错误'
    };
  }
});

// 中间件
app.use(cors()); // 允许跨域
app.use(bodyParser());


router.get('/', async (ctx) => {
  ctx.body = {
    status: 'success',
    message: 'MyNote API Server is running'
  };
});
// 路由注册
app.use(messageRoutes.routes()).use(messageRoutes.allowedMethods());
app.use(router.routes()).use(router.allowedMethods());
messageRoutes.stack.forEach(layer => {
  console.log(layer.path, layer.methods);
});
// 创建服务器
const server = http.createServer(app.callback());

// Socket.IO初始化
initSocketIO(server);

// 启动
const PORT = config.server?.port || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});