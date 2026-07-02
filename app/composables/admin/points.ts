import type { PointTransaction } from "~/types"
import { eventAdminService } from '~/services/eventAdmin.js'

export const useAdminPoints = () => {
  const { searchQuery } = useSearch()

  const itemsPerPage = 15
  const transactions = ref<PointTransaction[]>([])
  const isLoading = ref(true)
  const detailsDialogOpen = ref(false)
  const selectedTransaction = ref<PointTransaction | null>(null)
  const currentPage = ref(1)

  const fetchTransactions = async () => {
    try {
      isLoading.value = true
      transactions.value = await eventAdminService.fetchAllPointTransactions()
    } catch (error) {
      console.error('Failed to fetch transactions', error)
    } finally {
      isLoading.value = false
    }
  }

  const filteredTransactions = computed(() => {
    if (!searchQuery.value) return transactions.value
    const query = searchQuery.value.toLowerCase()
    return transactions.value.filter(tx => 
      tx.userName?.toLowerCase().includes(query) || 
      tx.userEmail?.toLowerCase().includes(query) ||
      tx.eventTitle?.toLowerCase().includes(query) ||
      tx.description?.toLowerCase().includes(query)
    )
  })

  const paginatedTransactions = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredTransactions.value.slice(start, end)
  })

  const openDetails = (tx: PointTransaction) => {
    selectedTransaction.value = tx
    detailsDialogOpen.value = true
  }

  return {
    transactions,
    isLoading,
    detailsDialogOpen,
    selectedTransaction,
    currentPage,
    itemsPerPage,
    filteredTransactions,
    paginatedTransactions,
    searchQuery,
    fetchTransactions,
    openDetails,
  }
}
