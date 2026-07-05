<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__brand">
        <image class="top-bar__icon" src="/static/icons/topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">工具</text>
      </view>
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">
      <view class="tool-list">
        <!-- 效期计算器 -->
        <view class="tool-card" @tap="onCalculator">
          <view class="tool-card__icon-wrap tool-card__icon-wrap--active">
            <image class="tool-card__icon-img" src="/static/icons/xiaoqijisuanqi.svg" mode="aspectFit" />
          </view>
          <view class="tool-card__info">
            <text class="tool-card__name">效期计算器</text>
            <text class="tool-card__desc">帮你算出准确的到期日</text>
          </view>
          <text class="tool-card__arrow">›</text>
        </view>

        <!-- 更多工具（即将推出） -->
        <view class="tool-card tool-card--disabled">
          <view class="tool-card__icon-wrap tool-card__icon-wrap--muted">
            <image class="tool-card__icon-img" src="/static/icons/gengduogongju.svg" mode="aspectFit" />
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
        <image class="tab-bar__icon-img" src="/static/icons/shouye.svg" mode="aspectFit" />
        <text class="tab-bar__label">首页</text>
      </view>
      <view class="tab-bar__item" @tap="onTabTap('library')">
        <image class="tab-bar__icon-img" src="/static/icons/wupinku.svg" mode="aspectFit" />
        <text class="tab-bar__label">物品库</text>
      </view>
      <view class="tab-bar__item tab-bar__item--active">
        <view class="tab-bar__active-bg">
          <image class="tab-bar__icon-img tab-bar__icon-img--active" src="/static/icons/gongju-dianji.svg" mode="aspectFit" />
        </view>
        <text class="tab-bar__label tab-bar__label--active">工具</text>
      </view>
      <view class="tab-bar__item" @tap="onTabTap('me')">
        <image class="tab-bar__icon-img" src="/static/icons/wode.svg" mode="aspectFit" />
        <text class="tab-bar__label">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
function onCalculator() {
  uni.navigateTo({ url: '/pages/calculator/index' })
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
$color-line: rgba(51, 54, 52, 0.1);
$shadow-card: 0 8rpx 48rpx rgba(51, 54, 52, 0.08);
$radius-card: 32rpx;
$radius-full: 9999rpx;
$tab-height: 168rpx;
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
  border-bottom: 2rpx solid $color-line;

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
  padding-top: $top-height;
  padding-bottom: $tab-height;
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

  &--disabled {
    opacity: 0.6;
    border: 2rpx dashed $color-line;
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
    font-size: 26rpx;
    color: $color-text-secondary;
  }

  &__arrow {
    font-size: 40rpx;
    color: $color-text-secondary;
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
  height: $tab-height;
  background: #F4F3F1;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  align-items: flex-start;
  padding-top: 20rpx;
  z-index: 100;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
    padding: 16rpx 0;
    color: $color-expired;
  }

  &__active-bg {
    width: 80rpx;
    height: 80rpx;
    border-radius: $radius-full;
    background: $color-primary;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__icon-img {
    width: 48rpx;
    height: 48rpx;
    opacity: 0.8;

    &--active {
      width: 48rpx;
      height: 48rpx;
      opacity: 1;
    }
  }

  &__label {
    font-size: 22rpx;
    color: $color-expired;

    &--active {
      color: $color-primary-dark;
      font-weight: 700;
    }
  }
}
</style>
