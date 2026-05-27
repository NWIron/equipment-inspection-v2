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
  padding: 18px;
  min-height: 176px;
  border-radius: 12px;
  background: #ffffff;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  border-color: #afb8c1;
  box-shadow: 0 8px 24px rgba(140, 149, 159, 0.2);
}

.feature-card[data-accent='blue'] {
  border-top: 3px solid #0969da;
}

.feature-card[data-accent='teal'] {
  border-top: 3px solid #1f883d;
}

.feature-card[data-accent='amber'] {
  border-top: 3px solid #bf8700;
}

.feature-card[data-accent='slate'] {
  border-top: 3px solid #6e7781;
}

.feature-card__category {
  margin: 0 0 6px;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #57606a;
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
  padding-top: 12px;
  border-top: 1px solid #d8dee4;
}
</style>