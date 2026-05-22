import config from '@/config'

let socket = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_INTERVAL = 3000

function getSocketUrl() {
  const isHttps = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:'
  const protocol = isHttps ? 'wss:' : 'ws:'
  const host = config?.server?.host || '127.0.0.1'
  const port = config?.server?.port || 3000
  return `${protocol}//${host}:${port}`
}

function initSocket(userId, token, onConnected, onDisconnected, onError) {
  const { io } = require('socket.io-client')
  const wsUrl = getSocketUrl()

  socket = io(wsUrl, {
    query: {
      userId,
      token
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
    reconnectAttempts += 1
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

export {
  initSocket,
  getSocket,
  isConnected,
  disconnect,
  emit,
  on,
  off,
  getSocketUrl
}

export default {
  initSocket,
  getSocket,
  isConnected,
  disconnect,
  emit,
  on,
  off,
  getSocketUrl
}
