<template>
  <div class="bubble-wrapper" :class="{ mine: isMine }">
    <el-avatar :size="32" class="avatar">
      {{ username ? username[0].toUpperCase() : 'bot' }}
    </el-avatar>

    <div class="bubble-content-wrapper">
      <div class="bubble-content" :class="{ 'file-content': isFile, 'image-content': isImage }">
        <!-- 普通文本消息 -->
        <div v-if="isText" class="message" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
          {{ message }}
        </div>
        
        <!-- 图片消息 -->
        <div v-else-if="isImage" class="image-message" @mouseenter="handleImageMouseEnter" @mouseleave="handleImageMouseLeave">
          <img :src="fileUrl" class="message-image" @click="viewImage" />
          <div class="detailed-time" v-show="showDetailedTime">
            {{ getTime(time) }}
          </div>
        </div>
        
        <!-- 文件消息 - 只有当不是图片类型时才显示 -->
        <div v-else-if="isFile && !isImage" class="file-message" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
          <div class="file-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="file-info">
            <div class="file-name">{{ fileName || message }}</div>
            <div class="file-meta">
              <span class="file-size" v-if="fileSize">{{ formatFileSize(fileSize) }}</span>
              <span class="file-type" v-if="fileType">{{ fileType }}</span>
            </div>
          </div>
          
          <!-- 上传中显示进度条和取消按钮 -->
          <div v-if="isUploading" class="file-action">
            <el-progress 
              type="circle" 
              :percentage="uploadProgress" 
              :width="28"
              :stroke-width="4"
              :show-text="false"
            />
            <el-button 
              class="cancel-btn" 
              circle 
              size="small" 
              @click.stop="cancelUpload"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          
          <!-- 上传完成显示下载图标 -->
          <div v-else class="file-action">
            <el-button 
              class="download-icon-btn" 
              circle 
              size="small" 
              @click.stop="downloadFile"
              v-show="showDownloadIcon"
            >
              <el-icon><Download /></el-icon>
            </el-button>
          </div>
        </div>
        
        <div class="detailed-time" v-show="showDetailedTime && !isImage">
          {{ getTime(time) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, computed } from "vue";
import formatDateTime from "@/utils/formatDateTime.js";
import { getFileDownloadUrl } from "@/api/chatRoom/fileUpload";
import { Document, Download, Close } from "@element-plus/icons-vue";
import { ElMessageBox, ElProgress } from "element-plus";
import formatFileSize from '@/utils/formatFileSize'
import fileUploader from "@/utils/fileUploader";


const props = defineProps({
  username: String,
  userId: Number,
  message: String,
  time: String,
  isMine: Boolean,
  messageType: {
    type: String,
    default: 'text',
    validator: (value) => ['text', 'file', 'image'].includes(value)
  },
  fileName: String,
  fileSize: Number,
  fileType: String,
  fileUrl: String,
  fileId: [Number, String],
  imageUrl: String,
  isUploading: {
    type: Boolean,
    default: false,
  },
  uploadProgress: {
    type: Number,
    default: 0
  },
  uploadTaskId: String
});

const showDetailedTime = ref(false);
const showDownloadIcon = ref(false);
let timer = null;

// 计算属性：判断消息类型
const isFile = computed(() => {
  return props.messageType === 'file';
});

const isImage = computed(() => {
  return props.messageType === 'image';
});

const isText = computed(() => {
  return props.messageType === 'text';
});

// 取消上传
const cancelUpload = () => {
  if (props.uploadTaskId) {
    fileUploader.cancelTask(props.uploadTaskId);
    // 发送取消上传事件
    const cancelEvent = new CustomEvent('cancel-upload', {
      detail: { taskId: props.uploadTaskId }
    });
    window.dispatchEvent(cancelEvent);
  }
};


// 下载文件
const downloadFile = () => {
  if (!props.fileId && !props.fileUrl) return;
  
  // 获取下载链接
  let downloadUrl = props.fileUrl;
  
  // 创建下载链接
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = props.fileName || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const getTime = (time) => {
  return formatDateTime(time);
};

const handleMouseEnter = () => {
  clearTimeout(timer); // 清除之前的定时器
  timer = setTimeout(() => {
    showDetailedTime.value = true;
  }, 1000);
  // 立即显示下载图标
  showDownloadIcon.value = true;
};

const handleMouseLeave = () => {
  clearTimeout(timer); // 清除定时器
  showDetailedTime.value = false;
  // 隐藏下载图标
  showDownloadIcon.value = false;
};

// 查看图片
const viewImage = () => {
  const imgUrl = props.imageUrl || props.message;
  ElMessageBox.alert(
    `<div style="text-align: center;"><img src="${imgUrl}" style="max-width: 100%;" /></div>`,
    '查看图片',
    {
      dangerouslyUseHTMLString: true,
      showConfirmButton: false,
      showClose: true,
      customClass: 'image-preview-dialog'
    }
  );
};

// 组件卸载时清除定时器
onUnmounted(() => {
  clearTimeout(timer);
});

const handleImageMouseEnter = () => {
  clearTimeout(timer); // 清除之前的定时器
  timer = setTimeout(() => {
    showDetailedTime.value = true;
  }, 1000);
};

const handleImageMouseLeave = () => {
  clearTimeout(timer); // 清除定时器
  showDetailedTime.value = false;
};
</script>

<style scoped>
.bubble-wrapper {
  display: flex;
  margin: 16px 0;
  align-items: center;
  position: relative;
  justify-content: flex-start;
}

.bubble-wrapper.mine {
  flex-direction: row-reverse;
  justify-content: flex-start;
}

.avatar {
  margin-right: 8px;
  flex-shrink: 0;
}

.bubble-wrapper.mine .avatar {
  margin-left: 8px;
  margin-right: 0;
}

.bubble-content-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  position: relative;
}

.bubble-content {
  background-color: #f5f5f5;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
  align-self: flex-start;
}

.bubble-wrapper.mine .bubble-content-wrapper {
  align-items: flex-end;
}

.bubble-wrapper.mine .bubble-content {
  background-color: #0084ff;
  color: white;
}

.message {
  font-size: 14px;
  word-break: break-word;
}

/* 文件消息样式 */
.file-content {
  padding: 8px;
  min-width: 240px;
}

.file-message {
  display: flex;
  align-items: center;
  padding: 4px;
}

.file-icon {
  font-size: 24px;
  margin-right: 10px;
  color: #909399;
}

.bubble-wrapper.mine .file-icon {
  color: #ffffff;
}

.file-info {
  flex: 1;
  overflow: hidden;
  padding-right: 40px; /* 为绝对定位的下载按钮预留空间 */
}

.file-name {
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.file-meta {
  display: flex;
  font-size: 12px;
  color: #909399;
}

.bubble-wrapper.mine .file-meta {
  color: rgba(255, 255, 255, 0.8);
}

.file-size {
  margin-right: 8px;
}

.file-action {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
}
:deep(.el-progress-circle) svg{
  width: auto;
  height: auto;
}

.cancel-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
}

.download-icon-btn {
  padding: 0;
  background-color: transparent;
  border: none;
  color: #909399;
  transition: transform 0.2s;
  width: 36px;
  height: 36px;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.download-icon-btn:hover {
  transform: scale(1.1);
}

.bubble-wrapper.mine .download-icon-btn {
  color: white;
}

/* 图片消息样式 */
.image-content {
  padding: 4px;
}

.image-message {
  display: flex;
  justify-content: center;
  align-items: center;
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
}

.message-image:hover {
  transform: scale(1.05);
}

/* 图片预览对话框样式 */
:deep(.image-preview-dialog) {
  max-width: 90vw;
}

:deep(.image-preview-dialog .el-message-box__content) {
  padding: 10px;
  overflow: auto;
}

.detailed-time {
  position: absolute;
  top: -15px;
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 2px 4px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.bubble-wrapper.mine .detailed-time {
  right: 0;
}

.bubble-wrapper:not(.mine) .detailed-time {
  left: 0;
}
</style>
