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

        <!-- 默认临期天数（到期提醒设置） -->
        <picker mode="selector" :range="reminderPickerOptions" @change="onReminderPickerChange">
          <view class="settings-item">
            <text class="settings-item__label">到期提醒设置</text>
            <view class="settings-item__right">
              <text class="settings-item__value">{{ settings.defaultDays === 0 ? '不提醒' : `${settings.defaultDays}天` }}</text>
              <image class="settings-item__arrow-icon" src="/static/icons/reminder-xuanze.svg" mode="aspectFit" />
            </view>
          </view>
        </picker>
        <view class="settings-divider" />

        <!-- 提醒时间 -->
        <picker mode="time" :value="settings.reminderTime" @change="onReminderTimeChange">
          <view class="settings-item">
            <text class="settings-item__label">提醒时间</text>
            <view class="settings-item__right">
              <text class="settings-item__value">{{ settings.reminderTime }}</text>
              <image class="settings-item__arrow-icon" src="/static/icons/reminder-xuanze.svg" mode="aspectFit" />
            </view>
          </view>
        </picker>
        <view class="settings-divider" />

        <!-- 应用内提醒 -->
        <view class="settings-item">
          <text class="settings-item__label">应用内提醒</text>
          <view
            class="toggle"
            :class="{ 'toggle--on': settings.inAppEnabled }"
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
import { reactive, ref, computed } from 'vue'

interface ReminderSettings {
  subscribeEnabled: boolean
  defaultDays: number
  reminderTime: string
  inAppEnabled: boolean
}

const storedDefaultDays = uni.getStorageSync('defaultReminderDays')

const settings = reactive<ReminderSettings>({
  subscribeEnabled: true,
  defaultDays: storedDefaultDays === '' ? 7 : storedDefaultDays,
  reminderTime: uni.getStorageSync('defaultReminderTime') || '09:00',
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

const customReminderDays = ref<number[]>(uni.getStorageSync('customReminderDays') || [])

const reminderPickerOptions = computed(() => {
  const baseList = [0, 3, 5, 7, 14, 30]
  const allDays = Array.from(new Set([...baseList, ...customReminderDays.value])).sort((a, b) => a - b)
  
  const options = allDays.map(d => d === 0 ? '不提醒' : `${d}天`)
  options.push('+ 新增自定义')
  if (customReminderDays.value.length > 0) {
    options.push('- 管理自定义')
  }
  return options
})

function onReminderPickerChange(e: any) {
  const index = e.detail.value
  const selected = reminderPickerOptions.value[index]
  
  if (selected === '+ 新增自定义') {
    uni.showModal({
      title: '自定义天数',
      placeholderText: '请输入天数',
      editable: true,
      success: (modalRes) => {
        if (modalRes.confirm && modalRes.content) {
          const days = parseInt(modalRes.content)
          if (!isNaN(days) && days >= 0) {
            const newCustom = Array.from(new Set([...customReminderDays.value, days])).sort((a, b) => a - b)
            customReminderDays.value = newCustom
            uni.setStorageSync('customReminderDays', newCustom)
            
            settings.defaultDays = days
            uni.setStorageSync('defaultReminderDays', days)
          } else {
            uni.showToast({ title: '请输入有效天数', icon: 'none' })
          }
        }
      }
    })
  } else if (selected === '- 管理自定义') {
    const items = customReminderDays.value.slice(0, 6)
    uni.showActionSheet({
      itemList: items.map(d => `删除 ${d}天`),
      success: (delRes) => {
        const indexToDelete = delRes.tapIndex
        const dayToDelete = items[indexToDelete]
        
        const realIndex = customReminderDays.value.indexOf(dayToDelete)
        if (realIndex > -1) {
          customReminderDays.value.splice(realIndex, 1)
          uni.setStorageSync('customReminderDays', customReminderDays.value)
          uni.showToast({ title: `已删除 ${dayToDelete}天`, icon: 'none' })
          
          const baseList = [0, 3, 5, 7, 14, 30]
          if (settings.defaultDays === dayToDelete && !baseList.includes(dayToDelete)) {
             settings.defaultDays = 7
             uni.setStorageSync('defaultReminderDays', 7)
          }
        }
      }
    })
  } else {
    if (selected === '不提醒') {
      settings.defaultDays = 0
    } else {
      settings.defaultDays = parseInt(selected.replace('天', ''))
    }
    uni.setStorageSync('defaultReminderDays', settings.defaultDays)
  }
}

function onReminderTimeChange(e: any) {
  settings.reminderTime = e.detail.value
  uni.setStorageSync('defaultReminderTime', settings.reminderTime)
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
  font-family: 'Noto Serif SC', serif;
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
      transform: translateX(50rpx);

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
