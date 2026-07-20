<template>
  <view v-if="dialog.visible" class="dialog-mask" @tap.stop>
    <view class="dialog-card" :class="{ 'dialog-card--guide': dialog.imageSrc }" @tap.stop>
      <text class="dialog-card__title">{{ dialog.title }}</text>

      <scroll-view class="dialog-card__body" :class="{ 'dialog-card__body--scroll': dialog.imageSrc }" :scroll-y="!!dialog.imageSrc">
        <image v-if="dialog.imageSrc" class="dialog-card__image" :src="dialog.imageSrc" mode="widthFix" />

        <view v-if="dialog.paragraphs && dialog.paragraphs.length" class="dialog-card__paragraphs">
          <text
            v-for="paragraph in dialog.paragraphs"
            :key="paragraph"
            class="dialog-card__content"
            :class="{ 'dialog-card__content--italic': dialog.italicContent }"
          >{{ paragraph }}</text>
        </view>
        <text v-else-if="dialog.content" class="dialog-card__content">{{ dialog.content }}</text>

        <view v-if="dialog.steps && dialog.steps.length" class="dialog-card__steps">
          <view v-for="(step, index) in dialog.steps" :key="step" class="dialog-card__step">
            <text class="dialog-card__step-number">{{ index + 1 }}.</text>
            <text class="dialog-card__step-text">{{ step }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="dialog-card__actions" :class="{ 'dialog-card__actions--single': !dialog.showCancel }">
        <view v-if="dialog.showCancel" class="dialog-card__action dialog-card__action--cancel" @tap="onCancel">
          <text class="dialog-card__action-text">{{ dialog.cancelText }}</text>
        </view>
        <view
          class="dialog-card__action"
          :class="{
            'dialog-card__action--single': !dialog.showCancel,
            'dialog-card__action--danger': dialog.destructive,
          }"
          @tap="onConfirm"
        >
          <text class="dialog-card__action-text dialog-card__action-text--confirm">{{ dialog.confirmText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  dialog: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['confirm', 'cancel'])

function onConfirm() {
  emit('confirm')
}

function onCancel() {
  emit('cancel')
}
</script>

<style lang="scss" scoped>
$color-bg: #F4EFEA;
$color-primary-dark: #536251;
$color-text: #333634;
$color-text-secondary: rgba(51, 54, 52, 0.68);
$color-cancel: #A69B8D;
$color-danger: #D98A6C;
$color-line: rgba(51, 54, 52, 0.1);

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 48rpx;
  background: rgba(51, 54, 52, 0.5);
}

.dialog-card {
  width: 100%;
  max-width: 620rpx;
  overflow: hidden;
  background: $color-bg;
  border: 2rpx solid rgba(255, 255, 255, 0.68);
  border-radius: 40rpx;
  box-shadow: 0 24rpx 80rpx rgba(51, 54, 52, 0.24);

  &--guide {
    height: calc(100vh - 160rpx);
    max-height: 1100rpx;
    display: flex;
    flex-direction: column;
  }

  &__title {
    display: block;
    padding: 48rpx 48rpx 0;
    font-family: 'Noto Serif SC', serif;
    font-size: 38rpx;
    font-weight: 700;
    line-height: 56rpx;
    color: $color-text;
    text-align: center;
  }

  &__body {
    box-sizing: border-box;
    padding: 28rpx 48rpx 44rpx;

    &--scroll {
      flex: 1;
      min-height: 0;
    }
  }

  &__image {
    width: 100%;
    margin-bottom: 28rpx;
    border-radius: 24rpx;
    background: #F4EFEA;
  }

  &__paragraphs {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }

  &__content {
    display: block;
    font-family: 'Noto Serif SC', serif;
    font-size: 28rpx;
    line-height: 48rpx;
    color: $color-text-secondary;
    text-align: center;
    white-space: pre-line;

    &--italic {
      font-style: italic;
    }
  }

  &__steps {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    margin-top: 28rpx;
  }

  &__step {
    display: flex;
    align-items: flex-start;
    gap: 10rpx;
  }

  &__step-number,
  &__step-text {
    font-family: 'Noto Serif SC', serif;
    font-size: 26rpx;
    line-height: 44rpx;
    color: $color-text-secondary;
  }

  &__step-number {
    flex-shrink: 0;
    color: $color-primary-dark;
    font-weight: 700;
  }

  &__step-text {
    flex: 1;
  }

  &__actions {
    display: flex;
    min-height: 104rpx;
    border-top: 2rpx solid $color-line;

    &--single {
      display: block;
    }
  }

  &__action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 104rpx;

    &--cancel {
      border-right: 2rpx solid $color-line;

      .dialog-card__action-text {
        color: $color-cancel;
      }
    }

    &--single {
      width: 100%;
    }

    &--danger .dialog-card__action-text--confirm {
      color: $color-danger;
    }
  }

  &__action-text {
    font-family: 'Noto Serif SC', serif;
    font-size: 32rpx;
    font-weight: 700;
    color: $color-primary-dark;

    &--confirm {
      color: $color-primary-dark;
    }
  }
}
</style>
