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

function toDateTimeInput(value) {
  if (!value) {
    return createDefaultDateTime()
  }

  if (value.length >= 16 && !value.endsWith('Z')) {
    return value.slice(0, 16)
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return createDefaultDateTime()
  }

  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
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
const isWorkOrderModalOpen = ref(false)
const isConfirmModalOpen = ref(false)
const editingWorkOrderId = ref('')
const isSubmitting = ref(false)
const isConfirming = ref(false)
const confirmingWorkOrderId = ref('')
const sourceInspectionTask = ref(null)

const workOrderForm = reactive({
  equipmentId: '',
  faultCodeId: '',
  priority: '中',
  createdAt: createDefaultDateTime(),
  createdByUserId: '',
  sourceInspectionTaskId: '',
})

const confirmForm = reactive({
  confirmedAt: createDefaultDateTime(),
})

const workOrders = computed(() => workOrderStore.workOrderDirectory)
const equipmentOptions = computed(() => workOrderStore.equipmentOptions)
const creatorOptions = computed(() => workOrderStore.creatorOptions)
const faultCodes = computed(() => workOrderStore.faultCodes)
const priorityOptions = computed(() => workOrderStore.priorityOptions)
const selectedCreator = computed(() => workOrderStore.getCreatorById(workOrderForm.createdByUserId))
const workOrderModalTitle = computed(() => (editingWorkOrderId.value ? '编辑维修工单' : '创建维修工单'))

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

function applyDraftToForm(draft = null) {
  const activeDraft = draft ?? workOrderStore.draftWorkOrder
  editingWorkOrderId.value = ''
  workOrderForm.equipmentId = activeDraft?.equipmentId ?? equipmentOptions.value[0]?.id ?? ''
  workOrderForm.faultCodeId = activeDraft?.faultCodeId ?? ''
  workOrderForm.priority = activeDraft?.priority ?? priorityOptions.value[1] ?? priorityOptions.value[0] ?? '中'
  workOrderForm.createdAt = toDateTimeInput(activeDraft?.createdAt)
  workOrderForm.createdByUserId = activeDraft?.createdByUserId ?? creatorOptions.value[0]?.id ?? ''
  workOrderForm.sourceInspectionTaskId = activeDraft?.sourceInspectionTaskId ?? ''
  sourceInspectionTask.value = activeDraft?.sourceInspectionTask ?? null
}

function createBlankDraft() {
  return {
    equipmentId: equipmentOptions.value[0]?.id ?? '',
    faultCodeId: '',
    priority: priorityOptions.value[1] ?? priorityOptions.value[0] ?? '中',
    createdAt: createDefaultDateTime(),
    createdByUserId: creatorOptions.value[0]?.id ?? '',
    sourceInspectionTaskId: '',
    sourceInspectionTask: null,
  }
}

function openCreateModal() {
  applyDraftToForm(createBlankDraft())
  isWorkOrderModalOpen.value = true
}

function closeWorkOrderModal() {
  isWorkOrderModalOpen.value = false
  applyDraftToForm(createBlankDraft())
}

function editWorkOrder(workOrder) {
  editingWorkOrderId.value = workOrder.id
  workOrderForm.equipmentId = workOrder.equipmentId
  workOrderForm.faultCodeId = workOrder.faultCodeId ?? ''
  workOrderForm.priority = workOrder.priority
  workOrderForm.createdAt = toDateTimeInput(workOrder.createdAt)
  workOrderForm.createdByUserId = workOrder.createdByUserId
  workOrderForm.sourceInspectionTaskId = workOrder.sourceInspectionTaskId ?? ''
  sourceInspectionTask.value = workOrder.sourceInspectionTask ?? null
  isWorkOrderModalOpen.value = true
}

async function submitWorkOrder() {
  isSubmitting.value = true
  const payload = {
    ...workOrderForm,
  }
  const result = editingWorkOrderId.value
    ? await workOrderStore.updateWorkOrder(editingWorkOrderId.value, payload)
    : await workOrderStore.createWorkOrder(payload)
  isSubmitting.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    closeWorkOrderModal()
  }
}

async function removeWorkOrder(workOrderId) {
  const result = await workOrderStore.deleteWorkOrder(workOrderId)
  setFeedback(result.message, result.ok ? 'success' : 'error')
}

function openConfirmModal(workOrder) {
  confirmingWorkOrderId.value = workOrder.id
  confirmForm.confirmedAt = createDefaultDateTime()
  isConfirmModalOpen.value = true
}

function closeConfirmModal() {
  confirmingWorkOrderId.value = ''
  confirmForm.confirmedAt = createDefaultDateTime()
  isConfirmModalOpen.value = false
}

async function submitConfirmation() {
  isConfirming.value = true
  const result = await workOrderStore.confirmWorkOrder(confirmingWorkOrderId.value, {
    confirmedAt: confirmForm.confirmedAt,
  })
  isConfirming.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    closeConfirmModal()
  }
}

