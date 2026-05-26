<script setup>
import FeatureCard from '../components/FeatureCard.vue'
import { useAccessStore } from '../stores/access'

const accessStore = useAccessStore()
</script>

<template>
  <div class="page">
    <div class="feature-grid">
      <FeatureCard
        v-for="feature in accessStore.availableFeatures"
        :key="feature.id"
        :feature="feature"
      />
    </div>
  </div>
</template>

<style scoped>
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
</style>