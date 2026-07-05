<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="top-bar">
      <view class="top-bar__brand">
        <image class="top-bar__icon" src="/static/icons/topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">万物有期</text>
      </view>
    </view>

    <!-- 滚动主体 -->
    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">

      <!-- 问候区 -->
      <view class="greeting-section">
        <text class="greeting-section__title">早上好，今天也从容一点</text>
        <view class="greeting-section__badge">
          <text class="badge-warn">{{ nearExpireCount }} 件</text>
          <text class="badge-text"> 好物快到期 · </text>
          <text class="badge-expired">{{ expiredCount }} 件</text>
          <text class="badge-text"> 已过期</text>
        </view>
      </view>

      <!-- 快速录入区 -->
      <view class="quick-add-section">
        <view class="quick-add-card" @tap="onPhotoScan">
          <view class="quick-add-card__icon-wrap" style="background:#8A9A86;">
            <image class="quick-add-card__icon-img" src="/static/icons/paizhao.svg" mode="aspectFit" />
          </view>
          <text class="quick-add-card__label">拍照识别</text>
        </view>
        <view class="quick-add-card" @tap="onScanCode">
          <view class="quick-add-card__icon-wrap" style="background:#A69B8D;">
            <image class="quick-add-card__icon-img" src="/static/icons/saoma.svg" mode="aspectFit" />
          </view>
          <text class="quick-add-card__label">扫码录入</text>
        </view>
        <view class="quick-add-card" @tap="onManualAdd">
          <view class="quick-add-card__icon-wrap" style="background:#D98A6C;">
            <image class="quick-add-card__icon-img" src="/static/icons/shoudong.svg" mode="aspectFit" />
          </view>
          <text class="quick-add-card__label">手动添加</text>
        </view>
      </view>

      <!-- 今日关注 -->
      <view class="section">
        <view class="section__header">
          <text class="section__title">今日关注</text>
          <view class="section__more" @tap="onViewAll">
            <text class="section__more-text">全部</text>
            <text class="section__more-arrow">›</text>
          </view>
        </view>
        <scroll-view class="focus-scroll" scroll-x enhanced :show-scrollbar="false">
          <view class="focus-list">
            <view
              v-for="item in focusItems"
              :key="item.id"
              class="focus-card"
              @tap="onItemTap(item)"
            >
              <view class="focus-card__img-wrap">
                <image
                  class="focus-card__img"
                  :src="item.displayImageUrl || item.imageUrl"
                  mode="aspectFill"
                  :style="{ transform: `rotate(${item.rotation}deg)` }"
                />
                <view
                  class="focus-card__badge"
                  :class="item.status === 'using' ? 'focus-card__badge--using' : 'focus-card__badge--warn'"
                >
                  <text v-if="item.status === 'using'" class="focus-card__badge-dot">•</text>
                  <text class="focus-card__badge-text">
                    {{ item.status === 'using' ? '使用中·' : '' }}还有 {{ item.daysLeft }} 天
                  </text>
                </view>
              </view>
              <text class="focus-card__name">{{ item.name }}</text>
              <text class="focus-card__category">{{ item.category }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 分类概览 -->
      <view class="section">
        <text class="section__title">分类概览</text>
        <view class="category-grid">
          <view
            v-for="cat in categories"
            :key="cat.key"
            class="category-card"
            @tap="onCategoryTap(cat)"
          >
            <view class="category-card__left">
              <image class="category-card__icon-img" :src="cat.icon" mode="aspectFit" />
              <text class="category-card__name">{{ cat.name }}</text>
            </view>
            <text class="category-card__count">{{ cat.count }}</text>
          </view>
        </view>
      </view>

      <!-- 底部安全区占位 -->
      <view class="safe-bottom" />
    </scroll-view>

    <!-- 悬浮添加按钮 -->
    <view class="fab" @tap="onManualAdd">
      <image class="fab__icon-img" src="/static/icons/add.svg" mode="aspectFit" />
    </view>

    <!-- 底部导航栏 -->
    <view class="tab-bar">
      <view class="tab-bar__item tab-bar__item--active" @tap="onTabTap('index')">
        <view class="tab-bar__active-bg">
          <image class="tab-bar__icon-img tab-bar__icon-img--active" src="/static/icons/shouye-dianji.svg" mode="aspectFit" />
        </view>
        <text class="tab-bar__label tab-bar__label--active">首页</text>
      </view>
      <view class="tab-bar__item" @tap="onTabTap('library')">
        <image class="tab-bar__icon-img" src="/static/icons/wupinku.svg" mode="aspectFit" />
        <text class="tab-bar__label">物品库</text>
      </view>
      <view class="tab-bar__item" @tap="onTabTap('tools')">
        <image class="tab-bar__icon-img" src="/static/icons/gongju.svg" mode="aspectFit" />
        <text class="tab-bar__label">工具</text>
      </view>
      <view class="tab-bar__item" @tap="onTabTap('me')">
        <image class="tab-bar__icon-img" src="/static/icons/wode.svg" mode="aspectFit" />
        <text class="tab-bar__label">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Item {
  id: string
  name: string
  category: string
  imageUrl: string
  displayImageUrl?: string
  status: 'pending' | 'using' | 'near_expire' | 'expired'
  daysLeft: number
  rotation: number
  expireDate: string
  produceDate: string
}

interface Category {
  key: string
  name: string
  icon: string
  count: number
}

const focusItems = ref<Item[]>([
  {
    id: '1',
    name: '鲜牛奶',
    category: '食品',
    imageUrl: '/static/icons/milk.svg',
    displayImageUrl: '',
    status: 'near_expire',
    daysLeft: 2,
    rotation: -1.5,
    expireDate: '2026-07-07',
    produceDate: '2026-06-30',
  },
  {
    id: '2',
    name: '保湿面霜',
    category: '美妆',
    imageUrl: '/static/icons/cream.svg',
    displayImageUrl: '',
    status: 'using',
    daysLeft: 6,
    rotation: 1.2,
    expireDate: '2026-07-11',
    produceDate: '2024-01-01',
  },
])

const categories = ref<Category[]>([
  { key: 'food', name: '食品', icon: '/static/icons/shipin.svg', count: 12 },
  { key: 'medicine', name: '药品', icon: '/static/icons/yaopin.svg', count: 5 },
  { key: 'beauty', name: '美妆', icon: '/static/icons/meizhuang.svg', count: 8 },
  { key: 'daily', name: '日化', icon: '/static/icons/rihua.svg', count: 3 },
])

const nearExpireCount = computed(() =>
  focusItems.value.filter(i => i.status === 'near_expire' || i.status === 'using').length
)
const expiredCount = computed(() =>
  focusItems.value.filter(i => i.status === 'expired').length
)

function onPhotoScan() {
  uni.navigateTo({ url: '/pages/add/index?mode=photo' })
}

function onScanCode() {
  uni.navigateTo({ url: '/pages/add/index?mode=scan' })
}

function onManualAdd() {
  uni.navigateTo({ url: '/pages/add/index?mode=manual' })
}

function onViewAll() {
  uni.switchTab({ url: '/pages/library/index' })
}

function onItemTap(item: Item) {
  uni.navigateTo({ url: `/pages/detail/index?id=${item.id}` })
}

function onCategoryTap(cat: Category) {
  uni.switchTab({ url: '/pages/library/index' })
}

function onTabTap(tab: string) {
  const tabMap: Record<string, string> = {
    index: '/pages/index/index',
    library: '/pages/library/index',
    tools: '/pages/tools/index',
    me: '/pages/me/index',
  }
  uni.switchTab({ url: tabMap[tab] })
}

onMounted(() => {
  // 实际项目中此处从云数据库加载数据
})
</script>

<style lang="scss" scoped>
$color-bg: #F9F8F6;
$color-bg-alt: #E8EDE7;
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
  min-height: 100vh;
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
  height: $top-height;
  padding-top: var(--status-bar-height, 44rpx);
  background: #FAF9F7;
  display: flex;
  align-items: center;
  padding-left: 48rpx;
  border-bottom: 2rpx solid $color-line;

  &__brand {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  &__icon {
    width: 40rpx;
    height: 40rpx;
  }

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 40rpx;
    font-weight: 700;
    color: $color-primary-dark;
    letter-spacing: 0;
  }
}

