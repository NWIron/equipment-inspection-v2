<script setup>
import { computed, reactive, ref } from 'vue'

import { useAccessStore } from '../stores/access'

const accessStore = useAccessStore()

const userForm = reactive({
  accountName: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  roleIds: [],
})

const roleForm = reactive({
  name: '',
  description: '',
  featureIds: [],
})

const userFeedback = ref('')
const userFeedbackType = ref('success')
const roleFeedback = ref('')
const roleFeedbackType = ref('success')

const users = computed(() => accessStore.userDirectory)
const roles = computed(() => accessStore.roles)

const summaryCards = computed(() => [
  {
    label: '用户总数',
    value: accessStore.dashboardMetrics.totalUsers,
    detail: '包含启用与禁用账号',
  },
  {
    label: '角色数量',
    value: accessStore.dashboardMetrics.totalRoles,
    detail: '含系统种子角色与自定义角色',
  },
  {
    label: '功能卡片',
    value: accessStore.dashboardMetrics.totalCards,
    detail: '角色可组合分配多个入口',
  },
])

function resetUserForm() {
  userForm.accountName = ''
  userForm.name = ''
  userForm.email = ''
  userForm.phone = ''
  userForm.password = ''
  userForm.roleIds = []
}

function resetRoleForm() {
  roleForm.name = ''
  roleForm.description = ''
  roleForm.featureIds = []
}

function setUserFeedback(result) {
  userFeedback.value = result.message
  userFeedbackType.value = result.ok ? 'success' : 'error'
}

function setRoleFeedback(result) {
  roleFeedback.value = result.message
  roleFeedbackType.value = result.ok ? 'success' : 'error'
}

function submitUser() {
  const result = accessStore.createUser(userForm)
  setUserFeedback(result)

  if (result.ok) {
    resetUserForm()
  }
}

function toggleUser(userId) {
  setUserFeedback(accessStore.toggleUserStatus(userId))
}

function removeUser(userId) {
  setUserFeedback(accessStore.deleteUser(userId))
}

function submitRole() {
  const result = accessStore.createRole(roleForm)
  setRoleFeedback(result)

  if (result.ok) {
    resetRoleForm()
  }
}

function removeRole(roleId) {
  setRoleFeedback(accessStore.deleteRole(roleId))
}
</script>

