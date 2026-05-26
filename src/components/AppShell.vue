<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import { useAccessStore } from '../stores/access'

const route = useRoute()
const router = useRouter()
const accessStore = useAccessStore()

const quickLinks = computed(() => {
  const links = [{ label: '工作台', to: { name: 'home' } }]

  if (accessStore.canAccessFeature('access-management')) {
    links.push({ label: '用户与权限', to: { name: 'access-management' } })
  }

  return links
})

const currentRoleLabel = computed(() => accessStore.activeRoles.map((role) => role.name).join(' / '))

function handleLogout() {
  accessStore.logout()
  router.push({ name: 'login' })
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

      <nav class="shell-nav" aria-label="Primary">
        <RouterLink
          v-for="link in quickLinks"
          :key="link.label"
          :to="link.to"
          class="shell-link"
          :class="{ 'is-active': route.name === link.to.name }"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <div class="user-panel">
        <div>
          <p class="user-name">{{ accessStore.activeUser?.name }}</p>
          <p class="user-role">{{ currentRoleLabel || '未分配角色' }}</p>
        </div>
        <button class="button button-ghost" type="button" @click="handleLogout">退出登录</button>
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
  padding: 24px;
}

.shell-header {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 20px 24px;
}

.brand-block {
  display: flex;
  gap: 16px;
  align-items: center;
}

.brand-mark {
  width: 52px;
  height: 52px;
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
  font-size: 0.82rem;
  color: var(--color-text-soft);
}

.shell-title,
.user-name {
  margin: 4px 0 0;
  font-size: 1.4rem;
  color: var(--color-text);
}

.shell-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.shell-link {
  padding: 10px 16px;
  border-radius: 6px;
  border: 1px solid transparent;
  color: var(--color-text-soft);
  transition: all 0.2s ease;
}

.shell-link:hover,
.shell-link.is-active {
  color: var(--color-text);
  border-color: rgba(10, 110, 209, 0.18);
  background: rgba(10, 110, 209, 0.08);
}

.user-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: flex-end;
}

.shell-main {
  margin-top: 20px;
}

@media (max-width: 980px) {
  .app-shell {
    padding: 16px;
  }

  .shell-header {
    grid-template-columns: 1fr;
  }

  .shell-nav {
    justify-content: flex-start;
  }

  .user-panel {
    justify-content: space-between;
  }
}
</style>