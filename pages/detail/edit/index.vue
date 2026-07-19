<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top-bar">
      <view class="top-bar__back" @tap="onBack">
        <image class="top-bar__back-icon" src="/static/icons/detail-fanhui.svg" mode="aspectFit" />
      </view>
      <view class="top-bar__center">
        <image class="top-bar__leaf" src="/static/icons/detail-topIcon-yezi.svg" mode="aspectFit" />
        <text class="top-bar__title">编辑信息</text>
      </view>
      <view class="top-bar__placeholder" />
    </view>

    <scroll-view v-if="item" class="scroll-body" scroll-y enhanced :show-scrollbar="false">

      <!-- Hero 图片区 -->
      <view class="hero-section" @tap="onChooseImage">
        <view class="hero-img-wrap">
          <image
            class="hero-img"
            :src="isUsingOriginal ? originalImagePath : (stickerImagePath || item.displayImageUrl || item.imageUrl)"
            mode="aspectFit"
            :style="{ transform: `rotate(${isUsingOriginal ? 0 : item.rotation}deg)` }"
          />
        </view>
      </view>

      <!-- 图片操作区 -->
      <view class="img-actions">
        <view v-if="hasDisplayAlternative" class="img-action-btn" @tap="onUseOriginal">
          <text class="img-action-btn__text">{{ isUsingOriginal ? '撤销原图' : '使用原图' }}</text>
        </view>
      </view>

      <!-- 名称 (点击切换 input) -->
      <view class="info-header" @tap="nameFocused = true">
        <text
          v-if="!nameFocused"
          class="info-header__name"
        >{{ item.name || '请输入物品名称' }}</text>
        <input
          v-else
          class="info-header__name-input"
          v-model="item.name"
          :focus="true"
          placeholder="请输入物品名称"
          @blur="nameFocused = false"
          style="font-family: 'Noto Serif SC', serif; font-weight: 700;"
        />
      </view>

      <!-- 三列关键信息 -->
      <view class="meta-row">
        <view class="meta-col" @tap="onPickCategory">
          <text class="meta-col__label">分类</text>
          <view class="meta-col__value-row">
            <text class="meta-col__value">{{ item.categoryLabel }}</text>
            <image class="arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
          </view>
        </view>
        <view class="meta-col" @tap="onPickStatus">
          <text class="meta-col__label">状态</text>
          <view class="meta-col__value-row">
            <text class="meta-col__value">{{ pureStatusLabel }}</text>
            <image class="arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
          </view>
        </view>
        <view class="meta-col">
          <text class="meta-col__label">剩余时间</text>
          <text
            class="meta-col__value"
            :class="computedDaysLeftText.startsWith('已过期') ? 'meta-col__value--expired' : 'meta-col__value--warn'"
          >{{ computedDaysLeftText }}</text>
        </view>
      </view>

      <!-- 效期方式选择 -->
      <view class="expiry-mode-card">
        <view class="mode-btn" :class="{'mode-btn--active': item.expiryMode === 'normal'}" @tap="item.expiryMode = 'normal'">普通效期</view>
        <view class="mode-btn" :class="{'mode-btn--active': item.expiryMode === 'after_opening'}" @tap="item.expiryMode = 'after_opening'">开封后效期</view>
        <view class="mode-btn" :class="{'mode-btn--active': item.expiryMode === 'dual'}" @tap="item.expiryMode = 'dual'">双效期</view>
      </view>

      <!-- 日期信息卡片 -->
      <view class="date-card">
        <block v-if="item.expiryMode === 'normal' || item.expiryMode === 'dual'">
          <picker mode="date" @change="onProduceDateChange">
            <view class="date-card__row">
              <text class="date-card__label">生产日期</text>
              <view class="date-card__value-row">
                <text class="date-card__value">{{ item.produceDateLabel || '请选择' }}</text>
                <image class="arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
              </view>
            </view>
          </picker>
          <view class="date-card__divider" />
          <view class="date-card__row">
            <text class="date-card__label">保质期</text>
            <view class="date-card__value-row">
              <view class="shelf-input-wrap" @tap="shelfFocused = true">
                <text
                  v-if="!shelfFocused"
                  class="shelf-input-text"
                >{{ item.shelfLife || '0' }}</text>
                <input
                  v-else
                  class="shelf-input"
                  type="number"
                  v-model="item.shelfLife"
                  :focus="true"
                  @blur="shelfFocused = false"
                />
              </view>
              <view class="unit-select" @tap="onPickUnit('normal')">
                <text class="date-card__value">{{ item.shelfUnit }}</text>
                <image class="arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
              </view>
            </view>
          </view>
          <view class="date-card__divider" />
          <view class="date-card__row">
            <text class="date-card__label">包装到期日</text>
            <text class="date-card__value" style="color: #A69B8D">{{ computedExpireDateLabel }}</text>
          </view>
        </block>

        <block v-if="item.expiryMode === 'dual'">
          <view class="date-card__divider" style="margin: 16rpx 0; height: 1rpx; background: transparent;" />
        </block>

        <block v-if="item.expiryMode === 'after_opening' || item.expiryMode === 'dual'">
          <picker mode="date" @change="onOpenDateChange">
            <view class="date-card__row">
              <text class="date-card__label">开封日期</text>
              <view class="date-card__value-row">
                <text class="date-card__value">{{ item.openDateLabel || '请选择' }}</text>
                <image class="arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
              </view>
            </view>
          </picker>
          <view class="date-card__divider" />
          <view class="date-card__row">
            <text class="date-card__label">开封后保质期</text>
            <view class="date-card__value-row">
              <view class="shelf-input-wrap" @tap="afterShelfFocused = true">
                <text
                  v-if="!afterShelfFocused"
                  class="shelf-input-text"
                >{{ item.afterOpeningShelfLife || '0' }}</text>
                <input
                  v-else
                  class="shelf-input"
                  type="number"
                  v-model="item.afterOpeningShelfLife"
                  :focus="true"
                  @blur="afterShelfFocused = false"
                />
              </view>
              <view class="unit-select" @tap="onPickUnit('after_opening')">
                <text class="date-card__value">{{ item.afterOpeningShelfUnitLabel || item.afterOpeningShelfUnit }}</text>
                <image class="arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
              </view>
            </view>
          </view>
          <view class="date-card__divider" />
          <view class="date-card__row">
            <text class="date-card__label">开封后到期日</text>
            <text class="date-card__value" style="color: #A69B8D">{{ computedOpenedExpireDateLabel }}</text>
          </view>
        </block>
        <view class="date-card__divider" />
        <view class="date-card__row" @tap="onPickReminder">
          <text class="date-card__label">到期提醒</text>
          <view class="date-card__value-row">
            <text class="date-card__value">{{ item.remindDays === 0 ? '不提醒' : `提前 ${item.remindDays} 天` }}</text>
            <image class="arrow-icon" src="/static/icons/add-xuanze.svg" mode="aspectFit" />
          </view>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

    <!-- 隐藏的 Canvas，用于绘制贴纸 -->
    <canvas type="2d" id="stickerCanvas" class="hidden-canvas"></canvas>

    <!-- 底部操作栏 -->
    <view v-if="item" class="bottom-actions">
      <view class="bottom-actions__inner">
        <view class="action-btn-save" @tap="onSave">
          <text class="action-btn-save__text">保存修改</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { itemService } from '../../../services/itemService.js'
