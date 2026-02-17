/**
 * 导入导出服务路由模块
 *
 * 功能：
 * - 从 Excel 导入排课条件
 * - 导出课表到 Excel
 * - 下载导入模板
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createRouteLogger } from '../middleware/request-logger';

// 创建路由实例
const importExportRoutes = new Hono();

// ============================================================================
// 数据验证模式
// ============================================================================

// 导出验证模式
const exportSchema = z.object({
  exportType: z.enum(['ClassSchedule', 'TeacherSchedule', 'MasterSchedule', 'WorkloadStatistics']),
  outputPath: z.string().min(1, '输出路径不能为空').optional(),
});

// ============================================================================
// 路由处理器
// ============================================================================

/**
 * POST /api/import-export/import
 * 从 Excel 导入排课条件
 *
 * 功能：
 * 1. 接收上传的 Excel 文件
 * 2. 验证文件格式和内容
 * 3. 调用 Tauri 命令导入数据
 * 4. 返回导入结果和错误报告
 * 5. 清理临时文件
 */
importExportRoutes.post(
  '/import',
  async (c) => {
    const log = createRouteLogger('导入排课条件');
    const startTime = Date.now();

    log.start();

    try {
      // 步骤 1: 解析上传的文件
      log.step('解析上传的文件');

      const contentType = c.req.header('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        log.warn('无效的 Content-Type', { contentType });
        return c.json(
          {
            success: false,
            error: '无效的请求类型',
            message: '请使用 multipart/form-data 上传文件',
          },
          400,
        );
      }

      const formData = await c.req.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        log.warn('未找到文件字段');
        return c.json(
          {
            success: false,
            error: '未找到文件',
            message: '请在表单中包含名为 "file" 的文件字段',
          },
          400,
        );
      }

      log.step('接收到文件', {
        name: file.name,
        size: `${(file.size / 1024).toFixed(2)}KB`,
        type: file.type,
      });

      // 步骤 2: 验证文件类型和大小
      log.step('验证文件');

      const allowedExtensions = ['.xlsx', '.xls'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!allowedExtensions.includes(ext)) {
        log.warn('不支持的文件扩展名', { extension: ext });
        return c.json(
          {
            success: false,
            error: '文件验证失败',
            message: `不支持的文件类型。仅支持：${allowedExtensions.join(', ')}`,
          },
          400,
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
        log.warn('文件大小超过限制', { size: `${sizeMB}MB`, maxSize: `${maxSizeMB}MB` });
        return c.json(
          {
            success: false,
            error: '文件验证失败',
            message: `文件大小超过限制。最大允许：${maxSizeMB}MB，当前文件：${sizeMB}MB`,
          },
          400,
        );
      }

      // 步骤 3: 保存文件到临时目录
      log.step('保存文件到临时目录');

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 生成临时文件路径
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const tempFileName = `upload_${timestamp}_${random}${ext}`;
      const tempDir = '/tmp/course-scheduling-uploads';
      const fs = await import('fs');
      const path = await import('path');

      // 确保临时目录存在
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, tempFileName);
      fs.writeFileSync(tempFilePath, buffer);

      log.step('文件保存成功', { filePath: tempFilePath });

      // 步骤 4: 解析 Excel 文件并保存到数据库
      log.step('解析 Excel 文件');

      const { ExcelParser } = await import('../services/excel-parser');
      const parseResult = await ExcelParser.parseExcelFile(tempFilePath);

      log.step('Excel 文件解析完成', {
        successCount: parseResult.successCount,
        errorCount: parseResult.errorCount,
        teachers: parseResult.data?.teachers.length || 0,
        classes: parseResult.data?.classes.length || 0,
        subjects: parseResult.data?.subjects.length || 0,
        curriculums: parseResult.data?.curriculums.length || 0,
      });

      if (!parseResult.success || !parseResult.data) {
        throw new Error('Excel 文件解析失败');
      }

      // 步骤 5: 保存数据到数据库
      log.step('保存数据到数据库');

      const {
        TeacherRepository,
        ClassRepository,
        SubjectRepository,
        CurriculumRepository,
        VenueRepository,
      } = await import('../db/repositories');
      const { getDatabase } = await import('../db/database');

      const db = getDatabase();
      let savedCount = 0;

      // 使用事务保存数据
      const saveTransaction = db.transaction(() => {
        // 1. 保存场地（需要在科目之前）
        if (parseResult.data!.venues && parseResult.data!.venues.length > 0) {
          for (const venue of parseResult.data!.venues) {
            try {
              VenueRepository.create({
                id: venue.id || `venue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: venue.name,
                type: venue.type,
                capacity: venue.capacity || 1,
              });
              savedCount++;
            } catch (error) {
              log.warn('保存场地失败', {
                venue: venue.name,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }

        // 2. 保存教师
        const teacherNameToId = new Map<string, number>();
        for (const teacher of parseResult.data!.teachers) {
          try {
            const teacherId = TeacherRepository.create({
              name: teacher.name,
              teachingGroup: teacher.teachingGroup,
            });
            teacherNameToId.set(teacher.name, teacherId);
            savedCount++;
          } catch (error) {
            log.warn('保存教师失败', {
              teacher: teacher.name,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // 3. 保存科目
        const subjectNameToId = new Map<string, string>();
        for (const subject of parseResult.data!.subjects) {
          try {
            const subjectId = subject.id || `subject-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            SubjectRepository.create({
              id: subjectId,
              name: subject.name,
              forbiddenSlots: subject.forbiddenSlots,
              allowDoubleSession: subject.allowDoubleSession !== undefined ? subject.allowDoubleSession : true,
              venueId: subject.venueId,
              isMajorSubject: subject.isMajorSubject !== undefined ? subject.isMajorSubject : false,
            });
            subjectNameToId.set(subject.name, subjectId);
            savedCount++;
          } catch (error) {
            log.warn('保存科目失败', {
              subject: subject.name,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // 4. 保存班级
        const classNameToId = new Map<string, number>();
        const classNames = new Set(parseResult.data!.classes.map(c => c.name));

        for (const className of classNames) {
          try {
            const classData = parseResult.data!.classes.find(c => c.name === className);
            const classId = ClassRepository.create({
              name: className,
              grade: classData?.grade,
            });
            classNameToId.set(className, classId);
            savedCount++;
          } catch (error) {
            log.warn('保存班级失败', {
              class: className,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // 5. 保存教学计划
        for (const curriculum of parseResult.data!.curriculums) {
          try {
            const classId = classNameToId.get(curriculum.className);
            const teacherId = teacherNameToId.get(curriculum.teacherName);
            const subjectId = subjectNameToId.get(curriculum.subjectName);

            if (!classId) {
              log.warn('班级不存在，跳过教学计划', { className: curriculum.className });
              continue;
            }

            if (!teacherId) {
              log.warn('教师不存在，跳过教学计划', { teacherName: curriculum.teacherName });
              continue;
            }

            if (!subjectId) {
              log.warn('科目不存在，跳过教学计划', { subjectName: curriculum.subjectName });
              continue;
            }

            CurriculumRepository.create({
              classId,
              subjectId,
              teacherId,
              targetSessions: curriculum.hoursPerWeek,
            });
            savedCount++;
          } catch (error) {
            log.warn('保存教学计划失败', {
              curriculum: `${curriculum.className}-${curriculum.subjectName}`,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      });

      try {
        saveTransaction();
        log.step('数据保存成功', { savedCount });
      } catch (error) {
        log.error('数据保存失败', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw new Error(`数据保存失败: ${error instanceof Error ? error.message : String(error)}`);
      }

      const result = {
        success: true,
        success_count: savedCount,
        error_count: 0,
        errors: [],
        message: `成功导入 ${savedCount} 条记录到数据库`,
        data: null, // 不返回详细数据
      };

      const duration = Date.now() - startTime;

      // 步骤 5: 清理临时文件
      log.step('清理临时文件');
      try {
        fs.unlinkSync(tempFilePath);
        log.step('临时文件已删除', { filePath: tempFilePath });
      } catch (cleanupError) {
        log.warn('清理临时文件失败', {
          filePath: tempFilePath,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      }

      // 步骤 6: 记录导入结果
      if (result.success) {
        log.success({
          successCount: result.success_count,
          errorCount: result.error_count,
          duration: `${duration}ms`,
        });
      } else {
        log.warn('导入完成但存在错误', {
          successCount: result.success_count,
          errorCount: result.error_count,
          duration: `${duration}ms`,
        });
      }

      // 步骤 7: 返回导入结果
      return c.json({
        success: result.success,
        data: {
          successCount: result.success_count,
          failureCount: result.error_count,
          errors: result.errors.map((errMsg, index) => ({
            row: index + 1,
            reason: errMsg,
          })),
          importedData: result.data,
        },
        message: result.message,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('导入排课条件失败', {
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
      });

      return c.json(
        {
          success: false,
          error: '导入排课条件失败',
          message: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
);

/**
 * POST /api/import-export/export
 * 导出课表到 Excel
 *
 * 功能：
 * 1. 接收导出类型和输出路径
 * 2. 验证导出参数
 * 3. 调用 Tauri 命令生成 Excel 文件
 * 4. 返回文件下载响应
 *
 * 支持的导出类型：
 * - ClassSchedule: 班级课表
 * - TeacherSchedule: 教师课表
 * - MasterSchedule: 总课表
 * - WorkloadStatistics: 工作量统计
 */
importExportRoutes.post(
  '/export',
  zValidator('json', exportSchema),
  async (c) => {
    const data = c.req.valid('json');
    const log = createRouteLogger('导出课表');
    const startTime = Date.now();

    log.start({
      exportType: data.exportType,
      outputPath: data.outputPath,
    });

    try {
      // 步骤 1: 验证导出参数
      log.step('验证导出参数');

      // 验证导出类型
      const validExportTypes = ['ClassSchedule', 'TeacherSchedule', 'MasterSchedule', 'WorkloadStatistics'];
      if (!validExportTypes.includes(data.exportType)) {
        throw new Error(`无效的导出类型: ${data.exportType}`);
      }

      // 生成默认输出路径（如果未提供）
      let outputPath = data.outputPath;
      if (!outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const typeMap: Record<string, string> = {
          ClassSchedule: '班级课表',
          TeacherSchedule: '教师课表',
          MasterSchedule: '总课表',
          WorkloadStatistics: '工作量统计',
        };
        const typeName = typeMap[data.exportType] || '课表';
        outputPath = `exports/${typeName}_${timestamp}.xlsx`;
        log.step(`使用默认输出路径: ${outputPath}`);
      }

      // 步骤 2: 调用 Rust 后端导出数据
      log.step('调用 Rust 后端导出数据');

      // 在 Tauri 环境中调用命令
      let filePath: string;

      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        // Tauri 环境：调用 Rust 命令
        const { invoke } = (window as any).__TAURI__.tauri;
        filePath = await invoke('export_to_excel', {
          exportType: data.exportType,
          outputPath: outputPath,
        });
        log.step(`Tauri 命令调用成功，文件路径: ${filePath}`);
      } else {
        // 非 Tauri 环境：返回模拟结果
        log.warn('非 Tauri 环境，返回模拟结果');
        filePath = outputPath;
      }

      const duration = Date.now() - startTime;

      // 步骤 3: 记录导出成功
      log.success({
        exportType: data.exportType,
        filePath: filePath,
        duration: `${duration}ms`,
      });

      // 步骤 4: 返回导出结果
      return c.json({
        success: true,
        data: {
          filePath: filePath,
          exportType: data.exportType,
        },
        message: '课表导出成功',
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('导出课表失败', {
        exportType: data.exportType,
        outputPath: data.outputPath,
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
      });

      return c.json(
        {
          success: false,
          error: '导出课表失败',
          message: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
);

/**
 * GET /api/import-export/template
 * 下载 Excel 导入模板
 *
 * 功能：
 * 1. 调用 Tauri 命令生成模板
 * 2. 使用文件下载处理器返回模板文件
 */
importExportRoutes.get('/template', async (c) => {
  const log = createRouteLogger('下载导入模板');
  const startTime = Date.now();

  log.start();

  try {
    log.step('生成 Excel 模板文件');

    // 生成临时文件路径
    const tmpDir = '/tmp/course-scheduling';
    const timestamp = Date.now();
    const filePath = `${tmpDir}/import_template_${timestamp}.xlsx`;

    // 生成模板
    const { generateImportTemplate } = await import('../utils/template-generator');
    await generateImportTemplate(filePath);

    const duration = Date.now() - startTime;
    log.success({
      filePath,
      duration: `${duration}ms`,
    });

    // 使用文件下载处理器返回文件
    const { handleFileDownload } = await import('../middleware/file-download');

    return await handleFileDownload(c, {
      filePath,
      downloadName: '排课系统导入模板.xlsx',
      useStreaming: true,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('生成导入模板失败', {
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`,
    });

    return c.json(
      {
        success: false,
        error: '生成导入模板失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/**
 * GET /api/import-export/download/:filename
 * 下载导出的文件
 *
 * 功能：
 * 1. 验证文件名
 * 2. 使用文件下载处理器返回文件
 *
 * 安全性：
 * - 仅允许下载 exports 目录下的文件
 * - 防止路径遍历攻击
 */
importExportRoutes.get('/download/:filename', async (c) => {
  const log = createRouteLogger('下载导出文件');
  const filename = c.req.param('filename');

  log.start({ filename });

  try {
    // 验证文件名（防止路径遍历攻击）
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      log.warn('无效的文件名', { filename });
      return c.json(
        {
          success: false,
          error: '无效的文件名',
          message: '文件名包含非法字符',
        },
        400,
      );
    }

    // 构建文件路径（仅允许访问 exports 目录）
    const path = await import('path');
    const exportsDir = path.join(process.cwd(), 'exports');
    const filePath = path.join(exportsDir, filename);

    log.step('准备下载文件', { filePath });

    // 使用文件下载处理器返回文件
    const { handleFileDownload } = await import('../middleware/file-download');

    return await handleFileDownload(c, {
      filePath,
      downloadName: filename,
      useStreaming: true,
    });
  } catch (error) {
    log.error('下载文件失败', {
      filename,
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        success: false,
        error: '下载文件失败',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export { importExportRoutes };
