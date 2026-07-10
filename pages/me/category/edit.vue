<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__left" @tap="goBack">
        <image class="top-bar__back-icon" src="/static/icons/add-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__icon" src="/static/icons/data-topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">编辑分类</text>
      </view>
      <view class="top-bar__right"></view>
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">
      <!-- 分类名称 -->
      <view class="form-section">
        <text class="form-section__title">分类名称</text>
        <view class="form-input" @tap="nameFocused = true">
          <text 
            v-if="!nameFocused"
            class="fake-input-text"
            :class="{'fake-input-text--placeholder': !form.name}"
          >{{ form.name || '输入分类名称' }}</text>
          <input 
            v-else
            v-model="form.name" 
            :focus="true"
            @blur="nameFocused = false"
            placeholder="输入分类名称" 
            placeholder-class="form-input__placeholder"
            class="form-input__inner"
          />
        </view>
      </view>

      <!-- 默认效期方式 -->
      <view class="form-section">
        <text class="form-section__title">默认效期方式</text>
        <view class="mode-select" @tap="onPickExpiryMode">
          <text class="mode-select__value">{{ expiryModeLabel }}</text>
          <image class="mode-select__icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
        </view>
      </view>

      <!-- 分类颜色 -->
      <view class="form-section">
        <text class="form-section__title">分类颜色</text>
        <scroll-view class="color-scroll" scroll-x :show-scrollbar="false">
          <view class="color-picker">
            <view 
              v-for="(color, index) in bgColors" 
              :key="index"
              class="color-dot"
              :class="{ 'color-dot--active': form.bgColor === color }"
              :style="{ backgroundColor: color }"
              @tap="form.bgColor = color"
            ></view>
          </view>
        </scroll-view>
      </view>

      <!-- 图标颜色 -->
      <view class="form-section">
        <text class="form-section__title">图标颜色</text>
        <scroll-view class="color-scroll" scroll-x :show-scrollbar="false">
          <view class="color-picker">
            <view 
              v-for="(color, index) in iconColors" 
              :key="index"
              class="color-dot"
              :class="{ 'color-dot--active': form.iconColor === color }"
              :style="{ backgroundColor: color }"
              @tap="form.iconColor = color"
            ></view>
          </view>
        </scroll-view>
      </view>

      <!-- 分类图标 (可选) -->
      <view class="form-section">
        <view class="form-section__header">
          <text class="form-section__title">分类图标</text>
          <text class="form-section__subtitle">可选</text>
        </view>
        <view class="icon-grid">
          <view 
            v-for="(icon, index) in availableIcons" 
            :key="index"
            class="icon-grid__item"
            :class="{ 'icon-grid__item--active': form.iconIndex === index }"
            @tap="form.iconIndex = index"
          >
            <image class="icon-img" :src="'/static/icons/me-category-' + icon + '.svg'" mode="aspectFit" />
          </view>
        </view>
      </view>

      <!-- 样式预览 -->
      <view class="form-section">
        <text class="form-section__title">样式预览</text>
        <view class="preview-box">
          <view class="preview-card" :style="{ backgroundColor: form.bgColor }">
            <view class="preview-card__content">
              <view class="preview-card__icon-wrap">
                <view class="preview-card__icon-box">
                  <image 
                    class="preview-card__icon-img" 
                    :src="'/static/icons/me-category-' + availableIcons[form.iconIndex] + '.svg'" 
                    :style="{ filter: 'drop-shadow(100px 0 0 ' + form.iconColor + ')' }"
                    mode="aspectFit"
                  />
                </view>
              </view>
              <text class="preview-card__name">{{ form.name || '分类名称' }}</text>
            </view>
            <text class="preview-card__count">0</text>
          </view>
        </view>
      </view>
    <!-- 底部操作区 -->
    <view class="bottom-action">
      <view class="btn-save" @tap="onSave">
        <text class="btn-save__text">保存设置</text>
      </view>
    </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { categoryService } from '../../../services/categoryService.js'

let editId = ''
const nameFocused = ref(false)