import { settingsService } from '../../../services/settingsService.js'
import { subscriptionMessageService } from '../../../services/subscriptionMessageService.js'
import { cloudStorageService } from '../../../services/cloudStorageService.js'
import { imageCanvasService } from '../../../services/imageCanvasService.js'
import { calculateExpiryDate, calculateAfterOpeningDate, getDaysDifference, getTodayStr, formatDate, determineActiveExpiry } from '../../../utils/dateUtils.js'
import { isStoredLoggedIn } from '../../../utils/authSessionStore.js'

const instance = getCurrentInstance()
const item = ref<any>(null)
let currentId = ''
const initialRemindDays = ref(0)
const initialActiveExpiryDate = ref('')
const initialReminderStatus = ref('')

const pureStatusLabel = computed(() => {
  if (!item.value) return ''
  if (item.value.displayStatus === 'expired') return '已过期'
  if (item.value.displayStatus === 'incomplete') return '待补全'
  if (item.value.status === 'using') return '使用中'
  if (item.value.status === 'done') return '已用完'
  if (item.value.status === 'deleted') return '已删除'
  return '待取用'
})

const nameFocused = ref(false)
const shelfFocused = ref(false)
const afterShelfFocused = ref(false)
const originalImagePath = ref('')
const isUsingOriginal = ref(false)
const processStatus = ref<'idle' | 'success' | 'fallback' | 'error' | 'uploading' | 'cutting'>('idle')
const currentImageRevision = ref(0)
const localImageExt = ref('jpg')
const isSaving = ref(false)
const hasPendingImageChange = ref(false)
const initialUseOriginal = ref(false)
const stickerImagePath = ref('')

const hasDisplayAlternative = computed(() => {
  return Boolean(originalImagePath.value && stickerImagePath.value && stickerImagePath.value !== originalImagePath.value)
})

