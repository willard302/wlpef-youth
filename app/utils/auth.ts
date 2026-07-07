export const getRoleDestination = (role?: string | null): '/admin' | '/home' => {
  return role === 'admin' ? '/admin' : '/home'
}

export const isAdminRole = (role?: string | null): boolean => {
  return role === 'admin'
}

export const isRaffleManagerRole = (role?: string | null): boolean => {
  return role === 'admin' || role === 'raffle_staff'
}

export const canUseScannerRole = (role?: string | null): boolean => {
  return role === 'admin' || role === 'staff' || role === 'raffle_staff'
}