const availableIcons = [
  'fenlei1', 'fenlei2', 'fenlei3', 'fenlei4', 'fenlei5',
  'feilei6', 'fenlei7', 'fenlei8', 'fenlei9', 'fenlei10',
  'fenlei11', 'fenlei12', 'fenlei13', 'fenlei14', 'fenlei15',
  'feilei16', 'fenlei17', 'feilei18', 'fenlei19', 'fenlei20'
]

const form = ref({
  name: '',
  bgColor: '#F4F3F1',
  iconColor: '#8E4D33',
  iconIndex: 0,
  defaultExpiryMode: 'normal'
})

const bgColors = [
  '#F4F3F1', '#E9EDEA', '#F4EFEA', '#EEF1EE', 
  '#F7F2E8', '#E8F0EA', '#F0EBE6', 
  '#D4C1A8', '#A3B1C6', '#E5C5D8', '#C5D8A3'
]
const iconColors = [
  '#8E4D33', '#665D51', '#444842', '#536251', '#333634',
  '#4A3F35', '#2C3E38', '#5C4A4D', '#3E4651'
]

const expiryModeLabel = computed(() => {
  if (form.value.defaultExpiryMode === 'after_opening') return '开封后效期'
  if (form.value.defaultExpiryMode === 'dual') return '双效期'
  return '普通效期'
})

function onPickExpiryMode() {
  uni.showActionSheet({
    itemList: ['普通效期', '开封后效期', '双效期'],
    success(res) {
      const modes = ['normal', 'after_opening', 'dual']
      form.value.defaultExpiryMode = modes[res.tapIndex]
    }
  })
}

onLoad((options: any) => {
  if (options && options.id) {
    editId = options.id
    const cat = categoryService.getCategories().find(c => c.id === editId)
    if (cat) {
      form.value.name = cat.name
      form.value.bgColor = cat.backgroundColor || cat.cardBg || '#F4F3F1'
      form.value.iconColor = cat.iconColor || cat.iconBg || '#8E4D33'
      form.value.defaultExpiryMode = cat.defaultExpiryMode || 'normal'
      if (cat.iconKey) {
        let key = cat.iconKey
        const systemIconMap: Record<string, string> = {
          'shipin': 'fenlei1',
          'yaopin': 'fenlei2',
          'meizhuang': 'fenlei3',
          'rihua': 'fenlei4',
          'muying': 'fenlei9',
          'qita': 'fenlei20'
        }
        if (systemIconMap[key]) {
          key = systemIconMap[key]
        }
        const idx = availableIcons.indexOf(key)
        if (idx !== -1) form.value.iconIndex = idx
      }
    }
  }
})

function goBack() {
  uni.navigateBack()
}

function onSave() {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入分类名称', icon: 'none' })
    return
  }
  
  const payload = {
    name: form.value.name.trim(),
    backgroundColor: form.value.bgColor,
    iconColor: form.value.iconColor,
    iconKey: availableIcons[form.value.iconIndex],
    defaultExpiryMode: form.value.defaultExpiryMode
  }
  
  if (editId) {
    categoryService.updateCategory(editId, payload)
  } else {
    categoryService.addCategory(payload)
  }
  
  uni.showToast({ title: '已保存', icon: 'success' })
  setTimeout(() => {
    uni.navigateBack()
  }, 1000)
}
</script>

<style lang="scss" scoped>
$color-bg: #F9F8F6;
$color-primary-dark: #536251;
$color-text: #1A1C1B;

.page {
  width: 100%;
  height: 100vh;
  background: $color-bg;
  display: flex;
  flex-direction: column;
  font-family: 'Noto Serif SC', serif;
}

/* 顶部导航 */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 120rpx;
  padding-top: var(--status-bar-height, 44rpx);
  background: #FAF9F7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 48rpx;
  padding-right: 48rpx;
  border-bottom: 2rpx solid rgba(51, 54, 52, 0.08);
  box-shadow: 0 16rpx 48rpx rgba(51, 54, 52, 0.1);

  &__left, &__right {
    width: 88rpx;
    height: 100%;
    display: flex;
    align-items: center;
  }

  &__back-icon {
    width: 36rpx;
    height: 36rpx;
  }

  &__center {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__icon {
    width: 32rpx;
    height: 32rpx;
  }

  &__title {
    font-size: 36rpx;
    font-weight: 700;
    color: $color-primary-dark;
  }
}

