/**
 * 聊天记录数据库表迁移文件
 * 创建用户消息表和聊天室消息表
 */

export function up(knex) {
  return knex.schema
    // 创建聊天室表
    .createTableIfNotExists('chatRooms', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('description', 255).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // 创建用户消息表
    .createTableIfNotExists('userMessages', (table) => {
      table.increments('id').primary();
      table.integer('userId').unsigned().notNullable();
      table.text('content').notNullable();
      table.enum('messageType', ['text', 'file', 'image']).defaultTo('text');
      table.string('fileUrl', 255).nullable();
      table.string('fileName', 255).nullable();
      table.integer('fileSize').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // 外键约束
      table.foreign('userId').references('id').inTable('user').onDelete('CASCADE');
      
      // 索引
      table.index('userId');
      table.index('created_at');
    })
    // 创建聊天室消息表
    .createTableIfNotExists('roomMessages', (table) => {
      table.increments('id').primary();
      table.integer('roomId').unsigned().notNullable().defaultTo(1);
      table.integer('userId').unsigned().notNullable();
      table.text('content').notNullable();
      table.enum('messageType', ['text', 'file', 'image', 'system']).defaultTo('text');
      table.string('fileUrl', 255).nullable();
      table.string('fileName', 255).nullable();
      table.integer('fileSize').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // 外键约束
      table.foreign('userId').references('id').inTable('user').onDelete('CASCADE');
      table.foreign('roomId').references('id').inTable('chatRooms').onDelete('CASCADE');
      
      // 索引
      table.index('roomId');
      table.index('userId');
      table.index('created_at');
    })
    // 插入默认聊天室
    .then(() => {
      return knex('chatRooms').insert({
        name: '公共聊天室',
        description: '默认的公共聊天室'
      }).onConflict('id').ignore();
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('roomMessages')
    .dropTableIfExists('userMessages')
    .dropTableIfExists('chatRooms');
}