/**
 * UI 状态管理
 * 使用 Pinia 管理 UI 相关的状态和操作
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { logger } from '@/utils/logger';

// ========== 类型定义 ==========

/**
 * 主题模式类型
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * 通知类型
 */
export type NotificationType = 'success' | 'warning' | 'error' | 'info';

/**
 * 通知消息接口
 */
export interface NotificationMessage {
  /** 消息ID */
  id: string;
  /** 消息类型 */
  type: NotificationType;
  /** 消息标题 */
  title: string;
  /** 消息内容 */
  message: string;
  /** 持续时间（毫秒），0 表示不自动关闭 */
  duration: number;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 加载状态接口
 */
export interface LoadingState {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 加载提示文本 */
  text: string;
  /** 加载进度（0-100），-1 表示不显示进度 */
  progress: number;
}

/**
 * 对话框状态接口
 */
export interface DialogState {
  /** 是否显示 */
  visible: boolean;
  /** 对话框标题 */
  title: string;
  /** 对话框内容 */
  content: string;
  /** 确认按钮文本 */
  confirmText: string;
  /** 取消按钮文本 */
  cancelText: string;
  /** 确认回调 */
  onConfirm?: () => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
}

/**
 * UI 状态管理 Store
 */
export const useUiStore = defineStore(
  'ui',
  () => {
  // ========== 状态 ==========

  // 主题模式
  const themeMode = ref<ThemeMode>('light');

  // 侧边栏是否折叠
  const sidebarCollapsed = ref(false);

  // 全局加载状态
  const globalLoading = ref<LoadingState>({
    isLoading: false,
    text: '加载中...',
    progress: -1,
  });

  // 通知消息列表
  const notifications = ref<NotificationMessage[]>([]);

  // 对话框状态
  const dialog = ref<DialogState>({
    visible: false,
    title: '',
    content: '',
    confirmText: '确定',
    cancelText: '取消',
  });

  // 页面标题
  const pageTitle = ref('排课系统');

  // 是否显示设置向导
  const showSetupWizard = ref(false);

  // 当前激活的菜单项
  const activeMenuItem = ref('home');

  // 面包屑导航
  const breadcrumbs = ref<Array<{ label: string; path?: string }>>([]);

  // ========== 计算属性 ==========

  // 是否为暗色主题
  const isDarkMode = computed(() => {
    if (themeMode.value === 'auto') {
      // 检测系统主题偏好
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return themeMode.value === 'dark';
  });

  // 是否有通知消息
  const hasNotifications = computed(() => notifications.value.length > 0);

  // 通知消息数量
  const notificationCount = computed(() => notifications.value.length);

  // 是否正在加载
  const isLoading = computed(() => globalLoading.value.isLoading);

  // ========== 操作方法 ==========

  /**
   * 设置主题模式
   */
  const setThemeMode = (mode: ThemeMode): void => {
    logger.info('设置主题模式', { mode });
    themeMode.value = mode;

    // 应用主题到 HTML 元素
    const htmlElement = document.documentElement;
    if (isDarkMode.value) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }

    // 持久化到本地存储
    localStorage.setItem('theme-mode', mode);
  };

  /**
   * 切换主题模式
   */
  const toggleTheme = (): void => {
    const newMode = themeMode.value === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  /**
   * 切换侧边栏折叠状态
   */
  const toggleSidebar = (): void => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
    logger.debug('切换侧边栏状态', { collapsed: sidebarCollapsed.value });

    // 持久化到本地存储
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed.value));
  };

  /**
   * 设置侧边栏折叠状态
   */
  const setSidebarCollapsed = (collapsed: boolean): void => {
    sidebarCollapsed.value = collapsed;
    logger.debug('设置侧边栏状态', { collapsed });

    // 持久化到本地存储
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  };

  /**
   * 显示全局加载
   */
  const showLoading = (text = '加载中...', progress = -1): void => {
    logger.debug('显示全局加载', { text, progress });
    globalLoading.value = {
      isLoading: true,
      text,
      progress,
    };
  };

  /**
   * 隐藏全局加载
   */
  const hideLoading = (): void => {
    logger.debug('隐藏全局加载');
    globalLoading.value = {
      isLoading: false,
      text: '加载中...',
      progress: -1,
    };
  };

  /**
   * 更新加载进度
   */
  const updateLoadingProgress = (progress: number, text?: string): void => {
    if (globalLoading.value.isLoading) {
      globalLoading.value.progress = progress;
      if (text) {
        globalLoading.value.text = text;
      }
      logger.debug('更新加载进度', { progress, text });
    }
  };

  /**
   * 显示通知消息
   */
  const showNotification = (
    type: NotificationType,
    title: string,
    message: string,
    duration = 3000
  ): string => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const notification: NotificationMessage = {
      id,
      type,
      title,
      message,
      duration,
      createdAt: Date.now(),
    };

    logger.info('显示通知消息', { type, title, message, duration });
    notifications.value.push(notification);

    // 自动关闭通知
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  /**
   * 显示成功通知
   */
  const showSuccess = (title: string, message: string, duration = 3000): string => {
    return showNotification('success', title, message, duration);
  };

  /**
   * 显示警告通知
   */
  const showWarning = (title: string, message: string, duration = 4000): string => {
    return showNotification('warning', title, message, duration);
  };

  /**
   * 显示错误通知
   */
  const showError = (title: string, message: string, duration = 5000): string => {
    return showNotification('error', title, message, duration);
  };

