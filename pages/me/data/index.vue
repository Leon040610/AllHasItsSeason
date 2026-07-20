<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon-img" src="/static/icons/data-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/data-topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">数据管理</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">

      <!-- 概览卡片 -->
      <view class="overview-card">
        <view class="overview-card__decor" />
        <text class="overview-card__title">概览</text>
        <view class="overview-card__stats">
          <view class="overview-card__stat">
            <text class="overview-card__stat-label">物品总数</text>
            <text class="overview-card__stat-value">{{ stats.itemCount }}</text>
          </view>
          <view class="overview-card__stat">
            <text class="overview-card__stat-label">分类数</text>
            <text class="overview-card__stat-value">{{ stats.categoryCount }}</text>
          </view>
          <view class="overview-card__stat">
            <text class="overview-card__stat-label">草稿数</text>
            <text class="overview-card__stat-value overview-card__stat-value--warn">{{ stats.draftCount }}</text>
          </view>
        </view>
        <view class="overview-card__divider" />
        <view class="overview-card__sync-row">
          <text class="overview-card__sync-time">云端备份：{{ syncStatusText }}</text>
        </view>
      </view>

      <!-- 操作列表 -->
      <view class="action-list">
        <!-- 同步至云端 -->
        <view class="action-card" @tap="onSyncCloud">
          <view class="action-card__icon-wrap action-card__icon-wrap--primary">
            <image class="action-card__icon-img" src="/static/icons/data-lijitongbuyunduan.svg" mode="aspectFit" />
          </view>
          <text class="action-card__label">同步至云端</text>
          <image class="action-card__arrow-icon" src="/static/icons/data-tiaozhuan.svg" mode="aspectFit" />
        </view>

        <!-- 导出数据 -->
        <view class="action-card" @tap="onExportData">
          <view class="action-card__icon-wrap action-card__icon-wrap--muted">
            <image class="action-card__icon-img" src="/static/icons/data-daochushuju.svg" mode="aspectFit" />
          </view>
          <text class="action-card__label">导出数据</text>
          <image class="action-card__arrow-icon" src="/static/icons/data-tiaozhuan.svg" mode="aspectFit" />
        </view>

        <!-- 恢复草稿 -->
        <view class="action-card" @tap="onRestoreDraft">
          <view class="action-card__icon-wrap action-card__icon-wrap--muted">
            <image class="action-card__icon-img" src="/static/icons/data-huifucaogao.svg" mode="aspectFit" />
          </view>
          <text class="action-card__label">恢复草稿</text>
          <image class="action-card__arrow-icon" src="/static/icons/data-tiaozhuan.svg" mode="aspectFit" />
        </view>

        <!-- 清理缓存 -->
        <view class="action-card" @tap="onClearCache">
          <view class="action-card__icon-wrap action-card__icon-wrap--danger">
            <image class="action-card__icon-img" src="/static/icons/data-qinglihuancun.svg" mode="aspectFit" />
          </view>
          <text class="action-card__label action-card__label--danger">清理缓存</text>
          <image class="action-card__arrow-icon" src="/static/icons/data-tiaozhuan.svg" mode="aspectFit" />
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
    <BrandConfirmDialog :dialog="dialog" @confirm="onDialogConfirm" @cancel="onDialogCancel" />
  </view>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { itemService } from '../../../services/itemService.js'
import { categoryService } from '../../../services/categoryService.js'
import { syncService } from '../../../services/syncService.js'
import { cacheService } from '../../../services/cacheService.js'
import BrandConfirmDialog from '../../../components/BrandConfirmDialog.vue'
import { useBrandConfirmDialog } from '../../../utils/useBrandConfirmDialog.js'

interface DataStats {
  itemCount: number
  categoryCount: number
  draftCount: number
}

const stats = reactive<DataStats>({
  itemCount: 0,
  categoryCount: 0,
  draftCount: 0,
})
const { dialog, confirm, onConfirm: onDialogConfirm, onCancel: onDialogCancel } = useBrandConfirmDialog()

