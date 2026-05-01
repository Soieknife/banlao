import { request } from './request'
import { clearAuthStorage, saveAuthSession, getHomePageByRole } from './auth'

const getCurrentRoute = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const currentPage = pages[pages.length - 1]
  return currentPage?.route ? `/${currentPage.route}` : ''
}

export const syncSessionWithServer = async (chatStore, options = {}) => {
  const {
    redirectToHomeWhenAuthenticated = false,
    redirectToLoginWhenUnauthenticated = true
  } = options

  const token = uni.getStorageSync('token')
  const userId = uni.getStorageSync('userId')

  if (!token || !userId) {
    clearAuthStorage(chatStore)
    if (redirectToLoginWhenUnauthenticated && getCurrentRoute() !== '/pages/login/login') {
      uni.reLaunch({ url: '/pages/login/login' })
    }
    return { authenticated: false, user: null }
  }

  try {
    const res = await request('/user/session-status', 'GET', {}, { showLoading: false })
    const sessionData = res?.data || {}
    const user = sessionData.user || null
    const isLoggedIn = Boolean(sessionData.is_logged_in && user?.id)

    if (!isLoggedIn) {
      clearAuthStorage(chatStore)
      if (redirectToLoginWhenUnauthenticated && getCurrentRoute() !== '/pages/login/login') {
        uni.reLaunch({ url: '/pages/login/login' })
      }
      return { authenticated: false, user: null }
    }

    saveAuthSession(token, user)

    if (user.role === 'elder') {
      if (!chatStore.isConnected) {
        chatStore.initSocket()
      }
      chatStore.startGlobalAnnouncer()
      chatStore.loadSessions()
    } else {
      chatStore.stopGlobalAnnouncer()
    }

    if (redirectToHomeWhenAuthenticated && getCurrentRoute() === '/pages/login/login') {
      uni.reLaunch({ url: getHomePageByRole(user.role) })
    }

    return { authenticated: true, user }
  } catch (error) {
    clearAuthStorage(chatStore)
    if (redirectToLoginWhenUnauthenticated && getCurrentRoute() !== '/pages/login/login') {
      uni.reLaunch({ url: '/pages/login/login' })
    }
    return { authenticated: false, user: null, error }
  }
}

export const logoutWithServer = async (chatStore) => {
  try {
    await request('/user/logout', 'POST', {}, { showLoading: false })
  } catch (error) {
    console.warn('[Auth] Logout request failed:', error)
  } finally {
    clearAuthStorage(chatStore)
  }
}
