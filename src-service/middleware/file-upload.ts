/**
 * 文件上传中间件模块
 *
 * 功能：
 * - 处理文件上传请求
 * - 验证文件类型和大小
 * - 保存文件到临时目录
 * - 返回文件路径供后续处理
 *
 * 支持的文件类型：
 * - Excel 文件：.xlsx, .xls
 *
 * 文件大小限制：
 * - 最大 10MB
 */

import { Context, Next } from 'hono';
import { createLogger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 创建日志记录器
const logger = createLogger('FileUpload');

// ============================================================================
// 配置常量
// ============================================================================

/**
 * 支持的文件扩展名
 */
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

/**
 * 支持的 MIME 类型
 */
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

/**
 * 最大文件大小（字节）
 * 默认：10MB
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * 临时文件目录
 */
const TEMP_DIR = path.join(os.tmpdir(), 'course-scheduling-uploads');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 上传文件信息
 */
export interface UploadedFile {
  /** 原始文件名 */
  originalName: string;
  /** 保存的文件名 */
  savedName: string;
  /** 文件路径 */
  filePath: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME 类型 */
  mimeType: string;
  /** 文件扩展名 */
  extension: string;
}

/**
 * 文件验证错误
 */
export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 确保临时目录存在
 */
function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    logger.info('创建临时目录', { path: TEMP_DIR });
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * 生成唯一文件名
 * @param originalName 原始文件名
 * @returns 唯一文件名
 */
function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  return `${baseName}_${timestamp}_${random}${ext}`;
}

/**
 * 验证文件扩展名
 * @param fileName 文件名
 * @throws {FileValidationError} 如果扩展名不支持
 */
function validateFileExtension(fileName: string): void {
  const ext = path.extname(fileName).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    logger.warn('不支持的文件扩展名', {
      fileName,
      extension: ext,
      allowedExtensions: ALLOWED_EXTENSIONS,
    });
    throw new FileValidationError(
      `不支持的文件类型。仅支持：${ALLOWED_EXTENSIONS.join(', ')}`
    );
  }

  logger.debug('文件扩展名验证通过', { fileName, extension: ext });
}

/**
 * 验证文件大小
 * @param size 文件大小（字节）
 * @throws {FileValidationError} 如果文件过大
 */
function validateFileSize(size: number): void {
  if (size > MAX_FILE_SIZE) {
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(2);

    logger.warn('文件大小超过限制', {
      size: `${sizeMB}MB`,
      maxSize: `${maxSizeMB}MB`,
    });

    throw new FileValidationError(
      `文件大小超过限制。最大允许：${maxSizeMB}MB，当前文件：${sizeMB}MB`
    );
  }

  logger.debug('文件大小验证通过', {
    size: `${(size / (1024 * 1024)).toFixed(2)}MB`,
  });
}

/**
 * 验证 MIME 类型
 * @param mimeType MIME 类型
 * @throws {FileValidationError} 如果 MIME 类型不支持
 */
