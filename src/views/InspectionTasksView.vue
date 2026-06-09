<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { pickLocaleText, translateStaticText } from '../i18n'
import { useInspectionTaskStore } from '../stores/inspectionTasks'
import { useMessageToastStore } from '../stores/messageToast'
import { goBackOrHome } from '../utils/navigation'
import {
  createDateTimeInputValue as createDefaultTaskTime,
  formatDateTimeDisplay,
  toDateTimeInputValue as toDateTimeInput,
} from '../utils/datetime'

const route = useRoute()
const router = useRouter()
const inspectionTaskStore = useInspectionTaskStore()
const toastStore = useMessageToastStore()
const isTaskModalOpen = ref(false)
const editingTaskId = ref('')
const isSubmitting = ref(false)
const isFilterPanelCollapsed = ref(true)

const taskForm = reactive({
  taskName: '',
  createdAt: createDefaultTaskTime(),
  equipmentId: '',
  inspectorUserId: '',
  faultCodeId: '',
  priority: '中',
  status: '待执行',
})

const filters = reactive({
  keyword: '',
  status: '',
  priority: '',
  equipmentId: '',
  inspectorUserId: '',
})

const taskDirectory = computed(() => inspectionTaskStore.taskDirectory)
const equipmentOptions = computed(() => inspectionTaskStore.equipmentOptions)
const inspectorOptions = computed(() => inspectionTaskStore.inspectorOptions)
const priorityOptions = computed(() => inspectionTaskStore.priorityOptions)
const statusOptions = computed(() => inspectionTaskStore.statusOptions)
const selectedEquipment = computed(() => inspectionTaskStore.getEquipmentById(taskForm.equipmentId))
const inspectionItemPreview = computed(() => selectedEquipment.value?.inspectionItems ?? [])
const taskModalTitle = computed(() =>
  editingTaskId.value ? pickLocaleText('编辑点检任务', 'Edit inspection task') : pickLocaleText('创建点检任务', 'Create inspection task'),
)
const filteredTaskDirectory = computed(() =>
  taskDirectory.value.filter((task) => {
    const keyword = String(filters.keyword ?? '').trim().toLowerCase()
    const matchesKeyword =
      !keyword ||
      [
        task.taskName,
        task.taskNumber,
        task.equipment?.equipmentCode,
        task.equipment?.description,
        task.inspector?.name,
        task.inspector?.accountName,
      ].some((value) => String(value ?? '').trim().toLowerCase().includes(keyword))
    const matchesStatus = !filters.status || task.status === filters.status
    const matchesPriority = !filters.priority || task.priority === filters.priority
    const matchesEquipment = !filters.equipmentId || task.equipmentId === filters.equipmentId
    const matchesInspector = !filters.inspectorUserId || task.inspectorUserId === filters.inspectorUserId

    return matchesKeyword && matchesStatus && matchesPriority && matchesEquipment && matchesInspector
  }),
)

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

function clearFeedback() {
}

function goBack() {
  goBackOrHome(router)
}

function toggleFilterPanel() {
  isFilterPanelCollapsed.value = !isFilterPanelCollapsed.value
}

function getFilterToggleLabel() {
  return isFilterPanelCollapsed.value ? pickLocaleText('展开筛选', 'Show filters') : pickLocaleText('收起筛选', 'Hide filters')
}

function resetFilters() {
  filters.keyword = ''
  filters.status = ''
  filters.priority = ''
  filters.equipmentId = ''
  filters.inspectorUserId = ''
}

function resetTaskForm() {
  editingTaskId.value = ''
  taskForm.taskName = ''
  taskForm.createdAt = createDefaultTaskTime()
  taskForm.equipmentId = equipmentOptions.value[0]?.id ?? ''
  taskForm.inspectorUserId = inspectorOptions.value[0]?.id ?? ''
  taskForm.faultCodeId = ''
  taskForm.priority = priorityOptions.value[1] ?? priorityOptions.value[0] ?? '中'
  taskForm.status = statusOptions.value[0] ?? '待执行'
}

function openTaskModal(initialValues = {}) {
  clearFeedback()
  resetTaskForm()

  if (typeof initialValues.equipmentId === 'string' && initialValues.equipmentId) {
    taskForm.equipmentId = initialValues.equipmentId
  }

  isTaskModalOpen.value = true
}

function closeTaskModal() {
  isTaskModalOpen.value = false
  resetTaskForm()
}

function editTask(task) {
  editingTaskId.value = task.id
  taskForm.taskName = task.taskName
  taskForm.createdAt = toDateTimeInput(task.createdAt)
  taskForm.equipmentId = task.equipmentId
  taskForm.inspectorUserId = task.inspectorUserId
  taskForm.faultCodeId = task.faultCodeId ?? ''
  taskForm.priority = task.priority
  taskForm.status = task.status === '已完成' ? '执行中' : task.status
  clearFeedback()
  isTaskModalOpen.value = true
}

