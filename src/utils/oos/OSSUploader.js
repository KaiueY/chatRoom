import OSS from "ali-oss";
import { getStsTokenFn } from "@/api";

export default class OSSUploader {
  constructor(
    options = {
      bucket: "chat-raphael",
      region: "oss-cn-hangzhou",
    }
  ) {
    this.options = options;
    this.client = null;
    this.credentials = null;
  }

  // 外部调用上传方法
  async uploadFile(file, path = "chatroom", onProgress = null) {
    await this.ensureClientReady();

    const objectKey = path ? `${path}/${file.name}` : file.name;
    
    const res = await this.client.put(objectKey, file, {
      headers: {
        'x-oss-object-acl': 'public-read',
      }
    });
    return res.res;
  }

  /**
   * 使用分片方式上传大文件
   * @param {File} file - 文件对象
   * @param {string} path - 上传路径前缀（可选）
   * @param {function} onProgress - 上传进度回调（可选）
   * @returns {Object} 包含上传结果和checkpoint的对象
   */
  async multipartUpload(file, path = "chatroom", onProgress = null) {
    await this.ensureClientReady();

    const objectKey = path ? `${path}/${file.name}` : file.name;
    let checkpoint;

    const result = await this.client.multipartUpload(objectKey, file, {
      progress: (p, cpt) => {
        checkpoint = cpt; // 保存断点信息
        if (onProgress) onProgress(p, cpt);
      },
      headers: {
        'x-oss-object-acl': 'public-read',
      }
    });
    result.checkpoint = checkpoint;
    // return { result, checkpoint };
    
    return result;
  }
  
  /**
   * 取消当前上传任务
   */
  cancelUpload() {
    if (this.client) {
      this.client.cancel();
    }
  }
  
  /**
   * 从断点继续上传
   * @param {File} file - 文件对象
   * @param {Object} checkpoint - 断点信息
   * @param {string} path - 上传路径前缀（可选）
   * @param {function} onProgress - 上传进度回调（可选）
   * @returns {Object} 上传结果
   */
  async resumeUpload(file, checkpoint, path = "chatroom", onProgress = null) {
    await this.ensureClientReady();
    
    const objectKey = path ? `${path}/${file.name}` : file.name;
    let currentCheckpoint = checkpoint;
    
    const result = await this.client.multipartUpload(objectKey, file, {
      checkpoint: currentCheckpoint,
      progress: (p, cpt) => {
        currentCheckpoint = cpt; // 更新断点信息
        if (onProgress) onProgress(p, cpt);
      },
    });
    
    return { result, checkpoint: currentCheckpoint };
  }

  // 判断凭证是否过期
  isExpired() {
    if (!this.credentials || !this.credentials.Expiration) return true;

    const expireTime = new Date(this.credentials.Expiration).getTime();
    const now = Date.now();
    return expireTime - now <= 60_000;
  }

  // 确保 client 可用
  async ensureClientReady() {
    if (!this.client || this.isExpired()) {
      await this.refreshCredentials();
    }
  }

  // 获取新凭证 & 创建 OSS 客户端
  async refreshCredentials() {
    try {
      const res = await getStsTokenFn();
      const creds = res.data;

      this.credentials = creds;
      this.client = new OSS({
        ...this.options,
        accessKeyId: creds.AccessKeyId,
        accessKeySecret: creds.AccessKeySecret,
        stsToken: creds.SecurityToken,
        authorizationV4: true,
      });
    } catch (err) {
      console.error("获取 STS 凭证失败:", err);
      throw new Error("无法获取上传凭证，请稍后再试");
    }
  }
}
