<template>
  <RouterView />
  <MessageToast />
</template>

<script setup>
import { RouterView } from 'vue-router'

import MessageToast from './components/MessageToast.vue'
</script>