/* 滚动体 */
.scroll-body {
  flex: 1;
  padding-top: $top-height;
  padding-bottom: $tab-height;
  height: 100vh;
  box-sizing: border-box;
}

/* 问候区 */
.greeting-section {
  padding: 48rpx 48rpx 0;

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 48rpx;
    font-weight: 700;
    color: $color-text;
    line-height: 64rpx;
    display: block;
    margin-bottom: 20rpx;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    background: rgba(231, 225, 216, 0.5);
    border-radius: $radius-full;
    padding: 10rpx 24rpx;
  }
}

.badge-warn {
  font-size: 28rpx;
  font-weight: 700;
  color: $color-warn;
}

.badge-expired {
  font-size: 28rpx;
  font-weight: 700;
  color: $color-expired;
}

.badge-text {
  font-size: 28rpx;
  color: $color-text-secondary;
}

/* 快速录入 */
.quick-add-section {
  display: flex;
  flex-direction: row;
  gap: 24rpx;
  padding: 48rpx 48rpx 0;
}

.quick-add-card {
  flex: 1;
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  padding: 40rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;

  &__icon-wrap {
    width: 96rpx;
    height: 96rpx;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__icon-img {
    width: 44rpx;
    height: 44rpx;
  }

  &__label {
    font-size: 26rpx;
    color: $color-text;
    text-align: center;
  }
}

/* 通用 section */
.section {
  padding: 48rpx 48rpx 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24rpx;
  }

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 40rpx;
    font-weight: 700;
    color: $color-text;
    display: block;
    margin-bottom: 24rpx;
  }

  &__more {
    display: flex;
    align-items: center;
    gap: 4rpx;
  }

  &__more-text {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__more-arrow {
    font-size: 32rpx;
    color: $color-text-secondary;
  }
}

