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
      <el-scrollbar class="chat-box" ref="chatBoxRef">
        <ChatBubble
          v-for="(msg, i) in messages"
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
import { getUserMessagesList, getRoomMessagesList } from "@/api";

const router = useRouter();
const input = ref("");
const roomId = ref(1);
const messages = ref([]);
const chatBoxRef = ref(null);
const currentUsername = ref("");
const currentUserId = ref("");
const showChatHistory = ref(false);

onMounted(async () => {
  verifyUserInfo();
  await initSocket();
  await getRoomMessages();
  scrollToBottom();
});

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

const loginOut = () => {
  currentUsername.value = "";
  currentUserId.value = "";
  localStorage.removeItem("username");
  localStorage.removeItem("userId");
  router.push("/login");
};

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

const handleReceiveMessage = (data) => {
  const isDuplicate = messages.value.some((msg) => msg.id === data.id);
  if (!isDuplicate) {
    messages.value.push({
      ...data,
      senderName: data.senderName,
      isMine: data.userId === currentUserId.value,
    });
    scrollToBottom();
  }
};

const handleReceiveFile = (data) => {
  messages.value.push({ ...data, isFile: true });
  scrollToBottom();
};

const handleReceiveImage = (data) => {
  messages.value.push({ ...data, isImage: true });
  scrollToBottom();
};

const handleUserJoin = (data) => {
  messages.value.push({
    ...data,
    isSystem: true,
    text: `${data.username} 加入了聊天室`,
  });
  scrollToBottom();
};

const sendMessage = async () => {
  if (!input.value.trim()) return;

  const tempMsg = {
    userId: currentUserId.value,
    senderName: currentUsername.value,
    content: input.value,
    created_at: new Date().toISOString(),
    isMine: true,
    status: "sending",
  };

  messages.value.push(tempMsg);
  input.value = "";
  scrollToBottom();

  try {
    await socketClient.sendMessage({
      userId: currentUserId.value,
      username: currentUsername.value,
      content: tempMsg.content,
    });
    const index = messages.value.findIndex(
      (msg) => msg.created_at === tempMsg.created_at
    );
    if (index !== -1) messages.value[index].status = "sent";
  } catch (error) {
    const index = messages.value.findIndex(
      (msg) => msg.created_at === tempMsg.created_at
    );
    if (index !== -1) messages.value[index].status = "failed";
    message.error("发送失败，请重试");
  }
};

const getUserMessages = async () => {
  try {
    const res = await getUserMessagesList({
      userId: currentUserId.value,
      limit: 50,
      offset: 0,
    });
    if (res.code === 200) messages.value = res.data;
  } catch (error) {
    console.error("获取用户消息错误:", error);
    message.error("获取用户消息失败，请稍后再试");
  }
};

const getRoomMessages = async () => {
  try {
    const res = await getRoomMessagesList({
      roomId: roomId.value,
      limit: 50,
      offset: 0,
    });
    if (res.code === 200) messages.value = res.data;
  } catch (error) {
    console.error("获取房间消息错误:", error);
    message.error("获取房间消息失败，请稍后再试");
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatBoxRef.value) {
      chatBoxRef.value.setScrollTop(chatBoxRef.value.wrapRef.scrollHeight);
    }
  });
};

watch(currentUsername, (newUsername) => {
  localStorage.setItem("username", newUsername);
});

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
