<template>
  <view class="page">
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon-img" src="/static/icons/about-fanhui.svg" mode="aspectFit" />
      </view>
      <text class="top-bar__title">隐私政策</text>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">
      <mp-html
        :content="privacyHtml"
        :tag-style="customStyles"
        :scroll-table="true"
        :selectable="true"
      />
      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'
import { privacyHtml } from '@/utils/privacyPolicyHtml.js'

const customStyles = {
  h1: 'display:block;margin:48rpx 0 24rpx;font-family:"Noto Serif SC",serif;font-size:32rpx;font-weight:700;line-height:1.45;color:#333634;letter-spacing:0;text-align:center;white-space:nowrap;',
  h2: 'display:block;margin:68rpx 0 24rpx;padding-bottom:16rpx;border-bottom:2rpx solid #DDE3DA;font-family:"Noto Serif SC",serif;font-size:36rpx;font-weight:700;line-height:1.45;color:#333634;',
  h3: 'display:block;margin:40rpx 0 16rpx;font-family:"Noto Serif SC",serif;font-size:30rpx;font-weight:700;line-height:1.5;color:#536251;',
  p: 'display:block;margin-top:0;margin-bottom:36rpx;font-family:"Noto Serif SC",serif;font-size:27rpx;line-height:52rpx;letter-spacing:1rpx;text-indent:2em;color:#4B4E4B;',
  blockquote: 'display:block;margin:28rpx 0;padding:22rpx 28rpx;border-left:8rpx solid #8A9A86;border-radius:0 18rpx 18rpx 0;background:#EDF1EB;font-family:"Noto Serif SC",serif;font-size:27rpx;font-style:italic;font-weight:700;line-height:52rpx;letter-spacing:1rpx;text-indent:0;color:#C47A5F;',
  strong: 'font-weight:700;color:#C47A5F;',
  em: 'font-style:italic;color:#C47A5F;',
  ul: 'display:block;margin:0 0 24rpx;padding-left:38rpx;',
  ol: 'display:block;margin:0 0 24rpx;padding-left:42rpx;',
  li: 'display:list-item;margin-bottom:12rpx;font-family:"Noto Serif SC",serif;font-size:27rpx;line-height:1.8;color:#4B4E4B;',
  table: 'width:100%;margin:28rpx 0;border:2rpx solid #DDD8CF;border-radius:18rpx;background:#FFFFFF;overflow:hidden;',
  thead: 'background:#F4EFEA;',
  th: 'padding:18rpx 16rpx;border:1rpx solid #DDD8CF;font-family:"Noto Serif SC",serif;font-size:24rpx;font-weight:700;line-height:1.5;color:#536251;text-align:left;',
  td: 'padding:18rpx 16rpx;border:1rpx solid #E6E1D9;font-family:"Noto Serif SC",serif;font-size:23rpx;line-height:1.6;color:#4B4E4B;vertical-align:top;',
  hr: 'display:block;height:2rpx;margin:56rpx 0;border:0;background:#DDE3DA;',
  del: 'color:#8E928D;text-decoration:line-through;',
}

function onBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
$color-bg: #FAF9F7;
$color-primary-dark: #536251;
$color-line: rgba(51, 54, 52, 0.1);
$top-height: 120rpx;

.page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: $color-bg;
  font-family: 'Noto Serif SC', serif;
}

.top-bar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $top-height;
  padding-top: var(--status-bar-height, 44rpx);
  padding-right: 24rpx;
  padding-left: 24rpx;
  background: $color-bg;
  border-bottom: 2rpx solid $color-line;
  box-shadow: 0 16rpx 48rpx rgba(51, 54, 52, 0.1);

  &__back,
  &__placeholder {
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
    font-size: 34rpx;
    font-weight: 700;
    color: $color-primary-dark;
  }
}

.scroll-body {
  flex: 1;
  height: 100vh;
  box-sizing: border-box;
  padding: calc($top-height + var(--status-bar-height, 44rpx)) 48rpx 0;
}

.safe-bottom {
  height: calc(80rpx + env(safe-area-inset-bottom));
}
</style>
