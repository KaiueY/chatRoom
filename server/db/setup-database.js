import knex from './knex.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  try {
    // 检查users表是否存在
    const tableExists = await knex.schema.hasTable('users');
    
    if (!tableExists) {
      console.log('创建users表...');
      
      // 创建users表
      await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username', 50).notNullable().unique();
        table.string('password', 255).notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
      });
      
      console.log('users表创建成功！');
    } else {
      console.log('users表已存在，检查是否需要更新结构...');
      
      // 检查created_at字段是否存在
      const hasCreatedAt = await knex.schema.hasColumn('users', 'created_at');
      
      if (!hasCreatedAt) {
        console.log('添加created_at字段...');
        await knex.schema.table('users', (table) => {
          table.timestamp('created_at').defaultTo(knex.fn.now());
        });
        console.log('created_at字段添加成功！');
      }
    }
    
    // 显示表结构
    const columns = await knex('users').columnInfo();
    console.log('用户表结构:', Object.keys(columns).map(column => {
      return { column, type: columns[column].type };
    }));
    
    // 显示用户数量
    const users = await knex('users').select('*');
    console.log('当前用户数:', users.length);
    
    console.log('数据库设置完成！');
  } catch (error) {
    console.error('设置数据库失败:', error.message);
  } finally {
    await knex.destroy();
  }
}

setupDatabase();