onLoad((options: any) => {
  if (options && options.id) {
    currentId = options.id
  }
})

onShow(() => {
  if (currentId) {
    loadItem()
  } else {
    showFallback()
  }
})

function loadItem() {
  const found = itemService.getViewItemById(currentId)
  if (found) {
    // Only set if not already editing to avoid overriding unsaved changes if onShow runs again (e.g. returning from chooseImage)
    if (!item.value || item.value.id !== found.id) {
      item.value = { ...found } // Create a copy for editing
      initialRemindDays.value = Number(found.remindDays) || 0
      initialActiveExpiryDate.value = found.activeExpiryDate || ''
      initialReminderStatus.value = found.status || ''
      originalImagePath.value = found.originalImageUrl || found.imageUrl
      const storedItem = itemService.getItemById(currentId)
      currentImageRevision.value = storedItem?.imageRevision || 0
      processStatus.value = storedItem?.imageProcessStatus || 'idle'
      isUsingOriginal.value = !found.displayImageUrl || found.displayImageUrl === originalImagePath.value
      initialUseOriginal.value = isUsingOriginal.value
      const stickerFileId = found.stickerImageCloudFileId || (
        found.displayImageCloudFileId !== found.originalImageCloudFileId ? found.displayImageCloudFileId : ''
      )
      stickerImagePath.value = stickerFileId || (
        found.displayImageUrl !== originalImagePath.value ? found.displayImageUrl : ''
      )
      if (stickerFileId) {
        cloudStorageService.resolveImageUrl(stickerFileId).then((resolvedUrl) => {
          if (!hasPendingImageChange.value && resolvedUrl) {
            stickerImagePath.value = resolvedUrl
          }
        })
      }

      // 异步解析云端图片 URL，防止第二设备贴纸不显示
      cloudStorageService.restoreItemDisplayImages([item.value]).then(restored => {
        if (restored && restored.length > 0 && !hasPendingImageChange.value) {
          const resItem = restored[0]
          item.value.imageUrl = resItem.imageUrl
          item.value.displayImageUrl = resItem.displayImageUrl
          item.value.originalImageUrl = resItem.originalImageUrl
          originalImagePath.value = resItem.originalImageUrl || resItem.imageUrl
          isUsingOriginal.value = !resItem.displayImageUrl || resItem.displayImageUrl === originalImagePath.value
          initialUseOriginal.value = isUsingOriginal.value
        }
      })
    }
  } else {
    showFallback()
  }
}

function showFallback() {
  uni.showToast({ title: '物品不存在或已被删除', icon: 'none' })
  setTimeout(() => uni.navigateBack(), 1200)
}

const computedExpireDateLabel = computed(() => {
  if (!item.value || !item.value.produceDate || !item.value.shelfLife) return ''
  const val = parseInt(item.value.shelfLife)
  if (isNaN(val) || val <= 0 || val > 9999) return ''
  
  let unit = 'day'
  if (item.value.shelfUnit === '天') unit = 'day'
  else if (item.value.shelfUnit === '月') unit = 'month'
  else if (item.value.shelfUnit === '年') unit = 'year'
  
  const expiry = calculateExpiryDate(item.value.produceDate, val, unit)
  if (!expiry) return ''
  
  const [y, m, d] = expiry.split('-')
  return `${y}年${m}月${d}日`
})

const computedOpenedExpireDateLabel = computed(() => {
  if (!item.value || !item.value.openDate || !item.value.afterOpeningShelfLife) return ''
  const val = parseInt(item.value.afterOpeningShelfLife)
  if (isNaN(val) || val <= 0 || val > 9999) return ''
  
  let unit = 'month'
  if (item.value.afterOpeningShelfUnit === '天' || item.value.afterOpeningShelfUnitLabel === '天') unit = 'day'
  else if (item.value.afterOpeningShelfUnit === '月' || item.value.afterOpeningShelfUnitLabel === '月') unit = 'month'
  else if (item.value.afterOpeningShelfUnit === '年' || item.value.afterOpeningShelfUnitLabel === '年') unit = 'year'
  
  const expiry = calculateAfterOpeningDate(item.value.openDate, val, unit)
  if (!expiry) return ''
  
  const [y, m, d] = expiry.split('-')
  return `${y}年${m}月${d}日`
})

