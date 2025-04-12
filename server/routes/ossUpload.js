import Router from 'koa-router';
import pkg from 'ali-oss';
const { STS } = pkg;


const router = new Router();
// import { authMiddleware } from '../middleware/authMiddleware';

const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
const userArn = process.env.OSS_USER_ARN;
router.get('/get_sts_token_for_oss_upload', async (ctx) => {
    console.log('get_sts_token_for_oss_upload');
    
    const sts = new STS({
      accessKeyId,
      accessKeySecret,
    });
  
    try {
      const result = await sts.assumeRole(userArn, '', 3000, 'sessiontest');
      console.log('result',result);
      const  bucket = process.env.OSS_BUCKET;
      const  region  = process.env.OSS_REGION;
      
      ctx.body = {
        code: 200,
        message: 'success',
        data: {
            region,
            bucket,
            AccessKeyId: result.credentials.AccessKeyId,
            AccessKeySecret: result.credentials.AccessKeySecret,
            SecurityToken: result.credentials.SecurityToken,
        }
        
      };
    } catch (err) {
      console.error(err);
      ctx.status = 400;
      ctx.body = err.message;
    }
  });

export default router;