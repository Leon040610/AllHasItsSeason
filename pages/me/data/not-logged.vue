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

      <!-- 引导卡片 -->
      <view class="guide-card">
        <!-- 插画区 -->
        <view class="guide-card__illus">
          <image class="guide-card__illus-img" src="/static/icons/data-not-logged-Background.svg" mode="aspectFill" />
          <view class="guide-card__illus-overlay">
            <image class="guide-card__illus-icon-img" src="/static/icons/data-not-logged-yuntongbu.svg" mode="aspectFit" />
          </view>
        </view>
        <!-- 文字区 -->
        <view class="guide-card__body">
          <text class="guide-card__title">登录以同步数据</text>
          <text class="guide-card__desc">您的数据目前仅保存在此设备。登录后可跨设备同步并确保数据安全，享受云端备份服务。</text>
          <view class="guide-card__login-btn" @tap="onLogin">
            <text class="guide-card__login-btn-text">立即登录</text>
          </view>
        </view>
      </view>

      <!-- 设置项 -->
      <view class="settings-section">
        <text class="settings-section__title">设置项</text>
        <view class="settings-list">
          <view class="settings-group">
            <view class="settings-item" @tap="onExportLocal">
              <view class="settings-item__icon-wrap">
                <image class="settings-item__icon-img" src="/static/icons/data-not-logged-daochubendishuju.svg" mode="aspectFit" />
              </view>
              <text class="settings-item__label">导出本地数据</text>
              <image class="settings-item__arrow-img" src="/static/icons/data-not-logged-xuanze.svg" mode="aspectFit" />
            </view>
          </view>
          <view class="settings-group">
            <view class="settings-item settings-item--locked">
              <view class="settings-item__icon-wrap settings-item__icon-wrap--muted">
                <image class="settings-item__icon-img settings-item__icon-img--muted" src="/static/icons/data-not-logged-zidongbeifen.svg" mode="aspectFit" />
              </view>
              <text class="settings-item__label settings-item__label--muted">自动备份 (需登录)</text>
              <image class="settings-item__lock-img" src="/static/icons/data-not-logged-weikaiqi.svg" mode="aspectFit" />
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
import { authService } from '../../../services/authService.js'

function onBack() {
  uni.navigateBack()
}

const isLoggingIn = ref(false)

async function onLogin() {
  if (isLoggingIn.value) return
  isLoggingIn.value = true
  try {
    await authService.login()
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/me/data/index' })
    }, 1000)
  } catch (err) {
    const msg = err.message === 'login_in_progress'
      ? '登录中，请稍候'
      : (err.message || '暂时没登录成功，也可以先逛逛')
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    isLoggingIn.value = false
  }
}

function onExportLocal() {
  uni.showToast({ title: '导出功能即将上线', icon: 'none' })
}
</script>

<style lang="scss" scoped>
$color-bg: #FAF9F7;
$color-card: #FFFFFF;
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

.scroll-body {
  flex: 1;
  padding-top: calc($top-height + var(--status-bar-height, 44rpx));
  height: 100vh;
  box-sizing: border-box;
}

/* 引导卡片 */
.guide-card {
  margin: 32rpx 48rpx 0;
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card-md;
  border: 2rpx solid $color-border;
  overflow: hidden;

  &__illus {
    width: 100%;
    height: 320rpx;
    position: relative;
    overflow: hidden;
  }

  &__illus-img {
    width: 100%;
    height: 100%;
  }

  &__illus-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__illus-icon-img {
    width: 96rpx;
    height: 96rpx;
    opacity: 0.5;
  }

  &__body {
    padding: 40rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 36rpx;
    font-weight: 700;
    color: $color-text;
  }

  &__desc {
    font-size: 28rpx;
    color: $color-text-secondary;
    line-height: 48rpx;
  }

  &__login-btn {
    width: 100%;
    height: 96rpx;
    background: $color-primary-dark;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 16rpx;
    box-shadow: 0 8rpx 32rpx rgba(83, 98, 81, 0.3);
  }

  &__login-btn-text {
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
    font-weight: 700;
    color: #fff;
  }
}

/* 设置项 */
.settings-section {
  padding: 48rpx 48rpx 0;

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 36rpx;
    font-weight: 700;
    color: $color-text;
    display: block;
    margin-bottom: 24rpx;
  }
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.settings-group {
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  border: 2rpx solid $color-border;
  overflow: hidden;
}

.settings-item {
  display: flex;
  align-items: center;
  padding: 0 40rpx;
  height: 144rpx;
  gap: 32rpx;

  &--locked {
    opacity: 0.6;
  }

  &__icon-wrap {
    width: 72rpx;
    height: 72rpx;
    border-radius: $radius-full;
    background: rgba(138, 154, 134, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &--muted {
      background: rgba(51, 54, 52, 0.08);
    }
  }

  &__icon-img {
    width: 34rpx;
    height: 34rpx;

    &--muted {
      opacity: 0.4;
    }
  }

  &__label {
    flex: 1;
    font-size: 32rpx;
    color: $color-text;

    &--muted {
      color: $color-text-secondary;
    }
  }

  &__arrow {
    font-size: 36rpx;
    color: $color-text-secondary;
  }

  &__arrow-img {
    width: 32rpx;
    height: 32rpx;
    opacity: 0.6;
  }

  &__lock-img {
    width: 32rpx;
    height: 32rpx;
    opacity: 0.4;
  }
}

.settings-divider {
  height: 2rpx;
  background: $color-line;
  margin: 0 40rpx;
}

.safe-bottom {
  height: 80rpx;
}
</style>
