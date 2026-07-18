<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon" src="/static/icons/add-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/add-topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">添加物品</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">
      <!-- 图片预览区 -->
      <view class="img-section">
        <view class="img-preview">
          <image class="img-preview__img" :src="previewImage" mode="aspectFill" />
          <view class="scanning-overlay">
            <image class="scanning-frame-icon" src="/static/icons/add-shibiezhuangtai.svg" mode="aspectFit" />
          </view>
        </view>
        <view class="scanning-hint">
          <image class="scanning-hint__icon-img" src="/static/icons/add-zhengzaishibie.svg" mode="aspectFit" />
          <text class="scanning-hint__text">正在识别图片信息...</text>
        </view>
        <text class="scanning-hint__sub">请耐心等待</text>
      </view>

      <!-- 骨架屏表单区 -->
      <view class="skeleton-section">
        <!-- 物品名称 -->
        <view class="skeleton-group">
          <view class="skeleton-bg skeleton-label skeleton-label--short"></view>
          <view class="skeleton-bg skeleton-input skeleton-input--long"></view>
          <view class="skeleton-divider"></view>
        </view>

        <!-- 分类 -->
        <view class="skeleton-group">
          <view class="skeleton-bg skeleton-label skeleton-label--short"></view>
          <view class="skeleton-row-between">
            <view class="skeleton-bg skeleton-input skeleton-input--medium"></view>
            <image class="skeleton-arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
          </view>
          <view class="skeleton-divider"></view>
        </view>

        <!-- 生产日期 & 保质期 -->
        <view class="skeleton-group">
          <view class="skeleton-cols">
            <view class="skeleton-col">
              <view class="skeleton-bg skeleton-label skeleton-label--medium"></view>
              <view class="skeleton-bg skeleton-input skeleton-input--long"></view>
            </view>
            <view class="skeleton-col">
              <view class="skeleton-bg skeleton-label skeleton-label--short"></view>
              <view class="skeleton-bg skeleton-input skeleton-input--medium"></view>
            </view>
          </view>
          <view class="skeleton-divider"></view>
        </view>

        <!-- 当前状态 -->
        <view class="skeleton-group">
          <view class="skeleton-bg skeleton-label skeleton-label--short"></view>
          <view class="skeleton-status-row">
            <view class="skeleton-bg skeleton-status-btn"></view>
            <view class="skeleton-bg skeleton-status-btn"></view>
          </view>
          <view class="skeleton-divider"></view>
        </view>

        <!-- 到期提醒 -->
        <view class="skeleton-group">
          <view class="skeleton-bg skeleton-label skeleton-label--medium"></view>
          <view class="skeleton-row-between">
            <view class="skeleton-bg skeleton-input skeleton-input--long"></view>
            <image class="skeleton-arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
          </view>
          <view class="skeleton-divider"></view>
        </view>
      </view>

      <!-- 底部保存按钮放在滚动流内 -->
      <view class="bottom-action">
        <view class="save-btn save-btn--disabled">
          <text class="save-btn__text">保存到物品库</text>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { recognitionService } from '../../services/recognitionService.js'
import { isStoredLoggedIn } from '../../utils/authSessionStore.js'

const previewImage = ref('/static/icons/add-Blurry Placeholder Image.svg')
const isProcessing = ref(false)

onLoad(() => {
  if (!isStoredLoggedIn()) {
    uni.showModal({
      title: '登录后再继续',
      content: '登录后才能使用拍照识字和图片整理，小管家会把这份记录稳稳留在你的账号里。',
      confirmText: '去登录',
      cancelText: '先手动填写',
      success: (res) => {
        if (res.confirm) {
          uni.switchTab({ url: '/pages/me/index' })
        } else {
          uni.navigateBack()
        }
      }
    })
    return
  }
  setTimeout(() => {
    startRecognize()
  }, 100)
})

function startRecognize() {
  if (isProcessing.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: async (res) => {
      const tempPath = res.tempFilePaths[0]
      previewImage.value = tempPath
      isProcessing.value = true
      
      try {
        const result = await recognitionService.recognize(tempPath)
        if (result.success && result.sessionId) {
          uni.showToast({ title: '识别成功', icon: 'success' })
          uni.$emit('ocr-success', result.sessionId)
          setTimeout(() => uni.navigateBack(), 800)
        } else {
          uni.showToast({ title: '识别失败，请重试', icon: 'none' })
          isProcessing.value = false
        }
      } catch (e) {
        uni.showToast({ title: '识别异常', icon: 'none' })
        isProcessing.value = false
      }
    },
    fail: () => {
      // User cancelled
      uni.navigateBack()
    }
  })
}

function onBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
$color-bg: #F9F8F6;
$color-bg-light: #F4F3F1;
$color-text: #333634;
$color-line: rgba(51, 54, 52, 0.1);
$shadow-card: 0 8rpx 24rpx rgba(51, 54, 52, 0.08);
$radius-card: 32rpx;
$radius-full: 9999rpx;

/* 统一字体格式为思源宋体 */
view, text, input, button {
  font-family: 'Noto Serif SC', serif;
}

.page {
  width: 100%;
  height: 100vh;
  background: $color-bg;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 120rpx;
  padding-top: var(--status-bar-height, 44rpx);
  background: #FAF9F7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2rpx solid $color-line;
  box-shadow: 0 16rpx 48rpx rgba(51, 54, 52, 0.1);

  &__back {
    width: 88rpx;
    height: 120rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__back-icon {
    width: 36rpx;
    height: 36rpx;
  }

  &__center {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
  }

  &__leaf {
    width: 32rpx;
    height: 32rpx;
    margin-top: 4rpx;
  }

  &__title {
    font-size: 36rpx;
    font-weight: 700;
    color: #536251;
    line-height: 1.2;
  }

  &__placeholder {
    width: 88rpx;
  }
}

/* 滚动体 */
.scroll-body {
  flex: 1;
  margin-top: calc(120rpx + var(--status-bar-height, 44rpx));
  height: calc(100vh - 120rpx - var(--status-bar-height, 44rpx));
}

/* 图片区 */
.img-section {
  margin: 32rpx 48rpx 0;
  background: $color-bg-light;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 40rpx 48rpx;
}

.img-preview {
  width: 100%;
  height: 360rpx;
  position: relative;
  overflow: hidden;
  border-radius: 16rpx;
  margin-bottom: 24rpx;

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(12px);
    opacity: 0.8;
  }
}

.scanning-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.02);
}

.scanning-frame-icon {
  width: 100rpx;
  height: 110rpx;
  opacity: 0.5;
}

.scanning-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-bottom: 8rpx;

  &__icon-img {
    width: 28rpx;
    height: 28rpx;
    animation: rotate 2s linear infinite;
  }

  &__text {
    font-size: 28rpx;
    color: #444842;
  }
}

.scanning-hint__sub {
  font-size: 24rpx;
  color: rgba(68, 72, 66, 0.6);
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 骨架屏效果 */
.skeleton-bg {
  background: linear-gradient(90deg, #EAE9E7 25%, #F4F3F1 50%, #EAE9E7 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 骨架屏区 */
.skeleton-section {
  margin: 40rpx 48rpx 0;
}

.skeleton-group {
  margin-bottom: 8rpx;
}

.skeleton-label {
  height: 24rpx;
  border-radius: 8rpx;
  margin-bottom: 24rpx;

  &--short { width: 96rpx; }
  &--medium { width: 140rpx; }
}

.skeleton-input {
  height: 48rpx;
  border-radius: 12rpx;

  &--medium { width: 160rpx; }
  &--long { width: 100%; max-width: 400rpx; }
}

.skeleton-row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64rpx;
}

.skeleton-arrow-icon {
  width: 24rpx;
  height: 24rpx;
  opacity: 0.4;
}

.skeleton-cols {
  display: flex;
  flex-direction: row;
  gap: 48rpx;
}

.skeleton-col {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.skeleton-status-row {
  display: flex;
  flex-direction: row;
  gap: 24rpx;
  height: 80rpx;
  margin-top: 16rpx;
}

.skeleton-status-btn {
  flex: 1;
  height: 80rpx;
  border-radius: $radius-full;
}

.skeleton-divider {
  height: 2rpx;
  background: $color-line;
  margin: 24rpx 0 32rpx;
}

.safe-bottom {
  height: 40rpx;
}

/* 保存按钮（流内） */
.bottom-action {
  padding: 40rpx 48rpx 48rpx;
}

.save-btn {
  width: 100%;
  height: 104rpx;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E3E2E0;

  &__text {
    font-size: 32rpx;
    font-weight: 500;
    color: rgba(68, 72, 66, 0.5); /* #444842 50%透明度 */
  }
}
</style>
