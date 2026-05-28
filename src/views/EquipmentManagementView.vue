<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useEquipmentStore } from '../stores/equipment'

const STATUS_OPTIONS = ['在用', '停用', '检修中', '待报废']

const equipmentStore = useEquipmentStore()
const activeTab = ref('equipment')
const feedbackMessage = ref('')
const feedbackType = ref('success')
const isEquipmentModalOpen = ref(false)
const isTaskListModalOpen = ref(false)
const isInspectionItemModalOpen = ref(false)
const isFaultCodeModalOpen = ref(false)
const isSparePartModalOpen = ref(false)
const editingEquipmentId = ref('')
const editingTaskListId = ref('')
const editingInspectionItemId = ref('')
const editingFaultCodeId = ref('')
const editingSparePartId = ref('')
const isSubmitting = ref(false)

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
  equipmentIds: [],
})

const equipmentList = computed(() => equipmentStore.equipmentDirectory)
const taskListDirectory = computed(() => equipmentStore.taskListDirectory)
const inspectionItemDirectory = computed(() => equipmentStore.inspectionItemDirectory)
const faultCodeDirectory = computed(() => equipmentStore.faultCodeDirectory)
const sparePartDirectory = computed(() => equipmentStore.sparePartDirectory)
const ownerOptions = computed(() => equipmentStore.ownerOptions)
const equipmentEditorTitle = computed(() => (editingEquipmentId.value ? '编辑设备主数据' : '创建设备主数据'))
const taskListEditorTitle = computed(() => (editingTaskListId.value ? '编辑任务清单' : '创建任务清单'))
const inspectionItemEditorTitle = computed(() =>
  editingInspectionItemId.value ? '编辑点检项' : '创建点检项',
)
const faultCodeEditorTitle = computed(() => (editingFaultCodeId.value ? '编辑故障代码' : '创建故障代码'))
const sparePartEditorTitle = computed(() => (editingSparePartId.value ? '编辑备件' : '创建备件'))

function setFeedback(message, type = 'success') {
  feedbackMessage.value = message
  feedbackType.value = type
}

