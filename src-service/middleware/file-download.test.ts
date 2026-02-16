/**
 * 文件下载中间件测试
 *
 * 测试内容：
 * 1. 文件下载基本功能
 * 2. Content-Type 和 Content-Disposition 头设置
 * 3. 文件流式传输
 * 4. 文件不存在的错误处理
 * 5. 中文文件名支持
 * 6. 不同文件类型的 MIME 类型推断
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  handleFileDownload,
  createFileDownloadMiddleware,
  FileDownloadOptions,
  MIME_TYPES,
} from './file-download';

// ============================================================================
// 测试设置
// ============================================================================

// 测试临时目录
const TEST_DIR = path.join(os.tmpdir(), 'file-download-test');

// 测试文件路径
const TEST_FILES = {
  excel: path.join(TEST_DIR, 'test.xlsx'),
  pdf: path.join(TEST_DIR, 'test.pdf'),
  text: path.join(TEST_DIR, 'test.txt'),
  chinese: path.join(TEST_DIR, '测试文件.xlsx'),
};

/**
 * 创建测试文件
 */
function createTestFiles() {
  // 创建测试目录
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  // 创建测试文件
  fs.writeFileSync(TEST_FILES.excel, Buffer.from('Excel file content'));
  fs.writeFileSync(TEST_FILES.pdf, Buffer.from('PDF file content'));
  fs.writeFileSync(TEST_FILES.text, 'Text file content');
  fs.writeFileSync(TEST_FILES.chinese, Buffer.from('Chinese filename file'));
}

/**
 * 清理测试文件
 */
function cleanupTestFiles() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

/**
 * 创建模拟的 Hono 上下文
 */
