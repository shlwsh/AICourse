/**
 * 本地存储工具模块
 *
 * 功能：
 * - localStorage 封装
 * - sessionStorage 封装
 * - 自动序列化/反序列化
 * - 过期时间支持
 * - 存储空间管理
 *
 * 使用示例：
 * ```typescript
 * import { storage } from '@/utils/storage';
 *
 * // 保存数据
 * storage.set('user', { name: '张三', age: 25 });
 *
 * // 读取数据
 * const user = storage.get('user');
 *
 * // 设置过期时间（单位：毫秒）
 * storage.set('token', 'abc123', 3600000); // 1小时后过期
 * ```
 */

import { logger } from './logger';

/**
 * 存储项接口
 */
interface StorageItem<T = any> {
  /** 存储的值 */
  value: T;
  /** 过期时间戳（毫秒） */
  expireAt?: number;
}

/**
 * 存储配置接口
 */
interface StorageConfig {
  /** 存储键名前缀 */
  prefix: string;
  /** 是否启用加密（预留） */
  encrypt: boolean;
}

/**
 * 存储类型枚举
 */
export enum StorageType {
  /** 本地存储（持久化） */
  LOCAL = 'local',
  /** 会话存储（临时） */
  SESSION = 'session',
}

/**
 * 存储管理类
 */
class StorageManager {
  private config: StorageConfig;
  private storageType: StorageType;

  constructor(storageType: StorageType = StorageType.LOCAL, config: Partial<StorageConfig> = {}) {
    this.storageType = storageType;
    this.config = {
      prefix: config.prefix || 'course-scheduling-',
      encrypt: config.encrypt || false,
    };
  }

  /**
   * 获取存储对象
   */
  private getStorage(): Storage {
    return this.storageType === StorageType.LOCAL ? localStorage : sessionStorage;
  }

  /**
   * 生成完整的存储键名
   *
   * @param key - 原始键名
   * @returns 完整的键名
   */
  private getFullKey(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  /**
   * 检查是否已过期
   *
   * @param item - 存储项
   * @returns 是否已过期
   */
  private isExpired(item: StorageItem): boolean {
    if (!item.expireAt) {
      return false;
    }
    return Date.now() > item.expireAt;
  }

  /**
   * 保存数据到存储
   *
   * @param key - 键名
   * @param value - 值
   * @param ttl - 过期时间（毫秒），不设置则永不过期
   * @returns 是否保存成功
   */
  set<T = any>(key: string, value: T, ttl?: number): boolean {
    try {
      const storage = this.getStorage();
      const fullKey = this.getFullKey(key);

      const item: StorageItem<T> = {
        value,
        expireAt: ttl ? Date.now() + ttl : undefined,
      };

      const serialized = JSON.stringify(item);
      storage.setItem(fullKey, serialized);

      logger.debug('保存数据到存储', {
        key,
        storageType: this.storageType,
        hasExpire: !!ttl,
      });

      return true;
    } catch (error) {
      logger.error('保存数据到存储失败', { key, error });
      return false;
    }
  }

  /**
   * 从存储中读取数据
   *
   * @param key - 键名
   * @param defaultValue - 默认值（当键不存在或已过期时返回）
   * @returns 读取的值
   */
  get<T = any>(key: string, defaultValue?: T): T | undefined {
    try {
      const storage = this.getStorage();
      const fullKey = this.getFullKey(key);

      const serialized = storage.getItem(fullKey);
      if (!serialized) {
        logger.debug('存储中不存在该键', { key });
        return defaultValue;
      }

      const item: StorageItem<T> = JSON.parse(serialized);

      // 检查是否过期
      if (this.isExpired(item)) {
        logger.debug('存储项已过期', { key });
        this.remove(key);
        return defaultValue;
      }

      logger.debug('从存储中读取数据', { key, storageType: this.storageType });
      return item.value;
    } catch (error) {
      logger.error('从存储中读取数据失败', { key, error });
      return defaultValue;
    }
  }

  /**
   * 从存储中删除数据
   *
   * @param key - 键名
   * @returns 是否删除成功
   */
  remove(key: string): boolean {
    try {
      const storage = this.getStorage();
      const fullKey = this.getFullKey(key);

      storage.removeItem(fullKey);

      logger.debug('从存储中删除数据', { key, storageType: this.storageType });
      return true;
    } catch (error) {
      logger.error('从存储中删除数据失败', { key, error });
      return false;
    }
  }

  /**
   * 清空所有存储数据（仅清空带前缀的数据）
   *
   * @returns 是否清空成功
   */
  clear(): boolean {
    try {
      const storage = this.getStorage();
      const keys: string[] = [];

      // 收集所有带前缀的键
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.config.prefix)) {
          keys.push(key);
        }
      }

