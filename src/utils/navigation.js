export function goBackOrHome(router) {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }

  router.push({ name: 'home' })
}