const syncStatusText = computed(() => {
  const syncSet = syncService.getSettings()
  if (!syncSet.syncEnabled) {
    return '暂未开启云同步'
  }
  if (syncSet.syncStatus === 'syncing') return '同步中'
  if (syncSet.syncStatus === 'cancelled') return '同步已取消'
  if (syncSet.lastSyncAt) {
    const d = new Date(syncSet.lastSyncAt)
    const timeStr = `${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    return syncSet.syncStatus === 'error' ? `同步失败 (${timeStr})` : `同步成功 (${timeStr})`
  }
  return '未同步'
})

onShow(() => {
  const syncStats = syncService.getSyncStats()
  stats.itemCount = syncStats.itemCount
  stats.categoryCount = syncStats.categoryCount
  stats.draftCount = syncStats.draftCount
})

function onBack() {
  uni.navigateBack()
}

function onSyncCloud() {
  if (typeof wx === 'undefined' || !wx.cloud) {
    uni.showToast({ title: '云同步能力暂未配置，请先完成云开发配置', icon: 'none' })
    return
  }
  
  if (!syncService.hasPendingChanges()) {
    uni.showToast({ title: '当前已是最新，无需同步', icon: 'none' })
    return
  }

  uni.navigateTo({ url: '/pages/me/data/syncing?pushOnly=1' })
}

function onExportData() {
  uni.showToast({ title: '这个功能还在整理中', icon: 'none' })
}

function onRestoreDraft() {
  uni.navigateTo({ url: '/pages/me/draft/index' })
}

async function onClearCache() {
  const { totalSize, files } = cacheService.getCleanableFiles()
  
  if (files.length === 0) {
    uni.showToast({
      title: '暂时没有需要整理的缓存',
      icon: 'none'
    })
    return
  }

  const sizeMb = (totalSize / 1024 / 1024).toFixed(2)
  const confirmation = await confirm({
    title: '清理本地图片缓存？',
    content: `已同步的图片需要时会重新取回，物品记录不会受影响。(当前可清理大小: ${sizeMb} MB)`,
    cancelText: '再想想',
    confirmText: '清理',
    destructive: true,
  })
  if (!confirmation.confirm) return

  uni.showLoading({ title: '清理中...', mask: true })
  try {
    const result = await cacheService.clearCache()
    uni.hideLoading()
    uni.showToast({
      title: `成功清理 ${result.successCount} 个文件 (${(result.clearedSize / 1024 / 1024).toFixed(2)} MB)`,
      icon: 'success',
      duration: 3000
    })
  } catch (err) {
    uni.hideLoading()
    uni.showModal({
      title: '提示',
      content: '这次没有整理好，稍后再试一下',
      showCancel: false
    })
  }
}
</script>

<style lang="scss" scoped>
$color-bg: #FAF9F7;
$color-card: #FFFFFF;
$color-primary: #8A9A86;
$color-primary-dark: #536251;
$color-text: #333634;
$color-text-secondary: rgba(51, 54, 52, 0.64);
$color-warn: #D98A6C;
$color-expired: #A69B8D;
$color-line: rgba(51, 54, 52, 0.1);
$color-border: rgba(231, 225, 216, 0.8);
$shadow-card: 0 8rpx 48rpx rgba(51, 54, 52, 0.08);
$radius-card: 32rpx;
$radius-full: 9999rpx;
$top-height: 120rpx;

.page {
  font-family: 'Noto Serif SC', serif;
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
  background: $color-bg;
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

  &__back-icon-img {
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
  padding-top: calc($top-height + var(--status-bar-height, 44rpx));
  height: 100vh;
  box-sizing: border-box;
}

/* 概览卡片 */
.overview-card {
  margin: 32rpx 48rpx 0;
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  border: 2rpx solid $color-border;
  padding: 40rpx;
  position: relative;
  overflow: hidden;

  &__decor {
    position: absolute;
    top: -32rpx;
    right: -32rpx;
    width: 280rpx;
    height: 280rpx;
    border-radius: $radius-full;
    background: #8AFEFC;
    opacity: 0.45;
    filter: blur(40rpx);
    z-index: 0;
  }

  &__title {
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
    font-weight: 700;
    color: $color-text;
    display: block;
    margin-bottom: 32rpx;
    position: relative;
    z-index: 1;
  }

  &__stats {
    display: flex;
    gap: 120rpx;
    margin-bottom: 32rpx;
    position: relative;
    z-index: 1;
  }

  &__stat {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__stat-label {
    font-size: 26rpx;
    color: $color-text-secondary;
  }

  &__stat-value {
    font-family: 'Noto Serif SC', serif;
    font-size: 72rpx;
    font-weight: 400;
    color: $color-text;
    line-height: 1;

    &--warn {
      color: $color-warn;
    }
  }

  &__divider {
    height: 2rpx;
    background: $color-line;
    margin-bottom: 24rpx;
    position: relative;
    z-index: 1;
  }

  &__sync-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    position: relative;
    z-index: 1;
  }

  &__sync-icon-img {
    width: 28rpx;
    height: 28rpx;
    opacity: 0.6;
  }

  &__sync-time {
    font-size: 26rpx;
    color: $color-text-secondary;
  }
}

/* 操作列表 */
.action-list {
  margin: 32rpx 48rpx 0;
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card;
  border: 2rpx solid $color-border;
  overflow: hidden;
}

.action-card {
  display: flex;
  align-items: center;
  padding: 32rpx 40rpx;
  gap: 32rpx;
  border-bottom: 2rpx solid $color-line;

  &:last-child {
    border-bottom: none;
  }

  &__icon-wrap {
    width: 80rpx;
    height: 80rpx;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &--primary {
      background: rgba(138, 154, 134, 0.15);
    }

    &--muted {
      background: rgba(51, 54, 52, 0.08);
    }

    &--danger {
      background: rgba(217, 138, 108, 0.12);
    }
  }

  &__icon-img {
    width: 36rpx;
    height: 36rpx;
  }

  &__label {
    flex: 1;
    font-size: 32rpx;
    color: $color-text;

    &--danger {
      color: $color-warn;
    }
  }

  &__arrow-icon {
    width: 32rpx;
    height: 32rpx;
    opacity: 0.6;
  }
}

.safe-bottom {
  height: 80rpx;
}
</style>
