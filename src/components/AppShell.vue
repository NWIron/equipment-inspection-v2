<script setup>
import { computed, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'

import { useAccessStore } from '../stores/access'

const router = useRouter()
const accessStore = useAccessStore()
const isLoggingOut = ref(false)

const currentRoleLabel = computed(() => accessStore.activeRoles.map((role) => role.name).join(' / '))

async function handleLogout() {
  if (isLoggingOut.value) {
    return
  }

  isLoggingOut.value = true

  try {
    await accessStore.logout()
    await router.push({ name: 'login' })
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="shell-header surface-card">
      <div class="brand-block">
        <div class="brand-mark">EI</div>
        <div>
          <p class="shell-kicker">Cloudflare Pages + D1 Ready</p>
          <h1 class="shell-title">设备点检系统</h1>
        </div>
      </div>

      <div class="user-panel">
        <div>
          <p class="user-name">{{ accessStore.activeUser?.name }}</p>
          <p class="user-role">{{ currentRoleLabel || '未分配角色' }}</p>
        </div>
        <button class="button button-ghost" type="button" :disabled="isLoggingOut" @click="handleLogout">
          {{ isLoggingOut ? '退出中...' : '退出登录' }}
        </button>
      </div>
    </header>

    <main class="shell-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 16px;
}

.shell-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
}

.brand-block {
  display: flex;
  gap: 12px;
  align-items: center;
}

.brand-mark {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: white;
  background: linear-gradient(145deg, #0a6ed1, #4db1ff);
  box-shadow: 0 16px 32px rgba(10, 110, 209, 0.25);
}

.shell-kicker,
.user-role {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-soft);
}

.shell-title,
.user-name {
  margin: 4px 0 0;
  font-size: 1.15rem;
  color: var(--color-text);
}

.user-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
}

.shell-main {
  margin-top: 12px;
}

@media (max-width: 980px) {
  .app-shell {
    padding: 12px;
  }

  .shell-header {
    grid-template-columns: 1fr;
    padding: 12px;
  }

  .user-panel {
    justify-content: space-between;
  }
}

@media (max-width: 640px) {
  .brand-mark {
    width: 40px;
    height: 40px;
  }

  .shell-title,
  .user-name {
    font-size: 1rem;
  }

  .user-panel {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>