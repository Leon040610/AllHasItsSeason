<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <text class="top-bar__back-icon">‹</text>
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">效期计算器</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">

      <!-- 页面标题 -->
      <view class="page-header">
        <text class="page-header__title">效期计算器</text>
        <text class="page-header__sub">自动计算到期日</text>
      </view>

      <!-- 输入卡片 -->
      <view class="input-card">
        <!-- 生产日期 -->
        <view class="input-row">
          <image class="input-row__icon-img" src="/static/icons/shengchanriqi.svg" mode="aspectFit" />
          <text class="input-row__label">生产日期</text>
        </view>
        <picker
          class="date-picker"
          mode="date"
          :value="form.produceDate"
          :end="todayStr"
          @change="onProduceDateChange"
        >
          <view class="input-field">
            <text class="input-field__text" :class="{ 'input-field__text--placeholder': !form.produceDate }">
              {{ form.produceDate || '请选择日期' }}
            </text>
            <image class="input-field__calendar" src="/static/icons/shengchanriqi.svg" mode="aspectFit" />
          </view>
        </picker>

        <!-- 保质期 -->
        <view class="input-row" style="margin-top: 32rpx;">
          <image class="input-row__icon-img" src="/static/icons/baozhiqi.svg" mode="aspectFit" />
          <text class="input-row__label">保质期</text>
        </view>
        <view class="shelf-row">
          <view class="shelf-input-wrap">
            <input
              class="shelf-input"
              v-model="form.shelfLife"
              type="number"
              placeholder="3"
              @input="onShelfLifeChange"
            />
          </view>
          <view class="unit-select" @tap="onPickUnit">
            <text class="unit-select__value">{{ form.shelfUnit }}</text>
            <text class="unit-select__arrow">∨</text>
          </view>
        </view>

        <!-- 计算按钮 -->
        <view class="calc-btn" @tap="onCalculate">
          <text class="calc-btn__text">重新计算</text>
        </view>
      </view>

      <!-- 结果卡片 -->
      <view class="result-card" v-if="result.expireDate">
        <view class="result-card__bg-decor" />
        <view class="result-header">
          <image class="result-header__icon-img" src="/static/icons/yujidaoqiri.svg" mode="aspectFit" />
          <text class="result-header__label">预计到期日</text>
        </view>
        <text class="result-date">{{ result.expireDateLabel }}</text>
        <view class="result-reminder">
          <image class="result-reminder__icon-img" src="/static/icons/tixing.svg" mode="aspectFit" />
          <text class="result-reminder__text">小管家会在前 {{ result.reminderDays }} 天提醒你</text>
        </view>
        <view class="result-save-btn" @tap="onSaveAsItem">
          <image class="result-save-btn__icon-img" src="/static/icons/duigou.svg" mode="aspectFit" />
          <text class="result-save-btn__text">保存为物品</text>
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
import { ref, reactive } from 'vue'

interface CalcForm {
  produceDate: string
  shelfLife: string
  shelfUnit: string
}

interface CalcResult {
  expireDate: string
  expireDateLabel: string
  reminderDays: number
}

const todayStr = new Date().toISOString().slice(0, 10)

const form = reactive<CalcForm>({
  produceDate: '',
  shelfLife: '3',
  shelfUnit: '年',
})

const result = reactive<CalcResult>({
  expireDate: '',
  expireDateLabel: '',
  reminderDays: 7,
})

function onBack() {
  uni.navigateBack()
}

function onProduceDateChange(e: any) {
  form.produceDate = e.detail.value  // picker 返回 YYYY-MM-DD
  onCalculate()
}

function onPickUnit() {
  uni.showActionSheet({
    itemList: ['天', '月', '年'],
    success(res) {
      form.shelfUnit = ['天', '月', '年'][res.tapIndex]
      onCalculate()
    },
  })
}

function onShelfLifeChange() {
  onCalculate()
}

function onCalculate() {
  if (!form.produceDate || !form.shelfLife) return
  try {
    // picker 返回 YYYY-MM-DD，加 T00:00:00 避免时区导致日期偏移
    const produce = new Date(`${form.produceDate}T00:00:00`)
    const val = parseInt(form.shelfLife)
    if (isNaN(val)) return
    const unitMap: Record<string, number> = { 天: 1, 月: 30, 年: 365 }
    const multiplier = unitMap[form.shelfUnit] || 1
    produce.setDate(produce.getDate() + val * multiplier)
    const ey = produce.getFullYear()
    const em = String(produce.getMonth() + 1).padStart(2, '0')
    const ed = String(produce.getDate()).padStart(2, '0')
    result.expireDate = `${ey}-${em}-${ed}`
    result.expireDateLabel = `${ey}年${em}月${ed}日`
  } catch {
    // 忽略
  }
}

