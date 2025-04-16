<template>
  <el-card class="container" shadow="always">
    <template #header>
      <div class="chat-header">
        <span>🗨️ 实时聊天室</span>
        <el-text type="info">{{ currentUsername }}</el-text>
        <el-tooltip placement="top">
          <template #content>退出</template>
          <div class="icon-item" @click="loginOut">
            <ChatOut />
          </div>
        </el-tooltip>
      </div>
    </template>

    <div class="chat-container">
      <el-scrollbar class="chat-box" ref="chatBoxRef" @scroll="handleScroll">
        <div class="loading-more" v-if="isLoadingMore">
          <el-icon class="loading-icon">
            <Loading />
          </el-icon>
          <span>加载更多消息...</span>
        </div>
        <div class="no-more-messages" v-if="noMoreMessages && !isLoadingMore">
          <span>没有更多消息了</span>
        </div>
        <ChatBubble v-for="(msg, i) in roomMsgs" :key="i" :messageData="msg" @pause-upload="pauseUpload"
          @resume-upload="resumeUpload" @download="handleFileDownloaded" />
      </el-scrollbar>

      <div class="input-area">
        <div class="icon-area">
          <el-tooltip placement="top">
            <template #content>文件上传</template>
            <div class="icon-item" @click="openFileUpload">
              <ChatFolder />
              <input type="file" ref="fileInputRef" style="display: none" @change="handleFileChange" multiple />
            </div>
          </el-tooltip>

          <el-tooltip placement="top">
            <template #content>图片上传</template>
            <div class="icon-item" @click="openImageUpload">
              <ChatImage />
              <input type="file" ref="imageInputRef" style="display: none" @change="handleImageChange" accept="image/*"
                multiple />
            </div>
          </el-tooltip>

          <el-tooltip placement="top">
            <template #content>聊天记录</template>
            <div class="icon-item" @click="showChatHistory = true">
              <ChatRecord />
            </div>
          </el-tooltip>
        </div>

        <div class="input-wrapper" @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop" @paste="handlePaste" :class="{ 'drag-over': isDragging }">
          <!-- 文件预览区域 -->
          <div class="file-preview-area" v-if="previewFiles.length > 0">
            <div v-for="(file, index) in previewFiles" :key="index" class="file-preview-item">
              <!-- 图片预览 -->
              <div v-if="file.type.startsWith('image/')" class="image-preview">
                <img :src="file.preview" class="preview-image" />
                <div class="preview-name">{{ file.name }}</div>
                <el-button class="remove-preview" circle size="small" @click.stop="removePreviewFile(index)">
                  <el-icon>
                    <Close />
                  </el-icon>
                </el-button>
              </div>

              <!-- 文件预览 -->
              <div v-else class="file-preview">
                <el-icon>
                  <Document />
                </el-icon>
                <div class="preview-name">{{ file.name }}</div>
                <div class="preview-size">{{ formatFileSize(file.size) }}</div>
                <el-button class="remove-preview" circle size="small" @click.stop="removePreviewFile(index)">
                  <el-icon>
                    <Close />
                  </el-icon>
                </el-button>
              </div>
            </div>
          </div>

          <el-input type="textarea" v-model="input" resize="none" @isComposing="isComposing"
            @keyup.enter="sendMessage" />
        </div>
      </div>
    </div>

    <el-dialog v-model="showChatHistory" title="聊天记录" width="80%" destroy-on-close class="history-dialog">
      <ChatHistory :visible="showChatHistory" :userId="currentUserId" :roomId="1" @close="showChatHistory = false" />
    </el-dialog>

    <!-- 文件上传进度现在直接显示在消息框中 -->
  </el-card>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import ChatBubble from "@/components/ChatBubble.vue";