function clearFeedback() {
  feedbackMessage.value = ''
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
  sparePartForm.equipmentIds = [...sparePart.equipmentIds]
  clearFeedback()
  isSparePartModalOpen.value = true
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
          <h2 class="page-title">设备管理</h2>
        </div>
      </div>
    </div>

    <section class="surface-card section-card tab-card">
      <div class="tab-bar" role="tablist" aria-label="Equipment management tabs">
        <button
          class="tab-button"
          :class="{ 'is-active': activeTab === 'equipment' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'equipment'"
          @click="activeTab = 'equipment'"
        >
          设备主数据
        </button>
        <button
          class="tab-button"
          :class="{ 'is-active': activeTab === 'taskLists' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'taskLists'"
          @click="activeTab = 'taskLists'"
        >
          点检任务清单
        </button>
        <button
          class="tab-button"
          :class="{ 'is-active': activeTab === 'inspectionItems' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'inspectionItems'"
          @click="activeTab = 'inspectionItems'"
        >
          点检项
        </button>
        <button
          class="tab-button"
          :class="{ 'is-active': activeTab === 'faultCodes' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'faultCodes'"
          @click="activeTab = 'faultCodes'"
        >
          故障代码
        </button>
        <button
          class="tab-button"
          :class="{ 'is-active': activeTab === 'spareParts' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'spareParts'"
          @click="activeTab = 'spareParts'"
        >
          设备备件
        </button>
      </div>

      <div v-if="feedbackMessage" class="notice" :class="`notice-${feedbackType}`">
        {{ feedbackMessage }}
      </div>

      <div v-if="equipmentStore.isInitializing" class="notice">正在加载设备管理主数据...</div>
      <div v-if="equipmentStore.initializeError" class="notice notice-error">
        {{ equipmentStore.initializeError }}
      </div>

      <div v-if="activeTab === 'equipment'" class="tab-panel">
        <div class="list-panel">
          <div class="section-headline">
            <div>
              <p class="kicker">Equipment Assets</p>
              <h3 class="section-title">设备台账</h3>
            </div>
            <button class="button button-success" type="button" @click="openEquipmentModal">新建设备</button>
          </div>

          <div v-if="!equipmentList.length" class="empty-state">当前还没有设备主数据。</div>

          <div v-else class="entity-list">
            <article v-for="equipment in equipmentList" :key="equipment.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <h4>{{ equipment.equipmentCode }}</h4>
                  <p>{{ equipment.description }}</p>
                </div>
                <div class="action-row">
                  <span class="status-pill">{{ equipment.status }}</span>
                  <button class="button button-ghost" type="button" @click="editEquipment(equipment)">编辑</button>
                  <button class="button button-danger" type="button" @click="removeEquipment(equipment.id)">
                    删除
                  </button>
                </div>
              </div>

              <div class="entity-meta-grid">
                <div class="entity-meta-block">
                  <span class="entity-meta-label">类型 / 型号</span>
                  <strong>{{ equipment.type || '未填写' }} / {{ equipment.model || '未填写' }}</strong>
                </div>
                <div class="entity-meta-block">
                  <span class="entity-meta-label">位置</span>
                  <strong>{{ equipment.location || '未填写' }}</strong>
                </div>
                <div class="entity-meta-block">
                  <span class="entity-meta-label">责任人</span>
                  <strong>{{ equipment.owner?.name || '未分配' }}</strong>
                </div>
                <div class="entity-meta-block">
                  <span class="entity-meta-label">点检频率</span>
                  <strong>{{ equipment.inspectionFrequencyDays }} 天</strong>
                </div>
              </div>

              <div class="entity-group">
                <span class="entity-meta-label">任务清单</span>
                <div class="tag-row">
                  <span v-for="taskList in equipment.taskLists" :key="taskList.id" class="tag">
                    {{ taskList.code }}
                  </span>
                  <span v-if="!equipment.taskLists.length" class="tag tag-muted">未分配</span>
                </div>
              </div>

              <div class="entity-group">
                <span class="entity-meta-label">关联备件</span>
                <div class="tag-row">
                  <span v-for="sparePart in equipment.spareParts" :key="sparePart.id" class="tag">
                    {{ sparePart.partNumber }}
                  </span>
                  <span v-if="!equipment.spareParts.length" class="tag tag-muted">未关联</span>
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
              <h3 class="section-title">点检任务清单</h3>
            </div>
            <button class="button button-success" type="button" @click="openTaskListModal">新建清单</button>
          </div>

          <div v-if="!taskListDirectory.length" class="empty-state">当前还没有任务清单。</div>

          <div v-else class="entity-list">
            <article v-for="taskList in taskListDirectory" :key="taskList.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <h4>{{ taskList.code }}</h4>
                  <p>{{ taskList.description }}</p>
                </div>
                <div class="action-row">
                  <span class="status-pill">{{ taskList.assignedEquipmentCount }} 台设备</span>
                  <button class="button button-ghost" type="button" @click="editTaskList(taskList)">编辑</button>
                  <button class="button button-danger" type="button" @click="removeTaskList(taskList.id)">
                    删除
                  </button>
                </div>
              </div>

              <div class="tag-row">
                <span v-for="inspectionItem in taskList.inspectionItems" :key="inspectionItem.id" class="tag">
                  {{ inspectionItem.code }}
                </span>
                <span v-if="!taskList.inspectionItems.length" class="tag tag-muted">未关联点检项</span>
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
              <h3 class="section-title">点检项</h3>
            </div>
            <button class="button button-success" type="button" @click="openInspectionItemModal">新建点检项</button>
          </div>

          <div v-if="!inspectionItemDirectory.length" class="empty-state">当前还没有点检项。</div>

          <div v-else class="entity-list">
            <article v-for="inspectionItem in inspectionItemDirectory" :key="inspectionItem.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <h4>{{ inspectionItem.code }}</h4>
                  <p>{{ inspectionItem.description }}</p>
                </div>
                <div class="action-row">
                  <span class="status-pill">{{ inspectionItem.taskListCount }} 个清单</span>
                  <button class="button button-ghost" type="button" @click="editInspectionItem(inspectionItem)">
                    编辑
                  </button>
                  <button class="button button-danger" type="button" @click="removeInspectionItem(inspectionItem.id)">
                    删除
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
              <h3 class="section-title">故障代码</h3>
            </div>
            <button class="button button-success" type="button" @click="openFaultCodeModal">新建故障代码</button>
          </div>

          <div v-if="!faultCodeDirectory.length" class="empty-state">当前还没有故障代码。</div>

          <div v-else class="entity-list">
            <article v-for="faultCode in faultCodeDirectory" :key="faultCode.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <h4>{{ faultCode.code }}</h4>
                  <p>{{ faultCode.description }}</p>
                </div>
                <div class="action-row">
                  <button class="button button-ghost" type="button" @click="editFaultCode(faultCode)">
                    编辑
                  </button>
                  <button class="button button-danger" type="button" @click="removeFaultCode(faultCode.id)">
                    删除
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
              <h3 class="section-title">设备备件</h3>
            </div>
            <button class="button button-success" type="button" @click="openSparePartModal">新建备件</button>
          </div>

          <div v-if="!sparePartDirectory.length" class="empty-state">当前还没有备件信息。</div>

          <div v-else class="entity-list">
            <article v-for="sparePart in sparePartDirectory" :key="sparePart.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <h4>{{ sparePart.partNumber }}</h4>
                  <p>{{ sparePart.description }}</p>
                </div>
                <div class="action-row">
                  <span class="status-pill">库存 {{ sparePart.stockQuantity }} {{ sparePart.unit }}</span>
                  <button class="button button-ghost" type="button" @click="editSparePart(sparePart)">编辑</button>
                  <button class="button button-danger" type="button" @click="removeSparePart(sparePart.id)">
                    删除
                  </button>
                </div>
              </div>

              <div class="tag-row">
                <span v-for="equipment in sparePart.equipments" :key="equipment.id" class="tag">
                  {{ equipment.equipmentCode }}
                </span>
                <span v-if="!sparePart.equipments.length" class="tag tag-muted">未关联设备</span>
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
          <button class="button button-ghost" type="button" @click="closeEquipmentModal">关闭</button>
        </div>

        <form class="form-grid" @submit.prevent="submitEquipment">
          <div class="form-two-column">
            <label>
              <span>设备编号</span>
              <input v-model="equipmentForm.equipmentCode" type="text" placeholder="例如 EQ-003" />
            </label>
            <label>
              <span>设备描述</span>
              <input v-model="equipmentForm.description" type="text" placeholder="请输入设备描述" />
            </label>
            <label>
              <span>状态</span>
              <select v-model="equipmentForm.status">
                <option v-for="status in STATUS_OPTIONS" :key="status" :value="status">{{ status }}</option>
              </select>
            </label>
            <label>
              <span>有效期</span>
              <input v-model="equipmentForm.validUntil" type="date" />
            </label>
            <label>
              <span>设备类型</span>
              <input v-model="equipmentForm.type" type="text" placeholder="例如 称量设备" />
            </label>
            <label>
              <span>设备型号</span>
              <input v-model="equipmentForm.model" type="text" placeholder="例如 XPR205" />
            </label>
            <label>
              <span>设备位置</span>
              <input v-model="equipmentForm.location" type="text" placeholder="例如 上海工厂-实验室A区" />
            </label>
            <label>
              <span>责任人</span>
              <select v-model="equipmentForm.ownerUserId">
                <option value="">请选择责任人</option>
                <option v-for="owner in ownerOptions" :key="owner.id" :value="owner.id">
                  {{ owner.name }} / {{ owner.accountName }}
                </option>
              </select>
            </label>
            <label>
              <span>联系信息</span>
              <input v-model="equipmentForm.contactInfo" type="text" placeholder="例如 张工程师 / 13800000003" />
            </label>
            <label>
              <span>购买日期</span>
              <input v-model="equipmentForm.purchaseDate" type="date" />
            </label>
            <label>
              <span>投运日期</span>
              <input v-model="equipmentForm.commissioningDate" type="date" />
            </label>
            <label>
              <span>寿命期</span>
              <input v-model="equipmentForm.serviceLife" type="text" placeholder="例如 10年" />
            </label>
            <label>
              <span>点检频率（天）</span>
              <input v-model="equipmentForm.inspectionFrequencyDays" type="number" min="1" />
            </label>
          </div>

          <fieldset class="selection-fieldset">
            <legend>分配点检任务清单</legend>
            <div class="checkbox-grid">
              <label v-for="taskList in taskListDirectory" :key="taskList.id" class="choice-chip">
                <input v-model="equipmentForm.taskListIds" type="checkbox" :value="taskList.id" />
                <span>{{ taskList.code }} · {{ taskList.description }}</span>
              </label>
            </div>
          </fieldset>

          <fieldset class="selection-fieldset">
            <legend>关联备件</legend>
            <div class="checkbox-grid">
              <label v-for="sparePart in sparePartDirectory" :key="sparePart.id" class="choice-chip">
                <input v-model="equipmentForm.sparePartIds" type="checkbox" :value="sparePart.id" />
                <span>{{ sparePart.partNumber }} · 库存 {{ sparePart.stockQuantity }} {{ sparePart.unit }}</span>
              </label>
            </div>
          </fieldset>

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeEquipmentModal">取消</button>
            <button class="button button-success" type="submit" :disabled="isSubmitting">
              {{ editingEquipmentId ? '保存设备' : '创建设备' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isTaskListModalOpen" class="modal-overlay" @click.self="closeTaskListModal">
      <section class="surface-card modal-card">
        <div class="section-headline modal-headline">
          <div>
            <p class="kicker">Task Lists</p>
            <h3 class="section-title">{{ taskListEditorTitle }}</h3>
          </div>
          <button class="button button-ghost" type="button" @click="closeTaskListModal">关闭</button>
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
          <button class="button button-ghost" type="button" @click="closeInspectionItemModal">关闭</button>
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
          <button class="button button-ghost" type="button" @click="closeFaultCodeModal">关闭</button>
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
          <button class="button button-ghost" type="button" @click="closeSparePartModal">关闭</button>
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

.modal-headline {
  margin-bottom: 12px;
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