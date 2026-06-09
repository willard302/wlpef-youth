import type { Toast } from "~/types"


export function useToast() {
  // useState 確保 SSR 安全且跨組件共用同一份狀態
  const toasts = useState<Toast[]>('app:toasts', () => [])

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
    const id = Date.now().toString()
    const toast: Toast = { id, message, type, duration }

    toasts.value.push(toast)

    // 自動移除
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }

    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const success = (message: string, duration = 3000) => addToast(message, 'success', duration)
  const error = (message: string, duration = 5000) => addToast(message, 'error', duration)
  const info = (message: string, duration = 3000) => addToast(message, 'info', duration)

  return {
    toasts: readonly(toasts),
    addToast,
    removeToast,
    success,
    error,
    info,
  }
}
