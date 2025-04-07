/**
 * API服务封装
 * 包含用户信息和聊天室信息的相关接口
 */
import { get, post, put, del } from '@/utils/http/axios/axios';
import {
    getUserMessages,
    getRoomMessages,
} from '@/api/api'

/**
 * 聊天室相关API
 */

/**
 * 获取聊天室消息历史
 * @param {number} roomId - 聊天室ID
 * @param {Object} params - 查询参数
 * @param {number} params.limit - 限制返回的消息数量
 * @param {number} params.offset - 分页偏移量
 * @returns {Promise<Object>} 聊天室消息列表
 */
export async function getRoomMessagesList( params = {}) {
  return get(getRoomMessages, params);
}

/**
 * 获取用户消息历史
 * @param {Object} params - 查询参数
 * @param {number} params.limit - 限制返回的消息数量
 * @param {number} params.offset - 分页偏移量
 * @returns {Promise<Object>} 用户消息列表
 */
export async function getUserMessagesList(params = {}) {
  // 调用getRoomMessages函数获取URL，然后传递给get方法
  return get(getUserMessages, params);
}