<script setup>
import { computed, reactive, ref } from 'vue'

import { useAccessStore } from '../stores/access'

const accessStore = useAccessStore()
const activeTab = ref('users')
const isUserModalOpen = ref(false)
const isRoleModalOpen = ref(false)
const editingUserId = ref('')

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
const isSavingUser = ref(false)
const isSavingRole = ref(false)

const users = computed(() => accessStore.userDirectory)
const roles = computed(() => accessStore.roles)
const isEditingUser = computed(() => Boolean(editingUserId.value))
const userModalTitle = computed(() => (isEditingUser.value ? '编辑用户' : '创建用户'))
const userSubmitLabel = computed(() => {
  if (isSavingUser.value) {
    return isEditingUser.value ? '保存中...' : '创建中...'
  }

  return isEditingUser.value ? '保存修改' : '创建用户'
})

function openUserModal() {
  userFeedback.value = ''
  editingUserId.value = ''
  isUserModalOpen.value = true
}

function openUserEditModal(user) {
  editingUserId.value = user.id
  userForm.accountName = user.accountName
  userForm.name = user.name
  userForm.email = user.email
  userForm.phone = user.phone
  userForm.password = ''
  userForm.roleIds = [...user.roleIds]
  userFeedback.value = ''
  isUserModalOpen.value = true
}

function closeUserModal() {
  isUserModalOpen.value = false
  editingUserId.value = ''
  resetUserForm()
  userFeedback.value = ''
}

function openRoleModal() {
  roleFeedback.value = ''
  isRoleModalOpen.value = true
}

function closeRoleModal() {
  isRoleModalOpen.value = false
  resetRoleForm()
  roleFeedback.value = ''
}

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

async function submitUser() {
  isSavingUser.value = true
  const result = isEditingUser.value
    ? await accessStore.updateUser(editingUserId.value, {
        accountName: userForm.accountName,
        name: userForm.name,
        email: userForm.email,
        phone: userForm.phone,
        roleIds: userForm.roleIds,
      })
    : await accessStore.createUser(userForm)
  isSavingUser.value = false
  setUserFeedback(result)

  if (result.ok) {
    closeUserModal()
  }
}

async function toggleUser(userId) {
  setUserFeedback(await accessStore.toggleUserStatus(userId))
}

async function removeUser(userId) {
  setUserFeedback(await accessStore.deleteUser(userId))
}

async function submitRole() {
  isSavingRole.value = true
  const result = await accessStore.createRole(roleForm)
  isSavingRole.value = false
  setRoleFeedback(result)

  if (result.ok) {
    closeRoleModal()
  }
}

async function removeRole(roleId) {
  setRoleFeedback(await accessStore.deleteRole(roleId))
}
</script>

