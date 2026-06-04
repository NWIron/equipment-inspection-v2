<script setup>
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'

import { FEATURE_CATALOG } from '../data/seed'
import { pickLocaleText, resolveFeatureText } from '../i18n'
import { useAuditLogStore } from '../stores/auditLogs'
import { formatDateTimeDisplay } from '../utils/datetime'
import { goBackOrHome } from '../utils/navigation'

const ACTION_LABELS = {
  CREATE: {
    zh: '新增',
    en: 'Create',
  },
  UPDATE: {
    zh: '更新',
    en: 'Update',
  },
  DELETE: {
    zh: '删除',
    en: 'Delete',
  },
}

const RESOURCE_LABELS = {
  user: {
    zh: '用户',
    en: 'User',
  },
  role: {
    zh: '角色',
    en: 'Role',
  },
  equipment: {
    zh: '设备',
    en: 'Equipment',
  },
  'inspection-item': {
    zh: '点检项',
    en: 'Inspection item',
  },
  'task-list': {
    zh: '任务清单',
    en: 'Task list',
  },
  'fault-code': {
    zh: '故障代码',
    en: 'Fault code',
  },
  'spare-part': {
    zh: '备件',
    en: 'Spare part',
  },
  'inspection-task': {
    zh: '点检任务',
    en: 'Inspection task',
  },
  'inspection-task-results': {
    zh: '点检结果',
    en: 'Inspection result',
  },
  'work-order': {
    zh: '维修工单',
    en: 'Work order',
  },
  'work-order-task': {
    zh: '维修任务',
    en: 'Work-order task',
  },
  'work-order-spare-parts': {
    zh: '工单备件',
    en: 'Work-order spare parts',
  },
}

const router = useRouter()
const auditLogStore = useAuditLogStore()
const filters = reactive({
  action: '',
  featureId: '',
  operatorUserId: '',
  keyword: '',
  startDate: '',
  endDate: '',
})

const rows = computed(() => auditLogStore.rows)
const filterOptions = computed(() => auditLogStore.filterOptions)
const summary = computed(() => auditLogStore.summary)
const auditLogFeatureTitle = computed(() => getFeatureLabel('audit-logs', pickLocaleText('日志审计', 'Audit Logs')))

function goBack() {
  goBackOrHome(router)
}

function getActionLabel(action) {
  const labels = ACTION_LABELS[action]
  return labels ? pickLocaleText(labels.zh, labels.en) : action
}

function getResourceLabel(resourceType) {
  const labels = RESOURCE_LABELS[resourceType]
  return labels ? pickLocaleText(labels.zh, labels.en) : resourceType
}

function getFeatureLabel(featureId, fallbackLabel = '') {
  const feature = FEATURE_CATALOG.find((entry) => entry.id === featureId)
  return feature ? resolveFeatureText(feature, 'title') : fallbackLabel || featureId
}

function getActionBadgeClass(action) {
  if (action === 'CREATE') {
    return 'audit-badge audit-badge-create'
  }

  if (action === 'DELETE') {
    return 'audit-badge audit-badge-delete'
  }

  return 'audit-badge audit-badge-update'
}

async function loadAuditLogs() {
  await auditLogStore.initialize(filters)
}

async function resetFilters() {
  filters.action = ''
  filters.featureId = ''
  filters.operatorUserId = ''
  filters.keyword = ''
  filters.startDate = ''
  filters.endDate = ''
  await loadAuditLogs()
}

onMounted(loadAuditLogs)
</script>

