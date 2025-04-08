<template>
  <div class="bubble-wrapper" :class="{ mine: isMine }">
    <el-avatar :size="32" class="avatar">
      {{ username ? username[0].toUpperCase() : 'bot' }}
    </el-avatar>

    <div class="bubble-content-wrapper">
      <div class="bubble-content">
        <div class="message" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
          {{ message }}
        </div>
        <div class="detailed-time" v-show="showDetailedTime">
          {{ getTime(time) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from "vue";
import formatDateTime from "@/utils/formatDateTime.js";

const props = defineProps({
  username: String,
  userId: Number,
  message: String,
  time: String,
  isMine: Boolean,
});

const showDetailedTime = ref(false);
let timer = null;

const getTime = (time) => {
  return formatDateTime(time);
};

const handleMouseEnter = () => {
  clearTimeout(timer); // 清除之前的定时器
  timer = setTimeout(() => {
    showDetailedTime.value = true;
  }, 1000);
};

const handleMouseLeave = () => {
  clearTimeout(timer); // 清除定时器
  showDetailedTime.value = false;
};

// 组件卸载时清除定时器
onUnmounted(() => {
  clearTimeout(timer);
});
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