import ChatHistory from "@/components/ChatHistory.vue";
import message from "@/components/Message";
import ChatRecord from "@/assets/icons/ChatRecord.vue";
import ChatFolder from "@/assets/icons/ChatFolder.vue";
import ChatImage from "@/assets/icons/ChatImage.vue";
import ChatOut from "@/assets/icons/ChatOut.vue";
import { Loading, Document, Close } from "@element-plus/icons-vue";
import { getUserMessagesList, getRoomMessagesList } from "@/api";
import OSSUploader from "@/utils/oos/OSSUploader.js";
import { getFullTime } from "@/utils/formatTime.js";
import formatFileSize from "@/utils/formatFileSize";
import getSocetClient from "@/utils/socket";

// 获取路由实例
const router = useRouter();
// 定义响应式数据
const input = ref(""); // 输入框内容
const isComposing = ref(false); // 是否正在输入中
const roomId = ref(1); // 当前聊天室ID
const roomMsgs = ref([]); // 消息列表
const userMsg = ref([]); // 用户消息列表
const checkpoint = ref(null);
const chatBoxRef = ref(null); // 聊天框DOM引用
const currentUsername = ref(""); // 当前用户名
const currentUserId = ref(""); // 当前用户ID
const showChatHistory = ref(false); // 是否显示聊天记录对话框
const isLoading = ref(false); // 是否正在加载消息
const isLoadingMore = ref(false); // 是否正在加载更多历史消息
const offset = ref(0); // 消息分页偏移量
const noMoreMessages = ref(false); // 是否没有更多历史消息
const fileInputRef = ref(null); // 文件上传输入框引用
const imageInputRef = ref(null); // 图片上传输入框引用
const isDragging = ref(false); // 是否正在拖拽文件
const previewFiles = ref([]); // 预览文件列表

const socketClient = getSocetClient();
const oosUploader = new OSSUploader();
const controller = new AbortController();
/**
 * 滚动到聊天框底部
 */
/**
 * 监听消息列表变化，滚动到底部
 */
watch(roomMsgs, () => {
  if (isLoading.value) return;
  scrollToBottom();
});

/**
 * 组件挂载时执行的初始化操作
 * 1. 验证用户信息
 * 2. 初始化Socket连接
 * 3. 获取聊天室消息
 * 4. 滚动到底部
 * 5. 添加取消上传事件监听
 */
onMounted(async () => {
  verifyUserInfo();
  await initSocket();
  await getRoomMessages();
});

/**
 * 验证用户信息
 * 从localStorage获取用户信息，如果不存在则跳转到登录页面
 */
const verifyUserInfo = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/login");
  }
  const savedUsername = localStorage.getItem("username");
  const savedUserId = +localStorage.getItem("userId");
  if (savedUsername && savedUserId) {
    currentUsername.value = savedUsername;
    currentUserId.value = savedUserId;
  } else {
    router.push("/login");
  }
};

/**
 * 退出登录
 * 清除用户信息并跳转到登录页面
 */
const loginOut = () => {
  controller.abort();
  socketClient.disconnect();
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("userId");
  router.push("/login");
};

/**
 * 初始化 Socket.IO 连接
 * 连接服务器并注册各种事件监听器
 * @returns {Promise<void>}
 */
const initSocket = async () => {
  try {
    const socketToken = localStorage.getItem("token");
    if (!socketToken) {
      console.error("未找到有效的用户信息");
      message.error("未找到有效的用户信息");
      return;
    }
    const auth = { token: socketToken };
    console.log("connect", socketClient.isConnected());
    console.log("开始连接");

    if (!socketClient.isConnected()) {
      await socketClient.connect({ auth });
    }
    console.log("connect", socketClient.isConnected());

    await socketClient.joinChat({
      userId: currentUserId.value,
      username: currentUsername.value,
      roomId: roomId.value,
    });
    // 添加新的监听器
    socketClient.on("message", handleReceiveMessage);
    socketClient.on("join", handleUserJoin);

    message.success("已连接到聊天服务器");
  } catch (error) {
    console.error("Socket.IO连接错误:", error);
    message.error("连接聊天服务器失败，请稍后再试");
  }
};