/* 今日关注横滚 */
.focus-scroll {
  margin: 0 -48rpx;
  padding: 0 48rpx;
  white-space: nowrap;
}

.focus-list {
  display: flex;
  flex-direction: row;
  gap: 24rpx;
  padding-right: 48rpx;
}

.focus-card {
  width: 280rpx;
  flex-shrink: 0;
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  overflow: hidden;
  padding-bottom: 24rpx;

  &__img-wrap {
    width: 100%;
    height: 260rpx;
    background: $color-bg;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  &__img {
    width: 80%;
    height: 80%;
    object-fit: contain;
  }

  &__badge {
    position: absolute;
    top: 20rpx;
    right: 16rpx;
    border-radius: $radius-full;
    padding: 8rpx 20rpx;
    display: flex;
    align-items: center;

    &--warn {
      background: $color-warn;
    }

    &--using {
      background: $color-primary-dark;
    }
  }

  &__badge-dot {
    font-size: 20rpx;
    color: #fff;
    margin-right: 4rpx;
  }

  &__badge-text {
    font-size: 24rpx;
    color: #fff;
    white-space: nowrap;
  }

  &__name {
    font-family: 'Noto Serif SC', serif;
    font-size: 32rpx;
    font-weight: 700;
    color: $color-text;
    display: block;
    padding: 20rpx 24rpx 8rpx;
  }

  &__category {
    font-size: 24rpx;
    color: $color-text-secondary;
    display: block;
    padding: 0 24rpx;
  }
}

/* 分类网格 */
.category-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}

.category-card {
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  padding: 32rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &__left {
    display: flex;
    align-items: center;
    gap: 20rpx;
  }

  &__icon-img {
    width: 48rpx;
    height: 48rpx;
  }

  &__name {
    font-size: 30rpx;
    color: $color-text;
  }

  &__count {
    font-family: 'Noto Serif SC', serif;
    font-size: 48rpx;
    font-weight: 400;
    color: $color-text;
  }
}

/* 安全区 */
.safe-bottom {
  height: 40rpx;
}

/* FAB */
.fab {
  position: fixed;
  right: 48rpx;
  bottom: calc($tab-height + 32rpx);
  width: 112rpx;
  height: 112rpx;
  border-radius: $radius-full;
  background: $color-primary-dark;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 48rpx rgba(83, 98, 81, 0.35);
  z-index: 50;

  &__icon-img {
    width: 48rpx;
    height: 48rpx;
  }
}

/* 底部 TabBar */
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

    &--active {
      color: $color-primary-dark;
    }
  }

  &__icon-img {
    width: 48rpx;
    height: 48rpx;
    opacity: 0.8;
  }
  
  &__icon-img--active {
    width: 48rpx;
    height: 48rpx;
    opacity: 1;
  }

  &__label {
    font-size: 22rpx;
  }
}
</style>
