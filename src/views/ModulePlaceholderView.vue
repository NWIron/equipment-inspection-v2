<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { pickLocaleText, resolveFeatureText, resolveRoleName } from '../i18n'
import { useAccessStore } from '../stores/access'
import { goBackOrHome } from '../utils/navigation'

const props = defineProps({
  moduleId: {
    type: String,
    required: true,
  },
})

const router = useRouter()
const accessStore = useAccessStore()

const feature = computed(() => accessStore.getFeatureById(props.moduleId))
const relatedRoles = computed(() =>
  accessStore.roles.filter((role) => role.featureIds.includes(props.moduleId)),
)

function goBack() {
  goBackOrHome(router)
}
</script>

<template>
  <div class="page">
    <section class="surface-card placeholder-card">
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
            <h2 class="page-title">{{ feature ? resolveFeatureText(feature, 'title') : pickLocaleText('模块未定义', 'Module not defined') }}</h2>
          </div>
        </div>
      </div>

      <div class="metric-grid">
        <article class="metric-card">
          <span class="metric-label">{{ pickLocaleText('当前状态', 'Current status') }}</span>
          <strong class="metric-value">{{ feature ? resolveFeatureText(feature, 'phaseLabel') : pickLocaleText('未配置', 'Not configured') }}</strong>
          <p class="metric-detail">{{ pickLocaleText('一期先保留标准化入口与信息架构。', 'Phase 1 keeps the standardized entry point and information architecture in place.') }}</p>
        </article>
        <article class="metric-card">
          <span class="metric-label">{{ pickLocaleText('建议下一步', 'Recommended next step') }}</span>
          <strong class="metric-value">{{ pickLocaleText('细化业务模型', 'Refine the business model') }}</strong>
          <p class="metric-detail">{{ pickLocaleText('梳理字段、流程、状态机与报表需求。', 'Clarify fields, workflows, state transitions, and reporting requirements.') }}</p>
        </article>
      </div>

      <div class="tag-row" :aria-label="pickLocaleText('相关角色', 'Related roles')">
        <span v-for="role in relatedRoles" :key="role.id" class="tag">{{ resolveRoleName(role) }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.placeholder-card {
  display: grid;
  gap: 24px;
  padding: 28px;
  background: #ffffff;
}
</style>