/**
 * 处理接收到的文本消息
 * 验证消息数据有效性，并添加到消息列表
 * @param {Object} message - 消息数据对象
 */
const handleReceiveMessage = (message) => {
  // 验证消息数据是否有效
  console.log("收到消息---:", message);

  if (!message || !message.id) {
    console.log("收到无效的消息数据:", message);
    return;
  }
  if (message.userId == currentUserId.value) return;
  roomMsgs.value = [...roomMsgs.value, { ...message }];
  scrollToBottom();
};

/**
 * 打开文件选择器
 */
const openFileUpload = () => {
  fileInputRef.value.click();
};

/**
 * 打开图片选择器
 */
const openImageUpload = () => {
  imageInputRef.value.click();
};

/**
 * 处理文件选择
 * @param {Event} event - 文件选择事件
 */
const handleFileChange = (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // 添加文件到预览列表
  Array.from(files).forEach((file) => {
    addFileToPreview(file);
  });

  // 清空文件选择器，以便下次选择同一文件时能触发change事件
  event.target.value = "";
};

/**
 * 添加文件到预览列表
 */
const addFileToPreview = (file) => {
  // 创建预览对象
  const previewFile = {
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    preview: null,
  };

  // 如果是图片，创建预览URL
  if (file.type.startsWith("image/")) {
    previewFile.preview = URL.createObjectURL(file);
  }

  // 添加到预览列表
  previewFiles.value.push(previewFile);
};

/**
 * 处理图片选择
 * @param {Event} event - 图片选择事件
 */
const handleImageChange = (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // 添加图片到预览列表
  Array.from(files).forEach((file) => {
    if (file.type.startsWith("image/")) {
      addFileToPreview(file);
    } else {
      message.warning(`${file.name} 不是有效的图片文件`);
    }
  });
  // 清空文件选择器
  event.target.value = "";
};

/**
 * 处理拖拽进入事件
 */
const handleDragOver = () => {
  isDragging.value = true;
};

/**
 * 处理拖拽离开事件
 */
const handleDragLeave = () => {
  isDragging.value = false;
};

/**
 * 处理文件拖放事件
 * @param {DragEvent} event - 拖放事件
 */
const handleDrop = (event) => {
  isDragging.value = false;
  const files = event.dataTransfer.files;
  if (!files || files.length === 0) return;

  // 添加所有拖放的文件到预览列表
  Array.from(files).forEach((file) => {
    addFileToPreview(file);
  });
};

/**
 * 处理粘贴事件
 * @param {ClipboardEvent} event - 粘贴事件
 */
const handlePaste = (event) => {
  const items = event.clipboardData.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // 如果是文件类型
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        addFileToPreview(file);
      }
    }
  }
};

/**
 * 从预览列表中移除文件
 * @param {number} index - 文件索引
 */
const removePreviewFile = (index) => {
  // 如果是图片，释放预览URL
  const file = previewFiles.value[index];
  if (file.preview) {
    URL.revokeObjectURL(file.preview);
  }

  // 从预览列表中移除
  previewFiles.value.splice(index, 1);
};

/**
 * 处理用户加入聊天室的系统消息
 * @param {Object} data - 用户加入数据
 */
const handleUserJoin = (data) => {
  // 验证用户数据是否有效
  console.log("加入");
  if (!data || !data.username) {
    console.log("收到无效的用户加入数据:", data);
    return;
  }

  // 添加系统消息
  roomMsgs.value.push({
    ...data,
    // isSystem: true,
    // content: `${data.username} 加入了聊天室`,
  });
  scrollToBottom();
};

/**
 * 发送消息
 * 创建临时消息对象，清空输入框，并通过Socket发送
 */
