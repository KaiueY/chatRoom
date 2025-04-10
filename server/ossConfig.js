import OSS from 'ali-oss';

const client = new OSS({
  region: 'oss-cn-hangzhou', // 替换为你的region
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET_NAME,
});

export default client;