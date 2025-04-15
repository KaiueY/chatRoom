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
import getSocketClient from '@/utils/socket';
import { loginApi,registerApi } from '@/api';
import { watch } from 'vue';

// 当前激活的标签页
const activeTab = ref('login');
const loading = ref(false);
const router = useRouter();

// 统一的表单数据
const formData = reactive({
  username: '',
  password: '',
  confirmPassword: '',
});
const socketClient = getSocketClient();

onMounted(async () => {
});

// 处理登录
const handleLogin = async () => {
  if (!formData.username || !formData.password) {
    message.warning('请输入用户名和密码');
    return;
  }
  try {
    loading.value = true;
    console.log('开始登录');

    // 使用Socket.IO发送登录请求
    const res = await loginApi({
      username: formData.username,
      password: formData.password
    });
    if(res.code==200) {
      message.success('登录成功');
      // 保存用户信息到本地存储
      localStorage.setItem('userId', res.data.user.id);
      localStorage.setItem('username', res.data.user.username);
      localStorage.setItem('token', res.data.token);
      console.log('登录成功', res);
      console.log('connect',socketClient.isConnected());
      router.push('/');

    }
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
    console.log('开始注册');
    
    // 使用Socket.IO发送注册请求
    const res = await registerApi({
      username: formData.username,
      password: formData.password
    });
    if(res.code==200) {
      

      // 保存用户信息到本地存储
      localStorage.setItem('userId', res.data.user.id);
      localStorage.setItem('username', res.data.user.username);
      localStorage.setItem('token', res.data.token);
      socketClient.joinChat({
        userId: res.data.user.id,
        username: res.data.user.username
      });
      message.success('注册成功',res);
      router.push('/');
    }
  } catch (error) {
    console.error('注册错误:', error);
    message.error(error.message || '注册失败，请稍后再试');
  } finally {
    loading.value = false;
  }
};



watch(() => activeTab.value, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    // 切换标签页时清空表单
    formData.username = '';
    formData.password = '';
    formData.confirmPassword = '';
  }
})
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