<script setup>
import { computed } from 'vue'

import FeatureCard from '../components/FeatureCard.vue'
import { useAccessStore } from '../stores/access'

const accessStore = useAccessStore()

const summaryCards = computed(() => [
  {
    label: '可用功能卡片',
    value: accessStore.availableFeatures.length,
    detail: '根据角色自动裁剪首页入口',
  },
  {
    label: '当前角色',
    value: accessStore.activeRoles.length,
    detail: accessStore.activeRoles.map((role) => role.name).join(' / ') || '未分配',
  },
  {
    label: '启用用户',
    value: accessStore.dashboardMetrics.activeUsers,
    detail: '来自前端演示种子数据',
  },
])

const phaseItems = [
  '统一门户与角色驱动功能卡片',
  '邮箱密码登录与 SSO 入口预留',
  '用户主数据与角色权限管理',
]
</script>

<template>
  <div class="page">
    <section class="surface-card hero-panel">
      <div class="page-header">
        <div>
          <p class="kicker">Role Based Launchpad</p>
          <h2 class="page-title">{{ accessStore.activeUser?.name }}，欢迎进入设备点检工作台</h2>
          <p class="page-subtitle">
            当前门户按角色展示功能卡片。管理员可见全部模块入口，点检员与设备工程师只看到各自职责范围内的工作面板。
          </p>
        </div>
        <div class="tag-row">
          <span v-for="role in accessStore.activeRoles" :key="role.id" class="tag">{{ role.name }}</span>
        </div>
      </div>

      <div class="metric-grid">
        <article v-for="card in summaryCards" :key="card.label" class="metric-card">
          <span class="metric-label">{{ card.label }}</span>
          <strong class="metric-value">{{ card.value }}</strong>
          <p class="metric-detail">{{ card.detail }}</p>
        </article>
      </div>
    </section>

    <section>
      <div class="page-header compact-header">
        <div>
          <p class="kicker">Functions</p>
          <h3 class="section-title">功能卡片</h3>
        </div>
        <p class="page-subtitle">点击卡片进入模块，一期未开发模块会进入占位页。</p>
      </div>

      <div class="feature-grid">
        <FeatureCard
          v-for="feature in accessStore.availableFeatures"
          :key="feature.id"
          :feature="feature"
        />
      </div>
    </section>

    <section class="split-layout">
      <article class="surface-card roadmap-card">
        <p class="kicker">Phase One</p>
        <h3 class="section-title">一期范围</h3>
        <div class="roadmap-list">
          <div v-for="item in phaseItems" :key="item" class="roadmap-item">
            <span class="roadmap-dot"></span>
            <span>{{ item }}</span>
          </div>
        </div>
      </article>

      <article class="surface-card roadmap-card">
        <p class="kicker">Architecture</p>
        <h3 class="section-title">后端接入准备</h3>
        <p class="page-subtitle">
          当前权限、用户与角色数据由 Pinia + localStorage 承载，后续可以平滑替换为 Cloudflare Pages Functions + D1 数据持久化接口。
        </p>
        <div class="tag-row">
          <span class="tag">Vue</span>
          <span class="tag">Cloudflare Pages</span>
          <span class="tag">D1</span>
          <span class="tag">Azure AD SSO</span>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.hero-panel {
  display: grid;
  gap: 24px;
  padding: 28px;
}

.compact-header {
  margin-bottom: 14px;
}

.section-title {
  margin: 4px 0 0;
  font-size: 1.35rem;
  color: var(--color-text);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.roadmap-card {
  padding: 24px;
}

.roadmap-list {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.roadmap-item {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--color-text-soft);
}

.roadmap-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(145deg, #0a6ed1, #00a58a);
}
</style>