function onSaveAsItem() {
  uni.navigateTo({
    url: `/pages/add/index?mode=manual&expireDate=${result.expireDate}`,
  })
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
$color-bg-light: #F4F3F1;
$color-card: #FFFFFF;
$color-primary: #8A9A86;
$color-primary-dark: #536251;
$color-text: #333634;
$color-text-secondary: rgba(51, 54, 52, 0.64);
$color-warn: #D98A6C;
$color-expired: #A69B8D;
$color-line: rgba(51, 54, 52, 0.1);
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

  &__back-icon {
    font-size: 56rpx;
    color: $color-text;
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

.scroll-body {
  flex: 1;
  padding-top: $top-height;
  padding-bottom: $tab-height;
  height: 100vh;
  box-sizing: border-box;
}

/* 页面标题 */
.page-header {
  padding: 48rpx 48rpx 0;

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 48rpx;
    font-weight: 700;
    color: $color-text;
    display: block;
    margin-bottom: 8rpx;
  }

  &__sub {
    font-size: 28rpx;
    color: $color-text-secondary;
    display: block;
    margin-bottom: 32rpx;
  }
}

/* 输入卡片 */
.input-card {
  margin: 0 48rpx;
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  padding: 40rpx;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;

  &__icon-img {
    width: 32rpx;
    height: 32rpx;
    opacity: 0.6;
  }

  &__label {
    font-size: 28rpx;
    color: $color-text-secondary;
  }
}

.date-picker {
  width: 100%;
  display: block;
}

.input-field {
  width: 100%;
  height: 88rpx;
  border: 2rpx dashed $color-line;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  box-sizing: border-box;

  &__text {
    flex: 1;
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
    font-weight: 400;
    color: $color-text;

    &--placeholder {
      color: $color-text-secondary;
      font-weight: 400;
    }
  }

  &__calendar {
    width: 40rpx;
    height: 40rpx;
    flex-shrink: 0;
    opacity: 0.5;
  }
}

.shelf-row {
  display: flex;
  gap: 24rpx;
}

.shelf-input-wrap {
  flex: 1;
  height: 88rpx;
  border: 2rpx dashed $color-line;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
}

.shelf-input {
  width: 100%;
  font-family: 'Noto Serif SC', serif;
  font-size: 34rpx;
  color: $color-text;
  background: transparent;
}

.unit-select {
  width: 160rpx;
  height: 88rpx;
  border: 2rpx dashed $color-line;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;

  &__value {
    font-size: 34rpx;
    color: $color-text;
  }

  &__arrow {
    font-size: 22rpx;
    color: $color-text-secondary;
  }
}

.calc-btn {
  margin-top: 32rpx;
  width: 100%;
  height: 88rpx;
  border-radius: $radius-full;
  border: 2rpx solid $color-line;
  display: flex;
  align-items: center;
  justify-content: center;

  &__text {
    font-size: 32rpx;
    color: $color-text;
  }
}

/* 结果卡片 */
.result-card {
  margin: 32rpx 48rpx 0;
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card-md;
  padding: 40rpx;
  position: relative;
  overflow: hidden;

  &__bg-decor {
    position: absolute;
    top: -40rpx;
    right: -40rpx;
    width: 200rpx;
    height: 200rpx;
    border-radius: $radius-full;
    background: radial-gradient(circle, rgba(217, 138, 108, 0.15) 0%, transparent 70%);
  }
}

.result-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;

  &__icon-img {
    width: 40rpx;
    height: 40rpx;
  }

  &__label {
    font-size: 28rpx;
    color: $color-text-secondary;
  }
}

.result-date {
  font-family: 'Noto Serif SC', serif;
  font-size: 56rpx;
  font-weight: 400;
  color: $color-text;
  display: block;
  margin-bottom: 32rpx;
}

.result-reminder {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 40rpx;

  &__icon-img {
    width: 28rpx;
    height: 28rpx;
  }

  &__text {
    font-size: 28rpx;
    color: $color-text-secondary;
  }
}

.result-save-btn {
  width: 100%;
  height: 96rpx;
  background: $color-primary-dark;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(83, 98, 81, 0.3);

  &__icon-img {
    width: 32rpx;
    height: 32rpx;
  }

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
    font-weight: 700;
    color: #fff;
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
