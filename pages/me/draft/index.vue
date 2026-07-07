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
      <view class="summary-row">
        <view class="summary-row__left">
          <text class="summary-row__count">共 {{ drafts.length }} 个草稿</text>
          <text class="summary-row__hint">管理待完善的物品</text>
        </view>
        <view class="summary-row__batch-btn" @tap="onBatchManage">
          <text class="summary-row__batch-text">批量管理</text>
        </view>
      </view>

      <!-- 草稿列表 -->
      <view class="draft-list">
        <view v-for="draft in drafts" :key="draft.id" class="draft-card">
          <!-- 上半：物品信息 -->
          <view class="draft-card__main">
            <!-- 图片区 -->
            <view class="draft-card__img-wrap" :style="{ background: draft.imgBg }">
              <image
                v-if="draft.imageUrl"
                class="draft-card__img"
                :src="draft.imageUrl"
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
                  v-for="tag in draft.tags"
                  :key="tag"
                  class="draft-tag"
                >
                  <text class="draft-tag__text">{{ tag }}</text>
                </view>
              </view>
            </view>
          </view>

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
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface DraftItem {
  id: string
  name: string
  imageUrl: string
  imgBg: string
  lastEditTime: string
  tags: string[]
}

const drafts = ref<DraftItem[]>([
  {
    id: '1',
    name: '海蓝之谜面霜',
    imageUrl: '/static/icons/draft-cream.svg',
    imgBg: '#F4EDE5',
    lastEditTime: '2023.10.24 14:30',
    tags: ['待确认到期日'],
  },
  {
    id: '2',
    name: '未命名物品',
    imageUrl: '',
    imgBg: '#E8EDE7',
    lastEditTime: '2023.10.24 11:05',
    tags: ['缺失图片', '待补充分类'],
  },
  {
    id: '3',
    name: '植萃洗衣液',
    imageUrl: '/static/icons/draft-laundry detergent.svg',
    imgBg: '#F4F3F1',
    lastEditTime: '2023.10.23 20:15',
    tags: ['待确认到期日'],
  },
])

function onBack() {
  uni.navigateBack()
}

function onBatchManage() {
  uni.showToast({ title: '批量管理功能即将上线', icon: 'none' })
}

function onDelete(draft: DraftItem) {
  uni.showModal({
    title: '确认删除此草稿？',
    content: '删除后无法恢复，请确认。',
    confirmText: '删除',
    confirmColor: '#D98A6C',
    cancelText: '取消',
    success(res) {
      if (res.confirm) {
        const index = drafts.value.findIndex(d => d.id === draft.id)
        if (index > -1) drafts.value.splice(index, 1)
        uni.showToast({ title: '草稿已删除', icon: 'none' })
      }
    },
  })
}

function onContinueEdit(draft: DraftItem) {
  uni.navigateTo({ url: `/pages/add/index?mode=draft&id=${draft.id}` })
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
  padding-top: $top-height;
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
    border-radius: $radius-full;
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
    gap: 0;
    padding: 32rpx;
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
  border-radius: $radius-full;
  background: rgba(217, 138, 108, 0.12);
  display: flex;
  align-items: center;

  &__text {
    font-size: 24rpx;
    color: $color-warn;
  }
}

.safe-bottom {
  height: 80rpx;
}
</style>