const computedDaysLeftText = computed(() => {
  if (!item.value) return '--'
  
  const tempItem = {
    expiryMode: item.value.expiryMode,
    status: item.value.status,
    openDate: item.value.openDate,
    expiryDate: '',
    openedExpiryDate: ''
  }

  // Calculate temp normal expiry
  if (item.value.produceDate && item.value.shelfLife) {
    const v1 = parseInt(item.value.shelfLife)
    let u1 = 'day'
    if (item.value.shelfUnit === '天') u1 = 'day'
    else if (item.value.shelfUnit === '月') u1 = 'month'
    else if (item.value.shelfUnit === '年') u1 = 'year'
    if (!isNaN(v1) && v1 > 0) {
      tempItem.expiryDate = calculateExpiryDate(item.value.produceDate, v1, u1)
    }
  }

  // Calculate temp opened expiry
  if (item.value.openDate && item.value.afterOpeningShelfLife) {
    const v2 = parseInt(item.value.afterOpeningShelfLife)
    let u2 = 'month'
    if (item.value.afterOpeningShelfUnit === '天' || item.value.afterOpeningShelfUnitLabel === '天') u2 = 'day'
    else if (item.value.afterOpeningShelfUnit === '月' || item.value.afterOpeningShelfUnitLabel === '月') u2 = 'month'
    else if (item.value.afterOpeningShelfUnit === '年' || item.value.afterOpeningShelfUnitLabel === '年') u2 = 'year'
    if (!isNaN(v2) && v2 > 0) {
      tempItem.openedExpiryDate = calculateAfterOpeningDate(item.value.openDate, v2, u2)
    }
  }

  const activeInfo = determineActiveExpiry(tempItem)
  if (!activeInfo.date) {
    return '待补全'
  }
  
  const diffDays = getDaysDifference(activeInfo.date, getTodayStr())
  
  if (diffDays < 0) {
    if (activeInfo.source === 'opened') return `开封后已过期 ${Math.abs(diffDays)} 天`
    return `已过期 ${Math.abs(diffDays)} 天`
  } else if (diffDays === 0) {
    return '今天到期'
  } else {
    if (item.value.status === 'using' && activeInfo.source === 'opened') {
      return `开封后还有 ${diffDays} 天`
    }
    return `还有 ${diffDays} 天`
  }
})

function onBack() {
  // Check if there are unsaved changes
  const original = itemService.getViewItemById(currentId)
  let hasChanges = false
  if (original && item.value) {
    hasChanges = 
      original.name !== item.value.name ||
      original.category !== item.value.category ||
      original.status !== item.value.status ||
      original.expiryMode !== item.value.expiryMode ||
      original.produceDate !== item.value.produceDate ||
      original.shelfLife !== item.value.shelfLife ||
      original.shelfUnit !== item.value.shelfUnit ||
      original.openDate !== item.value.openDate ||
      original.afterOpeningShelfLife !== item.value.afterOpeningShelfLife ||
      (original.afterOpeningShelfUnit !== item.value.afterOpeningShelfUnit && original.afterOpeningShelfUnitLabel !== item.value.afterOpeningShelfUnit) ||
      original.rotation !== item.value.rotation ||
      hasPendingImageChange.value ||
      initialUseOriginal.value !== isUsingOriginal.value
  }

  if (hasChanges) {
    uni.showModal({
      title: '还没保存修改',
      content: '这件好物的信息还没更新，要先继续看一眼吗？',
      cancelText: '放弃这次',
      cancelColor: '#A69B8D',
      confirmText: '继续编辑',
      confirmColor: '#8A9A86',
      success(res) {
        if (res.cancel) {
          uni.navigateBack()
        }
      }
    })
  } else {
    uni.navigateBack()
  }
}