<template>
  <div class="page">
    <section class="surface-card section-card">
      <div class="page-header">
        <div>
          <p class="kicker">Access Control</p>
          <h2 class="page-title">用户与权限管理</h2>
          <p class="page-subtitle">
            维护用户主数据与角色，功能卡片权限按角色聚合，一个用户可分配多个角色。
          </p>
        </div>
        <div class="tag-row">
          <span class="tag">用户主数据</span>
          <span class="tag">角色管理</span>
          <span class="tag">卡片授权</span>
        </div>
      </div>

      <div class="metric-grid">
        <article v-for="card in summaryCards" :key="card.label" class="metric-card">
          <span class="metric-label">{{ card.label }}</span>
          <strong class="metric-value">{{ card.value }}</strong>
          <p class="metric-detail">{{ card.detail }}</p>
        </article>
      </div>
    </section>

    <section class="split-layout">
      <article class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Users</p>
            <h3 class="section-title">创建用户</h3>
          </div>
          <span class="status-pill">支持多角色</span>
        </div>

        <div v-if="userFeedback" class="notice" :class="`notice-${userFeedbackType}`">
          {{ userFeedback }}
        </div>

        <form class="form-grid" @submit.prevent="submitUser">
          <label>
            <span>账号名</span>
            <input v-model="userForm.accountName" type="text" placeholder="例如 inspector.wu" />
          </label>

          <label>
            <span>姓名</span>
            <input v-model="userForm.name" type="text" placeholder="请输入姓名" />
          </label>

          <label>
            <span>邮箱</span>
            <input v-model="userForm.email" type="email" placeholder="name@example.com" />
          </label>

          <label>
            <span>手机号</span>
            <input v-model="userForm.phone" type="tel" placeholder="请输入手机号" />
          </label>

          <label>
            <span>密码</span>
            <input v-model="userForm.password" type="password" placeholder="至少 6 位" />
          </label>

          <fieldset class="selection-fieldset">
            <legend>角色分配</legend>
            <div class="checkbox-grid">
              <label v-for="role in roles" :key="role.id" class="choice-chip">
                <input v-model="userForm.roleIds" type="checkbox" :value="role.id" />
                <span>{{ role.name }}</span>
              </label>
            </div>
          </fieldset>

          <button class="button" type="submit">创建用户</button>
        </form>
      </article>

      <article class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">User Directory</p>
            <h3 class="section-title">用户列表</h3>
          </div>
          <span class="status-pill">{{ users.length }} 个账号</span>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>账号</th>
                <th>姓名</th>
                <th>联系方式</th>
                <th>角色</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  <strong>{{ user.accountName }}</strong>
                  <div class="table-subline">{{ user.email }}</div>
                </td>
                <td>{{ user.name }}</td>
                <td>{{ user.phone }}</td>
                <td>
                  <div class="tag-row compact-tags">
                    <span v-for="role in user.roles" :key="role.id" class="tag">{{ role.name }}</span>
                  </div>
                </td>
                <td>
                  <span class="status-pill" :class="user.disabled ? 'status-danger' : 'status-success'">
                    {{ user.disabled ? '禁用' : '启用' }}
                  </span>
                </td>
                <td>
                  <div class="action-row">
                    <button class="button button-ghost" type="button" @click="toggleUser(user.id)">
                      {{ user.disabled ? '启用' : '禁用' }}
                    </button>
                    <button class="button button-danger" type="button" @click="removeUser(user.id)">
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section class="split-layout">
      <article class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Roles</p>
            <h3 class="section-title">创建角色</h3>
          </div>
          <span class="status-pill">按卡片授权</span>
        </div>

        <div v-if="roleFeedback" class="notice" :class="`notice-${roleFeedbackType}`">
          {{ roleFeedback }}
        </div>

        <form class="form-grid" @submit.prevent="submitRole">
          <label>
            <span>角色名称</span>
            <input v-model="roleForm.name" type="text" placeholder="例如 班组长" />
          </label>

          <label>
            <span>角色说明</span>
            <textarea
              v-model="roleForm.description"
              rows="4"
              placeholder="简述角色职责与适用范围"
            ></textarea>
          </label>

          <fieldset class="selection-fieldset">
            <legend>可使用的功能卡片</legend>
            <div class="checkbox-grid">
              <label
                v-for="feature in accessStore.featureCatalog"
                :key="feature.id"
                class="choice-chip"
              >
                <input v-model="roleForm.featureIds" type="checkbox" :value="feature.id" />
                <span>{{ feature.title }}</span>
              </label>
            </div>
          </fieldset>

          <button class="button" type="submit">创建角色</button>
        </form>
      </article>

      <article class="surface-card section-card">
        <div class="section-headline">
          <div>
            <p class="kicker">Role Catalog</p>
            <h3 class="section-title">角色列表</h3>
          </div>
          <span class="status-pill">系统角色不可删除</span>
        </div>

        <div class="role-list">
          <article v-for="role in roles" :key="role.id" class="role-item">
            <div class="role-item__header">
              <div>
                <h4>{{ role.name }}</h4>
                <p>{{ role.description || '未填写角色说明。' }}</p>
              </div>
              <div class="action-row">
                <span v-if="role.isSystem" class="status-pill">系统种子</span>
                <button
                  v-else
                  class="button button-danger"
                  type="button"
                  @click="removeRole(role.id)"
                >
                  删除角色
                </button>
              </div>
            </div>

            <div class="tag-row compact-tags">
              <span
                v-for="featureId in role.featureIds"
                :key="featureId"
                class="tag"
              >
                {{ accessStore.getFeatureById(featureId)?.title || featureId }}
              </span>
            </div>
          </article>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.section-card {
  padding: 24px;
}

.section-headline {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
}

.section-title {
  margin: 4px 0 0;
  font-size: 1.3rem;
  color: var(--color-text);
}

.table-subline,
.role-item p {
  margin-top: 6px;
  color: var(--color-text-soft);
  font-size: 0.88rem;
}

.compact-tags {
  gap: 8px;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-list {
  display: grid;
  gap: 14px;
}

.role-item {
  padding: 18px;
  border: 1px solid rgba(10, 110, 209, 0.08);
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.76);
}

.role-item__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.role-item__header h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text);
}

@media (max-width: 720px) {
  .section-headline,
  .role-item__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>