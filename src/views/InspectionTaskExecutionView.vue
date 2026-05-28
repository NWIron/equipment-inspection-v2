<script setup>
import { onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { useInspectionTaskStore } from '../stores/inspectionTasks'
import { useMessageToastStore } from '../stores/messageToast'

const route = useRoute()
const inspectionTaskStore = useInspectionTaskStore()
const toastStore = useMessageToastStore()
const isSaving = ref(false)
const isCompleting = ref(false)

const executionForm = reactive({
  faultCodeId: '',
  faultNote: '',
  results: [],
})

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

function applyTask(task) {
  executionForm.faultCodeId = task.faultCodeId ?? ''
  executionForm.faultNote = task.faultNote ?? ''
  executionForm.results = task.inspectionResults.map((item) => ({
    inspectionItemId: item.inspectionItemId,
    code: item.code,
    description: item.description,
    resultStatus: item.resultStatus,
  }))
}

async function loadTask() {
  const result = await inspectionTaskStore.loadTask(String(route.params.taskId ?? ''))

  if (!result.ok) {
    setFeedback(result.message, 'error')
    return
  }

  applyTask(result.task)
}

async function saveExecution() {
  isSaving.value = true
  const result = await inspectionTaskStore.saveTaskResults(String(route.params.taskId ?? ''), {
    faultCodeId: executionForm.faultCodeId,
    faultNote: executionForm.faultNote,
    results: executionForm.results,
  })
  isSaving.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok && result.task) {
    applyTask(result.task)
  }
}

async function completeTask() {
  isCompleting.value = true
  const result = await inspectionTaskStore.completeTask(String(route.params.taskId ?? ''))
  isCompleting.value = false
  setFeedback(result.message, result.ok ? 'success' : 'error')

  if (result.ok && result.task) {
    applyTask(result.task)
  }
}

onMounted(loadTask)
</script>

<template>
  <div class="page task-execution-page">
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
          <h2 class="page-title">任务点检</h2>
        </div>
      </div>
      <RouterLink class="button button-ghost" :to="{ name: 'inspection-task-management' }">返回任务清单</RouterLink>
    </div>

    <div v-if="inspectionTaskStore.isLoadingTask" class="notice">正在加载任务详情...</div>
    <div v-else-if="!inspectionTaskStore.activeTask" class="empty-state">未找到点检任务。</div>

    <template v-else>
      <section class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Inspection Task</p>
            <h3 class="section-title">{{ inspectionTaskStore.activeTask.taskName }}</h3>
          </div>
          <div class="action-row">
            <button class="button" type="button" disabled>创建维修工单（预留）</button>
            <button
              class="button button-success"
              type="button"
              :disabled="!inspectionTaskStore.activeTask.canComplete || isCompleting"
              @click="completeTask"
            >
              {{ isCompleting ? '提交中...' : '标记已完成' }}
            </button>
          </div>
        </div>

        <div class="entity-meta-grid">
          <div class="entity-meta-block">
            <span class="entity-meta-label">设备信息</span>
            <strong>
              {{ inspectionTaskStore.activeTask.equipment?.equipmentCode }} ·
              {{ inspectionTaskStore.activeTask.equipment?.description }}
            </strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">点检员</span>
            <strong>{{ inspectionTaskStore.activeTask.inspector?.name || '未分配' }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">设备责任人</span>
            <strong>{{ inspectionTaskStore.activeTask.equipment?.ownerName || '未分配' }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">任务创建时间</span>
            <strong>{{ inspectionTaskStore.activeTask.createdAt }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">优先级</span>
            <strong>{{ inspectionTaskStore.activeTask.priority }}</strong>
          </div>
          <div class="entity-meta-block">
            <span class="entity-meta-label">执行状态</span>
            <strong class="task-status" :class="getTaskStatusClass(inspectionTaskStore.activeTask.status)">
              <span class="task-status__dot"></span>
              {{ inspectionTaskStore.activeTask.status }}
            </strong>
          </div>
        </div>
      </section>

      <section class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Execution</p>
            <h3 class="section-title">点检执行</h3>
          </div>
          <button
            class="button button-success"
            type="button"
            :disabled="inspectionTaskStore.activeTask.status === '已完成' || isSaving"
            @click="saveExecution"
          >
            {{ isSaving ? '保存中...' : '保存点检结果' }}
          </button>
        </div>

        <div class="entity-list">
          <article v-for="item in executionForm.results" :key="item.inspectionItemId" class="result-card">
            <div class="result-card__header">
              <div>
                <h4>{{ item.code }}</h4>
                <p>{{ item.description }}</p>
              </div>
              <label class="result-select-field">
                <span>点检结果</span>
                <select v-model="item.resultStatus" :disabled="inspectionTaskStore.activeTask.status === '已完成'">
                  <option v-for="status in inspectionTaskStore.resultStatusOptions" :key="status" :value="status">
                    {{ status }}
                  </option>
                </select>
              </label>
            </div>
          </article>
        </div>

        <div class="fault-info-field">
          <span>故障信息</span>
          <select v-model="executionForm.faultCodeId" :disabled="inspectionTaskStore.activeTask.status === '已完成'">
            <option value="">无</option>
            <option v-for="faultCode in inspectionTaskStore.faultCodes" :key="faultCode.id" :value="faultCode.id">
              {{ faultCode.code }} · {{ faultCode.description }}
            </option>
          </select>
        </div>

        <label class="fault-note-field">
          <span>故障说明</span>
          <textarea
            v-model="executionForm.faultNote"
            rows="3"
            placeholder="如点检过程中发现问题，可在完成点检项后补充故障说明"
            :disabled="inspectionTaskStore.activeTask.status === '已完成'"
          ></textarea>
        </label>
      </section>
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

.task-status.is-completed {
  color: var(--color-success);
}

.entity-list {
  display: grid;
  gap: 10px;
}

.result-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #ffffff;
}

.result-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.result-card h4 {
  margin: 0;
  font-size: 0.96rem;
}

.result-card p {
  margin: 4px 0 0;
  color: var(--color-text-soft);
  font-size: 0.82rem;
}

.result-select-field {
  min-width: 180px;
}

.fault-note-field {
  display: grid;
  gap: 8px;
}

.fault-info-field {
  display: grid;
  gap: 6px;
}

.fault-info-field > span {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-text);
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

@media (max-width: 900px) {
  .section-headline,
  .result-card__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .result-select-field {
    width: 100%;
  }
}
</style>