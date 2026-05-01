/**
 * WebSocket 连接管理工具
 */

let socket = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_INTERVAL = 3000

function getSocketUrl() {
  // 确定WebSocket URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  // 如果有API_URL配置，从中提取host
  if (process.env.VUE_APP_API_URL) {
    const url = new URL(process.env.VUE_APP_API_URL)
    return `${protocol}//${url.host}`
  }
  return `${protocol}//${host}`
}

function initSocket(userId, token, onConnected, onDisconnected, onError) {
  const { io } = require('socket.io-client')
  const wsUrl = getSocketUrl()

  socket = io(wsUrl, {
    query: {
      userId: userId,
      token: token
    },
    reconnectionDelay: RECONNECT_INTERVAL,
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected')
    reconnectAttempts = 0
    if (onConnected) onConnected()
  })

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected')
    if (onDisconnected) onDisconnected()
  })

  socket.on('reconnect_attempt', () => {
    reconnectAttempts++
    console.log(`[Socket] Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`)
  })

  socket.on('error', (error) => {
    console.error('[Socket] Error:', error)
    if (onError) onError(error)
  })

  return socket
}

function getSocket() {
  return socket
}

function isConnected() {
  return socket && socket.connected
}

function disconnect() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

function emit(eventName, data, callback) {
  if (socket && socket.connected) {
    socket.emit(eventName, data, callback)
  } else {
    console.warn('[Socket] Not connected, cannot emit event:', eventName)
  }
}

function on(eventName, handler) {
  if (socket) {
    socket.on(eventName, handler)
  }
}

function off(eventName, handler) {
  if (socket) {
    socket.off(eventName, handler)
  }
}

module.exports = {
  initSocket,
  getSocket,
  isConnected,
  disconnect,
  emit,
  on,
  off,
  getSocketUrl
}
