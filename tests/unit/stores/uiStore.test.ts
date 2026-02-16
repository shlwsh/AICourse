/**
 * UI Store 单元测试
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUiStore } from '@/stores/uiStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock document
const documentMock = {
  documentElement: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
  },
  title: '',
};

// Mock window.matchMedia
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

describe('uiStore', () => {
  beforeEach(() => {
    // 创建新的 Pinia 实例
    setActivePinia(createPinia());

    // 设置全局 mocks
    global.localStorage = localStorageMock as any;
    global.document = documentMock as any;
    global.window = { matchMedia: matchMediaMock } as any;

    // 清除 localStorage
    localStorageMock.clear();

    // 重置 mocks
    vi.clearAllMocks();
    documentMock.title = '';
  });

  afterEach(() => {
    // 只在使用了 fake timers 时才清除
    try {
      vi.clearAllTimers();
    } catch {
      // 忽略错误
    }
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const store = useUiStore();

      expect(store.themeMode).toBe('light');
      expect(store.sidebarCollapsed).toBe(false);
      expect(store.globalLoading.isLoading).toBe(false);
      expect(store.notifications).toEqual([]);
      expect(store.dialog.visible).toBe(false);
      expect(store.pageTitle).toBe('排课系统');
      expect(store.showSetupWizard).toBe(false);
      expect(store.activeMenuItem).toBe('home');
      expect(store.breadcrumbs).toEqual([]);
    });

    it('应该有正确的计算属性', () => {
      const store = useUiStore();

      expect(store.isDarkMode).toBe(false);
      expect(store.hasNotifications).toBe(false);
      expect(store.notificationCount).toBe(0);
      expect(store.isLoading).toBe(false);
    });
  });

  describe('主题管理', () => {
    it('应该能够设置主题模式', () => {
      const store = useUiStore();

      store.setThemeMode('dark');
      expect(store.themeMode).toBe('dark');
      expect(localStorage.getItem('theme-mode')).toBe('dark');
    });

    it('应该能够切换主题', () => {
      const store = useUiStore();

      expect(store.themeMode).toBe('light');
      store.toggleTheme();
      expect(store.themeMode).toBe('dark');
      store.toggleTheme();
      expect(store.themeMode).toBe('light');
    });

    it('暗色主题应该添加 dark 类到 HTML 元素', () => {
      const store = useUiStore();
      const htmlElement = document.documentElement;

      store.setThemeMode('dark');
      expect(htmlElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('亮色主题应该移除 dark 类从 HTML 元素', () => {
      const store = useUiStore();
      const htmlElement = document.documentElement;

      store.setThemeMode('light');
      expect(htmlElement.classList.remove).toHaveBeenCalledWith('dark');
    });
  });

  describe('侧边栏管理', () => {
    it('应该能够切换侧边栏状态', () => {
      const store = useUiStore();

      expect(store.sidebarCollapsed).toBe(false);
      store.toggleSidebar();
      expect(store.sidebarCollapsed).toBe(true);
      expect(localStorage.getItem('sidebar-collapsed')).toBe('true');

      store.toggleSidebar();
      expect(store.sidebarCollapsed).toBe(false);
      expect(localStorage.getItem('sidebar-collapsed')).toBe('false');
    });

    it('应该能够设置侧边栏状态', () => {
      const store = useUiStore();

      store.setSidebarCollapsed(true);
      expect(store.sidebarCollapsed).toBe(true);
      expect(localStorage.getItem('sidebar-collapsed')).toBe('true');

      store.setSidebarCollapsed(false);
      expect(store.sidebarCollapsed).toBe(false);
      expect(localStorage.getItem('sidebar-collapsed')).toBe('false');
    });
  });

  describe('加载状态管理', () => {
    it('应该能够显示全局加载', () => {
      const store = useUiStore();

      store.showLoading('正在加载数据...', 50);
      expect(store.globalLoading.isLoading).toBe(true);
      expect(store.globalLoading.text).toBe('正在加载数据...');
      expect(store.globalLoading.progress).toBe(50);
      expect(store.isLoading).toBe(true);
    });

    it('应该能够隐藏全局加载', () => {
      const store = useUiStore();

      store.showLoading();
      expect(store.isLoading).toBe(true);

      store.hideLoading();
      expect(store.globalLoading.isLoading).toBe(false);
      expect(store.isLoading).toBe(false);
    });

    it('应该能够更新加载进度', () => {
      const store = useUiStore();

      store.showLoading('加载中...', 0);
      store.updateLoadingProgress(50, '正在处理...');
      expect(store.globalLoading.progress).toBe(50);
      expect(store.globalLoading.text).toBe('正在处理...');

      store.updateLoadingProgress(100);
      expect(store.globalLoading.progress).toBe(100);
      expect(store.globalLoading.text).toBe('正在处理...');
    });

    it('未加载时更新进度不应该生效', () => {
      const store = useUiStore();

      store.updateLoadingProgress(50);
      expect(store.globalLoading.progress).toBe(-1);
    });
  });

  describe('通知消息管理', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该能够显示通知消息', () => {
      const store = useUiStore();

      const id = store.showNotification('success', '成功', '操作成功', 3000);
      expect(store.notifications).toHaveLength(1);
      expect(store.notifications[0].id).toBe(id);
      expect(store.notifications[0].type).toBe('success');
      expect(store.notifications[0].title).toBe('成功');
      expect(store.notifications[0].message).toBe('操作成功');
      expect(store.hasNotifications).toBe(true);
      expect(store.notificationCount).toBe(1);
    });

    it('应该能够显示成功通知', () => {
      const store = useUiStore();

      store.showSuccess('成功', '操作成功');
      expect(store.notifications).toHaveLength(1);
      expect(store.notifications[0].type).toBe('success');
    });

    it('应该能够显示警告通知', () => {
      const store = useUiStore();

      store.showWarning('警告', '请注意');
      expect(store.notifications).toHaveLength(1);
      expect(store.notifications[0].type).toBe('warning');
    });

    it('应该能够显示错误通知', () => {
      const store = useUiStore();

      store.showError('错误', '操作失败');
      expect(store.notifications).toHaveLength(1);
      expect(store.notifications[0].type).toBe('error');
    });

    it('应该能够显示信息通知', () => {
      const store = useUiStore();

      store.showInfo('提示', '这是一条信息');
      expect(store.notifications).toHaveLength(1);
      expect(store.notifications[0].type).toBe('info');
    });

    it('应该能够移除通知消息', () => {
      const store = useUiStore();

      const id = store.showSuccess('成功', '操作成功');
      expect(store.notifications).toHaveLength(1);

      store.removeNotification(id);
      expect(store.notifications).toHaveLength(0);
      expect(store.hasNotifications).toBe(false);
    });

    it('应该能够清空所有通知消息', () => {
      const store = useUiStore();

      store.showSuccess('成功1', '消息1');
      store.showSuccess('成功2', '消息2');
      store.showSuccess('成功3', '消息3');
      expect(store.notifications).toHaveLength(3);

      store.clearNotifications();
      expect(store.notifications).toHaveLength(0);
    });

    it('通知消息应该自动关闭', () => {
      const store = useUiStore();

      store.showSuccess('成功', '操作成功', 1000);
      expect(store.notifications).toHaveLength(1);

      vi.advanceTimersByTime(1000);
      expect(store.notifications).toHaveLength(0);
    });

    it('持续时间为0的通知不应该自动关闭', () => {
      const store = useUiStore();

      store.showNotification('info', '提示', '这是一条持久消息', 0);
      expect(store.notifications).toHaveLength(1);

      vi.advanceTimersByTime(10000);
      expect(store.notifications).toHaveLength(1);
    });
  });

  describe('对话框管理', () => {
    it('应该能够显示确认对话框', () => {
      const store = useUiStore();
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      store.showConfirmDialog(
        '确认删除',
        '确定要删除这条记录吗？',
        onConfirm,
        onCancel,
        '删除',
        '取消'
      );

      expect(store.dialog.visible).toBe(true);
      expect(store.dialog.title).toBe('确认删除');
      expect(store.dialog.content).toBe('确定要删除这条记录吗？');
      expect(store.dialog.confirmText).toBe('删除');
      expect(store.dialog.cancelText).toBe('取消');
    });

    it('应该能够隐藏对话框', () => {
      const store = useUiStore();

      store.showConfirmDialog('标题', '内容');
      expect(store.dialog.visible).toBe(true);

      store.hideDialog();
      expect(store.dialog.visible).toBe(false);
    });

    it('应该能够确认对话框', async () => {
      const store = useUiStore();
      const onConfirm = vi.fn();

      store.showConfirmDialog('标题', '内容', onConfirm);
      await store.confirmDialog();

      expect(onConfirm).toHaveBeenCalled();
      expect(store.dialog.visible).toBe(false);
    });

    it('应该能够取消对话框', () => {
      const store = useUiStore();
      const onCancel = vi.fn();

      store.showConfirmDialog('标题', '内容', undefined, onCancel);
      store.cancelDialog();

      expect(onCancel).toHaveBeenCalled();
      expect(store.dialog.visible).toBe(false);
    });

    it('确认对话框时应该处理异步回调', async () => {
      const store = useUiStore();
      const onConfirm = vi.fn().mockResolvedValue(undefined);

      store.showConfirmDialog('标题', '内容', onConfirm);
      await store.confirmDialog();

      expect(onConfirm).toHaveBeenCalled();
      expect(store.dialog.visible).toBe(false);
    });

    it('确认对话框时应该处理回调错误', async () => {
      const store = useUiStore();
      const error = new Error('回调错误');
      const onConfirm = vi.fn().mockRejectedValue(error);

      store.showConfirmDialog('标题', '内容', onConfirm);

      await expect(store.confirmDialog()).rejects.toThrow('回调错误');
    });
  });

  describe('页面状态管理', () => {
    it('应该能够设置页面标题', () => {
      const store = useUiStore();

      store.setPageTitle('课表管理');
      expect(store.pageTitle).toBe('课表管理');
      expect(document.title).toBe('课表管理 - 排课系统');
    });

    it('应该能够设置面包屑导航', () => {
      const store = useUiStore();
      const breadcrumbs = [
        { label: '首页', path: '/' },
        { label: '课表管理', path: '/schedule' },
        { label: '编辑课表' },
      ];

      store.setBreadcrumbs(breadcrumbs);
      expect(store.breadcrumbs).toEqual(breadcrumbs);
    });

    it('应该能够设置激活的菜单项', () => {
      const store = useUiStore();

      store.setActiveMenuItem('schedule');
      expect(store.activeMenuItem).toBe('schedule');
    });

    it('应该能够打开设置向导', () => {
      const store = useUiStore();

      store.openSetupWizard();
      expect(store.showSetupWizard).toBe(true);
    });

    it('应该能够关闭设置向导', () => {
      const store = useUiStore();

      store.openSetupWizard();
      expect(store.showSetupWizard).toBe(true);

      store.closeSetupWizard();
      expect(store.showSetupWizard).toBe(false);
    });
  });

  describe('本地存储', () => {
    it('应该能够从本地存储加载状态', () => {
      localStorage.setItem('theme-mode', 'dark');
      localStorage.setItem('sidebar-collapsed', 'true');

      const store = useUiStore();
      store.loadFromLocalStorage();

      expect(store.themeMode).toBe('dark');
      expect(store.sidebarCollapsed).toBe(true);
    });

    it('加载无效的主题模式应该使用默认值', () => {
      localStorage.setItem('theme-mode', 'invalid');

      const store = useUiStore();
      store.loadFromLocalStorage();

      expect(store.themeMode).toBe('light');
    });

    it('没有本地存储数据时应该使用默认值', () => {
      const store = useUiStore();
      store.loadFromLocalStorage();

      expect(store.themeMode).toBe('light');
      expect(store.sidebarCollapsed).toBe(false);
    });
  });

  describe('重置状态', () => {
    it('应该能够重置所有状态', () => {
      const store = useUiStore();

      // 修改状态
      store.setThemeMode('dark');
      store.setSidebarCollapsed(true);
      store.showLoading();
      store.showSuccess('成功', '消息');
      store.showConfirmDialog('标题', '内容');
      store.setPageTitle('测试页面');
      store.openSetupWizard();
      store.setActiveMenuItem('test');
      store.setBreadcrumbs([{ label: '测试' }]);

      // 重置
      store.reset();

      // 验证状态已重置
      expect(store.themeMode).toBe('light');
      expect(store.sidebarCollapsed).toBe(false);
      expect(store.globalLoading.isLoading).toBe(false);
      expect(store.notifications).toEqual([]);
      expect(store.dialog.visible).toBe(false);
      expect(store.pageTitle).toBe('排课系统');
      expect(store.showSetupWizard).toBe(false);
      expect(store.activeMenuItem).toBe('home');
      expect(store.breadcrumbs).toEqual([]);

      // 验证本地存储已清除
      expect(localStorage.getItem('theme-mode')).toBeNull();
      expect(localStorage.getItem('sidebar-collapsed')).toBeNull();
    });
  });
});
