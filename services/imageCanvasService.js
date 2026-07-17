export const imageCanvasService = {
  /**
   * 将抠图结果（或原图）绘制为贴纸风格：
   * 1. 燕麦白纯色背景
   * 2. 白色描边（仅抠图成功时）
   * 3. 随机微旋转
   * 4. 导出临时文件路径
   *
   * @param {string} canvasId - canvas 元素的 id
   * @param {object} componentInstance - 当前组件实例（Vue3 中通过 getCurrentInstance() 在 setup 顶层获取）
   * @param {string} imagePath - 要绘制的图片路径（本地临时路径或 wxfile://）
   * @param {boolean} isCutout - 是否为抠图结果（决定是否绘制白色描边）
   */
  async processToSticker(canvasId, componentInstance, imagePath, isCutout = true) {
    return new Promise((resolve, reject) => {
      // 必须用 .in(componentInstance) 才能在真机上正确查找到 canvas 节点
      const query = uni.createSelectorQuery().in(componentInstance)
      query.select(`#${canvasId}`).fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0]) {
          return reject(new Error('[Canvas] 查询结果为空，未找到 #' + canvasId))
        }
        if (!res[0].node) {
          return reject(new Error('[Canvas] node 属性缺失，请确认 canvas 标签包含 type="2d"'))
        }

        try {
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const width = res[0].width || 300
          const height = res[0].height || 300

          const dpr = uni.getSystemInfoSync().pixelRatio || 2
          canvas.width = width * dpr
          canvas.height = height * dpr
          ctx.scale(dpr, dpr)

          const img = canvas.createImage()
          img.onload = () => {
            // 1. 保持画布背景完全透明
            ctx.clearRect(0, 0, width, height)

            // 随机旋转 -2° ~ +2°
            const rotation = (Math.random() * 4 - 2) * Math.PI / 180

            ctx.save()
            ctx.translate(width / 2, height / 2)
            ctx.rotate(rotation)

            // 计算图片绘制尺寸（留出描边空间）
            const padding = 8
            const maxImgWidth = width - padding * 2
            const maxImgHeight = height - padding * 2

            let drawW = img.width
            let drawH = img.height

            const scale = Math.min(maxImgWidth / drawW, maxImgHeight / drawH)
            drawW = drawW * scale
            drawH = drawH * scale

            // 2. 绘制实心白色描边（仅抠图成功时）
            if (isCutout) {
              // 根据 dpr 计算描边粗细（6px 在 2x dpr 屏幕下即为 3px 物理粗细）
              const strokeSize = 6
              
              // 2.1 沿12个方向绘制偏移图片，合并为一个略微膨胀的透明剪影
              for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
                const dx = Math.cos(angle) * strokeSize
                const dy = Math.sin(angle) * strokeSize
                ctx.drawImage(img, -drawW / 2 + dx, -drawH / 2 + dy, drawW, drawH)
              }

              // 2.2 运用复合操作，将所有已绘制像素全部染成纯白色，生成实心剪影
              ctx.globalCompositeOperation = 'source-in'
              ctx.fillStyle = '#FFFFFF'
              ctx.fillRect(-width, -height, width * 2, height * 2)

              // 2.3 恢复默认层叠模式，把原图盖在白色剪影正中心，形成完美贴纸描边
              ctx.globalCompositeOperation = 'source-over'
              ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
            } else {
              // 3. 原图不加描边直接绘制
              ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
            }

            ctx.restore()

            // 4. 导出
            uni.canvasToTempFilePath({
              canvas: canvas,
              success: (result) => {
                resolve(result.tempFilePath)
              },
              fail: (err) => {
                reject(new Error('[Canvas] canvasToTempFilePath 失败: ' + JSON.stringify(err)))
              }
            })
          }
          img.onerror = (e) => {
            reject(new Error('[Canvas] 图片加载失败，路径: ' + imagePath))
          }
          img.src = imagePath
        } catch (e) {
          reject(e)
        }
      })
    })
  }
}
