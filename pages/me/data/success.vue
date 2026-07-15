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

    <view class="content">
      <!-- 状态图标 -->
      <view class="status-area">
        <view class="status-icon-outer">
          <view class="status-icon-circle">
            <image class="status-icon-check-img" src="/static/icons/data-success-duigou.svg" mode="aspectFit" />
          </view>
        </view>
        <text class="status-title">同步成功</text>
        <text class="status-desc">您的数据已安全备份至云端，保持最新状态。</text>
        <view class="status-time-tag">
          <image class="status-time-tag__icon-img" src="/static/icons/data-success-shangcitongbu.svg" mode="aspectFit" />
          <text class="status-time-tag__text">上次同步时间：{{ lastSyncLabel }}</text>
        </view>
      </view>

      <!-- 统计卡片 -->
      <view class="stat-list">
        <view class="stat-card">
          <view class="stat-card__icon-wrap">
            <image class="stat-card__icon-img" src="/static/icons/data-success-yiluruwupin.svg" mode="aspectFit" />
          </view>
          <text class="stat-card__label">已录入物品</text>
          <text class="stat-card__value">{{ syncResult.itemCount }}件</text>
        </view>
        <view class="stat-card">
          <view class="stat-card__icon-wrap">
            <image class="stat-card__icon-img" src="/static/icons/data-success-jieshengkongjian.svg" mode="aspectFit" />
          </view>
          <text class="stat-card__label">节省空间</text>
          <text class="stat-card__value">{{ syncResult.savedSpace }}MB</text>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="bottom-actions">
      <view class="btn-primary" @tap="onBackToMe">
        <text class="btn-primary__text">回到我的</text>
      </view>
      <text class="btn-log" @tap="onViewLog">查看同步日志</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { syncService } from '../../../services/syncService.js'

const lastSyncLabel = ref('暂无')

const syncResult = reactive({
  itemCount: 0,
  savedSpace: '0',
})

onShow(() => {
  const settings = syncService.getSettings()
  syncResult.itemCount = settings.syncedItemCount || 0
  syncResult.savedSpace = settings.savedStorageSize || '0'
  
  if (settings.lastSyncAt) {
    const d = new Date(settings.lastSyncAt)
    lastSyncLabel.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } else {
    lastSyncLabel.value = '刚刚'
  }
})

function onBack() {
  uni.navigateBack()
}

function onBackToMe() {
  uni.switchTab({ url: '/pages/me/index' })
}

function onViewLog() {
  uni.showToast({ title: '同步日志功能即将上线', icon: 'none' })
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
$shadow-card: 0 8rpx 48rpx rgba(51, 54, 52, 0.08);
$shadow-card-md: 0 16rpx 48rpx rgba(51, 54, 52, 0.12);
$radius-card: 32rpx;
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

.content {
  flex: 1;
  padding-top: calc($top-height + var(--status-bar-height, 44rpx));
  display: flex;
  flex-direction: column;
  padding-bottom: 280rpx;
}

/* 状态区 */
.status-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 72rpx 64rpx 48rpx;
  gap: 24rpx;
}

.status-icon-outer {
  width: 240rpx;
  height: 240rpx;
  border-radius: $radius-full;
  background: rgba(138, 154, 134, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon-circle {
  width: 184rpx;
  height: 184rpx;
  border-radius: $radius-full;
  background: $color-primary;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon-check-img {
  width: 88rpx;
  height: 88rpx;
}

.status-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 52rpx;
  font-weight: 700;
  color: $color-text;
}

.status-desc {
  font-size: 28rpx;
  color: $color-text-secondary;
  text-align: center;
  line-height: 48rpx;
}

.status-time-tag {
  background: rgba(51, 54, 52, 0.06);
  border-radius: $radius-full;
  padding: 16rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;

  &__icon-img {
    width: 28rpx;
    height: 28rpx;
  }

  &__text {
    font-size: 26rpx;
    color: $color-text-secondary;
  }
}

/* 统计卡片 */
.stat-list {
  padding: 0 48rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.stat-card {
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  border: 2rpx solid $color-border;
  padding: 32rpx 40rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;

  &__icon-wrap {
    width: 72rpx;
    height: 72rpx;
    border-radius: $radius-full;
    background: rgba(138, 154, 134, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__icon-img {
    width: 32rpx;
    height: 32rpx;
  }

  &__label {
    flex: 1;
    font-size: 32rpx;
    color: $color-text;
  }

  &__value {
    font-family: 'Noto Serif SC', serif;
    font-size: 40rpx;
    font-weight: 700;
    color: $color-text;
  }
}

/* 底部操作 */
.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 48rpx 64rpx;
  background: linear-gradient(to top, $color-bg 70%, transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.btn-primary {
  width: 100%;
  height: 104rpx;
  background: $color-primary-dark;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(83, 98, 81, 0.3);

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
    font-weight: 700;
    color: #fff;
  }
}

.btn-log {
  font-size: 30rpx;
  color: $color-text-secondary;
}
</style>
