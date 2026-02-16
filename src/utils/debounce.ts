/**
 * 防抖和节流函数模块
 *
 * 功能：
 * - 防抖（debounce）：延迟执行，多次触发只执行最后一次
 * - 节流（throttle）：限制执行频率，固定时间内只执行一次
 * - 支持立即执行模式
 * - 支持取消执行
 *
 * 使用示例：
 * ```typescript
 * import { debounce, throttle } from '@/utils/debounce';
 *
 * // 防抖：用户停止输入 500ms 后执行搜索
 * const handleSearch = debounce((keyword: string) => {
 *   console.log('搜索:', keyword);
 * }, 500);
 *
 * // 节流：滚动事件每 200ms 最多执行一次
 * const handleScroll = throttle(() => {
 *   console.log('滚动位置:', window.scrollY);
 * }, 200);
 * ```
 */

import { logger } from './logger';

/**
 * 防抖函数类型
 */
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel(): void;
  flush(): void;
}

/**
 * 节流函数类型
 */
export interface ThrottledFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel(): void;
}

/**
 * 防抖函数
 *
 * 在事件被触发 n 秒后再执行回调，如果在这 n 秒内又被触发，则重新计时。
 * 适用场景：搜索框输入、窗口 resize、表单验证等
 *
 * @param func - 要防抖的函数
 * @param wait - 等待时间（毫秒）
 * @param immediate - 是否立即执行（默认 false）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300,
  immediate: boolean = false,
): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  // 清理定时器
  const clearTimer = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  // 执行函数
  const invoke = () => {
    if (lastArgs !== null && lastThis !== null) {
      try {
        func.apply(lastThis, lastArgs);
        logger.debug('防抖函数执行', { wait, immediate });
      } catch (error) {
        logger.error('防抖函数执行失败', { error });
      }
      lastArgs = null;
      lastThis = null;
    }
  };

  // 防抖函数
  const debounced = function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    // 立即执行模式
    if (immediate && timeout === null) {
      invoke();
    }

    // 清除之前的定时器
    clearTimer();

    // 设置新的定时器
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) {
        invoke();
      }
    }, wait);
  } as DebouncedFunction<T>;

  // 取消执行
  debounced.cancel = () => {
    clearTimer();
    lastArgs = null;
    lastThis = null;
    logger.debug('防抖函数已取消');
  };

  // 立即执行
  debounced.flush = () => {
    clearTimer();
    invoke();
    logger.debug('防抖函数立即执行');
  };

  return debounced;
}

/**
 * 节流函数
 *
 * 规定在一个单位时间内，只能触发一次函数。如果这个单位时间内触发多次函数，只有一次生效。
 * 适用场景：滚动事件、鼠标移动、按钮点击等
 *
 * @param func - 要节流的函数
 * @param wait - 等待时间（毫秒）
 * @param options - 配置选项
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300,
  options: {
    /** 是否在开始时执行（默认 true） */
    leading?: boolean;
    /** 是否在结束时执行（默认 true） */
    trailing?: boolean;
  } = {},
): ThrottledFunction<T> {
  const { leading = true, trailing = true } = options;

  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime: number = 0;

  // 清理定时器
  const clearTimer = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  // 执行函数
  const invoke = (time: number) => {
    if (lastArgs !== null && lastThis !== null) {
      try {
        func.apply(lastThis, lastArgs);
        logger.debug('节流函数执行', { wait, leading, trailing });
      } catch (error) {
        logger.error('节流函数执行失败', { error });
      }
      lastInvokeTime = time;
      lastArgs = null;
      lastThis = null;
    }
  };

  // 计算剩余等待时间
  const remainingWait = (time: number) => {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastInvoke;

    return Math.max(timeWaiting, 0);
  };

  // 是否应该执行
  const shouldInvoke = (time: number) => {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    // 首次调用或超过等待时间
    return (
      lastCallTime === null ||
      timeSinceLastCall >= wait ||
      timeSinceLastInvoke >= wait ||
      timeSinceLastCall < 0
    );
  };

  // 定时器回调
  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // 重新设置定时器
    timeout = setTimeout(timerExpired, remainingWait(time));
  };

  // 前缘执行
  const leadingEdge = (time: number) => {
    lastInvokeTime = time;
    timeout = setTimeout(timerExpired, wait);
    return leading ? invoke(time) : undefined;
  };

  // 后缘执行
  const trailingEdge = (time: number) => {
    timeout = null;

    if (trailing && lastArgs !== null) {
      return invoke(time);
    }

    lastArgs = null;
    lastThis = null;
  };

  // 节流函数
  const throttled = function (this: any, ...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(time);
      }
    }

    if (timeout === null) {
      timeout = setTimeout(timerExpired, wait);
    }
  } as ThrottledFunction<T>;

  // 取消执行
  throttled.cancel = () => {
    clearTimer();
    lastArgs = null;
    lastThis = null;
    lastCallTime = null;
    lastInvokeTime = 0;
    logger.debug('节流函数已取消');
  };

  return throttled;
}

/**
 * 请求动画帧节流
 *
 * 使用 requestAnimationFrame 实现的节流，适用于动画和视觉更新
 *
 * @param func - 要节流的函数
 * @returns 节流后的函数
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T,
): ThrottledFunction<T> {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs !== null && lastThis !== null) {
          try {
            func.apply(lastThis, lastArgs);
            logger.debug('RAF 节流函数执行');
          } catch (error) {
            logger.error('RAF 节流函数执行失败', { error });
          }
        }
        rafId = null;
        lastArgs = null;
        lastThis = null;
      });
    }
  } as ThrottledFunction<T>;

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastArgs = null;
    lastThis = null;
    logger.debug('RAF 节流函数已取消');
  };

  return throttled;
}

/**
 * 延迟执行
 *
 * 简单的延迟执行函数，返回 Promise
 *
 * @param ms - 延迟时间（毫秒）
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 批量执行
 *
 * 将多次调用合并为一次批量执行
 *
 * @param func - 批量执行的函数，接收所有调用的参数数组
 * @param wait - 等待时间（毫秒）
 * @returns 批量执行函数
 */
export function batch<T extends any[]>(
  func: (argsList: T[]) => void,
  wait: number = 100,
): (...args: T) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let argsList: T[] = [];

  return (...args: T) => {
    argsList.push(args);

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      try {
        func(argsList);
        logger.debug('批量执行函数', { count: argsList.length });
      } catch (error) {
        logger.error('批量执行函数失败', { error });
      }
      argsList = [];
      timeout = null;
    }, wait);
  };
}
