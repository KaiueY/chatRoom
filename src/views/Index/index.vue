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
          <el-icon class="loading-icon"><Loading /></el-icon>
          <span>加载更多消息...</span>
        </div>
        <div class="no-more-messages" v-if="noMoreMessages && !isLoadingMore">
          <span>没有更多消息了</span>
        </div>
        <ChatBubble
          v-for="(msg, i) in roomMsgs"
          :key="i"
          :username="msg.senderName"
          :userId="msg.userId"
          :message="msg.content"
          :time="msg.created_at"
          :isMine="msg.userId === currentUserId"
        />
      </el-scrollbar>

      <div class="input-area">
        <div class="icon-area">
          <el-tooltip placement="top">
            <template #content>文件上传</template>
            <div class="icon-item"><ChatFolder /></div>
          </el-tooltip>

          <el-tooltip placement="top">
            <template #content>图片上传</template>
            <div class="icon-item"><ChatImage /></div>
          </el-tooltip>

          <el-tooltip placement="top">
            <template #content>聊天记录</template>
            <div class="icon-item" @click="showChatHistory = true">
              <ChatRecord />
            </div>
          </el-tooltip>
        </div>

        <el-input
          type="textarea"
          v-model="input"
          resize="none"
          @keyup.enter="sendMessage"
          clearable
        />
      </div>
    </div>

    <el-dialog
      v-model="showChatHistory"
      title="聊天记录"
      width="80%"
      destroy-on-close
      class="history-dialog"
    >
      <ChatHistory
        :visible="showChatHistory"
        :userId="currentUserId"
        :roomId="1"
        @close="showChatHistory = false"
      />
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import ChatBubble from "@/components/ChatBubble.vue";
import ChatHistory from "@/components/ChatHistory.vue";
import socketClient from "@/utils/socket";
import message from "@/components/Message";
import ChatRecord from "@/assets/icons/ChatRecord.vue";
import ChatFolder from "@/assets/icons/ChatFolder.vue";
import ChatImage from "@/assets/icons/ChatImage.vue";
import ChatOut from "@/assets/icons/ChatOut.vue";
import { Loading } from "@element-plus/icons-vue";
import { getUserMessagesList, getRoomMessagesList } from "@/api";

// 获取路由实例
const router = useRouter();
// 定义响应式数据
const input = ref("");           // 输入框内容
const roomId = ref(1);           // 当前聊天室ID
const roomMsgs = ref([]);        // 消息列表
const userMsg = ref([]);         // 用户消息列表
const chatBoxRef = ref(null);    // 聊天框DOM引用
const currentUsername = ref(""); // 当前用户名
const currentUserId = ref("");   // 当前用户ID
const showChatHistory = ref(false); // 是否显示聊天记录对话框
const isLoading = ref(false);      // 是否正在加载消息
const isLoadingMore = ref(false);  // 是否正在加载更多历史消息
const offset = ref(0);             // 消息分页偏移量
const noMoreMessages = ref(false); // 是否没有更多历史消息
/**
 * 监听消息列表变化，滚动到底部
 */
watch(roomMsgs, () => {
  if(isLoading.value)return;
   scrollToBottom();
});

/**
 * 组件挂载时执行的初始化操作
 * 1. 验证用户信息
 * 2. 初始化Socket连接
 * 3. 获取聊天室消息
 * 4. 滚动到底部
 */
onMounted(async () => {
  verifyUserInfo();
  await initSocket();
  await getRoomMessages();
  // scrollToBottom();
});

/**
 * 验证用户信息
 * 从localStorage获取用户信息，如果不存在则跳转到登录页面
 */
const verifyUserInfo = () => {
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
  currentUsername.value = "";
  currentUserId.value = "";
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
    if (!socketClient.isConnected()) {
      await socketClient.connect();
    }

    await socketClient.joinChat({
      userId: currentUserId.value,
      username: currentUsername.value,
    });

    socketClient.on("message", handleReceiveMessage);
    socketClient.on("file", handleReceiveFile);
    socketClient.on("image", handleReceiveImage);
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
 * @param {Object} data - 消息数据对象
 */
const handleReceiveMessage = (data) => {
  // 验证消息数据是否有效
  if (!data || !data.userId || !data.content) {
    console.log('收到无效的消息数据:', data);
    return;
  }
  
  roomMsgs.value.push({
      ...data,
      senderName: data.senderName,
      isMine: data.userId === currentUserId.value,
    });
    scrollToBottom();
};

/**
 * 处理接收到的文件消息
 * @param {Object} data - 文件消息数据
 */
const handleReceiveFile = (data) => {
  roomMsgs.value.push({ ...data, isFile: true });
  scrollToBottom();
};

/**
 * 处理接收到的图片消息
 * @param {Object} data - 图片消息数据
 */
const handleReceiveImage = (data) => {
  roomMsgs.value.push({ ...data, isImage: true });
  scrollToBottom();
};

/**
 * 处理用户加入聊天室的系统消息
 * @param {Object} data - 用户加入数据
 */
const handleUserJoin = (data) => {
  // 验证用户数据是否有效
  if (!data || !data.username) {
    console.log('收到无效的用户加入数据:', data);
    return;
  }
  
  // 添加系统消息
  roomMsgs.value.push({
    ...data,
    isSystem: true,
    content: `${data.username} 加入了聊天室`,
  });
  scrollToBottom();
};

/**
 * 发送消息
 * 创建临时消息对象，清空输入框，并通过Socket发送
 */
const sendMessage = async () => {
  if (!input.value.trim()) return;

  // 创建临时消息对象
  const tempMsg = {
    userId: currentUserId.value,
    senderName: currentUsername.value,
    content: input.value,
    created_at: new Date().toISOString(),
    isMine: true,
    status: "sending",
  };

  input.value = "";
  scrollToBottom();

  try {
    await socketClient.sendMessage({
      userId: currentUserId.value,
      username: currentUsername.value,
      content: tempMsg.content,
    });
    const index = roomMsgs.value.findIndex(
      (msg) => msg.created_at === tempMsg.created_at
    );
    if (index !== -1) roomMsgs.value[index].status = "sent";
  } catch (error) {
    const index = roomMsgs.value.findIndex(
      (msg) => msg.created_at === tempMsg.created_at
    );
    if (index !== -1) roomMsgs.value[index].status = "failed";
    message.error("发送失败，请重试");
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
const getRoomMessages = async (loadMore=false) => {
  try {
    isLoading.value = true;
    const res = await getRoomMessagesList({
      roomId: roomId.value,
      limit: 50,
      offset: loadMore ? offset.value : 0,
    });
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
 * 监听用户名变化，保存到localStorage
 */
watch(currentUsername, (newUsername) => {
  localStorage.setItem("username", newUsername);
},
);

/**
 * 组件卸载前清理工作
 * 移除所有事件监听器并断开Socket连接
 */
onBeforeUnmount(() => {
  socketClient.off("message");
  socketClient.off("file");
  socketClient.off("image");
  socketClient.off("join");
  socketClient.disconnect();
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
  border: none;
  height: 100%;
  font-size: 14px;
  outline: none;
  border-color: #dcdfe6;
  box-shadow: none;
  padding: 5px 8px;
}
</style>