function onChooseImage() {
  if (!isStoredLoggedIn()) {
    uni.showToast({
      title: '登录后可上传照片',
      icon: 'none',
      duration: 1600
    });
    return;
  }
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempPath = res.tempFilePaths[0]
      originalImagePath.value = tempPath
      isUsingOriginal.value = false
      processStatus.value = 'idle'
      currentImageRevision.value += 1
      hasPendingImageChange.value = true
      const extMatch = tempPath.match(/\.([a-zA-Z0-9]+)$/)
      localImageExt.value = extMatch ? extMatch[1] : 'jpg'
      
      if (item.value) {
        item.value.displayImageUrl = tempPath
        item.value.originalImageCloudFileId = ''
        item.value.cutoutImageCloudFileId = ''
        item.value.displayImageCloudFileId = ''
        item.value.stickerImageCloudFileId = ''
        stickerImagePath.value = ''
      }

      const consent = uni.getStorageSync('allhas_image_processing_consent_v1')
      if (consent && consent.accepted === false) {
        return
      }
      
      uni.showLoading({ title: '一键抠图中...' })
      
      try {
        const prepareRes = await cloudStorageService.prepareImageUpload(currentId, currentImageRevision.value, localImageExt.value)
        const originalCloudFileId = await cloudStorageService.uploadOriginalImage(tempPath, prepareRes.cloudPath)
        if (item.value) {
          item.value.originalImageCloudFileId = originalCloudFileId
        }
        const processRes = await cloudStorageService.processImage(prepareRes.jobId, prepareRes.uploadTicket, currentId, currentImageRevision.value, originalCloudFileId)
        
        if (processRes.imageProcessStatus === 'success' && processRes.cutoutCloudFileId) {
          const cutoutPath = await cloudStorageService.downloadFile(processRes.cutoutCloudFileId)
          
          const stickerPath = await imageCanvasService.processToSticker('stickerCanvas', instance.proxy, cutoutPath, true)
          if (item.value) {
            item.value.displayImageUrl = stickerPath
            item.value.rotation = 0
            item.value.cutoutImageCloudFileId = processRes.cutoutCloudFileId
            stickerImagePath.value = stickerPath
          }
          processStatus.value = 'success'
          uni.showToast({ title: '贴纸生成成功', icon: 'none' })
        } else {
          throw new Error('Matting failed')
        }
      } catch (e) {
        console.error('Matting error', e)
        processStatus.value = 'fallback'
        // Fallback: draw original image without stroke
        try {
          const stickerPath = await imageCanvasService.processToSticker('stickerCanvas', instance.proxy, tempPath, false)
          if (item.value) {
            item.value.displayImageUrl = stickerPath
            item.value.rotation = 0
          }
        } catch(e2) {
          uni.showModal({ title: 'Canvas渲染失败', content: String(e2) })
        }
        
        uni.showToast({ title: '今日美化次数已达上限，已为您保留原图记录~', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

function onPickCategory() {
  uni.showActionSheet({
    itemList: ['食品', '药品', '美妆', '日化', '母婴'],
    success(res) {
      const map = ['食品', '药品', '美妆', '日化', '母婴']
      const keyMap = ['food', 'medicine', 'beauty', 'daily', 'baby']
      item.value.categoryLabel = map[res.tapIndex]
      item.value.category = keyMap[res.tapIndex]
    },
  })
}

function onPickStatus() {
  uni.showActionSheet({
    itemList: ['待取用', '使用中', '已用完'],
    success(res) {
      const map = ['待取用', '使用中', '已用完']
      const keyMap = ['pending', 'using', 'done']
      
      const newStatus = keyMap[res.tapIndex]
      // Check if transitioning to using and missing openDate for dual/after_opening
      if (newStatus === 'using' && (item.value.expiryMode === 'after_opening' || item.value.expiryMode === 'dual') && !item.value.openDate) {
        uni.showToast({ title: '转为使用中，请补充开封日期', icon: 'none' })
      }
      
      item.value.statusLabel = map[res.tapIndex]
      item.value.status = newStatus
    },
  })
}

function onProduceDateChange(e: any) {
  const dateStr = e.detail.value
  item.value.produceDate = dateStr
  const [y, m, d] = dateStr.split('-')
  item.value.produceDateLabel = `${y}年${m}月${d}日`
}

function onOpenDateChange(e: any) {
  const dateStr = e.detail.value
  item.value.openDate = dateStr
  const [y, m, d] = dateStr.split('-')
  item.value.openDateLabel = `${y}年${m}月${d}日`
}

function onPickUnit(target: 'normal' | 'after_opening') {
  uni.showActionSheet({
    itemList: ['天', '月', '年'],
    success(res) {
      if (target === 'normal') {
        item.value.shelfUnit = ['天', '月', '年'][res.tapIndex]
      } else {
        item.value.afterOpeningShelfUnitLabel = ['天', '月', '年'][res.tapIndex]
        item.value.afterOpeningShelfUnit = ['day', 'month', 'year'][res.tapIndex]
      }
    },
  })
}

function onPickReminder() {
  const settings = settingsService.getSettings()
  const customDays = settings.remindDayOptions || [0, 1, 3, 7, 30]
  
  const itemList = customDays.map(d => d === 0 ? '不提醒' : `提前 ${d} 天`)
  
  uni.showActionSheet({
    itemList,
    success(res) {
      item.value.remindDays = customDays[res.tapIndex]
    },
  })
}

function onUseOriginal() {
  if (!originalImagePath.value) return
  isUsingOriginal.value = !isUsingOriginal.value
}

function onSave() {
  if (isSaving.value) return

  // Validation
  if (!item.value.name) return uni.showToast({ title: '请输入物品名称', icon: 'none' })
  if (!item.value.category) return uni.showToast({ title: '请选择分类', icon: 'none' })
  
  let unit = 'day'
  if (item.value.shelfUnit === '天') unit = 'day'
  else if (item.value.shelfUnit === '月') unit = 'month'
  else if (item.value.shelfUnit === '年') unit = 'year'
  
  let afterUnit = 'month'
  if (item.value.afterOpeningShelfUnit === '天' || item.value.afterOpeningShelfUnitLabel === '天') afterUnit = 'day'
  else if (item.value.afterOpeningShelfUnit === '月' || item.value.afterOpeningShelfUnitLabel === '月') afterUnit = 'month'
  else if (item.value.afterOpeningShelfUnit === '年' || item.value.afterOpeningShelfUnitLabel === '年') afterUnit = 'year'

  const shelfVal = parseInt(item.value.shelfLife) || 0
  const afterShelfVal = parseInt(item.value.afterOpeningShelfLife) || 0
  let expiry = ''
  let openedExpiry = ''

  if (item.value.expiryMode === 'normal' || item.value.expiryMode === 'dual') {
    if (!item.value.produceDate) return uni.showToast({ title: '请选择生产日期', icon: 'none' })
    if (shelfVal <= 0 || shelfVal > 9999) return uni.showToast({ title: '保质期无效', icon: 'none' })
    expiry = calculateExpiryDate(item.value.produceDate, shelfVal, unit)
    if (!expiry) return uni.showToast({ title: '无法计算到期日', icon: 'none' })
  }

  if (item.value.expiryMode === 'after_opening' || (item.value.expiryMode === 'dual' && item.value.status === 'using')) {
    if (!item.value.openDate) return uni.showToast({ title: '请选择开封日期', icon: 'none' })
    if (afterShelfVal <= 0 || afterShelfVal > 9999) return uni.showToast({ title: '开封后保质期无效', icon: 'none' })
    openedExpiry = calculateAfterOpeningDate(item.value.openDate, afterShelfVal, afterUnit)
    if (!openedExpiry) return uni.showToast({ title: '无法计算开封后到期日', icon: 'none' })
  }

  isSaving.value = true
  
  const updateData: any = {
    name: item.value.name,
    categoryId: item.value.category,
    categoryName: item.value.categoryLabel,
    originalImageUrl: originalImagePath.value,
    displayImageUrl: isUsingOriginal.value ? originalImagePath.value : item.value.displayImageUrl,
    imageProcessStatus: isUsingOriginal.value ? 'fallback' : processStatus.value,
    stickerRotation: isUsingOriginal.value ? 0 : item.value.rotation,
    
    expiryMode: item.value.expiryMode,
    productionDate: item.value.produceDate,
    shelfLifeValue: shelfVal,
    shelfLifeUnit: unit,
    expiryDate: expiry,
    
    openDate: item.value.openDate,
    afterOpeningShelfLifeValue: afterShelfVal,
    afterOpeningShelfLifeUnit: afterUnit,
    openedExpiryDate: openedExpiry,
    
    status: item.value.status,
    remindDays: item.value.remindDays
  }

  if (!hasPendingImageChange.value) {
    const stickerImageCloudFileId = item.value.stickerImageCloudFileId || (
      item.value.displayImageCloudFileId !== item.value.originalImageCloudFileId
        ? item.value.displayImageCloudFileId
        : ''
    )
    updateData.originalImageCloudFileId = item.value.originalImageCloudFileId || ''
    updateData.cutoutImageCloudFileId = item.value.cutoutImageCloudFileId || ''
    updateData.stickerImageCloudFileId = stickerImageCloudFileId
    updateData.displayImageCloudFileId = isUsingOriginal.value
      ? (item.value.originalImageCloudFileId || '')
      : (stickerImageCloudFileId || item.value.originalImageCloudFileId || '')
  }
  
  if (hasPendingImageChange.value) {
    updateData.imageRevision = currentImageRevision.value
    updateData.imageSyncPending = true
    updateData.originalImageCloudFileId = item.value.originalImageCloudFileId || ''
    updateData.cutoutImageCloudFileId = item.value.cutoutImageCloudFileId || ''
    updateData.displayImageCloudFileId = ''
    updateData.stickerImageCloudFileId = ''
  }

  // Active expiry calculation runs naturally through DataConverter when accessed, but we can set it here too if needed, though itemService._save just merges updateData. wait, itemService updates the item. DataConverter calculates it.
  // Actually we need to make sure the underlying ItemModel receives `activeExpiryDate` properly so that DB has it for filtering!
  const preItem = { ...itemService.getItemById(item.value.id), ...updateData }
  const activeInfo = determineActiveExpiry(preItem)
  updateData.activeExpiryDate = activeInfo.date
  updateData.activeExpirySource = activeInfo.source

  const proceedSave = (userConsentAccepted, onSaved = null) => {
    const success = itemService.updateItem(item.value.id, updateData)
    if (success) {
      uni.showToast({ title: '修改已保存', icon: 'success' })
      
      const hasImageUpload = hasPendingImageChange.value && originalImagePath.value && !originalImagePath.value.startsWith('cloud://');
      if (hasImageUpload) {
        if (item.value.originalImageCloudFileId) {
          cloudStorageService.finalizePreparedImageUpload(
            itemService,
            item.value.id,
            updateData.imageRevision,
            item.value.originalImageCloudFileId,
            stickerImagePath.value || item.value.displayImageUrl || originalImagePath.value,
            localImageExt.value,
            isUsingOriginal.value,
            processStatus.value
          )
        } else {
          cloudStorageService.executeBackgroundUpload(
            itemService,
            item.value.id,
            updateData.imageRevision,
            originalImagePath.value,
            originalImagePath.value,
            localImageExt.value,
            false
          )
        }
      }
      if (typeof onSaved === 'function') {
        Promise.resolve(onSaved()).catch(() => {})
      }
      setTimeout(() => uni.navigateBack(), 800)
    } else {
      isSaving.value = false
      uni.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  }

  const requestSubscriptionBeforeSave = () => {
    const reminderChanged = Number(item.value.remindDays) !== initialRemindDays.value ||
      updateData.activeExpiryDate !== initialActiveExpiryDate.value ||
      item.value.status !== initialReminderStatus.value
    const shouldRequest = reminderChanged &&
      Number(item.value.remindDays) > 0 &&
      Boolean(updateData.activeExpiryDate) &&
      ['pending', 'using'].includes(item.value.status) &&
      isStoredLoggedIn() &&
      subscriptionMessageService.isTemplateConfigured()

    if (!shouldRequest) {
      requestImageConsentThenSave()
      return
    }

    // The platform only accepts subscription requests directly triggered by
    // the save-button tap, not from a modal or other asynchronous callback.
    subscriptionMessageService.requestSubscription().then((authRes) => {
      if (authRes.success) {
        requestImageConsentThenSave(async () => {
          const grantRes = await subscriptionMessageService.registerReminderGrant({
            itemId: item.value.id,
            activeExpiryDate: updateData.activeExpiryDate,
            reminderKind: 'expiry_window'
          })
          settingsService.updateSettings({
            enabled: grantRes.success,
            subscriptionIntent: true,
            subscriptionLastResult: grantRes.success ? 'accept' : 'unavailable',
            subscriptionLastRequestedAt: Date.now(),
            subscriptionLastErrorCode: grantRes.success ? null : (grantRes.errorCode || 'reminder_grant_registration_failed')
          })
          uni.showToast({
            title: grantRes.success ? '微信提醒已安排' : '提醒暂未安排，首页仍会继续提醒你',
            icon: 'none'
          })
        })
        return
      } else {
        settingsService.updateSettings({
          enabled: false,
          subscriptionIntent: true,
          subscriptionLastResult: authRes.result,
          subscriptionLastRequestedAt: Date.now(),
          subscriptionLastErrorCode: authRes.errorCode || null
        })
        uni.showToast({ title: '没关系，首页也会继续提醒你', icon: 'none' })
      }
      requestImageConsentThenSave()
    })
  }

  const requestImageConsentThenSave = (onSaved = null) => {
  // Handle privacy consent check if there's a new image and we are NOT using the original image
  if (hasPendingImageChange.value && originalImagePath.value && !originalImagePath.value.startsWith('cloud://') && !isUsingOriginal.value) {
    const consent = uni.getStorageSync('allhas_image_processing_consent_v1')
    if (!consent || consent.accepted === undefined) {
      uni.showModal({
        title: '先确认一下图片整理',
        content: '为了生成更清晰的物品贴纸，图片会上传至微信云存储，并提交给百度智能云进行背景处理。你也可以继续使用原图。',
        cancelText: '暂不整理',
        confirmText: '继续整理',
        success: function(res) {
          if (res.confirm) {
            uni.setStorageSync('allhas_image_processing_consent_v1', { accepted: true, policyVersion: 1, acceptedAt: Date.now() })
            proceedSave(true, onSaved)
          } else {
            uni.setStorageSync('allhas_image_processing_consent_v1', { accepted: false, policyVersion: 1, acceptedAt: Date.now() })
            proceedSave(false, onSaved)
          }
        }
      })
      return
    } else {
      proceedSave(consent.accepted, onSaved)
    }
  } else {
    proceedSave(false, onSaved)
  }
  }
  requestSubscriptionBeforeSave()
}
</script>

<style lang="scss" scoped>
$color-bg: #F9F8F6;
$color-bg-light: #F4F3F1;
$color-card: #FFFFFF;
$color-primary: #8A9A86;
$color-primary-dark: #536251;
$color-text: #333634;
$color-text-secondary: rgba(51, 54, 52, 0.64);
$color-warn: #D98A6C;
$color-line: rgba(51, 54, 52, 0.1);
$radius-card: 32rpx;
$radius-full: 9999rpx;
$bottom-action-height: 160rpx;

/* 统一字体格式为思源宋体 */
view, text, button, input {
  font-family: 'Noto Serif SC', serif;
}

.hidden-canvas {
  position: fixed;
  left: 0;
  top: 0;
  width: 300px;
  height: 300px;
  opacity: 0;
  pointer-events: none;
  z-index: -1;
}

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
  height: 120rpx;
  padding-top: var(--status-bar-height, 44rpx);
  background: #FAF9F7;
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

  &__back-icon {
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
  margin-top: calc(120rpx + var(--status-bar-height, 44rpx));
  margin-bottom: $bottom-action-height;
  height: calc(100vh - 120rpx - var(--status-bar-height, 44rpx) - $bottom-action-height);
}

/* Hero 区 */
.hero-section {
  background: #FCEAD5;
  margin: 32rpx 48rpx 0;
  border-radius: $radius-card;
  padding: 40rpx 0;
  position: relative;
}

.hero-img-wrap {
  width: 100%;
  height: 400rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-img {
  width: 60%;
  height: 100%;
}

.img-actions {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 24rpx;
  width: 100%;
  margin-top: 32rpx;
}

.img-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 40rpx;
  background: rgba(51, 54, 52, 0.08);
  border-radius: $radius-full;

  &__text {
    font-size: 26rpx;
    color: $color-text;
  }
}

/* 名称 */
.info-header {
  padding: 40rpx 48rpx 0;
  box-sizing: border-box;

  &__name {
    font-family: 'Noto Serif SC', serif;
    font-size: 48rpx;
    font-weight: 700;
    color: $color-text;
    line-height: 1.2;
  }

  &__name-input {
    font-size: 48rpx;
    color: $color-text;
    height: 60rpx;
    line-height: 1.2;
    background: transparent;
  }
}

/* 三列 meta */
.meta-row {
  display: flex;
  flex-direction: row;
  padding: 32rpx 48rpx;
  gap: 0;
}

.meta-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;

  &__label {
    font-size: 24rpx;
    color: $color-text-secondary;
  }

  &__value-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  &__value {
    font-family: 'Noto Serif SC', serif;
    font-size: 30rpx;
    font-weight: 700;
    color: $color-text;

    &--warn {
      color: #8E4D33;
    }
    
    &--expired {
      color: #BA1A1A;
    }
  }
}

.arrow-icon {
  width: 24rpx;
  height: 24rpx;
  opacity: 0.6;
}

.shelf-input-wrap {
  min-width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.shelf-input-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 30rpx;
  font-weight: 700;
  color: $color-text;
}

.shelf-input {
  width: 80rpx;
  text-align: right;
  font-size: 30rpx;
  color: $color-text;
}

.unit-select {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-left: 16rpx;
  border-left: 2rpx solid $color-line;
}

.expiry-mode-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  margin: 0 48rpx 32rpx;
}

.mode-btn {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 16rpx;
  background-color: $color-bg-light;
  color: $color-text-secondary;
  font-size: 26rpx;
  transition: all 0.2s ease;
}

.mode-btn--active {
  background-color: $color-primary;
  color: #FFF;
  font-weight: 600;
}

/* 日期卡 */
.date-card {
  margin: 0 48rpx 40rpx;
  background: $color-bg-light;
  border-radius: 24rpx;
  padding: 0 32rpx;

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88rpx;
  }

  &__label {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__value-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__value {
    font-size: 30rpx;
    color: $color-text;
  }

  &__divider {
    height: 2rpx;
    background: $color-line;
  }
}

.safe-bottom {
  height: 40rpx;
}

/* 底部操作 */
.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: $bottom-action-height;
  background: rgba(250, 249, 247, 0.92);
  border-top: 2rpx solid $color-line;
  backdrop-filter: blur(12rpx);

  &__inner {
    display: flex;
    align-items: center;
    padding: 16rpx 48rpx 40rpx;
    height: 100%;
    box-sizing: border-box;
  }
}

.action-btn-save {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-full;
  background: $color-primary-dark;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(83, 98, 81, 0.3);

  &__text {
    font-family: 'Noto Serif SC', serif;
    font-size: 30rpx;
    font-weight: 700;
    color: #fff;
  }
}
</style>
