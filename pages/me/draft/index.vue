<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon-img" src="/static/icons/draft-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/draft-topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">草稿箱</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">

      <!-- 顶部摘要行 -->
      <view v-if="drafts.length > 0" class="summary-row">
        <view class="summary-row__left">
          <text class="summary-row__count">共 {{ drafts.length }} 个草稿</text>
          <text class="summary-row__hint">管理待完善的物品</text>
        </view>
        <view class="summary-row__batch-btn" @tap="onToggleBatch">
          <text class="summary-row__batch-text">{{ isBatchMode ? '退出管理' : '批量管理' }}</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="drafts.length === 0" class="empty-state">
        <image class="empty-state__icon" src="/static/icons/library-kongzhuangtai.svg" mode="aspectFit" />
        <text class="empty-state__text">没有待完善的草稿</text>
        <text class="empty-state__hint">没收纳完的好物，会暂时留在这里。</text>
      </view>

      <!-- 草稿列表 -->
      <view v-else class="draft-list">
        <view v-for="draft in drafts" :key="draft.id" class="draft-card">
          <!-- 上半：物品信息 -->
          <view class="draft-card__main">
            <!-- 批量选择框 -->
            <view v-if="isBatchMode" class="draft-card__checkbox" @tap="onToggleSelect(draft.id)">
              <view class="checkbox-circle" :class="{ 'checkbox-circle--checked': selectedIds.includes(draft.id) }">
                <view v-if="selectedIds.includes(draft.id)" class="checkbox-inner" />
              </view>
            </view>
            
            <!-- 图片区 -->
            <view class="draft-card__img-wrap" :style="{ background: draft.imgBg }" @tap="isBatchMode ? onToggleSelect(draft.id) : null">
              <image
                v-if="draft.displayImageUrl || draft.originalImageUrl"
                class="draft-card__img"
                :src="draft.displayImageUrl || draft.originalImageUrl"
                mode="aspectFill"
              />
              <view v-else class="draft-card__img-empty">
                <image class="draft-card__img-empty-icon-img" src="/static/icons/draft-weimingming.svg" mode="aspectFit" />
              </view>
            </view>

            <!-- 文字信息 -->
            <view class="draft-card__info">
              <text class="draft-card__name">{{ draft.name }}</text>
              <text class="draft-card__time">最后编辑 {{ draft.lastEditTime }}</text>
              <view class="draft-card__tags">
                <view
                  v-for="tag in draft.missingFields"
                  :key="tag"
                  class="draft-tag"
                >
                  <text class="draft-tag__text">{{ tag }}</text>
                </view>
              </view>
            </view>
          </view>
          
          <block v-if="!isBatchMode">
            <!-- 分割线 -->
            <view class="draft-card__divider" />

            <!-- 下半：操作按钮 -->
            <view class="draft-card__actions">
              <view class="draft-card__btn-delete" @tap="onDelete(draft)">
                <text class="draft-card__btn-delete-text">删除</text>
              </view>
              <view class="draft-card__btn-edit" @tap="onContinueEdit(draft)">
                <text class="draft-card__btn-edit-text">继续编辑</text>
              </view>
            </view>
          </block>
        </view>
      </view>
      
      <view class="safe-bottom" />
    </scroll-view>

    <!-- 批量操作底部栏 -->
    <view v-if="isBatchMode" class="batch-bar">
      <view class="batch-bar__btn batch-bar__btn--cancel" @tap="onToggleBatch">
        <text class="batch-bar__btn-text">取消</text>
      </view>
      <view class="batch-bar__btn batch-bar__btn--delete" :class="{'batch-bar__btn--disabled': selectedIds.length === 0}" @tap="onBatchDelete">
        <text class="batch-bar__btn-text batch-bar__btn-text--primary">清理所选 ({{ selectedIds.length }})</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { draftService } from '../../../services/draftService.js'
import { dateUtils } from '../../../utils/dateUtils.js'
import { cloudStorageService } from '../../../services/cloudStorageService.js'

const drafts = ref<any[]>([])
const isBatchMode = ref(false)
const selectedIds = ref<string[]>([])

