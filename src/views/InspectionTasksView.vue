<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useInspectionTaskStore } from '../stores/inspectionTasks'

function createDefaultTaskTime() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
}

function toDateTimeInput(value) {
  if (!value) {
    return createDefaultTaskTime()
  }

  if (value.length >= 16 && !value.endsWith('Z')) {
    return value.slice(0, 16)
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return createDefaultTaskTime()
  }

  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
}

const inspectionTaskStore = useInspectionTaskStore()
const feedbackMessage = ref('')
const feedbackType = ref('success')
const isTaskModalOpen = ref(false)
const editingTaskId = ref('')
const isSubmitting = ref(false)

const taskForm = reactive({
  taskName: '',
  createdAt: createDefaultTaskTime(),
  equipmentId: '',
  inspectorUserId: '',
  faultCodeId: '',
  priority: '中',
  status: '待执行',
})

const taskDirectory = computed(() => inspectionTaskStore.taskDirectory)
const equipmentOptions = computed(() => inspectionTaskStore.equipmentOptions)
const inspectorOptions = computed(() => inspectionTaskStore.inspectorOptions)
const faultCodes = computed(() => inspectionTaskStore.faultCodes)
const priorityOptions = computed(() => inspectionTaskStore.priorityOptions)
const statusOptions = computed(() => inspectionTaskStore.statusOptions)
const selectedEquipment = computed(() => inspectionTaskStore.getEquipmentById(taskForm.equipmentId))
const inspectionItemPreview = computed(() => selectedEquipment.value?.inspectionItems ?? [])
const taskModalTitle = computed(() => (editingTaskId.value ? '编辑点检任务' : '创建点检任务'))

function getTaskStatusClass(status) {
  return {
    'is-pending': status === '待执行',
    'is-active': status === '执行中',
    'is-completed': status === '已完成',
  }
}

function setFeedback(message, type = 'success') {
  feedbackMessage.value = message
  feedbackType.value = type
}

function clearFeedback() {
  feedbackMessage.value = ''
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

function openTaskModal() {
  clearFeedback()
  resetTaskForm()
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

onMounted(async () => {
  const result = await inspectionTaskStore.initialize()

  if (!result.ok) {
    setFeedback(result.message, 'error')
    return
  }

  resetTaskForm()
})
</script>

<template>
  <div class="page inspection-task-page">
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
          <h2 class="page-title">点检任务</h2>
        </div>
      </div>
    </div>

    <section class="surface-card section-card">
      <div class="section-headline">
        <div>
          <p class="kicker">Inspection Tasks</p>
          <h3 class="section-title">任务清单</h3>
        </div>
        <button class="button button-success" type="button" @click="openTaskModal">创建点检任务</button>
      </div>

      <div v-if="feedbackMessage" class="notice" :class="`notice-${feedbackType}`">
        {{ feedbackMessage }}
      </div>

      <div v-if="inspectionTaskStore.isInitializing" class="notice">正在加载点检任务主数据...</div>
      <div v-if="inspectionTaskStore.initializeError" class="notice notice-error">
        {{ inspectionTaskStore.initializeError }}
      </div>

      <div v-if="!taskDirectory.length" class="empty-state">当前还没有点检任务。</div>

      <div v-else class="entity-list">
        <article v-for="task in taskDirectory" :key="task.id" class="entity-card">
          <div class="entity-card__header">
            <div>
              <h4>{{ task.taskName }}</h4>
              <p>{{ task.equipment?.equipmentCode || '未关联设备' }} · {{ task.inspector?.name || '未分配点检员' }}</p>
            </div>
            <div class="action-row">
              <RouterLink class="button button-primary" :to="{ name: 'inspection-task-execution', params: { taskId: task.id } }">
                进入点检
              </RouterLink>
              <button class="button button-ghost" type="button" @click="editTask(task)">编辑</button>
              <button class="button button-danger" type="button" @click="removeTask(task.id)">删除</button>
            </div>
          </div>

          <div class="entity-meta-grid">
            <div class="entity-meta-block">
              <span class="entity-meta-label">任务创建时间</span>
              <strong>{{ task.createdAt }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">设备责任人</span>
              <strong>{{ task.equipment?.ownerName || '未分配' }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">优先级</span>
              <strong>{{ task.priority }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">执行状态</span>
              <strong class="task-status" :class="getTaskStatusClass(task.status)">
                <span class="task-status__dot"></span>
                {{ task.status }}
              </strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">点检项数量</span>
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
          <button class="button button-ghost button-icon" type="button" aria-label="关闭弹出框" @click="closeTaskModal">
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
              <span>点检任务名称</span>
              <input v-model="taskForm.taskName" type="text" placeholder="例如 电子天平日常点检" />
            </label>

            <label>
              <span>任务创建时间</span>
              <input v-model="taskForm.createdAt" type="datetime-local" />
            </label>

            <label>
              <span>设备信息</span>
              <select v-model="taskForm.equipmentId">
                <option value="">请选择设备</option>
                <option v-for="equipment in equipmentOptions" :key="equipment.id" :value="equipment.id">
                  {{ equipment.equipmentCode }} · {{ equipment.description }}
                </option>
              </select>
            </label>

            <label>
              <span>点检员</span>
              <select v-model="taskForm.inspectorUserId">
                <option value="">请选择点检员</option>
                <option v-for="inspector in inspectorOptions" :key="inspector.id" :value="inspector.id">
                  {{ inspector.name }} / {{ inspector.accountName }}
                </option>
              </select>
            </label>

            <label>
              <span>故障信息</span>
              <select v-model="taskForm.faultCodeId">
                <option value="">无</option>
                <option v-for="faultCode in faultCodes" :key="faultCode.id" :value="faultCode.id">
                  {{ faultCode.code }} · {{ faultCode.description }}
                </option>
              </select>
            </label>

            <label>
              <span>优先级</span>
              <select v-model="taskForm.priority">
                <option v-for="priority in priorityOptions" :key="priority" :value="priority">{{ priority }}</option>
              </select>
            </label>

            <label>
              <span>状态</span>
              <select v-model="taskForm.status">
                <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
              </select>
            </label>
          </div>

          <fieldset class="selection-fieldset">
            <legend>关联点检项预览</legend>
            <div class="tag-row">
              <span v-for="item in inspectionItemPreview" :key="item.id" class="tag">
                {{ item.code }} · {{ item.description }}
              </span>
              <span v-if="!inspectionItemPreview.length" class="tag tag-muted">选择设备后展示关联点检项</span>
            </div>
          </fieldset>

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeTaskModal">取消</button>
            <button class="button button-success" type="submit" :disabled="isSubmitting">
              {{ editingTaskId ? '保存点检任务' : '创建点检任务' }}
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