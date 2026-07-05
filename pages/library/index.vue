<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__brand">
        <image class="top-bar__icon" src="/static/icons/topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">物品库</text>
      </view>
    </view>

    <view class="scroll-wrap" :style="{ paddingTop: topHeight + 'rpx' }">
      <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">

        <!-- 搜索栏 -->
        <view class="search-bar" @tap="onSearchFocus">
          <image class="search-bar__icon-img" src="/static/icons/sousuo.svg" mode="aspectFit" />
          <text class="search-bar__placeholder" v-if="!searchKeyword">搜索物品名称</text>
          <text class="search-bar__text" v-else>{{ searchKeyword }}</text>
        </view>

        <!-- 分类筛选 -->
        <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false">
          <view class="filter-row">
            <view
              v-for="cat in categoryFilters"
              :key="cat.key"
              class="filter-chip"
              :class="{ 'filter-chip--active': activeCategoryKey === cat.key }"
              @tap="onCategoryFilter(cat.key)"
            >
              <text class="filter-chip__text">{{ cat.label }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- 状态筛选 -->
        <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false">
          <view class="filter-row">
            <view
              v-for="st in statusFilters"
              :key="st.key"
              class="filter-chip filter-chip--status"
              :class="{ 'filter-chip--status-active': activeStatusKey === st.key }"
              @tap="onStatusFilter(st.key)"
            >
              <text class="filter-chip__text">{{ st.label }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- 物品网格 -->
        <view v-if="filteredItems.length > 0" class="item-grid">
          <view
            v-for="item in filteredItems"
            :key="item.id"
            class="item-card"
            @tap="onItemTap(item)"
          >
            <view class="item-card__img-wrap">
              <image
                class="item-card__img"
                :src="item.displayImageUrl || item.imageUrl"
                mode="aspectFill"
              />
              <view class="item-card__tag">
                <text class="item-card__tag-text">{{ item.categoryLabel }}</text>
              </view>
            </view>
            <view class="item-card__info">
              <text class="item-card__name">{{ item.name }}</text>
              <view class="item-card__status-row">
                <text
                  class="item-card__status-dot"
                  :class="getStatusClass(item.status)"
                >•</text>
                <text
                  class="item-card__status-text"
                  :class="getStatusClass(item.status)"
                >{{ getStatusLabel(item) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else class="empty-state">
          <view class="empty-state__illus">
            <image class="empty-state__img" src="/static/illus-leaf.png" mode="aspectFit" />
          </view>
          <text class="empty-state__title">万物皆有时，此刻且从容</text>
          <text class="empty-state__sub">开始收纳你的第一件好物吧</text>
          <view class="empty-state__btn" @tap="onAdd">
            <text class="empty-state__btn-text">＋ 去添加</text>
          </view>
        </view>

        <view class="safe-bottom" />
      </scroll-view>
    </view>

    <!-- FAB -->
    <view class="fab" @tap="onAdd">
      <image class="fab__icon-img" src="/static/icons/add.svg" mode="aspectFit" />
    </view>

    <!-- 底部 TabBar -->
    <view class="tab-bar">
      <view class="tab-bar__item" @tap="onTabTap('index')">
        <image class="tab-bar__icon-img" src="/static/icons/shouye.svg" mode="aspectFit" />
        <text class="tab-bar__label">首页</text>
      </view>
      <view class="tab-bar__item tab-bar__item--active">
        <view class="tab-bar__active-bg">
          <image class="tab-bar__icon-img tab-bar__icon-img--active" src="/static/icons/wupinku-dianji.svg" mode="aspectFit" />
        </view>
        <text class="tab-bar__label tab-bar__label--active">物品库</text>
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
import { ref, computed } from 'vue'

interface Item {
  id: string
  name: string
  category: string
  categoryLabel: string
  imageUrl: string
  displayImageUrl?: string
  status: 'pending' | 'using' | 'near_expire' | 'expired'
  daysLeft: number
  expireDate: string
}

interface Filter {
  key: string
  label: string
}

const topHeight = ref(120)
const searchKeyword = ref('')
const activeCategoryKey = ref('all')
const activeStatusKey = ref('all')

const categoryFilters = ref<Filter[]>([
  { key: 'all', label: '全部' },
  { key: 'food', label: '食品' },
  { key: 'medicine', label: '药品' },
  { key: 'beauty', label: '美妆' },
  { key: 'daily', label: '日化' },
])

const statusFilters = ref<Filter[]>([
  { key: 'all', label: '全部' },
  { key: 'near_expire', label: '临期' },
  { key: 'expired', label: '过期' },
  { key: 'using', label: '使用中' },
  { key: 'pending', label: '已用' },
])

const allItems = ref<Item[]>([
  {
    id: '1',
    name: '海蓝之谜面霜',
    category: 'beauty',
    categoryLabel: '美妆',
    imageUrl: '/static/placeholder-cream2.png',
    status: 'near_expire',
    daysLeft: 12,
    expireDate: '2026-07-17',
  },
  {
    id: '2',
    name: '布洛芬缓释胶囊',
    category: 'medicine',
    categoryLabel: '药品',
    imageUrl: '/static/placeholder-medicine.png',
    status: 'pending',
    daysLeft: 180,
    expireDate: '2027-01-01',
  },
  {
    id: '3',
    name: '蓝月亮洗衣液',
    category: 'daily',
    categoryLabel: '日化',
    imageUrl: '/static/placeholder-detergent.png',
    status: 'using',
    daysLeft: 90,
    expireDate: '2026-10-05',
  },
  {
    id: '4',
    name: '全麦吐司面包',
    category: 'food',
    categoryLabel: '食品',
    imageUrl: '/static/placeholder-bread.png',
    status: 'expired',
    daysLeft: -1,
    expireDate: '2026-07-04',
  },
])

const filteredItems = computed(() => {
  let result = allItems.value
  if (activeCategoryKey.value !== 'all') {
    result = result.filter(i => i.category === activeCategoryKey.value)
  }
  if (activeStatusKey.value !== 'all') {
    result = result.filter(i => i.status === activeStatusKey.value)
  }
  if (searchKeyword.value) {
    result = result.filter(i => i.name.includes(searchKeyword.value))
  }
  return result
})

function getStatusClass(status: string) {
  if (status === 'near_expire') return 'text-warn'
  if (status === 'expired') return 'text-expired'
  return 'text-muted'
}

function getStatusIcon(status: string) {
  if (status === 'near_expire') return '⏳'
  if (status === 'expired') return '△'
  return '◎'
}

function getStatusLabel(item: Item) {
  if (item.status === 'near_expire') return `还有 ${item.daysLeft} 天`
  if (item.status === 'expired') return '已过期'
  if (item.status === 'using') return '使用中'
  return `还有 ${item.daysLeft} 天`
}

function onSearchFocus() {
  // 搜索交互
}

function onCategoryFilter(key: string) {
  activeCategoryKey.value = key
}

function onStatusFilter(key: string) {
  activeStatusKey.value = key
}

function onItemTap(item: Item) {
  uni.navigateTo({ url: `/pages/detail/index?id=${item.id}` })
}

function onAdd() {
  uni.navigateTo({ url: '/pages/add/index?mode=manual' })
}

function onTabTap(tab: string) {
  const tabMap: Record<string, string> = {
    index: '/pages/index/index',
    tools: '/pages/tools/index',
    me: '/pages/me/index',
  }
  uni.switchTab({ url: tabMap[tab] })
}
</script>

<style lang="scss" scoped>
$color-bg: #F9F8F6;
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
  }
}

.scroll-wrap {
  flex: 1;
  height: 100vh;
  box-sizing: border-box;
  padding-bottom: $tab-height;
}

.scroll-body {
  height: 100%;
}

/* 搜索框 */
.search-bar {
  margin: 32rpx 48rpx 0;
  height: 88rpx;
  background: $color-card;
  border-radius: $radius-full;
  box-shadow: $shadow-card;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
  gap: 16rpx;

  &__icon-img {
    width: 32rpx;
    height: 32rpx;
    opacity: 0.6;
  }

  &__placeholder {
    font-size: 30rpx;
    color: $color-text-secondary;
  }

  &__text {
    font-size: 30rpx;
    color: $color-text;
  }
}

/* 筛选器 */
.filter-scroll {
  margin-top: 24rpx;
  padding: 0 48rpx;
  white-space: nowrap;
}

.filter-row {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
  padding-right: 48rpx;
}

.filter-chip {
  height: 64rpx;
  padding: 0 32rpx;
  border-radius: $radius-full;
  background: rgba(51, 54, 52, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &__text {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &--active {
    background: $color-primary-dark;

    .filter-chip__text {
      color: #fff;
      font-weight: 700;
    }
  }

  &--status {
    background: rgba(51, 54, 52, 0.06);
  }

  &--status-active {
    background: $color-warn;

    .filter-chip__text {
      color: #fff;
      font-weight: 700;
    }
  }
}

/* 物品网格 */
.item-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  padding: 32rpx 48rpx 0;
}

.item-card {
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  overflow: hidden;

  &__img-wrap {
    width: 100%;
    aspect-ratio: 1;
    background: $color-bg;
    position: relative;
    overflow: hidden;
  }

  &__img {
    width: 100%;
    height: 100%;
  }

  &__tag {
    position: absolute;
    top: 16rpx;
    right: 16rpx;
    background: $color-primary-dark;
    border-radius: $radius-full;
    padding: 6rpx 18rpx;
  }

  &__tag-text {
    font-size: 22rpx;
    color: #fff;
  }

  &__info {
    padding: 20rpx 24rpx;
  }

  &__name {
    font-family: 'Noto Serif SC', serif;
    font-size: 30rpx;
    font-weight: 700;
    color: $color-text;
    display: block;
    margin-bottom: 12rpx;
  }

  &__status-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  &__status-dot {
    font-size: 32rpx;
    line-height: 1;
  }

  &__status-text {
    font-size: 26rpx;
  }
}

.text-warn { color: $color-warn; }
.text-expired { color: $color-expired; }
.text-muted { color: $color-text-secondary; }

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx;
  gap: 24rpx;

  &__illus {
    width: 512rpx;
    height: 576rpx;
    background: rgba(231, 225, 216, 0.4);
    border-radius: $radius-card;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__img {
    width: 320rpx;
    height: 320rpx;
  }

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 40rpx;
    font-weight: 700;
    color: $color-text;
    text-align: center;
  }

  &__sub {
    font-size: 28rpx;
    color: $color-text-secondary;
    text-align: center;
  }

  &__btn {
    width: 560rpx;
    height: 112rpx;
    background: $color-primary-dark;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__btn-text {
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
    font-weight: 700;
    color: #fff;
  }
}

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
