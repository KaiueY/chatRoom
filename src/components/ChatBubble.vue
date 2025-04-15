<template>
  <div class="bubble-wrapper" :class="{ mine: isMine }">
    <el-avatar :size="32" class="avatar">
      {{ username ? username[0].toUpperCase() : "bot" }}
    </el-avatar>

    <div class="bubble-content-wrapper">
      <div
        class="bubble-content"
        :class="{
          'file-content': messageType === 'file',
          'image-content': messageType === 'image',
        }"
      >
        <!-- 根据消息类型渲染不同内容 -->
        <div
          v-if="messageType === 'text'"
          class="message"
          @mouseenter="handleMouseEnter"
          @mouseleave="handleMouseLeave"
        >
          {{ content }}
        </div>

                <!-- 图片消息 -->
                <div
          v-if="messageType === 'image'"
          class="image-message"
          @mouseenter="handleImageMouseEnter"
          @mouseleave="handleImageMouseLeave"
        >
          <el-image
            style="width: 100px; height: 100px"
            :src="fileUrl||''"
            :zoom-rate="1.2"
            :max-scale="7"
            :preview-src-list="[fileUrl]"
            :min-scale="0.2"
            show-progress
            :initial-index="4"
            fit="cover"
            :z-index="999"
          >
            <template #error>
              <div class="image-slot">
                <el-icon><icon-picture /></el-icon>
                <span>加载失败</span>
              </div> 
            </template>
          </el-image>
        </div>

        <!-- 文件消息 -->
        <div
          v-if="messageType === 'file'"
          class="file-message"
          @mouseenter="handleMouseEnter"
          @mouseleave="handleMouseLeave"
        >
          <div class="file-message-content">
            <div class="file-message-left">
              <el-icon class="file-icon">
                <Document />
              </el-icon>
              <div class="file-info">
                <el-tooltip :content="fileName" placement="top" :show-after="500">
                  <div class="file-name">{{ fileName }}</div>
                </el-tooltip>
                <div class="file-meta">
                  <span class="file-size">{{ formatFileSize(fileSize) }}</span>
                </div>
              </div>
            </div>
            
            <div class="file-message-right">
              <!-- 操作按钮 -->
              <el-button 
                class="action-icon-btn" 
                circle 
                size="small"
                @click.stop="handleUploadAction"
              >
                <component :is="currentActionIcon"></component>
              </el-button>
            </div>
          </div>
          
          <!-- 线性上传进度条 -->
          <div v-if="fileStatus.isUploading && !fileStatus.fileUrl" class="file-progress-wrapper">
            <el-progress
              :percentage="fileStatus.percentage || 0"
              :indeterminate="false"
              :show-text="false"
              :stroke-width="4"
              class="upload-progress-linear"
            />
          </div>
        </div>



        <div
          class="detailed-time"
          v-show="showDetailedTime && messageType !== 'image'"
        >
          {{ getTime() }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, computed, watch, reactive } from "vue";
import { getFormatTime } from "@/utils/formatTime.js";
import { Document, Download, Close, VideoPlay, VideoPause } from "@element-plus/icons-vue";
import { Picture as IconPicture } from "@element-plus/icons-vue";
import formatFileSize from "@/utils/formatFileSize";

const props = defineProps({
  messageData: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['pause-upload', 'resume-upload', 'download']);

// 直接从messageData中获取属性，减少computed的使用
let {
  username,
  userId,
  content,
  created_at,
  messageType,
  fileName,
  file,
  fileSize,
  fileUrl,
} = props.messageData;

const fileStatus = reactive({
  userId,
  fileName,
  file,
  fileUrl,
  created_at,
  percentage: 0,
  checkpoint:null,
  isPaused :false,
  isUploading: fileUrl ? false : true
})
const currentUsername = localStorage.getItem("username");
const isMine = username === currentUsername;

const showDetailedTime = ref(false);
const showDownloadIcon = ref(false);
let timer = null;

watch(()=>props.messageData,(newValue)=>{
  // 只有当消息ID匹配时才更新状态，避免影响其他文件消息
  if (newValue.userId === userId && newValue.fileName === fileName && newValue.created_at === created_at) {
    console.log('更新文件状态:', newValue)
    if (newValue.uploadProgress !== undefined) {
      fileStatus.percentage = newValue.uploadProgress
    }
    if (newValue.checkpoint !== undefined) {
      fileStatus.checkpoint = newValue.checkpoint
    }
    if (newValue.fileUrl) {
      fileStatus.isUploading = false
      fileStatus.fileUrl = newValue.fileUrl
      fileUrl = newValue.fileUrl
      console.log('文件上传完成:', fileStatus)
    }
  }
},
{ 
  deep: true
}
)
// 根据上传状态显示不同的图标
const currentActionIcon = computed(() => {
  if (!fileStatus.isUploading) {
    return Download; // 上传完成，显示下载图标
  } else if (fileStatus.isPaused) {
    return VideoPlay; // 已暂停，显示继续图标
  } else {
    return VideoPause; // 上传中，显示暂停图标
  }
});


// 处理上传操作按钮点击
const handleUploadAction = () => {
  console.log('点击了');
  
  if (!fileStatus.isUploading) {
    console.log('文件已上传，执行下载');
    console.log('fileUrl:', fileUrl);
    
    // 上传完成，执行下载
    downloadFile();
  } else if (fileStatus.isPaused) {
    // 已暂停，继续上传
    fileStatus.isPaused = false;
    emit('resume-upload', fileStatus);
  } else {
    // 上传中，暂停上传
    fileStatus.isPaused = true;
    emit('pause-upload', fileStatus);
  }
};

// 下载文件
const downloadFile = () => {
  if (!fileUrl) return;
  // 创建一个隐藏的a标签用于下载
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = fileUrl;
  a.download = fileName || "download";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // 触发下载事件
  emit('download', props.messageData);
};


const getTime = () => {
  return getFormatTime(created_at);
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

// 组件卸载时清除定时器
onUnmounted(() => {
  clearTimeout(timer);
});

const handleImageMouseEnter = () => {
  clearTimeout(timer); // 清除之前的定时器
  timer = setTimeout(() => {
    showDetailedTime.value = true;
  }, 1000);
  showDownloadIcon.value = true;
};

const handleImageMouseLeave = () => {
  clearTimeout(timer); // 清除定时器
  showDetailedTime.value = false;
  showDownloadIcon.value = false;
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
.image-content{
  padding: 0;
}
.image-slot {
  width: 100%;
  height: 100%;
  font-size: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #716a6a;
}
/* 文件消息样式 */
.file-content {
  padding: 8px;
  min-width: 240px;
}

.file-message {
  display: flex;
  flex-direction: column;
  padding: 4px;
}

.file-message-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.file-message-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.file-message-right {
  display: flex;
  align-items: center;
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

.file-progress-wrapper {
  width: 100%;
  margin-top: 8px;
}

.upload-progress-linear {
  width: 100%;
}

.image-upload-progress {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
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

.action-icon-btn, .download-icon-btn {
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

.action-icon-btn:hover, .download-icon-btn:hover {
  transform: scale(1.1);
}

.bubble-wrapper.mine .action-icon-btn, .bubble-wrapper.mine .download-icon-btn {
  color: white;
}

/* 图片消息样式
.image-content {
  min-width: 40px;
  min-height: 80px;

  padding: 0px;
} */

.image-message {
  display: flex;
  justify-content: center;
  align-items: center;
}

.demo-image__error .el-image {
  width: 100%;
  height: 200px;
}
/* .message-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
} */

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
