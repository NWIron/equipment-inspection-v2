<script setup>
import { onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { useInspectionTaskStore } from '../stores/inspectionTasks'
import { useMessageToastStore } from '../stores/messageToast'
import { formatDateTimeDisplay } from '../utils/datetime'

const route = useRoute()
const inspectionTaskStore = useInspectionTaskStore()
const toastStore = useMessageToastStore()
const isSaving = ref(false)
const isCompleting = ref(false)
const isProcessingPhotos = ref(false)

const MAX_PHOTO_COUNT = 6
const MAX_PHOTO_DIMENSION = 1600
const MAX_PHOTO_DATA_LENGTH = 1_800_000

const executionForm = reactive({
  faultCodeId: '',
  faultNote: '',
  results: [],
  photos: [],
})

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

async function compressPhoto(file) {
  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法处理照片，请更换浏览器后重试。')
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const compressed = canvas.toDataURL('image/jpeg', 0.82)

  if (!compressed.startsWith('data:image/')) {
    throw new Error('照片压缩失败，请重试。')
  }

  if (compressed.length > MAX_PHOTO_DATA_LENGTH) {
    throw new Error('单张照片体积仍然过大，请重新拍摄更清晰但更近距离的照片。')
  }

  const normalizedName = file.name && file.name.trim() ? file.name.replace(/\.[^.]+$/, '') : `inspection-photo-${Date.now()}`

  return {
    fileName: `${normalizedName}.jpg`,
    photoData: compressed,
  }
}

function getTaskStatusClass(status) {
  return {
    'is-pending': status === '待执行',
    'is-active': status === '执行中',
    'is-completed': status === '已完成',
  }
}

function setFeedback(message, type = 'success') {
  toastStore.show(message, type)
}

function applyTask(task) {
  executionForm.faultCodeId = task.faultCodeId ?? ''
  executionForm.faultNote = task.faultNote ?? ''
  executionForm.results = task.inspectionResults.map((item) => ({
    inspectionItemId: item.inspectionItemId,
    code: item.code,
    description: item.description,
    resultStatus: item.resultStatus,
  }))
  executionForm.photos = (task.inspectionPhotos ?? []).map((item) => ({
    id: item.id,
    fileName: item.fileName,
    photoData: item.photoData,
  }))
}

async function handlePhotoSelection(event) {
  const input = event.target
  const files = Array.from(input.files ?? [])
  input.value = ''

  if (!files.length) {
    return
  }

  const remainingCount = MAX_PHOTO_COUNT - executionForm.photos.length

  if (remainingCount <= 0) {
    setFeedback(`现场照片最多上传 ${MAX_PHOTO_COUNT} 张。`, 'error')
    return
  }

  if (files.length > remainingCount) {
    setFeedback(`超出数量上限，仅会保留前 ${remainingCount} 张新照片。`, 'info')
  }

  isProcessingPhotos.value = true

  try {
    const newPhotos = []

    for (const file of files.slice(0, remainingCount)) {
      newPhotos.push(await compressPhoto(file))
    }

    executionForm.photos.push(...newPhotos)
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '处理照片失败，请重试。', 'error')
  } finally {
    isProcessingPhotos.value = false
  }
}

function removePhoto(index) {
  executionForm.photos.splice(index, 1)
}

async function loadTask() {
  const result = await inspectionTaskStore.loadTask(String(route.params.taskId ?? ''))

  if (!result.ok) {
    setFeedback(result.message, 'error')
    return
  }

  applyTask(result.task)
}

async function saveExecution() {
  isSaving.value = true
  const result = await inspectionTaskStore.saveTaskResults(String(route.params.taskId ?? ''), {
    faultCodeId: executionForm.faultCodeId,
    faultNote: executionForm.faultNote,
    results: executionForm.results,
    photos: executionForm.photos.map((item, index) => ({
      fileName: item.fileName,
      photoData: item.photoData,
      sortOrder: index + 1,
    })),
  })
  isSaving.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok && result.task) {
    applyTask(result.task)
  }
}

async function completeTask() {
  isCompleting.value = true
  const result = await inspectionTaskStore.completeTask(String(route.params.taskId ?? ''))
  isCompleting.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok && result.task) {
    applyTask(result.task)
  }
}

