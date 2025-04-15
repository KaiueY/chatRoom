import knex from '../db/knex.js';

// 注册用户 存储用户信息
export async function registerUser(username, password) {
    try {
        const newUser = await knex('user').insert({ username, password }).returning('*');
        return newUser[0];
    }catch(error){
        console.error('注册错误:', error);
        throw error;
    }
}
//获取用户信息
export async function getUserInfo(username) {
    try{
        console.log('获取用户信息', username);
        
        const user = await knex('user').where('username', username).first();
        if (!user) {
            return null;
        }
        return user;
    }catch(error){
        console.error('获取用户信息错误:', error);
        throw error;
    }
}

// 登录用户更新
export async function userLogin(id,token) {
    try {
        knex('user')
            .where('id',id)
            .update({
                token: token,
                status: 1,
            });
    } catch (error) {
        console.error('更新用户状态失败:', error);
        throw error;
    }
    
}