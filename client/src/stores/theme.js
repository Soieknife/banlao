import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 主题管理存储
 * 支持多主题切换（当前仅实现亮色模式）
 */
export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref('light')
  const availableThemes = ref(['light']) // 当前仅支持亮色

  /**
   * 切换主题
   * @param {string} theme - 主题名称
   */
  const setTheme = (theme) => {
    if (!availableThemes.value.includes(theme)) {
      console.warn(`Theme "${theme}" not available. Using "light" instead.`)
      return
    }

    currentTheme.value = theme

    // 保存到localStorage
    uni.setStorageSync('theme', theme)

    // 应用主题样式（当前为亮色，无需特殊处理）
    // 未来可在此处添加深色模式切换逻辑
    applyTheme(theme)
  }

  /**
   * 获取当前主题
   */
  const getTheme = () => {
    return currentTheme.value
  }

  /**
   * 应用主题样式
   */
  const applyTheme = (theme) => {
    // 当前实现：亮色模式是默认样式
    // 未来实现：可通过CSS类或CSS变量动态切换
    // #ifdef H5
    if (typeof document !== 'undefined' && document.documentElement) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark-theme')
      } else {
        document.documentElement.classList.remove('dark-theme')
      }
    }
    // #endif
  }

  /**
   * 初始化主题（从localStorage读取）
   */
  const initTheme = () => {
    const savedTheme = uni.getStorageSync('theme')
    if (savedTheme && availableThemes.value.includes(savedTheme)) {
      setTheme(savedTheme)
    } else {
      setTheme('light')
    }
  }

  return {
    currentTheme,
    availableThemes,
    setTheme,
    getTheme,
    applyTheme,
    initTheme
  }
})
