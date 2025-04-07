import knex from './db/knex.js';
import dotenv from 'dotenv';

// 确保环境变量被加载
dotenv.config();

console.log('数据库配置:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function testConnection() {
  try {
    const result = await knex.raw('SELECT 1 as test');
    console.log('数据库连接成功！');
    console.log('测试查询结果:', result[0]);
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    return false;
  } finally {
    await knex.destroy();
  }
}

testConnection();