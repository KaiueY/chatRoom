import { get, post, put, del } from '@/utils/http/axios/axios';
import {
    getStsToken,
} from '@/api/api'


/**
 * OSS相关API
 */

/**
 * 获取STS临时凭证
 * @returns {Promise<Object>} STS临时凭证
 * 
 */
export const getStsTokenFn = async () => {
    const result = await get(getStsToken);
    return result;
};