<template>
  <div class="page audit-page">
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
          <h2 class="page-title">{{ auditLogFeatureTitle }}</h2>
        </div>
      </div>
      <button class="button button-success" type="button" :disabled="auditLogStore.isLoading" @click="loadAuditLogs">
        {{ auditLogStore.isLoading ? pickLocaleText('刷新中...', 'Refreshing...') : pickLocaleText('刷新日志', 'Refresh logs') }}
      </button>
    </div>

    <section class="surface-card section-card">
      <div class="metric-grid">
        <article class="metric-card analytics-metric-card">
          <span class="metric-label">{{ pickLocaleText('日志总数', 'Total logs') }}</span>
          <strong class="metric-value">{{ summary.total }}</strong>
        </article>
        <article class="metric-card analytics-metric-card">
          <span class="metric-label">{{ pickLocaleText('新增操作', 'Create operations') }}</span>
          <strong class="metric-value">{{ summary.createCount }}</strong>
        </article>
        <article class="metric-card analytics-metric-card">
          <span class="metric-label">{{ pickLocaleText('更新操作', 'Update operations') }}</span>
          <strong class="metric-value">{{ summary.updateCount }}</strong>
        </article>
        <article class="metric-card analytics-metric-card">
          <span class="metric-label">{{ pickLocaleText('删除操作', 'Delete operations') }}</span>
          <strong class="metric-value">{{ summary.deleteCount }}</strong>
        </article>
        <article class="metric-card analytics-metric-card">
          <span class="metric-label">{{ pickLocaleText('涉及操作人', 'Operators involved') }}</span>
          <strong class="metric-value">{{ summary.operatorCount }}</strong>
        </article>
      </div>
    </section>

    <section class="surface-card section-card">
      <div class="section-headline">
        <div>
          <p class="kicker">Filters</p>
          <h3 class="section-title">{{ pickLocaleText('筛选条件', 'Filters') }}</h3>
        </div>
      </div>

      <form class="audit-filter-grid" @submit.prevent="loadAuditLogs">
        <label>
          <span>{{ pickLocaleText('操作类型', 'Action') }}</span>
          <select v-model="filters.action">
            <option value="">{{ pickLocaleText('全部操作', 'All actions') }}</option>
            <option v-for="option in filterOptions.actions" :key="option.value" :value="option.value">
              {{ getActionLabel(option.value) }}
            </option>
          </select>
        </label>

        <label>
          <span>{{ pickLocaleText('所属模块', 'Module') }}</span>
          <select v-model="filters.featureId">
            <option value="">{{ pickLocaleText('全部模块', 'All modules') }}</option>
            <option v-for="option in filterOptions.features" :key="option.value" :value="option.value">
              {{ getFeatureLabel(option.value, option.label) }}
            </option>
          </select>
        </label>

        <label>
          <span>{{ pickLocaleText('操作人', 'Operator') }}</span>
          <select v-model="filters.operatorUserId">
            <option value="">{{ pickLocaleText('全部操作人', 'All operators') }}</option>
            <option v-for="option in filterOptions.operators" :key="`${option.value}-${option.label}`" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label>
          <span>{{ pickLocaleText('开始日期', 'Start date') }}</span>
          <input v-model="filters.startDate" type="date" />
        </label>

        <label>
          <span>{{ pickLocaleText('结束日期', 'End date') }}</span>
          <input v-model="filters.endDate" type="date" />
        </label>

        <label class="audit-filter-keyword">
          <span>{{ pickLocaleText('关键词', 'Keyword') }}</span>
          <input
            v-model="filters.keyword"
            type="search"
            :placeholder="pickLocaleText('按资源、操作人、接口路径或请求内容搜索', 'Search resource, operator, endpoint path, or request content')"
          />
        </label>

        <div class="audit-filter-actions">
          <button class="button button-success" type="submit" :disabled="auditLogStore.isLoading">
            {{ pickLocaleText('应用筛选', 'Apply filters') }}
          </button>
          <button class="button button-secondary" type="button" :disabled="auditLogStore.isLoading" @click="resetFilters">
            {{ pickLocaleText('重置', 'Reset') }}
          </button>
        </div>
      </form>
    </section>

    <section v-if="auditLogStore.initializeError" class="surface-card section-card warning-card">
      <div>
        <p class="kicker">Data Status</p>
        <h3 class="section-title">{{ pickLocaleText('日志数据加载失败', 'Failed to load audit logs') }}</h3>
      </div>
      <p class="warning-item">{{ auditLogStore.initializeError }}</p>
    </section>

    <div v-if="auditLogStore.isLoading && !rows.length" class="surface-card section-card empty-state">
      {{ pickLocaleText('正在加载日志审计报表...', 'Loading audit-log report...') }}
    </div>
    <div v-else-if="!rows.length" class="surface-card section-card empty-state">
      {{ pickLocaleText('当前筛选条件下暂无日志记录。', 'No audit logs match the current filters.') }}
    </div>

    <template v-else>
      <section class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Report</p>
            <h3 class="section-title">{{ pickLocaleText('审计日志报表', 'Audit-log report') }}</h3>
          </div>
        </div>

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{{ pickLocaleText('时间', 'Time') }}</th>
                <th>{{ pickLocaleText('操作人', 'Operator') }}</th>
                <th>{{ pickLocaleText('模块', 'Module') }}</th>
                <th>{{ pickLocaleText('操作', 'Action') }}</th>
                <th>{{ pickLocaleText('资源', 'Resource') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td :data-label="pickLocaleText('时间', 'Time')">{{ formatDateTimeDisplay(row.createdAt) }}</td>
                <td :data-label="pickLocaleText('操作人', 'Operator')">{{ row.operatorName || pickLocaleText('系统', 'System') }}</td>
                <td :data-label="pickLocaleText('模块', 'Module')">{{ getFeatureLabel(row.featureId, row.featureTitle) }}</td>
                <td :data-label="pickLocaleText('操作', 'Action')">
                  <span :class="getActionBadgeClass(row.action)">{{ getActionLabel(row.action) }}</span>
                </td>
                <td :data-label="pickLocaleText('资源', 'Resource')">
                  <strong>{{ getResourceLabel(row.resourceType) }}</strong>
                  <div class="table-subtext">{{ row.resourceLabel || row.resourceId || pickLocaleText('未记录摘要', 'No summary') }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.section-card {
  padding: 20px;
}

.section-headline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title {
  margin: 4px 0 0;
  font-size: 1.1rem;
}

.warning-card {
  border-color: rgba(191, 135, 0, 0.28);
  background: linear-gradient(180deg, #fffdf5 0%, #fff8de 100%);
}

.warning-item {
  margin: 0;
  color: #7a5d00;
}

.empty-state {
  padding: 32px 20px;
  text-align: center;
  color: var(--color-text-soft);
}

.analytics-metric-card {
  display: grid;
  gap: 6px;
}

.audit-filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.audit-filter-keyword {
  grid-column: 1 / -1;
}

.audit-filter-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 10px;
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

.table-scroll {
  overflow-x: auto;
}

table tbody td:first-child {
  white-space: nowrap;
}

.audit-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.audit-badge-create {
  background: rgba(26, 127, 55, 0.12);
  color: var(--color-success);
}

.audit-badge-update {
  background: rgba(9, 105, 218, 0.12);
  color: var(--color-brand-strong);
}

.audit-badge-delete {
  background: rgba(207, 34, 46, 0.12);
  color: var(--color-danger);
}

.table-subtext {
  margin-top: 4px;
  color: var(--color-text-soft);
  font-size: 0.8rem;
}

@media (max-width: 900px) {
  .page-header {
    align-items: stretch;
  }

  .page-header-main {
    align-items: flex-start;
  }

  .page-header > .button {
    width: 100%;
  }

  .section-card {
    padding: 16px;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-card {
    padding: 14px;
  }

  .metric-value {
    font-size: 1.6rem;
  }

  .audit-filter-grid {
    grid-template-columns: 1fr;
  }

  .audit-filter-actions {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr;
  }

  .audit-filter-actions .button {
    width: 100%;
  }

  .table-scroll {
    overflow: visible;
  }

  table,
  tbody,
  tr,
  td {
    display: block;
    width: 100%;
  }

  thead {
    display: none;
  }

  tbody {
    display: grid;
    gap: 12px;
  }

  tbody tr {
    padding: 14px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-medium);
    background: #f6f8fa;
    box-shadow: 0 1px 0 rgba(27, 31, 36, 0.04);
  }

  tbody td {
    display: grid;
    grid-template-columns: minmax(72px, 88px) minmax(0, 1fr);
    align-items: start;
    gap: 10px;
    padding: 0;
    border: 0;
  }

  tbody td + td {
    margin-top: 10px;
  }

  tbody td::before {
    content: attr(data-label);
    color: var(--color-text-soft);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.5;
  }

  tbody td:first-child {
    white-space: normal;
  }

  .audit-badge {
    justify-self: start;
  }

  .table-subtext {
    margin-top: 6px;
  }
}
</style>