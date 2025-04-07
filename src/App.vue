<template>
  <div>
    <router-view/>
  </div>
</template>

<script setup>
// 使用路由视图替代直接导入组件

import { onMounted } from "vue";

// 定义调整函数
// const baseWidth = 540; // 设计稿的基准宽度
// const adjustFontSize = () => {
//   const currentWidth = document.documentElement.clientWidth;
//   document.documentElement.style.fontSize = (currentWidth / baseWidth) * 16 + 'px';
// }

// onMounted(() =>{
//   // 监听窗口变化
//   adjustFontSize()
// window.addEventListener('resize', adjustFontSize);
// })

</script>

<style lang="css" scoped>

</style>