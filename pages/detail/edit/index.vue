<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon" src="/static/icons/detail-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/detail-topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">编辑信息</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">

      <!-- Hero 图片区 -->
      <view class="hero-section" @tap="onChooseImage">
        <view class="hero-img-wrap">
          <image
            class="hero-img"
            :src="item.displayImageUrl || item.imageUrl"
            mode="aspectFit"
            :style="{ transform: `rotate(${item.rotation}deg)` }"
          />
        </view>
      </view>

      <!-- 图片操作区 -->
      <view class="img-actions">
        <view class="img-action-btn" @tap="onReprocess">
          <text class="img-action-btn__text">重新整理图片</text>
        </view>
        <view class="img-action-btn" @tap="onUseOriginal">
          <text class="img-action-btn__text">使用原图</text>
        </view>
      </view>

      <!-- 名称 (点击切换 input) -->
      <view class="info-header" @tap="nameFocused = true">
        <text
          v-if="!nameFocused"
          class="info-header__name"
        >{{ item.name || '请输入物品名称' }}</text>
        <input
          v-else
          class="info-header__name-input"
          v-model="item.name"
          :focus="true"
          placeholder="请输入物品名称"
          @blur="nameFocused = false"
          style="font-family: 'Noto Serif SC', serif; font-weight: 700;"
        />
      </view>

      <!-- 三列关键信息 -->
      <view class="meta-row">
        <view class="meta-col" @tap="onPickCategory">
          <text class="meta-col__label">分类</text>
          <view class="meta-col__value-row">
            <text class="meta-col__value">{{ item.categoryLabel }}</text>
            <image class="arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
          </view>
        </view>
        <view class="meta-col" @tap="onPickStatus">
          <text class="meta-col__label">状态</text>
          <view class="meta-col__value-row">
            <text class="meta-col__value">{{ item.statusLabel }}</text>
            <image class="arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
          </view>
        </view>
        <view class="meta-col">
          <text class="meta-col__label">剩余时间</text>
          <text class="meta-col__value meta-col__value--warn">还有 {{ item.daysLeft }} 天</text>
        </view>
      </view>

      <!-- 日期信息卡片 -->
      <view class="date-card">
        <picker mode="date" @change="onProduceDateChange">
          <view class="date-card__row">
            <text class="date-card__label">生产日期</text>
            <view class="date-card__value-row">
              <text class="date-card__value">{{ item.produceDateLabel }}</text>
              <image class="arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
            </view>
          </view>
        </picker>
        <view class="date-card__divider" />
        <view class="date-card__row">
          <text class="date-card__label">保质期</text>
          <view class="date-card__value-row">
            <view class="shelf-input-wrap" @tap="shelfFocused = true">
              <text
                v-if="!shelfFocused"
                class="shelf-input-text"
              >{{ item.shelfLife }}</text>
              <input
                v-else
                class="shelf-input"
                type="number"
                v-model="item.shelfLife"
                :focus="true"
                @blur="shelfFocused = false"
              />
            </view>
            <view class="unit-select" @tap="onPickUnit">
              <text class="date-card__value">{{ item.shelfUnit }}</text>
              <image class="arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
            </view>
          </view>
        </view>
        <view class="date-card__divider" />
        <view class="date-card__row">
          <text class="date-card__label">到期日</text>
          <text class="date-card__value" style="color: #A69B8D">{{ computedExpireDateLabel }}</text>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <view class="bottom-actions__inner">
        <view class="action-btn-save" @tap="onSave">
          <text class="action-btn-save__text">保存修改</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface ItemDetail {
  id: string
  name: string
  category: string
  categoryLabel: string
  imageUrl: string
  displayImageUrl?: string
  rotation: number
  status: string
  statusLabel: string
  daysLeft: number
  shelfLife: string
  shelfUnit: string
  produceDate: string
  produceDateLabel: string
  expireDate: string
  expireDateLabel: string
}

const item = ref<ItemDetail>({
  id: '1',
  name: '牛奶',
  category: 'food',
  categoryLabel: '食品',
  imageUrl: '/static/icons/detail-milkbox.svg',
  displayImageUrl: '',
  rotation: -1.5,
  status: 'pending',
  statusLabel: '待取用',
  daysLeft: 2,
  shelfLife: '7',
  shelfUnit: '天',
  produceDate: '2026-06-20',
  produceDateLabel: '2026年06月20日',
  expireDate: '2026-06-27',
  expireDateLabel: '2026年06月27日',
})

const nameFocused = ref(false)
const shelfFocused = ref(false)
const computedExpireDateLabel = computed(() => {
  if (!item.value.produceDate || !item.value.shelfLife) return ''
  const produce = new Date(item.value.produceDate)
  const days = parseInt(item.value.shelfLife)
  if (isNaN(days)) return ''
  const unitMap: Record<string, number> = { 天: 1, 月: 30, 年: 365 }
  const multiplier = unitMap[item.value.shelfUnit] || 1
  produce.setDate(produce.getDate() + days * multiplier)
  const y = produce.getFullYear()
  const m = String(produce.getMonth() + 1).padStart(2, '0')
  const d = String(produce.getDate()).padStart(2, '0')
  return `${y}年${m}月${d}日`
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options
  if (options?.id) {
    // 实际项目中根据 id 从云数据库加载数据
  }
})

function onBack() {
  uni.navigateBack()
}

function onChooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success(res) {
      item.value.imageUrl = res.tempFilePaths[0]
      item.value.displayImageUrl = '' // clear display image if uploaded new
      item.value.rotation = 0
    },
  })
}

function onPickCategory() {
  uni.showActionSheet({
    itemList: ['食品', '药品', '美妆', '日化', '母婴'],
    success(res) {
      const map = ['食品', '药品', '美妆', '日化', '母婴']
      const keyMap = ['food', 'medicine', 'beauty', 'daily', 'baby']
      item.value.categoryLabel = map[res.tapIndex]
      item.value.category = keyMap[res.tapIndex]
    },
  })
}

function onPickStatus() {
  uni.showActionSheet({
    itemList: ['待取用', '使用中', '已用完'],
    success(res) {
      const map = ['待取用', '使用中', '已用完']
      const keyMap = ['pending', 'using', 'done']
      item.value.statusLabel = map[res.tapIndex]
      item.value.status = keyMap[res.tapIndex]
    },
  })
}

function onProduceDateChange(e: any) {
  const dateStr = e.detail.value
  item.value.produceDate = dateStr
  const [y, m, d] = dateStr.split('-')
  item.value.produceDateLabel = `${y}年${m}月${d}日`
}

function onPickUnit() {
  uni.showActionSheet({
    itemList: ['天', '月', '年'],
    success(res) {
      item.value.shelfUnit = ['天', '月', '年'][res.tapIndex]
    },
  })
}

function onReprocess() {
  uni.showToast({ title: '开始智能抠图...', icon: 'none' })
  setTimeout(() => {
    item.value.rotation = (Math.random() * 4 - 2)
  }, 1000)
}

function onUseOriginal() {
  item.value.rotation = 0
}

function onSave() {
  uni.showToast({ title: '修改已保存', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 800)
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
$radius-card: 32rpx;
$radius-full: 9999rpx;
$bottom-action-height: 160rpx;

/* 统一字体格式为思源宋体 */
view, text, button, input {
  font-family: 'Noto Serif SC', serif;
}

.page {
  width: 100%;
  height: 100vh;
  background: $color-bg;
  display: flex;
  flex-direction: column;
}

/* 顶部 */
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
  box-shadow: 0 16rpx 48rpx rgba(51, 54, 52, 0.1);

  &__back {
    width: 88rpx;
    height: 88rpx;
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
  margin-top: calc(120rpx + var(--status-bar-height, 44rpx));
  margin-bottom: $bottom-action-height;
  height: calc(100vh - 120rpx - var(--status-bar-height, 44rpx) - $bottom-action-height);
}

/* Hero 区 */
.hero-section {
  background: #FCEAD5;
  margin: 32rpx 48rpx 0;
  border-radius: $radius-card;
  padding: 40rpx 0;
  position: relative;
}

.hero-img-wrap {
  width: 100%;
  height: 400rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-img {
  width: 60%;
  height: 100%;
}

.img-actions {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 24rpx;
  width: 100%;
  margin-top: 32rpx;
}

.img-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 40rpx;
  background: rgba(51, 54, 52, 0.08);
  border-radius: $radius-full;

  &__text {
    font-size: 26rpx;
    color: $color-text;
  }
}

/* 名称 */
.info-header {
  padding: 40rpx 48rpx 0;
  box-sizing: border-box;

  &__name {
    font-family: 'Noto Serif SC', serif;
    font-size: 48rpx;
    font-weight: 700;
    color: $color-text;
    line-height: 1.2;
  }

  &__name-input {
    font-size: 48rpx;
    color: $color-text;
    height: 60rpx;
    line-height: 1.2;
    background: transparent;
  }
}

/* 三列 meta */
.meta-row {
  display: flex;
  flex-direction: row;
  padding: 32rpx 48rpx;
  gap: 0;
}

.meta-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;

  &__label {
    font-size: 24rpx;
    color: $color-text-secondary;
  }

  &__value-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  &__value {
    font-family: 'Noto Serif SC', serif;
    font-size: 30rpx;
    font-weight: 700;
    color: $color-text;

    &--warn {
      color: #8E4D33;
    }
  }
}

.arrow-icon {
  width: 24rpx;
  height: 24rpx;
  opacity: 0.6;
}

.shelf-input-wrap {
  min-width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.shelf-input-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 30rpx;
  font-weight: 700;
  color: $color-text;
}

.shelf-input {
  width: 80rpx;
  text-align: right;
  font-size: 30rpx;
  color: $color-text;
}

.unit-select {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

/* 日期卡 */
.date-card {
  margin: 0 48rpx 40rpx;
  background: $color-bg-light;
  border-radius: 24rpx;
  padding: 0 32rpx;

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88rpx;
  }

  &__label {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__value-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__value {
    font-size: 30rpx;
    color: $color-text;
  }

  &__divider {
    height: 2rpx;
    background: $color-line;
  }
}

.safe-bottom {
  height: 40rpx;
}

/* 底部操作 */
.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: $bottom-action-height;
  background: rgba(250, 249, 247, 0.92);
  border-top: 2rpx solid $color-line;
  backdrop-filter: blur(12rpx);

  &__inner {
    display: flex;
    align-items: center;
    padding: 16rpx 48rpx 40rpx;
    height: 100%;
    box-sizing: border-box;
  }
}

.action-btn-save {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-full;
  background: $color-primary-dark;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(83, 98, 81, 0.3);

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 30rpx;
    font-weight: 700;
    color: #fff;
  }
}
</style>
