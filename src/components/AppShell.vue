<script setup>
import QrScanner from 'qr-scanner'
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import { setLocale, SUPPORTED_LOCALES } from '../i18n'
import { useAccessStore } from '../stores/access'
import { useMessageToastStore } from '../stores/messageToast'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const accessStore = useAccessStore()
const toastStore = useMessageToastStore()
const isLoggingOut = ref(false)
const isScanModalOpen = ref(false)
const isStartingScan = ref(false)
const isHandlingScan = ref(false)
const scanVideoElement = ref(null)

let qrScanner = null

const localeOptions = SUPPORTED_LOCALES.map((value) => ({
  value,
  labelKey: `common.localeShort.${value}`,
}))

const currentRoleLabel = computed(() =>
  accessStore.activeRoles
    .map((role) => (role.nameKey ? t(role.nameKey) : role.name))
    .filter(Boolean)
    .join(' / '),
)
const canScanInspectionTasks = computed(() => accessStore.canAccessFeature('inspection-tasks'))
const showMobileScanButton = computed(() => route.name === 'home' && canScanInspectionTasks.value)

function parseEquipmentCodeFromQr(rawValue) {
  return String(rawValue ?? '').trim().toUpperCase()
}

function destroyScanner() {
  if (!qrScanner) {
    return
  }

  qrScanner.stop()
  qrScanner.destroy()
  qrScanner = null
}

function closeScanModal() {
  isScanModalOpen.value = false
  isHandlingScan.value = false
  destroyScanner()
}

async function handleScanResult(result) {
  if (isHandlingScan.value) {
    return
  }

  isHandlingScan.value = true

  const rawValue = typeof result === 'string' ? result : result?.data ?? ''
  const equipmentCode = parseEquipmentCodeFromQr(rawValue)

  if (!equipmentCode) {
    isHandlingScan.value = false
    toastStore.show(t('shell.scanErrors.invalidCode'), 'error')
    return
  }

  closeScanModal()

  await router.push({
    name: 'inspection-task-management',
    query: {
      createTask: '1',
      equipmentCode,
    },
  })
}

async function openScanModal() {
  if (isStartingScan.value) {
    return
  }

  isStartingScan.value = true
  isHandlingScan.value = false

  try {
    const hasCamera = await QrScanner.hasCamera()

    if (!hasCamera) {
      throw new Error(t('shell.scanErrors.noCamera'))
    }

    isScanModalOpen.value = true
    await nextTick()

    if (!scanVideoElement.value) {
      throw new Error(t('shell.scanErrors.openFailed'))
    }

    destroyScanner()
    qrScanner = new QrScanner(scanVideoElement.value, handleScanResult, {
      preferredCamera: 'environment',
      highlightScanRegion: true,
      highlightCodeOutline: true,
      returnDetailedScanResult: true,
    })

    await qrScanner.start()
  } catch (error) {
    closeScanModal()
    toastStore.show(error instanceof Error ? error.message : t('shell.scanErrors.openFailedGeneric'), 'error')
  } finally {
    isStartingScan.value = false
  }
}

function switchLocale(nextLocale) {
  setLocale(nextLocale)
}

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

onBeforeUnmount(() => {
  destroyScanner()
})
</script>

<template>
  <div class="app-shell">
    <header class="shell-header">
      <div class="shell-header__row">
        <div class="shell-brand">
          <RouterLink class="shell-home" :to="{ name: 'home' }" :aria-label="t('shell.home')">
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
          <div class="locale-switcher" :aria-label="t('common.localeLabel')">
            <button
              v-for="option in localeOptions"
              :key="option.value"
              class="locale-switcher__button"
              :class="{ 'locale-switcher__button--active': locale === option.value }"
              type="button"
              @click="switchLocale(option.value)"
            >
              {{ t(option.labelKey) }}
            </button>
          </div>
          <div class="user-summary">
            <p class="user-name">{{ accessStore.activeUser?.name }}</p>
            <p class="user-role">{{ currentRoleLabel || t('common.unassignedRole') }}</p>
          </div>
          <button
            v-if="showMobileScanButton"
            class="shell-scan"
            type="button"
            :disabled="isStartingScan"
            :aria-label="isStartingScan ? t('shell.startingScan') : t('shell.startScan')"
            @click="openScanModal"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 6V4.75C3 3.78 3.78 3 4.75 3H6"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.4"
              />
              <path
                d="M10 3h1.25C12.22 3 13 3.78 13 4.75V6"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.4"
              />
              <path
                d="M13 10v1.25c0 .97-.78 1.75-1.75 1.75H10"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.4"
              />
              <path
                d="M6 13H4.75C3.78 13 3 12.22 3 11.25V10"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.4"
              />
              <path
                d="M6 6h1.5v1.5H6zM8.5 8.5H10v1.5H8.5zM6 10h1.5v1.5H6zM8.5 6H10v1.5H8.5z"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.1"
              />
            </svg>
          </button>
          <button
            class="shell-signout"
            type="button"
            :disabled="isLoggingOut"
            :aria-label="isLoggingOut ? t('shell.signingOut') : t('shell.signOut')"
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
            <span class="shell-signout__label">{{ isLoggingOut ? t('shell.signingOutLabel') : t('shell.signOut') }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="shell-main">
      <RouterView />
    </main>

    <footer class="shell-footer">
      <p class="shell-footer__copy">{{ t('shell.footer') }}</p>
    </footer>

    <div v-if="isScanModalOpen" class="scan-modal" @click.self="closeScanModal">
      <section class="scan-modal__card">
        <div class="scan-modal__header">
          <div>
            <p class="scan-modal__kicker">{{ t('shell.scanKicker') }}</p>
            <h2 class="scan-modal__title">{{ t('shell.scanTitle') }}</h2>
          </div>
          <button class="shell-scan shell-scan--modal" type="button" :aria-label="t('shell.closeScan')" @click="closeScanModal">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.4"
              />
            </svg>
          </button>
        </div>
        <div class="scan-modal__viewport">
          <video ref="scanVideoElement" class="scan-modal__video" autoplay playsinline muted></video>
          <div class="scan-modal__frame" aria-hidden="true"></div>
        </div>
        <p class="scan-modal__hint">{{ t('shell.scanHint') }}</p>
      </section>
    </div>
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

.locale-switcher {
  display: inline-flex;
  align-items: center;
  padding: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.locale-switcher__button {
  min-width: 44px;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.78);
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.locale-switcher__button--active {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}
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

.shell-scan {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  min-width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.shell-scan:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.28);
}

.shell-scan:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.shell-scan svg {
  width: 16px;
  height: 16px;
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

.scan-modal {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(8, 16, 28, 0.78);
  backdrop-filter: blur(8px);
}

.scan-modal__card {
  width: min(460px, 100%);
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: #0f223c;
  color: #ffffff;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
}

.scan-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.scan-modal__kicker {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
}

.scan-modal__title {
  margin: 4px 0 0;
  font-size: 1.1rem;
}

.scan-modal__viewport {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  border-radius: 16px;
  background: #08131f;
}

.scan-modal__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scan-modal__frame {
  position: absolute;
  inset: 14%;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 20px;
  box-shadow: 0 0 0 999px rgba(8, 19, 31, 0.32);
}

.scan-modal__hint {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.8);
}

.shell-scan--modal {
  display: inline-flex;
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
  .shell-scan {
    display: inline-flex;
    width: 34px;
    min-width: 34px;
    height: 34px;
  }

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

  .scan-modal {
    padding: 10px;
  }

  .scan-modal__card {
    padding: 14px;
    border-radius: 16px;
  }
}
</style>