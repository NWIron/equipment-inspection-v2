<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { useAccessStore } from '../stores/access'

const props = defineProps({
  moduleId: {
    type: String,
    required: true,
  },
})

const accessStore = useAccessStore()

const feature = computed(() => accessStore.getFeatureById(props.moduleId))
const relatedRoles = computed(() =>
  accessStore.roles.filter((role) => role.featureIds.includes(props.moduleId)),
)
</script>

<template>
  <div class="page">
    <section class="surface-card placeholder-card">
      <p class="kicker">Module Placeholder</p>
      <h2 class="page-title">{{ feature?.title || '模块未定义' }}</h2>
      <p class="page-subtitle">
        {{
          feature?.summary ||
          '当前模块尚未纳入一期范围，后续可在这个页面继续扩展业务流程、列表、表单与数据服务。'
        }}
      </p>

      <div class="metric-grid">
        <article class="metric-card">
          <span class="metric-label">当前状态</span>
          <strong class="metric-value">{{ feature?.phaseLabel || '未配置' }}</strong>
          <p class="metric-detail">一期先保留标准化入口与信息架构。</p>
        </article>
        <article class="metric-card">
          <span class="metric-label">建议下一步</span>
          <strong class="metric-value">细化业务模型</strong>
          <p class="metric-detail">梳理字段、流程、状态机与报表需求。</p>
        </article>
      </div>

      <div class="tag-row">
        <span v-for="role in relatedRoles" :key="role.id" class="tag">{{ role.name }}</span>
      </div>

      <RouterLink class="button" :to="{ name: 'home' }">返回工作台</RouterLink>
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