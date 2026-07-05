<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <text class="top-bar__back-icon">‹</text>
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">添加物品</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">

      <!-- 图片预览区 -->
      <view class="img-section">
        <!-- 识别中状态 -->
        <view v-if="isScanning" class="img-preview img-preview--scanning">
          <image class="img-preview__img img-preview__img--blur" :src="previewImage" mode="aspectFill" />
          <view class="scanning-overlay">
            <view class="scanning-frame" />
          </view>
          <view class="scanning-hint">
            <image class="scanning-hint__icon-img" src="/static/icons/tongbu.svg" mode="aspectFit" />
            <text class="scanning-hint__text">正在识别图片信息...</text>
          </view>
          <text class="scanning-hint__sub">请耐心等待</text>
        </view>

        <!-- 正常预览状态 -->
        <view v-else class="img-preview">
          <image
            v-if="previewImage"
            class="img-preview__img"
            :src="previewImage"
            mode="aspectFit"
            :style="{ transform: `rotate(${imgRotation}deg)` }"
          />
          <view v-else class="img-preview__empty" @tap="onChooseImage">
            <image class="img-preview__empty-icon-img" src="/static/icons/paizhao.svg" mode="aspectFit" />
            <text class="img-preview__empty-text">点击上传物品图片</text>
          </view>
        </view>

        <!-- 图片操作按钮 -->
        <view v-if="previewImage && !isScanning" class="img-actions">
          <view class="img-action-btn" @tap="onReprocess">
            <image class="img-action-btn__icon-img" src="/static/icons/tongbu.svg" mode="aspectFit" />
            <text class="img-action-btn__text">重新整理</text>
          </view>
          <view class="img-action-btn" @tap="onUseOriginal">
            <image class="img-action-btn__icon-img" src="/static/icons/shoudong.svg" mode="aspectFit" />
            <text class="img-action-btn__text">使用原图</text>
          </view>
        </view>
      </view>

      <!-- 表单区 -->
      <view class="form-section">
        <!-- 物品名称 -->
        <view class="form-group">
          <text class="form-label">物品名称</text>
          <view class="form-input-wrap">
            <input
              class="form-input"
              v-model="form.name"
              placeholder="请输入物品名称"
              :disabled="isScanning"
            />
          </view>
          <view class="form-divider" />
        </view>

        <!-- 分类 -->
        <view class="form-group" @tap="onPickCategory">
          <text class="form-label">分类</text>
          <view class="form-select-row">
            <text class="form-select-value">{{ form.categoryLabel || '请选择' }}</text>
            <text class="form-select-arrow">›</text>
          </view>
          <view class="form-divider" />
        </view>

        <!-- 生产日期 & 保质期 -->
        <view class="form-group">
          <view class="form-row">
            <view class="form-col" @tap="onPickProduceDate">
              <text class="form-label">生产日期</text>
              <view class="form-date-row">
                <text class="form-select-value">{{ form.produceDate || '请选择' }}</text>
                <text class="form-select-arrow">›</text>
              </view>
            </view>
            <view class="form-col">
              <text class="form-label">保质期</text>
              <view class="form-shelf-row">
                <input
                  class="form-input form-input--shelf"
                  v-model="form.shelfLife"
                  type="number"
                  placeholder="7"
                />
                <view class="form-unit-select" @tap="onPickUnit">
                  <text class="form-select-value">{{ form.shelfUnit }}</text>
                  <text class="form-select-arrow form-select-arrow--down">∨</text>
                </view>
              </view>
            </view>
          </view>
          <view class="form-divider" />
        </view>

        <!-- 自动计算到期日 -->
        <view class="form-expire-display" v-if="computedExpireDate">
          <text class="form-expire-display__label">到期日（自动计算）</text>
          <text class="form-expire-display__value">{{ computedExpireDate }}</text>
        </view>

        <!-- 当前状态 -->
        <view class="form-group">
          <text class="form-label">当前状态</text>
          <view class="form-status-row">
            <view
              v-for="st in statusOptions"
              :key="st.key"
              class="form-status-btn"
              :class="{ 'form-status-btn--active': form.status === st.key }"
              @tap="form.status = st.key"
            >
              <text class="form-status-btn__text">{{ st.label }}</text>
            </view>
          </view>
          <view class="form-divider" />
        </view>

        <!-- 到期提醒 -->
        <view class="form-group" @tap="onPickReminder">
          <text class="form-label">到期提醒</text>
          <view class="form-select-row">
            <text class="form-select-value">提前 {{ form.reminderDays }} 天提醒</text>
            <text class="form-select-arrow">›</text>
          </view>
          <view class="form-divider" />
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 底部保存按钮 -->
    <view class="bottom-action">
      <view
        class="save-btn"
        :class="{ 'save-btn--disabled': !canSave || isSaving }"
        @tap="onSave"
      >
        <text class="save-btn__text">{{ isSaving ? '保存中...' : '保存到物品库' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface FormData {
  name: string
  category: string
  categoryLabel: string
  produceDate: string
  shelfLife: string
  shelfUnit: string
  status: string
  reminderDays: number
}

interface StatusOption {
  key: string
  label: string
}

const previewImage = ref('')
const imgRotation = ref(0)
const isScanning = ref(false)
const isSaving = ref(false)

const form = ref<FormData>({
  name: '某某牌酸奶',
  category: 'food',
  categoryLabel: '食品',
  produceDate: '2026-06-20',
  shelfLife: '7',
  shelfUnit: '天',
  status: 'pending',
  reminderDays: 7,
})

const statusOptions = ref<StatusOption[]>([
  { key: 'pending', label: '待取用' },
  { key: 'using', label: '使用中' },
])

const computedExpireDate = computed(() => {
  if (!form.value.produceDate || !form.value.shelfLife) return ''
  const produce = new Date(form.value.produceDate)
  const days = parseInt(form.value.shelfLife)
  if (isNaN(days)) return ''
  const unitMap: Record<string, number> = { 天: 1, 月: 30, 年: 365 }
  const multiplier = unitMap[form.value.shelfUnit] || 1
  produce.setDate(produce.getDate() + days * multiplier)
  const y = produce.getFullYear()
  const m = String(produce.getMonth() + 1).padStart(2, '0')
  const d = String(produce.getDate()).padStart(2, '0')
  return `${y}年${m}月${d}日`
})

const canSave = computed(() => !!form.value.name && !!form.value.produceDate)

function onBack() {
  uni.navigateBack()
}

function onChooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success(res) {
      previewImage.value = res.tempFilePaths[0]
      isScanning.value = true
      // 模拟识别延迟
      setTimeout(() => {
        isScanning.value = false
        imgRotation.value = (Math.random() * 4 - 2)
      }, 2000)
    },
  })
}

