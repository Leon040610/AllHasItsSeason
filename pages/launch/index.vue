<template>
  <view class="page">
    <!-- 中心区：Logo 插画 + Slogan -->
    <view class="center-area">
      <image
        class="logo-img"
        src="/static/logo-hero-transparent.png"
        mode="aspectFit"
      />
      <text class="slogan">把生活好物，轻轻收进时间里。</text>
    </view>

    <!-- 底部操作区 -->
    <view class="bottom-area">
      <!-- 微信一键登录 -->
      <view class="btn-primary" @tap="onWxLogin">
        <image
          class="btn-primary__icon"
          src="/static/icons/launch-weixin.svg"
          mode="aspectFit"
        />
        <text class="btn-primary__text">微信一键登录</text>
      </view>

      <!-- 先逛逛 -->
      <text class="btn-guest" @tap="onGuest">先逛逛</text>

      <!-- 用户协议 -->
      <view class="agreement">
        <view
          class="agreement__checkbox"
          :class="{ 'agreement__checkbox--checked': agreed }"
          @tap="onToggleAgreement"
        >
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

// 设计稿中协议默认勾选
const agreed = ref(true)

function onToggleAgreement() {
  agreed.value = !agreed.value
}

function onWxLogin() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议与隐私政策', icon: 'none' })
    return
  }
  uni.switchTab({ url: '/pages/index/index' })
}

function onGuest() {
  uni.switchTab({ url: '/pages/index/index' })
}

function onUserAgreement() {
  // 跳转用户协议页
}

function onPrivacyPolicy() {
  // 跳转隐私政策页
}
</script>

<style lang="scss" scoped>
// ── Design Tokens ──────────────────────────────────────────────────────────
$color-bg:           #F9F8F6;   // 燕麦白
$color-primary:      #8A9A86;   // 鼠尾草绿
$color-primary-dark: #536251;   // 深鼠尾草（按钮/选中）
$color-text:         #333634;   // 墨岩灰
$color-text-slogan:  #444842;   // 设计稿 slogan 色，略深于正文
$radius-full:        9999rpx;

// ── 页面根容器 ─────────────────────────────────────────────────────────────
.page {
  width: 100%;
  height: 100vh;
  background: $color-bg;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  // 设计稿：pt-96px(=192rpx) pb-32px(=64rpx) px-24px(=48rpx)
  padding: 260rpx 48rpx 64rpx;
  box-sizing: border-box;
}

// ── 中心区：Logo + Slogan ──────────────────────────────────────────────────
.center-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 64rpx;
}

// 透明背景 PNG，与燕麦白页面背景完全融合
.logo-img {
  width: 660rpx;
  height: 390rpx;
}

// 设计稿：font-bold 700 / 16px(=32rpx) / #444842 / letter-spacing 约 2px(=4rpx)
.slogan {
  font-family: 'Noto Serif SC', serif;
  font-size: 32rpx;
  font-weight: 700;
  color: $color-text-slogan;
  letter-spacing: 4rpx;
  text-align: center;
  padding-left: 12rpx; // 补偿 letter-spacing 及句号造成的视觉偏移
}

// ── 底部操作区 ─────────────────────────────────────────────────────────────
.bottom-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

// ── 主按钮：微信一键登录 ────────────────────────────────────────────────────
// 设计稿：w-342px → 100% / bg #536251 / py-16px(=32rpx) / gap-8px(=16rpx) / radius-9999px
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
    // 设计稿：20×20px → 40×40rpx，视觉偏大，调小为 32×32rpx
    width: 32rpx;
    height: 32rpx;
  }

  &__text {
    font-family: 'Noto Serif SC', serif;
    // 设计稿：font-normal 400 / 20px(=40rpx)
    font-size: 40rpx;
    font-weight: 400;
    color: #fff;
    letter-spacing: 4rpx;
  }
}

// ── 次级按钮：先逛逛 ────────────────────────────────────────────────────────
// 设计稿：font-normal / 16px(=32rpx) / #444842 / py-12px(=24rpx)
.btn-guest {
  font-family: 'Noto Serif SC', serif;
  font-size: 32rpx;
  font-weight: 400;
  color: $color-text-slogan;
  padding: 24rpx 0;
  text-align: center;
}

// ── 协议区 ─────────────────────────────────────────────────────────────────
// 设计稿：opacity-70 / 整体横向排列
.agreement {
  display: flex;
  align-items: center;
  gap: 6rpx;
  opacity: 0.7;
  margin-top: 16rpx;

  // 复选框：设计稿 12px(=24rpx) / border-radius 3px(=6rpx) / border 1px #8a9a86 / bg white
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

  // 勾号：设计稿 #8a9a86 / 12px → 约 22rpx
  &__check {
    font-size: 22rpx;
    color: $color-primary;
    line-height: 1;
  }

  // 协议正文：font-normal / 12px(=24rpx) / #333634
  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 24rpx;
    font-weight: 400;
    color: $color-text;
  }

  // 协议链接：underline / 颜色同正文
  &__link {
    font-family: 'Noto Serif SC', serif;
    font-size: 24rpx;
    font-weight: 400;
    color: $color-text;
    text-decoration: underline;
    text-decoration-color: #c4c8bf;
  }
}
</style>
