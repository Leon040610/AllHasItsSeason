<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__brand">
        <image class="top-bar__icon" src="@/static/icons/tools-topIcon.svg" mode="aspectFit" />
        <text class="top-bar__title">工具</text>
      </view>
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">
      <view class="tool-list">
        <!-- 效期计算器 -->
        <view class="tool-card tool-card--calculator" @tap="onCalculator">
          <view class="tool-card__icon-wrap tool-card__icon-wrap--active">
            <image class="tool-card__icon-img" src="@/static/icons/tools-xiaoqijisuanqi.svg" mode="aspectFit" />
          </view>
          <view class="tool-card__info">
            <text class="tool-card__name">效期计算器</text>
            <text class="tool-card__desc">帮你算出准确的到期日</text>
          </view>
          <image class="tool-card__arrow-img" src="@/static/icons/tools-xiayiye.svg" mode="aspectFit" />
        </view>

        <!-- 更多工具（即将推出） -->
        <view class="tool-card tool-card--disabled">
          <view class="tool-card__icon-wrap tool-card__icon-wrap--muted">
            <image class="tool-card__icon-img" src="@/static/icons/tools-gengduogongju.svg" mode="aspectFit" />
          </view>
          <view class="tool-card__info">
            <text class="tool-card__name tool-card__name--muted">更多工具</text>
            <text class="tool-card__desc">敬请期待</text>
          </view>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 底部 TabBar -->
    <view class="tab-bar">
      <view class="tab-bar__item" @tap="onTabTap('index')">
        <view class="tab-bar__icon-wrap">
          <image class="tab-bar__icon-img" src="@/static/icons/tools-shouye.svg" mode="aspectFit" />
        </view>
        <text class="tab-bar__label">首页</text>
      </view>
      <view class="tab-bar__item" @tap="onTabTap('library')">
        <view class="tab-bar__icon-wrap">
          <image class="tab-bar__icon-img" src="@/static/icons/tools-wupinku.svg" mode="aspectFit" />
        </view>
        <text class="tab-bar__label">物品库</text>
      </view>
      <view class="tab-bar__item tab-bar__item--active">
        <view class="tab-bar__icon-wrap tab-bar__icon-wrap--active">
          <image class="tab-bar__icon-img" src="@/static/icons/tools-gongju-dianji.svg" mode="aspectFit" />
        </view>
        <text class="tab-bar__label tab-bar__label--active">工具</text>
      </view>
      <view class="tab-bar__item" @tap="onTabTap('me')">
        <view class="tab-bar__icon-wrap">
          <image class="tab-bar__icon-img" src="@/static/icons/tools-wode.svg" mode="aspectFit" />
        </view>
        <text class="tab-bar__label">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
function onCalculator() {
  uni.navigateTo({ url: '/pages/tools/calculator/index' })
}

function onTabTap(tab: string) {
  const tabMap: Record<string, string> = {
    index: '/pages/index/index',
    library: '/pages/library/index',
    me: '/pages/me/index',
  }
  uni.switchTab({ url: tabMap[tab] })
}
</script>

<style lang="scss" scoped>
$color-bg: #F9F8F6;
$color-card: #FFFFFF;
$color-primary: #8A9A86;
$color-primary-dark: #536251;
$color-text: #333634;
$color-text-secondary: rgba(51, 54, 52, 0.64);
$color-expired: #A69B8D;
$color-line: rgba(51, 54, 52, 0.08);
$shadow-card: 0 16rpx 48rpx rgba(51, 54, 52, 0.08);
$radius-card: 32rpx;
$radius-full: 9999rpx;
$top-height: 120rpx;

.page {
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
  background: #FAF9F7;
  display: flex;
  align-items: center;
  padding-left: 48rpx;
  border-bottom: 2rpx solid rgba(51, 54, 52, 0.08);
  box-shadow: 0 16rpx 48rpx rgba(51, 54, 52, 0.1);

  &__brand {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  &__icon {
    width: 40rpx;
    height: 40rpx;
  }

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 40rpx;
    font-weight: 700;
    color: $color-primary-dark;
  }
}

.scroll-body {
  flex: 1;
  padding-top: calc($top-height + var(--status-bar-height, 44rpx));
  padding-bottom: calc(132rpx + env(safe-area-inset-bottom) + 32rpx);
  height: 100vh;
  box-sizing: border-box;
}

.tool-list {
  padding: 48rpx 48rpx 0;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.tool-card {
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  padding: 40rpx 40rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
  border: 2rpx solid #E7E1D8;

  &--calculator {
    position: relative;
    overflow: hidden;

    &::after {
      content: '';
      position: absolute;
      top: -60rpx;
      right: -60rpx;
      width: 280rpx;
      height: 280rpx;
      background: rgba(223, 255, 238, 0.55); // #DFFFEE 不透明度 55%
      border-radius: 9999rpx;
      filter: blur(50rpx);
      z-index: 1;
    }
  }

  &--disabled {
    opacity: 0.6;
    border: 2rpx dashed #E7E1D8;
    box-shadow: none;
  }

  &__icon-wrap {
    width: 96rpx;
    height: 96rpx;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    z-index: 2;

    &--active {
      background: $color-primary;
    }

    &--muted {
      background: rgba(51, 54, 52, 0.1);
    }
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
    position: relative;
    z-index: 2;
  }

  &__name {
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
    font-weight: 700;
    color: $color-text;

    &--muted {
      color: $color-text-secondary;
    }
  }

  &__desc {
    font-family: 'Noto Serif SC', serif;
    font-size: 26rpx;
    color: $color-text-secondary;
  }

  &__arrow-img {
    width: 32rpx;
    height: 32rpx;
    opacity: 0.6;
    position: relative;
    z-index: 2;
  }
}

.safe-bottom {
  height: 40rpx;
}

/* TabBar */
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(132rpx + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: #F4F3F1;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  align-items: flex-start;
  padding-top: 16rpx;
  box-sizing: border-box;
  z-index: 100;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
    padding: 8rpx 0;
  }

  &__icon-wrap {
    width: 68rpx;
    height: 68rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: none;

    &--active {
      background: #8A9A86;
    }
  }

  &__icon-img {
    width: 44rpx !important;
    height: 44rpx !important;
    flex-shrink: 0;
    opacity: 0.8;
    transform: scale(1) !important;
    transition: none;
  }

  &__label {
    font-family: 'Noto Serif SC', serif;
    font-size: 22rpx;
    color: $color-expired;

    &--active {
      color: $color-primary-dark;
      font-weight: 700;
    }
  }
}
</style>
