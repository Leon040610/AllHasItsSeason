<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon" src="/static/icons/add-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/add-topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">添加物品</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">

      <!-- 图片预览区 -->
      <view class="img-section">
        <!-- 正常预览状态 -->
        <view class="img-preview">
          <image
            v-if="previewImage"
            class="img-preview__img"
            :src="previewImage"
            mode="aspectFit"
            :style="{ transform: `rotate(${imgRotation}deg)` }"
          />
          <view v-else class="img-preview__empty" @tap="onChooseImage">
            <image class="img-preview__empty-icon-img" src="/static/icons/index-paizhao.svg" mode="aspectFit" />
            <text class="img-preview__empty-text">点击上传物品图片</text>
          </view>
        </view>

        <!-- 图片操作按钮 -->
        <view v-if="previewImage && !isScanning" class="img-actions">
          <view class="img-action-btn" @tap="onReprocess">
            <image class="img-action-btn__icon-img" src="/static/icons/add-chongxinzhengli.svg" mode="aspectFit" />
            <text class="img-action-btn__text">重新提取</text>
          </view>
          <view class="img-action-btn" @tap="onUseOriginal">
            <image class="img-action-btn__icon-img" src="/static/icons/add-shiyongyuantu.svg" mode="aspectFit" />
            <text class="img-action-btn__text">使用原图</text>
          </view>
        </view>
      </view>

      <!-- 表单区 -->
      <view class="form-section">
        <!-- 物品名称 -->
        <view class="form-group">
          <text class="form-label">物品名称</text>
          <view class="form-input-wrap" @tap="nameFocused = true">
            <!-- 未聚焦时显示 <text>，使 Noto Serif SC 生效 -->
            <text
              v-if="!nameFocused"
              class="fake-input-text"
              :class="{ 'fake-input-text--placeholder': !form.name }"
            >{{ form.name || '请输入物品名称' }}</text>
            <!-- 聚焦时切换为真实 input -->
            <input
              v-else
              class="form-input"
              v-model="form.name"
              :focus="true"
              placeholder="请输入物品名称"
              :disabled="isScanning"
              @blur="nameFocused = false"
            />
          </view>
          <view class="form-divider" />
        </view>

        <!-- 分类 -->
        <view class="form-group" @tap="onPickCategory">
          <text class="form-label">分类</text>
          <view class="form-select-row">
            <text class="form-select-value">{{ form.categoryLabel || '请选择' }}</text>
            <image class="form-select-arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
          </view>
          <view class="form-divider" />
        </view>

        <!-- 生产日期 & 保质期 -->
        <view class="form-group">
          <view class="form-row">
            <view class="form-col">
              <text class="form-label">生产日期</text>
              <picker mode="date" :value="form.produceDate" @change="onProduceDateChange">
                <view class="form-date-row">
                  <text class="form-select-value">{{ form.produceDate || '请选择' }}</text>
                  <image class="form-select-arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
                </view>
              </picker>
            </view>
            <view class="form-col">
              <text class="form-label">保质期</text>
              <view class="form-shelf-row">
                <!-- 伪输入框：未聚焦时显示 <text> -->
                <view class="fake-shelf-wrap" @tap="shelfFocused = true">
                  <text
                    v-if="!shelfFocused"
                    class="fake-input-text fake-input-text--center"
                    :class="{ 'fake-input-text--placeholder': !form.shelfLife }"
                  >{{ form.shelfLife || '' }}</text>
                  <input
                    v-else
                    class="form-input form-input--shelf"
                    v-model="form.shelfLife"
                    type="number"
                    :focus="true"
                    placeholder=""
                    @blur="shelfFocused = false"
                  />
                </view>
                <view class="form-unit-select" @tap="onPickUnit">
                  <text class="form-select-value">{{ form.shelfUnitLabel }}</text>
                  <image class="form-select-arrow-icon form-select-arrow-icon--down" src="/static/icons/add-xiaxuanze.svg" mode="aspectFit" />
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
            <text class="form-select-value">{{ form.reminderDays === 0 ? '不提醒' : `提前 ${form.reminderDays} 天提醒` }}</text>
            <image class="form-select-arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
          </view>
          <view class="form-divider" />
        </view>
      </view>

      <!-- 保存按钮放在滚动区域内 -->
      <view class="bottom-action">
        <view
          class="save-btn"
          :class="{ 'save-btn--disabled': isSaving }"
          @tap="onSave"
        >
          <text class="save-btn__text">{{ isSaving ? '保存中...' : '保存到物品库' }}</text>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { itemService } from '../../services/itemService.js'
import { settingsService } from '../../services/settingsService.js'
import { calculateExpiryDate } from '../../utils/dateUtils.js'

