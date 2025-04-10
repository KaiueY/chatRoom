<template>
  <div class="chat-history-container">
    <!-- 在对话框中不需要显示页头 -->
    <div class="chat-history-header" v-if="!inDialog">
      <el-page-header @back="closeHistory" title="返回聊天" content="聊天记录" />
    </div>
    
    <el-tabs v-model="activeTab" class="history-tabs">
      <el-tab-pane label="聊天室记录" name="room"></el-tab-pane>
      <el-tab-pane label="我的消息" name="user"></el-tab-pane>
    </el-tabs>
    
    <el-scrollbar class="history-messages" ref="messagesRef">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>
      
      <div v-else-if="messages.length === 0" class="empty-container">
        <el-empty description="暂无聊天记录" />
      </div>
      
      <template v-else>
        <div v-for="(msg, index) in messages" :key="index" class="history-message-item">
          <div class="message-header">
            <span class="username">{{ msg.username }}</span>
            <span class="time">{{ formatDateTime(msg.created_at) }}</span>
          </div>
          
          <div class="message-content">
            <template v-if="msg.messageType === 'text'">
              {{ msg.content }}
            </template>
            
            <template v-else-if="msg.messageType === 'file'">
              <div class="file-message">
                <el-icon><Document /></el-icon>
                <span>{{ msg.fileName }}</span>
                <span class="file-size">({{ formatFileSize(msg.fileSize) }})</span>
              </div>
            </template>
            
            <template v-else-if="msg.messageType === 'image'">
              <div class="image-message">
                <el-icon><Picture /></el-icon>
                <span>{{ msg.fileName }}</span>
              </div>
            </template>
            
            <template v-else-if="msg.messageType === 'system'">
              <div class="system-message">
                {{ msg.content }}
              </div>
            </template>
          </div>
        </div>
        
        <div v-if="hasMore" class="load-more">
          <el-button type="primary" link @click="loadMore" :loading="loadingMore">
            加载更多
          </el-button>
        </div>
      </template>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import formatDateTime from '@/utils/formatDateTime.js';
import axios from 'axios';
import message from '@/components/Message';
import formatFileSize from '@/utils/formatFileSize'


const props = defineProps({
  visible: Boolean,
  userId: String,
  roomId: {
    type: Number,
    default: 1
  },
  inDialog: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close']);

const activeTab = ref('room');
const messages = ref([]);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(true);
const messagesRef = ref(null);
const offset = ref(0);
const limit = 20;

// 关闭历史记录
const closeHistory = () => {
  emit('close');
};


// 加载消息历史
const loadMessages = async (reset = true) => {
  if (reset) {
    offset.value = 0;
    messages.value = [];
    hasMore.value = true;
    loading.value = true;
  } else {
    loadingMore.value = true;
  }
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('请先登录');
      return;
    }
    
    const config = {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit, offset: offset.value }
    };
    
    let url = '';
    if (activeTab.value === 'room') {
      url = `/api/messages/room/${props.roomId}`;
    } else {
      url = '/api/messages/user';
    }
    
    const response = await axios.get(url, config);
    
    if (response.data.success) {
      const newMessages = response.data.data;
      
      if (reset) {
        messages.value = newMessages;
      } else {
        messages.value = [...messages.value, ...newMessages];
      }
      
      // 更新分页
      offset.value += limit;
      hasMore.value = newMessages.length === limit;
    } else {
      message.error('获取聊天记录失败');
    }
  } catch (error) {
    console.error('获取聊天记录错误:', error);
    message.error('获取聊天记录失败，请稍后再试');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

// 加载更多消息
const loadMore = () => {
  if (hasMore.value && !loadingMore.value) {
    loadMessages(false);
  }
};

// 监听标签页切换
watch(activeTab, () => {
  loadMessages();
});

// 组件挂载时加载消息
onMounted(() => {
  loadMessages();
});
</script>

<style scoped>
.chat-history-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chat-history-header {
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
}

.history-tabs {
  padding: 0 16px;
}

.history-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.loading-container,
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 20px;
}

.history-message-item {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background-color: #f8f9fa;
  transition: background-color 0.3s;
}

.history-message-item:hover {
  background-color: #f0f2f5;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.username {
  font-weight: bold;
  color: #409eff;
}

.time {
  color: #909399;
  font-size: 12px;
}

.message-content {
  word-break: break-word;
  line-height: 1.5;
}

.file-message,
.image-message {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-size {
  color: #909399;
  font-size: 12px;
}

.system-message {
  color: #909399;
  font-style: italic;
  text-align: center;
}

.load-more {
  text-align: center;
  margin-top: 16px;
}
</style>