onShow(() => {
  isBatchMode.value = false
  selectedIds.value = []
  loadDrafts()
})

function loadDrafts() {
  const list = draftService.getDrafts()
  drafts.value = list.map(d => {
    let lastEditTime = ''
    if (d.updatedAt) {
      const date = new Date(d.updatedAt)
      lastEditTime = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
    return {
      ...d,
      name: d.name || '未命名好物',
      imgBg: '#F4F3F1',
      lastEditTime
    }
  })

  cloudStorageService.restoreItemDisplayImages(drafts.value).then(restored => {
    drafts.value = [...restored]
  })
}

function onBack() {
  uni.navigateBack()
}

function onToggleBatch() {
  isBatchMode.value = !isBatchMode.value
  if (!isBatchMode.value) {
    selectedIds.value = []
  }
}

function onToggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function onBatchDelete() {
  if (selectedIds.value.length === 0) {
    return uni.showToast({ title: '先选一下要清理的草稿', icon: 'none' })
  }
  uni.showModal({
    title: '清理这些草稿吗？',
    content: '清理后就不能从草稿箱找回了。',
    cancelText: '再想想',
    cancelColor: '#8A9A86',
    confirmText: '清理',
    confirmColor: '#D98A6C',
    success(res) {
      if (res.confirm) {
        let allSuccess = true
        selectedIds.value.forEach(id => {
          const result = draftService.deleteDraft(id)
          if (!result.success) allSuccess = false
        })
        if (allSuccess) {
          uni.showToast({ title: '清理成功', icon: 'success' })
        } else {
          uni.showToast({ title: '草稿暂时没清理成功，再试一下', icon: 'none' })
        }
        selectedIds.value = []
        loadDrafts()
        if (drafts.value.length === 0) {
          isBatchMode.value = false
        }
      }
    }
  })
}

function onDelete(draft: any) {
  uni.showModal({
    title: '删除这份草稿吗？',
    content: '删除后，小管家就不再替你保留这次填写啦。',
    cancelText: '再想想',
    cancelColor: '#8A9A86',
    confirmText: '删除',
    confirmColor: '#D98A6C',
    success(res) {
      if (res.confirm) {
        draftService.deleteDraft(draft.id)
        loadDrafts()
        uni.showToast({ title: '已清理这份草稿', icon: 'none' })
      }
    },
  })
}

function onContinueEdit(draft: any) {
  if (draft.source && draft.source !== 'add') {
    return uni.showToast({ title: '这份草稿暂时不能继续编辑', icon: 'none' })
  }
  uni.navigateTo({ url: `/pages/add/index?draftId=${draft.id}` })
}
</script>

<style lang="scss" scoped>
$color-bg: #FAF9F7;
$color-card: #FFFFFF;
$color-primary-dark: #536251;
$color-text: #333634;
$color-text-secondary: rgba(51, 54, 52, 0.64);
$color-warn: #D98A6C;
$color-expired: #A69B8D;
$color-line: rgba(51, 54, 52, 0.1);
$color-border: rgba(231, 225, 216, 0.8);
$shadow-card: 0 8rpx 48rpx rgba(51, 54, 52, 0.08);
$shadow-card-md: 0 12rpx 32rpx rgba(51, 54, 52, 0.12);
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

/* 顶部 */
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

/* 摘要行 */
.summary-row {
  padding: 32rpx 48rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &__left {
    display: flex;
    align-items: baseline;
    gap: 12rpx;
  }

  &__count {
    font-family: 'Noto Serif SC', serif;
    font-size: 36rpx;
    font-weight: 700;
    color: $color-text;
  }

  &__hint {
    font-size: 26rpx;
    color: $color-text-secondary;
  }

  &__batch-btn {
    background: rgba(51, 54, 52, 0.08);
    border-radius: 9999rpx;
    padding: 12rpx 32rpx;
  }

  &__batch-text {
    font-size: 28rpx;
    color: $color-text-secondary;
  }
}

/* 草稿列表 */
.draft-list {
  padding: 0 48rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.draft-card {
  background: $color-card;
  border-radius: $radius-card;
  box-shadow: $shadow-card-md;
  border: 2rpx solid $color-border;
  overflow: hidden;

  &__main {
    display: flex;
    flex-direction: row;
    padding: 32rpx;
    align-items: center;
  }

  &__checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60rpx;
    height: 160rpx;
    margin-right: 20rpx;
    flex-shrink: 0;
  }

  &__img-wrap {
    width: 160rpx;
    height: 160rpx;
    border-radius: 16rpx;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 32rpx;
    background: #F4F3F1;
  }

  &__img {
    width: 100%;
    height: 100%;
  }

  &__img-empty {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2rpx dashed rgba(51, 54, 52, 0.2);
    border-radius: 16rpx;
  }

  &__img-empty-icon-img {
    width: 52rpx;
    height: 52rpx;
    opacity: 0.3;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12rpx;
  }

  &__name {
    font-family: 'Noto Serif SC', serif;
    font-size: 34rpx;
    font-weight: 700;
    color: $color-text;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  &__time {
    font-size: 24rpx;
    color: $color-text-secondary;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
  }

  &__divider {
    height: 2rpx;
    background: $color-line;
    margin: 0 32rpx;
  }

  &__actions {
    display: flex;
    flex-direction: row;
    gap: 20rpx;
    padding: 24rpx 32rpx;
    justify-content: flex-end;
  }

  &__btn-delete {
    height: 72rpx;
    padding: 0 40rpx;
    border-radius: $radius-full;
    border: 2rpx solid $color-line;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__btn-delete-text {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__btn-edit {
    height: 72rpx;
    padding: 0 40rpx;
    border-radius: $radius-full;
    background: $color-primary-dark;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 16rpx rgba(83, 98, 81, 0.25);
  }

  &__btn-edit-text {
    font-size: 28rpx;
    color: #fff;
    font-weight: 700;
  }
}

.draft-tag {
  height: 48rpx;
  padding: 0 20rpx;
  background: rgba(217, 138, 108, 0.1);
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;

  &__text {
    font-size: 20rpx;
    color: $color-warn;
    font-weight: 500;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  
  &__icon {
    width: 160rpx;
    height: 160rpx;
    opacity: 0.5;
    margin-bottom: 24rpx;
  }
  
  &__text {
    font-size: 28rpx;
    color: $color-text-secondary;
    font-weight: 700;
  }

  &__hint {
    margin-top: 12rpx;
    font-size: 24rpx;
    color: $color-text-secondary;
  }
}

.safe-bottom {
  height: 200rpx;
}

/* 批量选择框 */
.checkbox-circle {
  width: 44rpx;
  height: 44rpx;
  border-radius: $radius-full;
  border: 2rpx solid rgba(51, 54, 52, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;

  &--checked {
    background: #8A9A86;
    border-color: #8A9A86;
  }
}

.checkbox-inner {
  width: 24rpx;
  height: 12rpx;
  border-left: 3rpx solid #fff;
  border-bottom: 3rpx solid #fff;
  transform: rotate(-45deg);
  margin-top: -6rpx;
}

/* 批量操作底部栏 */
.batch-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 160rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: #FAF9F7;
  box-shadow: 0 -4rpx 24rpx rgba(51, 54, 52, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 48rpx;
  padding-right: 48rpx;
  z-index: 100;

  &__btn {
    height: 88rpx;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;

    &--cancel {
      width: 240rpx;
      border: 2rpx solid $color-line;
      background: #FFFFFF;
    }

    &--delete {
      flex: 1;
      margin-left: 32rpx;
      background: $color-primary-dark;
      box-shadow: 0 4rpx 16rpx rgba(83, 98, 81, 0.25);
    }

    &--disabled {
      opacity: 0.4;
      box-shadow: none;
    }
  }

  &__btn-text {
    font-family: 'Noto Serif SC', serif;
    font-size: 32rpx;
    color: $color-text;
    font-weight: 500;

    &--primary {
      color: #fff;
      font-weight: 700;
    }
  }
}
</style>
