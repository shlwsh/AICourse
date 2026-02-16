/**
 * 防抖和节流函数单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle, rafThrottle, delay, batch } from './debounce';

describe('防抖和节流函数', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debounce', () => {
    it('应该延迟执行函数', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该在多次调用时只执行最后一次', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该重置定时器', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该支持立即执行模式', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100, true);

      debouncedFn();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该能够取消执行', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn.cancel();

      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();
    });

    it('应该能够立即执行', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn.flush();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该传递参数', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('arg1', 'arg2');
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('throttle', () => {
    it('应该限制执行频率', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      throttledFn();
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该支持禁用前缘执行', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100, { leading: false });

      throttledFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该支持禁用后缘执行', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100, { trailing: false });

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该能够取消执行', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn.cancel();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1); // 只有第一次前缘执行
    });

    it('应该传递参数', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn('arg1', 'arg2');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('delay', () => {
    it('应该延迟指定时间', async () => {
      const promise = delay(100);
      vi.advanceTimersByTime(100);
      await promise;
      expect(true).toBe(true);
    });
  });

  describe('batch', () => {
    it('应该批量执行函数', () => {
      const fn = vi.fn();
      const batchedFn = batch(fn, 100);

      batchedFn('arg1');
      batchedFn('arg2');
      batchedFn('arg3');

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith([['arg1'], ['arg2'], ['arg3']]);
    });

    it('应该重置定时器', () => {
      const fn = vi.fn();
      const batchedFn = batch(fn, 100);

      batchedFn('arg1');
      vi.advanceTimersByTime(50);
      batchedFn('arg2');
      vi.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
