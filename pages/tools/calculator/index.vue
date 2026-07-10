<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon-img" src="@/static/icons/calculator-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="@/static/icons/calculator-topIcon-yezi.svg" mode="aspectFit" />
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

      <!-- 模式切换 -->
      <view class="mode-tabs">
        <view class="mode-tab" :class="{'mode-tab--active': mode === 'normal'}" @tap="onModeSwitch('normal')">普通效期</view>
        <view class="mode-tab" :class="{'mode-tab--active': mode === 'after_opening'}" @tap="onModeSwitch('after_opening')">开封后效期</view>
      </view>

      <!-- 输入卡片 -->
      <view class="input-card">
        <block v-if="mode === 'normal'">
          <!-- 生产日期 -->
          <view class="input-row">
            <image class="input-row__icon-img" src="@/static/icons/calculator-shengchanriqi.svg" mode="aspectFit" />
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
            </view>
          </picker>

          <!-- 保质期 -->
          <view class="input-row" style="margin-top: 32rpx;">
            <image class="input-row__icon-img" src="@/static/icons/calculator-baozhiqi.svg" mode="aspectFit" />
            <text class="input-row__label">保质期</text>
          </view>
          <view class="shelf-row">
            <view class="shelf-input-wrap">
              <input
                class="shelf-input"
                v-model="form.shelfLife"
                type="text"
                placeholder="请输入"
                placeholder-style="font-family: 'Noto Serif SC', serif; color: rgba(51, 54, 52, 0.64);"
                @input="onFormChange"
              />
            </view>
            <view class="unit-select" @tap="onPickUnit('normal')">
              <text class="unit-select__value">{{ form.shelfUnit }}</text>
              <image class="unit-select__arrow-img" src="@/static/icons/add-xiaxuanze.svg" mode="aspectFit" />
            </view>
          </view>
        </block>

        <block v-if="mode === 'after_opening'">
          <!-- 开封日期 -->
          <view class="input-row">
            <image class="input-row__icon-img" src="@/static/icons/calculator-shengchanriqi.svg" mode="aspectFit" />
            <text class="input-row__label">开封日期</text>
          </view>
          <picker
            class="date-picker"
            mode="date"
            :value="form.openDate"
            :end="todayStr"
            @change="onOpenDateChange"
          >
            <view class="input-field">
              <text class="input-field__text" :class="{ 'input-field__text--placeholder': !form.openDate }">
                {{ form.openDate || '请选择日期' }}
              </text>
            </view>
          </picker>

          <!-- 开封后保质期 -->
          <view class="input-row" style="margin-top: 32rpx;">
            <image class="input-row__icon-img" src="@/static/icons/calculator-baozhiqi.svg" mode="aspectFit" />
            <text class="input-row__label">开封后保质期</text>
          </view>
          <view class="shelf-row">
            <view class="shelf-input-wrap">
              <input
                class="shelf-input"
                v-model="form.afterShelfLife"
                type="text"
                placeholder="请输入"
                placeholder-style="font-family: 'Noto Serif SC', serif; color: rgba(51, 54, 52, 0.64);"
                @input="onFormChange"
              />
            </view>
            <view class="unit-select" @tap="onPickUnit('after_opening')">
              <text class="unit-select__value">{{ form.afterShelfUnitLabel }}</text>
              <image class="unit-select__arrow-img" src="@/static/icons/add-xiaxuanze.svg" mode="aspectFit" />
            </view>
          </view>
        </block>

        <!-- 计算按钮 -->
        <view class="calc-btn" :class="{'calc-btn--primary': !hasCalculated}" @tap="onCalculate">
          <text class="calc-btn__text" :class="{'calc-btn__text--primary': !hasCalculated}">
            {{ hasCalculated ? '重新计算' : '开始计算' }}
          </text>
        </view>
      </view>

      <!-- 结果卡片 -->
      <view class="result-card" v-if="result.expireDate">
        <view class="result-card__bg-decor" />
        
        <view class="result-top">
          <image class="result-top__icon" src="@/static/icons/calculator-yujidaoqiri.svg" mode="aspectFit" />
          <view class="result-top__text-wrap">
            <text class="result-top__label">预计到期日</text>
            <text class="result-top__date">{{ result.expireDateLabel }}</text>
          </view>
        </view>
        
        <view class="result-reminder">
          <image class="result-reminder__icon-img" src="@/static/icons/calculator-tixing.svg" mode="aspectFit" />
          <text class="result-reminder__text">小管家会在前 {{ result.reminderDays }} 天提醒你</text>
        </view>
        
        <view class="result-save-btn" @tap="onSaveAsItem">
          <image class="result-save-btn__icon-img" src="@/static/icons/calculator-baocun.svg" mode="aspectFit" />
          <text class="result-save-btn__text">保存为物品</text>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

