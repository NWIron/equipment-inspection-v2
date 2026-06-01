<script setup>
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'

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
    <header class="shell-header">
      <div class="shell-header__row">
        <div class="shell-brand">
          <RouterLink class="shell-home" :to="{ name: 'home' }" aria-label="主页">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M2.75 6.75L8 2.5l5.25 4.25"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.4"
              />
              <path
                d="M4.25 6.25v6.25h7.5V6.25"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.4"
              />
              <path
                d="M6.5 12.5V9.25h3V12.5"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.4"
              />
            </svg>
          </RouterLink>
          <div>
            <h1 class="shell-title">METTLER TOLEDO</h1>
          </div>
        </div>

        <div class="user-panel">
          <div class="user-summary">
            <p class="user-name">{{ accessStore.activeUser?.name }}</p>
            <p class="user-role">{{ currentRoleLabel || '未分配角色' }}</p>
          </div>
          <button
            class="shell-signout"
            type="button"
            :disabled="isLoggingOut"
            :aria-label="isLoggingOut ? '退出中' : '退出登录'"
            @click="handleLogout"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M6 3.75H4.75A1.75 1.75 0 003 5.5v5A1.75 1.75 0 004.75 12.25H6"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.4"
              />
              <path
                d="M8.5 5.25L11.25 8 8.5 10.75"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.4"
              />
              <path
                d="M11 8H6"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.4"
              />
            </svg>
            <span class="shell-signout__label">{{ isLoggingOut ? '退出中...' : '退出登录' }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="shell-main">
      <RouterView />
    </main>

    <footer class="shell-footer">
      <p class="shell-footer__copy">© 2026 METTLER TOLEDO, Inc.</p>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: linear-gradient(180deg, #f6f8fa 0%, #eef2f6 100%);
}

.shell-header {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(0, 35, 75, 0.96) 0,
      rgba(0, 35, 75, 0.96) 2px,
      rgba(255, 255, 255, 0.08) 2px,
      rgba(255, 255, 255, 0.08) 4px
    ),
    linear-gradient(180deg, rgba(17, 48, 90, 0.96) 0%, rgba(8, 29, 56, 0.94) 100%);
  backdrop-filter: blur(10px);
}

.shell-header__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 60px;
  padding: 10px 18px;
}

.shell-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.shell-home {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.shell-home:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.28);
}

.shell-home svg {
  width: 16px;
  height: 16px;
}

.shell-title,
.user-name {
  margin: 0;
  font-size: 1rem;
  color: #ffffff;
}

.user-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
  flex-shrink: 0;
}

.user-summary {
  text-align: right;
}

.user-role {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.76);
}

.shell-signout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font-weight: 600;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.shell-signout:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.28);
}

.shell-signout:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.shell-signout svg {
  width: 15px;
  height: 15px;
}

.shell-signout__label {
  white-space: nowrap;
}

.shell-main {
  flex: 1;
  padding: 16px 18px 18px;
}

.shell-footer {
  padding: 0 18px 18px;
}

.shell-footer__copy {
  margin: 0;
  color: #5f6b7a;
  font-size: 0.78rem;
  text-align: center;
}

@media (max-width: 980px) {
  .shell-header__row {
    padding: 10px 12px;
  }

  .user-panel {
    min-width: 0;
  }

  .shell-main {
    padding: 12px;
  }

  .shell-footer {
    padding: 0 12px 12px;
  }
}

@media (max-width: 640px) {
  .shell-home {
    width: 32px;
    height: 32px;
  }

  .shell-title,
  .user-name {
    font-size: 0.94rem;
  }

  .user-panel {
    gap: 8px;
  }

  .user-summary {
    display: none;
  }

  .shell-header__row {
    min-height: 52px;
    padding: 8px 10px;
  }

  .shell-main {
    padding: 10px;
  }

  .shell-footer {
    padding: 0 10px 10px;
  }

  .shell-signout {
    width: 34px;
    min-width: 34px;
    height: 34px;
    padding: 0;
  }

  .shell-signout__label {
    display: none;
  }
}
</style>