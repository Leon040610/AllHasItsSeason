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
    <view class="scroll-wrap">
      <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false" refresher-enabled="true" :refresher-threshold="100" :refresher-triggered="isRefreshing" @refresherrefresh="onRefresh" refresher-default-style="none" refresher-background="transparent">
      
      <view slot="refresher" class="custom-refresher">
        <view class="custom-refresher__dots">
          <view class="dot"></view><view class="dot"></view><view class="dot"></view>
        </view>
        <text class="custom-refresher__text">{{ isSyncEnabled ? '正在进行云端数据同步' : '云端同步未开启' }}</text>
      </view>

      <view class="scroll-content">
      <!-- 问候区 -->
      <view class="greeting-section">
        <text class="greeting-section__title">{{ greetingText }}</text>
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

        <view class="quick-add-card" @tap="onManualAdd">
          <view class="quick-add-card__icon-wrap quick-add-card__icon-wrap--manual">
            <image class="quick-add-card__icon-img" src="/static/icons/index-shoudong.svg" mode="aspectFit" />
          </view>
          <text class="quick-add-card__label">手动添加</text>
        </view>
      </view>

      <!-- 今日关注 -->
      <view class="section" v-if="focusItems.length > 0">
        <view class="section__header">
          <text class="section__title">今日关注</text>
          <view class="section__more" @tap="onViewAll">
            <text class="section__more-text">全部</text>
            <text class="section__more-arrow">›</text>
          </view>
        </view>
        <!-- 2 列并排，对齐设计稿 -->
        <scroll-view class="focus-grid" scroll-x enhanced :show-scrollbar="false">
          <view class="focus-grid-inner">
            <view
              v-for="item in focusItems"
              :key="item.id"
              class="focus-card"
              :style="{ background: item.cardBg || '#F4EFEA' }"
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
                    {{ item.statusLabel }}
                  </text>
                </view>
              </view>
              <view class="focus-card__info">
                <text class="focus-card__name">{{ item.name }}</text>
                <text class="focus-card__category">{{ item.categoryLabel }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
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
              <view class="category-card__icon-circle">
                <view class="category-card__icon-box">
                  <image class="category-card__icon-img" :src="cat.icon" :style="{ filter: 'drop-shadow(100px 0 0 ' + cat.iconBg + ')' }" mode="aspectFit" />
                </view>
              </view>
              <text class="category-card__name">{{ cat.name }}</text>
            </view>
            <text class="category-card__count">{{ cat.count }}</text>
          </view>
        </view>
      </view>

      <!-- 底部安全区占位 -->
      <view class="safe-bottom" />
      </view>
      </scroll-view>
    </view>

    <!-- 悬浮添加按钮 -->
    <view class="fab" :style="fabStyle" @longpress="onFabLongPress" @touchstart="onFabTouchStart" @touchmove.stop.prevent="onFabTouchMove" @touchend="onFabTouchEnd" @tap="onManualAdd">
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
          <image class="tab-bar__icon-img" src="/static/icons/me-gongju.svg" mode="aspectFit" />
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

    <BrandConfirmDialog :dialog="dialog" @confirm="onDialogConfirm" @cancel="onDialogCancel" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { itemService } from '../../services/itemService.js'
import { categoryService } from '../../services/categoryService.js'
import { syncService } from '../../services/syncService.js'
import { recognitionService } from '../../services/recognitionService.js'
import { cloudStorageService } from '../../services/cloudStorageService.js'
import { isStoredLoggedIn } from '../../utils/authSessionStore.js'
import BrandConfirmDialog from '../../components/BrandConfirmDialog.vue'
import { useBrandConfirmDialog } from '../../utils/useBrandConfirmDialog.js'

const focusItems = ref<any[]>([])
const categories = ref<any[]>([])

const nearExpireCount = ref(0)
const expiredCount = ref(0)
const isRefreshing = ref(false)
const isSyncEnabled = ref(false)
const { dialog, confirm, onConfirm: onDialogConfirm, onCancel: onDialogCancel } = useBrandConfirmDialog()
let welcomeTimer: ReturnType<typeof setTimeout> | null = null

const greetingText = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好，今天也从容一点'
  if (hour < 18) return '下午好，今天也从容一点'
  return '晚上好，今天也从容一点'
})