.scroll-body {
  flex: 1;
  padding: calc(120rpx + var(--status-bar-height, 44rpx) + 32rpx) 48rpx 48rpx;
  box-sizing: border-box;
}

/* 表单区域 */
.form-section {
  margin-bottom: 64rpx;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
  }

  &__title {
    font-size: 36rpx;
    font-weight: 600;
    color: $color-text;
    margin-bottom: 24rpx;
    display: block;
  }

  &__subtitle {
    font-size: 28rpx;
    color: #747871;
  }
}

.mode-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  border: 2rpx solid rgba(231, 225, 216, 0.8);
  
  &__value {
    font-size: 32rpx;
    color: $color-text;
  }
  
  &__icon {
    width: 32rpx;
    height: 32rpx;
  }
}

.form-input {
  background: #FAF9F7;
  border: 2rpx solid #C4C8BF;
  border-radius: 24rpx;
  padding: 0 32rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);

  &__inner {
    font-family: 'Noto Serif SC', serif;
    font-size: 32rpx;
    color: $color-text;
    width: 100%;
    height: 100%;
  }

  &__placeholder {
    font-family: 'Noto Serif SC', serif !important;
    color: #747871;
  }
}

.fake-input-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 32rpx;
  color: $color-text;
  width: 100%;

  &--placeholder {
    color: #747871;
  }
}

/* 颜色选择器 */
.color-scroll {
  width: 100%;
  white-space: nowrap;
}

.color-picker {
  display: inline-flex;
  align-items: center;
  gap: 32rpx;
  padding: 16rpx 24rpx;
}

.color-dot {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  transition: all 0.3s;
  box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.05);
  flex-shrink: 0;

  &--active {
    transform: scale(1.1);
    box-shadow: 0 0 0 6rpx #F9F8F6, 0 0 0 10rpx #8A9A86;
  }
}

/* 图标网格 */
.icon-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24rpx;
  background: #F4F3F1;
  border: 2rpx solid rgba(196, 200, 191, 0.3);
  padding: 32rpx;
  border-radius: 32rpx;

  &__item {
    aspect-ratio: 1;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2rpx solid transparent;
    transition: all 0.3s;
    
    &--active {
      border-color: rgba(138, 154, 134, 0.5);
      background: #8A9A86;
    }
  }
}

.icon-img {
  width: 48rpx;
  height: 48rpx;
  padding: 2rpx;
  box-sizing: border-box;
}

/* 样式预览 */
.preview-box {
  background: #F4F3F1;
  border: 2rpx solid rgba(196, 200, 191, 0.3);
  padding: 48rpx;
  border-radius: 32rpx;
  display: flex;
  justify-content: center;
}

.preview-card {
  width: 330rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  border: 2rpx solid #FFFFFF;
  box-shadow: 0 12rpx 32rpx rgba(51, 54, 52, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.3s;

  &__content {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  &__icon-wrap {
    width: 80rpx;
    height: 80rpx;
    background: #FFFFFF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__icon-box {
    width: 44rpx;
    height: 44rpx;
    overflow: hidden;
  }

  &__icon-img {
    width: 44rpx;
    height: 44rpx;
    transform: translateX(-100px);
    display: block;
  }

  &__name {
    font-size: 28rpx;
    font-weight: 500;
    color: #1A1C1B;
  }

  &__count {
    font-size: 40rpx;
    font-weight: 600;
    color: #747871;
  }
}

/* 底部操作区 */
.bottom-action {
  width: 100%;
  margin-top: 64rpx;
  padding-bottom: env(safe-area-inset-bottom);
}

.btn-save {
  width: 100%;
  height: 120rpx;
  background: $color-primary-dark;
  border-radius: 9999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.05);

  &__text {
    font-size: 40rpx;
    color: #FFF;
    font-weight: 400;
  }
}
</style>

<style>
page {
  background-color: #F9F8F6;
}
</style>
