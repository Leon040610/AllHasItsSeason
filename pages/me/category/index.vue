<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__left" @tap="goBack">
        <image class="top-bar__back-icon" src="/static/icons/add-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__icon" src="/static/icons/me-topIcon.svg" mode="aspectFit" />
        <text class="top-bar__title">分类设置</text>
      </view>
      <view class="top-bar__right"></view>
    </view>

    <!-- 主体滚动区域 -->
    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">
      <view class="category-list">
        <!-- 分类卡片列表 -->
        <view 
          v-for="(cat, index) in categoryList" 
          :key="cat.id" 
          class="category-card"
          :class="{ 'is-dragging': dragIndex === index }"
          :style="dragIndex === index ? `transform: translateY(${dragY}px); z-index: 999; position: relative; box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.1);` : 'transition: transform 0.2s; z-index: 1; position: relative;'"
        >
          <view class="category-card__icon-wrap" :style="{ background: cat.backgroundColor }">
            <view v-if="cat.icon" class="category-card__icon-box">
              <image class="category-card__icon" :src="cat.icon" :style="{ filter: 'drop-shadow(100px 0 0 ' + cat.iconColor + ')' }" mode="aspectFit" />
            </view>
            <view v-else class="category-card__icon-placeholder" :style="{ background: cat.iconColor }"></view>
          </view>
          
          <!-- 信息 -->
          <view class="category-card__info">
            <text class="category-card__name">{{ cat.name }}</text>
            <text class="category-card__count">{{ cat.itemCount }} 件物品</text>
          </view>
          
          <!-- 操作区 -->
          <view class="category-card__actions">
            <!-- 编辑 -->
            <view class="action-btn" @tap="onEditCategory(cat)">
              <image class="action-btn__icon" src="/static/icons/me-category-bianji.svg" mode="aspectFit" />
            </view>
            <!-- 删除 -->
            <view class="action-btn" @tap="onDeleteCategory(cat)">
              <image class="action-btn__icon" src="/static/icons/me-category-shanchu.svg" mode="aspectFit" />
            </view>
            <!-- 拖拽手柄 -->
            <view class="action-btn drag-handle"
              @touchstart.stop.prevent="onDragStart($event, index)"
              @touchmove.stop.prevent="onDragMove"
              @touchend.stop="onDragEnd"
              @touchcancel.stop="onDragEnd"
            >
              <image class="action-btn__icon action-btn__icon--drag" src="/static/icons/me-category-tuodong.svg" mode="aspectFit" />
            </view>
          </view>
        </view>

        <!-- 添加自定义分类按钮 -->
        <view class="add-btn" @tap="onAddCategory">
          <image class="add-btn__icon" src="/static/icons/me-category-tianjia.svg" mode="aspectFit" />
          <text class="add-btn__text">添加自定义分类</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部固定操作区 -->
    <view class="bottom-action">
      <view class="btn-save" @tap="onSaveSettings">
        <text class="btn-save__text">保存设置</text>
      </view>
    </view>
    <BrandConfirmDialog :dialog="dialog" @confirm="onDialogConfirm" @cancel="onDialogCancel" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { categoryService } from '../../../services/categoryService.js'
import BrandConfirmDialog from '../../../components/BrandConfirmDialog.vue'
import { useBrandConfirmDialog } from '../../../utils/useBrandConfirmDialog.js'

const categoryList = ref<any[]>([])
const { dialog, confirm, onConfirm: onDialogConfirm, onCancel: onDialogCancel } = useBrandConfirmDialog()

// 拖拽相关状态
const dragIndex = ref(-1)
const dragY = ref(0)
let startY = 0
let itemHeightPx = 0

onShow(() => {
  loadCategories()
})

function initDrag() {
  const sys = uni.getSystemInfoSync()
  // 156 (card height) + 20 (gap) = 176rpx
  itemHeightPx = 176 * (sys.windowWidth / 750)
}

function onDragStart(e: any, index: number) {
  if (itemHeightPx === 0) initDrag()
  dragIndex.value = index
  startY = e.touches[0].clientY
  dragY.value = 0
  uni.vibrateShort({ type: 'light' })
}

function onDragMove(e: any) {
  if (dragIndex.value === -1) return
  const currentY = e.touches[0].clientY
  dragY.value = currentY - startY
  
  const moveSlots = Math.round(dragY.value / itemHeightPx)
  if (moveSlots !== 0) {
    let targetIndex = dragIndex.value + moveSlots
    if (targetIndex < 0) targetIndex = 0
    if (targetIndex >= categoryList.value.length) targetIndex = categoryList.value.length - 1
    
    if (targetIndex !== dragIndex.value) {
      const list = [...categoryList.value]
      const temp = list[dragIndex.value]
      list.splice(dragIndex.value, 1)
      list.splice(targetIndex, 0, temp)
      categoryList.value = list
      
      const actualMovedSlots = targetIndex - dragIndex.value
      dragIndex.value = targetIndex
      startY += actualMovedSlots * itemHeightPx
      dragY.value = currentY - startY
      uni.vibrateShort({ type: 'light' })
    }
  }
}

