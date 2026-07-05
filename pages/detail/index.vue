<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <text class="top-bar__back-icon">‹</text>
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">物品详情</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">

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

        <!-- 图片操作 -->
        <view class="hero-actions">
          <view class="hero-action-btn" @tap="onReprocess">
            <text class="hero-action-btn__text">重新整理图片</text>
          </view>
          <view class="hero-action-btn" @tap="onUseOriginal">
            <text class="hero-action-btn__text">使用原图</text>
          </view>
          <view class="hero-action-btn" @tap="onEdit">
            <text class="hero-action-btn__text">编辑</text>
          </view>
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
          <text class="meta-col__value">{{ item.statusLabel }}</text>
        </view>
        <view class="meta-col">
          <text class="meta-col__label">剩余时间</text>
          <text class="meta-col__value meta-col__value--warn">还有 {{ item.daysLeft }} 天</text>
        </view>
      </view>

      <!-- 日期信息卡片 -->
      <view class="date-card">
        <view class="date-card__row">
          <text class="date-card__label">生产日期</text>
          <text class="date-card__value">{{ item.produceDateLabel }}</text>
        </view>
        <view class="date-card__divider" />
        <view class="date-card__row">
          <text class="date-card__label">到期日</text>
          <text class="date-card__value">{{ item.expireDateLabel }}</text>
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
    <view class="bottom-actions">
      <view class="bottom-actions__inner">
        <view class="action-delete" @tap="onDelete">
          <image class="action-delete__icon-img" src="/static/icons/shanchu.svg" mode="aspectFit" />
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
import { ref, onMounted } from 'vue'

interface TimelineEvent {
  id: string
  date: string
  desc: string
}

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
  produceDate: string
  produceDateLabel: string
  expireDate: string
  expireDateLabel: string
  timeline: TimelineEvent[]
}

const item = ref<ItemDetail>({
  id: '1',
  name: '牛奶',
  category: 'food',
  categoryLabel: '食品',
  imageUrl: '/static/placeholder-milk.png',
  displayImageUrl: '',
  rotation: -1.5,
  status: 'pending',
  statusLabel: '待取用',
  daysLeft: 2,
  produceDate: '2026-06-20',
  produceDateLabel: '2026年06月20日',
  expireDate: '2026-06-27',
  expireDateLabel: '2026年06月27日',
  timeline: [
    { id: '1', date: '06-25', desc: '小管家提醒' },
    { id: '2', date: '06-23', desc: '收纳' },
    { id: '3', date: '06-20', desc: '录入' },
  ],
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

function onReprocess() {
  // 重新整理图片
}

function onUseOriginal() {
  item.value.rotation = 0
}

function onEdit() {
  uni.navigateTo({ url: `/pages/add/index?mode=edit&id=${item.value.id}` })
}

function onMarkUsed() {
  uni.showModal({
    title: '确认已用完？',
    content: '小管家会将此物品标记为已完成使命～',
    confirmText: '确认',
    cancelText: '取消',
    success(res) {
      if (res.confirm) {
        item.value.status = 'done'
        item.value.statusLabel = '已用完'
        uni.showToast({ title: '已记录，好物完成使命！', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 1200)
      }
    },
  })
}

function onDelete() {
  uni.showModal({
    title: '确认删除？',
    content: '删除后无法恢复，请确认。',
    confirmText: '删除',
    confirmColor: '#D98A6C',
    cancelText: '取消',
    success(res) {
      if (res.confirm) {
        uni.showToast({ title: '已删除', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 800)
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
  margin-top: 120rpx;
  margin-bottom: $bottom-action-height;
  height: calc(100vh - 120rpx - $bottom-action-height);
}

/* Hero 区 */
.hero-section {
  background: rgba(231, 225, 216, 0.35);
  padding: 32rpx 48rpx 0;
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
      color: $color-warn;
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
}

/* 时间轴 */
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
    display: block;
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
    opacity: 0.6;
  }

  &__text {
    font-size: 22rpx;
    color: $color-expired;
  }
}

.action-btn-outline {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-full;
  border: 2rpx solid $color-line;
  display: flex;
  align-items: center;
  justify-content: center;

  &__text {
    font-size: 30rpx;
    color: $color-text;
  }
}

.action-btn-primary {
  flex: 2;
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
