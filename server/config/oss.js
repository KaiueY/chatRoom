import OSS from 'ali-oss';

const client = new OSS({
  region: process.env.OSS_REGION||'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET_NAME,
});

export default client;