function onReprocess() {
  if (!previewImage.value) return
  isScanning.value = true
  setTimeout(() => {
    isScanning.value = false
    imgRotation.value = (Math.random() * 4 - 2)
  }, 1500)
}

function onUseOriginal() {
  imgRotation.value = 0
}

function onPickCategory() {
  uni.showActionSheet({
    itemList: ['食品', '药品', '美妆', '日化', '母婴'],
    success(res) {
      const map = ['食品', '药品', '美妆', '日化', '母婴']
      const keyMap = ['food', 'medicine', 'beauty', 'daily', 'baby']
      form.value.categoryLabel = map[res.tapIndex]
      form.value.category = keyMap[res.tapIndex]
    },
  })
}

function onPickProduceDate() {
  uni.showDatePickerView?.({}) // 实际使用 wot-design-uni 的 wd-datetime-picker
}

function onPickUnit() {
  uni.showActionSheet({
    itemList: ['天', '月', '年'],
    success(res) {
      form.value.shelfUnit = ['天', '月', '年'][res.tapIndex]
    },
  })
}

function onPickReminder() {
  uni.showActionSheet({
    itemList: ['提前 3 天', '提前 7 天', '提前 14 天', '提前 30 天'],
    success(res) {
      form.value.reminderDays = [3, 7, 14, 30][res.tapIndex]
    },
  })
}

