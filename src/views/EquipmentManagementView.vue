<script setup>
import QRCode from 'qrcode'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { pickLocaleText, translateStaticText } from '../i18n'
import { useEquipmentStore } from '../stores/equipment'
import { useMessageToastStore } from '../stores/messageToast'
import { goBackOrHome } from '../utils/navigation'

const STATUS_OPTIONS = ['在用', '停用', '检修中', '待报废']

const router = useRouter()
const equipmentStore = useEquipmentStore()
const toastStore = useMessageToastStore()
const activeTab = ref('equipment')
const isEquipmentModalOpen = ref(false)
const isTaskListModalOpen = ref(false)
const isInspectionItemModalOpen = ref(false)
const isFaultCodeModalOpen = ref(false)
const isSparePartModalOpen = ref(false)
const isEquipmentQrModalOpen = ref(false)
const editingEquipmentId = ref('')
const editingTaskListId = ref('')
const editingInspectionItemId = ref('')
const editingFaultCodeId = ref('')
const editingSparePartId = ref('')
const isSubmitting = ref(false)
const isGeneratingEquipmentQr = ref(false)
const equipmentQrCodeDataUrl = ref('')
const activeEquipmentQr = ref(null)

const equipmentForm = reactive({
  equipmentCode: '',
  description: '',
  status: STATUS_OPTIONS[0],
  validUntil: '',
  type: '',
  model: '',
  location: '',
  ownerUserId: '',
  contactInfo: '',
  purchaseDate: '',
  commissioningDate: '',
  serviceLife: '',
  inspectionFrequencyDays: '7',
  taskListIds: [],
  sparePartIds: [],
})

const taskListForm = reactive({
  code: '',
  description: '',
  inspectionItemIds: [],
})

const inspectionItemForm = reactive({
  code: '',
  description: '',
})

const faultCodeForm = reactive({
  code: '',
  description: '',
})

const sparePartForm = reactive({
  partNumber: '',
  description: '',
  unit: '件',
  stockQuantity: '0',
  safetyStock: '0',
  equipmentIds: [],
})

const equipmentList = computed(() => equipmentStore.equipmentDirectory)
const taskListDirectory = computed(() => equipmentStore.taskListDirectory)
const inspectionItemDirectory = computed(() => equipmentStore.inspectionItemDirectory)
const faultCodeDirectory = computed(() => equipmentStore.faultCodeDirectory)
const sparePartDirectory = computed(() => equipmentStore.sparePartDirectory)
const ownerOptions = computed(() => equipmentStore.ownerOptions)
const filters = reactive({
  equipmentKeyword: '',
  equipmentStatus: '',
  equipmentOwnerUserId: '',
  taskListKeyword: '',
  taskListAssignment: 'all',
  inspectionItemKeyword: '',
  inspectionItemAssignment: 'all',
  faultCodeKeyword: '',
  sparePartKeyword: '',
  sparePartStock: 'all',
  sparePartLink: 'all',
})
const filterPanelCollapsed = reactive({
  equipment: true,
  taskLists: true,
  inspectionItems: true,
  faultCodes: true,
  spareParts: true,
})
const equipmentEditorTitle = computed(() =>
  editingEquipmentId.value ? pickLocaleText('编辑设备主数据', 'Edit equipment master data') : pickLocaleText('创建设备主数据', 'Create equipment master data'),
)
const taskListEditorTitle = computed(() =>
  editingTaskListId.value ? pickLocaleText('编辑任务清单', 'Edit task list') : pickLocaleText('创建任务清单', 'Create task list'),
)
const inspectionItemEditorTitle = computed(() =>
  editingInspectionItemId.value ? pickLocaleText('编辑点检项', 'Edit inspection item') : pickLocaleText('创建点检项', 'Create inspection item'),
)
const faultCodeEditorTitle = computed(() =>
  editingFaultCodeId.value ? pickLocaleText('编辑故障代码', 'Edit fault code') : pickLocaleText('创建故障代码', 'Create fault code'),
)
const sparePartEditorTitle = computed(() =>
  editingSparePartId.value ? pickLocaleText('编辑备件', 'Edit spare part') : pickLocaleText('创建备件', 'Create spare part'),
)

function normalizeKeyword(value) {
  return String(value ?? '').trim().toLowerCase()
}

function matchesKeyword(values, keyword) {
  const normalizedKeyword = normalizeKeyword(keyword)

  if (!normalizedKeyword) {
    return true
  }

  return values.some((value) => normalizeKeyword(value).includes(normalizedKeyword))
}

function resetTabFilters(tab) {
  if (tab === 'equipment') {
    filters.equipmentKeyword = ''
    filters.equipmentStatus = ''
    filters.equipmentOwnerUserId = ''
    return
  }

  if (tab === 'taskLists') {
    filters.taskListKeyword = ''
    filters.taskListAssignment = 'all'
    return
  }

  if (tab === 'inspectionItems') {
    filters.inspectionItemKeyword = ''
    filters.inspectionItemAssignment = 'all'
    return
  }

  if (tab === 'faultCodes') {
    filters.faultCodeKeyword = ''
    return
  }

  filters.sparePartKeyword = ''
  filters.sparePartStock = 'all'
  filters.sparePartLink = 'all'
}

function toggleFilterPanel(tab) {
  filterPanelCollapsed[tab] = !filterPanelCollapsed[tab]
}

function getFilterToggleLabel(tab) {
  return filterPanelCollapsed[tab] ? pickLocaleText('展开筛选', 'Show filters') : pickLocaleText('收起筛选', 'Hide filters')
}

const filteredEquipmentList = computed(() =>
  equipmentList.value.filter((equipment) => {
    const matchesStatus = !filters.equipmentStatus || equipment.status === filters.equipmentStatus
    const matchesOwner = !filters.equipmentOwnerUserId || equipment.ownerUserId === filters.equipmentOwnerUserId
    const matchesSearch = matchesKeyword(
      [
        equipment.equipmentCode,
        equipment.description,
        equipment.type,
        equipment.model,
        equipment.location,
        equipment.owner?.name,
        equipment.owner?.accountName,
        ...equipment.taskLists.map((taskList) => taskList.code),
        ...equipment.spareParts.map((sparePart) => sparePart.partNumber),
      ],
      filters.equipmentKeyword,
    )

    return matchesStatus && matchesOwner && matchesSearch
  }),
)

const filteredTaskListDirectory = computed(() =>
  taskListDirectory.value.filter((taskList) => {
    const matchesSearch = matchesKeyword(
      [taskList.code, taskList.description, ...taskList.inspectionItems.map((inspectionItem) => inspectionItem.code)],
      filters.taskListKeyword,
    )
    const matchesAssignment =
      filters.taskListAssignment === 'all' ||
      (filters.taskListAssignment === 'assigned' && taskList.assignedEquipmentCount > 0) ||
      (filters.taskListAssignment === 'unassigned' && taskList.assignedEquipmentCount === 0)

    return matchesSearch && matchesAssignment
  }),
)

