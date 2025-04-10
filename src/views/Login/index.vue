<template>
  <div class="login-container">
    <el-card class="login-card" shadow="always">
      <template #header>
        <div class="login-header">
          <el-tabs v-model="activeTab" class="auth-tabs">
            <el-tab-pane label="登录" name="login"></el-tab-pane>
            <el-tab-pane label="注册" name="register"></el-tab-pane>
          </el-tabs>
        </div>
      </template>
      
      <!-- 统一的认证表单 -->
      <el-form class="auth-form" :model="formData">
        <el-form-item label="用户名" prop="username">
          <el-input 
            v-model="formData.username" 
            placeholder="请输入用户名"
            clearable
          ></el-input>
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="formData.password" 
            type="password" 
            placeholder="请输入密码"
            show-password
          ></el-input>
        </el-form-item>
        
        <!-- 仅在注册模式下显示确认密码 -->
        <el-form-item v-if="activeTab === 'register'" label="确认密码" prop="confirmPassword">
          <el-input 
            v-model="formData.confirmPassword" 
            type="password" 
            placeholder="请再次输入密码"
            show-password
          ></el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            class="auth-button"
            :loading="loading"
          @click="activeTab === 'login' ? handleLogin() : handleRegister()"
          >{{ activeTab === 'login' ? '登录' : '注册' }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import message from '@/components/message';
import socketClient from '@/utils/socket';

// 当前激活的标签页
const activeTab = ref('login');
const loading = ref(false);

// 统一的表单数据
const formData = reactive({
  username: '',
  password: '',
  confirmPassword: '',
});

const router = useRouter();

// 初始化Socket.IO连接
onMounted(async () => {
  try {
    // console.log('正在连接Socket.IO服务器...');
    const socketToken = localStorage.getItem('token');
    const auth = {token: socketToken};
    // 如果Socket.IO未连接，则连接
    if (!socketClient.isConnected()) {
      await socketClient.connect({auth});
    }
    
    // 监听认证事件
    socketClient.on('auth_success', handleAuthSuccess);
    socketClient.on('auth_error', handleAuthError);
  } catch (error) {
    console.error('Socket.IO连接错误:', error);
    message.error('服务器连接失败，请稍后再试');
  }
});

// 处理登录
const handleLogin = async () => {
  if (!formData.username || !formData.password) {
    message.warning('请输入用户名和密码');
    return;
  }
  
  try {
    loading.value = true;
    
    // 使用Socket.IO发送登录请求
    await socketClient.login({
      username: formData.username,
      password: formData.password
    });
    
    // 登录成功处理在handleAuthSuccess中
  } catch (error) {
    console.error('登录错误:', error);
    message.error(error.message || '登录失败，请稍后再试');
  } finally {
    loading.value = false;
  }
};

// 处理注册
const handleRegister = async () => {
  if (!formData.username || !formData.password || !formData.confirmPassword) {
    message.warning('请填写所有注册信息');
    return;
  }
  
  if (formData.password !== formData.confirmPassword) {
    message.warning('两次输入的密码不一致');
    return;
  }
  
  try {
    loading.value = true;
    
    // 使用Socket.IO发送注册请求
    await socketClient.register({
      username: formData.username,
      password: formData.password
    });
    
    // 注册成功处理在handleAuthSuccess中
  } catch (error) {
    console.error('注册错误:', error);
    message.error(error.message || '注册失败，请稍后再试');
  } finally {
    loading.value = false;
  }
};

// 处理认证成功
const handleAuthSuccess = (data) => {
  const action = activeTab.value === 'login' ? '登录' : '注册';
  // 保存用户信息到本地存储
  localStorage.setItem('userId', data.user.id);
  localStorage.setItem('username', data.user.username);
  localStorage.setItem('token', data.token);
  
  // 加入聊天室
  socketClient.joinChat({
    userId: data.user.id,
    username: data.user.username
  });
  if(activeTab.value === 'register'){
    activeTab.value = 'login';
    // 清空表单
    formData.username = '';
    formData.password = '';
    formData.confirmPassword = '';
    // 提示用户登录
    message.success('注册成功');
    router.push('/login');
  }else{
    message.success('登录成功');
    router.push('/');
  }
};

// 处理认证错误
const handleAuthError = (error) => {
  message.error(error.message || '认证失败');
};
</script>

<style lang="css" scoped>
.login-container {
  user-select: none;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: radial-gradient(circle at center, #9aced6 0%, #18d9dc 100%);
  padding: 20px;
}

.login-card {
  width: 400px;
  border-radius: 8px;
  transition: all 0.5s ease-in-out;
}

.login-header {
  text-align: center;
  padding: 10px 0;
}

.auth-tabs {
  width: 100%;
}

.auth-form {
  padding: 20px;
  transition: height 0.3s ease-in-out;
  overflow: hidden;
}
:deep(.el-tabs__nav-wrap:after){
    width: auto;
}
:deep(.el-tabs__item) {
  transition: font-size 0.5s ease-in-out;
}

:deep(.el-tabs__item.is-active) {
  color: #409eff;
  font-size: 26px;
}
:deep(.el-form-item__label) {
  width: 80px ;
  text-align: right;
}
:deep(.el-form-item__label:after) {
  content: ':';
}

:deep(.el-input) {
  flex: 1;
}

:deep(.el-form-item__content) {
  display: flex;
  justify-content: center;
}


.auth-button {
  width: 60%;
  margin-top: 10px;
}
</style>