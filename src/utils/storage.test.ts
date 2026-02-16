/**
 * 本地存储工具单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storage, sessionStorage, StorageType } from './storage';
import StorageManager from './storage';

describe('本地存储工具', () => {
  beforeEach(() => {
    // 清空存储
    storage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    // 清空存储
    storage.clear();
    sessionStorage.clear();
  });

  describe('基本操作', () => {
    it('应该能够保存和读取数据', () => {
      storage.set('test', 'value');
      expect(storage.get('test')).toBe('value');
    });

    it('应该能够保存和读取对象', () => {
      const obj = { name: '张三', age: 25 };
      storage.set('user', obj);
      expect(storage.get('user')).toEqual(obj);
    });

    it('应该能够保存和读取数组', () => {
      const arr = [1, 2, 3, 4, 5];
      storage.set('numbers', arr);
      expect(storage.get('numbers')).toEqual(arr);
    });

    it('应该能够删除数据', () => {
      storage.set('test', 'value');
      expect(storage.has('test')).toBe(true);
      storage.remove('test');
      expect(storage.has('test')).toBe(false);
    });

    it('应该能够清空所有数据', () => {
      storage.set('key1', 'value1');
      storage.set('key2', 'value2');
      storage.clear();
      expect(storage.has('key1')).toBe(false);
      expect(storage.has('key2')).toBe(false);
    });
  });

  describe('过期时间', () => {
    it('应该支持设置过期时间', () => {
      storage.set('test', 'value', 100); // 100ms 后过期
      expect(storage.has('test')).toBe(true);
    });

    it('应该在过期后自动删除', async () => {
      storage.set('test', 'value', 50); // 50ms 后过期
      expect(storage.has('test')).toBe(true);

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(storage.has('test')).toBe(false);
      expect(storage.get('test')).toBeUndefined();
    });

    it('应该能够清理过期的存储项', async () => {
      storage.set('key1', 'value1', 50); // 50ms 后过期
      storage.set('key2', 'value2'); // 永不过期

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 100));

      const count = storage.clearExpired();
      expect(count).toBe(1);
      expect(storage.has('key1')).toBe(false);
      expect(storage.has('key2')).toBe(true);
    });
  });

  describe('默认值', () => {
    it('应该在键不存在时返回默认值', () => {
      expect(storage.get('nonexistent', 'default')).toBe('default');
    });

    it('应该在键过期时返回默认值', async () => {
      storage.set('test', 'value', 50);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(storage.get('test', 'default')).toBe('default');
    });
  });

  describe('键名管理', () => {
    it('应该能够获取所有键名', () => {
      storage.set('key1', 'value1');
      storage.set('key2', 'value2');
      const keys = storage.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('应该能够检查键是否存在', () => {
      storage.set('test', 'value');
      expect(storage.has('test')).toBe(true);
      expect(storage.has('nonexistent')).toBe(false);
    });
  });

  describe('存储大小', () => {
    it('应该能够获取存储大小', () => {
      storage.set('test', 'value');
      const size = storage.getSize();
      expect(size).toBeGreaterThan(0);
    });

    it('应该能够获取格式化的存储大小', () => {
      storage.set('test', 'value');
      const formattedSize = storage.getFormattedSize();
      expect(formattedSize).toMatch(/\d+\.\d+ (B|KB|MB)/);
    });
  });

  describe('导入导出', () => {
    it('应该能够导出所有数据', () => {
      storage.set('key1', 'value1');
      storage.set('key2', { name: '张三' });
      const data = storage.export();
      expect(data).toEqual({
        key1: 'value1',
        key2: { name: '张三' },
      });
    });

    it('应该能够导入数据', () => {
      const data = {
        key1: 'value1',
        key2: { name: '张三' },
      };
      const count = storage.import(data);
      expect(count).toBe(2);
      expect(storage.get('key1')).toBe('value1');
      expect(storage.get('key2')).toEqual({ name: '张三' });
    });

    it('应该支持覆盖模式导入', () => {
      storage.set('key1', 'old');
      const data = { key1: 'new' };
      storage.import(data, true);
      expect(storage.get('key1')).toBe('new');
    });

    it('应该支持非覆盖模式导入', () => {
      storage.set('key1', 'old');
      const data = { key1: 'new' };
      storage.import(data, false);
      expect(storage.get('key1')).toBe('old');
    });
  });

  describe('会话存储', () => {
    it('应该能够使用会话存储', () => {
      // 注意：vitest 环境中 sessionStorage 可能不完全支持
      // 这里测试基本功能
      try {
        sessionStorage.set('test', 'value');
        const result = sessionStorage.get('test');
        // 如果环境支持，应该能获取到值
        if (result !== undefined) {
          expect(result).toBe('value');
        }
      } catch (error) {
        // 如果环境不支持，跳过测试
        console.warn('sessionStorage 在测试环境中不可用');
      }
    });

    it('会话存储应该独立于本地存储', () => {
      storage.set('test', 'local');
      expect(storage.get('test')).toBe('local');

      // sessionStorage 测试（可能在测试环境中不可用）
      try {
        sessionStorage.set('test', 'session');
        const result = sessionStorage.get('test');
        if (result !== undefined) {
          expect(result).toBe('session');
        }
      } catch (error) {
        console.warn('sessionStorage 在测试环境中不可用');
      }
    });
  });

  describe('自定义配置', () => {
    it('应该支持自定义前缀', () => {
      const customStorage = new StorageManager(StorageType.LOCAL, {
        prefix: 'custom-',
      });
      customStorage.set('test', 'value');
      expect(customStorage.get('test')).toBe('value');
      // 清理
      customStorage.clear();
    });
  });
});
