// services/cacheService.js
// 职责：维护本地文件注册表 (allhas_local_file_registry_v1)，进行安全的本地图片缓存计算与物理清理。

const REGISTRY_KEY = 'allhas_local_file_registry_v1'

export const cacheService = {
  /**
   * 注册图片缓存到注册表中。
   */
  registerCachedFile({ path, itemId, imageRevision, role, size, cloudFileId, cacheState }) {
    if (!path) return
    
    let registry = []
    try {
      const raw = uni.getStorageSync(REGISTRY_KEY)
      if (raw) registry = JSON.parse(raw)
    } catch (e) {
      // ignore
    }

    let fileSize = size || 0
    if (!fileSize && typeof wx !== 'undefined' && wx.getFileSystemManager) {
      try {
        const fs = wx.getFileSystemManager()
        const stat = fs.statSync(path)
        fileSize = stat.size
      } catch (e) {
        // ignore
      }
    }

    const index = registry.findIndex(f => f.path === path)
    const record = {
      path,
      itemId,
      imageRevision: imageRevision || 1,
      role: role || 'display', // 'original' | 'display'
      size: fileSize,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      cloudFileId: cloudFileId || '',
      cacheState: cacheState || 'cached'
    }

    if (index !== -1) {
      registry[index] = { ...registry[index], ...record }
    } else {
      registry.push(record)
    }

    try {
      uni.setStorageSync(REGISTRY_KEY, JSON.stringify(registry))
    } catch (e) {
      console.error('[CacheService] Failed to save registry:', e)
    }
  },

  /**
   * 计算可安全清理的图片文件列表与总大小。
   */
  getCleanableFiles() {
    let registry = []
    try {
      const raw = uni.getStorageSync(REGISTRY_KEY)
      if (raw) registry = JSON.parse(raw)
    } catch (e) {
      return { totalSize: 0, files: [] }
    }

    // 动态引入 itemService 以避免循环依赖
    let items = []
    try {
      // 在小程序环境中，如果同步 import 不行，可用公共获取手段，或者从已挂载的模块中取。
      // 为确保绝对安全且能同步执行（因为 getCleanableFiles 在页面初始化时需要同步调用），
      // 我们读取 scoped 的 items 本地存储！
      // 这是一个绝妙的设计！直接绕过了对 itemService 的引用，同时也获得了当前作用域的最新 items！
      const savedScope = uni.getStorageSync('allhas_active_scope_v1') || 'guest'
      let suffix = 'items'
      let itemsKey = ''
      if (savedScope.startsWith('account::')) {
        const uid = savedScope.split('::')[1]
        itemsKey = `account::${uid}::${suffix}`
      } else {
        itemsKey = `guest::${suffix}`
      }
      
      const itemsRaw = uni.getStorageSync(itemsKey)
      if (itemsRaw) {
        items = JSON.parse(itemsRaw)
      }
    } catch (err) {
      console.error('[CacheService] Failed to read scoped items directly:', err)
      return { totalSize: 0, files: [] }
    }

    const cleanable = []
    let totalSize = 0

    const fs = (typeof wx !== 'undefined' && wx.getFileSystemManager) ? wx.getFileSystemManager() : null
    if (!fs) {
      return { totalSize: 0, files: [] }
    }

    for (const regFile of registry) {
      const { path, itemId, imageRevision, role } = regFile

      // 1. 查找此文件绑定的 item 是否存在于当前隔离账号中
      const item = items.find(i => i.id === itemId && i.status !== 'deleted')
      if (!item) {
        // 如果物品已彻底清除或不属于当前账号，可以安全清理
        try {
          const stat = fs.statSync(path)
          cleanable.push(regFile)
          totalSize += stat.size
        } catch (e) {}
        continue
      }

      // 2. 状态检查：不能是正在上传、抠图或合成中的图片
      if (item.imageProcessStatus === 'uploading' || item.imageProcessStatus === 'processing') {
        continue
      }

      // 3. 版本检查：如果 item.imageRevision 与注册时的版本不一致，说明该本地缓存已失效或被覆盖，可以安全删除
      if (item.imageRevision !== imageRevision) {
        try {
          const stat = fs.statSync(path)
          cleanable.push(regFile)
          totalSize += stat.size
        } catch (e) {}
        continue
      }

      // 4. 云备份检查：必须已上传云端并同步成功 (imageSyncPending !== true 且有 cloudFileId)
      const cloudId = role === 'original' ? item.originalImageCloudFileId : item.displayImageCloudFileId
      if (!cloudId || !cloudId.startsWith('cloud://')) {
        continue
      }

      // 必须是同步状态为 synced 且无同步挂起
      if (item.syncStatus !== 'synced' || item.imageSyncPending === true) {
        continue
      }

      // 5. 检查本地物理文件是否存在，并累加真实文件大小
      try {
        const stat = fs.statSync(path)
        regFile.size = stat.size // 写入最新大小
        cleanable.push(regFile)
        totalSize += stat.size
      } catch (e) {
        // 文件不存在直接略过
      }
    }

    return { totalSize, files: cleanable }
  },

  /**
   * 执行安全清理缓存。
   */
  async clearCache() {
    const { files } = this.getCleanableFiles()
    if (files.length === 0) {
      return { successCount: 0, clearedSize: 0 }
    }

    const fs = (typeof wx !== 'undefined' && wx.getFileSystemManager) ? wx.getFileSystemManager() : null
    if (!fs) {
      throw new Error('FileSystemManager not available')
    }

    let successCount = 0
    let clearedSize = 0
    const deletedPaths = new Set()

    // 动态引入 itemService 执行引用清理
    const { itemService } = await import('./itemService.js')

    for (const file of files) {
      try {
        fs.unlinkSync(file.path)
        deletedPaths.add(file.path)
        successCount++
        clearedSize += file.size

        // 使用非同步触发的专用方法，更新本地图片引用（将 localPath 改为 cloudFileId）
        itemService.clearLocalImageCacheRefs(file.itemId, file.role)
      } catch (e) {
        console.error('[CacheService] Failed to delete cache file:', file.path, e)
      }
    }

    // 更新注册表，剔除已被物理删除的项
    let registry = []
    try {
      const raw = uni.getStorageSync(REGISTRY_KEY)
      if (raw) registry = JSON.parse(raw)
    } catch (e) {}

    const updatedRegistry = registry.filter(f => !deletedPaths.has(f.path))
    try {
      uni.setStorageSync(REGISTRY_KEY, JSON.stringify(updatedRegistry))
    } catch (e) {}

    if (successCount === 0 && files.length > 0) {
      throw new Error('clean_failed')
    }

    return { successCount, clearedSize }
  }
}
