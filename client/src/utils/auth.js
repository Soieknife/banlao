export const AUTHENTICATED_STORAGE_KEY = 'isAuthenticated'

export const clearAuthStorage = (chatStore = null) => {
  uni.removeStorageSync(AUTHENTICATED_STORAGE_KEY)
  uni.removeStorageSync('token')
  uni.removeStorageSync('user')
  uni.removeStorageSync('userId')
  uni.removeStorageSync('userRole')

  if (chatStore && typeof chatStore.clear === 'function') {
    chatStore.clear()
  }
}

export const saveAuthSession = (token, user) => {
  if (!token || !user?.id || !user?.role) return
  uni.setStorageSync(AUTHENTICATED_STORAGE_KEY, '1')
  uni.setStorageSync('token', token)
  uni.setStorageSync('user', JSON.stringify(user))
  uni.setStorageSync('userId', user.id)
  uni.setStorageSync('userRole', user.role)
}

export const getHomePageByRole = (role) => {
  return role === 'admin' ? '/pages/admin/index' : '/pages/index/index'
}
