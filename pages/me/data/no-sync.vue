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
          <image class="status-icon-emoji-img" src="/static/icons/data-no-sync-yuntongbu.svg" mode="aspectFit" />
        </view>
        <text class="status-title">暂未开启云同步</text>
        <text class="status-desc">同步功能已关闭，您的数据目前仅保存在本地。建议开启同步以确保数据安全。</text>
      </view>

      <!-- 状态卡片 -->
      <view class="status-list">
        <view class="status-row-card">
          <view class="status-row-card__icon-wrap status-row-card__icon-wrap--safe">
            <image class="status-row-card__icon-img" src="/static/icons/data-no-sync-bendishuju.svg" mode="aspectFit" />
          </view>
          <text class="status-row-card__label">本地数据</text>
          <view class="status-row-card__badge status-row-card__badge--safe">
            <image class="status-row-card__icon-img" src="/static/icons/data-no-sync-anquan.svg" mode="aspectFit" />
            <text class="status-row-card__badge-text">安全</text>
          </view>
        </view>
        <view class="status-row-card">
          <view class="status-row-card__icon-wrap status-row-card__icon-wrap--muted">
            <image class="status-row-card__icon-img" src="/static/icons/data-no-sync-yunduanbeifen.svg" mode="aspectFit" />
          </view>
          <text class="status-row-card__label">云端备份</text>
          <view class="status-row-card__badge status-row-card__badge--locked">
            <image class="status-row-card__badge-lock-img" src="/static/icons/data-no-sync-yiguanbi.svg" mode="aspectFit" />
            <text class="status-row-card__badge-text">已关闭</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="bottom-actions">
      <view class="btn-primary" @tap="onEnableSync">
        <text class="btn-primary__text">开启同步</text>
      </view>
      <text class="btn-back" @tap="onBack">返回</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { syncService } from '../../../services/syncService.js'
import { authService } from '../../../services/authService.js'
import { cloudRuntimeService } from '../../../services/cloudRuntimeService.js'

function onBack() {
  uni.navigateBack()
}

function onEnableSync() {
  if (!authService.isLoggedIn()) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (!cloudRuntimeService.isReady()) {
    uni.showToast({ title: '云服务未就绪，请稍后再试', icon: 'none' })
    return
  }
  syncService.enableSync()
  uni.redirectTo({ url: '/pages/me/data/index' })
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
  background: rgba(51, 54, 52, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon-emoji-img {
  width: 96rpx;
  height: 96rpx;
  opacity: 0.5;
}

.status-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 48rpx;
  font-weight: 700;
  color: $color-text;
  text-align: center;
}

.status-desc {
  font-size: 28rpx;
  color: $color-text-secondary;
  text-align: center;
  line-height: 48rpx;
}

/* 状态行卡片 */
.status-list {
  padding: 0 48rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.status-row-card {
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
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &--safe {
      background: rgba(138, 154, 134, 0.12);
    }

    &--muted {
      background: rgba(51, 54, 52, 0.08);
    }
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

  &__badge {
    display: flex;
    align-items: center;
    gap: 8rpx;

    &--safe {
      // green badge
    }

    &--locked {
      // muted badge
    }
  }

  &__badge-dot {
    font-size: 18rpx;
    color: #8A9A86;
  }

  &__badge-lock-img {
    width: 26rpx;
    height: 26rpx;
    opacity: 0.5;
  }

  &__badge-text {
    font-size: 28rpx;
    color: $color-text-secondary;
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

.btn-back {
  font-size: 30rpx;
  color: $color-text-secondary;
}
</style>