      // 删除所有带前缀的键
      keys.forEach((key) => storage.removeItem(key));

      logger.info('清空存储数据', {
        storageType: this.storageType,
        count: keys.length,
      });

      return true;
    } catch (error) {
      logger.error('清空存储数据失败', { error });
      return false;
    }
  }

  /**
   * 检查键是否存在
   *
   * @param key - 键名
   * @returns 是否存在
   */
  has(key: string): boolean {
    try {
      const storage = this.getStorage();
      const fullKey = this.getFullKey(key);

      const serialized = storage.getItem(fullKey);
      if (!serialized) {
        return false;
      }

      const item: StorageItem = JSON.parse(serialized);

      // 检查是否过期
      if (this.isExpired(item)) {
        this.remove(key);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('检查键是否存在失败', { key, error });
      return false;
    }
  }

  /**
   * 获取所有键名（不包含前缀）
   *
   * @returns 键名数组
   */
  keys(): string[] {
    try {
      const storage = this.getStorage();
      const keys: string[] = [];

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.config.prefix)) {
          // 移除前缀
          keys.push(key.substring(this.config.prefix.length));
        }
      }

      return keys;
    } catch (error) {
      logger.error('获取所有键名失败', { error });
      return [];
    }
  }

  /**
   * 获取存储的大小（字节）
   *
   * @returns 存储大小
   */
  getSize(): number {
    try {
      const storage = this.getStorage();
      let size = 0;

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.config.prefix)) {
          const value = storage.getItem(key);
          if (value) {
            size += key.length + value.length;
          }
        }
      }

      return size;
    } catch (error) {
      logger.error('获取存储大小失败', { error });
      return 0;
    }
  }

  /**
   * 获取存储的大小（格式化）
   *
   * @returns 格式化后的存储大小
   */
  getFormattedSize(): string {
    const size = this.getSize();
    const units = ['B', 'KB', 'MB'];
    let unitIndex = 0;
    let formattedSize = size;

    while (formattedSize >= 1024 && unitIndex < units.length - 1) {
      formattedSize /= 1024;
      unitIndex++;
    }

    return `${formattedSize.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 清理过期的存储项
   *
   * @returns 清理的项数
   */
  clearExpired(): number {
    try {
      const storage = this.getStorage();
      const expiredKeys: string[] = [];

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.config.prefix)) {
          const serialized = storage.getItem(key);
          if (serialized) {
            try {
              const item: StorageItem = JSON.parse(serialized);
              if (this.isExpired(item)) {
                expiredKeys.push(key);
              }
            } catch {
              // 解析失败，可能是损坏的数据，也删除
              expiredKeys.push(key);
            }
          }
        }
      }

      // 删除过期的键
      expiredKeys.forEach((key) => storage.removeItem(key));

      logger.info('清理过期的存储项', {
        storageType: this.storageType,
        count: expiredKeys.length,
      });

      return expiredKeys.length;
    } catch (error) {
      logger.error('清理过期的存储项失败', { error });
      return 0;
    }
  }

  /**
   * 导出所有存储数据
   *
   * @returns 存储数据对象
   */
  export(): Record<string, any> {
    try {
      const storage = this.getStorage();
      const data: Record<string, any> = {};

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.config.prefix)) {
          const serialized = storage.getItem(key);
          if (serialized) {
            try {
              const item: StorageItem = JSON.parse(serialized);
              if (!this.isExpired(item)) {
                // 移除前缀
                const cleanKey = key.substring(this.config.prefix.length);
                data[cleanKey] = item.value;
              }
            } catch {
              // 忽略解析失败的项
            }
          }
        }
      }

      logger.info('导出存储数据', {
        storageType: this.storageType,
        count: Object.keys(data).length,
      });

      return data;
    } catch (error) {
      logger.error('导出存储数据失败', { error });
      return {};
    }
  }

  /**
   * 导入存储数据
   *
   * @param data - 要导入的数据对象
   * @param overwrite - 是否覆盖已存在的键（默认 false）
   * @returns 导入的项数
   */
  import(data: Record<string, any>, overwrite: boolean = false): number {
    try {
      let count = 0;

      for (const [key, value] of Object.entries(data)) {
        if (overwrite || !this.has(key)) {
          this.set(key, value);
          count++;
        }
      }

      logger.info('导入存储数据', {
        storageType: this.storageType,
        count,
        overwrite,
      });

      return count;
    } catch (error) {
      logger.error('导入存储数据失败', { error });
      return 0;
    }
  }
}

// 导出默认实例
export const storage = new StorageManager(StorageType.LOCAL);
export const sessionStorage = new StorageManager(StorageType.SESSION);

// 导出 StorageManager 类供其他模块创建实例
export default StorageManager;
