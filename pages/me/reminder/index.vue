<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon-img" src="/static/icons/reminder-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/reminder-topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">提醒设置</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <view class="content">
      <view class="settings-card">
        <!-- 订阅消息提醒 -->
        <view class="settings-item">
          <text class="settings-item__label">订阅消息提醒</text>
          <view
            class="toggle"
            :class="{ 'toggle--on': settings.subscribeEnabled }"
            @tap="onToggleSubscribe"
          >
            <view class="toggle__thumb" />
          </view>
        </view>
        <view class="settings-divider" />

        <!-- 默认临期天数 -->
        <view class="settings-item" @tap="onPickDefaultDays">
          <text class="settings-item__label">默认临期天数</text>
          <view class="settings-item__right">
            <text class="settings-item__value">{{ settings.defaultDays }}天</text>
            <image class="settings-item__arrow-icon" src="/static/icons/reminder-xuanze.svg" mode="aspectFit" />
          </view>
        </view>
        <view class="settings-divider" />

        <!-- 提醒时间 -->
        <view class="settings-item" @tap="onPickReminderTime">
          <text class="settings-item__label">提醒时间</text>
          <view class="settings-item__right">
            <text class="settings-item__value">{{ settings.reminderTime }}</text>
            <image class="settings-item__arrow-icon" src="/static/icons/reminder-xuanze.svg" mode="aspectFit" />
          </view>
        </view>
        <view class="settings-divider" />

        <!-- 应用内提醒 -->
        <view class="settings-item">
          <text class="settings-item__label">应用内提醒</text>
          <view
            class="toggle toggle--muted"
            :class="{ 'toggle--on-muted': settings.inAppEnabled }"
            @tap="onToggleInApp"
          >
            <view class="toggle__thumb" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

interface ReminderSettings {
  subscribeEnabled: boolean
  defaultDays: number
  reminderTime: string
  inAppEnabled: boolean
}

const settings = reactive<ReminderSettings>({
  subscribeEnabled: true,
  defaultDays: 7,
  reminderTime: '09:00',
  inAppEnabled: true,
})

function onBack() {
  uni.navigateBack()
}

function onToggleSubscribe() {
  settings.subscribeEnabled = !settings.subscribeEnabled
}

function onToggleInApp() {
  settings.inAppEnabled = !settings.inAppEnabled
}

function onPickDefaultDays() {
  uni.showActionSheet({
    itemList: ['3天', '5天', '7天', '14天', '30天'],
    success(res) {
      settings.defaultDays = [3, 5, 7, 14, 30][res.tapIndex]
    },
  })
}

function onPickReminderTime() {
  uni.showActionSheet({
    itemList: ['07:00', '08:00', '09:00', '10:00', '12:00', '20:00'],
    success(res) {
      settings.reminderTime = ['07:00', '08:00', '09:00', '10:00', '12:00', '20:00'][res.tapIndex]
    },
  })
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
$radius-card: 24rpx;
$radius-full: 9999rpx;
$top-height: 120rpx;

.page {
  width: 100%;
  height: 100vh;
  background: $color-bg;
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
  background: #FAF9F7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 24rpx;
  padding-right: 24rpx;
  border-bottom: 2rpx solid $color-line;

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
  padding-top: calc($top-height + 64rpx);
  padding-left: 48rpx;
  padding-right: 48rpx;
}

/* 设置卡片 */
.settings-card {
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  overflow: hidden;
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40rpx;
  height: 112rpx;

  &__label {
    font-size: 32rpx;
    color: $color-text;
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

  &__arrow-icon {
    width: 32rpx;
    height: 32rpx;
    opacity: 0.6;
  }
}

.settings-divider {
  height: 2rpx;
  background: $color-line;
  margin: 0 40rpx;
}

/* Toggle 开关 */
.toggle {
  width: 104rpx;
  height: 60rpx;
  border-radius: $radius-full;
  background: rgba(51, 54, 52, 0.15);
  position: relative;
  transition: background 0.25s;

  &__thumb {
    position: absolute;
    top: 6rpx;
    left: 6rpx;
    width: 48rpx;
    height: 48rpx;
    border-radius: $radius-full;
    background: #fff;
    transition: transform 0.25s;
    box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;

    &::after {
      content: '';
    }
  }

  &--on {
    background: $color-primary;

    .toggle__thumb {
      transform: translateX(44rpx);

      &::after {
        content: '';
        width: 24rpx;
        height: 24rpx;
        background: url('/static/icons/reminder-duigou.svg') no-repeat center;
        background-size: contain;
      }
    }
  }

  &--muted {
    background: rgba(51, 54, 52, 0.15);
  }

  &--on-muted {
    background: $color-expired;

    .toggle__thumb {
      transform: translateX(44rpx);

      &::after {
        content: '';
        width: 24rpx;
        height: 24rpx;
        background: url('/static/icons/reminder-duigou.svg') no-repeat center;
        background-size: contain;
      }
    }
  }
}
</style>
