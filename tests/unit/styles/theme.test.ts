/**
 * 全局样式和主题系统测试
 * 验证 CSS 变量、主题切换和样式工具类的功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@/styles/index.css';

describe('全局样式和主题系统', () => {
  let testElement: HTMLDivElement;

  beforeEach(() => {
    // 创建测试元素
    testElement = document.createElement('div');
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    // 清理测试元素
    document.body.removeChild(testElement);
    // 重置主题为亮色
    document.documentElement.classList.remove('dark');
  });

  describe('CSS 变量定义', () => {
    it('应该正确定义亮色主题的 CSS 变量', () => {
      const styles = getComputedStyle(document.documentElement);

      // 验证主色调
      expect(styles.getPropertyValue('--color-primary').trim()).toBe('#409eff');
      expect(styles.getPropertyValue('--color-success').trim()).toBe('#67c23a');
      expect(styles.getPropertyValue('--color-warning').trim()).toBe('#e6a23c');
      expect(styles.getPropertyValue('--color-danger').trim()).toBe('#f56c6c');

      // 验证字体设置
      expect(styles.getPropertyValue('--font-size-base').trim()).toBe('14px');
      expect(styles.getPropertyValue('--font-weight-normal').trim()).toBe('400');

      // 验证间距设置
      expect(styles.getPropertyValue('--spacing-sm').trim()).toBe('8px');
      expect(styles.getPropertyValue('--spacing-md').trim()).toBe('12px');
      expect(styles.getPropertyValue('--spacing-lg').trim()).toBe('16px');
    });

    it('应该正确定义暗色主题的 CSS 变量', () => {
      // 切换到暗色主题
      document.documentElement.classList.add('dark');

      const styles = getComputedStyle(document.documentElement);

      // 验证暗色主题的文本颜色
      expect(styles.getPropertyValue('--color-text-primary').trim()).toBe('#e5eaf3');

      // 验证暗色主题的背景颜色
      expect(styles.getPropertyValue('--color-bg-base').trim()).toBe('#1d1e1f');
      expect(styles.getPropertyValue('--color-bg-page').trim()).toBe('#141414');
    });
  });

  describe('主题切换功能', () => {
    it('应该能够切换到暗色主题', () => {
      // 初始状态应该是亮色主题
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // 切换到暗色主题
      document.documentElement.classList.add('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // 验证暗色主题的样式变量
      const styles = getComputedStyle(document.documentElement);
      expect(styles.getPropertyValue('--color-bg-page').trim()).toBe('#141414');
    });

    it('应该能够从暗色主题切换回亮色主题', () => {
      // 先切换到暗色主题
      document.documentElement.classList.add('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // 切换回亮色主题
      document.documentElement.classList.remove('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // 验证亮色主题的样式变量
      const styles = getComputedStyle(document.documentElement);
      expect(styles.getPropertyValue('--color-bg-page').trim()).toBe('#f5f7fa');
    });
  });

  describe('通用工具类 - 文本对齐', () => {
    it('应该正确应用文本居中样式', () => {
      testElement.className = 'text-center';
      const styles = getComputedStyle(testElement);
      expect(styles.textAlign).toBe('center');
    });

    it('应该正确应用文本左对齐样式', () => {
      testElement.className = 'text-left';
      const styles = getComputedStyle(testElement);
      expect(styles.textAlign).toBe('left');
    });

    it('应该正确应用文本右对齐样式', () => {
      testElement.className = 'text-right';
      const styles = getComputedStyle(testElement);
      expect(styles.textAlign).toBe('right');
    });
  });

  describe('通用工具类 - Flex 布局', () => {
    it('应该正确应用 flex 布局', () => {
      testElement.className = 'flex';
      const styles = getComputedStyle(testElement);
      expect(styles.display).toBe('flex');
    });

    it('应该正确应用 flex 居中布局', () => {
      testElement.className = 'flex-center';
      const styles = getComputedStyle(testElement);
      expect(styles.display).toBe('flex');
      expect(styles.alignItems).toBe('center');
      expect(styles.justifyContent).toBe('center');
    });

    it('应该正确应用 flex 两端对齐布局', () => {
      testElement.className = 'flex-between';
      const styles = getComputedStyle(testElement);
      expect(styles.display).toBe('flex');
      expect(styles.alignItems).toBe('center');
      expect(styles.justifyContent).toBe('space-between');
    });

    it('应该正确应用 flex 列布局', () => {
      testElement.className = 'flex-column';
      const styles = getComputedStyle(testElement);
      expect(styles.display).toBe('flex');
      expect(styles.flexDirection).toBe('column');
    });
  });

  describe('通用工具类 - 外边距', () => {
    it('应该正确应用小号外边距', () => {
      testElement.className = 'mt-sm';
      const styles = getComputedStyle(testElement);
      expect(styles.marginTop).toBe('8px');
    });

    it('应该正确应用中号外边距', () => {
      testElement.className = 'mb-md';
      const styles = getComputedStyle(testElement);
      expect(styles.marginBottom).toBe('12px');
    });

    it('应该正确应用大号外边距', () => {
      testElement.className = 'ml-lg';
      const styles = getComputedStyle(testElement);
      expect(styles.marginLeft).toBe('16px');
    });

    it('应该正确应用超大号外边距', () => {
      testElement.className = 'mr-xl';
      const styles = getComputedStyle(testElement);
      expect(styles.marginRight).toBe('20px');
    });
  });

  describe('通用工具类 - 内边距', () => {
    it('应该正确应用小号内边距', () => {
      testElement.className = 'p-sm';
      const styles = getComputedStyle(testElement);
      expect(styles.padding).toBe('8px');
    });

    it('应该正确应用中号内边距', () => {
      testElement.className = 'p-md';
      const styles = getComputedStyle(testElement);
      expect(styles.padding).toBe('12px');
    });

    it('应该正确应用大号内边距', () => {
      testElement.className = 'p-lg';
      const styles = getComputedStyle(testElement);
      expect(styles.padding).toBe('16px');
    });
  });

  describe('通用工具类 - 文本样式', () => {
    it('应该正确应用文本颜色', () => {
      testElement.className = 'text-primary';
      const styles = getComputedStyle(testElement);
      const primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-text-primary').trim();
      expect(styles.color).toBe(primaryColor);
    });

    it('应该正确应用字体大小', () => {
      testElement.className = 'text-large';
      const styles = getComputedStyle(testElement);
      expect(styles.fontSize).toBe('16px');
    });

    it('应该正确应用字体粗细', () => {
      testElement.className = 'font-bold';
      const styles = getComputedStyle(testElement);
      expect(styles.fontWeight).toBe('700');
    });

    it('应该正确应用文本省略样式', () => {
      testElement.className = 'text-ellipsis';
      const styles = getComputedStyle(testElement);
      expect(styles.overflow).toBe('hidden');
      expect(styles.textOverflow).toBe('ellipsis');
      expect(styles.whiteSpace).toBe('nowrap');
    });
  });

  describe('通用工具类 - 显示和隐藏', () => {
    it('应该正确隐藏元素', () => {
      testElement.className = 'hidden';
      const styles = getComputedStyle(testElement);
      expect(styles.display).toBe('none');
    });

    it('应该正确应用块级显示', () => {
      testElement.className = 'block';
      const styles = getComputedStyle(testElement);
      expect(styles.display).toBe('block');
    });

    it('应该正确应用行内块显示', () => {
      testElement.className = 'inline-block';
      const styles = getComputedStyle(testElement);
      expect(styles.display).toBe('inline-block');
    });
  });

  describe('通用工具类 - 宽度和高度', () => {
    it('应该正确应用全宽样式', () => {
      testElement.className = 'w-full';
      const styles = getComputedStyle(testElement);
      expect(styles.width).toBe('100%');
    });

    it('应该正确应用全高样式', () => {
      testElement.className = 'h-full';
      const styles = getComputedStyle(testElement);
      expect(styles.height).toBe('100%');
    });
  });

  describe('通用工具类 - 圆角', () => {
    it('应该正确应用基础圆角', () => {
      testElement.className = 'rounded';
      const styles = getComputedStyle(testElement);
      expect(styles.borderRadius).toBe('4px');
    });

    it('应该正确应用大号圆角', () => {
      testElement.className = 'rounded-lg';
      const styles = getComputedStyle(testElement);
      expect(styles.borderRadius).toBe('8px');
    });

    it('应该正确应用完全圆角', () => {
      testElement.className = 'rounded-full';
      const styles = getComputedStyle(testElement);
      expect(styles.borderRadius).toBe('50%');
    });
  });

  describe('响应式设计', () => {
    it('应该在移动设备上调整字体大小', () => {
      // 模拟移动设备视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      // 触发 resize 事件
      window.dispatchEvent(new Event('resize'));

      // 注意：在测试环境中，媒体查询可能不会自动应用
      // 这里主要验证样式规则的存在性
      const styleSheets = Array.from(document.styleSheets);
      const hasMediaQuery = styleSheets.some(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          return rules.some(rule =>
            rule instanceof CSSMediaRule &&
            rule.conditionText.includes('max-width: 767px')
          );
        } catch {
          return false;
        }
      });

      // 验证媒体查询规则存在
      expect(hasMediaQuery).toBe(true);
    });
  });
});
