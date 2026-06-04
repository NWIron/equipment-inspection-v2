<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useWorkOrderStore } from '../stores/workOrders'
import { useMessageToastStore } from '../stores/messageToast'
import { goBackOrHome } from '../utils/navigation'
import { compressUploadPhoto } from '../utils/photoCompression'
import {
  createDateTimeInputValue as createDefaultDateTime,
  formatDateTimeDisplay,
} from '../utils/datetime'

const route = useRoute()
const router = useRouter()
const workOrderStore = useWorkOrderStore()
const toastStore = useMessageToastStore()
const isTaskModalOpen = ref(false)
const isSubmittingTask = ref(false)
const isSparePartModalOpen = ref(false)
const isConfirmModalOpen = ref(false)
const isConfirming = ref(false)
const isSavingSpareParts = ref(false)
const isProcessingPhotos = ref(false)
const editingTaskId = ref('')
const sparePartsForm = ref([])
const workOrderPhotos = ref([])
const sparePartSearchKeyword = ref('')
const selectedSparePartIds = ref([])

const MAX_PHOTO_COUNT = 6

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
const sparePartOptions = computed(() => workOrderStore.sparePartOptions)
const taskStatusOptions = computed(() => workOrderStore.taskStatusOptions)
const taskModalTitle = computed(() => (editingTaskId.value ? '编辑维修任务' : '创建维修任务'))
const selectableSpareParts = computed(() => {
  const selectedIds = new Set(sparePartsForm.value.map((item) => item.sparePartId))
  return sparePartOptions.value.filter((item) => !selectedIds.has(item.id))
})
const filteredSelectableSpareParts = computed(() => {
  const keyword = sparePartSearchKeyword.value.trim().toLowerCase()

  if (!keyword) {
    return selectableSpareParts.value
  }

  return selectableSpareParts.value.filter((item) => {
    const searchTarget = `${item.partNumber} ${item.description} ${item.unit}`.toLowerCase()
    return searchTarget.includes(keyword)
  })
})

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

function goBack() {
  goBackOrHome(router)
}

function syncSparePartsForm() {
  sparePartsForm.value = (workOrder.value?.spareParts ?? []).map((item) => ({
    sparePartId: item.sparePartId ?? item.id,
    partNumber: item.partNumber,
    description: item.description,
    unit: item.unit,
    stockQuantity: Number(item.stockQuantity ?? 0),
    requiredQuantity: String(item.requiredQuantity ?? 0),
  }))
  selectedSparePartIds.value = []
  sparePartSearchKeyword.value = ''
}

function syncPhotoForm() {
  workOrderPhotos.value = (workOrder.value?.photos ?? []).map((item) => ({
    id: item.id,
    fileName: item.fileName,
    photoData: item.photoData,
  }))
}

function syncWorkOrderForms() {
  syncSparePartsForm()
  syncPhotoForm()
}

function buildSparePartPayload() {
  return sparePartsForm.value.map((item) => ({
    sparePartId: item.sparePartId,
    requiredQuantity: item.requiredQuantity,
  }))
}

function buildPhotoPayload() {
  return workOrderPhotos.value.map((item, index) => ({
    id: item.id,
    fileName: item.fileName,
    photoData: item.photoData,
    sortOrder: index + 1,
  }))
}

async function handlePhotoSelection(event) {
  const input = event.target
  const files = Array.from(input.files ?? [])
  input.value = ''

  if (!files.length) {
    return
  }

  const remainingCount = MAX_PHOTO_COUNT - workOrderPhotos.value.length

  if (remainingCount <= 0) {
    setFeedback(`维修现场照片最多上传 ${MAX_PHOTO_COUNT} 张。`, 'error')
    return
  }

  if (files.length > remainingCount) {
    setFeedback(`超出数量上限，仅会保留前 ${remainingCount} 张新照片。`, 'info')
  }

  isProcessingPhotos.value = true

  try {
    const newPhotos = []

    for (const file of files.slice(0, remainingCount)) {
      newPhotos.push(await compressUploadPhoto(file))
    }

    workOrderPhotos.value.push(...newPhotos)
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '处理照片失败，请重试。', 'error')
  } finally {
    isProcessingPhotos.value = false
  }
}