const sendMessage = async () => {
  // 如果有预览文件，先发送文件
  if (isComposing.value) return;
  if (previewFiles.value.length > 0) {
    for (const file of previewFiles.value) {
      uploadFile(file.file);
    }
    // 清空预览文件列表
    previewFiles.value = [];
  }

  // 如果有文本消息，发送文本消息
  if (input.value.trim()) {
    // 创建临时消息对象
    const tempMsg = {
      userId: currentUserId.value,
      username: currentUsername.value,
      content: input.value,
      roomId: roomId.value,
      messageType: "text",
      created_at: getFullTime(Date.now()),
    };
    try {
      await socketClient.sendMessage(tempMsg);
      roomMsgs.value.push(tempMsg);
      input.value = "";
      scrollToBottom();
    } catch (error) {
      message.error("发送失败，请重试");
    }
  }
};

/**
 * 上传文件
 * @param {File} file - 要上传的文件
 */
const uploadFile = async (file) => {
  // 保存文件信息
  const timeId = Date.now();
  const fileData = {
    roomId: roomId.value,
    userId: currentUserId.value,
    username: currentUsername.value,
    fileName: file.name,
    fileSize: file.size,
    created_at: getFullTime(Date.now()),
    isUploading: true,
    uploadProgress: 0,
    isPaused: false,
    file,
    timeId,
  };

  // 根据文件类型设置消息类型
  if (file.type.startsWith("image/")) {
    fileData.messageType = "image";
  } else {
    fileData.messageType = "file";
  }

  console.log("开始上传文件:", file);

  let res;
  try {
    if (fileData.messageType !== "image") {
      roomMsgs.value.push({ ...fileData });
      scrollToBottom();
      const onProgress = (progress, checkpoint) => {
        console.log("上传进度:", progress * 100);
        roomMsgs.value
          .filter((msg) => msg.timeId === timeId)
          .forEach((msg) => {
            msg.uploadProgress = Math.floor(progress * 100);
            msg.checkpoint = checkpoint;
          });
      };
      res = await oosUploader.multipartUpload(file, "chatroom", onProgress);
      roomMsgs.value
        .filter((msg) => msg.timeId === timeId)
        .forEach((msg) => {
          msg.checkpoint = checkpoint;
          msg.fileUrl = res.res.requestUrls[0];
          fileData.fileUrl = msg.fileUrl;
        });
    } else {
      res = await oosUploader.uploadFile(file, "chatroom");
      fileData.fileUrl = res.requestUrls[0];
      roomMsgs.value.push({ ...fileData });
    }
    scrollToBottom();
    console.log("文件上传成功了", fileData);
    await socketClient.uploadFileMessage(fileData);
  } catch (error) {
    // 如果是用户主动取消，不显示错误
    if (error.name === "cancel") {
      console.log("上传已取消");
      return;
    }
    console.error("文件上传失败:", error);
    message.error("文件上传失败，请重试");
    // 从消息列表中移除失败的消息
    //移除失败的消息
    roomMsgs.value = roomMsgs.value.filter((msg) => msg.timeId !== timeId);

  }
};

/**
 * 获取当前用户的消息列表
 * 通过API获取用户相关的消息
 */
const getUserMessages = async () => {
  try {
    const res = await getUserMessagesList({
      userId: currentUserId.value,
      limit: 50,
      offset: 0,
    });
    if (res.code === 200) roomMsgs.value = res.data;
  } catch (error) {
    console.error("获取用户消息错误:", error);
    message.error("获取用户消息失败，请稍后再试");
  }
};

/**
 * 获取聊天室的消息列表
 * 通过API获取房间内的所有消息
 */