function validateMimeType(mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    logger.warn('不支持的 MIME 类型', {
      mimeType,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
    throw new FileValidationError(
      `不支持的文件类型。MIME 类型：${mimeType}`
    );
  }

  logger.debug('MIME 类型验证通过', { mimeType });
}

/**
 * 保存上传的文件
 * @param file 文件数据
 * @param originalName 原始文件名
 * @returns 上传文件信息
 */
async function saveUploadedFile(
  file: Buffer,
  originalName: string,
  mimeType: string
): Promise<UploadedFile> {
  // 确保临时目录存在
  ensureTempDir();

  // 生成唯一文件名
  const savedName = generateUniqueFileName(originalName);
  const filePath = path.join(TEMP_DIR, savedName);

  logger.info('保存上传文件', {
    originalName,
    savedName,
    filePath,
    size: `${(file.length / 1024).toFixed(2)}KB`,
  });

  // 写入文件
  await fs.promises.writeFile(filePath, file);

  logger.info('文件保存成功', { filePath });

  return {
    originalName,
    savedName,
    filePath,
    size: file.length,
    mimeType,
    extension: path.extname(originalName).toLowerCase(),
  };
}

// ============================================================================
// 中间件函数
// ============================================================================

/**
 * 文件上传中间件
 *
 * 功能：
 * 1. 解析上传的文件
 * 2. 验证文件类型和大小
 * 3. 保存文件到临时目录
 * 4. 将文件信息添加到上下文
 *
 * 使用方式：
 * ```typescript
 * app.post('/upload', fileUploadMiddleware, async (c) => {
 *   const file = c.get('uploadedFile');
 *   // 处理文件...
 * });
 * ```
 */
export async function fileUploadMiddleware(c: Context, next: Next) {
  const requestId = c.get('requestId') || 'unknown';

  logger.info('开始处理文件上传', { requestId });

  try {
    // 步骤 1: 获取请求体
    const contentType = c.req.header('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      logger.warn('无效的 Content-Type', { contentType });
      return c.json(
        {
          success: false,
          error: '无效的请求类型',
          message: '请使用 multipart/form-data 上传文件',
        },
        400
      );
    }

    // 步骤 2: 解析表单数据
    logger.debug('解析表单数据');
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      logger.warn('未找到文件字段');
      return c.json(
        {
          success: false,
          error: '未找到文件',
          message: '请在表单中包含名为 "file" 的文件字段',
        },
        400
      );
    }

    logger.info('接收到文件', {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)}KB`,
      type: file.type,
    });

    // 步骤 3: 验证文件
    logger.debug('验证文件');

    try {
      validateFileExtension(file.name);
      validateFileSize(file.size);
      validateMimeType(file.type);
    } catch (error) {
      if (error instanceof FileValidationError) {
        logger.warn('文件验证失败', { error: error.message });
        return c.json(
          {
            success: false,
            error: '文件验证失败',
            message: error.message,
          },
          400
        );
      }
      throw error;
    }

    // 步骤 4: 读取文件内容
    logger.debug('读取文件内容');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 步骤 5: 保存文件
    logger.debug('保存文件到临时目录');
    const uploadedFile = await saveUploadedFile(buffer, file.name, file.type);

    // 步骤 6: 将文件信息添加到上下文
    c.set('uploadedFile', uploadedFile);

    logger.info('文件上传处理完成', {
      filePath: uploadedFile.filePath,
      size: `${(uploadedFile.size / 1024).toFixed(2)}KB`,
    });

    // 继续处理请求
    await next();
  } catch (error) {
    logger.error('文件上传处理失败', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return c.json(
      {
        success: false,
        error: '文件上传失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

/**
 * 清理临时文件
 * @param filePath 文件路径
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      logger.info('清理临时文件', { filePath });
      await fs.promises.unlink(filePath);
      logger.debug('临时文件已删除', { filePath });
    }
  } catch (error) {
    logger.error('清理临时文件失败', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 清理过期的临时文件
 * @param maxAgeHours 最大保留时间（小时）
 */
export async function cleanupExpiredFiles(maxAgeHours: number = 24): Promise<void> {
  try {
    if (!fs.existsSync(TEMP_DIR)) {
      return;
    }

    logger.info('清理过期临时文件', { maxAgeHours });

    const files = await fs.promises.readdir(TEMP_DIR);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.promises.stat(filePath);

      if (now - stats.mtimeMs > maxAge) {
        await fs.promises.unlink(filePath);
        deletedCount++;
        logger.debug('删除过期文件', { file, age: `${((now - stats.mtimeMs) / (60 * 60 * 1000)).toFixed(2)}小时` });
      }
    }

    logger.info('过期文件清理完成', { deletedCount });
  } catch (error) {
    logger.error('清理过期文件失败', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// 导出
// ============================================================================

export {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  TEMP_DIR,
};