const filteredInspectionItemDirectory = computed(() =>
  inspectionItemDirectory.value.filter((inspectionItem) => {
    const matchesSearch = matchesKeyword(
      [inspectionItem.code, inspectionItem.description],
      filters.inspectionItemKeyword,
    )
    const matchesAssignment =
      filters.inspectionItemAssignment === 'all' ||
      (filters.inspectionItemAssignment === 'linked' && inspectionItem.taskListCount > 0) ||
      (filters.inspectionItemAssignment === 'unlinked' && inspectionItem.taskListCount === 0)

    return matchesSearch && matchesAssignment
  }),
)

const filteredFaultCodeDirectory = computed(() =>
  faultCodeDirectory.value.filter((faultCode) =>
    matchesKeyword([faultCode.code, faultCode.description], filters.faultCodeKeyword),
  ),
)

const filteredSparePartDirectory = computed(() =>
  sparePartDirectory.value.filter((sparePart) => {
    const isLowStock = Number(sparePart.stockQuantity ?? 0) <= Number(sparePart.safetyStock ?? 0)
    const matchesSearch = matchesKeyword(
      [
        sparePart.partNumber,
        sparePart.description,
        sparePart.unit,
        ...sparePart.equipments.map((equipment) => equipment.equipmentCode),
      ],
      filters.sparePartKeyword,
    )
    const matchesStock =
      filters.sparePartStock === 'all' ||
      (filters.sparePartStock === 'low' && isLowStock) ||
      (filters.sparePartStock === 'normal' && !isLowStock)
    const matchesLink =
      filters.sparePartLink === 'all' ||
      (filters.sparePartLink === 'linked' && sparePart.equipments.length > 0) ||
      (filters.sparePartLink === 'unlinked' && sparePart.equipments.length === 0)

    return matchesSearch && matchesStock && matchesLink
  }),
)

function setFeedback(message, type = 'success') {
  toastStore.show(message, type)
}

function clearFeedback() {
}

function openEquipmentModal() {
  clearFeedback()
  resetEquipmentForm()
  isEquipmentModalOpen.value = true
}

function closeEquipmentModal() {
  isEquipmentModalOpen.value = false
  resetEquipmentForm()
}

function openTaskListModal() {
  clearFeedback()
  resetTaskListForm()
  isTaskListModalOpen.value = true
}

function closeTaskListModal() {
  isTaskListModalOpen.value = false
  resetTaskListForm()
}

function openInspectionItemModal() {
  clearFeedback()
  resetInspectionItemForm()
  isInspectionItemModalOpen.value = true
}

function closeInspectionItemModal() {
  isInspectionItemModalOpen.value = false
  resetInspectionItemForm()
}

function openFaultCodeModal() {
  clearFeedback()
  resetFaultCodeForm()
  isFaultCodeModalOpen.value = true
}

function closeFaultCodeModal() {
  isFaultCodeModalOpen.value = false
  resetFaultCodeForm()
}

function openSparePartModal() {
  clearFeedback()
  resetSparePartForm()
  isSparePartModalOpen.value = true
}

function closeSparePartModal() {
  isSparePartModalOpen.value = false
  resetSparePartForm()
}

function resetEquipmentForm() {
  editingEquipmentId.value = ''
  equipmentForm.equipmentCode = ''
  equipmentForm.description = ''
  equipmentForm.status = STATUS_OPTIONS[0]
  equipmentForm.validUntil = ''
  equipmentForm.type = ''
  equipmentForm.model = ''
  equipmentForm.location = ''
  equipmentForm.ownerUserId = ownerOptions.value[0]?.id ?? ''
  equipmentForm.contactInfo = ''
  equipmentForm.purchaseDate = ''
  equipmentForm.commissioningDate = ''
  equipmentForm.serviceLife = ''
  equipmentForm.inspectionFrequencyDays = '7'
  equipmentForm.taskListIds = []
  equipmentForm.sparePartIds = []
}

function resetTaskListForm() {
  editingTaskListId.value = ''
  taskListForm.code = ''
  taskListForm.description = ''
  taskListForm.inspectionItemIds = []
}

function resetInspectionItemForm() {
  editingInspectionItemId.value = ''
  inspectionItemForm.code = ''
  inspectionItemForm.description = ''
}

function resetFaultCodeForm() {
  editingFaultCodeId.value = ''
  faultCodeForm.code = ''
  faultCodeForm.description = ''
}

function resetSparePartForm() {
  editingSparePartId.value = ''
  sparePartForm.partNumber = ''
  sparePartForm.description = ''
  sparePartForm.unit = '件'
  sparePartForm.stockQuantity = '0'
  sparePartForm.safetyStock = '0'
  sparePartForm.equipmentIds = []
}

function editEquipment(equipment) {
  editingEquipmentId.value = equipment.id
  equipmentForm.equipmentCode = equipment.equipmentCode
  equipmentForm.description = equipment.description
  equipmentForm.status = equipment.status
  equipmentForm.validUntil = equipment.validUntil || ''
  equipmentForm.type = equipment.type || ''
  equipmentForm.model = equipment.model || ''
  equipmentForm.location = equipment.location || ''
  equipmentForm.ownerUserId = equipment.ownerUserId || ''
  equipmentForm.contactInfo = equipment.contactInfo || ''
  equipmentForm.purchaseDate = equipment.purchaseDate || ''
  equipmentForm.commissioningDate = equipment.commissioningDate || ''
  equipmentForm.serviceLife = equipment.serviceLife || ''
  equipmentForm.inspectionFrequencyDays = String(equipment.inspectionFrequencyDays || '')
  equipmentForm.taskListIds = [...equipment.taskListIds]
  equipmentForm.sparePartIds = [...equipment.sparePartIds]
  clearFeedback()
  isEquipmentModalOpen.value = true
}

function editTaskList(taskList) {
  editingTaskListId.value = taskList.id
  taskListForm.code = taskList.code
  taskListForm.description = taskList.description
  taskListForm.inspectionItemIds = [...taskList.inspectionItemIds]
  clearFeedback()
  isTaskListModalOpen.value = true
}

function editInspectionItem(inspectionItem) {
  editingInspectionItemId.value = inspectionItem.id
  inspectionItemForm.code = inspectionItem.code
  inspectionItemForm.description = inspectionItem.description
  clearFeedback()
  isInspectionItemModalOpen.value = true
}

function editFaultCode(faultCode) {
  editingFaultCodeId.value = faultCode.id
  faultCodeForm.code = faultCode.code
  faultCodeForm.description = faultCode.description
  clearFeedback()
  isFaultCodeModalOpen.value = true
}

