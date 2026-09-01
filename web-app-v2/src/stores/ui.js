import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    isDark: false,
    sidebarCollapsed: false,
    sidebarStyle: 'expanded',
    primaryColor: '#16a34a',
    notifications: [],
    _themeVersion: 0
  }),

  getters: {
    theme: (state) => state.isDark ? 'dark' : 'light'
  },

  actions: {
    toggleDark() {
      this.isDark = !this.isDark
      this._themeVersion++
    },

    setTheme(dark) {
      this.isDark = dark
      this._themeVersion++
    },

    setDark(dark) {
      this.setTheme(dark)
    },

    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    setSidebarStyle(style) {
      this.sidebarStyle = style
    },

    setPrimaryColor(color) {
      this.primaryColor = color
    },

    addNotification(notification) {
      this.notifications.unshift({
        id: Date.now(),
        ...notification,
        createdAt: new Date(),
        read: false
      })
    },

    markAsRead(id) {
      const notif = this.notifications.find(n => n.id === id)
      if (notif) notif.read = true
    },

    markAllAsRead() {
      this.notifications.forEach(n => n.read = true)
    },

    clearNotifications() {
      this.notifications = []
    }
  },

  persist: {
    paths: ['isDark', 'sidebarCollapsed', 'sidebarStyle', 'primaryColor']
  }
})
