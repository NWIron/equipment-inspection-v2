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
    <div class="feature-card__body">
      <p class="feature-card__category">{{ feature.category }}</p>
      <h3>{{ feature.title }}</h3>
      <p>{{ feature.summary }}</p>
    </div>

    <span class="feature-card__cta">进入模块</span>
  </RouterLink>
</template>

<style scoped>
.feature-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  min-height: 168px;
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

.feature-card__category {
  margin: 0 0 6px;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.feature-card__body h3 {
  margin: 0 0 6px;
  font-size: 1.02rem;
  color: var(--color-text);
}

.feature-card__body p:last-child {
  margin: 0;
  line-height: 1.5;
  font-size: 0.85rem;
  color: var(--color-text-soft);
}

.feature-card__cta {
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  font-size: 0.84rem;
  color: var(--color-brand);
}
</style>