const getRoomMessages = async (loadMore = false) => {
  try {
    
    signal = controller.signal;
    isLoading.value = true;
    const res = await getRoomMessagesList({
      roomId: roomId.value,
      limit: 50,
      offset: loadMore ? offset.value : 0,
    },{signal});
    if (res.code === 200) {
      if (loadMore) {
        // 如果是加载更多，将新消息添加到现有消息列表前面
        if (res.data.length > 0) {
          const oldScrollHeight = chatBoxRef.value.wrapRef.scrollHeight;
          roomMsgs.value = [...res.data, ...roomMsgs.value];
          // 保持滚动位置，避免跳动
          nextTick(() => {
            const newScrollHeight = chatBoxRef.value.wrapRef.scrollHeight;
            chatBoxRef.value.setScrollTop(newScrollHeight - oldScrollHeight);
          });
        } else {
          // 没有更多消息了
          noMoreMessages.value = true;
        }
      } else {
        roomMsgs.value = res.data;
      }
      offset.value += 50;
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("请求已取消");
      return;
    }
    console.error("获取房间消息错误:", error);
    message.error("获取房间消息失败，请稍后再试");
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
  }
};

/**
 * 加载更多消息
 * 滚动到顶部时触发，获取更多历史消息
 */
const loadMoreMessages = async () => {
  if (isLoadingMore.value || noMoreMessages.value) return;

  isLoadingMore.value = true;
  await getRoomMessages(true);
};

/**
 * 处理滚动事件
 * 当滚动到顶部时触发加载更多消息
 */
const handleScroll = (e) => {
  if (chatBoxRef.value) {
    const scrollTop = chatBoxRef.value.wrapRef.scrollTop;
    // 当滚动位置接近顶部时（小于20px），触发加载更多
    if (scrollTop < 20 && !isLoadingMore.value && !noMoreMessages.value) {
      loadMoreMessages();
    }
  }
};

/**
 * 滚动聊天框到底部
 * 使用nextTick确保DOM更新后再滚动
 */
const scrollToBottom = () => {
  nextTick(() => {
    if (chatBoxRef.value) {
      chatBoxRef.value.setScrollTop(chatBoxRef.value.wrapRef.scrollHeight);
    }
  });
};

/**
 * 暂停文件上传
 * @param {Object} messageData - 消息数据
 */
const pauseUpload = (messageData) => {
  console.log("暂停上传");
  const msgIndex = roomMsgs.value.findIndex(
    (msg) =>
      msg.userId === messageData.userId &&
      msg.created_at === messageData.created_at &&
      msg.fileName === messageData.fileName
  );
  roomMsgs.value[msgIndex].checkpoint = messageData.checkpoint;
  oosUploader.cancelUpload();
};

const resumeUpload = async (messageData) => {
  // 查找消息索引
  const msgIndex = roomMsgs.value.findIndex(
    (msg) =>
      msg.userId === messageData.userId &&
      msg.created_at === messageData.created_at &&
      msg.fileName === messageData.fileName
  );

  if (msgIndex === -1 || !roomMsgs.value[msgIndex].checkpoint) {
    console.error("无法继续上传：找不到消息或上传信息不完整");
    return;
  }

  try {
    const onProgress = (progress, checkpoint) => {
      // 确保更新进度条
      console.log("继续上传进度:", Math.floor(progress * 100));
      roomMsgs.value[msgIndex].uploadProgress = Math.floor(progress * 100);
      // 保存断点信息，用于断点续传
      roomMsgs.value[msgIndex].checkpoint = checkpoint;
    };

    // 从断点继续上传
    const { result } = await oosUploader.resumeUpload(
      messageData.file,
      messageData.checkpoint,
      "chatroom",
      onProgress
    );

    console.log("继续上传成功:", result);

    // 更新文件数据
    const fileUrl = result.res.requestUrls[0];

    // 更新消息列表中的文件信息
    roomMsgs.value[msgIndex].fileUrl = fileUrl;
    console.log("文件继续上传成功了", roomMsgs.value[msgIndex]);

    // 通知服务器文件已上传
    await socketClient.uploadFileMessage({
      ...roomMsgs.value[msgIndex],
      fileUrl: fileUrl,
    });

    console.log("文件继续上传成功了");
  } catch (error) {
    if (error.name === "cancel") return;
    console.error("继续上传失败:", error);
    //移除失败的消息
    roomMsgs.value.splice(msgIndex, 1);
    message.error("继续上传失败，请重试");
  }
};