async function submitTask() {
  isSubmitting.value = true
  const result = editingTaskId.value
    ? await inspectionTaskStore.updateTask(editingTaskId.value, taskForm)
    : await inspectionTaskStore.createTask(taskForm)
  isSubmitting.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    closeTaskModal()
  }
}

async function removeTask(taskId) {
  const result = await inspectionTaskStore.deleteTask(taskId)
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok && editingTaskId.value === taskId) {
    resetTaskForm()
  }
}

async function consumeScannedEquipmentQuery() {
  const shouldCreateTask = String(route.query.createTask ?? '') === '1'
  const scannedEquipmentCode = typeof route.query.equipmentCode === 'string' ? route.query.equipmentCode.trim().toUpperCase() : ''

  if (!shouldCreateTask) {
    return
  }

  if (!scannedEquipmentCode) {
    setFeedback(pickLocaleText('二维码中未包含设备编码，请重新扫描。', 'The QR code does not contain an equipment code. Please scan again.'), 'error')
    await router.replace({ name: 'inspection-task-management' })
    return
  }

  const scannedEquipment = equipmentOptions.value.find(
    (equipment) => String(equipment.equipmentCode ?? '').trim().toUpperCase() === scannedEquipmentCode,
  )

  if (!scannedEquipment) {
    setFeedback(pickLocaleText('未找到二维码对应的设备编码，请确认二维码内容是否正确。', 'No equipment matched the scanned code. Please verify the QR content.'), 'error')
    await router.replace({ name: 'inspection-task-management' })
    return
  }

  const activeTask = taskDirectory.value.find(
    (task) =>
      String(task.equipment?.equipmentCode ?? '').trim().toUpperCase() === scannedEquipmentCode &&
      task.status !== '已完成',
  )

  if (activeTask) {
    setFeedback(pickLocaleText(
      `设备 ${scannedEquipment.equipmentCode} 已存在未完成点检任务，已为你打开对应任务。`,
      `Equipment ${scannedEquipment.equipmentCode} already has an unfinished inspection task. The related task has been opened for you.`,
    ), 'info')
    await router.replace({
      name: 'inspection-task-execution',
      params: { taskId: activeTask.id },
    })
    return
  }

  openTaskModal({ equipmentId: scannedEquipment.id })
  setFeedback(
    pickLocaleText(
      `已识别设备 ${scannedEquipment.equipmentCode}，请继续完善点检任务信息。`,
      `Equipment ${scannedEquipment.equipmentCode} was recognized. Please complete the inspection task details.`,
    ),
    'info',
  )
  await router.replace({ name: 'inspection-task-management' })
}

onMounted(async () => {
  const result = await inspectionTaskStore.initialize()

  if (!result.ok) {
    setFeedback(result.message, 'error')
    return
  }

  resetTaskForm()
  await consumeScannedEquipmentQuery()
})
</script>

