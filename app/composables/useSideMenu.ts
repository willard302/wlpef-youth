export const useSideMenu = () => {
  
  const router = useRouter()
  const menuVisible = ref(false)

  const openMenu = () => { menuVisible.value = true }
  const closeMenu = () => { menuVisible.value = false }
  const toggleMenu = () => { menuVisible.value = !menuVisible.value }
  const navigateToEditor = (date?: string) => {
    router.push({
      path: '/admin/events/editor',
      query: date ? { date } : undefined
    })
  }
  
  return {
    menuVisible,
    openMenu,
    closeMenu,
    toggleMenu,
    navigateToEditor
  }
}
