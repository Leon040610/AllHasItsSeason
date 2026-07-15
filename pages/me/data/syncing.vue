<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon-img" src="/static/icons/data-not-logged-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/data-topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">数据管理</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">

      <!-- 同步进度区 -->
      <view class="sync-status-area">
        <!-- 旋转动画圆圈 -->
        <view class="sync-icon-wrap">
          <view class="sync-icon-bg-ring" />
          <view class="sync-icon-circle">
            <image class="sync-icon-text-img" src="/static/icons/data-syncing-tongbu.svg" mode="aspectFit" />
          </view>
        </view>
        <text class="sync-title">正在同步中</text>
        <text class="sync-desc">我们正在为您整理家庭物品清单，并将{{ '\n' }}其安全地加密同步至云端。</text>
      </view>

      <!-- 数据详情 -->
      <view class="detail-section">
        <text class="detail-section__title">数据详情</text>
        <view class="progress-list">
          <!-- 云端备份同步（进行中） -->
          <view class="progress-item progress-item--active">
            <view class="progress-item__header">
              <view class="progress-item__icon-wrap progress-item__icon-wrap--active">
                <image class="progress-item__icon-img" src="/static/icons/data-syncing-yunduanbeifentongbu.svg" mode="aspectFit" />
              </view>
              <view class="progress-item__info">
                <text class="progress-item__label">云端备份同步</text>
                <text class="progress-item__sub">同步中</text>
              </view>
              <text class="progress-item__percent">{{ syncProgress }}%</text>
            </view>
            <view class="progress-bar">
              <view class="progress-bar__fill" :style="{ width: syncProgress + '%' }" />
            </view>
          </view>

          <!-- 图片资源压缩（等待） -->
          <view class="progress-item">
            <view class="progress-item__header">
              <view class="progress-item__icon-wrap progress-item__icon-wrap--muted">
                <image class="progress-item__icon-img" src="/static/icons/data-syncing-tupianziyuanyasuo.svg" mode="aspectFit" />
              </view>
              <view class="progress-item__info">
                <text class="progress-item__label">图片资源压缩</text>
              </view>
              <image class="progress-item__waiting-img" src="/static/icons/data-syncing-jiazai.svg" mode="aspectFit" />
            </view>
          </view>

          <!-- 过期记录清理（等待） -->
          <view class="progress-item">
            <view class="progress-item__header">
              <view class="progress-item__icon-wrap progress-item__icon-wrap--muted">
                <image class="progress-item__icon-img" src="/static/icons/data-syncing-guoqijiluqingli.svg" mode="aspectFit" />
              </view>
              <view class="progress-item__info">
                <text class="progress-item__label">过期记录清理</text>
              </view>
              <image class="progress-item__waiting-img" src="/static/icons/data-syncing-jiazai.svg" mode="aspectFit" />
            </view>
          </view>
        </view>

        <!-- 提示信息 -->
        <view class="warning-tip">
          <image class="warning-tip__icon-img" src="/static/icons/data-syncing-tongbuqijian.svg" mode="aspectFit" />
          <text class="warning-tip__text">同步期间请保持网络连接稳定，建议在 Wi-Fi 环境下操作。关闭页面可能会中断当前任务。</text>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 底部操作区 -->
    <view class="bottom-actions">
      <view class="btn-confirming">
        <view class="btn-confirming__spinner-wrap">
          <image class="btn-confirming__spinner-bg" src="/static/icons/data-syncing-querentongbuzhong2.svg" mode="aspectFit" />
          <image class="btn-confirming__spinner-img" src="/static/icons/data-syncing-querentongbuzhong1.svg" mode="aspectFit" />
        </view>
        <text class="btn-confirming__text">确认同步中</text>
      </view>
      <view class="btn-cancel" @tap="onCancelSync">
        <text class="btn-cancel__text">取消当前同步</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { syncService } from '../../../services/syncService.js'

const syncProgress = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
let isCancelled = false

onMounted(async () => {
  const settings = syncService.getSettings()
  syncProgress.value = settings.syncProgress || 0
  
  // Real sync loop
  try {
    // start fake progress animation up to 80%
    timer = setInterval(() => {
      if (syncProgress.value < 80) syncProgress.value += 5
    }, 200)
    
    const res = await syncService.syncItems()
    if (isCancelled) return
    
    // complete progress
    if (timer) clearInterval(timer)
    syncProgress.value = 100
    
    setTimeout(() => {
      if (!isCancelled) {
        uni.redirectTo({ url: '/pages/me/data/success' })
      }
    }, 800)
  } catch (err: any) {
    if (isCancelled) return
    if (timer) clearInterval(timer)
    
    if (err.message === 'not_logged_in') {
      uni.redirectTo({ url: '/pages/me/data/not-logged' })
    } else {
      uni.redirectTo({ url: '/pages/me/data/no-sync' })
    }
  }
})

onUnmounted(() => {
  isCancelled = true
  if (timer) clearInterval(timer)
})

function onBack() {
  uni.navigateBack()
}

function onCancelSync() {
  if (timer) clearInterval(timer)
  uni.showModal({
    title: '确认取消同步？',
    content: '取消后已同步部分将保留，未完成部分需要重新同步。',
    confirmText: '取消同步',
    confirmColor: '#D98A6C',
    cancelText: '继续同步',
    success(res) {
      if (res.confirm) {
        uni.navigateBack()
      }
    },
  })
}
</script>