function createMockContext(): any {
  return {
    req: {
      param: (name: string) => '',
      query: (name: string) => '',
    },
    json: (data: any, status?: number) => {
      return new Response(JSON.stringify(data), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}

// ============================================================================
// 测试套件
// ============================================================================

describe('文件下载中间件', () => {
  beforeAll(() => {
    console.log('创建测试文件...');
    createTestFiles();
  });

  afterAll(() => {
    console.log('清理测试文件...');
    cleanupTestFiles();
  });

  // ==========================================================================
  // 基本功能测试
  // ==========================================================================

  describe('基本功能', () => {
    it('应该成功下载存在的文件', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.excel,
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe(MIME_TYPES['.xlsx']);
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('test.xlsx');
    });

    it('应该返回 404 错误当文件不存在时', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: path.join(TEST_DIR, 'nonexistent.xlsx'),
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('FILE_NOT_FOUND');
    });

    it('应该使用自定义下载文件名', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.excel,
        downloadName: 'custom-name.xlsx',
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('custom-name.xlsx');
    });
  });

  // ==========================================================================
  // Content-Type 测试
  // ==========================================================================

  describe('Content-Type 头设置', () => {
    it('应该为 Excel 文件设置正确的 MIME 类型', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.excel,
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      expect(response.headers.get('Content-Type')).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('应该为 PDF 文件设置正确的 MIME 类型', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.pdf,
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      expect(response.headers.get('Content-Type')).toBe('application/pdf');
    });

    it('应该为文本文件设置正确的 MIME 类型', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.text,
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      expect(response.headers.get('Content-Type')).toBe('text/plain');
    });

    it('应该支持自定义 MIME 类型', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.excel,
        mimeType: 'application/custom',
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      expect(response.headers.get('Content-Type')).toBe('application/custom');
    });
  });

  // ==========================================================================
  // Content-Disposition 测试
  // ==========================================================================

  describe('Content-Disposition 头设置', () => {
    it('应该默认使用 attachment 模式', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.excel,
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      const disposition = response.headers.get('Content-Disposition');
      expect(disposition).toContain('attachment');
    });

    it('应该支持 inline 模式', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.pdf,
        inline: true,
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      const disposition = response.headers.get('Content-Disposition');
      expect(disposition).toContain('inline');
    });

    it('应该正确编码中文文件名', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.chinese,
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      const disposition = response.headers.get('Content-Disposition');
      expect(disposition).toContain('filename*=UTF-8');
      expect(disposition).toContain(encodeURIComponent('测试文件.xlsx'));
    });

    it('应该正确编码特殊字符文件名', async () => {
      const specialFile = path.join(TEST_DIR, 'file with spaces & special.xlsx');
      fs.writeFileSync(specialFile, Buffer.from('Special file'));

      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: specialFile,
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      const disposition = response.headers.get('Content-Disposition');
      expect(disposition).toContain('filename*=UTF-8');
      expect(disposition).toContain(encodeURIComponent('file with spaces & special.xlsx'));

      // 清理
      fs.unlinkSync(specialFile);
    });
  });

  // ==========================================================================
  // 流式传输测试
  // ==========================================================================

  describe('文件流式传输', () => {
    it('应该支持流式传输', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.excel,
        useStreaming: true,
      };

      const response = await handleFileDownload(c, options);

      expect(response.status).toBe(200);
      expect(response.body).toBeTruthy();

      // 读取流内容
      const reader = response.body!.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('应该支持非流式传输', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.excel,
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      expect(response.status).toBe(200);

      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it('应该设置正确的 Content-Length 头', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.excel,
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      const contentLength = response.headers.get('Content-Length');
      expect(contentLength).toBeTruthy();

      const stats = fs.statSync(TEST_FILES.excel);
      expect(parseInt(contentLength!)).toBe(stats.size);
    });
  });

  // ==========================================================================
  // 错误处理测试
  // ==========================================================================

  describe('错误处理', () => {
    it('应该处理文件不存在的情况', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: path.join(TEST_DIR, 'nonexistent.xlsx'),
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('FILE_NOT_FOUND');
      expect(data.message).toContain('文件不存在');
    });

    it('应该处理路径是目录的情况', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_DIR,
        useStreaming: false,
      };

      const response = await handleFileDownload(c, options);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('NOT_A_FILE');
    });

    it('应该处理文件不可读的情况', async () => {
      // 创建一个不可读的文件（仅在 Unix 系统上有效）
      if (process.platform !== 'win32') {
        const unreadableFile = path.join(TEST_DIR, 'unreadable.xlsx');
        fs.writeFileSync(unreadableFile, Buffer.from('Unreadable file'));
        fs.chmodSync(unreadableFile, 0o000);

        const c = createMockContext();
        const options: FileDownloadOptions = {
          filePath: unreadableFile,
          useStreaming: false,
        };

        const response = await handleFileDownload(c, options);

        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data.success).toBe(false);

        // 清理
        fs.chmodSync(unreadableFile, 0o644);
        fs.unlinkSync(unreadableFile);
      }
    });
  });

  // ==========================================================================
  // 中间件工厂测试
  // ==========================================================================

  describe('中间件工厂', () => {
    it('应该创建可用的下载中间件', async () => {
      const app = new Hono();

      app.get(
        '/download/:filename',
        createFileDownloadMiddleware(
          (c) => path.join(TEST_DIR, c.req.param('filename')),
          (c) => ({ downloadName: c.req.param('filename') })
        )
      );

      // 模拟请求
      const mockContext: any = {
        req: {
          param: (name: string) => (name === 'filename' ? 'test.xlsx' : ''),
          query: () => '',
        },
        json: (data: any, status?: number) => {
          return new Response(JSON.stringify(data), {
            status: status || 200,
            headers: { 'Content-Type': 'application/json' },
          });
        },
      };

      const middleware = createFileDownloadMiddleware(
        (c) => path.join(TEST_DIR, c.req.param('filename')),
        (c) => ({ downloadName: c.req.param('filename') })
      );

      const response = await middleware(mockContext);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('test.xlsx');
    });
  });

  // ==========================================================================
  // 性能测试
  // ==========================================================================

  describe('性能测试', () => {
    it('应该在合理时间内完成小文件下载', async () => {
      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: TEST_FILES.excel,
        useStreaming: false,
      };

      const startTime = Date.now();
      const response = await handleFileDownload(c, options);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100); // 应该在 100ms 内完成
    });

    it('应该在合理时间内完成大文件流式传输', async () => {
      // 创建一个较大的测试文件（1MB）
      const largeFile = path.join(TEST_DIR, 'large.xlsx');
      const largeBuffer = Buffer.alloc(1024 * 1024, 'x');
      fs.writeFileSync(largeFile, largeBuffer);

      const c = createMockContext();
      const options: FileDownloadOptions = {
        filePath: largeFile,
        useStreaming: true,
      };

      const startTime = Date.now();
      const response = await handleFileDownload(c, options);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500); // 应该在 500ms 内开始传输

      // 清理
      fs.unlinkSync(largeFile);
    });
  });

  // ==========================================================================
  // 集成测试
  // ==========================================================================

  describe('集成测试', () => {
    it('应该与 Hono 路由集成工作', async () => {
      const app = new Hono();

      app.get('/download/excel', async (c) => {
        return await handleFileDownload(c, {
          filePath: TEST_FILES.excel,
          downloadName: '班级课表.xlsx',
          useStreaming: false,
        });
      });

      // 创建模拟请求
      const req = new Request('http://localhost/download/excel');
      const response = await app.fetch(req);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe(MIME_TYPES['.xlsx']);
      expect(response.headers.get('Content-Disposition')).toContain(
        encodeURIComponent('班级课表.xlsx')
      );
    });

    it('应该正确处理多个并发下载请求', async () => {
      const c = createMockContext();

      const promises = Array.from({ length: 10 }, () =>
        handleFileDownload(c, {
          filePath: TEST_FILES.excel,
          useStreaming: false,
        })
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