import { calculateExpiryDate, calculateAfterOpeningDate } from '../../../utils/dateUtils.js'

interface CalcForm {
  produceDate: string
  shelfLife: string
  shelfUnit: string
  
  openDate: string
  afterShelfLife: string
  afterShelfUnit: string
  afterShelfUnitLabel: string
}

interface CalcResult {
  expireDate: string
  expireDateLabel: string
  reminderDays: number
}

const todayStr = new Date().toISOString().slice(0, 10)
const mode = ref<'normal' | 'after_opening'>('normal')

const form = reactive<CalcForm>({
  produceDate: '',
  shelfLife: '',
  shelfUnit: '天',
  
  openDate: '',
  afterShelfLife: '',
  afterShelfUnit: 'day',
  afterShelfUnitLabel: '天'
})

const result = reactive<CalcResult>({
  expireDate: '',
  expireDateLabel: '',
  reminderDays: 7,
})

const hasCalculated = computed(() => !!result.expireDate)

function onBack() {
  uni.navigateBack()
}

function onModeSwitch(newMode: 'normal' | 'after_opening') {
  if (mode.value !== newMode) {
    mode.value = newMode
    resetResult()
  }
}

function resetResult() {
  result.expireDate = ''
  result.expireDateLabel = ''
}

function onProduceDateChange(e: any) {
  form.produceDate = e.detail.value
}

function onOpenDateChange(e: any) {
  form.openDate = e.detail.value
}

function onPickUnit(target: 'normal' | 'after_opening') {
  uni.showActionSheet({
    itemList: ['天', '月', '年'],
    success(res) {
      if (target === 'normal') {
        form.shelfUnit = ['天', '月', '年'][res.tapIndex]
      } else {
        form.afterShelfUnitLabel = ['天', '月', '年'][res.tapIndex]
        form.afterShelfUnit = ['day', 'month', 'year'][res.tapIndex]
      }
    },
  })
}

function onFormChange() {
  // Do nothing. The user wants the result card to remain visible 
  // until they explicitly click "重新计算".
}

function onCalculate() {
  if (mode.value === 'normal') {
    if (!form.produceDate || !form.shelfLife) return
    const val = parseInt(form.shelfLife)
    if (isNaN(val)) {
      uni.showToast({ title: '小管家没看清，请输入纯数字哦~', icon: 'none' })
      return
    }
    
    let unit = 'day'
    if (form.shelfUnit === '天') unit = 'day'
    else if (form.shelfUnit === '月') unit = 'month'
    else if (form.shelfUnit === '年') unit = 'year'
    
    const expiry = calculateExpiryDate(form.produceDate, val, unit)
    if (expiry) {
      result.expireDate = expiry
      const [y, m, d] = expiry.split('-')
      result.expireDateLabel = `${y}年${m}月${d}日`
    }
  } else {
    if (!form.openDate || !form.afterShelfLife) return
    const val = parseInt(form.afterShelfLife)
    if (isNaN(val)) {
      uni.showToast({ title: '小管家没看清，请输入纯数字哦~', icon: 'none' })
      return
    }
    
    let unit = 'month'
    if (form.afterShelfUnit === '天' || form.afterShelfUnitLabel === '天') unit = 'day'
    else if (form.afterShelfUnit === '月' || form.afterShelfUnitLabel === '月') unit = 'month'
    else if (form.afterShelfUnit === '年' || form.afterShelfUnitLabel === '年') unit = 'year'
    
    const expiry = calculateAfterOpeningDate(form.openDate, val, unit)
    if (expiry) {
      result.expireDate = expiry
      const [y, m, d] = expiry.split('-')
      result.expireDateLabel = `${y}年${m}月${d}日`
    }
  }
}