<template>
  <div class="page inspection-task-page">
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
          <h2 class="page-title">{{ pickLocaleText('点检任务', 'Inspection Tasks') }}</h2>
        </div>
      </div>
    </div>

    <section class="surface-card section-card">
      <div class="section-headline">
        <div>
          <p class="kicker">Inspection Tasks</p>
          <h3 class="section-title">{{ pickLocaleText('任务清单', 'Task list') }}</h3>
        </div>
        <div class="action-row">
          <button
            class="button button-ghost button-icon filter-toggle"
            :class="{ 'is-active': !isFilterPanelCollapsed }"
            type="button"
            :aria-label="getFilterToggleLabel()"
            :aria-pressed="!isFilterPanelCollapsed"
            :title="getFilterToggleLabel()"
            @click="toggleFilterPanel"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M2.5 3.5h11L9.25 8.3v3.05l-2.5 1.15V8.3L2.5 3.5z"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.3"
              />
            </svg>
          </button>
          <button class="button button-success" type="button" @click="openTaskModal">{{ pickLocaleText('创建点检任务', 'Create inspection task') }}</button>
        </div>
      </div>

      <div v-if="inspectionTaskStore.isInitializing" class="notice">{{ pickLocaleText('正在加载点检任务主数据...', 'Loading inspection task master data...') }}</div>

      <div v-if="taskDirectory.length && !isFilterPanelCollapsed" class="filter-toolbar surface-muted">
        <label class="filter-field filter-field-search">
          <span>{{ pickLocaleText('关键字', 'Keyword') }}</span>
          <input
            v-model="filters.keyword"
            type="search"
            :placeholder="pickLocaleText('任务名称、任务单号、设备、点检员', 'Task name, task number, equipment, inspector')"
          />
        </label>
        <label class="filter-field">
          <span>{{ pickLocaleText('状态', 'Status') }}</span>
          <select v-model="filters.status">
            <option value="">{{ pickLocaleText('全部状态', 'All statuses') }}</option>
            <option v-for="status in statusOptions" :key="status" :value="status">{{ translateStaticText(status) }}</option>
          </select>
        </label>
        <label class="filter-field">
          <span>{{ pickLocaleText('优先级', 'Priority') }}</span>
          <select v-model="filters.priority">
            <option value="">{{ pickLocaleText('全部优先级', 'All priorities') }}</option>
            <option v-for="priority in priorityOptions" :key="priority" :value="priority">{{ translateStaticText(priority) }}</option>
          </select>
        </label>
        <label class="filter-field">
          <span>{{ pickLocaleText('设备', 'Equipment') }}</span>
          <select v-model="filters.equipmentId">
            <option value="">{{ pickLocaleText('全部设备', 'All equipment') }}</option>
            <option v-for="equipment in equipmentOptions" :key="equipment.id" :value="equipment.id">{{ equipment.equipmentCode }}</option>
          </select>
        </label>
        <label class="filter-field">
          <span>{{ pickLocaleText('点检员', 'Inspector') }}</span>
          <select v-model="filters.inspectorUserId">
            <option value="">{{ pickLocaleText('全部点检员', 'All inspectors') }}</option>
            <option v-for="inspector in inspectorOptions" :key="inspector.id" :value="inspector.id">{{ inspector.name }}</option>
          </select>
        </label>
        <button class="button button-ghost filter-reset" type="button" @click="resetFilters">{{ pickLocaleText('重置筛选', 'Reset filters') }}</button>
      </div>

      <div v-if="!taskDirectory.length" class="empty-state">{{ pickLocaleText('当前还没有点检任务。', 'There are no inspection tasks yet.') }}</div>

      <div v-else-if="!filteredTaskDirectory.length" class="empty-state">{{ pickLocaleText('没有符合筛选条件的点检任务。', 'No inspection tasks match the current filters.') }}</div>

      <div v-else class="entity-list">
        <article v-for="task in filteredTaskDirectory" :key="task.id" class="entity-card">
          <div class="entity-card__header">
            <div>
              <h4>{{ task.taskName }}</h4>
              <p>{{ task.taskNumber || pickLocaleText('待生成任务单号', 'Task number pending') }} · {{ task.equipment?.equipmentCode || pickLocaleText('未关联设备', 'No linked equipment') }} · {{ task.inspector?.name || pickLocaleText('未分配点检员', 'Inspector not assigned') }}</p>
            </div>
            <div class="action-row">
              <RouterLink class="button button-primary" :to="{ name: 'inspection-task-execution', params: { taskId: task.id } }">
                {{ pickLocaleText('进入点检', 'Open task') }}
              </RouterLink>
              <button class="button button-ghost" type="button" @click="editTask(task)">{{ pickLocaleText('编辑', 'Edit') }}</button>
              <button class="button button-danger" type="button" @click="removeTask(task.id)">{{ pickLocaleText('删除', 'Delete') }}</button>
            </div>
          </div>

          <div class="entity-meta-grid">
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('任务单号', 'Task number') }}</span>
              <strong>{{ task.taskNumber || pickLocaleText('待生成', 'Pending generation') }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('任务创建时间', 'Created at') }}</span>
              <strong>{{ formatDateTimeDisplay(task.createdAt) }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('设备责任人', 'Equipment owner') }}</span>
              <strong>{{ task.equipment?.ownerName || pickLocaleText('未分配', 'Unassigned') }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('优先级', 'Priority') }}</span>
              <strong>{{ translateStaticText(task.priority) }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('执行状态', 'Execution status') }}</span>
              <strong class="task-status" :class="getTaskStatusClass(task.status)">
                <span class="task-status__dot"></span>
                {{ translateStaticText(task.status) }}
              </strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('点检项数量', 'Inspection item count') }}</span>
              <strong>{{ task.inspectionItemCount }}</strong>
            </div>
          </div>

          <div class="tag-row">
            <span v-for="item in task.inspectionResults" :key="item.inspectionItemId" class="tag">
              {{ item.code }}
            </span>
          </div>
        </article>
      </div>
    </section>

    <div v-if="isTaskModalOpen" class="modal-overlay" @click.self="closeTaskModal">
      <section class="surface-card modal-card modal-card-wide">
        <div class="section-headline modal-headline">
          <div>
            <p class="kicker">Inspection Tasks</p>
            <h3 class="section-title">{{ taskModalTitle }}</h3>
          </div>
          <button class="button button-ghost button-icon" type="button" :aria-label="pickLocaleText('关闭弹出框', 'Close dialog')" @click="closeTaskModal">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
              />
            </svg>
          </button>
        </div>

        <form class="form-grid" @submit.prevent="submitTask">
          <div class="form-two-column">
            <label>
              <span>{{ pickLocaleText('点检任务名称', 'Inspection task name') }}</span>
              <input v-model="taskForm.taskName" type="text" :placeholder="pickLocaleText('例如 电子天平日常点检', 'Example: Daily balance inspection')" />
            </label>

            <label>
              <span>{{ pickLocaleText('任务创建时间', 'Created at') }}</span>
              <input v-model="taskForm.createdAt" type="datetime-local" />
            </label>

            <label>
              <span>{{ pickLocaleText('设备信息', 'Equipment') }}</span>
              <select v-model="taskForm.equipmentId">
                <option value="">{{ pickLocaleText('请选择设备', 'Select equipment') }}</option>
                <option v-for="equipment in equipmentOptions" :key="equipment.id" :value="equipment.id">
                  {{ equipment.equipmentCode }} · {{ equipment.description }}
                </option>
              </select>
            </label>

            <label>
              <span>{{ pickLocaleText('点检员', 'Inspector') }}</span>
              <select v-model="taskForm.inspectorUserId">
                <option value="">{{ pickLocaleText('请选择点检员', 'Select an inspector') }}</option>
                <option v-for="inspector in inspectorOptions" :key="inspector.id" :value="inspector.id">
                  {{ inspector.name }} / {{ inspector.accountName }}
                </option>
              </select>
            </label>

            <label>
              <span>{{ pickLocaleText('优先级', 'Priority') }}</span>
              <select v-model="taskForm.priority">
                <option v-for="priority in priorityOptions" :key="priority" :value="priority">{{ translateStaticText(priority) }}</option>
              </select>
            </label>

            <label>
              <span>{{ pickLocaleText('状态', 'Status') }}</span>
              <select v-model="taskForm.status">
                <option v-for="status in statusOptions" :key="status" :value="status">{{ translateStaticText(status) }}</option>
              </select>
            </label>
          </div>

          <fieldset class="selection-fieldset">
            <legend>{{ pickLocaleText('关联点检项预览', 'Linked inspection items preview') }}</legend>
            <div class="tag-row">
              <span v-for="item in inspectionItemPreview" :key="item.id" class="tag">
                {{ item.code }} · {{ item.description }}
              </span>
              <span v-if="!inspectionItemPreview.length" class="tag tag-muted">{{ pickLocaleText('选择设备后展示关联点检项', 'Linked inspection items appear after equipment selection') }}</span>
            </div>
          </fieldset>

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeTaskModal">{{ pickLocaleText('取消', 'Cancel') }}</button>
            <button class="button button-success" type="submit" :disabled="isSubmitting">
              {{ editingTaskId ? pickLocaleText('保存点检任务', 'Save inspection task') : pickLocaleText('创建点检任务', 'Create inspection task') }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.inspection-task-page .tag {
  border-radius: 8px;
}

.section-card {
  display: grid;
  gap: 12px;
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

.filter-toolbar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #f6f8fa;
}

.filter-field {
  display: grid;
  gap: 6px;
}

.filter-field span {
  font-size: 0.78rem;
  color: var(--color-text-soft);
}

.filter-field-search {
  grid-column: span 2;
}

.filter-reset {
  align-self: end;
  justify-self: start;
}

.filter-toggle.is-active {
  color: var(--color-brand);
  border-color: rgba(9, 105, 218, 0.28);
  background: rgba(9, 105, 218, 0.08);
}

.entity-list {
  display: grid;
  gap: 10px;
}

.entity-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #ffffff;
}

.entity-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.entity-card h4 {
  margin: 0;
  font-size: 0.96rem;
}

.entity-card p {
  margin: 4px 0 0;
  color: var(--color-text-soft);
  font-size: 0.82rem;
}

.entity-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
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

.form-two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
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

.empty-state {
  display: grid;
  place-items: center;
  min-height: 180px;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  color: var(--color-text-soft);
  background: #f6f8fa;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(31, 35, 40, 0.28);
}

.modal-card {
  width: min(760px, 100%);
  max-height: min(88vh, 860px);
  overflow: auto;
  padding: 18px;
  background: #ffffff;
}

.modal-card-wide {
  width: min(920px, 100%);
}

.modal-headline {
  margin-bottom: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.tag-muted {
  color: var(--color-text-soft);
}

@media (max-width: 900px) {
  .entity-card__header,
  .section-headline {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-field-search {
    grid-column: span 1;
  }

  .form-two-column {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-card {
    padding: 14px;
  }
}
</style>