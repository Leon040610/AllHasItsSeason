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
          <view class="avatar-edit-btn" @tap="onChangeAvatar">
            <image class="avatar-edit-icon" src="/static/icons/me-profile-xiangji.svg" mode="aspectFit" />
          </view>
        </view>
        <view class="text-btn" @tap="onChangeAvatar">
          <text class="text-btn__text">修改头像</text>
        </view>
      </view>

      <!-- 昵称输入 -->
      <view class="form-section">
        <text class="form-section__label">昵称</text>
        <view class="form-input">
          <input 
            v-model="form.nickname" 
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
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { authService } from '../../../services/authService.js'

const form = ref({
  avatarUrl: '',
  nickname: ''
})

onShow(() => {
  const user = authService.getUser()
  form.value.avatarUrl = user.avatarUrl || ''
  form.value.nickname = user.nickname || '微信用户'
})

function goBack() {
  uni.navigateBack()
}

function onChangeAvatar() {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      form.value.avatarUrl = res.tempFilePaths[0]
    }
  })
}

function onLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    confirmColor: '#536251',
    success: (res) => {
      if (res.confirm) {
        authService.logout()
        uni.showToast({ title: '已退出', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1000)
      }
    }
  })
}

async function onSave() {
  const trimmedNickname = (form.value.nickname || '').trim()
  if (!trimmedNickname) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }

  // 头像：本阶段只更新本地，不上传云端
  authService.updateProfile({ avatarUrl: form.value.avatarUrl })

  // 昵称：本地优先保存，异步同步云端（失败时本地保留，服务内部会 toast 提示）
  await authService.updateNickname(trimmedNickname)

  uni.showToast({ title: '修改已保存', icon: 'success' })
  setTimeout(() => {
    uni.navigateBack()
  }, 1000)
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