const previewImage = ref('/static/icons/add-Yogurt Bottle Cutout.svg')
const imgRotation = ref(0)
const isScanning = ref(false)
const isSaving = ref(false)
const nameFocused = ref(false)
const shelfFocused = ref(false)

const originalImagePath = ref('')
const processStatus = ref<'idle' | 'success' | 'fallback' | 'error'>('idle')

const form = ref({
  name: '',
  category: '',
  categoryLabel: '',
  produceDate: '',
  shelfLife: '',
  shelfUnit: 'day', // day, month, year
  shelfUnitLabel: '天',
  status: 'pending', // pending, using
  reminderDays: 7,
})

const statusOptions = ref([
  { key: 'pending', label: '待取用' },
  { key: 'using', label: '使用中' },
])

onMounted(() => {
  const settings = settingsService.getSettings()
  if (settings) {
    form.value.reminderDays = settings.defaultReminderDays
  }
})

const computedExpireDate = computed(() => {
  if (!form.value.produceDate || !form.value.shelfLife) return ''
  const val = parseInt(form.value.shelfLife)
  if (isNaN(val) || val <= 0) return ''
  return calculateExpiryDate(form.value.produceDate, val, form.value.shelfUnit)
})


function onBack() {
  if (form.value.name || form.value.produceDate) {
    uni.showModal({
      title: '提示',
      content: '有未保存的内容，是否放弃离开？',
      confirmText: '离开',
      cancelText: '取消',
      success(res) {
        if (res.confirm) {
          uni.navigateBack()
        }
      }
    })
  } else {
    uni.navigateBack()
  }
}

function onChooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success(res) {
      const tempPath = res.tempFilePaths[0]
      originalImagePath.value = tempPath
      processStatus.value = 'idle'
      
      uni.showLoading({ title: '处理图片中' })
      uni.saveFile({
        tempFilePath: tempPath,
        success: function (saveRes) {
          previewImage.value = saveRes.savedFilePath
          processStatus.value = 'success'
          imgRotation.value = 0
          uni.hideLoading()
        },
        fail: function () {
          previewImage.value = tempPath
          processStatus.value = 'fallback'
          imgRotation.value = 0
          uni.hideLoading()
          uni.showToast({ title: '图片保存失败，将使用原图', icon: 'none' })
        }
      })
    }
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

function onProduceDateChange(e: any) {
  form.value.produceDate = e.detail.value
}

function onPickUnit() {
  uni.showActionSheet({
    itemList: ['天', '月', '年'],
    success(res) {
      const map = ['天', '月', '年']
      const keyMap = ['day', 'month', 'year']
      form.value.shelfUnitLabel = map[res.tapIndex]
      form.value.shelfUnit = keyMap[res.tapIndex]
    },
  })
}

function onPickReminder() {
  const settings = settingsService.getSettings()
  const customDays = settings.customReminderDays || [0, 3, 7, 14, 30]
  
  const itemList = customDays.map(d => d === 0 ? '不提醒' : `提前 ${d} 天`)
  
  uni.showActionSheet({
    itemList,
    success(res) {
      form.value.reminderDays = customDays[res.tapIndex]
    },
  })
}

