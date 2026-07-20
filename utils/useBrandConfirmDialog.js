import { reactive } from 'vue'

const initialDialog = {
  visible: false,
  title: '',
  content: '',
  paragraphs: [],
  italicContent: false,
  imageSrc: '',
  steps: [],
  showCancel: true,
  cancelText: '取消',
  confirmText: '确认',
  destructive: false,
}

export function useBrandConfirmDialog() {
  const dialog = reactive({ ...initialDialog })
  let resolveDialog = null

  function confirm(options = {}) {
    if (dialog.visible) return Promise.resolve({ confirm: false, cancel: true })

    Object.assign(dialog, initialDialog, options, { visible: true })
    return new Promise((resolve) => {
      resolveDialog = resolve
    })
  }

  function close(confirmResult) {
    if (!dialog.visible) return

    dialog.visible = false
    const resolve = resolveDialog
    resolveDialog = null
    if (resolve) resolve({ confirm: confirmResult, cancel: !confirmResult })
  }

  return {
    dialog,
    confirm,
    onConfirm: () => close(true),
    onCancel: () => close(false),
  }
}
