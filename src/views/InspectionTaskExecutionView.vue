<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { i18n, pickLocaleText, translateStaticText } from '../i18n'
import { useInspectionTaskStore } from '../stores/inspectionTasks'
import { useMessageToastStore } from '../stores/messageToast'
import { goBackOrHome } from '../utils/navigation'
import { compressUploadPhoto } from '../utils/photoCompression'
import { formatDateTimeDisplay } from '../utils/datetime'

const route = useRoute()
const router = useRouter()
const inspectionTaskStore = useInspectionTaskStore()
const toastStore = useMessageToastStore()
const isSaving = ref(false)
const isCompleting = ref(false)
const isProcessingPhotos = ref(false)
const isVoiceRecording = ref(false)
const isVoiceButtonPressed = ref(false)
const isMobileLayout = ref(false)
const isVoiceTranscriptDetected = ref(false)

const MAX_PHOTO_COUNT = 6

let speechRecognition = null
let mobileMediaQuery = null
let speechNoteBase = ''

const SpeechRecognitionConstructor =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition || null : null

const executionForm = reactive({
  faultCodeId: '',
  faultNote: '',
  results: [],
  photos: [],
})

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

function syncMobileLayout() {
  if (!mobileMediaQuery) {
    return
  }

  isMobileLayout.value = mobileMediaQuery.matches
}

function buildVoiceNote(baseText, transcript) {
  const normalizedBase = String(baseText ?? '').trim()
  const normalizedTranscript = String(transcript ?? '').trim()

  if (!normalizedTranscript) {
    return normalizedBase
  }

  if (!normalizedBase) {
    return normalizedTranscript
  }

  return `${normalizedBase}\n${normalizedTranscript}`
}

function getVoiceErrorMessage(errorCode) {
  switch (errorCode) {
    case 'audio-capture':
      return pickLocaleText('未检测到可用麦克风，请检查设备权限。', 'No microphone was detected. Please check device permissions.')
    case 'not-allowed':
    case 'service-not-allowed':
      return pickLocaleText('语音输入权限被拒绝，请允许浏览器访问麦克风。', 'Voice input permission was denied. Please allow microphone access in the browser.')
    case 'network':
      return pickLocaleText('语音识别网络异常，请稍后重试。', 'The voice recognition network is unavailable. Please try again later.')
    case 'no-speech':
      return pickLocaleText('未识别到语音内容，请按住按钮后继续说话。', 'No speech was detected. Hold the button and speak again.')
    default:
      return pickLocaleText('语音输入暂时不可用，请稍后重试。', 'Voice input is currently unavailable. Please try again later.')
  }
}

function stopVoiceRecognition() {
  if (!speechRecognition) {
    return
  }

  speechRecognition.stop()
}

function resetVoiceInputState() {
  isVoiceRecording.value = false
  isVoiceButtonPressed.value = false
  isVoiceTranscriptDetected.value = false
  speechNoteBase = ''
}

function ensureVoiceRecognition() {
  if (!SpeechRecognitionConstructor) {
    return null
  }

  if (speechRecognition) {
    speechRecognition.lang = i18n.global.locale.value === 'en-US' ? 'en-US' : 'zh-CN'
    return speechRecognition
  }

  speechRecognition = new SpeechRecognitionConstructor()
  speechRecognition.continuous = true
  speechRecognition.interimResults = true
  speechRecognition.lang = i18n.global.locale.value === 'en-US' ? 'en-US' : 'zh-CN'

  speechRecognition.onresult = (event) => {
    let transcript = ''

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      transcript += event.results[index][0]?.transcript ?? ''
    }

    const normalizedTranscript = transcript.trim()

    if (normalizedTranscript) {
      isVoiceTranscriptDetected.value = true
    }

    executionForm.faultNote = buildVoiceNote(speechNoteBase, normalizedTranscript)
  }

  speechRecognition.onerror = (event) => {
    setFeedback(getVoiceErrorMessage(event.error), 'error')
  }

  speechRecognition.onend = () => {
    if (isVoiceRecording.value && !isVoiceTranscriptDetected.value) {
      setFeedback(pickLocaleText('录音已结束，未识别到新的故障说明。', 'Voice recording ended and no new fault notes were recognized.'), 'info')
    }

    resetVoiceInputState()
  }

  return speechRecognition
}