onShow(() => {
  const saved = uni.getStorageSync('fab_position')
  if (saved) {
    fabX.value = saved.x
    fabY.value = saved.y
  }
  isSyncEnabled.value = syncService.getSettings().syncEnabled
  loadData()
  scheduleWelcomeGuide()
})

onHide(() => {
  if (welcomeTimer) {
    clearTimeout(welcomeTimer)
    welcomeTimer = null
  }
})

function scheduleWelcomeGuide() {
  if (welcomeTimer || uni.getStorageSync('allhas_guide_shown_v1')) return

  welcomeTimer = setTimeout(async () => {
    welcomeTimer = null
    if (uni.getStorageSync('allhas_guide_shown_v1') || dialog.visible) return

    const result = await confirm({
      title: '欢迎来到万物有期',
      paragraphs: [
        '我是你的物品效期小管家。拍下家里的好物，我会帮你记着每一个重要的日子。',
        '第一次使用？花 1 分钟看看使用说明，上手更快哦。',
      ],
      cancelText: '先逛逛',
      confirmText: '去看看',
    })

    uni.setStorageSync('allhas_guide_shown_v1', true)
    if (result.confirm) {
      uni.navigateTo({ url: '/pages/me/guide/index' })
    }
  }, 700)
}

function loadData() {
  // 从服务层获取最新数据
  const allViewItems = itemService.getViewItems()
  
  // 直接读取用户在"我的-提醒设置"里保存的默认临期天数，如果没有则默认为 7 天
  const storedDays = uni.getStorageSync('defaultReminderDays')
  const globalRemindDays = (storedDays === '' || storedDays === null || storedDays === undefined) ? 7 : Number(storedDays)
  
  // 统计过期和临期 (依赖全局设定的默认临期天数)
  nearExpireCount.value = allViewItems.filter(i => i.status !== 'done' && i.status !== 'deleted' && i.displayStatus !== 'incomplete' && i.daysLeft !== null && i.daysLeft <= globalRemindDays && i.daysLeft >= 0).length
  expiredCount.value = allViewItems.filter(i => i.status !== 'done' && i.status !== 'deleted' && i.displayStatus !== 'incomplete' && i.daysLeft !== null && i.daysLeft < 0).length

  // 今日关注：只保留临期物品 (daysLeft <= globalRemindDays 且 daysLeft >= 0)
  const activeItems = allViewItems.filter(i => i.status !== 'done' && i.status !== 'deleted' && i.displayStatus !== 'incomplete' && i.daysLeft !== null && i.daysLeft <= globalRemindDays && i.daysLeft >= 0)
  
  // 按剩余天数从小到大排
  activeItems.sort((a, b) => a.daysLeft - b.daysLeft)
  
  focusItems.value = activeItems.slice(0, 4).map(item => {
    let bg = '#F4EFEA' // default for food / baby / others
    if (item.category === 'beauty') bg = '#E3E2E0'
    if (item.category === 'medicine') bg = '#E9EDEA'
    if (item.category === 'daily') bg = '#EEF1EE'
    return {
      ...item,
      cardBg: bg
    }
  })

  // 异步还原临期好物的图片展示路径
  cloudStorageService.restoreItemDisplayImages(focusItems.value).then(restored => {
    focusItems.value = [...restored]
  })

  // 统计分类数量
  const allCats = categoryService.getCategories()
  categories.value = allCats.map(cat => {
    const count = allViewItems.filter(i => i.category === cat.id).length
    return {
      key: cat.id,
      name: cat.name,
      icon: cat.icon,
      cardBg: cat.cardBg,
      iconBg: cat.iconBg,
      count
    }
  })
}

