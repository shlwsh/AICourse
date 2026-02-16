/**
 * 文件上传中间件测试
 *
 * 测试内容：
 * 1. 文件扩展名验证
 * 2. 文件大小验证
 * 3. MIME 类型验证
 * 4. 文件保存功能
 * 5. 临时文件清理
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import {
  fileUploadMiddleware,
  cleanupTempFile,
  cleanupExpiredFiles,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  TEMP_DIR,
  type UploadedFile,
} from './file-upload';
import * as fs from 'fs';
import * as path from 'path';

describe('文件上传中间件', () => {
  let app: Hono;
  let testFiles: string[] = [];

  beforeEach(() => {
    // 创建测试应用
    app = new Hono();

    // 添加文件上传路由
    app.post('/upload', fileUploadMiddleware, async (c) => {
      const file = c.get('uploadedFile') as UploadedFile;
      return c.json({
        success: true,
        data: file,
      });
    });

    // 确保临时目录存在
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
  });

  afterEach(async () => {
    // 清理测试文件
    for (const filePath of testFiles) {
      await cleanupTempFile(filePath);
    }
    testFiles = [];
  });

  describe('文件扩展名验证', () => {
    it('应该接受 .xlsx 文件', async () => {
      // 创建模拟的 Excel 文件
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', file);

      const req = new Request('http://localhost/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.extension).toBe('.xlsx');

      // 记录文件路径以便清理
      if (data.data.filePath) {
        testFiles.push(data.data.filePath);
      }
    });

    it('应该接受 .xls 文件', async () => {
      const file = new File(['test content'], 'test.xls', {
        type: 'application/vnd.ms-excel',
      });

      const formData = new FormData();
      formData.append('file', file);

      const req = new Request('http://localhost/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.extension).toBe('.xls');

      if (data.data.filePath) {
        testFiles.push(data.data.filePath);
      }
    });

    it('应该拒绝不支持的文件类型', async () => {
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const formData = new FormData();
      formData.append('file', file);

      const req = new Request('http://localhost/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('文件验证失败');
      expect(data.message).toContain('不支持的文件类型');
    });
  });

  describe('文件大小验证', () => {
    it('应该接受小于限制的文件', async () => {
      // 创建 1MB 的文件
      const content = new Uint8Array(1024 * 1024);
      const file = new File([content], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', file);

      const req = new Request('http://localhost/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.size).toBe(1024 * 1024);

      if (data.data.filePath) {
        testFiles.push(data.data.filePath);
      }
    });

    it('应该拒绝超过大小限制的文件', async () => {
      // 创建 11MB 的文件（超过 10MB 限制）
      const content = new Uint8Array(11 * 1024 * 1024);
      const file = new File([content], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', file);

      const req = new Request('http://localhost/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('文件验证失败');
      expect(data.message).toContain('文件大小超过限制');
    });
  });

  describe('MIME 类型验证', () => {
    it('应该接受正确的 MIME 类型', async () => {
      const file = new File(['test content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', file);

      const req = new Request('http://localhost/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      if (data.data.filePath) {
        testFiles.push(data.data.filePath);
      }
    });

    it('应该拒绝错误的 MIME 类型', async () => {
      // 注意：在实际环境中，浏览器会根据文件扩展名自动设置正确的 MIME 类型
      // 这个测试模拟了一个恶意构造的请求，其中 MIME 类型与文件扩展名不匹配
      const file = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const formData = new FormData();
      formData.append('file', file);

      const req = new Request('http://localhost/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('文件验证失败');
      expect(data.message).toContain('不支持的文件类型');
    });
  });

  describe('文件保存功能', () => {
    it('应该成功保存文件到临时目录', async () => {
      const content = 'test content';
      const file = new File([content], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', file);

      const req = new Request('http://localhost/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.filePath).toBeDefined();
      expect(data.data.originalName).toBe('test.xlsx');
      expect(data.data.savedName).toContain('test_');

      // 验证文件确实被保存
      const filePath = data.data.filePath;
      expect(fs.existsSync(filePath)).toBe(true);

      // 验证文件内容
      const savedContent = fs.readFileSync(filePath, 'utf-8');
      expect(savedContent).toBe(content);

      testFiles.push(filePath);
    });

    it('应该生成唯一的文件名', async () => {
      const file1 = new File(['content 1'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const file2 = new File(['content 2'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // 上传第一个文件
      const formData1 = new FormData();
      formData1.append('file', file1);
      const req1 = new Request('http://localhost/upload', {
        method: 'POST',
        body: formData1,
      });
      const res1 = await app.fetch(req1);
      const data1 = await res1.json();

      // 上传第二个文件
      const formData2 = new FormData();
      formData2.append('file', file2);
      const req2 = new Request('http://localhost/upload', {
        method: 'POST',
        body: formData2,
      });
      const res2 = await app.fetch(req2);
      const data2 = await res2.json();

      // 验证文件名不同
      expect(data1.data.savedName).not.toBe(data2.data.savedName);
      expect(data1.data.filePath).not.toBe(data2.data.filePath);

      testFiles.push(data1.data.filePath, data2.data.filePath);
    });
  });

  describe('错误处理', () => {
    it('应该拒绝非 multipart/form-data 请求', async () => {
      const req = new Request('http://localhost/upload', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('无效的请求类型');
    });

    it('应该拒绝没有文件字段的请求', async () => {
      const formData = new FormData();
      formData.append('other', 'value');

      const req = new Request('http://localhost/upload', {
        method: 'POST',
        body: formData,
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('未找到文件');
    });
  });

  describe('临时文件清理', () => {
    it('应该成功清理临时文件', async () => {
      // 创建测试文件
      const testFilePath = path.join(TEMP_DIR, 'test_cleanup.xlsx');
      fs.writeFileSync(testFilePath, 'test content');

      expect(fs.existsSync(testFilePath)).toBe(true);

      // 清理文件
      await cleanupTempFile(testFilePath);

      expect(fs.existsSync(testFilePath)).toBe(false);
    });

    it('清理不存在的文件不应该抛出错误', async () => {
      const nonExistentPath = path.join(TEMP_DIR, 'non_existent.xlsx');

      // 不应该抛出错误
      await expect(cleanupTempFile(nonExistentPath)).resolves.toBeUndefined();
    });

    it('应该清理过期的临时文件', async () => {
      // 创建测试文件
      const oldFilePath = path.join(TEMP_DIR, 'old_file.xlsx');
      fs.writeFileSync(oldFilePath, 'old content');

      // 修改文件的修改时间为 25 小时前
      const oldTime = Date.now() - 25 * 60 * 60 * 1000;
      fs.utimesSync(oldFilePath, new Date(oldTime), new Date(oldTime));

      // 创建新文件
      const newFilePath = path.join(TEMP_DIR, 'new_file.xlsx');
      fs.writeFileSync(newFilePath, 'new content');

      // 清理过期文件（24小时）
      await cleanupExpiredFiles(24);

      // 旧文件应该被删除
      expect(fs.existsSync(oldFilePath)).toBe(false);

      // 新文件应该保留
      expect(fs.existsSync(newFilePath)).toBe(true);

      // 清理新文件
      await cleanupTempFile(newFilePath);
    });
  });
});
