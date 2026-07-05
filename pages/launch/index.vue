<template>
  <view class="page">
    <!-- 中心内容：Logo + Slogan -->
    <view class="center-area">
      <view class="logo-card">
        <image
          class="logo-card__img"
          src="/static/logo-hero.jpeg"
          mode="aspectFit"
        />
        <text class="logo-card__name">万 物 有 期</text>
      </view>
      <text class="slogan">把生活好物，轻轻收进时间里。</text>
    </view>

    <!-- 底部操作区 -->
    <view class="bottom-area">
      <view class="btn-primary" @tap="onWxLogin">
        <text class="btn-primary__icon">💬</text>
        <text class="btn-primary__text">微信一键登录</text>
      </view>
      <text class="btn-guest" @tap="onGuest">先逛逛</text>
      <view class="agreement">
        <view class="agreement__checkbox" :class="{ 'agreement__checkbox--checked': agreed }" @tap="onToggleAgreement">
          <text v-if="agreed" class="agreement__check">✓</text>
        </view>
        <text class="agreement__text">登录即代表同意</text>
        <text class="agreement__link" @tap="onUserAgreement">用户协议</text>
        <text class="agreement__text"> 与 </text>
        <text class="agreement__link" @tap="onPrivacyPolicy">隐私政策</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const agreed = ref(false)

function onToggleAgreement() {
  agreed.value = !agreed.value
}

function onWxLogin() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议与隐私政策', icon: 'none' })
    return
  }
  // 微信登录逻辑
  uni.switchTab({ url: '/pages/index/index' })
}

function onGuest() {
  uni.switchTab({ url: '/pages/index/index' })
}

function onUserAgreement() {
  // 跳转用户协议
}

function onPrivacyPolicy() {
  // 跳转隐私政策
}
</script>

<style lang="scss" scoped>
$color-bg: #F9F8F6;
$color-primary-dark: #536251;
$color-text: #333634;
$color-text-secondary: rgba(51, 54, 52, 0.64);
$radius-full: 9999rpx;

.page {
  width: 100%;
  height: 100vh;
  background: $color-bg;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 192rpx 48rpx 64rpx;
  box-sizing: border-box;
}

.center-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
}

.logo-card {
  width: 540rpx;
  background: rgba(231, 225, 216, 0.35);
  border-radius: 32rpx;
  padding: 48rpx 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;

  &__img {
    width: 320rpx;
    height: 240rpx;
  }

  &__name {
    font-family: 'Noto Serif SC', serif;
    font-size: 48rpx;
    font-weight: 400;
    color: $color-text;
    letter-spacing: 12rpx;
  }
}

.slogan {
  font-family: 'Noto Serif SC', serif;
  font-size: 30rpx;
  font-weight: 400;
  color: $color-text;
  letter-spacing: 2rpx;
}

.bottom-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}

.btn-primary {
  width: 100%;
  height: 104rpx;
  background: $color-primary-dark;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;

  &__icon {
    font-size: 36rpx;
  }

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 36rpx;
    font-weight: 700;
    color: #fff;
    letter-spacing: 2rpx;
  }
}

.btn-guest {
  font-size: 30rpx;
  color: $color-text-secondary;
}

.agreement {
  display: flex;
  align-items: center;
  gap: 6rpx;

  &__checkbox {
    width: 32rpx;
    height: 32rpx;
    border-radius: 8rpx;
    border: 2rpx solid $color-text-secondary;
    display: flex;
    align-items: center;
    justify-content: center;

    &--checked {
      background: $color-primary-dark;
      border-color: $color-primary-dark;
    }
  }

  &__check {
    font-size: 22rpx;
    color: #fff;
  }

  &__text {
    font-size: 24rpx;
    color: $color-text-secondary;
  }

  &__link {
    font-size: 24rpx;
    color: $color-primary-dark;
    text-decoration: underline;
  }
}
</style>