function editSparePart(sparePart) {
  editingSparePartId.value = sparePart.id
  sparePartForm.partNumber = sparePart.partNumber
  sparePartForm.description = sparePart.description
  sparePartForm.unit = sparePart.unit
  sparePartForm.stockQuantity = String(sparePart.stockQuantity)
  sparePartForm.safetyStock = String(sparePart.safetyStock ?? 0)
  sparePartForm.equipmentIds = [...sparePart.equipmentIds]
  clearFeedback()
  isSparePartModalOpen.value = true
}

function openAutoPurchasePlaceholder() {
  setFeedback(pickLocaleText('自动采购备件功能待开发。', 'Automatic spare-part purchasing is planned for a future phase.'), 'info')
}

async function openEquipmentQrModal(equipment) {
  isGeneratingEquipmentQr.value = true
  activeEquipmentQr.value = equipment
  equipmentQrCodeDataUrl.value = ''
  isEquipmentQrModalOpen.value = true

  try {
    equipmentQrCodeDataUrl.value = await QRCode.toDataURL(equipment.equipmentCode, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
  } catch {
    setFeedback(pickLocaleText('生成设备二维码失败，请重试。', 'Failed to generate the equipment QR code. Please try again.'), 'error')
    closeEquipmentQrModal()
  } finally {
    isGeneratingEquipmentQr.value = false
  }
}

function closeEquipmentQrModal() {
  isEquipmentQrModalOpen.value = false
  isGeneratingEquipmentQr.value = false
  equipmentQrCodeDataUrl.value = ''
  activeEquipmentQr.value = null
}

function goBack() {
  goBackOrHome(router)
}

async function submitEquipment() {
  isSubmitting.value = true
  const payload = {
    ...equipmentForm,
    inspectionFrequencyDays: equipmentForm.inspectionFrequencyDays,
  }
  const result = editingEquipmentId.value
    ? await equipmentStore.updateEquipment(editingEquipmentId.value, payload)
    : await equipmentStore.createEquipment(payload)
  isSubmitting.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    closeEquipmentModal()
  }
}

async function removeEquipment(equipmentId) {
  const result = await equipmentStore.deleteEquipment(equipmentId)
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok && editingEquipmentId.value === equipmentId) {
    resetEquipmentForm()
  }
}

async function submitTaskList() {
  isSubmitting.value = true
  const result = editingTaskListId.value
    ? await equipmentStore.updateTaskList(editingTaskListId.value, taskListForm)
    : await equipmentStore.createTaskList(taskListForm)
  isSubmitting.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    closeTaskListModal()
  }
}

async function removeTaskList(taskListId) {
  const result = await equipmentStore.deleteTaskList(taskListId)
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok && editingTaskListId.value === taskListId) {
    resetTaskListForm()
  }
}

async function submitInspectionItem() {
  isSubmitting.value = true
  const result = editingInspectionItemId.value
    ? await equipmentStore.updateInspectionItem(editingInspectionItemId.value, inspectionItemForm)
    : await equipmentStore.createInspectionItem(inspectionItemForm)
  isSubmitting.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    closeInspectionItemModal()
  }
}

async function removeInspectionItem(itemId) {
  const result = await equipmentStore.deleteInspectionItem(itemId)
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok && editingInspectionItemId.value === itemId) {
    resetInspectionItemForm()
  }
}

async function submitFaultCode() {
  isSubmitting.value = true
  const result = editingFaultCodeId.value
    ? await equipmentStore.updateFaultCode(editingFaultCodeId.value, faultCodeForm)
    : await equipmentStore.createFaultCode(faultCodeForm)
  isSubmitting.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    closeFaultCodeModal()
  }
}

async function removeFaultCode(faultCodeId) {
  const result = await equipmentStore.deleteFaultCode(faultCodeId)
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok && editingFaultCodeId.value === faultCodeId) {
    resetFaultCodeForm()
  }
}

async function submitSparePart() {
  isSubmitting.value = true
  const result = editingSparePartId.value
    ? await equipmentStore.updateSparePart(editingSparePartId.value, sparePartForm)
    : await equipmentStore.createSparePart(sparePartForm)
  isSubmitting.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok) {
    closeSparePartModal()
  }
}

async function removeSparePart(sparePartId) {
  const result = await equipmentStore.deleteSparePart(sparePartId)
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok && editingSparePartId.value === sparePartId) {
    resetSparePartForm()
  }
}

onMounted(async () => {
  const result = await equipmentStore.initialize()

  if (!result.ok) {
    setFeedback(result.message, 'error')
    return
  }

  resetEquipmentForm()
})
</script>

