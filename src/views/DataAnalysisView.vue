<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { pickLocaleText, translateStaticText } from '../i18n'
import { useEquipmentStore } from '../stores/equipment'
import { useInspectionTaskStore } from '../stores/inspectionTasks'
import { useWorkOrderStore } from '../stores/workOrders'
import { goBackOrHome } from '../utils/navigation'
import { formatDateTimeDisplay } from '../utils/datetime'

const EQUIPMENT_STATUS_ORDER = ['在用', '检修中', '停用', '待报废']
const TASK_STATUS_ORDER = ['待执行', '执行中', '已完成']
const TASK_PRIORITY_ORDER = ['低', '中', '高', '紧急']
const WORK_ORDER_STATUS_ORDER = ['待派工', '维修中', '待验收', '待确认', '处理中', '已确认']
const PRIORITY_WEIGHT = {
  紧急: 4,
  高: 3,
  中: 2,
  低: 1,
}

const router = useRouter()
const equipmentStore = useEquipmentStore()
const inspectionTaskStore = useInspectionTaskStore()
const workOrderStore = useWorkOrderStore()

const isLoading = ref(false)
const loadErrors = ref([])

const equipmentRows = computed(() => equipmentStore.equipmentDirectory)
const taskRows = computed(() => inspectionTaskStore.taskDirectory)
const workOrderRows = computed(() => workOrderStore.workOrderDirectory)
const sparePartRows = computed(() => equipmentStore.sparePartDirectory)

function goBack() {
  goBackOrHome(router)
}

function buildBarSeries(items, getLabel, preferredOrder = []) {
  const counts = items.reduce((lookup, item) => {
    const label = getLabel(item) || pickLocaleText('未分类', 'Uncategorized')
    lookup[label] = (lookup[label] ?? 0) + 1
    return lookup
  }, {})

  const orderedLabels = [
    ...preferredOrder.filter((label) => counts[label] != null),
    ...Object.keys(counts).filter((label) => !preferredOrder.includes(label)).sort(),
  ]
  const maxCount = Math.max(...Object.values(counts), 0)

  return orderedLabels.map((label) => ({
    label,
    count: counts[label],
    ratio: maxCount > 0 ? (counts[label] / maxCount) * 100 : 0,
  }))
}

const overviewMetrics = computed(() => {
  const totalEquipment = equipmentRows.value.length
  const totalTasks = taskRows.value.length
  const totalWorkOrders = workOrderRows.value.length
  const stockRiskCount = sparePartRows.value.filter(
    (item) => Number(item.stockQuantity ?? 0) <= Number(item.safetyStock ?? 0),
  ).length
  const completedTasks = taskRows.value.filter((item) => item.status === '已完成').length
  const confirmedWorkOrders = workOrderRows.value.filter((item) => item.status === '已确认').length

  return [
    {
      label: '设备总量',
      value: totalEquipment,
      detail: `${equipmentRows.value.filter((item) => item.status === '在用').length} 台设备处于在用状态`,
    },
    {
      label: '点检任务',
      value: totalTasks,
      detail: `${completedTasks} 项已完成，完成率 ${totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0}%`,
    },
    {
      label: '维修工单',
      value: totalWorkOrders,
      detail: `${confirmedWorkOrders} 张已确认，确认率 ${totalWorkOrders ? Math.round((confirmedWorkOrders / totalWorkOrders) * 100) : 0}%`,
    },
    {
      label: '备件预警',
      value: stockRiskCount,
      detail: stockRiskCount ? '存在低于或等于安全库存的备件项目' : '当前未发现安全库存预警',
    },
  ]
})

const equipmentStatusSeries = computed(() =>
  buildBarSeries(equipmentRows.value, (item) => item.status, EQUIPMENT_STATUS_ORDER),
)

const taskStatusSeries = computed(() =>
  buildBarSeries(taskRows.value, (item) => item.status, TASK_STATUS_ORDER),
)

const taskPrioritySeries = computed(() =>
  buildBarSeries(taskRows.value, (item) => item.priority, TASK_PRIORITY_ORDER),
)

const workOrderStatusSeries = computed(() =>
  buildBarSeries(workOrderRows.value, (item) => item.status, WORK_ORDER_STATUS_ORDER),
)

