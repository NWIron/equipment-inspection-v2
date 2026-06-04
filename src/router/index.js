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
          path: 'modules/equipment',
          name: 'equipment-management',
          component: () => import('../views/EquipmentManagementView.vue'),
          meta: { featureId: 'equipment' },
        },
        {
          path: 'modules/inspection-tasks',
          name: 'inspection-task-management',
          component: () => import('../views/InspectionTasksView.vue'),
          meta: { featureId: 'inspection-tasks' },
        },
        {
          path: 'modules/inspection-tasks/:taskId',
          name: 'inspection-task-execution',
          component: () => import('../views/InspectionTaskExecutionView.vue'),
          props: true,
          meta: { featureId: 'inspection-tasks' },
        },
        {
          path: 'modules/work-orders',
          name: 'work-order-management',
          component: () => import('../views/WorkOrdersView.vue'),
          meta: { featureId: 'work-orders' },
        },
        {
          path: 'modules/work-orders/:workOrderId',
          name: 'work-order-processing',
          component: () => import('../views/WorkOrderProcessingView.vue'),
          props: true,
          meta: { featureId: 'work-orders' },
        },
        {
          path: 'modules/data-analysis',
          name: 'data-analysis',
          component: () => import('../views/DataAnalysisView.vue'),
          meta: { featureId: 'data-analysis' },
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