function onSaveAsItem() {
  uni.navigateTo({
    url: `/pages/add/index?mode=manual&expireDate=${result.expireDate}`,
  })
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
$color-line: rgba(51, 54, 52, 0.08);
$shadow-card: 0 16rpx 48rpx rgba(51, 54, 52, 0.08);
$radius-card: 32rpx;
$radius-full: 9999rpx;
$top-height: 120rpx;

/* 统一字体格式为思源宋体 */
view, text, button, input {
  font-family: 'Noto Serif SC', serif !important;
}

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
  justify-content: space-between; // 保证左右两边推开，中间部分自动居中
  padding-left: 24rpx;
  padding-right: 24rpx;
  border-bottom: 2rpx solid rgba(51, 54, 52, 0.08);
  box-shadow: 0 16rpx 48rpx rgba(51, 54, 52, 0.1);

  &__back {
    width: 88rpx;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  &__back-icon-img {
    width: 36rpx;
    height: 36rpx;
  }

  &__center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 88rpx;
    gap: 12rpx;
  }

  &__leaf {
    width: 32rpx;
    height: 32rpx;
  }

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 36rpx;
    font-weight: 700;
    color: $color-primary-dark;
  }

  &__placeholder {
    width: 88rpx; // 占位符，保证 __center 在 flex 中绝对居中
  }
}

.scroll-body {
  flex: 1;
  padding-top: calc($top-height + var(--status-bar-height, 44rpx));
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
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
    font-family: 'Noto Serif SC', serif;
    font-size: 28rpx;
    color: $color-text-secondary;
    display: block;
    margin-bottom: 32rpx;
  }
}

.mode-tabs {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  margin: 0 48rpx 32rpx;
}

.mode-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 16rpx;
  background-color: $color-bg-light;
  color: $color-text-secondary;
  font-size: 26rpx;
  transition: all 0.2s ease;
}

.mode-tab--active {
  background-color: $color-primary;
  color: #FFF;
  font-weight: 600;
}

/* 输入卡片 */
.input-card {
  margin: 0 48rpx;
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  padding: 40rpx;
  border: 2rpx solid #E7E1D8;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;

  &__icon-img {
    width: 32rpx;
    height: 32rpx;
  }

  &__label {
    font-family: 'Noto Serif SC', serif;
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
  border: 2rpx dashed #E7E1D8;
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
}

.shelf-row {
  display: flex;
  gap: 24rpx;
}

.shelf-input-wrap {
  flex: 1;
  height: 88rpx;
  border: 2rpx dashed #E7E1D8;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
}

.shelf-input {
  width: 100%;
  font-family: 'Noto Serif SC', serif !important;
  font-size: 34rpx;
  color: $color-text;
  background: transparent;
}

.unit-select {
  width: 160rpx;
  height: 88rpx;
  border: 2rpx dashed #E7E1D8;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;

  &__value {
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
    color: $color-text;
  }

  &__arrow-img {
    width: 24rpx;
    height: 24rpx;
    opacity: 0.6;
  }
}

.calc-btn {
  margin-top: 32rpx;
  width: 100%;
  height: 88rpx;
  border-radius: $radius-full;
  border: 2rpx solid #333634; // 黑色实线描边
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &--primary {
    background: $color-primary-dark;
    border-color: $color-primary-dark;
  }

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 32rpx;
    color: $color-text;
    transition: all 0.2s ease;

    &--primary {
      color: #FFF;
      font-weight: 700;
    }
  }
}

/* 结果卡片 */
.result-card {
  margin: 32rpx 48rpx 0;
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  padding: 40rpx;
  position: relative;
  overflow: hidden;
  border: 2rpx solid #E7E1D8;

  &__bg-decor {
    position: absolute;
    top: -60rpx;
    right: -60rpx;
    width: 280rpx;
    height: 280rpx;
    background: rgba(249, 154, 118, 0.45); // #F99A76 45%
    border-radius: 9999rpx;
    filter: blur(60rpx);
    z-index: 1;
  }
}

.result-top {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 2;

  &__icon {
    width: 80rpx;
    height: 80rpx;
    margin-top: 8rpx;
  }

  &__text-wrap {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__label {
    font-family: 'Noto Serif SC', serif;
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__date {
    font-family: 'Noto Serif SC', serif;
    font-size: 48rpx;
    font-weight: 400;
    color: $color-text;
  }
}

.result-reminder {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 40rpx;
  position: relative;
  z-index: 2;

  &__icon-img {
    width: 28rpx;
    height: 28rpx;
  }

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 26rpx;
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
  position: relative;
  z-index: 2;

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
</style>