<style lang="scss" scoped>
$color-bg: #FAF9F7;
$color-card: #FFFFFF;
$color-primary: #8A9A86;
$color-primary-dark: #536251;
$color-text: #333634;
$color-text-secondary: rgba(51, 54, 52, 0.64);
$color-warn: #D98A6C;
$color-line: rgba(51, 54, 52, 0.1);
$color-border: rgba(231, 225, 216, 0.8);
$shadow-card: 0 8rpx 48rpx rgba(51, 54, 52, 0.08);
$radius-card: 32rpx;
$radius-full: 9999rpx;
$top-height: 120rpx;
$bottom-h: 240rpx;

.page {
  font-family: 'Noto Serif SC', serif;
  width: 100%;
  height: 100vh;
  background: $color-bg;
  display: flex;
  flex-direction: column;
}

.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: $top-height;
  padding-top: var(--status-bar-height, 44rpx);
  background: $color-bg;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 24rpx;
  padding-right: 24rpx;
  border-bottom: 2rpx solid $color-line;
  box-shadow: 0 16rpx 48rpx rgba(51, 54, 52, 0.1);

  &__back {
    width: 88rpx;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__back-icon-img {
    width: 36rpx;
    height: 36rpx;
  }

  &__center {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__leaf {
    width: 30rpx;
    height: 30rpx;
  }

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 36rpx;
    font-weight: 700;
    color: $color-primary-dark;
  }

  &__placeholder {
    width: 88rpx;
  }
}

.scroll-body {
  flex: 1;
  padding-top: calc($top-height + var(--status-bar-height, 44rpx));
  padding-bottom: $bottom-h;
  height: 100vh;
  box-sizing: border-box;
}

/* 同步状态区 */
.sync-status-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 64rpx 48rpx;
  gap: 24rpx;
}

.sync-icon-wrap {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sync-icon-bg-ring {
  position: absolute;
  inset: 0;
  border-radius: $radius-full;
  border: 4rpx dashed rgba(138, 154, 134, 0.35);
  animation: rotate-ccw 8s linear infinite;
}

.sync-icon-circle {
  width: 152rpx;
  height: 152rpx;
  border-radius: $radius-full;
  background: $color-primary;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sync-icon-text-img {
  width: 56rpx;
  height: 56rpx;
  animation: rotate-ccw 2.5s linear infinite;
}

.sync-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 48rpx;
  font-weight: 700;
  color: $color-text;
}

.sync-desc {
  font-size: 28rpx;
  color: $color-text-secondary;
  text-align: center;
  line-height: 48rpx;
}

/* 详情 */
.detail-section {
  padding: 0 48rpx;

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 32rpx;
    font-weight: 700;
    color: $color-text;
    display: block;
    margin-bottom: 24rpx;
  }
}

.progress-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.progress-item {
  background: $color-card;
  border-radius: 24rpx;
  box-shadow: $shadow-card;
  padding: 32rpx;
  opacity: 0.6;

  &--active {
    opacity: 1;
    border: 2rpx solid rgba(138, 154, 134, 0.3);
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 12rpx;
      background: $color-primary-dark;
    }
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 24rpx;
  }

  &__icon-wrap {
    width: 72rpx;
    height: 72rpx;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &--active {
      background: rgba(138, 154, 134, 0.15);
    }

    &--muted {
      background: rgba(51, 54, 52, 0.08);
    }
  }

  &__icon-img {
    width: 32rpx;
    height: 32rpx;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  &__label {
    font-size: 30rpx;
    color: $color-text;
  }

  &__sub {
    font-size: 24rpx;
    color: $color-text-secondary;
  }

  &__percent {
    font-family: 'Noto Serif SC', serif;
    font-size: 30rpx;
    font-weight: 700;
    color: $color-primary-dark;
  }

  &__waiting-img {
    width: 32rpx;
    height: 32rpx;
    opacity: 0.6;
  }
}

.progress-bar {
  margin-top: 20rpx;
  height: 8rpx;
  background: rgba(51, 54, 52, 0.08);
  border-radius: $radius-full;
  overflow: hidden;

  &__fill {
    height: 100%;
    background: $color-primary;
    border-radius: $radius-full;
    transition: width 0.3s;
  }
}

.warning-tip {
  margin-top: 24rpx;
  background: rgba(244, 239, 234, 0.8);
  border-radius: 16rpx;
  border: 2rpx solid rgba(83, 98, 81, 0.1);
  padding: 24rpx;
  display: flex;
  gap: 16rpx;
  align-items: flex-start;

  &__icon-img {
    width: 28rpx;
    height: 28rpx;
    opacity: 0.6;
    flex-shrink: 0;
    margin-top: 2rpx;
  }

  &__text {
    font-size: 26rpx;
    color: $color-text-secondary;
    line-height: 44rpx;
  }
}

.safe-bottom { height: 40rpx; }

/* 底部操作 */
.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: $bottom-h;
  padding: 24rpx 48rpx 64rpx;
  background: linear-gradient(to top, $color-bg 60%, transparent);
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.btn-confirming {
  width: 100%;
  height: 104rpx;
  background: $color-primary-dark;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;

  &__spinner-wrap {
    position: relative;
    width: 36rpx;
    height: 36rpx;
  }

  &__spinner-bg,
  &__spinner-img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  &__spinner-img {
    animation: rotate-ccw 1s linear infinite;
  }

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
    font-weight: 700;
    color: #fff;
  }
}

@keyframes rotate-ccw {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
  }
}

.btn-cancel {
  width: 100%;
  height: 96rpx;
  border-radius: $radius-full;
  border: 2rpx solid $color-line;
  display: flex;
  align-items: center;
  justify-content: center;

  &__text {
    font-size: 32rpx;
    color: $color-text-secondary;
  }
}
</style>
