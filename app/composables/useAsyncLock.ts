type AsyncFn<TArgs extends any[], TResult> = (...args: TArgs) => Promise<TResult>

/**
 * Single-flight guard for async actions.
 * Repeated calls while a request is in flight will reuse the same promise.
 */
export function useAsyncLock<TArgs extends any[], TResult>(fn: AsyncFn<TArgs, TResult>) {
  const inFlight = ref<Promise<TResult> | null>(null)
  const isLocked = computed(() => inFlight.value !== null)

  const run = (...args: TArgs) => {
    if (inFlight.value) return inFlight.value

    const request = Promise.resolve()
      .then(() => fn(...args))
      .finally(() => {
        inFlight.value = null
      })

    inFlight.value = request
    return request
  }

  const reset = () => {
    inFlight.value = null
  }

  return {
    isLocked,
    run,
    reset
  }
}