function startVoiceRecognition() {
  if (inspectionTaskStore.activeTask?.status === '已完成') {
    return
  }

  const recognition = ensureVoiceRecognition()

  if (!recognition) {
    setFeedback(pickLocaleText('当前浏览器暂不支持语音输入，请使用最新版 Chrome 或 Edge。', 'This browser does not support voice input yet. Please use a recent version of Chrome or Edge.'), 'error')
    return
  }

  if (isVoiceRecording.value) {
    return
  }

  speechNoteBase = String(executionForm.faultNote ?? '').trim()
  isVoiceTranscriptDetected.value = false
  isVoiceRecording.value = true
  isVoiceButtonPressed.value = true

  try {
    recognition.start()
  } catch {
    resetVoiceInputState()
    setFeedback(pickLocaleText('无法启动语音输入，请稍后重试。', 'Unable to start voice input. Please try again later.'), 'error')
  }
}

function handleVoicePressStart(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }

  event.preventDefault()
  startVoiceRecognition()
}

function handleVoicePressEnd(event) {
  event.preventDefault()
  isVoiceButtonPressed.value = false

  if (!isVoiceRecording.value) {
    return
  }

  stopVoiceRecognition()
}

function goBack() {
  goBackOrHome(router)
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
    setFeedback(pickLocaleText(`现场照片最多上传 ${MAX_PHOTO_COUNT} 张。`, `You can upload up to ${MAX_PHOTO_COUNT} site photos.`), 'error')
    return
  }

  if (files.length > remainingCount) {
    setFeedback(pickLocaleText(`超出数量上限，仅会保留前 ${remainingCount} 张新照片。`, `The limit was exceeded. Only the first ${remainingCount} new photos will be kept.`), 'info')
  }

  isProcessingPhotos.value = true

  try {
    const newPhotos = []

    for (const file of files.slice(0, remainingCount)) {
      newPhotos.push(await compressUploadPhoto(file))
    }

    executionForm.photos.push(...newPhotos)
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : pickLocaleText('处理照片失败，请重试。', 'Failed to process the photo. Please try again.'), 'error')
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

onMounted(() => {
  mobileMediaQuery = window.matchMedia('(max-width: 900px)')
  syncMobileLayout()
  mobileMediaQuery.addEventListener('change', syncMobileLayout)
  loadTask()
})

onBeforeUnmount(() => {
  mobileMediaQuery?.removeEventListener('change', syncMobileLayout)
  mobileMediaQuery = null
  speechRecognition?.abort()
  speechRecognition = null
  resetVoiceInputState()
})
</script>

