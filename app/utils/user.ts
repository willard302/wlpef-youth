import { ROLE_LABEL } from '~/types'

/**
 * 取得角色的顯示名稱
 * @param role 角色字串
 * @returns 顯示名稱 (如：管理員、一般成員、訪客)
 */
export const getRoleLabel = (role?: string | null): string => {
  if (!role) return '訪客'
  
  if (role === 'admin') return ROLE_LABEL.admin
  if (role === 'staff') return ROLE_LABEL.staff
  
  // 預設為一般成員
  return ROLE_LABEL.member
}