function onDragEnd() {
  if (dragIndex.value !== -1) {
    dragIndex.value = -1
    dragY.value = 0
  }
}

function loadCategories() {
  categoryList.value = categoryService.getCategories()
}

function goBack() {
  uni.navigateBack()
}

function onEditCategory(cat: any) {
  uni.navigateTo({ url: `/pages/me/category/edit?id=${cat.id}&name=${encodeURIComponent(cat.name)}` })
}

async function onDeleteCategory(cat: any) {
  const result = await confirm({
    title: '确认删除',
    content: `确定要删除分类“${cat.name}”吗？`,
    destructive: true,
  })
  if (!result.confirm) return

  const deleteResult = categoryService.deleteCategory(cat.id)
  if (deleteResult.success) {
    uni.showToast({ title: '已删除', icon: 'success' })
    loadCategories()
  } else {
    uni.showToast({ title: deleteResult.message, icon: 'none' })
  }
}

function onAddCategory() {
  uni.navigateTo({ url: '/pages/me/category/edit' })
}

function onSaveSettings() {
  // 保存排序
  categoryList.value.forEach((cat, index) => {
    categoryService.updateCategory(cat.id, { sortOrder: index + 1 })
  })
  
  uni.showToast({ title: '已保存', icon: 'success' })
  setTimeout(() => {
    uni.navigateBack()
  }, 1000)
}
</script>

<style lang="scss" scoped>
$color-bg: #F9F8F6;
$color-card: #FFFFFF;
$color-primary: #8A9A86;
$color-primary-dark: #536251;
$color-text: #333634;
$color-text-secondary: rgba(51, 54, 52, 0.64);
$color-border: rgba(231, 225, 216, 0.8);
$shadow-card: 0 8rpx 48rpx rgba(51, 54, 52, 0.08);

.page {
  width: 100%;
  height: 100vh;
  background: $color-bg;
  display: flex;
  flex-direction: column;
  font-family: 'Noto Serif SC', serif;
}

/* 顶部导航 (三段式) */
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
  padding-left: 48rpx;
  padding-right: 48rpx;
  border-bottom: 2rpx solid rgba(51, 54, 52, 0.08);
  box-shadow: 0 16rpx 48rpx rgba(51, 54, 52, 0.1);

  &__left {
    width: 88rpx;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  &__back-icon {
    width: 36rpx;
    height: 36rpx;
  }

  &__center {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
  }

  &__icon {
    width: 32rpx;
    height: 32rpx;
  }

  &__title {
    font-size: 36rpx;
    font-weight: 700;
    color: $color-primary-dark;
  }

  &__right {
    width: 88rpx;
  }
}

.scroll-body {
  flex: 1;
  padding-top: calc(120rpx + var(--status-bar-height, 44rpx));
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}

.category-list {
  padding: 32rpx 48rpx 200rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 分类卡片 */
.category-card {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: $color-card;
  border: 2rpx solid #E7E1D8;
  border-radius: 32rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);

  &__icon-wrap {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
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

  &__icon {
    width: 40rpx;
    height: 40rpx;
    transform: translateX(-100px);
    display: block;
  }

  &__icon-placeholder {
    width: 40rpx;
    height: 40rpx;
    border-radius: 8rpx;
  }

  &__info {
    flex: 1;
    margin-left: 24rpx;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: #1A1C1B;
  }

  &__count {
    font-size: 26rpx;
    color: #444842;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }
}

.action-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &__icon {
    width: 28rpx;
    height: 28rpx;

    &--drag {
      width: 40rpx;
      height: 12rpx;
    }
  }
}

/* 添加自定义分类按钮 */
.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  margin-top: 12rpx;
  border: 4rpx dashed #C4C8BF;
  border-radius: 32rpx;
  gap: 16rpx;

  &__icon {
    width: 40rpx;
    height: 40rpx;
  }

  &__text {
    font-size: 32rpx;
    font-weight: 500;
    color: #444842;
  }
}

/* 底部操作区 */
.bottom-action {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 32rpx 48rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  background: rgba(250, 249, 247, 0.9);
  backdrop-filter: blur(24rpx);
  z-index: 99;
}

.btn-save {
  width: 100%;
  height: 120rpx;
  background: $color-primary-dark;
  border-radius: 9999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.05);

  &__text {
    font-size: 40rpx;
    color: #FFF;
    font-weight: 400;
  }
}
</style>

<style>
page {
  background-color: #F9F8F6;
}
</style>