onMounted(loadTask)
</script>

<template>
  <div class="page task-execution-page">
    <div class="page-header">
      <div class="page-header-main">
        <RouterLink class="button button-ghost button-icon" :to="{ name: 'home' }" aria-label="返回主菜单">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M9.5 3.5L5 8l4.5 4.5"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
            />
          </svg>
        </RouterLink>
        <div class="page-header-copy">
          <h2 class="page-title">任务点检</h2>
        </div>
      </div>
      <RouterLink class="button button-ghost" :to="{ name: 'inspection-task-management' }">返回任务清单</RouterLink>
    </div>

    <div v-if="inspectionTaskStore.isLoadingTask" class="notice">正在加载任务详情...</div>
    <div v-else-if="!inspectionTaskStore.activeTask" class="empty-state">未找到点检任务。</div>

    <template v-else>
      <section class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Inspection Task</p>
            <h3 class="section-title">{{ inspectionTaskStore.activeTask.taskName }}</h3>
          </div>
          <div class="action-row">
            <RouterLink
              class="button"
              :to="{ name: 'work-order-management', query: { sourceTaskId: inspectionTaskStore.activeTask.id } }"
            >
              创建维修工单
            </RouterLink>
            <button
              class="button button-success"
              type="button"
              :disabled="!inspectionTaskStore.activeTask.canComplete || isCompleting"
              @click="completeTask"
            >
              {{ isCompleting ? '提交中...' : '标记已完成' }}
            </button>
          </div>
        </div>

        <div class="entity-meta-grid">
          <div class="entity-meta-block">
            <span class="entity-meta-label">任务单号</span>
            <strong>{{ inspectionTaskStore.activeTask.taskNumber || '待生成' }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">设备信息</span>
            <strong>
              {{ inspectionTaskStore.activeTask.equipment?.equipmentCode }} ·
              {{ inspectionTaskStore.activeTask.equipment?.description }}
            </strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">点检员</span>
            <strong>{{ inspectionTaskStore.activeTask.inspector?.name || '未分配' }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">设备责任人</span>
            <strong>{{ inspectionTaskStore.activeTask.equipment?.ownerName || '未分配' }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">任务创建时间</span>
            <strong>{{ formatDateTimeDisplay(inspectionTaskStore.activeTask.createdAt) }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">优先级</span>
            <strong>{{ inspectionTaskStore.activeTask.priority }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">执行状态</span>
            <strong class="task-status" :class="getTaskStatusClass(inspectionTaskStore.activeTask.status)">
              <span class="task-status__dot"></span>
              {{ inspectionTaskStore.activeTask.status }}
            </strong>
          </div>
        </div>
      </section>

      <section class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Execution</p>
            <h3 class="section-title">点检执行</h3>
          </div>
          <button
            class="button button-success"
            type="button"
            :disabled="inspectionTaskStore.activeTask.status === '已完成' || isSaving"
            @click="saveExecution"
          >
            {{ isSaving ? '保存中...' : '保存点检结果' }}
          </button>
        </div>

        <div class="entity-list">
          <article v-for="item in executionForm.results" :key="item.inspectionItemId" class="result-card">
            <div class="result-card__header">
              <div>
                <h4>{{ item.code }}</h4>
                <p>{{ item.description }}</p>
              </div>
              <label class="result-select-field">
                <span>点检结果</span>
                <select v-model="item.resultStatus" :disabled="inspectionTaskStore.activeTask.status === '已完成'">
                  <option v-for="status in inspectionTaskStore.resultStatusOptions" :key="status" :value="status">
                    {{ status }}
                  </option>
                </select>
              </label>
            </div>
          </article>
        </div>

        <div class="photo-field">
          <div class="photo-field__header">
            <div>
              <span class="photo-field__label">现场照片</span>
              <p class="photo-field__hint">支持手机拍照上传，照片将自动压缩后保存，最多 {{ MAX_PHOTO_COUNT }} 张。</p>
            </div>
            <label
              class="button button-ghost photo-upload-trigger"
              :class="{ 'is-disabled': inspectionTaskStore.activeTask.status === '已完成' || isProcessingPhotos || executionForm.photos.length >= MAX_PHOTO_COUNT }"
            >
              <input
                class="photo-upload-input"
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                :disabled="inspectionTaskStore.activeTask.status === '已完成' || isProcessingPhotos || executionForm.photos.length >= MAX_PHOTO_COUNT"
                @change="handlePhotoSelection"
              />
              {{ isProcessingPhotos ? '处理中...' : '拍照上传照片' }}
            </label>
          </div>

          <div v-if="!executionForm.photos.length" class="photo-empty-state">当前还没有上传现场照片。</div>

          <div v-else class="photo-grid">
            <article v-for="(photo, index) in executionForm.photos" :key="photo.id || `${photo.fileName}-${index}`" class="photo-card">
              <img class="photo-card__image" :src="photo.photoData" :alt="photo.fileName || `现场照片 ${index + 1}`" />
              <div class="photo-card__footer">
                <span class="photo-card__name">{{ photo.fileName || `现场照片 ${index + 1}` }}</span>
                <button
                  class="button button-danger"
                  type="button"
                  :disabled="inspectionTaskStore.activeTask.status === '已完成'"
                  @click="removePhoto(index)"
                >
                  删除
                </button>
              </div>
            </article>
          </div>
        </div>

        <div class="fault-info-field">
          <span>故障信息</span>
          <select v-model="executionForm.faultCodeId" :disabled="inspectionTaskStore.activeTask.status === '已完成'">
            <option value="">无</option>
            <option v-for="faultCode in inspectionTaskStore.faultCodes" :key="faultCode.id" :value="faultCode.id">
              {{ faultCode.code }} · {{ faultCode.description }}
            </option>
          </select>
        </div>

        <label class="fault-note-field">
          <span>故障说明</span>
          <textarea
            v-model="executionForm.faultNote"
            rows="3"
            placeholder="如点检过程中发现问题，可在完成点检项后补充故障说明"
            :disabled="inspectionTaskStore.activeTask.status === '已完成'"
          ></textarea>
        </label>
      </section>
    </template>
  </div>
</template>

<style scoped>
.section-card {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.section-headline {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.section-title {
  margin: 4px 0 0;
  font-size: 1.12rem;
}

.entity-meta-grid,
.form-two-column {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.entity-meta-block {
  display: grid;
  gap: 6px;
}

.entity-meta-label {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.task-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.task-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}

.task-status.is-pending {
  color: #9a6700;
}

.task-status.is-active {
  color: var(--color-brand);
}

.task-status.is-completed {
  color: var(--color-success);
}

.entity-list {
  display: grid;
  gap: 10px;
}

.result-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #ffffff;
}

.result-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.result-card h4 {
  margin: 0;
  font-size: 0.96rem;
}

.result-card p {
  margin: 4px 0 0;
  color: var(--color-text-soft);
  font-size: 0.82rem;
}

.result-select-field {
  min-width: 180px;
}

.fault-note-field {
  display: grid;
  gap: 8px;
}

.fault-info-field {
  display: grid;
  gap: 6px;
}

.photo-field {
  display: grid;
  gap: 12px;
}

.photo-field__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.photo-field__label {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-text);
}

.photo-field__hint {
  margin: 4px 0 0;
  color: var(--color-text-soft);
  font-size: 0.8rem;
}

.photo-upload-trigger {
  position: relative;
  overflow: hidden;
}

.photo-upload-trigger.is-disabled {
  pointer-events: none;
}

.photo-upload-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.photo-empty-state {
  display: grid;
  place-items: center;
  min-height: 120px;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  color: var(--color-text-soft);
  background: #f6f8fa;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.photo-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #ffffff;
}

.photo-card__image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(208, 215, 222, 0.6);
  background: #f6f8fa;
}

.photo-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.photo-card__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-soft);
  font-size: 0.8rem;
}

.fault-info-field > span {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-text);
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 180px;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  color: var(--color-text-soft);
  background: #f6f8fa;
}

select {
  width: 100%;
  min-height: 42px;
  border-radius: var(--radius-medium);
  border: 1px solid var(--color-border);
  background: #ffffff;
  padding: 10px 12px;
  color: var(--color-text);
}

select:focus {
  outline: none;
  border-color: var(--color-brand);
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 900px) {
  .section-headline,
  .result-card__header,
  .photo-field__header,
  .photo-card__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .result-select-field {
    width: 100%;
  }
}
</style>