<template>
  <div class="page management-page">
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
          <h2 class="page-title">{{ pickLocaleText('设备管理', 'Equipment Management') }}</h2>
        </div>
      </div>
    </div>

    <section class="surface-card section-card tab-card">
      <div class="tab-bar" role="tablist" :aria-label="pickLocaleText('设备管理分页', 'Equipment management tabs')">
        <button
          class="tab-button"
          :class="{ 'is-active': activeTab === 'equipment' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'equipment'"
          @click="activeTab = 'equipment'"
        >
          {{ pickLocaleText('设备主数据', 'Equipment master data') }}
        </button>
        <button
          class="tab-button"
          :class="{ 'is-active': activeTab === 'taskLists' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'taskLists'"
          @click="activeTab = 'taskLists'"
        >
          {{ pickLocaleText('点检任务清单', 'Inspection task lists') }}
        </button>
        <button
          class="tab-button"
          :class="{ 'is-active': activeTab === 'inspectionItems' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'inspectionItems'"
          @click="activeTab = 'inspectionItems'"
        >
          {{ pickLocaleText('点检项', 'Inspection items') }}
        </button>
        <button
          class="tab-button"
          :class="{ 'is-active': activeTab === 'faultCodes' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'faultCodes'"
          @click="activeTab = 'faultCodes'"
        >
          {{ pickLocaleText('故障代码', 'Fault codes') }}
        </button>
        <button
          class="tab-button"
          :class="{ 'is-active': activeTab === 'spareParts' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'spareParts'"
          @click="activeTab = 'spareParts'"
        >
          {{ pickLocaleText('设备备件', 'Spare parts') }}
        </button>
      </div>

      <div v-if="equipmentStore.isInitializing" class="notice">{{ pickLocaleText('正在加载设备管理主数据...', 'Loading equipment management master data...') }}</div>

      <div v-if="activeTab === 'equipment'" class="tab-panel">
        <div class="list-panel">
          <div class="section-headline">
            <div>
              <p class="kicker">Equipment Assets</p>
              <h3 class="section-title">{{ pickLocaleText('设备台账', 'Equipment register') }}</h3>
            </div>
            <div class="action-row">
              <button
                class="button button-ghost button-icon filter-toggle"
                :class="{ 'is-active': !filterPanelCollapsed.equipment }"
                type="button"
                :aria-label="getFilterToggleLabel('equipment')"
                :aria-pressed="!filterPanelCollapsed.equipment"
                :title="getFilterToggleLabel('equipment')"
                @click="toggleFilterPanel('equipment')"
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
              <button class="button button-success" type="button" @click="openEquipmentModal">{{ pickLocaleText('新建设备', 'Create equipment') }}</button>
            </div>
          </div>

          <div v-if="equipmentList.length && !filterPanelCollapsed.equipment" class="filter-toolbar surface-muted">
            <label class="filter-field filter-field-search">
              <span>{{ pickLocaleText('关键字', 'Keyword') }}</span>
              <input
                v-model="filters.equipmentKeyword"
                type="search"
                :placeholder="pickLocaleText('设备编号、描述、型号、位置', 'Equipment code, description, model, location')"
              />
            </label>
            <label class="filter-field">
              <span>{{ pickLocaleText('状态', 'Status') }}</span>
              <select v-model="filters.equipmentStatus">
                <option value="">{{ pickLocaleText('全部状态', 'All statuses') }}</option>
                <option v-for="status in STATUS_OPTIONS" :key="status" :value="status">{{ translateStaticText(status) }}</option>
              </select>
            </label>
            <label class="filter-field">
              <span>{{ pickLocaleText('责任人', 'Owner') }}</span>
              <select v-model="filters.equipmentOwnerUserId">
                <option value="">{{ pickLocaleText('全部责任人', 'All owners') }}</option>
                <option v-for="owner in ownerOptions" :key="owner.id" :value="owner.id">{{ owner.name }}</option>
              </select>
            </label>
            <button class="button button-ghost filter-reset" type="button" @click="resetTabFilters('equipment')">{{ pickLocaleText('重置筛选', 'Reset filters') }}</button>
          </div>

          <div v-if="!equipmentList.length" class="empty-state">{{ pickLocaleText('当前还没有设备主数据。', 'There is no equipment master data yet.') }}</div>

          <div v-else-if="!filteredEquipmentList.length" class="empty-state">{{ pickLocaleText('没有符合筛选条件的设备。', 'No equipment matches the current filters.') }}</div>

          <div v-else class="entity-list">
            <article v-for="equipment in filteredEquipmentList" :key="equipment.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <h4>{{ equipment.equipmentCode }}</h4>
                  <p>{{ equipment.description }}</p>
                </div>
                <div class="action-row">
                  <span class="status-pill">{{ translateStaticText(equipment.status) }}</span>
                  <button
                    class="button button-ghost button-icon"
                    type="button"
                    :aria-label="pickLocaleText(`查看 ${equipment.equipmentCode} 二维码`, `View QR code for ${equipment.equipmentCode}`)"
                    @click="openEquipmentQrModal(equipment)"
                  >
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M3 6V4.75C3 3.78 3.78 3 4.75 3H6"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.4"
                      />
                      <path
                        d="M10 3h1.25C12.22 3 13 3.78 13 4.75V6"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.4"
                      />
                      <path
                        d="M13 10v1.25c0 .97-.78 1.75-1.75 1.75H10"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.4"
                      />
                      <path
                        d="M6 13H4.75C3.78 13 3 12.22 3 11.25V10"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.4"
                      />
                      <path
                        d="M6 6h1.5v1.5H6zM8.5 8.5H10v1.5H8.5zM6 10h1.5v1.5H6zM8.5 6H10v1.5H8.5z"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.1"
                      />
                    </svg>
                  </button>
                  <button class="button button-ghost" type="button" @click="editEquipment(equipment)">{{ pickLocaleText('编辑', 'Edit') }}</button>
                  <button class="button button-danger" type="button" @click="removeEquipment(equipment.id)">
                    {{ pickLocaleText('删除', 'Delete') }}
                  </button>
                </div>
              </div>

              <div class="entity-meta-grid">
                <div class="entity-meta-block">
                  <span class="entity-meta-label">{{ pickLocaleText('类型 / 型号', 'Type / Model') }}</span>
                  <strong>{{ equipment.type || translateStaticText('未填写') }} / {{ equipment.model || translateStaticText('未填写') }}</strong>
                </div>
                <div class="entity-meta-block">
                  <span class="entity-meta-label">{{ pickLocaleText('位置', 'Location') }}</span>
                  <strong>{{ equipment.location || translateStaticText('未填写') }}</strong>
                </div>
                <div class="entity-meta-block">
                  <span class="entity-meta-label">{{ pickLocaleText('责任人', 'Owner') }}</span>
                  <strong>{{ equipment.owner?.name || translateStaticText('未分配') }}</strong>
                </div>
                <div class="entity-meta-block">
                  <span class="entity-meta-label">{{ pickLocaleText('点检频率', 'Inspection frequency') }}</span>
                  <strong>{{ pickLocaleText(`${equipment.inspectionFrequencyDays} 天`, `${equipment.inspectionFrequencyDays} days`) }}</strong>
                </div>
              </div>

              <div class="entity-group">
                <span class="entity-meta-label">{{ pickLocaleText('任务清单', 'Task lists') }}</span>
                <div class="tag-row">
                  <span v-for="taskList in equipment.taskLists" :key="taskList.id" class="tag">
                    {{ taskList.code }}
                  </span>
                  <span v-if="!equipment.taskLists.length" class="tag tag-muted">{{ pickLocaleText('未分配', 'Unassigned') }}</span>
                </div>
              </div>

              <div class="entity-group">
                <span class="entity-meta-label">{{ pickLocaleText('关联备件', 'Linked spare parts') }}</span>
                <div class="tag-row">
                  <span v-for="sparePart in equipment.spareParts" :key="sparePart.id" class="tag">
                    {{ sparePart.partNumber }}
                  </span>
                  <span v-if="!equipment.spareParts.length" class="tag tag-muted">{{ pickLocaleText('未关联', 'Not linked') }}</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'taskLists'" class="tab-panel">
        <div class="list-panel">
          <div class="section-headline">
            <div>
              <p class="kicker">Task Lists</p>
              <h3 class="section-title">{{ pickLocaleText('点检任务清单', 'Inspection task lists') }}</h3>
            </div>
            <div class="action-row">
              <button
                class="button button-ghost button-icon filter-toggle"
                :class="{ 'is-active': !filterPanelCollapsed.taskLists }"
                type="button"
                :aria-label="getFilterToggleLabel('taskLists')"
                :aria-pressed="!filterPanelCollapsed.taskLists"
                :title="getFilterToggleLabel('taskLists')"
                @click="toggleFilterPanel('taskLists')"
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
              <button class="button button-success" type="button" @click="openTaskListModal">{{ pickLocaleText('新建清单', 'Create list') }}</button>
            </div>
          </div>

          <div v-if="taskListDirectory.length && !filterPanelCollapsed.taskLists" class="filter-toolbar surface-muted">
            <label class="filter-field filter-field-search">
              <span>{{ pickLocaleText('关键字', 'Keyword') }}</span>
              <input v-model="filters.taskListKeyword" type="search" :placeholder="pickLocaleText('清单编号、描述、点检项', 'List code, description, inspection item')" />
            </label>
            <label class="filter-field">
              <span>{{ pickLocaleText('分配状态', 'Assignment') }}</span>
              <select v-model="filters.taskListAssignment">
                <option value="all">{{ pickLocaleText('全部', 'All') }}</option>
                <option value="assigned">{{ pickLocaleText('已分配设备', 'Assigned to equipment') }}</option>
                <option value="unassigned">{{ pickLocaleText('未分配设备', 'Unassigned') }}</option>
              </select>
            </label>
            <button class="button button-ghost filter-reset" type="button" @click="resetTabFilters('taskLists')">{{ pickLocaleText('重置筛选', 'Reset filters') }}</button>
          </div>

          <div v-if="!taskListDirectory.length" class="empty-state">{{ pickLocaleText('当前还没有任务清单。', 'There are no task lists yet.') }}</div>

          <div v-else-if="!filteredTaskListDirectory.length" class="empty-state">{{ pickLocaleText('没有符合筛选条件的任务清单。', 'No task lists match the current filters.') }}</div>

          <div v-else class="entity-list">
            <article v-for="taskList in filteredTaskListDirectory" :key="taskList.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <h4>{{ taskList.code }}</h4>
                  <p>{{ taskList.description }}</p>
                </div>
                <div class="action-row">
                  <span class="status-pill">{{ pickLocaleText(`${taskList.assignedEquipmentCount} 台设备`, `${taskList.assignedEquipmentCount} equipment`) }}</span>
                  <button class="button button-ghost" type="button" @click="editTaskList(taskList)">{{ pickLocaleText('编辑', 'Edit') }}</button>
                  <button class="button button-danger" type="button" @click="removeTaskList(taskList.id)">
                    {{ pickLocaleText('删除', 'Delete') }}
                  </button>
                </div>
              </div>

              <div class="tag-row">
                <span v-for="inspectionItem in taskList.inspectionItems" :key="inspectionItem.id" class="tag">
                  {{ inspectionItem.code }}
                </span>
                <span v-if="!taskList.inspectionItems.length" class="tag tag-muted">{{ pickLocaleText('未关联点检项', 'No linked inspection items') }}</span>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'inspectionItems'" class="tab-panel">
        <div class="list-panel">
          <div class="section-headline">
            <div>
              <p class="kicker">Inspection Items</p>
              <h3 class="section-title">{{ pickLocaleText('点检项', 'Inspection items') }}</h3>
            </div>
            <div class="action-row">
              <button
                class="button button-ghost button-icon filter-toggle"
                :class="{ 'is-active': !filterPanelCollapsed.inspectionItems }"
                type="button"
                :aria-label="getFilterToggleLabel('inspectionItems')"
                :aria-pressed="!filterPanelCollapsed.inspectionItems"
                :title="getFilterToggleLabel('inspectionItems')"
                @click="toggleFilterPanel('inspectionItems')"
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
              <button class="button button-success" type="button" @click="openInspectionItemModal">{{ pickLocaleText('新建点检项', 'Create inspection item') }}</button>
            </div>
          </div>

          <div v-if="inspectionItemDirectory.length && !filterPanelCollapsed.inspectionItems" class="filter-toolbar surface-muted">
            <label class="filter-field filter-field-search">
              <span>{{ pickLocaleText('关键字', 'Keyword') }}</span>
              <input v-model="filters.inspectionItemKeyword" type="search" :placeholder="pickLocaleText('点检项编号或描述', 'Inspection item code or description')" />
            </label>
            <label class="filter-field">
              <span>{{ pickLocaleText('关联状态', 'Link status') }}</span>
              <select v-model="filters.inspectionItemAssignment">
                <option value="all">{{ pickLocaleText('全部', 'All') }}</option>
                <option value="linked">{{ pickLocaleText('已关联清单', 'Linked to a list') }}</option>
                <option value="unlinked">{{ pickLocaleText('未关联清单', 'Not linked') }}</option>
              </select>
            </label>
            <button class="button button-ghost filter-reset" type="button" @click="resetTabFilters('inspectionItems')">{{ pickLocaleText('重置筛选', 'Reset filters') }}</button>
          </div>

          <div v-if="!inspectionItemDirectory.length" class="empty-state">{{ pickLocaleText('当前还没有点检项。', 'There are no inspection items yet.') }}</div>

          <div v-else-if="!filteredInspectionItemDirectory.length" class="empty-state">{{ pickLocaleText('没有符合筛选条件的点检项。', 'No inspection items match the current filters.') }}</div>

          <div v-else class="entity-list">
            <article v-for="inspectionItem in filteredInspectionItemDirectory" :key="inspectionItem.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <h4>{{ inspectionItem.code }}</h4>
                  <p>{{ inspectionItem.description }}</p>
                </div>
                <div class="action-row">
                  <span class="status-pill">{{ pickLocaleText(`${inspectionItem.taskListCount} 个清单`, `${inspectionItem.taskListCount} lists`) }}</span>
                  <button class="button button-ghost" type="button" @click="editInspectionItem(inspectionItem)">
                    {{ pickLocaleText('编辑', 'Edit') }}
                  </button>
                  <button class="button button-danger" type="button" @click="removeInspectionItem(inspectionItem.id)">
                    {{ pickLocaleText('删除', 'Delete') }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'faultCodes'" class="tab-panel">
        <div class="list-panel">
          <div class="section-headline">
            <div>
              <p class="kicker">Fault Codes</p>
              <h3 class="section-title">{{ pickLocaleText('故障代码', 'Fault codes') }}</h3>
            </div>
            <div class="action-row">
              <button
                class="button button-ghost button-icon filter-toggle"
                :class="{ 'is-active': !filterPanelCollapsed.faultCodes }"
                type="button"
                :aria-label="getFilterToggleLabel('faultCodes')"
                :aria-pressed="!filterPanelCollapsed.faultCodes"
                :title="getFilterToggleLabel('faultCodes')"
                @click="toggleFilterPanel('faultCodes')"
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
              <button class="button button-success" type="button" @click="openFaultCodeModal">{{ pickLocaleText('新建故障代码', 'Create fault code') }}</button>
            </div>
          </div>

          <div v-if="faultCodeDirectory.length && !filterPanelCollapsed.faultCodes" class="filter-toolbar surface-muted">
            <label class="filter-field filter-field-search">
              <span>{{ pickLocaleText('关键字', 'Keyword') }}</span>
              <input v-model="filters.faultCodeKeyword" type="search" :placeholder="pickLocaleText('故障代码或描述', 'Fault code or description')" />
            </label>
            <button class="button button-ghost filter-reset" type="button" @click="resetTabFilters('faultCodes')">{{ pickLocaleText('重置筛选', 'Reset filters') }}</button>
          </div>

          <div v-if="!faultCodeDirectory.length" class="empty-state">{{ pickLocaleText('当前还没有故障代码。', 'There are no fault codes yet.') }}</div>

          <div v-else-if="!filteredFaultCodeDirectory.length" class="empty-state">{{ pickLocaleText('没有符合筛选条件的故障代码。', 'No fault codes match the current filters.') }}</div>

          <div v-else class="entity-list">
            <article v-for="faultCode in filteredFaultCodeDirectory" :key="faultCode.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <h4>{{ faultCode.code }}</h4>
                  <p>{{ faultCode.description }}</p>
                </div>
                <div class="action-row">
                  <button class="button button-ghost" type="button" @click="editFaultCode(faultCode)">
                    {{ pickLocaleText('编辑', 'Edit') }}
                  </button>
                  <button class="button button-danger" type="button" @click="removeFaultCode(faultCode.id)">
                    {{ pickLocaleText('删除', 'Delete') }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div v-else class="tab-panel">
        <div class="list-panel">
          <div class="section-headline">
            <div>
              <p class="kicker">Spare Parts</p>
              <h3 class="section-title">{{ pickLocaleText('设备备件', 'Spare parts') }}</h3>
            </div>
            <div class="action-row">
              <button
                class="button button-ghost button-icon filter-toggle"
                :class="{ 'is-active': !filterPanelCollapsed.spareParts }"
                type="button"
                :aria-label="getFilterToggleLabel('spareParts')"
                :aria-pressed="!filterPanelCollapsed.spareParts"
                :title="getFilterToggleLabel('spareParts')"
                @click="toggleFilterPanel('spareParts')"
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
              <button class="button button-success" type="button" @click="openSparePartModal">{{ pickLocaleText('新建备件', 'Create spare part') }}</button>
              <button class="button button-ghost" type="button" @click="openAutoPurchasePlaceholder">{{ pickLocaleText('自动采购备件', 'Automatic purchasing') }}</button>
            </div>
          </div>

          <div v-if="sparePartDirectory.length && !filterPanelCollapsed.spareParts" class="filter-toolbar surface-muted">
            <label class="filter-field filter-field-search">
              <span>{{ pickLocaleText('关键字', 'Keyword') }}</span>
              <input v-model="filters.sparePartKeyword" type="search" :placeholder="pickLocaleText('备件编号、描述、设备编号', 'Part number, description, equipment code')" />
            </label>
            <label class="filter-field">
              <span>{{ pickLocaleText('库存状态', 'Stock status') }}</span>
              <select v-model="filters.sparePartStock">
                <option value="all">{{ pickLocaleText('全部', 'All') }}</option>
                <option value="low">{{ pickLocaleText('低于安全库存', 'At or below safety stock') }}</option>
                <option value="normal">{{ pickLocaleText('高于安全库存', 'Above safety stock') }}</option>
              </select>
            </label>
            <label class="filter-field">
              <span>{{ pickLocaleText('关联设备', 'Equipment link') }}</span>
              <select v-model="filters.sparePartLink">
                <option value="all">{{ pickLocaleText('全部', 'All') }}</option>
                <option value="linked">{{ pickLocaleText('已关联设备', 'Linked equipment') }}</option>
                <option value="unlinked">{{ pickLocaleText('未关联设备', 'No linked equipment') }}</option>
              </select>
            </label>
            <button class="button button-ghost filter-reset" type="button" @click="resetTabFilters('spareParts')">{{ pickLocaleText('重置筛选', 'Reset filters') }}</button>
          </div>

          <div v-if="!sparePartDirectory.length" class="empty-state">{{ pickLocaleText('当前还没有备件信息。', 'There is no spare-part data yet.') }}</div>

          <div v-else-if="!filteredSparePartDirectory.length" class="empty-state">{{ pickLocaleText('没有符合筛选条件的备件。', 'No spare parts match the current filters.') }}</div>

          <div v-else class="entity-list">
            <article v-for="sparePart in filteredSparePartDirectory" :key="sparePart.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <h4>{{ sparePart.partNumber }}</h4>
                  <p>{{ sparePart.description }}</p>
                </div>
                <div class="action-row">
                  <span class="status-pill">{{ pickLocaleText(`库存 ${sparePart.stockQuantity} ${sparePart.unit}`, `Stock ${sparePart.stockQuantity} ${sparePart.unit}`) }}</span>
                  <span class="status-pill status-pill-muted">{{ pickLocaleText(`安全库存 ${sparePart.safetyStock} ${sparePart.unit}`, `Safety stock ${sparePart.safetyStock} ${sparePart.unit}`) }}</span>
                  <button class="button button-ghost" type="button" @click="editSparePart(sparePart)">{{ pickLocaleText('编辑', 'Edit') }}</button>
                  <button class="button button-danger" type="button" @click="removeSparePart(sparePart.id)">
                    {{ pickLocaleText('删除', 'Delete') }}
                  </button>
                </div>
              </div>

              <div class="tag-row">
                <span v-for="equipment in sparePart.equipments" :key="equipment.id" class="tag">
                  {{ equipment.equipmentCode }}
                </span>
                <span v-if="!sparePart.equipments.length" class="tag tag-muted">{{ pickLocaleText('未关联设备', 'No linked equipment') }}</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <div v-if="isEquipmentModalOpen" class="modal-overlay" @click.self="closeEquipmentModal">
      <section class="surface-card modal-card modal-card-wide">
        <div class="section-headline modal-headline">
          <div>
            <p class="kicker">Equipment Assets</p>
            <h3 class="section-title">{{ equipmentEditorTitle }}</h3>
          </div>
          <button class="button button-ghost button-icon" type="button" :aria-label="pickLocaleText('关闭弹出框', 'Close dialog')" @click="closeEquipmentModal">
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

        <form class="form-grid" @submit.prevent="submitEquipment">
          <div class="form-two-column">
            <label>
              <span>{{ pickLocaleText('设备编号', 'Equipment code') }}</span>
              <input v-model="equipmentForm.equipmentCode" type="text" :placeholder="pickLocaleText('例如 EQ-003', 'For example EQ-003')" />
            </label>
            <label>
              <span>{{ pickLocaleText('设备描述', 'Description') }}</span>
              <input v-model="equipmentForm.description" type="text" :placeholder="pickLocaleText('请输入设备描述', 'Enter an equipment description')" />
            </label>
            <label>
              <span>{{ pickLocaleText('状态', 'Status') }}</span>
              <select v-model="equipmentForm.status">
                <option v-for="status in STATUS_OPTIONS" :key="status" :value="status">{{ translateStaticText(status) }}</option>
              </select>
            </label>
            <label>
              <span>{{ pickLocaleText('有效期', 'Valid until') }}</span>
              <input v-model="equipmentForm.validUntil" type="date" />
            </label>
            <label>
              <span>{{ pickLocaleText('设备类型', 'Equipment type') }}</span>
              <input v-model="equipmentForm.type" type="text" :placeholder="pickLocaleText('例如 称量设备', 'For example Weighing device')" />
            </label>
            <label>
              <span>{{ pickLocaleText('设备型号', 'Model') }}</span>
              <input v-model="equipmentForm.model" type="text" :placeholder="pickLocaleText('例如 XPR205', 'For example XPR205')" />
            </label>
            <label>
              <span>{{ pickLocaleText('设备位置', 'Location') }}</span>
              <input v-model="equipmentForm.location" type="text" :placeholder="pickLocaleText('例如 上海工厂-实验室A区', 'For example Shanghai Plant - Lab A')" />
            </label>
            <label>
              <span>{{ pickLocaleText('责任人', 'Owner') }}</span>
              <select v-model="equipmentForm.ownerUserId">
                <option value="">{{ pickLocaleText('请选择责任人', 'Select an owner') }}</option>
                <option v-for="owner in ownerOptions" :key="owner.id" :value="owner.id">
                  {{ owner.name }} / {{ owner.accountName }}
                </option>
              </select>
            </label>
            <label>
              <span>{{ pickLocaleText('联系信息', 'Contact') }}</span>
              <input v-model="equipmentForm.contactInfo" type="text" :placeholder="pickLocaleText('例如 张工程师 / 13800000003', 'For example Engineer Zhang / 13800000003')" />
            </label>
            <label>
              <span>{{ pickLocaleText('购买日期', 'Purchase date') }}</span>
              <input v-model="equipmentForm.purchaseDate" type="date" />
            </label>
            <label>
              <span>{{ pickLocaleText('投运日期', 'Commissioning date') }}</span>
              <input v-model="equipmentForm.commissioningDate" type="date" />
            </label>
            <label>
              <span>{{ pickLocaleText('寿命期', 'Service life') }}</span>
              <input v-model="equipmentForm.serviceLife" type="text" :placeholder="pickLocaleText('例如 10年', 'For example 10 years')" />
            </label>
            <label>
              <span>{{ pickLocaleText('点检频率（天）', 'Inspection frequency (days)') }}</span>
              <input v-model="equipmentForm.inspectionFrequencyDays" type="number" min="1" />
            </label>
          </div>

          <fieldset class="selection-fieldset">
            <legend>{{ pickLocaleText('分配点检任务清单', 'Assign task lists') }}</legend>
            <div class="checkbox-grid">
              <label v-for="taskList in taskListDirectory" :key="taskList.id" class="choice-chip">
                <input v-model="equipmentForm.taskListIds" type="checkbox" :value="taskList.id" />
                <span>{{ taskList.code }} · {{ taskList.description }}</span>
              </label>
            </div>
          </fieldset>

          <fieldset class="selection-fieldset">
            <legend>{{ pickLocaleText('关联备件', 'Linked spare parts') }}</legend>
            <div class="checkbox-grid">
              <label v-for="sparePart in sparePartDirectory" :key="sparePart.id" class="choice-chip">
                <input v-model="equipmentForm.sparePartIds" type="checkbox" :value="sparePart.id" />
                <span>{{ pickLocaleText(`${sparePart.partNumber} · 库存 ${sparePart.stockQuantity} ${sparePart.unit}`, `${sparePart.partNumber} · Stock ${sparePart.stockQuantity} ${sparePart.unit}`) }}</span>
              </label>
            </div>
          </fieldset>

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeEquipmentModal">{{ pickLocaleText('取消', 'Cancel') }}</button>
            <button class="button button-success" type="submit" :disabled="isSubmitting">
              {{ editingEquipmentId ? pickLocaleText('保存设备', 'Save equipment') : pickLocaleText('创建设备', 'Create equipment') }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isEquipmentQrModalOpen" class="modal-overlay" @click.self="closeEquipmentQrModal">
      <section class="surface-card modal-card qr-modal-card">
        <div class="section-headline modal-headline">
          <div>
            <h3 class="section-title">{{ activeEquipmentQr?.equipmentCode || pickLocaleText('设备编码二维码', 'Equipment QR code') }}</h3>
          </div>
          <button class="button button-ghost button-icon" type="button" :aria-label="pickLocaleText('关闭弹出框', 'Close dialog')" @click="closeEquipmentQrModal">
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

        <div class="qr-preview">
          <div class="qr-preview__panel">
            <div v-if="isGeneratingEquipmentQr" class="qr-preview__loading">{{ pickLocaleText('二维码生成中...', 'Generating QR code...') }}</div>
            <img
              v-else-if="equipmentQrCodeDataUrl"
              class="qr-preview__image"
              :src="equipmentQrCodeDataUrl"
              :alt="pickLocaleText(`${activeEquipmentQr?.equipmentCode || '设备'}二维码`, `${activeEquipmentQr?.equipmentCode || 'Equipment'} QR code`)"
            />
            <div v-else class="qr-preview__loading">{{ pickLocaleText('暂无可显示的二维码', 'No QR code is available to display') }}</div>
          </div>
        </div>

        <div class="modal-actions">
          <a
            v-if="equipmentQrCodeDataUrl && activeEquipmentQr?.equipmentCode"
            class="button button-success"
            :href="equipmentQrCodeDataUrl"
            :download="`${activeEquipmentQr.equipmentCode}.png`"
          >
            {{ pickLocaleText('下载二维码', 'Download QR code') }}
          </a>
          <button class="button button-ghost" type="button" @click="closeEquipmentQrModal">{{ pickLocaleText('关闭', 'Close') }}</button>
        </div>
      </section>
    </div>

    <div v-if="isTaskListModalOpen" class="modal-overlay" @click.self="closeTaskListModal">
      <section class="surface-card modal-card">
        <div class="section-headline modal-headline">
          <div>
            <p class="kicker">Task Lists</p>
            <h3 class="section-title">{{ taskListEditorTitle }}</h3>
          </div>
          <button class="button button-ghost button-icon" type="button" aria-label="关闭弹出框" @click="closeTaskListModal">
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

        <form class="form-grid" @submit.prevent="submitTaskList">
          <label>
            <span>任务清单 ID</span>
            <input v-model="taskListForm.code" type="text" placeholder="例如 TASK-003" />
          </label>

          <label>
            <span>任务清单描述</span>
            <textarea
              v-model="taskListForm.description"
              rows="4"
              placeholder="请输入任务清单适用场景与说明"
            ></textarea>
          </label>

          <fieldset class="selection-fieldset">
            <legend>选择点检项</legend>
            <div class="checkbox-grid">
              <label
                v-for="inspectionItem in inspectionItemDirectory"
                :key="inspectionItem.id"
                class="choice-chip"
              >
                <input v-model="taskListForm.inspectionItemIds" type="checkbox" :value="inspectionItem.id" />
                <span>{{ inspectionItem.code }} · {{ inspectionItem.description }}</span>
              </label>
            </div>
          </fieldset>

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeTaskListModal">取消</button>
            <button class="button button-success" type="submit" :disabled="isSubmitting">
              {{ editingTaskListId ? '保存清单' : '创建清单' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isInspectionItemModalOpen" class="modal-overlay" @click.self="closeInspectionItemModal">
      <section class="surface-card modal-card">
        <div class="section-headline modal-headline">
          <div>
            <p class="kicker">Inspection Items</p>
            <h3 class="section-title">{{ inspectionItemEditorTitle }}</h3>
          </div>
          <button class="button button-ghost button-icon" type="button" aria-label="关闭弹出框" @click="closeInspectionItemModal">
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

        <form class="form-grid" @submit.prevent="submitInspectionItem">
          <label>
            <span>点检项 ID</span>
            <input v-model="inspectionItemForm.code" type="text" placeholder="例如 ITEM-004" />
          </label>

          <label>
            <span>点检项描述</span>
            <textarea v-model="inspectionItemForm.description" rows="4" placeholder="请输入点检项描述"></textarea>
          </label>

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeInspectionItemModal">取消</button>
            <button class="button button-success" type="submit" :disabled="isSubmitting">
              {{ editingInspectionItemId ? '保存点检项' : '创建点检项' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isFaultCodeModalOpen" class="modal-overlay" @click.self="closeFaultCodeModal">
      <section class="surface-card modal-card">
        <div class="section-headline modal-headline">
          <div>
            <p class="kicker">Fault Codes</p>
            <h3 class="section-title">{{ faultCodeEditorTitle }}</h3>
          </div>
          <button class="button button-ghost button-icon" type="button" aria-label="关闭弹出框" @click="closeFaultCodeModal">
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

        <form class="form-grid" @submit.prevent="submitFaultCode">
          <label>
            <span>故障 ID</span>
            <input v-model="faultCodeForm.code" type="text" placeholder="例如 FAULT-004" />
          </label>

          <label>
            <span>故障描述</span>
            <textarea v-model="faultCodeForm.description" rows="4" placeholder="请输入故障描述"></textarea>
          </label>

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeFaultCodeModal">取消</button>
            <button class="button button-success" type="submit" :disabled="isSubmitting">
              {{ editingFaultCodeId ? '保存故障代码' : '创建故障代码' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isSparePartModalOpen" class="modal-overlay" @click.self="closeSparePartModal">
      <section class="surface-card modal-card">
        <div class="section-headline modal-headline">
          <div>
            <p class="kicker">Spare Parts</p>
            <h3 class="section-title">{{ sparePartEditorTitle }}</h3>
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

        <form class="form-grid" @submit.prevent="submitSparePart">
          <div class="form-two-column">
            <label>
              <span>备件编号</span>
              <input v-model="sparePartForm.partNumber" type="text" placeholder="例如 SP-004" />
            </label>
            <label>
              <span>单位</span>
              <input v-model="sparePartForm.unit" type="text" placeholder="例如 件 / 套 / 盒" />
            </label>
            <label>
              <span>备件描述</span>
              <input v-model="sparePartForm.description" type="text" placeholder="请输入备件描述" />
            </label>
            <label>
              <span>当前库存</span>
              <input v-model="sparePartForm.stockQuantity" type="number" min="0" />
            </label>
            <label>
              <span>安全库存</span>
              <input v-model="sparePartForm.safetyStock" type="number" min="0" />
            </label>
          </div>

          <fieldset class="selection-fieldset">
            <legend>关联设备</legend>
            <div class="checkbox-grid">
              <label v-for="equipment in equipmentList" :key="equipment.id" class="choice-chip">
                <input v-model="sparePartForm.equipmentIds" type="checkbox" :value="equipment.id" />
                <span>{{ equipment.equipmentCode }} · {{ equipment.description }}</span>
              </label>
            </div>
          </fieldset>

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeSparePartModal">取消</button>
            <button class="button button-success" type="submit" :disabled="isSubmitting">
              {{ editingSparePartId ? '保存备件' : '创建备件' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.management-page .tag,
.management-page .status-pill {
  border-radius: 8px;
}

.section-card {
  padding: 18px;
}

.tab-card {
  display: grid;
  gap: 14px;
}

.tab-panel {
  display: grid;
  gap: 12px;
}

.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding-bottom: 2px;
  border-bottom: 1px solid #d8dee4;
}

.tab-button {
  position: relative;
  min-height: 36px;
  padding: 0 2px;
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-soft);
  font-weight: 600;
}

.tab-button.is-active {
  color: var(--color-text);
}

.tab-button::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 2px;
  background: transparent;
  transition: background 0.2s ease;
}

.tab-button.is-active::after {
  background: var(--color-brand);
}

.list-panel {
  display: grid;
  gap: 12px;
}

.section-headline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
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
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.entity-meta-block,
.entity-group {
  display: grid;
  gap: 6px;
}

.entity-meta-label {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-soft);
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
  min-height: 160px;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  color: var(--color-text-soft);
  background: #f6f8fa;
}

.tag-muted {
  color: var(--color-text-soft);
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
  width: min(720px, 100%);
  max-height: min(88vh, 860px);
  overflow: auto;
  padding: 18px;
  background: #ffffff;
}

.modal-card-wide {
  width: min(980px, 100%);
}

.qr-modal-card {
  width: min(560px, 100%);
}

.modal-headline {
  margin-bottom: 12px;
}

.qr-preview {
  display: grid;
}

.qr-preview__panel {
  display: grid;
  place-items: center;
  min-height: 320px;
  padding: 20px;
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  background: #f6f8fa;
}

.qr-preview__image {
  width: min(280px, 100%);
  height: auto;
  display: block;
  border-radius: 12px;
  background: #ffffff;
}

.qr-preview__loading {
  color: var(--color-text-soft);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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