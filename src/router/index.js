import { createRouter, createWebHistory } from 'vue-router'

import { useAccessStore } from '../stores/access'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/',
      component: () => import('../components/AppShell.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../views/HomeView.vue'),
        },
        {
          path: 'admin/access',
          name: 'access-management',
          component: () => import('../views/AccessManagementView.vue'),
          meta: { featureId: 'access-management' },
        },
        {
          path: 'modules/:moduleId',
          name: 'module-placeholder',
          component: () => import('../views/ModulePlaceholderView.vue'),
          props: true,
          meta: { featureParam: 'moduleId' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const accessStore = useAccessStore()

  if (to.meta.requiresAuth && !accessStore.isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && accessStore.isAuthenticated) {
    return { name: 'home' }
  }

  if (to.meta.featureId && !accessStore.canAccessFeature(to.meta.featureId)) {
    return { name: 'home' }
  }

  if (to.meta.featureParam) {
    const featureId = String(to.params[to.meta.featureParam] ?? '')

    if (!accessStore.canAccessFeature(featureId)) {
      return { name: 'home' }
    }
  }

  return true
})

export default router
