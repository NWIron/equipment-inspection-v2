<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  feature: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <RouterLink :to="feature.path" class="feature-card surface-card" :data-accent="feature.accent">
    <div class="feature-card__header">
      <div class="feature-card__icon">{{ feature.shortLabel }}</div>
      <span class="status-pill">{{ feature.phaseLabel }}</span>
    </div>

    <div class="feature-card__body">
      <p class="feature-card__category">{{ feature.category }}</p>
      <h3>{{ feature.title }}</h3>
      <p>{{ feature.summary }}</p>
    </div>

    <div class="feature-card__footer">
      <span class="tag">角色驱动</span>
      <span class="feature-card__cta">进入模块</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.feature-card {
  display: grid;
  gap: 18px;
  padding: 22px;
  min-height: 240px;
  border-radius: 10px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 38px rgba(15, 55, 102, 0.16);
}

.feature-card[data-accent='blue'] {
  border-top: 4px solid #0a6ed1;
}

.feature-card[data-accent='teal'] {
  border-top: 4px solid #00a58a;
}

.feature-card[data-accent='amber'] {
  border-top: 4px solid #d88400;
}

.feature-card[data-accent='slate'] {
  border-top: 4px solid #4f6b8b;
}

.feature-card__header,
.feature-card__footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.feature-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--color-brand);
  background: rgba(10, 110, 209, 0.1);
}

.feature-card__category {
  margin: 0 0 10px;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.feature-card__body h3 {
  margin: 0 0 10px;
  font-size: 1.25rem;
  color: var(--color-text);
}

.feature-card__body p:last-child {
  margin: 0;
  line-height: 1.7;
  color: var(--color-text-soft);
}

.feature-card__cta {
  font-weight: 600;
  color: var(--color-brand);
}
</style>