<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAccessStore } from '../stores/access'

const route = useRoute()
const router = useRouter()
const accessStore = useAccessStore()

const loginForm = reactive({
  email: 'admin@mettlertoledo.com',
  password: 'Pass@123',
})

const feedback = ref('')
const ssoMessage = ref('')

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
  feedback.value = ''
}

function submitLogin() {
  const result = accessStore.login(loginForm)

  if (!result.ok) {
    feedback.value = result.message
    return
  }

  const redirectPath = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  router.push(redirectPath)
}

function showSsoMessage() {
  ssoMessage.value = 'Azure AD SSO 已预留入口，一期暂未接入。'
}
</script>

<template>
  <div class="login-page">
    <section class="login-hero surface-card">
      <p class="kicker">Enterprise Portal</p>
      <h1>专业设备点检系统</h1>
      <p class="hero-copy">
        以角色驱动的企业门户聚合设备管理、点检任务、维修工单与权限治理，一期先完成统一入口、登录与授权骨架。
      </p>

      <div class="hero-grid">
        <article class="hero-stat">
          <span>平台定位</span>
          <strong>Cloudflare Pages + D1</strong>
        </article>
        <article class="hero-stat">
          <span>体验目标</span>
          <strong>桌面端 / 移动端统一</strong>
        </article>
        <article class="hero-stat">
          <span>一期交付</span>
          <strong>登录 + 权限 + 门户</strong>
        </article>
      </div>
    </section>

    <section class="login-card surface-card">
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

        <div v-if="feedback" class="notice notice-error">{{ feedback }}</div>

        <button class="button" type="submit">邮箱登录</button>
        <button class="button button-secondary" type="button" @click="showSsoMessage">
          Azure AD SSO（预留）
        </button>

        <div v-if="ssoMessage" class="notice">{{ ssoMessage }}</div>
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
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(340px, 460px);
  gap: 24px;
  padding: 24px;
}

.login-hero,
.login-card {
  padding: 32px;
}

.login-hero {
  display: grid;
  align-content: space-between;
  background:
    linear-gradient(135deg, rgba(10, 110, 209, 0.08), rgba(0, 165, 138, 0.12)),
    rgba(255, 255, 255, 0.92);
}

.page-intro h2,
.login-hero h1 {
  margin: 8px 0 12px;
  font-size: clamp(2rem, 3vw, 3.3rem);
  line-height: 1.05;
  color: var(--color-text);
}

.page-intro p,
.hero-copy {
  margin: 0;
  line-height: 1.8;
  color: var(--color-text-soft);
}

.hero-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.hero-stat {
  padding: 18px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(10, 110, 209, 0.08);
}

.hero-stat span,
.demo-header span {
  display: block;
  font-size: 0.83rem;
  color: var(--color-text-soft);
}

.hero-stat strong {
  display: block;
  margin-top: 10px;
  font-size: 1rem;
  color: var(--color-text);
}

.login-card {
  display: grid;
  gap: 24px;
  align-content: start;
}

.login-form {
  display: grid;
  gap: 16px;
}

.demo-section {
  display: grid;
  gap: 14px;
}

.demo-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.demo-header h3 {
  margin: 0;
}

.demo-list {
  display: grid;
  gap: 12px;
}

.demo-chip {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  width: 100%;
  border: 1px solid rgba(10, 110, 209, 0.08);
  border-radius: 8px;
  padding: 14px 16px;
  background: rgba(248, 250, 252, 0.85);
  text-align: left;
}

.demo-chip strong {
  color: var(--color-text);
}

.demo-chip span {
  color: var(--color-text-soft);
  font-size: 0.88rem;
}

@media (max-width: 920px) {
  .login-page {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .login-hero,
  .login-card {
    padding: 24px;
  }

  .demo-chip {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>