<template>
  <div class="page">
    <div class="page-header access-header">
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

    <section class="surface-card section-card tab-card">
      <div class="tab-bar" role="tablist" aria-label="Access management tabs">
        <button
          class="tab-button"
          :class="{ 'is-active': activeTab === 'users' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'users'"
          @click="activeTab = 'users'"
        >
          用户列表
        </button>
        <button
          class="tab-button"
          :class="{ 'is-active': activeTab === 'roles' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'roles'"
          @click="activeTab = 'roles'"
        >
          角色列表
        </button>
      </div>

      <div v-if="activeTab === 'users'" class="tab-panel" role="tabpanel">
        <div class="section-headline">
          <div>
            <p class="kicker">User Directory</p>
            <h3 class="section-title">用户列表</h3>
          </div>
          <div class="action-row">
            <span class="status-pill">{{ users.length }} 个账号</span>
            <button class="button" type="button" @click="openUserModal">创建用户</button>
          </div>
        </div>

        <div v-if="userFeedback" class="notice" :class="`notice-${userFeedbackType}`">
          {{ userFeedback }}
        </div>

        <div class="user-list">
          <article v-for="user in users" :key="user.id" class="user-item">
            <div class="user-item__header">
              <div>
                <h4>{{ user.name }}</h4>
                <p>{{ user.accountName }} · {{ user.email }}</p>
              </div>
              <div class="action-row">
                <span class="status-pill" :class="user.disabled ? 'status-danger' : 'status-success'">
                  {{ user.disabled ? '禁用' : '启用' }}
                </span>
                <button class="button button-ghost" type="button" @click="openUserEditModal(user)">
                  编辑
                </button>
                <button class="button button-ghost" type="button" @click="toggleUser(user.id)">
                  {{ user.disabled ? '启用' : '禁用' }}
                </button>
                <button class="button button-danger" type="button" @click="removeUser(user.id)">
                  删除
                </button>
              </div>
            </div>

            <div class="user-item__meta">
              <div class="user-meta-block">
                <span class="user-meta-label">手机号</span>
                <strong>{{ user.phone }}</strong>
              </div>
              <div class="user-meta-block">
                <span class="user-meta-label">最近登录</span>
                <strong>{{ user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '未登录' }}</strong>
              </div>
            </div>

            <div class="tag-row compact-tags">
              <span v-for="role in user.roles" :key="role.id" class="tag">{{ role.name }}</span>
            </div>
          </article>
        </div>
      </div>

      <div v-else class="tab-panel" role="tabpanel">
        <div class="section-headline">
          <div>
            <p class="kicker">Role Catalog</p>
            <h3 class="section-title">角色列表</h3>
          </div>
          <div class="action-row">
            <span class="status-pill">系统角色不可删除</span>
            <button class="button" type="button" @click="openRoleModal">创建角色</button>
          </div>
        </div>

        <div v-if="roleFeedback" class="notice" :class="`notice-${roleFeedbackType}`">
          {{ roleFeedback }}
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
              <span v-for="featureId in role.featureIds" :key="featureId" class="tag">
                {{ accessStore.getFeatureById(featureId)?.title || featureId }}
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <div v-if="isUserModalOpen" class="modal-overlay" @click.self="closeUserModal">
      <section class="surface-card modal-card">
        <div class="section-headline modal-headline">
          <div>
            <p class="kicker">Users</p>
            <h3 class="section-title">{{ userModalTitle }}</h3>
          </div>
          <button class="button button-ghost" type="button" @click="closeUserModal">关闭</button>
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
            <input
              v-model="userForm.password"
              type="password"
              :placeholder="isEditingUser ? '编辑主数据时无需修改密码' : '至少 6 位'"
              :disabled="isEditingUser"
            />
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

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeUserModal">取消</button>
            <button class="button" type="submit" :disabled="isSavingUser">{{ userSubmitLabel }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isRoleModalOpen" class="modal-overlay" @click.self="closeRoleModal">
      <section class="surface-card modal-card">
        <div class="section-headline modal-headline">
          <div>
            <p class="kicker">Roles</p>
            <h3 class="section-title">创建角色</h3>
          </div>
          <button class="button button-ghost" type="button" @click="closeRoleModal">关闭</button>
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
              <label v-for="feature in accessStore.featureCatalog" :key="feature.id" class="choice-chip">
                <input v-model="roleForm.featureIds" type="checkbox" :value="feature.id" />
                <span>{{ feature.title }}</span>
              </label>
            </div>
          </fieldset>

          <div class="modal-actions">
            <button class="button button-ghost" type="button" @click="closeRoleModal">取消</button>
            <button class="button" type="submit" :disabled="isSavingRole">
              {{ isSavingRole ? '创建中...' : '创建角色' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.section-card {
  padding: 18px;
}

.access-header {
  align-items: center;
  gap: 12px;
}

.tab-card {
  display: grid;
  gap: 14px;
}

.tab-bar {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 4px;
  border-radius: 10px;
  background: rgba(18, 50, 74, 0.05);
}

.tab-button {
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-soft);
  font-weight: 600;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.tab-button.is-active {
  border-color: rgba(10, 110, 209, 0.1);
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-text);
  box-shadow: 0 6px 16px rgba(18, 50, 74, 0.08);
}

.tab-panel {
  display: grid;
  gap: 12px;
}

.section-headline {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.section-title {
  margin: 4px 0 0;
  font-size: 1.12rem;
  color: var(--color-text);
}

.table-subline,
.role-item p {
  margin-top: 4px;
  color: var(--color-text-soft);
  font-size: 0.8rem;
}

.user-list,
.role-list {
  display: grid;
  gap: 10px;
}

.user-item,
.role-item {
  padding: 14px;
  border: 1px solid rgba(10, 110, 209, 0.08);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.76);
}

.user-item__header,
.role-item__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.user-item__header h4,
.role-item__header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text);
}

.user-item__header p {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--color-text-soft);
}

.user-item__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.user-meta-block {
  display: grid;
  gap: 4px;
}

.user-meta-label {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.compact-tags {
  gap: 8px;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(18, 50, 74, 0.28);
}

.modal-card {
  width: min(720px, 100%);
  max-height: min(88vh, 860px);
  overflow: auto;
  padding: 18px;
}

.modal-headline {
  margin-bottom: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 720px) {
  .tab-bar,
  .user-item__header,
  .section-headline,
  .role-item__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .modal-overlay {
    padding: 10px;
  }

  .modal-card {
    padding: 14px;
  }
}
</style>