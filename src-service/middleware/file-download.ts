/**
 * 文件下载中间件模块
 *
 * 功能：
 * - 处理文件下载请求
 * - 设置正确的 Content-Type 和 Content-Disposition 头
 * - 支持文件流式传输
 * - 处理文件不存在的情况
 * - 添加完善的日志记录
 *
 * 支持的文件类型：
 * - Excel 文件：.xlsx, .xls
 * - PDF 文件：.pdf
 * - 图片文件：.png, .jpg, .jpeg
 */

import { Context } from 'hono';
import { createLogger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// 创建日志记录器
const logger = createLogger('FileDownload');

// ============================================================================
// 配置常量
// ============================================================================

/**
 * 支持的文件类型及其 MIME 类型映射
 */
const MIME_TYPES: Record<string, string> = {
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain',
  '.json': 'application/json',
};

/**
 * 默认 MIME 类型
 */
const DEFAULT_MIME_TYPE = 'application/octet-stream';

/**
 * 文件流缓冲区大小（字节）
 * 默认：64KB
 */
const STREAM_BUFFER_SIZE = 64 * 1024;

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 文件下载选项
 */
export interface FileDownloadOptions {
  /** 文件路径 */
  filePath: string;
  /** 下载文件名（可选，默认使用文件路径中的文件名） */
  downloadName?: string;
  /** MIME 类型（可选，自动根据文件扩展名推断） */
  mimeType?: string;
  /** 是否使用流式传输（可选，默认 true） */
  useStreaming?: boolean;
  /** 是否内联显示（可选，默认 false，即下载） */
  inline?: boolean;
}

/**
 * 文件下载错误
 */
export class FileDownloadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'FileDownloadError';
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取文件的 MIME 类型
 * @param filePath 文件路径
 * @param customMimeType 自定义 MIME 类型
 * @returns MIME 类型
 */
function getMimeType(filePath: string, customMimeType?: string): string {
  if (customMimeType) {
    logger.debug('使用自定义 MIME 类型', { mimeType: customMimeType });
    return customMimeType;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || DEFAULT_MIME_TYPE;

  logger.debug('推断 MIME 类型', { extension: ext, mimeType });

  return mimeType;
}

/**
 * 生成 Content-Disposition 头值
 * @param fileName 文件名
 * @param inline 是否内联显示
 * @returns Content-Disposition 头值
 */
function generateContentDisposition(fileName: string, inline: boolean = false): string {
  const disposition = inline ? 'inline' : 'attachment';

  // 对文件名进行 URL 编码以支持中文和特殊字符
  const encodedFileName = encodeURIComponent(fileName);

  // 使用 RFC 5987 格式：filename*=UTF-8''encoded-filename
  const contentDisposition = `${disposition}; filename*=UTF-8''${encodedFileName}`;

  logger.debug('生成 Content-Disposition 头', {
    fileName,
    inline,
    contentDisposition,
  });

  return contentDisposition;
}

/**
 * 验证文件是否存在且可读
 * @param filePath 文件路径
 * @throws {FileDownloadError} 如果文件不存在或不可读
 */
async function validateFile(filePath: string): Promise<void> {
  try {
    // 检查文件是否存在
    const exists = fs.existsSync(filePath);
    if (!exists) {
      logger.warn('文件不存在', { filePath });
      throw new FileDownloadError('文件不存在', 'FILE_NOT_FOUND');
    }

    // 检查是否为文件（而非目录）
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      logger.warn('路径不是文件', { filePath });
      throw new FileDownloadError('路径不是文件', 'NOT_A_FILE');
    }

    // 检查文件是否可读
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      logger.warn('文件不可读', { filePath });
      throw new FileDownloadError('文件不可读', 'FILE_NOT_READABLE');
    }

    logger.debug('文件验证通过', {
      filePath,
      size: `${(stats.size / 1024).toFixed(2)}KB`,
    });
  } catch (error) {
    if (error instanceof FileDownloadError) {
      throw error;
    }
    logger.error('文件验证失败', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new FileDownloadError('文件验证失败', 'VALIDATION_ERROR');
  }
}

/**
 * 使用流式传输发送文件
 * @param c Hono 上下文
 * @param filePath 文件路径
 * @param mimeType MIME 类型
 * @param contentDisposition Content-Disposition 头值
 */
async function streamFile(
  c: Context,
  filePath: string,
  mimeType: string,
  contentDisposition: string,
): Promise<Response> {
  logger.info('使用流式传输发送文件', { filePath });

  try {
    // 获取文件大小
    const stats = await fs.promises.stat(filePath);
    const fileSize = stats.size;

    logger.debug('文件信息', {
      size: `${(fileSize / 1024).toFixed(2)}KB`,
      mimeType,
    });

    // 创建可读流
    const readStream = fs.createReadStream(filePath, {
      highWaterMark: STREAM_BUFFER_SIZE,
    });

    // 创建 ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        readStream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        readStream.on('end', () => {
          controller.close();
          logger.debug('文件流传输完成', { filePath });
        });

        readStream.on('error', (error) => {
          logger.error('文件流传输错误', {
            filePath,
            error: error.message,
          });
          controller.error(error);
        });
      },
      cancel() {
        readStream.destroy();
        logger.debug('文件流已取消', { filePath });
      },
    });

    // 返回响应
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': contentDisposition,
        'Content-Length': fileSize.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    logger.error('流式传输失败', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new FileDownloadError('流式传输失败', 'STREAM_ERROR');
  }
}

