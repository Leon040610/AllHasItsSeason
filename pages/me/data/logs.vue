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
      <view v-if="loading" class="loading-state">
        <wd-loading color="#8A9A86" />
      </view>
      
      <view v-else-if="logs.length === 0" class="empty-state">
        <text class="empty-text">万物皆有时，此刻且从容</text>
      </view>

      <view v-else class="log-list">
        <view class="log-card" v-for="log in logs" :key="log.createdAt">
          <view class="log-header">
            <text class="log-time">{{ formatTime(log.createdAt) }}</text>
            <view :class="['status-tag', 'status-' + (log.errorCode === 'cancelled' ? 'cancelled' : log.status)]">
              <text>{{ getStatusText(log.status, log.errorCode) }}</text>
            </view>
          </view>
          
          <view class="log-details" v-if="log.collectionStats">
            <view class="stat-row">
              <text class="stat-label">同步记录</text>
              <text class="stat-value">{{ log.syncedCount }}</text>
            </view>
            <view class="stat-row" v-if="log.conflictCount > 0">
              <text class="stat-label">冲突合并</text>
              <text class="stat-value text-warn">{{ log.conflictCount }}</text>
            </view>
            <view class="stat-row" v-if="log.failedCount > 0">
              <text class="stat-label">失败记录</text>
              <text class="stat-value text-error">{{ log.failedCount }}</text>
            </view>
            <view class="stat-row" v-if="log.errorCode && log.errorCode !== 'cancelled'">
              <text class="stat-label">错误信息</text>
              <text class="stat-value text-error">{{ getErrorText(log.errorCode) }}</text>
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
import { onShow } from '@dcloudio/uni-app'
import { wechatCloudSyncRepository } from '../../../repositories/wechatCloudSyncRepository.js'

const logs = ref<any[]>([])
const loading = ref(true)

onShow(async () => {
  loading.value = true
  try {
    logs.value = await wechatCloudSyncRepository.getSyncLogs(10)
  } catch (err) {
    console.error('获取同步日志失败', err)
    uni.showToast({ title: '获取日志失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})

function onBack() {
  uni.navigateBack()
}

function formatTime(ts: number) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getStatusText(status: string, errorCode: string) {
  if (errorCode === 'cancelled') return '已暂停'
  if (status === 'success') return '成功'
  if (status === 'error') return '失败'
  if (status === 'partial_failure') return '部分成功'
  return status
}

function getErrorText(errorCode: string) {
  const map: Record<string, string> = {
    'network_error': '网络异常',
    'cloud_unavailable': '云服务不可用',
    'permission_denied': '无权限',
    'partial_failure': '部分记录同步失败'
  }
  return map[errorCode] || errorCode || '未知异常'
}
</script>

<style lang="scss" scoped>
$color-bg: #FAF9F7;
$color-card: #FFFFFF;
$color-primary: #8A9A86;
$color-text: #333634;
$color-text-secondary: rgba(51, 54, 52, 0.64);
$color-line: rgba(51, 54, 52, 0.1);
$color-warn: #D98A6C;
$color-error: #D98A6C;
$shadow-card: 0 8rpx 48rpx rgba(51, 54, 52, 0.08);

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
  height: 120rpx;
  padding-top: var(--status-bar-height, 44rpx);
  background: $color-bg;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 24rpx;
  padding-right: 24rpx;
  box-sizing: border-box;
  z-index: 100;
  border-bottom: 2rpx solid $color-line;
  box-shadow: 0 16rpx 48rpx rgba(51, 54, 52, 0.1);
}

.top-bar__back {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.top-bar__back-icon-img {
  width: 36rpx;
  height: 36rpx;
}

.top-bar__center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.top-bar__leaf {
  width: 32rpx;
  height: 32rpx;
}

.top-bar__title {
  font-size: 36rpx;
  font-weight: 700;
  color: $color-text;
}

.top-bar__placeholder {
  width: 88rpx;
}

.scroll-body {
  flex: 1;
  margin-top: calc(120rpx + var(--status-bar-height, 44rpx));
  box-sizing: border-box;
  padding: 40rpx 48rpx;
}

.loading-state {
  display: flex;
  justify-content: center;
  margin-top: 100rpx;
}

.empty-state {
  display: flex;
  justify-content: center;
  margin-top: 200rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 28rpx;
  color: $color-text-secondary;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.log-card {
  background: $color-card;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: $shadow-card;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  border-bottom: 2rpx solid $color-line;
  padding-bottom: 16rpx;
}

.log-time {
  font-size: 28rpx;
  color: $color-text;
  font-weight: 700;
}

.status-tag {
  padding: 4rpx 16rpx;
  border-radius: 99rpx;
  font-size: 24rpx;
  font-weight: 700;
  
  &.status-success {
    background: rgba(138, 154, 134, 0.1);
    color: $color-primary;
  }
  
  &.status-error {
    background: rgba(217, 138, 108, 0.1);
    color: $color-warn;
  }

  &.status-cancelled {
    background: rgba(166, 155, 141, 0.1);
    color: rgba(166, 155, 141, 1);
  }
}

.log-details {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 28rpx;
}

.stat-label {
  color: $color-text-secondary;
}

.stat-value {
  color: $color-text;
  font-weight: 700;
  
  &.text-warn {
    color: $color-warn;
  }
  
  &.text-error {
    color: $color-error;
  }
}

.safe-bottom {
  height: calc(env(safe-area-inset-bottom) + 80rpx);
}
</style>