/**
 * 处理文件下载完成事件
 * @param {Object} messageData - 消息数据
 */
const handleFileDownloaded = (messageData) => {
  console.log("文件已下载:", messageData.fileName);
};

/**
 * 组件卸载前清理工作
 * 移除所有事件监听器并断开Socket连接
 */
onBeforeUnmount(() => {
  socketClient.off("message");
  socketClient.off("join");
  socketClient.disconnect();

  // 取消所有正在进行的上传
  roomMsgs.value.forEach((msg) => {
    if (msg.isUploading && msg.uploader) {
      msg.uploader.cancelUpload();
    }
  });

  // 释放所有图片预览URL
  previewFiles.value.forEach((file) => {
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
  });
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");

  if (to.path === "/" && !token) {
    next("/login");
  } else {
    next();
  }
});
</script>

<style scoped>
.container {
  height: 80vh;
  user-select: none;
  width: 80%;
  display: flex;
  flex-direction: column;
  margin: 40px auto;
  border-radius: 12px;
  position: relative;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-box {
  flex: 1;
  padding: 0 10px;
  border: 1px solid #eee;
  background-color: #f8f9fa;
  overflow-y: auto;
}

.loading-more,
.no-more-messages {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0;
  color: #909399;
  font-size: 14px;
}

.loading-icon {
  animation: rotating 2s linear infinite;
  margin-right: 5px;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.input-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  border-radius: 0 0 12px 12px;
}

.icon-area {
  display: flex;
  gap: 12px;
  padding: 8px;
  overflow-x: auto;
}

.icon-item {
  cursor: pointer;
  font-size: 20px;
  transition: transform 0.2s;
}

.icon-item:hover {
  transform: scale(1.2);
}

.input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 2px dashed transparent;
  border-radius: 8px;
  transition: all 0.3s;
  padding: 8px;
  position: relative;
}

.input-wrapper.drag-over {
  border-color: #409eff;
  background-color: rgba(64, 158, 255, 0.1);
}

.file-preview-area {
  position: absolute;
  bottom: 110%;
  left: 0;
  right: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  margin-bottom: 5px;
  max-height: 200px;
  overflow-y: auto;
  background-color: transparent;
  z-index: 10;
}

.file-preview-item {
  position: relative;
  display: flex;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex: 0 0 auto;
}

.image-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.preview-image {
  width: 100%;
  height: 50px;
  object-fit: cover;
  margin-top: 2px;
}

.file-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.file-preview .el-icon {
  font-size: 20px;
  color: #909399;
  margin-bottom: 2px;
}

.preview-name {
  font-size: 10px;
  color: #606266;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 90%;
  margin-top: 2px;
}

.preview-size {
  font-size: 9px;
  color: #909399;
}

.remove-preview {
  position: absolute;
  top: 0px;
  right: 0px;
  padding: 0px;
  background-color: rgba(204, 125, 125, 0.5);
  color: white;
  border: none;
  transform: scale(0.8);
}

/* 文件上传进度样式 */
.upload-progress-container {
  position: absolute;
  bottom: 100px;
  right: 20px;
  width: 300px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow: hidden;
}

.upload-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.upload-progress-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
}

.upload-progress-item {
  margin-bottom: 10px;
}

.upload-file-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.upload-file-name {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.upload-file-status {
  font-size: 12px;
  color: #909399;
}

:deep(.el-card__body) {
  padding: 0;
  max-height: 100%;
  flex: 1;
}

:deep(.el-input--suffix) {
  flex: 1;
}

:deep(.el-textarea__inner) {
  background-color: transparent;
  /* border: none; */
  height: 100%;
  font-size: 14px;
  outline: none;
  border-color: #dcdfe6;
  box-shadow: none;
  padding: 0px;
}
</style>
