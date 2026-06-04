const DEFAULT_OPTIONS = {
  maxDimension: 1280,
  maxDataLength: 900_000,
  qualitySteps: [0.72, 0.64, 0.56, 0.48],
  resizeFactor: 0.85,
  minDimension: 720,
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('读取照片失败，请重试。'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('照片解析失败，请重新拍摄。'))
    image.src = dataUrl
  })
}

function getCanvasContext(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法处理照片，请更换浏览器后重试。')
  }

  return { canvas, context }
}

function buildCompressedData(canvas, quality) {
  const compressed = canvas.toDataURL('image/jpeg', quality)

  if (!compressed.startsWith('data:image/')) {
    throw new Error('照片压缩失败，请重试。')
  }

  return compressed
}

export async function compressUploadPhoto(file, options = {}) {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)
  const initialScale = Math.min(1, config.maxDimension / Math.max(image.width, image.height))

  let width = Math.max(1, Math.round(image.width * initialScale))
  let height = Math.max(1, Math.round(image.height * initialScale))
  let compressed = ''

  while (true) {
    const { canvas, context } = getCanvasContext(width, height)
    context.drawImage(image, 0, 0, width, height)

    for (const quality of config.qualitySteps) {
      compressed = buildCompressedData(canvas, quality)

      if (compressed.length <= config.maxDataLength) {
        break
      }
    }

    if (compressed.length <= config.maxDataLength) {
      break
    }

    const nextMaxDimension = Math.max(
      config.minDimension,
      Math.round(Math.max(width, height) * config.resizeFactor),
    )

    if (nextMaxDimension >= Math.max(width, height) || Math.max(width, height) <= config.minDimension) {
      throw new Error('单张照片体积仍然过大，请重新拍摄更近距离的现场照片。')
    }

    const nextScale = nextMaxDimension / Math.max(width, height)
    width = Math.max(1, Math.round(width * nextScale))
    height = Math.max(1, Math.round(height * nextScale))
  }

  const normalizedName = file.name && file.name.trim() ? file.name.replace(/\.[^.]+$/, '') : `photo-${Date.now()}`

  return {
    fileName: `${normalizedName}.jpg`,
    photoData: compressed,
  }
}