const equipmentWorkloadRows = computed(() =>
  equipmentRows.value
    .map((equipment) => {
      const relatedTasks = taskRows.value.filter((task) => task.equipmentId === equipment.id)
      const relatedWorkOrders = workOrderRows.value.filter((workOrder) => workOrder.equipmentId === equipment.id)

      return {
        id: equipment.id,
        equipmentCode: equipment.equipmentCode,
        description: equipment.description,
        location: equipment.location || pickLocaleText('未配置位置', 'Location not configured'),
        taskCount: relatedTasks.length,
        abnormalTaskCount: relatedTasks.filter((task) => Number(task.abnormalCount ?? 0) > 0).length,
        workOrderCount: relatedWorkOrders.length,
        confirmedWorkOrderCount: relatedWorkOrders.filter((workOrder) => workOrder.status === '已确认').length,
      }
    })
    .sort(
      (left, right) =>
        right.taskCount + right.workOrderCount - (left.taskCount + left.workOrderCount) ||
        right.abnormalTaskCount - left.abnormalTaskCount ||
        left.equipmentCode.localeCompare(right.equipmentCode),
    )
    .slice(0, 8),
)

const sparePartRiskRows = computed(() =>
  sparePartRows.value
    .filter((item) => Number(item.stockQuantity ?? 0) <= Number(item.safetyStock ?? 0))
    .map((item) => ({
      ...item,
      gap: Number(item.safetyStock ?? 0) - Number(item.stockQuantity ?? 0),
    }))
    .sort((left, right) => right.gap - left.gap || left.partNumber.localeCompare(right.partNumber))
    .slice(0, 10),
)

const focusWorkOrders = computed(() =>
  workOrderRows.value
    .filter((item) => item.status !== '已确认')
    .slice()
    .sort(
      (left, right) =>
        (PRIORITY_WEIGHT[right.priority] ?? 0) - (PRIORITY_WEIGHT[left.priority] ?? 0) ||
        String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')),
    )
    .slice(0, 8),
)

const abnormalTasks = computed(() =>
  taskRows.value
    .filter((item) => Number(item.abnormalCount ?? 0) > 0)
    .slice()
    .sort(
      (left, right) =>
        Number(right.abnormalCount ?? 0) - Number(left.abnormalCount ?? 0) ||
        (PRIORITY_WEIGHT[right.priority] ?? 0) - (PRIORITY_WEIGHT[left.priority] ?? 0),
    )
    .slice(0, 8),
)

const hasAnyData = computed(
  () => equipmentRows.value.length > 0 || taskRows.value.length > 0 || workOrderRows.value.length > 0,
)

function getBarStyle(item) {
  return {
    width: `${item.ratio > 0 ? Math.max(item.ratio, 8) : 0}%`,
  }
}

async function loadReports() {
  isLoading.value = true

  try {
    const results = await Promise.all([
      equipmentStore.initialize(),
      inspectionTaskStore.initialize(),
      workOrderStore.initialize(),
    ])

    loadErrors.value = results.filter((result) => !result.ok).map((result) => result.message)
  } finally {
    isLoading.value = false
  }
}

onMounted(loadReports)
</script>

