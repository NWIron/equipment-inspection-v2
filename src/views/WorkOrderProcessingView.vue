<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useWorkOrderStore } from '../stores/workOrders'
import { useMessageToastStore } from '../stores/messageToast'

function createDefaultDateTime() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
}

function formatDateTimeDisplay(value) {
  if (!value) {
    return '待确认'
  }

  const normalized = String(value).trim()

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/) 

  if (match) {
    const [, year, month, day, hours, minutes, seconds = '00'] = match
    return `${year}-${day}-${month} ${hours}:${minutes}:${seconds}`
  }

  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) {
    return normalized.replace('T', ' ')
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${day}-${month} ${hours}:${minutes}:${seconds}`
}

const route = useRoute()
const router = useRouter()
const workOrderStore = useWorkOrderStore()
const toastStore = useMessageToastStore()
const isTaskModalOpen = ref(false)
const isSubmittingTask = ref(false)
const isConfirmModalOpen = ref(false)
const isConfirming = ref(false)
const editingTaskId = ref('')

const taskForm = reactive({
  taskName: '',
  engineerUserId: '',
  status: '进行中',
})

const confirmForm = reactive({
  confirmedAt: createDefaultDateTime(),
})

const workOrder = computed(() => workOrderStore.activeWorkOrder)
const isConfirmed = computed(() => Boolean(workOrder.value?.confirmedAt))
const engineerOptions = computed(() => workOrderStore.engineerOptions)
const taskStatusOptions = computed(() => workOrderStore.taskStatusOptions)
const taskModalTitle = computed(() => (editingTaskId.value ? '编辑维修任务' : '创建维修任务'))

function getTaskStatusClass(status) {
  return {
    'is-active': status === '进行中',
    'is-completed': status === '完成',
    'is-review': status === '待验收',
    'is-cancelled': status === '取消',
  }
}

function getWorkOrderStatusClass(status) {
  return {
    'is-pending': status === '待派工',
    'is-active': status === '维修中',
    'is-review': status === '待验收' || status === '待确认',
    'is-confirmed': status === '已确认',
  }
}

function setFeedback(message, type = 'success') {
  toastStore.show(message, type)
}

function resetTaskForm() {
  editingTaskId.value = ''
  taskForm.taskName = ''
  taskForm.engineerUserId = engineerOptions.value[0]?.id ?? ''
  taskForm.status = taskStatusOptions.value[0] ?? '进行中'
}

function openTaskModal() {
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
  taskForm.engineerUserId = task.engineerUserId
  taskForm.status = task.status
  isTaskModalOpen.value = true
}

async function submitTask() {
  isSubmittingTask.value = true
  const workOrderId = String(route.params.workOrderId ?? '')
  const result = editingTaskId.value
    ? await workOrderStore.updateTask(workOrderId, editingTaskId.value, taskForm)
    : await workOrderStore.createTask(workOrderId, taskForm)
  isSubmittingTask.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    closeTaskModal()
  }
}

async function removeTask(taskId) {
  const result = await workOrderStore.deleteTask(String(route.params.workOrderId ?? ''), taskId)
  setFeedback(result.message, result.ok ? 'success' : 'error')
}

function openConfirmModal() {
  confirmForm.confirmedAt = createDefaultDateTime()
  isConfirmModalOpen.value = true
}

function closeConfirmModal() {
  confirmForm.confirmedAt = createDefaultDateTime()
  isConfirmModalOpen.value = false
}

async function submitConfirmation() {
  isConfirming.value = true
  const result = await workOrderStore.confirmWorkOrder(String(route.params.workOrderId ?? ''), {
    confirmedAt: confirmForm.confirmedAt,
  })
  isConfirming.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    closeConfirmModal()
  }
}

async function removeWorkOrder() {
  const result = await workOrderStore.deleteWorkOrder(String(route.params.workOrderId ?? ''))
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    router.push({ name: 'work-order-management' })
  }
}

async function loadWorkOrder() {
  const result = await workOrderStore.loadWorkOrder(String(route.params.workOrderId ?? ''))

  if (!result.ok) {
    setFeedback(result.message, 'error')
    return
  }
}

onMounted(loadWorkOrder)
</script>

<template>
  <div class="page work-order-processing-page">
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
          <h2 class="page-title">维修工单处理</h2>
        </div>
      </div>
      <RouterLink class="button button-ghost" :to="{ name: 'work-order-management' }">返回工单清单</RouterLink>
    </div>

    <div v-if="workOrderStore.isLoadingWorkOrder" class="notice">正在加载维修工单详情...</div>
    <div v-else-if="!workOrder" class="empty-state">未找到维修工单。</div>

    <template v-else>
      <section class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Work Order</p>
            <h3 class="section-title">{{ workOrder.orderNumber }}</h3>
          </div>
          <div class="action-row">
            <button class="button" type="button" :disabled="!workOrder.canConfirm" @click="openConfirmModal">确认工单</button>
            <button class="button button-danger" type="button" :disabled="!workOrder.canDelete" @click="removeWorkOrder">
              删除工单
            </button>
          </div>
        </div>

        <div class="entity-meta-grid">
          <div class="entity-meta-block">
            <span class="entity-meta-label">工单状态</span>
            <strong class="task-status" :class="getWorkOrderStatusClass(workOrder.status)">
              <span class="task-status__dot"></span>
              {{ workOrder.status }}
            </strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">确认时间</span>
            <strong>{{ formatDateTimeDisplay(workOrder.confirmedAt) }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">来源点检任务</span>
            <strong v-if="workOrder.sourceInspectionTask">
              <RouterLink
                class="inline-link"
                :to="{ name: 'inspection-task-execution', params: { taskId: workOrder.sourceInspectionTask.id } }"
              >
                {{ workOrder.sourceInspectionTask.taskName }}
              </RouterLink>
            </strong>
            <strong v-else>无</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">任务进度</span>
            <strong>{{ workOrder.finishedTaskCount }} / {{ workOrder.taskCount }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">设备</span>
            <strong>
              {{ workOrder.equipment?.equipmentCode || '未关联设备' }} ·
              {{ workOrder.equipment?.description || '未填写设备描述' }}
            </strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">设备位置</span>
            <strong>{{ workOrder.equipment?.location || '未配置位置' }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">故障代码</span>
            <strong>{{ workOrder.faultCode?.code || '无' }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">故障描述</span>
            <strong>{{ workOrder.faultCode?.description || '无' }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">优先级</span>
            <strong>{{ workOrder.priority }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">创建时间</span>
            <strong>{{ formatDateTimeDisplay(workOrder.createdAt) }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">创建人</span>
            <strong>{{ workOrder.creator?.name || '未分配' }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">联系方式</span>
            <strong>{{ workOrder.creatorContact || workOrder.creator?.contactLabel || '未填写' }}</strong>
          </div>
        </div>
      </section>

      <section class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Maintenance Tasks</p>
            <h3 class="section-title">维修任务</h3>
          </div>
          <button class="button button-success" type="button" :disabled="isConfirmed" @click="openTaskModal">
            创建维修任务
          </button>
        </div>

        <div v-if="!workOrder.tasks.length" class="empty-state">当前还没有维修任务。</div>

        <div v-else class="entity-list">
          <article v-for="task in workOrder.tasks" :key="task.id" class="entity-card">
            <div class="entity-card__header">
              <div>
                <h4>{{ task.taskName }}</h4>
                <p>{{ task.engineer?.name || '未分配工程师' }} · {{ task.engineer?.contactLabel || '' }}</p>
              </div>
              <div class="action-row">
                <button class="button button-ghost" type="button" :disabled="isConfirmed" @click="editTask(task)">编辑</button>
                <button class="button button-danger" type="button" :disabled="isConfirmed" @click="removeTask(task.id)">删除</button>
              </div>
            </div>

            <div class="entity-meta-grid">
              <div class="entity-meta-block">
                <span class="entity-meta-label">任务状态</span>
                <strong class="task-status" :class="getTaskStatusClass(task.status)">
                  <span class="task-status__dot"></span>
                  {{ task.status }}
                </strong>
              </div>
              <div class="entity-meta-block">
                <span class="entity-meta-label">创建时间</span>
                <strong>{{ task.createdAt }}</strong>
              </div>
              <div class="entity-meta-block">
                <span class="entity-meta-label">最后更新</span>
                <strong>{{ task.updatedAt }}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <div v-if="isTaskModalOpen" class="modal-overlay" @click.self="closeTaskModal">
        <section class="surface-card modal-card">
          <div class="section-headline modal-headline">
            <div>
              <p class="kicker">Maintenance Tasks</p>
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
            <label>
              <span>任务名称</span>
              <input v-model="taskForm.taskName" type="text" placeholder="例如 更换传感器探头" />
            </label>

            <label>
              <span>维修工程师</span>
              <select v-model="taskForm.engineerUserId">
                <option value="">请选择维修工程师</option>
                <option v-for="engineer in engineerOptions" :key="engineer.id" :value="engineer.id">
                  {{ engineer.name }} / {{ engineer.accountName }}
                </option>
              </select>
            </label>

            <label>
              <span>任务状态</span>
              <select v-model="taskForm.status">
                <option v-for="status in taskStatusOptions" :key="status" :value="status">{{ status }}</option>
              </select>
            </label>

            <div class="modal-actions">
              <button class="button button-ghost" type="button" @click="closeTaskModal">取消</button>
              <button class="button button-success" type="submit" :disabled="isSubmittingTask">
                {{ editingTaskId ? '保存维修任务' : '创建维修任务' }}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div v-if="isConfirmModalOpen" class="modal-overlay" @click.self="closeConfirmModal">
        <section class="surface-card modal-card">
          <div class="section-headline modal-headline">
            <div>
              <p class="kicker">Work Orders</p>
              <h3 class="section-title">确认维修工单</h3>
            </div>
            <button class="button button-ghost button-icon" type="button" aria-label="关闭弹出框" @click="closeConfirmModal">
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

          <form class="form-grid" @submit.prevent="submitConfirmation">
            <label>
              <span>确认时间</span>
              <input v-model="confirmForm.confirmedAt" type="datetime-local" required />
            </label>

            <div class="modal-actions">
              <button class="button button-ghost" type="button" @click="closeConfirmModal">取消</button>
              <button class="button button-success" type="submit" :disabled="isConfirming">
                {{ isConfirming ? '确认中...' : '确认维修工单' }}
              </button>
            </div>
          </form>
        </section>
      </div>
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

.task-status.is-review {
  color: #8250df;
}

.task-status.is-confirmed,
.task-status.is-completed {
  color: var(--color-success);
}

.task-status.is-cancelled {
  color: var(--color-text-soft);
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

.action-row,
.modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.modal-actions {
  justify-content: flex-end;
}

.inline-link {
  color: var(--color-brand);
  text-decoration: none;
}

.inline-link:hover {
  text-decoration: underline;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.28);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 30;
}

.modal-card {
  width: min(560px, 100%);
  display: grid;
  gap: 14px;
  padding: 20px;
}

.modal-headline {
  padding-bottom: 0;
}

select,
input {
  width: 100%;
  min-height: 42px;
  border-radius: var(--radius-medium);
  border: 1px solid var(--color-border);
  background: #ffffff;
  padding: 10px 12px;
  color: var(--color-text);
}

select:focus,
input:focus {
  outline: none;
  border-color: var(--color-brand);
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
}

label {
  display: grid;
  gap: 8px;
}

label > span {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-text);
}

@media (max-width: 900px) {
  .section-headline,
  .entity-card__header,
  .modal-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>