function onSave() {
  if (!canSave.value || isSaving.value) return
  isSaving.value = true
  // 实际项目中此处调用云函数保存
  setTimeout(() => {
    isSaving.value = false
    uni.showToast({ title: '已收入物品库~', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1000)
  }, 1200)
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
$color-line: rgba(51, 54, 52, 0.1);
$shadow-card: 0 8rpx 48rpx rgba(51, 54, 52, 0.08);
$radius-card: 32rpx;
$radius-full: 9999rpx;

.page {
  width: 100%;
  height: 100vh;
  background: $color-bg;
  display: flex;
  flex-direction: column;
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
    font-weight: 300;
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

/* 滚动体 */
.scroll-body {
  flex: 1;
  margin-top: 120rpx;
  margin-bottom: 168rpx;
  height: calc(100vh - 120rpx - 168rpx);
}

/* 图片区 */
.img-section {
  margin: 0 48rpx;
  margin-top: 32rpx;
  background: $color-bg-light;
  border-radius: $radius-card;
  overflow: hidden;
  box-shadow: $shadow-card;
}

.img-preview {
  width: 100%;
  height: 480rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &--scanning {
    background: rgba(0,0,0,0.05);
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: contain;

    &--blur {
      filter: blur(8rpx);
      opacity: 0.7;
    }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
  }

  &__empty-icon-img {
    width: 80rpx;
    height: 80rpx;
    opacity: 0.3;
  }

  &__empty-text {
    font-size: 28rpx;
    color: $color-text-secondary;
  }
}

.scanning-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanning-frame {
  width: 240rpx;
  height: 240rpx;
  border: 4rpx solid rgba(255,255,255,0.8);
  border-radius: 16rpx;
}

.scanning-hint {
  position: absolute;
  bottom: 48rpx;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;

  &__icon-img {
    width: 28rpx;
    height: 28rpx;
    opacity: 0.6;
  }

  &__text {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__sub {
    position: absolute;
    bottom: 20rpx;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 24rpx;
    color: $color-text-secondary;
  }
}

.img-actions {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 24rpx;
  padding: 24rpx;
}

.img-action-btn {
  flex: 1;
  height: 72rpx;
  background: $color-card;
  border-radius: $radius-full;
  border: 2rpx solid $color-line;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: $shadow-card;

  &__icon-img {
    width: 28rpx;
    height: 28rpx;
    opacity: 0.6;
  }

  &__text {
    font-size: 28rpx;
    color: $color-text;
  }
}

/* 表单 */
.form-section {
  margin: 40rpx 48rpx 0;
}

.form-group {
  margin-bottom: 8rpx;
}

.form-label {
  font-size: 24rpx;
  color: $color-text-secondary;
  display: block;
  margin-bottom: 12rpx;
}

.form-input-wrap {
  display: flex;
  align-items: center;
}

.form-input {
  flex: 1;
  height: 64rpx;
  font-family: 'Noto Serif SC', serif;
  font-size: 34rpx;
  font-weight: 700;
  color: $color-text;
  background: transparent;

  &--shelf {
    width: 120rpx;
    font-size: 34rpx;
    text-align: center;
  }
}

.form-select-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64rpx;
}

.form-select-value {
  font-family: 'Noto Serif SC', serif;
  font-size: 34rpx;
  font-weight: 700;
  color: $color-text;
}

.form-select-arrow {
  font-size: 36rpx;
  color: $color-text-secondary;

  &--down {
    font-size: 24rpx;
  }
}

.form-divider {
  height: 2rpx;
  background: $color-line;
  margin: 16rpx 0 32rpx;
}

.form-row {
  display: flex;
  flex-direction: row;
  gap: 48rpx;
}

.form-col {
  flex: 1;
}

.form-date-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 64rpx;
}

.form-shelf-row {
  display: flex;
  align-items: center;
  height: 64rpx;
}

.form-unit-select {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-left: 16rpx;
}

/* 到期日展示 */
.form-expire-display {
  background: $color-bg-light;
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40rpx;

  &__label {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__value {
    font-size: 30rpx;
    font-weight: 700;
    color: $color-warn;
  }
}

/* 状态选择 */
.form-status-row {
  display: flex;
  flex-direction: row;
  gap: 24rpx;
  margin-bottom: 8rpx;
}

.form-status-btn {
  flex: 1;
  height: 80rpx;
  border-radius: $radius-full;
  border: 2rpx solid $color-line;
  display: flex;
  align-items: center;
  justify-content: center;

  &--active {
    background: $color-primary-dark;
    border-color: $color-primary-dark;

    .form-status-btn__text {
      color: #fff;
      font-weight: 700;
    }
  }

  &__text {
    font-size: 30rpx;
    color: $color-text-secondary;
  }
}

.safe-bottom {
  height: 40rpx;
}

/* 底部保存 */
.bottom-action {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 48rpx 64rpx;
  background: linear-gradient(to top, #FAF9F7 70%, transparent);
}

.save-btn {
  width: 100%;
  height: 104rpx;
  background: $color-primary-dark;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 48rpx rgba(83, 98, 81, 0.3);

  &--disabled {
    background: #E3E2E0;
    box-shadow: none;
    opacity: 0.7;
  }

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
    font-weight: 700;
    color: #fff;
  }
}
</style>
