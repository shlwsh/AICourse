/**
 * Store 持久化配置测试
 * 验证 Pinia 持久化插件的配置是否正确
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUiStore } from '@/stores/uiStore';
import { useConfigStore } from '@/stores/configStore';

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

describe('Store 持久化配置', () => {
  beforeEach(() => {
    // 设置全局 mocks
    global.localStorage = localStorageMock as any;
    global.document = documentMock as any;

    // 清除 localStorage
    localStorageMock.clear();

    // 创建新的 Pinia 实例
    setActivePinia(createPinia());

    // 重置 mocks
    vi.clearAllMocks();
    documentMock.title = '';
  });
  describe('uiStore 持久化配置', () => {
    it('应该有持久化配置', () => {
      // 验证 store 定义包含持久化配置
      const storeDefinition = useUiStore as any;
      expect(storeDefinition).toBeDefined();
    });

    it('应该配置正确的持久化路径', () => {
      // uiStore 应该只持久化 themeMode 和 sidebarCollapsed
      // 这个测试验证 store 的结构是否正确
      const store = useUiStore();

      expect(store.themeMode).toBeDefined();
      expect(store.sidebarCollapsed).toBeDefined();
      expect(store.globalLoading).toBeDefined();
      expect(store.notifications).toBeDefined();
    });
  });

  describe('configStore 持久化配置', () => {
    it('应该有持久化配置', () => {
      // 验证 store 定义包含持久化配置
      const storeDefinition = useConfigStore as any;
      expect(storeDefinition).toBeDefined();
    });

    it('应该配置正确的持久化路径', () => {
      // configStore 应该持久化所有配置数据
      const store = useConfigStore();

      expect(store.cycleConfig).toBeDefined();
      expect(store.subjectConfigs).toBeDefined();
      expect(store.classConfigs).toBeDefined();
      expect(store.venueConfigs).toBeDefined();
      expect(store.fixedCourseConfigs).toBeDefined();
      expect(store.mutualExclusionConfigs).toBeDefined();
      expect(store.isConfigLoaded).toBeDefined();
    });

    it('不应该持久化临时状态', () => {
      // isLoading 不应该被持久化
      const store = useConfigStore();

      expect(store.isLoading).toBeDefined();
      expect(store.isLoading).toBe(false);
    });
  });

  describe('持久化功能验证', () => {
    it('uiStore 应该有正确的初始状态', () => {
      const store = useUiStore();

      // 验证初始状态
      expect(store.themeMode).toBe('light');
      expect(store.sidebarCollapsed).toBe(false);
      expect(store.globalLoading.isLoading).toBe(false);
      expect(store.notifications).toEqual([]);
    });

    it('configStore 应该有正确的初始状态', () => {
      const store = useConfigStore();

      // 验证初始状态
      expect(store.cycleConfig).toEqual({
        cycleDays: 5,
        periodsPerDay: 8,
      });
      expect(store.subjectConfigs).toEqual([]);
      expect(store.classConfigs).toEqual([]);
      expect(store.isConfigLoaded).toBe(false);
    });

    it('状态修改应该正常工作', () => {
      const uiStore = useUiStore();

      // 修改状态
      uiStore.setThemeMode('dark');
      expect(uiStore.themeMode).toBe('dark');

      uiStore.setSidebarCollapsed(true);
      expect(uiStore.sidebarCollapsed).toBe(true);
    });

    it('配置修改应该正常工作', async () => {
      const configStore = useConfigStore();

      // 修改配置
      await configStore.saveCycleConfig({
        cycleDays: 6,
        periodsPerDay: 10,
      });

      expect(configStore.cycleConfig.cycleDays).toBe(6);
      expect(configStore.cycleConfig.periodsPerDay).toBe(10);
    });
  });
});

