/**
 * 导入导出路由测试
 *
 * 测试内容：
 * - POST /api/import-export/import - 导入排课条件
 * - POST /api/import-export/export - 导出课表
 * - GET /api/import-export/template - 下载导入模板
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { importExportRoutes } from './import-export';

// 创建测试应用
const app = new Hono();
app.route('/api/import-export', importExportRoutes);

describe('导入导出路由测试', () => {
  describe('POST /api/import-export/import', () => {
    test('应该成功接收文件上传请求', async () => {
      // 创建模拟的 Excel 文件
      const file = new File(['test content'], 'import.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', file);

      const response = await app.request('/api/import-export/import', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.successCount).toBeDefined();
      expect(data.data.errorCount).toBeDefined();
      expect(data.data.errors).toBeInstanceOf(Array);
    });

    test('应该拒绝非 multipart/form-data 请求', async () => {
      const response = await app.request('/api/import-export/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: '/path/to/import.xlsx',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('无效的请求类型');
    });

    test('应该拒绝没有文件字段的请求', async () => {
      const formData = new FormData();
      formData.append('other', 'value');

      const response = await app.request('/api/import-export/import', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('未找到文件');
    });

    test('应该返回正确的响应格式', async () => {
      const file = new File(['test content'], 'import.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', file);

      const response = await app.request('/api/import-export/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      // 验证响应结构
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('message');

      // 验证数据结构
      expect(data.data).toHaveProperty('successCount');
      expect(data.data).toHaveProperty('errorCount');
      expect(data.data).toHaveProperty('errors');

      // 验证数据类型
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.data.successCount).toBe('number');
      expect(typeof data.data.errorCount).toBe('number');
      expect(Array.isArray(data.data.errors)).toBe(true);
      expect(typeof data.message).toBe('string');
    });
  });

  describe('POST /api/import-export/export', () => {
    test('应该成功接收导出请求 - 班级课表', async () => {
      const response = await app.request('/api/import-export/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exportType: 'ClassSchedule',
          outputPath: '/path/to/export.xlsx',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.filePath).toBeDefined();
      expect(data.data.exportType).toBe('ClassSchedule');
    });

    test('应该成功接收导出请求 - 教师课表', async () => {
      const response = await app.request('/api/import-export/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exportType: 'TeacherSchedule',
          outputPath: '/path/to/export.xlsx',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.exportType).toBe('TeacherSchedule');
    });

    test('应该成功接收导出请求 - 总课表', async () => {
      const response = await app.request('/api/import-export/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exportType: 'MasterSchedule',
          outputPath: '/path/to/export.xlsx',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.exportType).toBe('MasterSchedule');
    });

    test('应该成功接收导出请求 - 工作量统计', async () => {
      const response = await app.request('/api/import-export/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exportType: 'WorkloadStatistics',
          outputPath: '/path/to/export.xlsx',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.exportType).toBe('WorkloadStatistics');
    });

    test('应该拒绝无效的导出类型', async () => {
      const response = await app.request('/api/import-export/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exportType: 'InvalidType',
          outputPath: '/path/to/export.xlsx',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('应该允许省略输出路径', async () => {
      const response = await app.request('/api/import-export/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exportType: 'ClassSchedule',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.filePath).toBeDefined();
      // 验证默认路径包含导出类型名称
      expect(data.data.filePath).toContain('班级课表');
    });

    test('应该为不同导出类型生成不同的默认文件名', async () => {
      const exportTypes = ['ClassSchedule', 'TeacherSchedule', 'MasterSchedule', 'WorkloadStatistics'];
      const expectedNames = ['班级课表', '教师课表', '总课表', '工作量统计'];

      for (let i = 0; i < exportTypes.length; i++) {
        const response = await app.request('/api/import-export/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            exportType: exportTypes[i],
          }),
        });

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.filePath).toContain(expectedNames[i]);
      }
    });

    test('应该返回正确的响应格式', async () => {
      const response = await app.request('/api/import-export/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exportType: 'ClassSchedule',
          outputPath: '/path/to/export.xlsx',
        }),
      });

      const data = await response.json();

      // 验证响应结构
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('message');

      // 验证数据结构
      expect(data.data).toHaveProperty('filePath');
      expect(data.data).toHaveProperty('exportType');

      // 验证数据类型
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.data.filePath).toBe('string');
      expect(typeof data.data.exportType).toBe('string');
      expect(typeof data.message).toBe('string');
    });

    test('应该拒绝缺少导出类型的请求', async () => {
      const response = await app.request('/api/import-export/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outputPath: '/path/to/export.xlsx',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('应该正确处理空字符串输出路径', async () => {
      const response = await app.request('/api/import-export/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exportType: 'ClassSchedule',
          outputPath: '',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/import-export/template', () => {
    test('应该成功获取导入模板', async () => {
      const response = await app.request('/api/import-export/template', {
        method: 'GET',
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.filePath).toBeDefined();
    });

    test('应该返回正确的响应格式', async () => {
      const response = await app.request('/api/import-export/template', {
        method: 'GET',
      });

      const data = await response.json();

      // 验证响应结构
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('message');

      // 验证数据结构
      expect(data.data).toHaveProperty('filePath');

      // 验证数据类型
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.data.filePath).toBe('string');
      expect(typeof data.message).toBe('string');
    });
  });
});
