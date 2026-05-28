<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAccessStore } from '../stores/access'
import { useMessageToastStore } from '../stores/messageToast'

const route = useRoute()
const router = useRouter()
const accessStore = useAccessStore()
const toastStore = useMessageToastStore()

const loginForm = reactive({
  email: 'admin@mettlertoledo.com',
  password: 'Pass@123',
})

const isSubmitting = ref(false)

const demoAccounts = [
  {
    label: '管理员',
    email: 'admin@mettlertoledo.com',
    password: 'Pass@123',
  },
  {
    label: '点检员',
    email: 'inspector@mettlertoledo.com',
    password: 'Pass@123',
  },
  {
    label: '设备工程师',
    email: 'engineer@mettlertoledo.com',
    password: 'Pass@123',
  },
]

function useDemoAccount(account) {
  loginForm.email = account.email
  loginForm.password = account.password
}

async function submitLogin() {
  isSubmitting.value = true
  const result = await accessStore.login(loginForm)
  isSubmitting.value = false

  if (!result.ok) {
    toastStore.show(result.message, 'error')
    return
  }

  const redirectPath = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  router.push(redirectPath)
}

function showSsoMessage() {
  toastStore.show('Azure AD SSO 已预留入口，一期暂未接入。', 'info')
}

onMounted(() => {
  if (accessStore.initializeError) {
    toastStore.show(accessStore.initializeError, 'error')
  }
})
</script>

<template>
  <div class="login-page">
    <section class="login-card">
      <div class="login-brand">
        <div class="login-brand__mark">EI</div>
        <p class="login-brand__label">Equipment Inspection</p>
      </div>

      <div class="page-intro">
        <p class="kicker">Sign In</p>
        <h2>登录系统</h2>
        <p>使用邮箱和密码登录，系统会根据角色自动显示可访问的功能卡片。</p>
      </div>

      <form class="login-form" @submit.prevent="submitLogin">
        <label>
          <span>邮箱</span>
          <input v-model="loginForm.email" type="email" placeholder="name@example.com" />
        </label>

        <label>
          <span>密码</span>
          <input v-model="loginForm.password" type="password" placeholder="请输入密码" />
        </label>

        <button class="button login-submit" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? '登录中...' : '邮箱登录' }}
        </button>
        <button class="button button-secondary login-sso" type="button" @click="showSsoMessage">
          Azure AD SSO（预留）
        </button>
      </form>

      <div class="demo-section">
        <div class="demo-header">
          <h3>演示账号</h3>
          <span>点击即可填充</span>
        </div>

        <div class="demo-list">
          <button
            v-for="account in demoAccounts"
            :key="account.email"
            class="demo-chip"
            type="button"
            @click="useDemoAccount(account)"
          >
            <strong>{{ account.label }}</strong>
            <span>{{ account.email }}</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(0, 35, 75, 0.96) 0,
      rgba(0, 35, 75, 0.96) 2px,
      rgba(255, 255, 255, 0.08) 2px,
      rgba(255, 255, 255, 0.08) 4px
    ),
    linear-gradient(180deg, rgba(17, 48, 90, 0.96) 0%, rgba(8, 29, 56, 0.94) 100%);
}

.login-card {
  display: grid;
  gap: 18px;
  width: min(420px, 100%);
  padding: 24px;
  background: #ffffff;
  border: 1px solid #d0d7de;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(31, 35, 40, 0.06);
}

.login-brand {
  display: grid;
  justify-items: center;
  gap: 10px;
}

.login-brand__mark {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #24292f;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.login-brand__label {
  margin: 0;
  color: #57606a;
  font-size: 0.84rem;
  font-weight: 600;
}

.page-intro {
  text-align: center;
}

.page-intro .kicker {
  color: #57606a;
}

.page-intro h2 {
  margin: 6px 0 10px;
  font-size: 1.65rem;
  line-height: 1.1;
  color: #24292f;
}

.page-intro p {
  margin: 0;
  line-height: 1.55;
  color: #57606a;
}

.login-form {
  display: grid;
  gap: 14px;
}

.login-form label {
  gap: 6px;
}

.login-form label span {
  color: #24292f;
  font-size: 0.86rem;
}

.login-form input {
  border-radius: 8px;
  border: 1px solid #d0d7de;
  background: #ffffff;
  color: #24292f;
}

.login-form input:focus {
  border-color: #0969da;
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
}

.login-submit {
  background: #2da44e;
  border: 1px solid #2a9147;
  color: #ffffff;
}

.login-submit:hover {
  background: #2c974b;
  border-color: #2c974b;
}

.login-sso {
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  color: #24292f;
}

.login-sso:hover {
  background: #f3f4f6;
  border-color: #c7d0d9;
}

.demo-section {
  display: grid;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid #d8dee4;
}

.demo-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.demo-header h3 {
  margin: 0;
  font-size: 0.96rem;
  color: #24292f;
}

.demo-header span {
  display: block;
  font-size: 0.78rem;
  color: #57606a;
}

.demo-list {
  display: grid;
  gap: 8px;
}

.demo-chip {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  width: 100%;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 10px 12px;
  background: #ffffff;
  text-align: left;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.demo-chip:hover {
  background: #f6f8fa;
  border-color: #c7d0d9;
}

.demo-chip strong {
  color: #24292f;
}

.demo-chip span {
  color: #57606a;
  font-size: 0.8rem;
}

@media (max-width: 640px) {
  .login-page {
    padding: 16px 12px;
  }

  .login-card {
    padding: 20px 18px;
  }

  .demo-chip {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>