  /**
   * 显示信息通知
   */
  const showInfo = (title: string, message: string, duration = 3000): string => {
    return showNotification('info', title, message, duration);
  };

  /**
   * 移除通知消息
   */
  const removeNotification = (id: string): void => {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index >= 0) {
      logger.debug('移除通知消息', { id });
      notifications.value.splice(index, 1);
    }
  };

  /**
   * 清空所有通知消息
   */
  const clearNotifications = (): void => {
    logger.info('清空所有通知消息', { count: notifications.value.length });
    notifications.value = [];
  };

  /**
   * 显示确认对话框
   */
  const showConfirmDialog = (
    title: string,
    content: string,
    onConfirm?: () => void | Promise<void>,
    onCancel?: () => void,
    confirmText = '确定',
    cancelText = '取消'
  ): void => {
    logger.info('显示确认对话框', { title, content });
    dialog.value = {
      visible: true,
      title,
      content,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
    };
  };

  /**
   * 隐藏对话框
   */
  const hideDialog = (): void => {
    logger.debug('隐藏对话框');
    dialog.value = {
      visible: false,
      title: '',
      content: '',
      confirmText: '确定',
      cancelText: '取消',
    };
  };

  /**
   * 确认对话框
   */
  const confirmDialog = async (): Promise<void> => {
    logger.debug('确认对话框');
    if (dialog.value.onConfirm) {
      try {
        await dialog.value.onConfirm();
      } catch (error) {
        logger.error('对话框确认回调执行失败', { error });
        throw error;
      }
    }
    hideDialog();
  };

  /**
   * 取消对话框
   */
  const cancelDialog = (): void => {
    logger.debug('取消对话框');
    if (dialog.value.onCancel) {
      dialog.value.onCancel();
    }
    hideDialog();
  };

  /**
   * 设置页面标题
   */
  const setPageTitle = (title: string): void => {
    logger.debug('设置页面标题', { title });
    pageTitle.value = title;
    document.title = `${title} - 排课系统`;
  };

  /**
   * 设置面包屑导航
   */
  const setBreadcrumbs = (items: Array<{ label: string; path?: string }>): void => {
    logger.debug('设置面包屑导航', { items });
    breadcrumbs.value = items;
  };

  /**
   * 设置激活的菜单项
   */
  const setActiveMenuItem = (menuItem: string): void => {
    logger.debug('设置激活的菜单项', { menuItem });
    activeMenuItem.value = menuItem;
  };

  /**
   * 显示设置向导
   */
  const openSetupWizard = (): void => {
    logger.info('打开设置向导');
    showSetupWizard.value = true;
  };

  /**
   * 隐藏设置向导
   */
  const closeSetupWizard = (): void => {
    logger.info('关闭设置向导');
    showSetupWizard.value = false;
  };

  /**
   * 从本地存储加载 UI 状态
   */
  const loadFromLocalStorage = (): void => {
    logger.info('从本地存储加载 UI 状态');

    // 加载主题模式
    const savedTheme = localStorage.getItem('theme-mode') as ThemeMode | null;
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      setThemeMode(savedTheme);
    }

    // 加载侧边栏状态
    const savedSidebarState = localStorage.getItem('sidebar-collapsed');
    if (savedSidebarState !== null) {
      sidebarCollapsed.value = savedSidebarState === 'true';
    }

    logger.info('UI 状态加载完成', {
      themeMode: themeMode.value,
      sidebarCollapsed: sidebarCollapsed.value,
    });
  };

  /**
   * 重置状态
   */
  const reset = (): void => {
    logger.info('重置 UI 状态');

    themeMode.value = 'light';
    sidebarCollapsed.value = false;
    globalLoading.value = {
      isLoading: false,
      text: '加载中...',
      progress: -1,
    };
    notifications.value = [];
    dialog.value = {
      visible: false,
      title: '',
      content: '',
      confirmText: '确定',
      cancelText: '取消',
    };
    pageTitle.value = '排课系统';
    showSetupWizard.value = false;
    activeMenuItem.value = 'home';
    breadcrumbs.value = [];

    // 清除本地存储
    localStorage.removeItem('theme-mode');
    localStorage.removeItem('sidebar-collapsed');
  };

  // 返回状态和方法
  return {
    // 状态
    themeMode,
    sidebarCollapsed,
    globalLoading,
    notifications,
    dialog,
    pageTitle,
    showSetupWizard,
    activeMenuItem,
    breadcrumbs,

    // 计算属性
    isDarkMode,
    hasNotifications,
    notificationCount,
    isLoading,

    // 方法
    setThemeMode,
    toggleTheme,
    toggleSidebar,
    setSidebarCollapsed,
    showLoading,
    hideLoading,
    updateLoadingProgress,
    showNotification,
    showSuccess,
    showWarning,
    showError,
    showInfo,
    removeNotification,
    clearNotifications,
    showConfirmDialog,
    hideDialog,
    confirmDialog,
    cancelDialog,
    setPageTitle,
    setBreadcrumbs,
    setActiveMenuItem,
    openSetupWizard,
    closeSetupWizard,
    loadFromLocalStorage,
    reset,
  };
},
  {
    // 持久化配置
    persist: {
      key: 'ui-store',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // 只持久化部分状态
      paths: ['themeMode', 'sidebarCollapsed'],
    },
  }
);
