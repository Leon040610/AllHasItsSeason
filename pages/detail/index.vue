<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon" src="/static/icons/detail-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/detail-topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">物品详情</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view v-if="item" class="scroll-body" scroll-y enhanced :show-scrollbar="false">

      <!-- Hero 图片区 -->
      <view class="hero-section">
        <view class="hero-img-wrap">
          <image
            class="hero-img"
            :src="item.displayImageUrl || item.imageUrl"
            mode="aspectFit"
            :style="{ transform: `rotate(${item.rotation}deg)` }"
          />
        </view>
      </view>

      <!-- 名称 -->
      <view class="info-header">
        <text class="info-header__name">{{ item.name }}</text>
      </view>

      <!-- 三列关键信息 -->
      <view class="meta-row">
        <view class="meta-col">
          <text class="meta-col__label">分类</text>
          <text class="meta-col__value">{{ item.categoryLabel }}</text>
        </view>
        <view class="meta-col">
          <text class="meta-col__label">状态</text>
          <text class="meta-col__value">{{ pureStatusLabel }}</text>
        </view>
        <view class="meta-col">
          <text class="meta-col__label">剩余时间</text>
          <text class="meta-col__value" :class="item.displayStatus === 'expired' ? 'meta-col__value--expired' : 'meta-col__value--warn'">
            {{ item.statusLabel }}
          </text>
        </view>
      </view>

      <!-- 日期信息卡片 -->
      <view class="date-card">
        <!-- 普通效期 -->
        <block v-if="item.expiryMode === 'normal'">
          <view class="date-card__row">
            <text class="date-card__label">生产日期</text>
            <text class="date-card__value">{{ item.produceDateLabel || '-' }}</text>
          </view>
          <view class="date-card__divider" />
          <view class="date-card__row">
            <text class="date-card__label">保质期</text>
            <text class="date-card__value">{{ item.shelfLife ? (item.shelfLife + item.shelfUnit) : '-' }}</text>
          </view>
          <view class="date-card__divider" />
          <view class="date-card__row">
            <text class="date-card__label">包装到期日</text>
            <text class="date-card__value">{{ item.expireDateLabel || '-' }}</text>
          </view>
        </block>

        <!-- 开封后效期 -->
        <block v-if="item.expiryMode === 'after_opening'">
          <view class="date-card__row">
            <text class="date-card__label">开封日期</text>
            <text class="date-card__value">{{ item.openDateLabel || '-' }}</text>
          </view>
          <view class="date-card__divider" />
          <view class="date-card__row">
            <text class="date-card__label">开封后保质期</text>
            <text class="date-card__value">{{ item.afterOpeningShelfLife ? (item.afterOpeningShelfLife + item.afterOpeningShelfUnit) : '-' }}</text>
          </view>
          <view class="date-card__divider" />
          <view class="date-card__row">
            <text class="date-card__label">开封后到期日</text>
            <text class="date-card__value">{{ item.openedExpiryDateLabel || '-' }}</text>
          </view>
        </block>

        <!-- 双效期 -->
        <block v-if="item.expiryMode === 'dual'">
          <view class="date-card__row">
            <text class="date-card__label">包装到期日</text>
            <text class="date-card__value">{{ item.expireDateLabel || '-' }}</text>
          </view>
          <view class="date-card__divider" />
          <block v-if="item.status === 'pending' || !item.openDate">
            <view class="date-card__row date-card__row--tip">
              <text class="date-card__tip">转为使用中可补充开封后效期</text>
            </view>
          </block>
          <block v-else>
            <view class="date-card__row">
              <text class="date-card__label">开封日期</text>
              <text class="date-card__value">{{ item.openDateLabel || '-' }}</text>
            </view>
            <view class="date-card__divider" />
            <view class="date-card__row">
              <text class="date-card__label">开封后到期日</text>
              <text class="date-card__value">{{ item.openedExpiryDateLabel || '-' }}</text>
            </view>
            <view class="date-card__divider" />
            <view class="date-card__row date-card__row--highlight">
              <text class="date-card__label">当前提醒</text>
              <text class="date-card__value">{{ item.activeExpiryDateLabel }} <text style="font-size: 24rpx; color: #8A9A86">({{ item.activeExpirySourceLabel }})</text></text>
            </view>
          </block>
        </block>

        <!-- 缺失信息提示 -->
        <view v-if="item.displayStatus === 'incomplete'" class="date-card__incomplete-tip">
          <!-- We can use a simple icon or just text. We use text and warn color -->
          <text class="incomplete-tip__text">小管家发现信息有点不全哦，可以点击底部编辑补充～</text>
        </view>
      </view>

      <!-- 历史动态 -->
      <view class="timeline-section">
        <text class="timeline-section__title">历史动态</text>
        <view class="timeline">
          <view
            v-for="(event, index) in item.timeline"
            :key="event.id"
            class="timeline-item"
          >
            <view class="timeline-item__left">
              <view
                class="timeline-item__dot"
                :class="index === 0 ? 'timeline-item__dot--active' : ''"
              />
              <view v-if="index < item.timeline.length - 1" class="timeline-item__line" />
            </view>
            <view class="timeline-item__content">
              <text class="timeline-item__date">{{ event.date }}</text>
              <text class="timeline-item__desc">{{ event.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="item" class="bottom-actions">
      <view class="bottom-actions__inner">
        <view class="action-delete" @tap="onDelete">
          <image class="action-delete__icon-img" src="/static/icons/detail-shanchu.svg" mode="aspectFit" />
          <text class="action-delete__text">删除</text>
        </view>
        <view class="action-btn-outline" @tap="onMarkUsed">
          <text class="action-btn-outline__text">已用完</text>
        </view>
        <view class="action-btn-primary" @tap="onEdit">
          <text class="action-btn-primary__text">编辑信息</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { itemService } from '../../services/itemService.js'

const item = ref<any>(null)
let currentId = ''

const pureStatusLabel = computed(() => {
  if (!item.value) return ''
  let label = item.value.statusLabel
  if (label.includes('使用中')) return '使用中'
  if (label.includes('已用完')) return '已用完'
  if (label.includes('已删除')) return '已删除'
  if (label.includes('已过期')) return '已过期'
  if (label.includes('还有')) return '待取用'
  return label
})

onLoad((options: any) => {
  if (options && options.id) {
    currentId = options.id
  }
})

onShow(() => {
  if (currentId) {
    loadItem()
  } else {
    showFallback()
  }
})

function loadItem() {
  const found = itemService.getViewItemById(currentId)
  if (found) {
    item.value = found
  } else {
    showFallback()
  }
}

function showFallback() {
  uni.showToast({ title: '物品不存在或已被删除', icon: 'none' })
  setTimeout(() => uni.navigateBack(), 1200)
}

function onBack() {
  uni.navigateBack()
}

function onEdit() {
  if (item.value) {
    uni.navigateTo({ url: `/pages/detail/edit/index?id=${item.value.id}` })
  }
}

function onMarkUsed() {
  if (!item.value) return
  uni.showModal({
    title: '确认已用完？',
    content: '小管家会将此物品标记为已完成使命～',
    confirmText: '确认',
    cancelText: '取消',
    success(res) {
      if (res.confirm) {
        const success = itemService.markItemDone(item.value.id)
        if (success) {
          uni.showToast({ title: '已记录，好物完成使命！', icon: 'none' })
          setTimeout(() => loadItem(), 1200)
        } else {
          uni.showToast({ title: '更新失败', icon: 'none' })
        }
      }
    },
  })
}

function onDelete() {
  if (!item.value) return
  uni.showModal({
    title: '确认删除？',
    content: '删除后无法恢复，请确认。',
    confirmText: '删除',
    confirmColor: '#D98A6C',
    cancelText: '取消',
    success(res) {
      if (res.confirm) {
        const success = itemService.softDeleteItem(item.value.id)
        if (success) {
          uni.showToast({ title: '已删除', icon: 'none' })
          setTimeout(() => uni.navigateBack(), 800)
        } else {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
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
$color-line: rgba(51, 54, 52, 0.1);
$shadow-card: 0 8rpx 48rpx rgba(51, 54, 52, 0.08);
$radius-card: 32rpx;
$radius-full: 9999rpx;
$bottom-action-height: 160rpx;

/* 统一字体格式为思源宋体 */
view, text, button {
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

.hero-actions {
  display: flex;
  flex-direction: row;
  gap: 20rpx;
  padding: 24rpx 0;
}

.hero-action-btn {
  flex: 1;
  height: 72rpx;
  background: $color-card;
  border-radius: $radius-full;
  border: 2rpx solid $color-line;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);

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

  &__value {
    font-size: 30rpx;
    color: $color-text;
  }

  &__divider {
    height: 2rpx;
    background: $color-line;
  }
  
  &__row--tip {
    justify-content: center;
  }
  
  &__tip {
    font-size: 24rpx;
    color: $color-warn;
  }
  
  &__row--highlight {
    background: rgba(138, 154, 134, 0.06);
    margin: 0 -32rpx;
    padding: 0 32rpx;
    border-bottom-left-radius: 24rpx;
    border-bottom-right-radius: 24rpx;
  }
  
  &__incomplete-tip {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24rpx 0 16rpx;
    margin-top: 16rpx;
    border-top: 2rpx dashed rgba(217, 138, 108, 0.2);
  }
}

.incomplete-tip__text {
  font-size: 24rpx;
  color: $color-warn;
}

/* 历史动态 */
.timeline-section {
  padding: 0 48rpx;

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 36rpx;
    font-weight: 700;
    color: $color-text;
    display: block;
    margin-bottom: 32rpx;
  }
}

.timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  flex-direction: row;
  gap: 24rpx;
  min-height: 120rpx;

  &__left {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 24rpx;
    flex-shrink: 0;
    padding-top: 8rpx;
  }

  &__dot {
    width: 20rpx;
    height: 20rpx;
    border-radius: $radius-full;
    background: $color-expired;
    flex-shrink: 0;

    &--active {
      background: $color-primary-dark;
      width: 24rpx;
      height: 24rpx;
    }
  }

  &__line {
    flex: 1;
    width: 2rpx;
    background: $color-line;
    margin-top: 8rpx;
  }

  &__content {
    flex: 1;
    padding-bottom: 32rpx;
  }

  &__date {
    font-size: 28rpx;
    color: $color-text-secondary;
    display: block;
    margin-bottom: 8rpx;
  }

  &__desc {
    font-size: 30rpx;
    color: $color-text;
    display: inline-block;
    background: #F4F3F1;
    border-radius: 16rpx;
    padding: 4rpx 16rpx;
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
    padding: 16rpx 64rpx 40rpx;
    gap: 24rpx;
    height: 100%;
    box-sizing: border-box;
  }
}

.action-delete {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  width: 80rpx;

  &__icon-img {
    width: 44rpx;
    height: 44rpx;
    opacity: 1;
  }

  &__text {
    font-size: 22rpx;
    color: #747871;
  }
}

.action-btn-outline {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-full;
  border: 2rpx solid #536251;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 30rpx;
    font-weight: 700;
    color: #536251;
  }
}

.action-btn-primary {
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