async function onRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  
  if (!isSyncEnabled.value) {
    setTimeout(() => {
      isRefreshing.value = false
    }, 50)
    return
  }
  
  try {
    const res = await syncService.syncAll({ pullOnly: true })
    if (res && res.syncedItemCount === 0 && res.conflictCount === 0) {
      uni.showToast({ title: '当前已是最新，无需同步', icon: 'none' })
    } else {
      uni.showToast({ title: '同步成功', icon: 'success' })
    }
    loadData()
  } catch (e) {
    console.error('Refresh sync failed', e)
  }
  setTimeout(() => {
    isRefreshing.value = false
  }, 500)
}

// ====== FAB 拖拽逻辑 ======
const sysInfo = uni.getSystemInfoSync()
const windowWidth = sysInfo.windowWidth
const windowHeight = sysInfo.windowHeight
const fabW = uni.upx2px(112)
const safeBottom = sysInfo.safeAreaInsets ? sysInfo.safeAreaInsets.bottom : 0

const defaultX = windowWidth - fabW - uni.upx2px(48)
const defaultY = windowHeight - uni.upx2px(132) - safeBottom - uni.upx2px(40) - fabW

const fabX = ref(defaultX)
const fabY = ref(defaultY)
const isSnapping = ref(false)

let isDraggable = false
let isMoved = false
let touchStartX = 0
let touchStartY = 0
let fabStartX = 0
let fabStartY = 0

const fabStyle = computed(() => {
  return `transform: translate(${fabX.value}px, ${fabY.value}px); transition: ${isSnapping.value ? 'transform 0.3s ease-out' : 'none'};`
})

function onFabLongPress() {
  isDraggable = true
  uni.vibrateShort()
}

function onFabTouchStart(e: any) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  fabStartX = fabX.value
  fabStartY = fabY.value
  isMoved = false
  isSnapping.value = false
}

function onFabTouchMove(e: any) {
  if (!isDraggable) return
  isMoved = true
  let newX = fabStartX + (e.touches[0].clientX - touchStartX)
  let newY = fabStartY + (e.touches[0].clientY - touchStartY)
  
  if (newX < 0) newX = 0
  if (newX > windowWidth - fabW) newX = windowWidth - fabW
  if (newY < 0) newY = 0
  if (newY > windowHeight - fabW) newY = windowHeight - fabW
  
  fabX.value = newX
  fabY.value = newY
}

function onFabTouchEnd() {
  if (!isDraggable) return
  isDraggable = false
  isSnapping.value = true
  
  if (fabX.value + fabW / 2 < windowWidth / 2) {
    fabX.value = uni.upx2px(48)
  } else {
    fabX.value = windowWidth - fabW - uni.upx2px(48)
  }
  
  uni.setStorageSync('fab_position', { x: fabX.value, y: fabY.value })
  
  setTimeout(() => {
    isSnapping.value = false
  }, 300)
}

async function onPhotoScan() {
  if (!isStoredLoggedIn()) {
    uni.showToast({
      title: '登录后可拍照识字',
      icon: 'none',
      duration: 1600
    });
    return;
  }

  const consent = uni.getStorageSync('allhas_ocr_consent_v1');
  if (consent && consent.accepted) {
    executePhotoScan();
  } else {
    const result = await confirm({
      title: '先确认一下拍照识字',
      content: '为了识别包装上的效期信息，拍下的标签照片会提交给微信服务市场的文字识别服务处理。识别结果只会帮你填写表单。',
      cancelText: '手动填写',
      confirmText: '开始识别',
    });

    if (result.confirm) {
      uni.setStorageSync('allhas_ocr_consent_v1', {
        accepted: true,
        policyVersion: 1,
        acceptedAt: Date.now()
      });
      executePhotoScan();
    } else {
      uni.navigateTo({ url: '/pages/add/index?mode=manual' });
    }
  }
}