onMounted(async () => {
  const sourceTaskId = typeof route.query.sourceTaskId === 'string' ? route.query.sourceTaskId : ''
  const result = await workOrderStore.initialize(sourceTaskId)

  if (!result.ok) {
    setFeedback(result.message, 'error')
    return
  }

  applyDraftToForm()

  if (sourceTaskId && workOrderStore.draftWorkOrder?.sourceInspectionTaskId) {
    isWorkOrderModalOpen.value = true
    router.replace({ name: 'work-order-management' })
  }
})
</script>

<template>
  <div class="page work-order-page">
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
          <h2 class="page-title">维修工单</h2>
        </div>
      </div>
    </div>

    <section class="surface-card section-card">
      <div class="section-headline">
        <div>
          <p class="kicker">Work Orders</p>
          <h3 class="section-title">工单清单</h3>
        </div>
        <button class="button button-success" type="button" @click="openCreateModal">创建维修工单</button>
      </div>

      <div v-if="workOrderStore.isInitializing" class="notice">正在加载维修工单主数据...</div>

      <div v-else-if="!workOrders.length" class="empty-state">当前还没有维修工单。</div>

      <div v-else class="entity-list">
        <article v-for="workOrder in workOrders" :key="workOrder.id" class="entity-card">
          <div class="entity-card__header">
            <div>
              <h4>{{ workOrder.orderNumber }}</h4>
              <p>
                {{ workOrder.equipment?.equipmentCode || '未关联设备' }} ·
                {{ workOrder.equipment?.description || '未填写设备描述' }}
              </p>
            </div>
            <div class="action-row">
              <RouterLink class="button button-primary" :to="{ name: 'work-order-processing', params: { workOrderId: workOrder.id } }">
                进入处理
              </RouterLink>
              <button class="button button-ghost" type="button" @click="editWorkOrder(workOrder)">编辑</button>
              <button class="button" type="button" :disabled="!workOrder.canConfirm" @click="openConfirmModal(workOrder)">
                确认
              </button>
              <button class="button button-danger" type="button" :disabled="!workOrder.canDelete" @click="removeWorkOrder(workOrder.id)">
                删除
              </button>
            </div>
          </div>

          <div class="entity-meta-grid">
            <div class="entity-meta-block">
              <span class="entity-meta-label">设备位置</span>
              <strong>{{ workOrder.equipment?.location || '未配置' }}</strong>
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
          </div>

        </article>
      </div>
    </section>

    <div v-if="isWorkOrderModalOpen" class="modal-overlay" @click.self="closeWorkOrderModal">
      <section class="surface-card modal-card modal-card-wide">
        <div class="section-headline modal-headline">
          <div>
            <p class="kicker">Work Orders</p>
            <h3 class="section-title">{{ workOrderModalTitle }}</h3>
          </div>
          <button class="button button-ghost button-icon" type="button" aria-label="关闭弹出框" @click="closeWorkOrderModal">
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

        <form class="form-grid" @submit.prevent="submitWorkOrder">
          <div class="form-two-column">
            <label>
              <span>设备</span>
              <select v-model="workOrderForm.equipmentId">
                <option value="">请选择设备</option>
                <option v-for="equipment in equipmentOptions" :key="equipment.id" :value="equipment.id">
                  {{ equipment.equipmentCode }} · {{ equipment.description }} · {{ equipment.location || '未配置位置' }}
                </option>
              </select>
            </label>

            <label>
              <span>故障代码</span>
              <select v-model="workOrderForm.faultCodeId">
                <option value="">无</option>
                <option v-for="faultCode in faultCodes" :key="faultCode.id" :value="faultCode.id">
                  {{ faultCode.code }} · {{ faultCode.description }}
                </option>
              </select>
            </label>

            <label>
              <span>优先级</span>
              <select v-model="workOrderForm.priority">
                <option v-for="priority in priorityOptions" :key="priority" :value="priority">{{ priority }}</option>
              </select>
            </label>

            <label>
              <span>创建日期时间</span>
              <input v-model="workOrderForm.createdAt" type="datetime-local" />
            </label>

            <label>
              <span>创建人</span>
              <select v-model="workOrderForm.createdByUserId">
                <option value="">请选择创建人</option>
                <option v-for="creator in creatorOptions" :key="creator.id" :value="creator.id">
                  {{ creator.name }} / {{ creator.accountName }}
                </option>
              </select>
            </label>

            <label>
              <span>创建人联系方式</span>
              <input :value="selectedCreator?.contactLabel || ''" type="text" readonly placeholder="自动带出" />
            </label>

            <label v-if="sourceInspectionTask?.taskNumber">
              <span>来源点检任务</span>
              <input :value="sourceInspectionTask.taskNumber" type="text" readonly disabled />
            </label>
          </div>

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeWorkOrderModal">取消</button>
            <button class="button button-success" type="submit" :disabled="isSubmitting">
              {{ editingWorkOrderId ? '保存维修工单' : '创建维修工单' }}
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
  </div>
</template>

<style scoped>
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

.task-status.is-review {
  color: #8250df;
}

.task-status.is-confirmed {
  color: var(--color-success);
}

.form-two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

.modal-card-wide {
  width: min(880px, 100%);
}

.modal-headline {
  padding-bottom: 0;
}

.selection-fieldset {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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

label > span,
.selection-fieldset legend {
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

  .form-two-column {
    grid-template-columns: 1fr;
  }
}
</style>