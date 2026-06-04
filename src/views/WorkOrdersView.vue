<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { pickLocaleText, translateStaticText } from '../i18n'
import { useWorkOrderStore } from '../stores/workOrders'
import { useMessageToastStore } from '../stores/messageToast'
import { goBackOrHome } from '../utils/navigation'
import {
  createDateTimeInputValue as createDefaultDateTime,
  formatDateTimeDisplay,
  toDateTimeInputValue as toDateTimeInput,
} from '../utils/datetime'

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
const workOrderModalTitle = computed(() =>
  editingWorkOrderId.value ? pickLocaleText('编辑维修工单', 'Edit work order') : pickLocaleText('创建维修工单', 'Create work order'),
)

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

function goBack() {
  goBackOrHome(router)
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

  const existingSourceWorkOrder = sourceTaskId
    ? workOrders.value.find((workOrder) => workOrder.sourceInspectionTaskId === sourceTaskId) ?? null
    : null

  if (existingSourceWorkOrder) {
    setFeedback(
      pickLocaleText(
        `该点检任务已关联工单 ${existingSourceWorkOrder.orderNumber}，已为你打开对应工单。`,
        `This inspection task is already linked to work order ${existingSourceWorkOrder.orderNumber}. The related work order has been opened for you.`,
      ),
      'info',
    )
    router.replace({
      name: 'work-order-processing',
      params: { workOrderId: existingSourceWorkOrder.id },
    })
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
        <button class="button button-ghost button-icon" type="button" :aria-label="pickLocaleText('返回上一页', 'Go back')" @click="goBack">
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
          <h2 class="page-title">{{ pickLocaleText('维修工单', 'Work Orders') }}</h2>
        </div>
      </div>
    </div>

    <section class="surface-card section-card">
      <div class="section-headline">
        <div>
          <p class="kicker">Work Orders</p>
          <h3 class="section-title">{{ pickLocaleText('工单清单', 'Work-order list') }}</h3>
        </div>
        <button class="button button-success" type="button" @click="openCreateModal">{{ pickLocaleText('创建维修工单', 'Create work order') }}</button>
      </div>

      <div v-if="workOrderStore.isInitializing" class="notice">{{ pickLocaleText('正在加载维修工单主数据...', 'Loading work-order master data...') }}</div>

      <div v-else-if="!workOrders.length" class="empty-state">{{ pickLocaleText('当前还没有维修工单。', 'There are no work orders yet.') }}</div>

      <div v-else class="entity-list">
        <article v-for="workOrder in workOrders" :key="workOrder.id" class="entity-card">
          <div class="entity-card__header">
            <div>
              <h4>{{ workOrder.orderNumber }}</h4>
              <p>
                {{ workOrder.equipment?.equipmentCode || translateStaticText('未关联设备') }} ·
                {{ workOrder.equipment?.description || translateStaticText('未填写设备描述') }}
              </p>
            </div>
            <div class="action-row">
              <RouterLink class="button button-primary" :to="{ name: 'work-order-processing', params: { workOrderId: workOrder.id } }">
                {{ pickLocaleText('进入处理', 'Open work order') }}
              </RouterLink>
              <button class="button button-ghost" type="button" @click="editWorkOrder(workOrder)">{{ pickLocaleText('编辑', 'Edit') }}</button>
              <button class="button" type="button" :disabled="!workOrder.canConfirm" @click="openConfirmModal(workOrder)">
                {{ pickLocaleText('确认', 'Confirm') }}
              </button>
              <button class="button button-danger" type="button" :disabled="!workOrder.canDelete" @click="removeWorkOrder(workOrder.id)">
                {{ pickLocaleText('删除', 'Delete') }}
              </button>
            </div>
          </div>

          <div class="entity-meta-grid">
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('设备位置', 'Location') }}</span>
              <strong>{{ workOrder.equipment?.location || translateStaticText('未配置') }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('故障代码', 'Fault code') }}</span>
              <strong>{{ workOrder.faultCode?.code || translateStaticText('无') }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('故障描述', 'Fault description') }}</span>
              <strong>{{ workOrder.faultCode?.description || translateStaticText('无') }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('优先级', 'Priority') }}</span>
              <strong>{{ translateStaticText(workOrder.priority) }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('创建时间', 'Created at') }}</span>
              <strong>{{ formatDateTimeDisplay(workOrder.createdAt) }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('创建人', 'Created by') }}</span>
              <strong>{{ workOrder.creator?.name || translateStaticText('未分配') }}</strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('工单状态', 'Status') }}</span>
              <strong class="task-status" :class="getWorkOrderStatusClass(workOrder.status)">
                <span class="task-status__dot"></span>
                {{ translateStaticText(workOrder.status) }}
              </strong>
            </div>
            <div class="entity-meta-block">
              <span class="entity-meta-label">{{ pickLocaleText('确认时间', 'Confirmed at') }}</span>
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
          <button class="button button-ghost button-icon" type="button" :aria-label="pickLocaleText('关闭弹出框', 'Close dialog')" @click="closeWorkOrderModal">
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
              <span>{{ pickLocaleText('设备', 'Equipment') }}</span>
              <select v-model="workOrderForm.equipmentId">
                <option value="">{{ pickLocaleText('请选择设备', 'Select equipment') }}</option>
                <option v-for="equipment in equipmentOptions" :key="equipment.id" :value="equipment.id">
                  {{ equipment.equipmentCode }} · {{ equipment.description }} · {{ equipment.location || pickLocaleText('未配置位置', 'Location not configured') }}
                </option>
              </select>
            </label>

            <label>
              <span>{{ pickLocaleText('故障代码', 'Fault code') }}</span>
              <select v-model="workOrderForm.faultCodeId">
                <option value="">{{ pickLocaleText('无', 'None') }}</option>
                <option v-for="faultCode in faultCodes" :key="faultCode.id" :value="faultCode.id">
                  {{ faultCode.code }} · {{ faultCode.description }}
                </option>
              </select>
            </label>

            <label>
              <span>{{ pickLocaleText('优先级', 'Priority') }}</span>
              <select v-model="workOrderForm.priority">
                <option v-for="priority in priorityOptions" :key="priority" :value="priority">{{ translateStaticText(priority) }}</option>
              </select>
            </label>

            <label>
              <span>{{ pickLocaleText('创建日期时间', 'Created at') }}</span>
              <input v-model="workOrderForm.createdAt" type="datetime-local" />
            </label>

            <label>
              <span>{{ pickLocaleText('创建人', 'Created by') }}</span>
              <select v-model="workOrderForm.createdByUserId">
                <option value="">{{ pickLocaleText('请选择创建人', 'Select a creator') }}</option>
                <option v-for="creator in creatorOptions" :key="creator.id" :value="creator.id">
                  {{ creator.name }} / {{ creator.accountName }}
                </option>
              </select>
            </label>

            <label>
              <span>{{ pickLocaleText('创建人联系方式', 'Creator contact') }}</span>
              <input :value="selectedCreator?.contactLabel || ''" type="text" readonly :placeholder="pickLocaleText('自动带出', 'Auto-filled')" />
            </label>

            <label v-if="sourceInspectionTask?.taskNumber">
              <span>{{ pickLocaleText('来源点检任务', 'Source inspection task') }}</span>
              <input :value="sourceInspectionTask.taskNumber" type="text" readonly disabled />
            </label>
          </div>

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeWorkOrderModal">{{ pickLocaleText('取消', 'Cancel') }}</button>
            <button class="button button-success" type="submit" :disabled="isSubmitting">
              {{ editingWorkOrderId ? pickLocaleText('保存维修工单', 'Save work order') : pickLocaleText('创建维修工单', 'Create work order') }}
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
            <h3 class="section-title">{{ pickLocaleText('确认维修工单', 'Confirm work order') }}</h3>
          </div>
          <button class="button button-ghost button-icon" type="button" :aria-label="pickLocaleText('关闭弹出框', 'Close dialog')" @click="closeConfirmModal">
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
            <span>{{ pickLocaleText('确认时间', 'Confirmed at') }}</span>
            <input v-model="confirmForm.confirmedAt" type="datetime-local" required />
          </label>

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeConfirmModal">{{ pickLocaleText('取消', 'Cancel') }}</button>
            <button class="button button-success" type="submit" :disabled="isConfirming">
              {{ isConfirming ? pickLocaleText('确认中...', 'Confirming...') : pickLocaleText('确认维修工单', 'Confirm work order') }}
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