let isScanning = false;
function executePhotoScan() {
  if (isScanning) return;
  
  uni.chooseImage({
    count: 1,
    sourceType: ['album', 'camera'],
    sizeType: ['compressed'],
    success: async (chooseRes) => {
      isScanning = true;
      const tempPath = chooseRes.tempFilePaths[0];
      
      uni.showLoading({ title: '正在识别标签信息', mask: true });
      
      const res = await recognitionService.recognize(tempPath);
      
      uni.hideLoading();
      isScanning = false;
      
      if (res.success) {
        uni.navigateTo({ url: `/pages/add/index?mode=photo&ocrSessionId=${res.sessionId}` });
      } else {
        uni.showToast({ title: '小管家没看清日期，麻烦你手动补一下啦', icon: 'none', duration: 3000 });
      }
    },
    fail: () => {
      // Quietly fail when user cancels camera
      isScanning = false;
    }
  });
}

function onManualAdd() {
  if (isMoved) {
    isMoved = false
    return
  }
  uni.navigateTo({ url: '/pages/add/index?mode=manual' })
}

function onViewAll() {
  uni.setStorageSync('library_filter', { category: 'all', status: 'near_expire' })
  uni.switchTab({ url: '/pages/library/index' })
}

function onItemTap(item: any) {
  uni.navigateTo({ url: `/pages/detail/index?id=${item.id}` })
}

function onCategoryTap(cat: any) {
  uni.setStorageSync('library_filter', { category: cat.key, status: 'all' })
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
  height: 100vh;
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
.scroll-wrap {
  flex: 1;
  // 使用 margin-top 使 scroll-view 的物理边界处于顶栏下方，防止下拉刷新被顶栏遮挡
  margin-top: calc(#{$top-height} + var(--status-bar-height, 44rpx));
  height: calc(100vh - (#{$top-height} + var(--status-bar-height, 44rpx)));
  box-sizing: border-box;
  background: $color-bg;
}

.scroll-body {
  height: 100%;
  background: transparent;
}

/* 自定义下拉刷新 */
.custom-refresher {
  width: 100%;
  height: 140rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.custom-refresher__dots {
  display: flex;
  gap: 12rpx;
}
.dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #A69B8D;
  animation: bounce 1.4s infinite ease-in-out both;
}
.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
.custom-refresher__text {
  font-family: 'Noto Serif SC', serif;
  font-size: 22rpx;
  color: #A69B8D;
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

.focus-grid {
  width: 100%;
  white-space: nowrap;
}

.focus-grid-inner {
  display: flex;
  flex-direction: row;
  gap: 24rpx;
  padding: 32rpx 24rpx; // 增加上下内边距防止投影被裁切
}

// 设计稿：flex-[1_0_0] / rounded-12px → agents.md 32rpx / border-2 border-white
// 每张卡背景色通过 :style 绑定（见数据层 cardBg）
.focus-card {
  width: 320rpx;
  flex-shrink: 0;
  white-space: normal;
  border-radius: $radius-card;
  border: 6rpx solid #fff; // 留一点点白边
  box-shadow: 0 16rpx 32rpx rgba(138, 154, 134, 0.15); // 整个卡片的柔和投影
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
    filter: drop-shadow(0 16rpx 24rpx rgba(51, 54, 52, 0.15)); // 仅给 PNG 图片增加真实轮廓投影
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

  // 设计稿：40×40px=80rpx 圆圈，统一白底
  &__icon-circle {
    width: 80rpx;
    height: 80rpx;
    background: #FFFFFF;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__icon-box {
    width: 40rpx;
    height: 40rpx;
    overflow: hidden;
  }

  // 设计稿：图标约 15-20px ≈ 32-40rpx，利用 drop-shadow 动态变色
  &__icon-img {
    width: 40rpx;
    height: 40rpx;
    transform: translateX(-100px);
    display: block;
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
  height: calc(132rpx + env(safe-area-inset-bottom) + 48rpx);
}

// ── FAB 悬浮按钮 ───────────────────────────────────────────────────────────
// 设计稿：size-56px=112rpx，bg #536251，bottom-101px=202rpx，right-32px=64rpx
.fab {
  position: fixed;
  left: 0;
  top: 0;
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
    color: $color-expired;

    &--active {
      color: $color-primary-dark;
      font-weight: 700;
    }
  }
}
</style>