function removePhoto(index) {
  workOrderPhotos.value.splice(index, 1)
}

function openSparePartModal() {
  selectedSparePartIds.value = []
  sparePartSearchKeyword.value = ''
  isSparePartModalOpen.value = true
}

function closeSparePartModal() {
  isSparePartModalOpen.value = false
  selectedSparePartIds.value = []
  sparePartSearchKeyword.value = ''
}

function submitSparePartSelection() {
  if (!selectedSparePartIds.value.length) {
    closeSparePartModal()
    return
  }

  const selectedMap = new Set(selectedSparePartIds.value)
  const nextParts = selectableSpareParts.value
    .filter((item) => selectedMap.has(item.id))
    .map((item) => ({
      sparePartId: item.id,
      partNumber: item.partNumber,
      description: item.description,
      unit: item.unit,
      stockQuantity: Number(item.stockQuantity ?? 0),
      requiredQuantity: '0',
    }))

  sparePartsForm.value = [...sparePartsForm.value, ...nextParts]
  closeSparePartModal()
}

function removeSparePart(sparePartId) {
  sparePartsForm.value = sparePartsForm.value.filter((item) => item.sparePartId !== sparePartId)
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
    spareParts: buildSparePartPayload(),
    photos: buildPhotoPayload(),
  })
  isConfirming.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    syncWorkOrderForms()
    closeConfirmModal()
  }
}

async function saveWorkOrder() {
  isSavingSpareParts.value = true
  const result = await workOrderStore.saveSpareParts(String(route.params.workOrderId ?? ''), {
    spareParts: buildSparePartPayload(),
    photos: buildPhotoPayload(),
  })
  isSavingSpareParts.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    syncWorkOrderForms()
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

  syncWorkOrderForms()
}

onMounted(loadWorkOrder)
</script>