<template>
  <div class="page analytics-page">
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
          <h2 class="page-title">{{ pickLocaleText('数据分析', 'Data Analysis') }}</h2>
        </div>
      </div>
      <button class="button button-success" type="button" :disabled="isLoading" @click="loadReports">
        {{ isLoading ? pickLocaleText('刷新中...', 'Refreshing...') : pickLocaleText('刷新报表', 'Refresh reports') }}
      </button>
    </div>

    <section v-if="loadErrors.length" class="surface-card section-card warning-card">
      <div>
        <p class="kicker">Data Status</p>
        <h3 class="section-title">{{ pickLocaleText('部分数据加载失败', 'Some data failed to load') }}</h3>
      </div>
      <div class="warning-list">
        <p v-for="message in loadErrors" :key="message" class="warning-item">{{ message }}</p>
      </div>
    </section>

    <section class="surface-card section-card">
      <div class="section-headline">
        <div>
          <p class="kicker">Overview</p>
          <h3 class="section-title">{{ pickLocaleText('运营总览', 'Operations overview') }}</h3>
        </div>
      </div>

      <div class="metric-grid">
        <article v-for="metric in overviewMetrics" :key="metric.label" class="metric-card analytics-metric-card">
          <span class="metric-label">{{ metric.label }}</span>
          <strong class="metric-value">{{ metric.value }}</strong>
          <p class="metric-detail">{{ metric.detail }}</p>
        </article>
      </div>
    </section>

    <div v-if="isLoading && !hasAnyData" class="surface-card section-card empty-state">{{ pickLocaleText('正在汇总报表数据...', 'Compiling report data...') }}</div>
    <div v-else-if="!hasAnyData" class="surface-card section-card empty-state">{{ pickLocaleText('当前暂无可用于分析的数据。', 'There is no data available for analysis yet.') }}</div>

    <template v-else>
      <div class="report-grid">
        <section class="surface-card section-card">
          <div class="section-headline">
            <div>
              <p class="kicker">Equipment</p>
              <h3 class="section-title">{{ pickLocaleText('设备状态分布', 'Equipment status distribution') }}</h3>
            </div>
          </div>
          <div class="bar-list">
            <div v-for="item in equipmentStatusSeries" :key="item.label" class="bar-item">
              <div class="bar-item__header">
                <span>{{ translateStaticText(item.label) }}</span>
                <strong>{{ item.count }}</strong>
              </div>
              <div class="bar-track"><span class="bar-fill bar-fill--teal" :style="getBarStyle(item)"></span></div>
            </div>
          </div>
        </section>

        <section class="surface-card section-card">
          <div class="section-headline">
            <div>
              <p class="kicker">Inspection</p>
              <h3 class="section-title">{{ pickLocaleText('点检任务状态', 'Inspection task status') }}</h3>
            </div>
          </div>
          <div class="bar-list">
            <div v-for="item in taskStatusSeries" :key="item.label" class="bar-item">
              <div class="bar-item__header">
                <span>{{ translateStaticText(item.label) }}</span>
                <strong>{{ item.count }}</strong>
              </div>
              <div class="bar-track"><span class="bar-fill bar-fill--blue" :style="getBarStyle(item)"></span></div>
            </div>
          </div>
        </section>

        <section class="surface-card section-card">
          <div class="section-headline">
            <div>
              <p class="kicker">Inspection</p>
              <h3 class="section-title">{{ pickLocaleText('点检优先级分布', 'Inspection priority distribution') }}</h3>
            </div>
          </div>
          <div class="bar-list">
            <div v-for="item in taskPrioritySeries" :key="item.label" class="bar-item">
              <div class="bar-item__header">
                <span>{{ translateStaticText(item.label) }}</span>
                <strong>{{ item.count }}</strong>
              </div>
              <div class="bar-track"><span class="bar-fill bar-fill--amber" :style="getBarStyle(item)"></span></div>
            </div>
          </div>
        </section>

        <section class="surface-card section-card">
          <div class="section-headline">
            <div>
              <p class="kicker">Maintenance</p>
              <h3 class="section-title">{{ pickLocaleText('工单状态分布', 'Work-order status distribution') }}</h3>
            </div>
          </div>
          <div class="bar-list">
            <div v-for="item in workOrderStatusSeries" :key="item.label" class="bar-item">
              <div class="bar-item__header">
                <span>{{ translateStaticText(item.label) }}</span>
                <strong>{{ item.count }}</strong>
              </div>
              <div class="bar-track"><span class="bar-fill bar-fill--slate" :style="getBarStyle(item)"></span></div>
            </div>
          </div>
        </section>
      </div>

      <section class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Equipment Load</p>
            <h3 class="section-title">{{ pickLocaleText('设备工作量排行', 'Equipment workload ranking') }}</h3>
          </div>
        </div>

        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th>{{ pickLocaleText('设备', 'Equipment') }}</th>
                <th>{{ pickLocaleText('位置', 'Location') }}</th>
                <th>{{ pickLocaleText('点检任务', 'Inspection tasks') }}</th>
                <th>{{ pickLocaleText('异常任务', 'Abnormal tasks') }}</th>
                <th>{{ pickLocaleText('维修工单', 'Work orders') }}</th>
                <th>{{ pickLocaleText('已确认工单', 'Confirmed work orders') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in equipmentWorkloadRows" :key="row.id">
                <td>
                  <strong>{{ row.equipmentCode }}</strong>
                  <div class="table-subtext">{{ row.description }}</div>
                </td>
                <td>{{ row.location }}</td>
                <td>{{ row.taskCount }}</td>
                <td>{{ row.abnormalTaskCount }}</td>
                <td>{{ row.workOrderCount }}</td>
                <td>{{ row.confirmedWorkOrderCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="report-grid report-grid--tables">
        <section class="surface-card section-card">
          <div class="section-headline">
            <div>
              <p class="kicker">Spare Parts</p>
              <h3 class="section-title">{{ pickLocaleText('安全库存预警', 'Safety stock alerts') }}</h3>
            </div>
          </div>

          <div v-if="!sparePartRiskRows.length" class="empty-state empty-state--compact">{{ pickLocaleText('当前没有低于安全库存的备件。', 'There are no spare parts below safety stock.') }}</div>
          <div v-else class="table-shell">
            <table>
              <thead>
                <tr>
                  <th>{{ pickLocaleText('备件号', 'Part number') }}</th>
                  <th>{{ pickLocaleText('描述', 'Description') }}</th>
                  <th>{{ pickLocaleText('现有库存', 'Current stock') }}</th>
                  <th>{{ pickLocaleText('安全库存', 'Safety stock') }}</th>
                  <th>{{ pickLocaleText('缺口', 'Gap') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in sparePartRiskRows" :key="row.id">
                  <td><strong>{{ row.partNumber }}</strong></td>
                  <td>{{ row.description }}</td>
                  <td>{{ row.stockQuantity }} {{ row.unit }}</td>
                  <td>{{ row.safetyStock }} {{ row.unit }}</td>
                  <td class="is-danger">{{ row.gap }} {{ row.unit }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="surface-card section-card">
          <div class="section-headline">
            <div>
              <p class="kicker">Maintenance</p>
              <h3 class="section-title">{{ pickLocaleText('重点跟进工单', 'Focus work orders') }}</h3>
            </div>
          </div>

          <div v-if="!focusWorkOrders.length" class="empty-state empty-state--compact">{{ pickLocaleText('当前没有待跟进的维修工单。', 'There are no work orders needing follow-up.') }}</div>
          <div v-else class="table-shell">
            <table>
              <thead>
                <tr>
                  <th>{{ pickLocaleText('工单号', 'Order number') }}</th>
                  <th>{{ pickLocaleText('设备', 'Equipment') }}</th>
                  <th>{{ pickLocaleText('状态', 'Status') }}</th>
                  <th>{{ pickLocaleText('优先级', 'Priority') }}</th>
                  <th>{{ pickLocaleText('创建时间', 'Created at') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in focusWorkOrders" :key="row.id">
                  <td><strong>{{ row.orderNumber }}</strong></td>
                  <td>{{ row.equipment?.equipmentCode || pickLocaleText('未关联设备', 'No linked equipment') }}</td>
                  <td>{{ translateStaticText(row.status) }}</td>
                  <td>{{ translateStaticText(row.priority) }}</td>
                  <td>{{ formatDateTimeDisplay(row.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Inspection Risk</p>
            <h3 class="section-title">{{ pickLocaleText('异常点检任务', 'Abnormal inspection tasks') }}</h3>
          </div>
        </div>

        <div v-if="!abnormalTasks.length" class="empty-state empty-state--compact">{{ pickLocaleText('当前没有异常点检任务。', 'There are no abnormal inspection tasks right now.') }}</div>
        <div v-else class="table-shell">
          <table>
            <thead>
              <tr>
                <th>{{ pickLocaleText('任务', 'Task') }}</th>
                <th>{{ pickLocaleText('设备', 'Equipment') }}</th>
                <th>{{ pickLocaleText('点检员', 'Inspector') }}</th>
                <th>{{ pickLocaleText('异常项', 'Abnormal items') }}</th>
                <th>{{ pickLocaleText('优先级', 'Priority') }}</th>
                <th>{{ pickLocaleText('状态', 'Status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in abnormalTasks" :key="row.id">
                <td>
                  <strong>{{ row.taskName }}</strong>
                  <div class="table-subtext">{{ row.taskNumber || pickLocaleText('待生成任务单号', 'Task number pending') }}</div>
                </td>
                <td>{{ row.equipment?.equipmentCode || pickLocaleText('未关联设备', 'No linked equipment') }}</td>
                <td>{{ row.inspector?.name || pickLocaleText('未分配', 'Unassigned') }}</td>
                <td class="is-danger">{{ row.abnormalCount }}</td>
                <td>{{ translateStaticText(row.priority) }}</td>
                <td>{{ translateStaticText(row.status) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.analytics-page {
  display: grid;
  gap: 16px;
}

.section-card {
  display: grid;
  gap: 14px;
  padding: 18px;
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

.analytics-metric-card {
  background: linear-gradient(180deg, #f8fbff 0%, #f6f8fa 100%);
}

.warning-card {
  border-color: rgba(191, 135, 0, 0.24);
  background: #fff8c5;
}

.warning-list {
  display: grid;
  gap: 8px;
}

.warning-item {
  margin: 0;
  color: #6f4e00;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.report-grid--tables {
  align-items: start;
}

.bar-list {
  display: grid;
  gap: 12px;
}

.bar-item {
  display: grid;
  gap: 8px;
}

.bar-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 0.86rem;
}

.bar-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf2f7;
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.bar-fill--teal {
  background: linear-gradient(90deg, #1f883d 0%, #2da44e 100%);
}

.bar-fill--blue {
  background: linear-gradient(90deg, #0969da 0%, #54aeff 100%);
}

.bar-fill--amber {
  background: linear-gradient(90deg, #bf8700 0%, #d4a72c 100%);
}

.bar-fill--slate {
  background: linear-gradient(90deg, #57606a 0%, #6e7781 100%);
}

.table-shell {
  overflow-x: auto;
}

.table-subtext {
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--color-text-soft);
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

.empty-state--compact {
  min-height: 120px;
}

.is-danger {
  color: var(--color-danger);
  font-weight: 600;
}

@media (max-width: 980px) {
  .report-grid {
    grid-template-columns: 1fr;
  }

  .section-headline {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>