<template>
  <div class="page task-execution-page">
    <div class="page-header">
      <div class="page-header-main">
        <button class="button button-ghost button-icon" type="button" aria-label="返回上一页" @click="goBack">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M9.5 3.5L5 8l4.5 4.5"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
            />
          </svg>
        </button>
        <div class="page-header-copy">
          <h2 class="page-title">{{ pickLocaleText('任务点检', 'Task Execution') }}</h2>
        </div>
      </div>
    </div>

    <div v-if="inspectionTaskStore.isLoadingTask" class="notice">{{ pickLocaleText('正在加载任务详情...', 'Loading task details...') }}</div>
    <div v-else-if="!inspectionTaskStore.activeTask" class="empty-state">{{ pickLocaleText('未找到点检任务。', 'Inspection task not found.') }}</div>

    <template v-else>
      <section class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Inspection Task</p>
            <h3 class="section-title">{{ inspectionTaskStore.activeTask.taskName }}</h3>
          </div>
          <div class="action-row">
              <RouterLink
                v-if="inspectionTaskStore.activeTask.linkedWorkOrder"
                class="button"
                :to="{
                  name: 'work-order-processing',
                  params: { workOrderId: inspectionTaskStore.activeTask.linkedWorkOrder.id },
                }"
              >
                {{ pickLocaleText('查看对应工单', 'View linked work order') }}
              </RouterLink>
              <RouterLink
                v-else
                class="button"
                :to="{ name: 'work-order-management', query: { sourceTaskId: inspectionTaskStore.activeTask.id } }"
              >
                {{ pickLocaleText('创建维修工单', 'Create work order') }}
              </RouterLink>
            <button
              class="button button-success"
              type="button"
              :disabled="!inspectionTaskStore.activeTask.canComplete || isCompleting"
              @click="completeTask"
            >
              {{ isCompleting ? pickLocaleText('提交中...', 'Submitting...') : pickLocaleText('标记已完成', 'Mark as completed') }}
            </button>
          </div>
        </div>

        <div class="entity-meta-grid">
          <div class="entity-meta-block">
            <span class="entity-meta-label">{{ pickLocaleText('任务单号', 'Task number') }}</span>
            <strong>{{ inspectionTaskStore.activeTask.taskNumber || pickLocaleText('待生成', 'Pending generation') }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">{{ pickLocaleText('设备信息', 'Equipment') }}</span>
            <strong>
              {{ inspectionTaskStore.activeTask.equipment?.equipmentCode }} ·
              {{ inspectionTaskStore.activeTask.equipment?.description }}
            </strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">{{ pickLocaleText('点检员', 'Inspector') }}</span>
            <strong>{{ inspectionTaskStore.activeTask.inspector?.name || pickLocaleText('未分配', 'Unassigned') }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">{{ pickLocaleText('设备责任人', 'Equipment owner') }}</span>
            <strong>{{ inspectionTaskStore.activeTask.equipment?.ownerName || pickLocaleText('未分配', 'Unassigned') }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">{{ pickLocaleText('任务创建时间', 'Created at') }}</span>
            <strong>{{ formatDateTimeDisplay(inspectionTaskStore.activeTask.createdAt) }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">{{ pickLocaleText('优先级', 'Priority') }}</span>
            <strong>{{ translateStaticText(inspectionTaskStore.activeTask.priority) }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">{{ pickLocaleText('执行状态', 'Execution status') }}</span>
            <strong class="task-status" :class="getTaskStatusClass(inspectionTaskStore.activeTask.status)">
              <span class="task-status__dot"></span>
              {{ translateStaticText(inspectionTaskStore.activeTask.status) }}
            </strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">{{ pickLocaleText('关联工单', 'Linked work order') }}</span>
            <strong>
              {{ inspectionTaskStore.activeTask.linkedWorkOrder?.orderNumber || pickLocaleText('未创建', 'Not created') }}
            </strong>
          </div>
        </div>
      </section>

      <section class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Execution</p>
            <h3 class="section-title">{{ pickLocaleText('点检执行', 'Inspection execution') }}</h3>
          </div>
          <button
            class="button button-success"
            type="button"
            :disabled="inspectionTaskStore.activeTask.status === '已完成' || isSaving"
            @click="saveExecution"
          >
            {{ isSaving ? pickLocaleText('保存中...', 'Saving...') : pickLocaleText('保存点检结果', 'Save inspection results') }}
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
                <span>{{ pickLocaleText('点检结果', 'Inspection result') }}</span>
                <select v-model="item.resultStatus" :disabled="inspectionTaskStore.activeTask.status === '已完成'">
                  <option v-for="status in inspectionTaskStore.resultStatusOptions" :key="status" :value="status">
                    {{ translateStaticText(status) }}
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
              <p class="photo-field__hint">{{ pickLocaleText(`支持手机拍照上传，照片将自动压缩后保存，最多 ${MAX_PHOTO_COUNT} 张。`, `You can upload photos from a mobile device. Photos are compressed automatically before saving, with a maximum of ${MAX_PHOTO_COUNT} photos.`) }}</p>
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
              {{ isProcessingPhotos ? pickLocaleText('处理中...', 'Processing...') : pickLocaleText('拍照上传照片', 'Capture and upload') }}
            </label>
          </div>

          <div v-if="!executionForm.photos.length" class="photo-empty-state">{{ pickLocaleText('当前还没有上传现场照片。', 'No site photos have been uploaded yet.') }}</div>

          <div v-else class="photo-grid">
            <article v-for="(photo, index) in executionForm.photos" :key="photo.id || `${photo.fileName}-${index}`" class="photo-card">
              <img class="photo-card__image" :src="photo.photoData" :alt="photo.fileName || pickLocaleText(`现场照片 ${index + 1}`, `Site photo ${index + 1}`)" />
              <div class="photo-card__footer">
                <span class="photo-card__name">{{ photo.fileName || pickLocaleText(`现场照片 ${index + 1}`, `Site photo ${index + 1}`) }}</span>
                <button
                  class="button button-danger"
                  type="button"
                  :disabled="inspectionTaskStore.activeTask.status === '已完成'"
                  @click="removePhoto(index)"
                >
                  {{ pickLocaleText('删除', 'Delete') }}
                </button>
              </div>
            </article>
          </div>
        </div>

        <div class="fault-info-field">
          <span>{{ pickLocaleText('故障信息', 'Fault information') }}</span>
          <select v-model="executionForm.faultCodeId" :disabled="inspectionTaskStore.activeTask.status === '已完成'">
            <option value="">{{ pickLocaleText('无', 'None') }}</option>
            <option v-for="faultCode in inspectionTaskStore.faultCodes" :key="faultCode.id" :value="faultCode.id">
              {{ faultCode.code }} · {{ faultCode.description }}
            </option>
          </select>
        </div>

        <label class="fault-note-field">
          <div class="fault-note-field__header">
            <span>{{ pickLocaleText('故障说明', 'Fault notes') }}</span>
            <button
              v-if="!isMobileLayout"
              class="button button-ghost button-icon voice-input-trigger"
              :class="{ 'is-recording': isVoiceRecording || isVoiceButtonPressed }"
              type="button"
              :aria-label="pickLocaleText('长按开始语音输入，松开停止', 'Press and hold to start voice input, release to stop')"
              :disabled="inspectionTaskStore.activeTask.status === '已完成'"
              @pointerdown="handleVoicePressStart"
              @pointerup="handleVoicePressEnd"
              @pointerleave="handleVoicePressEnd"
              @pointercancel="handleVoicePressEnd"
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 2.75a1.75 1.75 0 011.75 1.75v3.25a1.75 1.75 0 11-3.5 0V4.5A1.75 1.75 0 018 2.75z"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.4"
                />
                <path
                  d="M4.75 7.75a3.25 3.25 0 006.5 0"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.4"
                />
                <path
                  d="M8 11v2.25M5.75 13.25h4.5"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.4"
                />
              </svg>
            </button>
          </div>
          <textarea
            v-model="executionForm.faultNote"
            rows="3"
            :placeholder="pickLocaleText('如点检过程中发现问题，可在完成点检项后补充故障说明', 'If issues are found during inspection, add fault notes after completing the checklist items.')"
            :disabled="inspectionTaskStore.activeTask.status === '已完成'"
          ></textarea>
          <span v-if="!isMobileLayout" class="fault-note-field__hint">
            {{ isVoiceRecording ? pickLocaleText('正在录音，松开按钮后自动停止。', 'Recording in progress. Release the button to stop.') : pickLocaleText('长按麦克风按钮开始语音输入，松开后停止。', 'Press and hold the microphone button to start voice input, then release to stop.') }}
          </span>
        </label>

        <button
          v-if="isMobileLayout"
          class="button voice-input-trigger voice-input-trigger--mobile"
          :class="{ 'is-recording': isVoiceRecording || isVoiceButtonPressed }"
          type="button"
          :disabled="inspectionTaskStore.activeTask.status === '已完成'"
          @pointerdown="handleVoicePressStart"
          @pointerup="handleVoicePressEnd"
          @pointerleave="handleVoicePressEnd"
          @pointercancel="handleVoicePressEnd"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 2.75a1.75 1.75 0 011.75 1.75v3.25a1.75 1.75 0 11-3.5 0V4.5A1.75 1.75 0 018 2.75z"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.4"
            />
            <path
              d="M4.75 7.75a3.25 3.25 0 006.5 0"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.4"
            />
            <path
              d="M8 11v2.25M5.75 13.25h4.5"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.4"
            />
          </svg>
          <span>
            {{ isVoiceRecording ? pickLocaleText('松开结束语音输入', 'Release to stop voice input') : pickLocaleText('长按开始语音输入', 'Press and hold to start voice input') }}
          </span>
        </button>
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

.fault-note-field__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.fault-note-field__hint {
  color: var(--color-text-soft);
  font-size: 0.78rem;
}

.fault-info-field {
  display: grid;
  gap: 6px;
}

.voice-input-trigger {
  flex-shrink: 0;
  border-color: rgba(9, 105, 218, 0.18);
  color: var(--color-brand);
}

.voice-input-trigger svg {
  width: 16px;
  height: 16px;
}

.voice-input-trigger.is-recording {
  background: rgba(9, 105, 218, 0.1);
  border-color: rgba(9, 105, 218, 0.3);
  color: var(--color-brand-strong);
}

.voice-input-trigger--mobile {
  width: 100%;
  min-height: 46px;
  justify-content: center;
  gap: 10px;
  padding: 0 18px;
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
  .photo-card__footer,
  .fault-note-field__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .result-select-field {
    width: 100%;
  }

  .voice-input-trigger--mobile {
    align-self: stretch;
  }
}
</style>