/**
 * 一次性读取并发送文件
 * @param c Hono 上下文
 * @param filePath 文件路径
 * @param mimeType MIME 类型
 * @param contentDisposition Content-Disposition 头值
 */
async function sendFile(
  c: Context,
  filePath: string,
  mimeType: string,
  contentDisposition: string,
): Promise<Response> {
  logger.info('一次性读取并发送文件', { filePath });

  try {
    // 读取文件内容
    const fileBuffer = await fs.promises.readFile(filePath);

    logger.debug('文件读取完成', {
      size: `${(fileBuffer.length / 1024).toFixed(2)}KB`,
    });

    // 返回响应
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': contentDisposition,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    logger.error('文件读取失败', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new FileDownloadError('文件读取失败', 'READ_ERROR');
  }
}

// ============================================================================
// 主要函数
// ============================================================================

/**
 * 处理文件下载
 *
 * 功能：
 * 1. 验证文件是否存在且可读
 * 2. 设置正确的 Content-Type 和 Content-Disposition 头
 * 3. 支持文件流式传输
 * 4. 添加完善的日志记录
 *
 * @param c Hono 上下文
 * @param options 文件下载选项
 * @returns 文件下载响应
 *
 * @example
 * ```typescript
 * app.get('/download/:filename', async (c) => {
 *   const filename = c.req.param('filename');
 *   const filePath = path.join('/exports', filename);
 *
 *   return await handleFileDownload(c, {
 *     filePath,
 *     downloadName: filename,
 *     useStreaming: true,
 *   });
 * });
 * ```
 */
export async function handleFileDownload(
  c: Context,
  options: FileDownloadOptions,
): Promise<Response> {
  const startTime = Date.now();
  const { filePath, downloadName, mimeType: customMimeType, useStreaming = true, inline = false } = options;

  logger.info('开始处理文件下载', {
    filePath,
    downloadName,
    useStreaming,
    inline,
  });

  try {
    // 步骤 1: 验证文件
    logger.debug('验证文件');
    await validateFile(filePath);

    // 步骤 2: 确定下载文件名
    const fileName = downloadName || path.basename(filePath);
    logger.debug('确定下载文件名', { fileName });

    // 步骤 3: 确定 MIME 类型
    const mimeType = getMimeType(filePath, customMimeType);

    // 步骤 4: 生成 Content-Disposition 头
    const contentDisposition = generateContentDisposition(fileName, inline);

    // 步骤 5: 发送文件
    let response: Response;
    if (useStreaming) {
      response = await streamFile(c, filePath, mimeType, contentDisposition);
    } else {
      response = await sendFile(c, filePath, mimeType, contentDisposition);
    }

    const duration = Date.now() - startTime;
    logger.info('文件下载处理完成', {
      filePath,
      fileName,
      mimeType,
      duration: `${duration}ms`,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof FileDownloadError) {
      logger.warn('文件下载失败', {
        filePath,
        code: error.code,
        message: error.message,
        duration: `${duration}ms`,
      });

      // 根据错误代码返回适当的 HTTP 状态码
      const statusCode = error.code === 'FILE_NOT_FOUND' ? 404 : 500;

      return c.json(
        {
          success: false,
          error: error.code,
          message: error.message,
        },
        statusCode,
      );
    }

    logger.error('文件下载处理失败', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });

    return c.json(
      {
        success: false,
        error: 'DOWNLOAD_ERROR',
        message: '文件下载失败',
      },
      500,
    );
  }
}

/**
 * 创建文件下载中间件
 *
 * 该中间件从上下文中获取文件路径并处理下载
 *
 * @param filePathGetter 从上下文获取文件路径的函数
 * @param optionsGetter 从上下文获取下载选项的函数（可选）
 * @returns Hono 中间件函数
 *
 * @example
 * ```typescript
 * app.get(
 *   '/download/:filename',
 *   createFileDownloadMiddleware(
 *     (c) => path.join('/exports', c.req.param('filename')),
 *     (c) => ({ downloadName: c.req.param('filename') })
 *   )
 * );
 * ```
 */
export function createFileDownloadMiddleware(
  filePathGetter: (c: Context) => string,
  optionsGetter?: (c: Context) => Partial<Omit<FileDownloadOptions, 'filePath'>>,
) {
  return async (c: Context) => {
    const filePath = filePathGetter(c);
    const additionalOptions = optionsGetter ? optionsGetter(c) : {};

    return await handleFileDownload(c, {
      filePath,
      ...additionalOptions,
    });
  };
}

// ============================================================================
// 导出
// ============================================================================

export { MIME_TYPES, DEFAULT_MIME_TYPE, STREAM_BUFFER_SIZE };
