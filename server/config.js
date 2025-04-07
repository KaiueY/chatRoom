/**
 * 应用配置文件
 */

export default {
  // 数据库配置
  database: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'Hkl52013.',
      database: process.env.DB_NAME || 'chatRoom'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  },
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'kailin',
    expiresIn: '7d' // Token有效期
  },
  
  // 服务器配置
  server: {
    port: process.env.PORT || 3000
  }
};