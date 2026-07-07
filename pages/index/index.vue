<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="top-bar">
      <view class="top-bar__brand">
        <image class="top-bar__icon" src="/static/icons/index-topIcon.svg" mode="aspectFit" />
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
          <view class="quick-add-card__icon-wrap quick-add-card__icon-wrap--photo">
            <image class="quick-add-card__icon-img" src="/static/icons/index-paizhao.svg" mode="aspectFit" />
          </view>
          <text class="quick-add-card__label">拍照识别</text>
        </view>
        <view class="quick-add-card" @tap="onScanCode">
          <view class="quick-add-card__icon-wrap quick-add-card__icon-wrap--scan">
            <image class="quick-add-card__icon-img" src="/static/icons/index-saoma.svg" mode="aspectFit" />
          </view>
          <text class="quick-add-card__label">扫码录入</text>
        </view>
        <view class="quick-add-card" @tap="onManualAdd">
          <view class="quick-add-card__icon-wrap quick-add-card__icon-wrap--manual">
            <image class="quick-add-card__icon-img" src="/static/icons/index-shoudong.svg" mode="aspectFit" />
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
        <!-- 2 列并排，对齐设计稿 -->
        <view class="focus-grid">
          <view
            v-for="item in focusItems"
            :key="item.id"
            class="focus-card"
            :style="{ background: item.cardBg }"
            @tap="onItemTap(item)"
          >
            <view class="focus-card__img-wrap">
              <image
                class="focus-card__img"
                :src="item.displayImageUrl || item.imageUrl"
                mode="aspectFit"
                :style="{ transform: `rotate(${item.rotation}deg)` }"
              />
              <!-- 临期 / 使用中角标 -->
              <view
                class="focus-card__badge"
                :class="item.status === 'using' ? 'focus-card__badge--using' : 'focus-card__badge--warn'"
              >
                <view v-if="item.status === 'using'" class="focus-card__badge-dot" />
                <text class="focus-card__badge-text">
                  {{ item.status === 'using' ? '使用中 · 还有 ' : '还有 ' }}{{ item.daysLeft }} 天
                </text>
              </view>
            </view>
            <view class="focus-card__info">
              <text class="focus-card__name">{{ item.name }}</text>
              <text class="focus-card__category">{{ item.category }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 分类概览 -->
      <view class="section">
        <text class="section__title section__title--block">分类概览</text>
        <view class="category-grid">
          <view
            v-for="cat in categories"
            :key="cat.key"
            class="category-card"
            :style="{ background: cat.cardBg }"
            @tap="onCategoryTap(cat)"
          >
            <view class="category-card__left">
              <view class="category-card__icon-circle" :style="{ background: cat.iconBg }">
                <image class="category-card__icon-img" :src="cat.icon" mode="aspectFit" />
              </view>
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
      <image class="fab__icon-img" src="/static/icons/index-add.svg" mode="aspectFit" />
    </view>

    <!-- 底部导航栏 -->
    <view class="tab-bar">
      <view class="tab-bar__item tab-bar__item--active" @tap="onTabTap('index')">
        <view class="tab-bar__icon-wrap tab-bar__icon-wrap--active">
          <image class="tab-bar__icon-img" src="/static/icons/index-shouye-dianji.svg" mode="aspectFit" />
        </view>
        <text class="tab-bar__label tab-bar__label--active">首页</text>
      </view>
      <view class="tab-bar__item" @tap="onTabTap('library')">
        <view class="tab-bar__icon-wrap">
          <image class="tab-bar__icon-img" src="/static/icons/index-wupinku.svg" mode="aspectFit" />
        </view>
        <text class="tab-bar__label">物品库</text>
      </view>
      <view class="tab-bar__item" @tap="onTabTap('tools')">
        <view class="tab-bar__icon-wrap">
          <image class="tab-bar__icon-img" src="/static/icons/index-gongju.svg" mode="aspectFit" />
        </view>
        <text class="tab-bar__label">工具</text>
      </view>
      <view class="tab-bar__item" @tap="onTabTap('me')">
        <view class="tab-bar__icon-wrap">
          <image class="tab-bar__icon-img" src="/static/icons/index-wode.svg" mode="aspectFit" />
        </view>
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
  cardBg: string
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
  cardBg: string
  iconBg: string
  count: number
}

const focusItems = ref<Item[]>([
  {
    id: '1',
    name: '鲜牛奶',
    category: '食品',
    imageUrl: '/static/icons/index-milk.svg',
    displayImageUrl: '',
    cardBg: '#E3E2E0',
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
    imageUrl: '/static/icons/index-cream.svg',
    displayImageUrl: '',
    cardBg: '#F4EFEA',
    status: 'using',
    daysLeft: 6,
    rotation: 1.2,
    expireDate: '2026-07-11',
    produceDate: '2024-01-01',
  },
])

