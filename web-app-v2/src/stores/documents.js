import { defineStore } from 'pinia'
import { api } from '@/boot/axios'

export const useDocumentsStore = defineStore('documents', {
  state: () => ({
    documents: [],
    loading: false,
    saving: false,
    uploading: false,
    uploadProgress: 0
  }),

  getters: {
    hasDocuments: (state) => state.documents.length > 0,
    documentCount: (state) => state.documents.length
  },

  actions: {
    async fetchDocuments(accountNumber) {
      this.loading = true
      try {
        const { data } = await api.get(`/api/document/${accountNumber}`)
        if (data.success) {
          this.documents = Array.isArray(data.result) ? data.result : []
        } else {
          this.documents = []
        }
      } catch (error) {
        console.error('Erro ao buscar documentos:', error)
        this.documents = []
      } finally {
        this.loading = false
      }
    },

    async uploadDocument(formData, onProgress) {
      this.uploading = true
      this.uploadProgress = 0
      try {
        const { data } = await api.post('/api/document', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            this.uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            if (onProgress) onProgress(this.uploadProgress)
          }
        })
        return data
      } catch (error) {
        console.error('Erro ao upload documento:', error)
        throw error
      } finally {
        this.uploading = false
        this.uploadProgress = 0
      }
    },

    async deleteDocument(id) {
      this.saving = true
      try {
        const { data } = await api.delete(`/api/document/${id}`)
        return data
      } catch (error) {
        console.error('Erro ao eliminar documento:', error)
        throw error
      } finally {
        this.saving = false
      }
    },

    clearDocuments() {
      this.documents = []
    }
  }
})
