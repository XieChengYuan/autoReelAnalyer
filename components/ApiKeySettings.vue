<template>
  <view v-if="isVisible" class="settings-dialog-overlay">
    <view class="settings-dialog">
      <view class="dialog-header">
        <text class="dialog-title">设置</text>
        <view class="dialog-close" @click="closeDialog">×</view>
      </view>
      
      <view class="settings-content">
        <view class="settings-section">
          <view class="settings-title">
            <uni-icons type="locked" size="18"></uni-icons>
            <text>API 密钥设置</text>
          </view>
          <view class="api-key-content">
            <input
              v-model="apiKey"
              type="text"
              password
              placeholder="请输入您的 API Key"
              class="api-key-input"
            />
            <text class="api-key-tip">API Key 将安全地存储在您的浏览器中</text>
          </view>
        </view>
      </view>
      
      <view class="dialog-footer">
        <button class="btn-cancel" @click="closeDialog">取消</button>
        <button class="btn-confirm" @click="saveSettings">保存</button>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, watch } from 'vue'

export default {
  name: 'ApiKeySettings',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'save'],
  setup(props, { emit }) {
    const isVisible = ref(props.modelValue)
    const apiKey = ref(uni.getStorageSync('glm4v_api_key') || '')

    // 监听 modelValue 的变化
    watch(() => props.modelValue, (newVal) => {
      console.log('modelValue changed:', newVal)
      isVisible.value = newVal
    })

    const closeDialog = () => {
      console.log('Closing dialog...')
      isVisible.value = false
      emit('update:modelValue', false)
    }

    const saveSettings = () => {
      console.log('Saving settings...')
      uni.setStorageSync('glm4v_api_key', apiKey.value)
      emit('save', apiKey.value)
      closeDialog()
    }

    return {
      isVisible,
      apiKey,
      closeDialog,
      saveSettings
    }
  }
}
</script>

<style scoped>
.settings-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.settings-dialog {
  background-color: #fff;
  border-radius: 16rpx;
  width: 600rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
  animation: dialogIn 0.3s ease-out;
}

@keyframes dialogIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 40rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
}

.dialog-close {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #999;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.3s;
}

.dialog-close:hover {
  background-color: #f5f5f5;
}

.settings-content {
  padding: 20rpx 0;
}

.settings-section {
  padding: 20rpx 40rpx;
}

.settings-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.settings-title text {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.api-key-content {
  background-color: #f7f8fa;
  padding: 24rpx;
  border-radius: 12rpx;
}

.api-key-input {
  width: 100%;
  height: 80rpx;
  background-color: #fff;
  border: 2rpx solid #e5e5e5;
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  margin-bottom: 16rpx;
  box-sizing: border-box;
  transition: all 0.3s;
}

.api-key-input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 2rpx rgba(22, 119, 255, 0.1);
}

.api-key-tip {
  font-size: 24rpx;
  color: #909399;
}

.dialog-footer {
  padding: 30rpx 40rpx;
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
  border-top: 2rpx solid #f0f0f0;
}

.btn-cancel, .btn-confirm {
  min-width: 160rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  font-size: 28rpx;
  transition: all 0.3s;
  margin: 0;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background-color: #e8e8e8;
}

.btn-confirm {
  background-color: #1677ff;
  color: #fff;
}

.btn-confirm:hover {
  background-color: #0e5edb;
}
</style> 