function onSave() {
  if (isSaving.value) return
  
  // Validation
  if (!form.value.name) {
    return uni.showToast({ title: '请输入物品名称', icon: 'none' })
  }
  if (!form.value.category) {
    return uni.showToast({ title: '请选择分类', icon: 'none' })
  }
  if (!form.value.produceDate) {
    return uni.showToast({ title: '请选择生产日期', icon: 'none' })
  }
  const shelfVal = parseInt(form.value.shelfLife)
  if (isNaN(shelfVal) || shelfVal <= 0) {
    return uni.showToast({ title: '请输入有效的保质期', icon: 'none' })
  }
  if (!computedExpireDate.value) {
    return uni.showToast({ title: '无法计算到期日', icon: 'none' })
  }
  if (form.value.reminderDays < 0 || form.value.reminderDays > 365) {
    return uni.showToast({ title: '提醒天数无效', icon: 'none' })
  }

  isSaving.value = true
  
  const newItem = {
    name: form.value.name,
    categoryId: form.value.category,
    categoryName: form.value.categoryLabel,
    originalImageUrl: originalImagePath.value,
    displayImageUrl: previewImage.value,
    imageProcessStatus: processStatus.value,
    stickerRotation: imgRotation.value,
    productionDate: form.value.produceDate,
    shelfLifeValue: shelfVal,
    shelfLifeUnit: form.value.shelfUnit,
    expiryDate: computedExpireDate.value,
    status: form.value.status,
    remindDays: form.value.reminderDays,
  }

  const success = itemService.addItem(newItem)
  
  if (success) {
    uni.showToast({ title: '已收入物品库~', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } else {
    isSaving.value = false
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
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

/* 统一字体格式为思源宋体 */
view, text, input, button {
  font-family: 'Noto Serif SC', serif;
}

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
  border-bottom: 2rpx solid $color-line;
  box-shadow: 0 16rpx 48rpx rgba(51, 54, 52, 0.1);

  &__back {
    width: 88rpx;
    height: 120rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__back-icon {
    width: 36rpx;
    height: 36rpx;
  }

  &__center {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx; /* 微调间距 */
  }

  &__leaf {
    width: 32rpx;
    height: 32rpx;
    margin-top: 4rpx; /* 微调对齐 */
  }

  &__title {
    font-size: 36rpx;
    font-weight: 700;
    color: #536251;
    line-height: 1.2;
  }

  &__placeholder {
    width: 88rpx;
  }
}

/* 滚动体 */
.scroll-body {
  flex: 1;
  margin-top: calc(120rpx + var(--status-bar-height, 44rpx));
  height: calc(100vh - 120rpx - var(--status-bar-height, 44rpx));
}

/* 图片区 */
.img-section {
  margin: 32rpx 48rpx 0;
  background: $color-bg-light;
  border-radius: $radius-card;
  box-shadow: 0 8rpx 24rpx rgba(51, 54, 52, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 40rpx 48rpx;
}

.img-preview {
  width: 100%;
  height: 360rpx;
  position: relative;
  overflow: hidden;
  border-radius: 16rpx;
  margin-bottom: 24rpx;

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__empty {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
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

/* 按钮区 */
.img-actions {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 24rpx;
  width: 100%;
}

.img-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 16rpx 32rpx;
  background: #FFFFFF;
  border-radius: $radius-full;
  box-shadow: 0 4rpx 16rpx rgba(51, 54, 52, 0.04);

  &__icon-img {
    width: 24rpx;
    height: 24rpx;
  }

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 24rpx;
    font-weight: 400;
    color: $color-text;
  }
}

/* 表单区 */
.form-section {
  margin: 40rpx 48rpx 0;
}

.form-group {
  margin-bottom: 8rpx;
}

.form-label {
  font-family: 'Noto Serif SC', serif;
  font-size: 24rpx;
  color: $color-text-secondary;
  margin-bottom: 8rpx;
  display: block;
}

.form-input-wrap {
  height: 64rpx;
  display: flex;
  align-items: center;
}

/* 伪输入框文字（<text> 组件，完整支持自定义字体）*/
.fake-input-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 34rpx;
  font-weight: 400;
  color: $color-text;
  line-height: 64rpx;
  flex: 1;

  &--placeholder {
    color: $color-text-secondary;
    font-size: 28rpx;
  }

  &--center {
    text-align: center;
    flex: none;
    width: 120rpx;
  }
}

/* 保质期伪输入包装 */
.fake-shelf-wrap {
  width: 120rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-input {
  flex: 1;
  height: 64rpx;
  font-size: 34rpx;
  font-weight: 400;
  color: $color-text;
  background: transparent;

  &--shelf {
    width: 120rpx;
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
  font-weight: 400; /* 去掉加粗 */
  color: $color-text;
}

.form-select-arrow-icon {
  width: 24rpx;
  height: 24rpx;
  opacity: 0.4;
}

.form-divider {
  height: 2rpx;
  background: $color-line;
  margin: 24rpx 0 32rpx;
}

.form-row {
  display: flex;
  gap: 48rpx;
}

.form-col {
  flex: 1;
}

.form-date-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64rpx;
}

.form-shelf-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 64rpx;
}

.form-unit-select {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-left: 16rpx;
  border-left: 2rpx solid $color-line;
}

.form-expire-display {
  background: #F4F3F1;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;

  &__label {
    font-family: 'Noto Serif SC', serif;
    font-size: 24rpx;
    color: #444842;
  }

  &__value {
    font-family: 'Noto Serif SC', serif;
    font-size: 28rpx;
    font-weight: 400;
    color: #8E4D33;
  }
}

.form-status-row {
  display: flex;
  gap: 24rpx;
  height: 80rpx;
  margin-top: 16rpx;
}

.form-status-btn {
  flex: 1;
  border: 2rpx solid transparent;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E3E2E0;

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 28rpx;
    font-weight: 400;
    color: #444842;
  }

  &--active {
    background: transparent;
    border-color: #536251;

    .form-status-btn__text {
      color: #444842;
      font-weight: 500;
    }
  }
}

.safe-bottom {
  height: 40rpx;
}

/* 保存按钮（流内） */
.bottom-action {
  padding: 40rpx 48rpx 48rpx;
}

.save-btn {
  width: 100%;
  height: 104rpx;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #536251;

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 32rpx;
    font-weight: 400;
    color: #fff;
  }

  &--disabled {
    background: #E3E2E0;

    .save-btn__text {
      color: #A69B8D;
    }
  }
}
</style>
