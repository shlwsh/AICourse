/**
 * CourseCard 组件单元测试
 * 测试课程卡片组件的核心功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import CourseCard from '@/components/schedule/CourseCard.vue';
import type { TimeSlot } from '@/stores/scheduleStore';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CourseCard 组件', () => {
  const mockTimeSlot: TimeSlot = { day: 0, period: 0 };

  const defaultProps = {
    classId: 1,
    subjectId: 'math',
    teacherId: 101,
    subjectName: '数学',
    teacherName: '张老师',
    className: '一年级1班',
  };

  const mountOptions = {
    global: {
      stubs: {
        ElIcon: true,
      },
    },
  };

  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('基础渲染', () => {
    it('应该正确渲染课程卡片', () => {
      wrapper = mount(CourseCard, {
        props: defaultProps,
        ...mountOptions,
      });

      expect(wrapper.find('.course-card').exists()).toBe(true);
      expect(wrapper.find('.course-subject').text()).toBe('数学');
      expect(wrapper.find('.course-teacher').text()).toBe('张老师');
    });

    it('应该根据 showTeacher 属性控制教师显示', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, showTeacher: false },
        ...mountOptions,
      });

      expect(wrapper.find('.course-teacher').exists()).toBe(false);
    });

    it('应该根据 showClass 属性控制班级显示', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, showClass: true },
        ...mountOptions,
      });

      expect(wrapper.find('.course-class').exists()).toBe(true);
      expect(wrapper.find('.course-class').text()).toBe('一年级1班');
    });

    it('应该根据 showTimeSlot 属性控制时间槽位显示', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, showTimeSlot: true, timeSlot: mockTimeSlot },
        ...mountOptions,
      });

      expect(wrapper.find('.course-time').exists()).toBe(true);
      expect(wrapper.find('.course-time').text()).toContain('星期一');
      expect(wrapper.find('.course-time').text()).toContain('第1节');
    });
  });

  describe('尺寸变体', () => {
    it('应该正确应用 small 尺寸样式', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, size: 'small' },
        ...mountOptions,
      });

      expect(wrapper.find('.course-card').classes()).toContain('size-small');
    });

    it('应该正确应用 default 尺寸样式', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, size: 'default' },
        ...mountOptions,
      });

      expect(wrapper.find('.course-card').classes()).toContain('size-default');
    });

    it('应该正确应用 large 尺寸样式', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, size: 'large' },
        ...mountOptions,
      });

      expect(wrapper.find('.course-card').classes()).toContain('size-large');
    });
  });

  describe('固定课程', () => {
    it('应该显示固定课程图标', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, isFixed: true },
        ...mountOptions,
      });

      expect(wrapper.find('.fixed-icon').exists()).toBe(true);
      expect(wrapper.find('.course-card').classes()).toContain('fixed');
    });

    it('固定课程不应该可拖拽', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, isFixed: true, draggable: true },
        ...mountOptions,
      });

      expect(wrapper.find('.course-card').attributes('draggable')).toBe('false');
    });
  });

  describe('单双周标记', () => {
    it('应该显示单周标记', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, weekType: 'Odd' },
        ...mountOptions,
      });

      expect(wrapper.find('.week-type-badge').exists()).toBe(true);
      expect(wrapper.find('.week-type-badge').text()).toBe('单');
    });

    it('应该显示双周标记', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, weekType: 'Even' },
        ...mountOptions,
      });

      expect(wrapper.find('.week-type-badge').exists()).toBe(true);
      expect(wrapper.find('.week-type-badge').text()).toBe('双');
    });

    it('每周课程不应该显示标记', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, weekType: 'Every' },
        ...mountOptions,
      });

      expect(wrapper.find('.week-type-badge').exists()).toBe(false);
    });
  });

  describe('拖拽功能', () => {
    it('可拖拽的卡片应该设置 draggable 属性', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, draggable: true },
        ...mountOptions,
      });

      expect(wrapper.find('.course-card').attributes('draggable')).toBe('true');
      expect(wrapper.find('.course-card').classes()).toContain('draggable');
    });

    it('不可拖拽的卡片不应该设置 draggable 属性', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, draggable: false },
        ...mountOptions,
      });

      expect(wrapper.find('.course-card').attributes('draggable')).toBe('false');
    });

    it('拖拽开始应该触发 dragStart 事件', async () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, draggable: true, timeSlot: mockTimeSlot },
        ...mountOptions,
      });

      await wrapper.find('.course-card').trigger('dragstart');

      expect(wrapper.emitted('dragStart')).toBeTruthy();
      expect(wrapper.emitted('dragStart')?.[0]).toEqual([
        defaultProps.classId,
        defaultProps.subjectId,
        defaultProps.teacherId,
        mockTimeSlot,
      ]);
    });

    it('拖拽结束应该触发 dragEnd 事件', async () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, draggable: true },
        ...mountOptions,
      });

      await wrapper.find('.course-card').trigger('dragend');

      expect(wrapper.emitted('dragEnd')).toBeTruthy();
    });
  });

  describe('状态样式', () => {
    it('选中状态应该添加 selected 样式类', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, isSelected: true },
        ...mountOptions,
      });

      expect(wrapper.find('.course-card').classes()).toContain('selected');
    });

    it('悬停状态应该添加 hovering 样式类', () => {
      wrapper = mount(CourseCard, {
        props: { ...defaultProps, isHovering: true },
        ...mountOptions,
      });

      expect(wrapper.find('.course-card').classes()).toContain('hovering');
    });
  });

  describe('点击事件', () => {
    it('点击卡片应该触发 click 事件', async () => {
      wrapper = mount(CourseCard, {
        props: defaultProps,
        ...mountOptions,
      });

      await wrapper.find('.course-card').trigger('click');

      expect(wrapper.emitted('click')).toBeTruthy();
      expect(wrapper.emitted('click')?.[0]).toEqual([
        defaultProps.classId,
        defaultProps.subjectId,
        defaultProps.teacherId,
      ]);
    });
  });

  describe('数据属性', () => {
    it('应该设置正确的 data 属性', () => {
      wrapper = mount(CourseCard, {
        props: defaultProps,
        ...mountOptions,
      });

      const card = wrapper.find('.course-card');
      expect(card.attributes('data-class-id')).toBe(String(defaultProps.classId));
      expect(card.attributes('data-subject-id')).toBe(defaultProps.subjectId);
      expect(card.attributes('data-teacher-id')).toBe(String(defaultProps.teacherId));
    });
  });

  describe('时间槽位标签', () => {
    it('应该正确格式化星期一到星期五', () => {
      const days = [
        { day: 0, expected: '星期一' },
        { day: 1, expected: '星期二' },
        { day: 2, expected: '星期三' },
        { day: 3, expected: '星期四' },
        { day: 4, expected: '星期五' },
      ];

      days.forEach(({ day, expected }) => {
        wrapper = mount(CourseCard, {
          props: {
            ...defaultProps,
            showTimeSlot: true,
            timeSlot: { day, period: 0 },
          },
          ...mountOptions,
        });

        expect(wrapper.find('.course-time').text()).toContain(expected);
      });
    });

    it('应该正确格式化超过7天的日期', () => {
      wrapper = mount(CourseCard, {
        props: {
          ...defaultProps,
          showTimeSlot: true,
          timeSlot: { day: 10, period: 0 },
        },
        ...mountOptions,
      });

      expect(wrapper.find('.course-time').text()).toContain('第11天');
    });

    it('应该正确显示节次', () => {
      wrapper = mount(CourseCard, {
        props: {
          ...defaultProps,
          showTimeSlot: true,
          timeSlot: { day: 0, period: 3 },
        },
        ...mountOptions,
      });

      expect(wrapper.find('.course-time').text()).toContain('第4节');
    });
  });
});
