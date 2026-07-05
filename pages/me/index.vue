<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__brand">
        <image class="top-bar__icon" src="/static/icons/topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">我的</text>
      </view>
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">

      <!-- 用户信息卡 -->
      <view class="profile-card">
        <view class="profile-card__avatar">
          <image
            v-if="user.avatarUrl"
            class="profile-card__avatar-img"
            :src="user.avatarUrl"
            mode="aspectFill"
          />
          <view v-else class="profile-card__avatar-placeholder">
            <image class="profile-card__avatar-icon-img" src="/static/icons/wode-dianji.svg" mode="aspectFit" />
          </view>
        </view>
        <view v-if="!user.isLoggedIn" class="profile-card__login-area">
          <view class="login-btn" @tap="onWxLogin">
            <text class="login-btn__text">微信登录</text>
          </view>
          <text class="profile-card__hint">登录后可同步物品数据与提醒设置</text>
        </view>
        <view v-else class="profile-card__user-info">
          <text class="profile-card__nickname">{{ user.nickname }}</text>
          <text class="profile-card__uid">ID: {{ user.uid }}</text>
        </view>
      </view>

      <!-- 生活提醒组 -->
      <view class="settings-group">
        <text class="settings-group__title">生活提醒</text>
        <view class="settings-group__card">
          <view class="settings-item" @tap="onReminderSettings">
            <view class="settings-item__left">
              <image class="settings-item__icon-img" src="/static/icons/tixingshezhi.svg" mode="aspectFit" />
              <text class="settings-item__label">提醒设置</text>
            </view>
            <text class="settings-item__arrow">›</text>
          </view>
          <view class="settings-divider" />
          <view class="settings-item" @tap="onDefaultDays">
            <view class="settings-item__left">
              <image class="settings-item__icon-img" src="/static/icons/morenlinqitianshu.svg" mode="aspectFit" />
              <text class="settings-item__label">默认临期天数</text>
            </view>
            <view class="settings-item__right">
              <text class="settings-item__value">{{ defaultDays }}天</text>
              <text class="settings-item__arrow">›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 数据组 -->
      <view class="settings-group">
        <text class="settings-group__title">数据</text>
        <view class="settings-group__card">
          <view class="settings-item" @tap="onDataManagement">
            <view class="settings-item__left">
              <image class="settings-item__icon-img" src="/static/icons/shujuguanli.svg" mode="aspectFit" />
              <text class="settings-item__label">数据管理</text>
            </view>
            <text class="settings-item__arrow">›</text>
          </view>
          <view class="settings-divider" />
          <view class="settings-item" @tap="onDraftBox">
            <view class="settings-item__left">
              <image class="settings-item__icon-img" src="/static/icons/caogaoxiang.svg" mode="aspectFit" />
              <text class="settings-item__label">草稿箱</text>
            </view>
            <view class="settings-item__right">
              <view v-if="draftCount > 0" class="settings-item__badge">
                <text class="settings-item__badge-text">{{ draftCount }}</text>
              </view>
              <text class="settings-item__arrow">›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 会员权益 -->
      <view class="settings-group">
        <text class="settings-group__title">会员权益</text>
        <view class="settings-group__card settings-group__card--membership">
          <view class="settings-item settings-item--disabled">
            <view class="settings-item__left">
              <image class="settings-item__icon-img settings-item__icon-img--muted" src="/static/icons/huiyuanquanyi.svg" mode="aspectFit" />
              <text class="settings-item__label settings-item__label--muted">图片整理额度</text>
            </view>
            <text class="settings-item__coming">即将推出</text>
          </view>
        </view>
      </view>

      <!-- 关于和联系 -->
      <view class="settings-group">
        <view class="settings-group__card">
          <view class="settings-item" @tap="onAbout">
            <view class="settings-item__left">
              <image class="settings-item__icon-img" src="/static/icons/guanyuwanwuyouqi.svg" mode="aspectFit" />
              <text class="settings-item__label">关于万物有期</text>
            </view>
            <text class="settings-item__arrow">›</text>
          </view>
          <view class="settings-divider" />
          <view class="settings-item" @tap="onContact">
            <view class="settings-item__left">
              <image class="settings-item__icon-img" src="/static/icons/lianxikaifazhe.svg" mode="aspectFit" />
              <view class="settings-item__label-wrap">
                <text class="settings-item__label">联系开发者</text>
                <text class="settings-item__sublabel">万物有期，期待你的声音。bug或灵感，都欢迎~</text>
              </view>
            </view>
            <text class="settings-item__arrow">›</text>
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
      <view class="tab-bar__item" @tap="onTabTap('tools')">
        <image class="tab-bar__icon-img" src="/static/icons/gongju.svg" mode="aspectFit" />
        <text class="tab-bar__label">工具</text>
      </view>
      <view class="tab-bar__item tab-bar__item--active">
        <view class="tab-bar__active-bg">
          <image class="tab-bar__icon-img tab-bar__icon-img--active" src="/static/icons/wode-dianji.svg" mode="aspectFit" />
        </view>
        <text class="tab-bar__label tab-bar__label--active">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

interface User {
  isLoggedIn: boolean
  nickname: string
  uid: string
  avatarUrl: string
}

