export const useSideMenu = () => {

  const menuVisible = useState<boolean>('side-menu-visible', () => false)

  const openMenu = () => { menuVisible.value = true }
  const closeMenu = () => { menuVisible.value = false }
  const toggleMenu = () => { menuVisible.value = !menuVisible.value }
  
  return {
    menuVisible,
    openMenu,
    closeMenu,
    toggleMenu
  }
}
