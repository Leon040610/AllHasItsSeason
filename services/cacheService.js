import { localRepository } from '../repositories/localRepository.js'
import { STORAGE_KEYS } from '../utils/storageKeys.js'

const REGISTRY_KEY = STORAGE_KEYS.FILE_REGISTRY

function readRegistry() {
  const registry = localRepository.get(REGISTRY_KEY)
  return Array.isArray(registry) ? registry : []
}

function saveRegistry(registry) {
  return localRepository.set(REGISTRY_KEY, registry)
}

function replaceClearedImageReference(itemId, role) {
  const items = localRepository.get(STORAGE_KEYS.ITEMS)
  if (!Array.isArray(items)) return false

  const index = items.findIndex((item) => item.id === itemId && item.status !== 'deleted')
  if (index === -1) return false

  const current = items[index]
  const patch = {}
  if (role === 'original' && current.originalImageCloudFileId) {
    patch.originalImageUrl = current.originalImageCloudFileId
  }
  if (role === 'display' && current.displayImageCloudFileId) {
    patch.displayImageUrl = current.displayImageCloudFileId
  }
  if (Object.keys(patch).length === 0) return false

  items[index] = { ...current, ...patch }
  return localRepository.set(STORAGE_KEYS.ITEMS, items)
}

export const cacheService = {
  registerCachedFile({ path, itemId, imageRevision, role, size, cloudFileId, cacheState }) {
    if (!path) return

    const registry = readRegistry()
    let fileSize = size || 0
    if (!fileSize && typeof wx !== 'undefined' && wx.getFileSystemManager) {
      try {
        fileSize = wx.getFileSystemManager().statSync(path).size
      } catch (e) {
        // The path may be a temporary file that has already expired.
      }
    }

    const index = registry.findIndex((file) => file.path === path)
    const record = {
      path,
      itemId,
      imageRevision: imageRevision || 1,
      role: role || 'display',
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
    saveRegistry(registry)
  },

  getCleanableFiles() {
    const registry = readRegistry()
    const items = localRepository.get(STORAGE_KEYS.ITEMS)
    if (!Array.isArray(items)) return { totalSize: 0, files: [] }

    const fs = typeof wx !== 'undefined' && wx.getFileSystemManager ? wx.getFileSystemManager() : null
    if (!fs) return { totalSize: 0, files: [] }

    const cleanable = []
    let totalSize = 0

    for (const file of registry) {
      const item = items.find((entry) => entry.id === file.itemId && entry.status !== 'deleted')

      // A missing item does not prove that the file is expendable. It can be a
      // legacy record or a cache file belonging to a different account scope.
      if (!item) continue
      if (item.imageProcessStatus === 'uploading' || item.imageProcessStatus === 'processing') continue

      const cloudFileId = file.role === 'original'
        ? item.originalImageCloudFileId
        : item.displayImageCloudFileId

      if (!cloudFileId || !cloudFileId.startsWith('cloud://')) continue
      if (item.syncStatus !== 'synced' || item.imageSyncPending === true) continue

      try {
        const stat = fs.statSync(file.path)
        cleanable.push({ ...file, size: stat.size })
        totalSize += stat.size
      } catch (e) {
        // Ignore files that are no longer available on disk.
      }
    }

    return { totalSize, files: cleanable }
  },

  async clearCache() {
    const { files } = this.getCleanableFiles()
    if (files.length === 0) return { successCount: 0, clearedSize: 0 }

    const fs = typeof wx !== 'undefined' && wx.getFileSystemManager ? wx.getFileSystemManager() : null
    if (!fs) throw new Error('FileSystemManager not available')

    let successCount = 0
    let clearedSize = 0
    const deletedPaths = new Set()

    for (const file of files) {
      try {
        fs.unlinkSync(file.path)
        deletedPaths.add(file.path)
        successCount += 1
        clearedSize += file.size
        replaceClearedImageReference(file.itemId, file.role)
      } catch (e) {
        console.error('[CacheService] Failed to delete cache file:', file.path, e)
      }
    }

    if (deletedPaths.size > 0) {
      saveRegistry(readRegistry().filter((file) => !deletedPaths.has(file.path)))
    }

    if (successCount === 0) throw new Error('clean_failed')
    return { successCount, clearedSize }
  }
}
