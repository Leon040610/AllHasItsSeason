<template>
  <view class="page">
    <view class="center-area">
      <image class="logo-img" src="/static/logo-hero-transparent.png" mode="aspectFit" />
      <text class="slogan">把生活好物，轻轻收进时间里。</text>
    </view>
    <view class="bottom-area">
      <view class="btn-primary" @tap="onWxLogin">
        <image class="btn-primary__icon" src="/static/icons/launch-weixin.svg" mode="aspectFit" />
        <text class="btn-primary__text">微信一键登录</text>
      </view>
      <text class="btn-guest" @tap="onGuest">先逛逛</text>
      <view class="agreement">
        <view
          class="agreement__checkbox"
          :class="agreed ? 'agreement__checkbox--checked' : ''"
          @tap="onToggleAgreement"
        >
          <text v-if="agreed" class="agreement__check">✓</text>
        </view>
        <text class="agreement__text">登录即同意</text>
        <text class="agreement__link" @tap="onUserAgreement">用户协议</text>
        <text class="agreement__text"> 与 </text>
        <text class="agreement__link" @tap="onPrivacyPolicy">隐私政策</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { authService } from '../../services/authService.js'

const agreed = ref(true)

function onToggleAgreement() {
  agreed.value = !agreed.value
}

const isLoggingIn = ref(false)

async function onWxLogin() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' })
    return
  }
  if (isLoggingIn.value) return
  isLoggingIn.value = true
  try {
    await authService.login()
    uni.reLaunch({ url: '/pages/index/index' })
  } catch (err) {
    const msg = err.message === 'login_in_progress'
      ? '登录中，请稍候...'
      : (err.message || '暂时无法登录，也可以先逛逛~')
    uni.showToast({ title: msg, icon: 'none', duration: 2000 })
  } finally {
    isLoggingIn.value = false
  }
}

function onGuest() {
  uni.reLaunch({ url: '/pages/index/index' })
}

function onUserAgreement() {}
function onPrivacyPolicy() {}
</script>

<style lang="scss" scoped>
$color-bg: #F9F8F6;
$color-primary: #8A9A86;
$color-primary-dark: #536251;
$color-text: #333634;
$color-text-slogan: #444842;
$radius-full: 9999rpx;

.page {
  width: 100%;
  height: 100vh;
  background: $color-bg;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 260rpx 48rpx 64rpx;
  box-sizing: border-box;
}

.center-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 64rpx;
}

.logo-img {
  width: 660rpx;
  height: 390rpx;
}

.slogan {
  font-family: 'Noto Serif SC', serif;
  font-size: 32rpx;
  font-weight: 700;
  color: $color-text-slogan;
  letter-spacing: 4rpx;
  text-align: center;
  padding-left: 12rpx;
}

.bottom-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
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
    width: 32rpx;
    height: 32rpx;
  }

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 40rpx;
    font-weight: 400;
    color: #fff;
    letter-spacing: 4rpx;
  }
}

.btn-guest {
  font-family: 'Noto Serif SC', serif;
  font-size: 32rpx;
  font-weight: 400;
  color: $color-text-slogan;
  padding: 24rpx 0;
  text-align: center;
}

.agreement {
  display: flex;
  align-items: center;
  gap: 6rpx;
  opacity: 0.7;
  margin-top: 16rpx;

  &__checkbox {
    width: 24rpx;
    height: 24rpx;
    border-radius: 6rpx;
    border: 2rpx solid $color-primary;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &--checked {
      background: #fff;
      border-color: $color-primary;
    }
  }

  &__check {
    font-size: 22rpx;
    color: $color-primary;
    line-height: 1;
  }

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 24rpx;
    color: $color-text;
  }

  &__link {
    font-family: 'Noto Serif SC', serif;
    font-size: 24rpx;
    color: $color-text;
    text-decoration: underline;
    text-decoration-color: #c4c8bf;
  }
}
</style>
