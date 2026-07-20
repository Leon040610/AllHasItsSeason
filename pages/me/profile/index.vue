<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="top-bar">
      <view class="top-bar__left" @tap="goBack">
        <image class="top-bar__back-icon" src="/static/icons/add-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__icon" src="/static/icons/me-topIcon.svg" mode="aspectFit" />
        <text class="top-bar__title">个人信息</text>
      </view>
      <view class="top-bar__right"></view>
    </view>

    <scroll-view class="scroll-body" scroll-y enhanced :show-scrollbar="false">
      <!-- 头像区域 -->
      <view class="profile-photo-section">
        <button
          class="avatar-chooser-btn"
          open-type="chooseAvatar"
          @chooseavatar="onChooseAvatar"
        >
          <view class="avatar-container">
            <view class="avatar-wrap">
              <image 
                v-if="form.avatarUrl" 
                class="avatar-img" 
                :src="form.avatarUrl" 
                mode="aspectFill" 
              />
              <view v-else class="avatar-placeholder"></view>
            </view>
            <view class="avatar-edit-btn">
              <image class="avatar-edit-icon" src="/static/icons/me-profile-xiangji.svg" mode="aspectFit" />
            </view>
          </view>
          <view class="text-btn">
            <text class="text-btn__text">修改头像</text>
          </view>
        </button>
      </view>

      <!-- 昵称输入 -->
      <view class="form-section">
        <text class="form-section__label">昵称</text>
        <view class="form-input">
          <input 
            type="nickname"
            v-model="form.nickname" 
            @blur="onNicknameBlur"
            placeholder="输入昵称" 
            placeholder-class="form-input__placeholder"
            class="form-input__inner"
          />
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作区 -->
    <view class="bottom-action">
      <view class="text-btn text-btn--logout" @tap="onLogout">
        <text class="text-btn__text">退出登录</text>
      </view>
      <view class="btn-save" @tap="onSave">
        <image class="btn-save__icon" src="/static/icons/me-profile-baocunxiugai.svg" mode="aspectFit" />
        <text class="btn-save__text">保存修改</text>
      </view>
    </view>
    <BrandConfirmDialog :dialog="dialog" @confirm="onDialogConfirm" @cancel="onDialogCancel" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { authService } from '../../../services/authService.js'
import BrandConfirmDialog from '../../../components/BrandConfirmDialog.vue'
import { useBrandConfirmDialog } from '../../../utils/useBrandConfirmDialog.js'

const form = ref({
  avatarUrl: '',
  nickname: ''
})
const { dialog, confirm, onConfirm: onDialogConfirm, onCancel: onDialogCancel } = useBrandConfirmDialog()

onShow(() => {
  const user = authService.getUser()
  form.value.avatarUrl = user.avatarUrl || ''
  form.value.nickname = user.nickname || '万物旅人'
})

function goBack() {
  uni.navigateBack()
}

function onChooseAvatar(e: any) {
  form.value.avatarUrl = e.detail.avatarUrl
}

function onNicknameBlur() {
  // 微信会在 blur 时异步做内容安全检测
  // 检测不通过会自动清空输入框，此处不需要额外处理
}

async function onLogout() {
  const result = await confirm({
    title: '提示',
    content: '确定要退出登录吗？',
  })
  if (!result.confirm) return

  try {
    await authService.logout()
    uni.showToast({ title: '已退出', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/me/index' })
    }, 600)
  } catch (err) {
    uni.showToast({ title: '退出没有完成，请稍后再试', icon: 'none' })
  }
}

async function onSave() {
  const trimmedNickname = (form.value.nickname || '').trim()
  if (!trimmedNickname) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }

  uni.showLoading({ title: '保存中', mask: true })

  try {
    // 1. 头像：如果有更改，上传到云存储并更新档案
    if (form.value.avatarUrl && form.value.avatarUrl !== authService.getUser().avatarUrl) {
      await authService.updateAvatar(form.value.avatarUrl)
    }

    // 2. 昵称：本地优先保存，异步同步云端
    await authService.updateNickname(trimmedNickname)

    uni.hideLoading()
    uni.showToast({ title: '修改已保存', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
$color-bg: #F9F8F6;
$color-primary-dark: #536251;
$color-text: #1A1C1B;

.page {
  width: 100%;
  height: 100vh;
  background: $color-bg;
  display: flex;
  flex-direction: column;
  font-family: 'Noto Serif SC', serif;
}

/* 顶部导航 */
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

  &__left, &__right {
    width: 88rpx;
    height: 100%;
    display: flex;
    align-items: center;
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

  &__icon {
    width: 32rpx;
    height: 32rpx;
  }

  &__title {
    font-size: 36rpx;
    font-weight: 700;
    color: $color-primary-dark;
  }
}

.scroll-body {
  flex: 1;
  padding: calc(120rpx + var(--status-bar-height, 44rpx) + 48rpx) 48rpx 320rpx;
  box-sizing: border-box;
}

/* 头像区域 */
.profile-photo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
  margin-bottom: 64rpx;
}

.avatar-chooser-btn {
  background: none !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  line-height: normal !important;
  width: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
  &::after {
    display: none;
  }
}

.avatar-container {
  position: relative;
}

.avatar-wrap {
  width: 256rpx;
  height: 256rpx;
  border-radius: 50%;
  background: #EFEEEC;
  border: 8rpx solid #FFFFFF;
  box-shadow: 0 4rpx 8rpx -4rpx rgba(0, 0, 0, 0.1), 0 8rpx 12rpx -2rpx rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: #E9EDEA;
}

.avatar-edit-btn {
  position: absolute;
  bottom: 0;
  right: 16rpx;
  width: 72rpx;
  height: 72rpx;
  background: #8A9A86;
  border: 4rpx solid #FAF9F7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 12rpx -8rpx rgba(0, 0, 0, 0.1), 0 20rpx 30rpx -6rpx rgba(0, 0, 0, 0.1);
}

.avatar-edit-icon {
  width: 36rpx;
  height: 36rpx;
}

.text-btn {
  padding: 16rpx;
  display: flex;
  justify-content: center;

  &__text {
    font-size: 28rpx;
    font-weight: 500;
    color: $color-primary-dark;
  }

  &--logout {
    margin-bottom: 32rpx;
  }
}

/* 昵称输入 */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  &__label {
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text;
    padding: 0 8rpx;
  }
}

.form-input {
  background: #FFFFFF;
  border: 2rpx solid #C4C8BF;
  border-radius: 24rpx;
  padding: 32rpx;
  
  &__inner {
    font-size: 32rpx;
    color: $color-text;
    width: 100%;
  }

  &__placeholder {
    color: #747871;
  }
}

/* 底部操作区 */
.bottom-action {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 48rpx 48rpx calc(48rpx + env(safe-area-inset-bottom));
  background: rgba(250, 249, 247, 0.9);
  backdrop-filter: blur(4rpx);
  z-index: 99;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.btn-save {
  width: 100%;
  height: 112rpx;
  background: $color-primary-dark;
  border-radius: 9999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  box-shadow: 0 8rpx 12rpx 0 rgba(0, 0, 0, 0.1), 0 20rpx 30rpx 0 rgba(0, 0, 0, 0.1);

  &__icon {
    width: 36rpx;
    height: 36rpx;
  }

  &__text {
    font-size: 32rpx;
    color: #FFF;
    font-weight: 600;
  }
}
</style>

<style>
page {
  background-color: #F9F8F6;
}
</style>