<template>
  <div class="page work-order-processing-page">
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
          <h2 class="page-title">维修工单处理</h2>
        </div>
      </div>
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
            <button class="button button-success" type="button" :disabled="isConfirmed || isSavingSpareParts" @click="saveWorkOrder">
              {{ isSavingSpareParts ? '保存中...' : '保存工单' }}
            </button>
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
                {{ workOrder.sourceInspectionTask.taskNumber || '无' }}
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
            <p class="kicker">Work Order Photos</p>
            <h3 class="section-title">维修现场照片</h3>
          </div>
          <label
            class="button button-ghost photo-upload-trigger"
            :class="{ 'is-disabled': isConfirmed || isProcessingPhotos || workOrderPhotos.length >= MAX_PHOTO_COUNT }"
          >
            <input
              class="photo-upload-input"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              :disabled="isConfirmed || isProcessingPhotos || workOrderPhotos.length >= MAX_PHOTO_COUNT"
              @change="handlePhotoSelection"
            />
            {{ isProcessingPhotos ? '处理中...' : '拍照上传照片' }}
          </label>
        </div>

        <p class="photo-field__hint">支持手机拍照上传，照片会在保存工单或确认工单时一并保存，最多 {{ MAX_PHOTO_COUNT }} 张。</p>

        <div v-if="!workOrderPhotos.length" class="photo-empty-state">当前还没有上传维修现场照片。</div>

        <div v-else class="photo-grid">
          <article v-for="(photo, index) in workOrderPhotos" :key="photo.id || `${photo.fileName}-${index}`" class="photo-card">
            <img class="photo-card__image" :src="photo.photoData" :alt="photo.fileName || `维修现场照片 ${index + 1}`" />
            <div class="photo-card__footer">
              <span class="photo-card__name">{{ photo.fileName || `维修现场照片 ${index + 1}` }}</span>
              <button class="button button-danger" type="button" :disabled="isConfirmed" @click="removePhoto(index)">
                删除
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Spare Parts</p>
            <h3 class="section-title">备件消耗清单</h3>
          </div>
          <button class="button button-ghost" type="button" :disabled="isConfirmed || !selectableSpareParts.length" @click="openSparePartModal">
            新增备件
          </button>
        </div>

        <div v-if="!sparePartsForm.length" class="empty-state">当前维修工单没有备件，请从上方下拉框新增。</div>

        <div v-else class="spare-part-table-wrap">
          <table class="spare-part-table">
            <thead>
              <tr>
                <th>备件编号</th>
                <th>备件描述</th>
                <th>单位</th>
                <th>当前库存</th>
                <th>消耗数量</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sparePart in sparePartsForm" :key="sparePart.sparePartId">
                <td>{{ sparePart.partNumber }}</td>
                <td>{{ sparePart.description }}</td>
                <td>{{ sparePart.unit }}</td>
                <td>{{ sparePart.stockQuantity }}</td>
                <td>
                  <input v-model="sparePart.requiredQuantity" type="number" min="0" step="1" :disabled="isConfirmed" />
                </td>
                <td>
                  <button class="button button-danger" type="button" :disabled="isConfirmed" @click="removeSparePart(sparePart.sparePartId)">
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
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
                <strong>{{ formatDateTimeDisplay(task.createdAt) }}</strong>
              </div>
              <div class="entity-meta-block">
                <span class="entity-meta-label">最后更新</span>
                <strong>{{ formatDateTimeDisplay(task.updatedAt) }}</strong>
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

      <div v-if="isSparePartModalOpen" class="modal-overlay" @click.self="closeSparePartModal">
        <section class="surface-card modal-card spare-part-modal-card">
          <div class="section-headline modal-headline">
            <div>
              <p class="kicker">Spare Parts</p>
              <h3 class="section-title">新增备件</h3>
            </div>
            <button class="button button-ghost button-icon" type="button" aria-label="关闭弹出框" @click="closeSparePartModal">
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

          <div class="form-grid">
            <label>
              <span>模糊查询</span>
              <input v-model="sparePartSearchKeyword" type="text" placeholder="输入备件编号、描述或单位" />
            </label>

            <div v-if="!filteredSelectableSpareParts.length" class="empty-state spare-part-modal-empty">
              {{ selectableSpareParts.length ? '没有匹配的备件。' : '没有可新增的备件。' }}
            </div>

            <div v-else class="spare-part-picker-list">
              <label v-for="sparePart in filteredSelectableSpareParts" :key="sparePart.id" class="spare-part-picker-item">
                <input v-model="selectedSparePartIds" type="checkbox" :value="sparePart.id" />
                <div>
                  <strong>{{ sparePart.partNumber }}</strong>
                  <p>{{ sparePart.description }}</p>
                  <span>库存 {{ sparePart.stockQuantity }} {{ sparePart.unit }}</span>
                </div>
              </label>
            </div>

            <div class="modal-actions">
              <button class="button button-ghost" type="button" @click="closeSparePartModal">取消</button>
              <button class="button button-success" type="button" :disabled="!selectedSparePartIds.length" @click="submitSparePartSelection">
                添加已选备件
              </button>
            </div>
          </div>
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

.spare-part-table-wrap {
  overflow-x: auto;
}

.spare-part-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}

.spare-part-table th,
.spare-part-table td {
  padding: 12px 10px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  vertical-align: middle;
}

.spare-part-table th {
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-soft);
  background: rgba(246, 248, 250, 0.92);
}

.spare-part-table td input {
  min-width: 112px;
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

.spare-part-modal-card {
  width: min(720px, 100%);
}

.modal-headline {
  padding-bottom: 0;
}

.spare-part-picker-list {
  display: grid;
  gap: 10px;
  max-height: min(48vh, 420px);
  overflow-y: auto;
  padding-right: 4px;
}

.spare-part-picker-item {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 12px;
  align-items: start;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #ffffff;
}

.spare-part-picker-item input[type='checkbox'] {
  margin-top: 2px;
  min-height: auto;
}

.spare-part-picker-item p,
.spare-part-picker-item span {
  margin: 4px 0 0;
  color: var(--color-text-soft);
  font-size: 0.82rem;
}

.spare-part-modal-empty {
  min-height: 120px;
  display: grid;
  place-items: center;
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

.photo-field__hint {
  margin: 0;
  color: var(--color-text-soft);
  font-size: 0.82rem;
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
  .modal-actions,
  .photo-card__footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>