import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

export const useCustomerStore = defineStore('customers', {
  state: () => ({
    customers: [],
    currentCustomer: null,
    loading: false,
    saving: false,
    search: '',
    bairroFilter: '',
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 15,
      hasNextPage: false,
      hasPrevPage: false
    }
  }),

  getters: {
    totalCustomers: (state) => state.pagination.totalItems || state.customers.length,
    hasCustomers: (state) => state.customers.length > 0,
    customerById: (state) => (id) => state.customers.find(c => c.id === id),
    customerByAccount: (state) => (accountNumber) => state.customers.find(c => String(c.accountNumber) === String(accountNumber))
  },

  actions: {
    async fetchCustomers(companyId, params = {}) {
      this.loading = true
      try {
        const { data } = await api.get(`/api/customers/${companyId}`, {
          params: {
            page: params.page || 1,
            limit: params.limit || 15,
            search: params.search || '',
            bairro: params.bairro || ''
          }
        })
        if (data.success) {
          this.customers = data.result
          this.pagination = data.pagination
        }
      } catch (error) {
        console.error('Erro ao buscar mutuários:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchCustomerByAccount(accountNumber) {
      this.loading = true
      try {
        const { data } = await api.get(`/api/customer/${accountNumber}`)
        if (data.success) {
          this.currentCustomer = data.result
          return data.result
        }
        return null
      } catch (error) {
        console.error('Erro ao buscar mutuário:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async createCustomer(customerData) {
      this.saving = true
      try {
        const { data } = await api.post('/api/customer', customerData)
        return data
      } catch (error) {
        console.error('Erro ao criar mutuário:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async updateCustomer(id, customerData) {
      this.saving = true
      try {
        const { data } = await api.put(`/api/customer/${id}`, customerData)
        return data
      } catch (error) {
        console.error('Erro ao atualizar mutuário:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async deleteCustomer(id) {
      this.saving = true
      try {
        const { data } = await api.delete(`/api/customer/${id}`)
        return data
      } catch (error) {
        console.error('Erro ao eliminar mutuário:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async bulkCreateCustomers(companyId, customers) {
      this.saving = true
      try {
        const { data } = await api.post('/api/customer/bulk', { companyId, customers })
        return data
      } catch (error) {
        console.error('Erro ao cadastrar mutuários em massa:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    async searchCustomers(query) {
      this.loading = true
      try {
        const { data } = await api.get(`/api/searchCustomers/${encodeURIComponent(query)}`)
        if (data.success) {
          this.customers = data.result
        }
      } catch (error) {
        console.error('Erro ao pesquisar mutuários:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    clearCurrentCustomer() {
      this.currentCustomer = null
    },

    setPage(page) {
      this.pagination.currentPage = page
    }
  }
})
