<template>
  <!-- 动态渲染图标 -->
  <component :is="iconComponent" class="icon" :width="size" :height="size" />
</template>

<script setup>
import { computed } from 'vue'
import { defineAsyncComponent } from 'vue'

// 接收父组件传递的 props
const props = defineProps({
  iconName: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 24
  }
})

// 根据 iconName 动态导入对应的 SVG 图标
const iconComponent = computed(() => {
  if (!props.iconName) return null
  
  // 使用 defineAsyncComponent 来处理异步加载组件
  return defineAsyncComponent(() =>
    import(`@/assets/icons/${props.iconName}.svg`)
  )
})
</script>