const user = reactive<User>({
  isLoggedIn: false,
  nickname: '',
  uid: '',
  avatarUrl: '',
})

const defaultDays = ref(7)
const draftCount = ref(2)

function onWxLogin() {
  // 微信登录逻辑
  uni.showToast({ title: '登录中...', icon: 'loading' })
}

function onReminderSettings() {
  uni.navigateTo({ url: '/pages/reminder/index' })
}

function onDefaultDays() {
  uni.showActionSheet({
    itemList: ['3天', '5天', '7天', '14天', '30天'],
    success(res) {
      defaultDays.value = [3, 5, 7, 14, 30][res.tapIndex]
    },
  })
}

function onDataManagement() {
  if (user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/data/index' })
  } else {
    uni.navigateTo({ url: '/pages/data/not-logged' })
  }
}

function onDraftBox() {
  uni.navigateTo({ url: '/pages/draft/index' })
}

function onAbout() {
  uni.navigateTo({ url: '/pages/about/index' })
}

function onContact() {
  uni.showToast({ title: '感谢您的关注！可通过微信搜索「万物有期」反馈', icon: 'none', duration: 3000 })
}

function onTabTap(tab: string) {
  const tabMap: Record<string, string> = {
    index: '/pages/index/index',
    library: '/pages/library/index',
    tools: '/pages/tools/index',
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
$color-warn: #D98A6C;
$color-expired: #A69B8D;
$color-line: rgba(51, 54, 52, 0.1);
$color-border: rgba(231, 225, 216, 0.8);
$shadow-card: 0 8rpx 48rpx rgba(51, 54, 52, 0.08);
$shadow-card-md: 0 12rpx 32rpx rgba(51, 54, 52, 0.12);
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

/* 用户信息卡 */
.profile-card {
  margin: 32rpx 48rpx 0;
  background: $color-card;
  border-radius: 48rpx;
  box-shadow: $shadow-card-md;
  border: 2rpx solid $color-border;
  padding: 56rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
  min-height: 400rpx;
  justify-content: center;

  &__avatar {
    width: 160rpx;
    height: 160rpx;
    border-radius: $radius-full;
    overflow: hidden;
    background: rgba(51, 54, 52, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__avatar-icon-img {
    width: 80rpx;
    height: 80rpx;
    opacity: 0.4;
  }

  &__login-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20rpx;
  }

  &__hint {
    font-size: 26rpx;
    color: $color-text-secondary;
    text-align: center;
  }

  &__user-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
  }

  &__nickname {
    font-family: 'Noto Serif SC', serif;
    font-size: 36rpx;
    font-weight: 700;
    color: $color-text;
  }

  &__uid {
    font-size: 24rpx;
    color: $color-text-secondary;
  }
}

.login-btn {
  width: 240rpx;
  height: 80rpx;
  background: $color-primary-dark;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 30rpx;
    font-weight: 700;
    color: #fff;
  }
}

/* 设置组 */
.settings-group {
  margin: 40rpx 48rpx 0;

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 32rpx;
    font-weight: 700;
    color: $color-text;
    display: block;
    margin-bottom: 16rpx;
  }

  &__card {
    background: $color-card;
    border-radius: $radius-card;
    box-shadow: $shadow-card;
    border: 2rpx solid $color-border;
    overflow: hidden;

    &--membership {
      background: linear-gradient(135deg, $color-card 60%, rgba(231, 225, 216, 0.4) 100%);
      position: relative;
      overflow: hidden;

      &::after {
        content: '';
        position: absolute;
        top: -30rpx;
        right: -30rpx;
        width: 160rpx;
        height: 160rpx;
        border-radius: $radius-full;
        background: radial-gradient(circle, rgba(217, 138, 108, 0.2) 0%, transparent 70%);
      }
    }
  }
}

/* 设置项 */
.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 40rpx;
  min-height: 100rpx;

  &--disabled {
    opacity: 0.7;
  }

  &__left {
    display: flex;
    align-items: center;
    gap: 24rpx;
    flex: 1;
  }

  &__icon-img {
    width: 40rpx;
    height: 40rpx;

    &--muted {
      opacity: 0.4;
    }
  }

  &__label {
    font-size: 30rpx;
    color: $color-text;

    &--muted {
      color: $color-text-secondary;
    }
  }

  &__label-wrap {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }

  &__sublabel {
    font-size: 22rpx;
    color: $color-text-secondary;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__value {
    font-size: 30rpx;
    color: $color-text-secondary;
  }

  &__arrow {
    font-size: 36rpx;
    color: $color-text-secondary;
  }

  &__badge {
    min-width: 44rpx;
    height: 44rpx;
    border-radius: $radius-full;
    background: $color-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12rpx;
  }

  &__badge-text {
    font-size: 24rpx;
    color: #fff;
    font-weight: 700;
  }

  &__coming {
    font-size: 26rpx;
    color: $color-text-secondary;
    background: rgba(51, 54, 52, 0.06);
    padding: 8rpx 20rpx;
    border-radius: $radius-full;
  }
}

.settings-divider {
  height: 2rpx;
  background: $color-line;
  margin: 0 40rpx;
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
