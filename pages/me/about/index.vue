<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon-img" src="/static/icons/about-fanhui.svg" mode="aspectFit" />
      </view>
      <text class="top-bar__title">关于万物有期</text>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">

      <!-- 品牌区 -->
      <view class="brand-section">
        <image class="brand-section__logo" src="/static/logo-hero-transparent.png" mode="aspectFit" />
        <text class="brand-section__name">万物有期</text>
        <text class="brand-section__version">VERSION {{ version }}</text>
        <text class="brand-section__en">ALL HAS ITS SEASON</text>
        <text class="brand-section__zh">万物皆有时</text>
      </view>

      <!-- 设计初心卡片 -->
      <view class="mission-card">
        <view class="mission-card__title-row">
          <view class="mission-card__bar" />
          <text class="mission-card__title">设计初心</text>
        </view>
        <text class="mission-card__content">
          我们总在追赶时间的脚步，却常常忘了身边那些默默过期的陪伴。《万物有期》不止是一款临期管理工具，更是我们对"认真生活"的一份数字化注解。
        </text>
      </view>

      <!-- 核心亮点 -->
      <view class="features-section">
        <text class="features-section__title">核心亮点</text>
        <view class="feature-list">
          <view v-for="feat in features" :key="feat.id" class="feature-card">
            <view class="feature-card__icon-wrap">
              <image class="feature-card__icon-img" :src="feat.icon" mode="aspectFit" />
            </view>
            <view class="feature-card__info">
              <text class="feature-card__name">{{ feat.name }}</text>
              <text class="feature-card__desc">{{ feat.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 页脚 -->
      <view class="footer">
        <text class="footer__made">由个人独立开发倾心呈现</text>
        <view class="footer__links">
          <text class="footer__link" @tap="onUserAgreement">用户服务协议</text>
          <text class="footer__dot"> · </text>
          <text class="footer__link" @tap="onPrivacyPolicy">隐私政策</text>
        </view>
        <text class="footer__copyright">COPYRIGHT © 2026 万物有期</text>
        <text class="footer__rights">ALL RIGHTS RESERVED.</text>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Feature {
  id: string
  icon: string
  name: string
  desc: string
}

const version = ref('1.1.0')

const features = ref<Feature[]>([
  {
    id: '1',
    icon: '/static/icons/about-zhinengpaizhaoshibie.svg',
    name: '智能拍照识字',
    desc: '毫秒级识字，精准捕捉有效期限',
  },
  {
    id: '2',
    icon: '/static/icons/about-tiezhishouzhangmeihua.svg',
    name: '贴纸手账美化',
    desc: '极简留白美学，让管理充满仪式感',
  },
  {
    id: '3',
    icon: '/static/icons/about-linqiwenroutixing.svg',
    name: '临期温馨提醒',
    desc: '柔性通知提醒，不打扰是最后的温柔',
  },
])

function onBack() {
  uni.navigateBack()
}

function onUserAgreement() {
  uni.showToast({ title: '用户协议即将上线', icon: 'none' })
}

function onPrivacyPolicy() {
  uni.showToast({ title: '隐私政策即将上线', icon: 'none' })
}
</script>

<style lang="scss" scoped>
$color-bg: #FAF9F7;
$color-card: #FFFFFF;
$color-primary-dark: #536251;
$color-text: #333634;
$color-text-secondary: rgba(51, 54, 52, 0.64);
$color-text-tertiary: rgba(51, 54, 52, 0.4);
$color-line: rgba(51, 54, 52, 0.1);
$color-border: rgba(231, 225, 216, 0.8);
$shadow-card: 0 8rpx 48rpx rgba(51, 54, 52, 0.08);
$radius-card: 32rpx;
$radius-full: 9999rpx;
$top-height: 120rpx;

.page {
  font-family: 'Noto Serif SC', serif;
  width: 100%;
  min-height: 100vh;
  background: $color-bg;
  display: flex;
  flex-direction: column;
}

/* 顶部 */
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

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
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

/* 品牌区 */
.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 48rpx 48rpx;
  gap: 8rpx;

  &__logo {
    width: 320rpx;
    height: 240rpx;
    margin-bottom: 16rpx;
  }

  &__name {
    font-family: 'Noto Serif SC', serif;
    font-size: 48rpx;
    font-weight: 700;
    color: $color-primary-dark;
    letter-spacing: 8rpx;
  }

  &__version {
    font-size: 24rpx;
    color: #747871;
    letter-spacing: 4rpx;
    margin-top: 8rpx;
  }

  &__en {
    font-size: 24rpx;
    color: #747871;
    letter-spacing: 6rpx;
  }

  &__zh {
    font-size: 26rpx;
    color: #747871;
  }
}

/* 设计初心 */
.mission-card {
  margin: 16rpx 48rpx 0;
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  border: 2rpx solid $color-border;
  padding: 48rpx 56rpx;

  &__title-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 24rpx;
  }

  &__bar {
    width: 8rpx;
    height: 40rpx;
    background: $color-primary-dark;
    border-radius: $radius-full;
  }

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
    font-weight: 700;
    color: $color-text;
  }

  &__content {
    font-size: 28rpx;
    color: $color-text-secondary;
    line-height: 48rpx;
    text-indent: 56rpx;
    display: block;
  }
}

/* 核心亮点 */
.features-section {
  margin: 48rpx 48rpx 0;

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 36rpx;
    font-weight: 700;
    color: $color-text;
    display: block;
    margin-bottom: 24rpx;
  }
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.feature-card {
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  border: 2rpx solid $color-border;
  padding: 36rpx 40rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;

  &__icon-wrap {
    width: 88rpx;
    height: 88rpx;
    border-radius: $radius-full;
    background: rgba(138, 154, 134, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__icon-img {
    width: 44rpx;
    height: 44rpx;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__name {
    font-family: 'Noto Serif SC', serif;
    font-size: 32rpx;
    font-weight: 700;
    color: $color-text;
  }

  &__desc {
    font-size: 26rpx;
    color: $color-text-secondary;
  }
}

/* 页脚 */
.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 64rpx 48rpx 48rpx;

  &__made {
    font-size: 26rpx;
    color: $color-text-secondary;
  }

  &__links {
    display: flex;
    align-items: center;
    gap: 0;
  }

  &__link {
    font-size: 26rpx;
    color: $color-primary-dark;
    text-decoration: underline;
  }

  &__dot {
    font-size: 26rpx;
    color: $color-text-tertiary;
  }

  &__copyright {
    font-size: 22rpx;
    color: $color-text-tertiary;
    letter-spacing: 2rpx;
    margin-top: 16rpx;
  }

  &__rights {
    font-size: 20rpx;
    color: $color-text-tertiary;
    letter-spacing: 2rpx;
  }
}

.safe-bottom {
  height: 80rpx;
}
</style>