const categories = ref<Category[]>([
  { key: 'food',     name: '食品', icon: '/static/icons/index-shipin.svg',    cardBg: '#F4F3F1', iconBg: '#FCEEE8', count: 12 },
  { key: 'medicine', name: '药品', icon: '/static/icons/index-yaopin.svg',    cardBg: '#E9EDEA', iconBg: '#FFFFFF', count: 5  },
  { key: 'beauty',   name: '美妆', icon: '/static/icons/index-meizhuang.svg', cardBg: '#F4EFEA', iconBg: '#FFFFFF', count: 8  },
  { key: 'daily',    name: '日化', icon: '/static/icons/index-rihua.svg',     cardBg: '#EEF1EE', iconBg: '#FFFFFF', count: 3  },
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

function onCategoryTap(_cat: Category) {
  uni.switchTab({ url: '/pages/library/index' })
}

function onTabTap(tab: string) {
  const tabMap: Record<string, string> = {
    index:   '/pages/index/index',
    library: '/pages/library/index',
    tools:   '/pages/tools/index',
    me:      '/pages/me/index',
  }
  uni.switchTab({ url: tabMap[tab] })
}

onMounted(() => {
  // 实际项目中此处从云数据库加载数据
})
</script>

<style lang="scss" scoped>
// ── Design Tokens ──────────────────────────────────────────────────────────
$color-bg:            #F9F8F6;   // 燕麦白
$color-bg-alt:        #E8EDE7;   // 浅鼠尾草绿
$color-card-soft:     #F4F3F1;   // 柔雾白（快速录入卡/分类卡底色）
$color-primary:       #8A9A86;   // 鼠尾草绿
$color-primary-dark:  #536251;   // 深鼠尾草
$color-text:          #333634;   // 墨岩灰
$color-text-dark:     #1A1C1B;   // 设计稿主文字（更深）
$color-text-muted:    #444842;   // 设计稿次文字
$color-text-count:    #747871;   // 分类数量色
$color-text-secondary:rgba(51, 54, 52, 0.64);
$color-warn:          #D98A6C;   // 陶土橘（agents.md 临期色）
$color-warn-badge:    #8E4D33;   // 临期角标背景（设计稿）
$color-expired:       #A69B8D;   // 枯木灰（agents.md 过期色）
$color-line:          rgba(51, 54, 52, 0.1);
// agents.md 规范阴影
$shadow-card:         0 16rpx 48rpx rgba(51, 54, 52, 0.08);
$shadow-card-sm:      0 12rpx 16rpx rgba(51, 54, 52, 0.10);
$radius-card:         32rpx;     // agents.md 标准卡片圆角
$radius-card-sm:      24rpx;     // 次级圆角（设计稿 12px）
$radius-full:         9999rpx;
$tab-height:          168rpx;
$top-height:          120rpx;

// ── 根容器 ─────────────────────────────────────────────────────────────────
.page {
  width: 100%;
  min-height: 100vh;
  background: $color-bg;
  display: flex;
  flex-direction: column;
}

// ── 顶部导航 ───────────────────────────────────────────────────────────────
// 设计稿：h-60px=120rpx，bg #faf9f7，left-[24px]=48rpx gap，font-bold 20px=40rpx
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
  border-bottom: 2rpx solid rgba(51, 54, 52, 0.08);
  box-shadow: 0 16rpx 48rpx rgba(51, 54, 52, 0.1);
  z-index: 999;

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

// ── 滚动主体 ───────────────────────────────────────────────────────────────
.scroll-body {
  flex: 1;
  // 顶部高度 = 自定义导航栏高度 + 状态栏高度
  padding-top: calc(#{$top-height} + var(--status-bar-height, 44rpx));
  padding-bottom: 140rpx;
  height: 100vh;
  box-sizing: border-box;
}

// ── 问候区 ─────────────────────────────────────────────────────────────────
// 设计稿：h-100px=200rpx，pt-16px=32rpx（从顶栏下来），px-24px=48rpx
.greeting-section {
  padding: 32rpx 48rpx 0;

  &__title {
    font-family: 'Noto Serif SC', serif;
    // 设计稿：font-bold 20px=40rpx，color #1a1c1b
    font-size: 40rpx;
    font-weight: 700;
    color: $color-text-dark;
    line-height: 56rpx;
    display: block;
    margin-bottom: 20rpx;
  }

  // 设计稿：bg #f4f3f1 + 白描边 + 柔阴影，px-12px py-4px，rounded-full
  &__badge {
    display: inline-flex;
    align-items: center;
    background: $color-card-soft;
    border-radius: $radius-full;
    padding: 8rpx 24rpx;
    box-shadow: 0 12rpx 16rpx rgba(51, 54, 52, 0.15);
    outline: 2rpx solid #fff;
  }
}

// 临期数量：恢复为设计稿较亮的陶土橘，降低字重
.badge-warn {
  font-family: 'Noto Serif SC', serif;
  font-size: 28rpx;
  font-weight: 500;
  color: #8E4D33;
}

// 过期数量：恢复为设计稿的枯木灰，降低字重
.badge-expired {
  font-family: 'Noto Serif SC', serif;
  font-size: 28rpx;
  font-weight: 500;
  color: #BA1A1A;
}

// 问候徽章间隔文字
.badge-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 28rpx;
  font-weight: 400;
  color: #A69B8D;
}

// ── 快速录入区 ─────────────────────────────────────────────────────────────
// 设计稿：gap-16px=32rpx，px-24px=48rpx，py-16px=32rpx（卡内）
.quick-add-section {
  display: flex;
  flex-direction: row;
  gap: 32rpx;
  padding: 48rpx 48rpx 0;
}

// 设计稿：bg #f4f3f1 + border border-white + rounded-12px=24rpx + shadow
// agents.md 圆角规范 32rpx，此处为快速操作小卡用 32rpx
.quick-add-card {
  flex: 1;
  background: $color-card-soft;
  border-radius: $radius-card;
  box-shadow: $shadow-card-sm;
  border: 4rpx solid #fff;
  box-sizing: border-box;
  padding: 40rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;

  // 设计稿：圆形图标底，size-[48px]=96rpx
  &__icon-wrap {
    width: 96rpx;
    height: 96rpx;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;

    // 拍照识别：鼠尾草绿 #8a9a86
    &--photo  { background: $color-primary; }
    // 扫码录入：设计稿 #9f9486，枯木灰系
    &--scan   { background: #9F9486; }
    // 手动添加：设计稿 #feaa8a，陶土橘浅色
    &--manual { background: #FEAA8A; }
  }

  // 设计稿：图标 20px ≈ 40rpx（等比，SVG 自适应）
  &__icon-img {
    width: 40rpx;
    height: 40rpx;
  }

  // 设计稿：Noto Serif SC Medium 12px=24rpx，#1a1c1b，tracking-0.6px=1.2rpx
  &__label {
    font-family: 'Noto Serif SC', serif;
    font-size: 24rpx;
    font-weight: 500;
    color: $color-text-dark;
    text-align: center;
    letter-spacing: 1.2rpx;
  }
}

// ── 通用 section ──────────────────────────────────────────────────────────
// 设计稿：px-24px=48rpx，gap-32px=64rpx（各 section 间距由 scroll-body 堆叠）
.section {
  padding: 48rpx 48rpx 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32rpx;
  }

  // 设计稿：Noto Serif SC Bold 20px=40rpx，#1a1c1b
  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 40rpx;
    font-weight: 700;
    color: $color-text-dark;

    // 独立标题（分类概览）：加底部间距
    &--block {
      display: block;
      margin-bottom: 32rpx;
    }
  }

  &__more {
    display: flex;
    align-items: center;
    gap: 4rpx;
  }

  // 设计稿：Noto Serif SC Regular 12px=24rpx，color #536251
  &__more-text {
    font-family: 'Noto Serif SC', serif;
    font-size: 24rpx;
    font-weight: 400;
    color: $color-primary-dark;
  }

  &__more-arrow {
    font-size: 28rpx;
    color: $color-primary-dark;
  }
}

// ── 今日关注：2 列并排（对齐设计稿 flex row gap-24px=48rpx）──────────────
.focus-grid {
  display: flex;
  flex-direction: row;
  gap: 24rpx;
}

// 设计稿：flex-[1_0_0] / rounded-12px → agents.md 32rpx / border-2 border-white
// 每张卡背景色通过 :style 绑定（见数据层 cardBg）
.focus-card {
  flex: 1 0 0;
  min-width: 0;
  border-radius: $radius-card;
  box-shadow: $shadow-card-sm;
  border: 4rpx solid #fff;
  box-sizing: border-box;
  overflow: hidden;

  // 图片区：设计稿 p-26px=52rpx，图片 80px=160rpx（牛奶），64px=128rpx（面霜）
  &__img-wrap {
    position: relative;
    padding: 52rpx 52rpx 32rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__img {
    width: 160rpx;
    height: 160rpx;
  }

  // 角标：absolute 右上角，rounded-full
  &__badge {
    position: absolute;
    top: 20rpx;
    right: 20rpx;
    border-radius: $radius-full;
    padding: 8rpx 16rpx;
    display: flex;
    align-items: center;
    gap: 8rpx;

    // 临期警告：agents.md 陶土橘系（设计稿 #8e4d33，为低饱和合规改用深棕）
    &--warn  { background: $color-warn-badge; }
    // 使用中：深鼠尾草
    &--using { background: $color-primary-dark; }
  }

  // 使用中白点指示
  &__badge-dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: $radius-full;
    background: #fff;
    flex-shrink: 0;
  }

  // 设计稿：Noto Serif SC Regular 10px=20rpx
  &__badge-text {
    font-family: 'Noto Serif SC', serif;
    font-size: 20rpx;
    font-weight: 400;
    color: #fff;
    white-space: nowrap;
  }

  // 文字信息区
  &__info {
    padding: 0 24rpx 24rpx;
  }

  // 设计稿：Noto Serif SC Medium 16px=32rpx，#1a1c1b
  &__name {
    font-family: 'Noto Serif SC', serif;
    font-size: 32rpx;
    font-weight: 500;
    color: $color-text-dark;
    display: block;
    margin-bottom: 8rpx;
  }

  // 设计稿：Noto Serif SC Regular 12px=24rpx，#444842，tracking-0.6px
  &__category {
    font-family: 'Noto Serif SC', serif;
    font-size: 24rpx;
    font-weight: 400;
    color: $color-text-muted;
    display: block;
    letter-spacing: 1.2rpx;
  }
}

// ── 分类网格 ──────────────────────────────────────────────────────────────
// 设计稿：2 列，gap-12px=24rpx，行高 72px=144rpx
.category-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}

// 每张卡背景色通过 :style 绑定，agents.md 圆角 32rpx
.category-card {
  border-radius: $radius-card;
  box-shadow: $shadow-card-sm;
  border: 4rpx solid #fff;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 144rpx;
  box-sizing: border-box;

  &__left {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  // 设计稿：40×40px=80rpx 圆圈，bg 颜色通过 :style 绑定
  &__icon-circle {
    width: 80rpx;
    height: 80rpx;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  // 设计稿：图标约 15-20px ≈ 32-40rpx
  &__icon-img {
    width: 40rpx;
    height: 40rpx;
  }

  // 设计稿：Noto Serif SC Medium 14px=28rpx，#1a1c1b
  &__name {
    font-family: 'Noto Serif SC', serif;
    font-size: 28rpx;
    font-weight: 500;
    color: $color-text-dark;
  }

  // 设计稿：Noto Serif SC SemiBold 20px=40rpx，#747871
  &__count {
    font-family: 'Noto Serif SC', serif;
    font-size: 40rpx;
    font-weight: 600;
    color: $color-text-count;
  }
}

// ── 安全区 ─────────────────────────────────────────────────────────────────
.safe-bottom {
  height: 48rpx;
}

// ── FAB 悬浮按钮 ───────────────────────────────────────────────────────────
// 设计稿：size-56px=112rpx，bg #536251，bottom-101px=202rpx，right-32px=64rpx
.fab {
  position: fixed;
  right: 64rpx;
  bottom: calc(110rpx + 40rpx);
  width: 112rpx;
  height: 112rpx;
  border-radius: $radius-full;
  background: $color-primary-dark;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-card;
  z-index: 50;

  &__icon-img {
    width: 44rpx;
    height: 44rpx;
  }
}

// ── 底部 TabBar ────────────────────────────────────────────────────────────
// 设计稿：h-84px=168rpx，bg #f4f3f1，rounded-tl/tr-12px=24rpx 0 0
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(132rpx + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: $color-card-soft;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  align-items: flex-start;
  padding-top: 16rpx;
  box-sizing: border-box;
  z-index: 100;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
    padding: 8rpx 0;
  }

  &__icon-wrap {
    width: 68rpx;
    height: 68rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: none;

    &--active {
      background: #8A9A86;
    }
  }

  &__icon-img {
    width: 44rpx !important;
    height: 44rpx !important;
    flex-shrink: 0;
    opacity: 0.8;
    transform: scale(1) !important;
    transition: none;
  }

  // 设计稿：Noto Serif SC Regular 12px=24rpx
  &__label {
    font-family: 'Noto Serif SC', serif;
    font-size: 22rpx;
    font-weight: 400;
    color: $color-text-muted;

    &--active {
      color: $color-primary-dark;
      font-weight: 700;
    }
  }
}
</style>
