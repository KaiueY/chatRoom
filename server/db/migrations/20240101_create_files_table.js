/**
 * 创建文件表迁移脚本
 */
exports.up = function(knex) {
  return knex.schema.createTable('files', function(table) {
    table.increments('id').primary();
    table.integer('userId').unsigned().notNullable();
    table.string('fileName', 255).notNullable();
    table.string('originalName', 255).notNullable();
    table.string('fileType', 100).notNullable();
    table.bigInteger('fileSize').notNullable();
    table.string('filePath', 255).notNullable();
    table.string('fileUrl', 255).notNullable();
    table.timestamp('uploadedAt').defaultTo(knex.fn.now());
    
    // 外键约束
    table.foreign('userId').references('id').inTable('user').onDelete('CASCADE');
    
    // 索引
    table.index('userId');
    table.index('fileType');
    table.index('uploadedAt');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('files');
};