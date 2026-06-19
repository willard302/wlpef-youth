export const getRoleDestination = (role?: string | null): '/admin' | '/home' => {
  return role === 'admin' ? '/admin' : '/home'
}

export const isAdminRole = (role?: string | null): boolean => {
  return role === 'admin'
}
