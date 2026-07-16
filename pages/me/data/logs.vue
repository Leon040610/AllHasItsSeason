<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon-img" src="/static/icons/data-not-logged-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/data-topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">同步日志</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">
      <view class="content">
        <view v-if="loading" class="empty-state">
          <text class="empty-text">加载中...</text>
        </view>
        <view v-else-if="logs.length === 0" class="empty-state">
          <text class="empty-text">暂无同步记录</text>
        </view>
        <view v-else class="log-list">
          <view class="log-card" v-for="log in logs" :key="log.operationId || log._id">
            <view class="log-card__header">
              <view class="log-card__status" :class="getStatusClass(log.status)">
                <text class="log-card__status-text">{{ getStatusText(log.status) }}</text>
              </view>
              <text class="log-card__time">{{ formatTime(log.createdAt) }}</text>
            </view>
            <view class="log-card__body">
              <view class="log-card__row" v-if="log.syncedCount !== undefined">
                <text class="log-card__label">同步项数：</text>
                <text class="log-card__value">{{ log.syncedCount }} 项</text>
              </view>
              <view class="log-card__row" v-if="log.conflictCount > 0">
                <text class="log-card__label">冲突数：</text>
                <text class="log-card__value log-card__value--warn">{{ log.conflictCount }} 项</text>
              </view>
              <view class="log-card__row" v-if="log.failedCount > 0">
                <text class="log-card__label">失败数：</text>
                <text class="log-card__value log-card__value--error">{{ log.failedCount }} 项</text>
              </view>
              <view class="log-card__row" v-if="log.status === 'error' && log.errorCode">
                <text class="log-card__label">错误摘要：</text>
                <text class="log-card__value log-card__value--error">{{ maskError(log.errorCode) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { wechatCloudSyncRepository } from '../../../repositories/wechatCloudSyncRepository.js'
import { cloudRuntimeService } from '../../../services/cloudRuntimeService.js'

const logs = ref<any[]>([])
const loading = ref(true)

onLoad(async () => {
  await fetchLogs()
})

async function fetchLogs() {
  loading.value = true
  try {
    if (!cloudRuntimeService.isReady()) {
      uni.showToast({ title: '云服务暂未就绪', icon: 'none' })
      return
    }
    const result = await wechatCloudSyncRepository.getSyncLogs(10)
    logs.value = result || []
  } catch (err) {
    console.error('Failed to fetch sync logs', err)
    uni.showToast({ title: '获取日志失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onBack() {
  uni.navigateBack()
}

function getStatusText(status: string) {
  if (status === 'success') return '同步成功'
  if (status === 'error') return '同步失败'
  if (status === 'cancelled') return '已取消'
  return '未知状态'
}

function getStatusClass(status: string) {
  return `log-card__status--${status}`
}

function formatTime(timestamp: number | string) {
  if (!timestamp) return '未知时间'
  const d = new Date(timestamp)
  if (isNaN(d.getTime())) return '未知时间'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function maskError(errorMsg: string) {
  if (!errorMsg) return '未知错误'
  // Desensitize error message if it looks too complex
  if (errorMsg.includes('cloud_not_ready')) return '云服务不可用'
  if (errorMsg.includes('not_logged_in')) return '登录状态失效'
  if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) return '网络连接超时'
  // Keep it short
  return errorMsg.length > 50 ? errorMsg.substring(0, 50) + '...' : errorMsg
}
</script>

<style lang="scss" scoped>
$color-bg: #FAF9F7;
$color-card: #FFFFFF;
$color-primary: #8A9A86;
$color-primary-dark: #536251;
$color-text: #333634;
$color-text-secondary: rgba(51, 54, 52, 0.64);
$color-line: rgba(51, 54, 52, 0.1);
$color-border: rgba(231, 225, 216, 0.8);
$color-warn: #D98A6C;
$color-error: #E66C6C;
$shadow-card: 0 8rpx 48rpx rgba(51, 54, 52, 0.08);
$radius-card: 24rpx;
$radius-full: 9999rpx;
$top-height: 120rpx;

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
  height: 100vh;
  box-sizing: border-box;
}

.content {
  padding: 48rpx;
}

.empty-state {
  display: flex;
  justify-content: center;
  padding-top: 160rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $color-text-secondary;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.log-card {
  background: $color-card;
  border-radius: $radius-card;
  padding: 32rpx;
  box-shadow: $shadow-card;
  border: 2rpx solid $color-border;
  display: flex;
  flex-direction: column;
  gap: 20rpx;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2rpx solid $color-line;
    padding-bottom: 16rpx;
  }

  &__status {
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
    background: rgba(51, 54, 52, 0.05);

    &--success {
      background: rgba(138, 154, 134, 0.15);
      .log-card__status-text { color: $color-primary-dark; }
    }
    &--error {
      background: rgba(230, 108, 108, 0.15);
      .log-card__status-text { color: $color-error; }
    }
    &--cancelled {
      background: rgba(217, 138, 108, 0.15);
      .log-card__status-text { color: $color-warn; }
    }
  }

  &__status-text {
    font-size: 24rpx;
    font-weight: 700;
    color: $color-text-secondary;
  }

  &__time {
    font-size: 24rpx;
    color: $color-text-secondary;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  &__row {
    display: flex;
    font-size: 26rpx;
  }

  &__label {
    color: $color-text-secondary;
    width: 140rpx;
  }

  &__value {
    color: $color-text;
    flex: 1;

    &--warn { color: $color-warn; }
    &--error { color: $color-error; }
  }
}

.safe-bottom {
  height: env(safe-area-inset-bottom);
  width: 100%;
}
</style>
