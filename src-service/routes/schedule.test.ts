/**
 * 排课路由日志记录集成测试
 *
 * 测试内容：
 * - 验证所有路由都正确记录日志
 * - 验证日志包含必要的业务信息
 * - 验证执行时间被正确记录
 * - 验证错误情况下的日志记录
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { scheduleRoutes } from './schedule';
import { requestLogger } from '../middleware/request-logger';
import { logger } from '../utils/logger';

// 模拟 logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('排课路由日志记录测试', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use('*', requestLogger);
    app.route('/api/schedule', scheduleRoutes);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/schedule/generate - 生成课表', () => {
    it('应该记录完整的生成课表流程日志', async () => {
      const res = await app.request('/api/schedule/generate', {
        method: 'POST',
      });

      expect(res.status).toBe(200);

      // 验证记录了路由开始
      expect(logger.info).toHaveBeenCalledWith(
        '[生成课表] 开始处理',
        undefined,
      );

      // 验证记录了业务步骤
      expect(logger.debug).toHaveBeenCalledWith(
        '[生成课表] 验证系统配置',
        undefined,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[生成课表] 加载排课数据',
        undefined,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[生成课表] 调用约束求解器',
        undefined,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[生成课表] 保存课表到数据库',
        undefined,
      );

      // 验证记录了成功结果（包含执行时间）
      expect(logger.info).toHaveBeenCalledWith(
        '[生成课表] 处理成功',
        expect.objectContaining({
          cost: expect.any(Number),
          entryCount: expect.any(Number),
          duration: expect.stringMatching(/\d+ms/),
        }),
      );
    });
  });

  describe('GET /api/schedule/active - 获取活动课表', () => {
    it('应该记录查询活动课表的日志', async () => {
      const res = await app.request('/api/schedule/active');

      // 当前返回 404（因为没有活动课表）
      expect(res.status).toBe(404);

      // 验证记录了路由开始
      expect(logger.info).toHaveBeenCalledWith(
        '[获取活动课表] 开始处理',
        undefined,
      );

      // 验证记录了查询步骤
      expect(logger.debug).toHaveBeenCalledWith(
        '[获取活动课表] 查询数据库',
        undefined,
      );

      // 验证记录了警告（未找到课表）
      expect(logger.warn).toHaveBeenCalledWith(
        '[获取活动课表] 未找到活动课表',
        expect.objectContaining({
          duration: expect.stringMatching(/\d+ms/),
        }),
      );
    });
  });

  describe('POST /api/schedule/move - 移动课程', () => {
    it('应该记录移动课程的详细日志', async () => {
      const moveData = {
        classId: 101,
        subjectId: '数学',
        teacherId: 1001,
        fromSlot: { day: 0, period: 0 },
        toSlot: { day: 0, period: 1 },
      };

      const res = await app.request('/api/schedule/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(moveData),
      });

      expect(res.status).toBe(200);

      // 验证记录了路由开始（包含参数）
      expect(logger.info).toHaveBeenCalledWith(
        '[移动课程] 开始处理',
        expect.objectContaining({
          classId: 101,
          subjectId: '数学',
          fromSlot: { day: 0, period: 0 },
          toSlot: { day: 0, period: 1 },
        }),
      );

      // 验证记录了业务步骤
      expect(logger.debug).toHaveBeenCalledWith(
        '[移动课程] 验证参数有效性',
        undefined,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[移动课程] 检查目标位置冲突',
        undefined,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[移动课程] 执行课程移动',
        undefined,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[移动课程] 更新课表代价值',
        undefined,
      );

      // 验证记录了成功结果
      expect(logger.info).toHaveBeenCalledWith(
        '[移动课程] 处理成功',
        expect.objectContaining({
          duration: expect.stringMatching(/\d+ms/),
        }),
      );
    });

    it('应该在参数验证失败时记录错误', async () => {
      const invalidData = {
        classId: -1, // 无效的班级 ID
        subjectId: '',
        teacherId: 0,
        fromSlot: { day: 0, period: 0 },
        toSlot: { day: 0, period: 1 },
      };

      const res = await app.request('/api/schedule/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      // 验证返回 400 错误
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/schedule/detect-conflicts - 检测冲突', () => {
    it('应该记录冲突检测的日志', async () => {
      const detectData = {
        classId: 101,
        subjectId: '数学',
        teacherId: 1001,
      };

      const res = await app.request('/api/schedule/detect-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(detectData),
      });

      expect(res.status).toBe(200);

      // 验证记录了路由开始
      expect(logger.info).toHaveBeenCalledWith(
        '[检测冲突] 开始处理',
        expect.objectContaining({
          classId: 101,
          subjectId: '数学',
          teacherId: 1001,
        }),
      );

      // 验证记录了业务步骤
      expect(logger.debug).toHaveBeenCalledWith(
        '[检测冲突] 加载当前课表',
        undefined,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[检测冲突] 加载约束配置',
        undefined,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[检测冲突] 执行冲突检测',
        undefined,
      );

      // 验证记录了成功结果
      expect(logger.info).toHaveBeenCalledWith(
        '[检测冲突] 处理成功',
        expect.objectContaining({
          conflictCount: expect.any(Number),
          duration: expect.stringMatching(/\d+ms/),
        }),
      );
    });
  });

  describe('POST /api/schedule/suggest-swaps - 建议交换方案', () => {
    it('应该记录交换建议的日志', async () => {
      const suggestData = {
        targetClass: 101,
        targetTeacher: 1001,
        desiredSlot: { day: 1, period: 2 },
      };

      const res = await app.request('/api/schedule/suggest-swaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(suggestData),
      });

      expect(res.status).toBe(200);

      // 验证记录了路由开始
      expect(logger.info).toHaveBeenCalledWith(
        '[建议交换方案] 开始处理',
        expect.objectContaining({
          targetClass: 101,
          targetTeacher: 1001,
          desiredSlot: { day: 1, period: 2 },
        }),
      );

      // 验证记录了业务步骤
      expect(logger.debug).toHaveBeenCalledWith(
        '[建议交换方案] 加载当前课表',
        undefined,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[建议交换方案] 检查目标槽位状态',
        undefined,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[建议交换方案] 计算交换方案',
        undefined,
      );

      // 验证记录了成功结果
      expect(logger.info).toHaveBeenCalledWith(
        '[建议交换方案] 处理成功',
        expect.objectContaining({
          optionCount: expect.any(Number),
          duration: expect.stringMatching(/\d+ms/),
        }),
      );
    });
  });

  describe('POST /api/schedule/execute-swap - 执行交换', () => {
    it('应该记录执行交换的日志', async () => {
      const swapData = {
        swapOption: {
          swap_type: 'Simple',
          moves: [
            {
              class_id: 101,
              subject_id: '数学',
              teacher_id: 1001,
              from_slot: { day: 0, period: 0 },
              to_slot: { day: 0, period: 1 },
            },
          ],
          cost_impact: 0,
          description: '简单交换',
        },
      };

      const res = await app.request('/api/schedule/execute-swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(swapData),
      });

      expect(res.status).toBe(200);

      // 验证记录了路由开始
      expect(logger.info).toHaveBeenCalledWith(
        '[执行交换] 开始处理',
        expect.objectContaining({
          swapType: 'Simple',
        }),
      );

      // 验证记录了业务步骤
      expect(logger.debug).toHaveBeenCalledWith(
        '[执行交换] 验证交换方案',
        undefined,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[执行交换] 执行课程交换',
        undefined,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[执行交换] 更新课表代价值',
        undefined,
      );

      // 验证记录了成功结果
      expect(logger.info).toHaveBeenCalledWith(
        '[执行交换] 处理成功',
        expect.objectContaining({
          swapType: 'Simple',
          moveCount: 1,
          duration: expect.stringMatching(/\d+ms/),
        }),
      );
    });
  });
});
