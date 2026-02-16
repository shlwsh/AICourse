/**
 * 导入导出相关 API 接口
 * 提供数据导入导出的所有 API 调用方法
 */
import { http, ApiResponse } from './http';
import { logger } from '@/utils/logger';

/**
 * Excel 导入参数接口
 */
export interface ImportFromExcelParams {
  file: File; // Excel 文件
  conflictStrategy?: 'overwrite' | 'skip' | 'merge'; // 冲突处理策略
}

/**
 * Excel 导入结果接口
 */
export interface ImportResult {
  success: boolean;
  successCount: number; // 成功导入的记录数
  failureCount: number; // 失败的记录数
  errors?: ImportError[]; // 错误详情列表
  message?: string;
}

/**
 * 导入错误详情接口
 */
export interface ImportError {
  row: number; // 错误所在行号
  field?: string; // 错误字段
  reason: string; // 错误原因
}

/**
 * Excel 导出参数接口
 */
export interface ExportToExcelParams {
  exportType: 'class' | 'teacher' | 'all'; // 导出类型：班级课表、教师课表、总课表
  targetIds?: number[]; // 目标ID列表（班级ID或教师ID）
  includeWorkload?: boolean; // 是否包含工作量统计
  templateStyle?: string; // 模板样式
}

/**
 * Excel 导出结果接口
 */
export interface ExportResult {
  success: boolean;
  fileUrl?: string; // 导出文件的下载URL
  fileName?: string; // 导出文件名
  message?: string;
  error?: string;
}

/**
 * 模板下载参数接口
 */
export interface DownloadTemplateParams {
  templateType: 'teacher' | 'subject' | 'curriculum' | 'all'; // 模板类型
}

/**
 * 导入导出 API 类
 */
export class ImportExportApi {
  /**
   * 从 Excel 导入数据
   * @param params 导入参数
   * @returns 导入结果
   */
  static async importFromExcel(
    params: ImportFromExcelParams,
  ): Promise<ApiResponse<ImportResult>> {
    const startTime = performance.now();
    logger.info('调用从 Excel 导入数据 API - 请求开始', {
      fileName: params.file.name,
      fileSize: params.file.size,
      conflictStrategy: params.conflictStrategy || 'skip',
    });

    logger.debug('从 Excel 导入数据 API - 请求参数', {
      fileName: params.file.name,
      fileSize: params.file.size,
      fileType: params.file.type,
      conflictStrategy: params.conflictStrategy,
    });

    try {
      // 创建 FormData 对象
      const formData = new FormData();
      formData.append('file', params.file);
      if (params.conflictStrategy) {
        formData.append('conflictStrategy', params.conflictStrategy);
      }

      // 发送文件上传请求
      const response = await fetch(`${http['baseURL']}/import-export/import`, {
        method: 'POST',
        body: formData,
        // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
      });

      // 解析响应
      const result: ApiResponse<ImportResult> = await response.json();
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (result.success) {
        logger.info('从 Excel 导入数据 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          fileName: params.file.name,
          successCount: result.data?.successCount || 0,
          failureCount: result.data?.failureCount || 0,
        });
      } else {
        logger.error('从 Excel 导入数据 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          fileName: params.file.name,
          error: result.error || result.message,
          failureCount: result.data?.failureCount,
        });
      }

      return result;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('从 Excel 导入数据 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        fileName: params.file.name,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 导出数据到 Excel
   * @param params 导出参数
   * @returns 导出结果
   */
  static async exportToExcel(
    params: ExportToExcelParams,
  ): Promise<ApiResponse<ExportResult>> {
    const startTime = performance.now();
    logger.info('调用导出数据到 Excel API - 请求开始', {
      exportType: params.exportType,
      targetCount: params.targetIds?.length || 0,
      includeWorkload: params.includeWorkload,
      templateStyle: params.templateStyle,
    });

    logger.debug('导出数据到 Excel API - 请求参数', {
      params,
    });

    try {
      const response = await http.post<ExportResult>(
        '/import-export/export',
        params,
      );
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('导出数据到 Excel API - 响应成功', {
          responseTime: `${responseTime}ms`,
          exportType: params.exportType,
          fileName: response.data?.fileName,
          fileUrl: response.data?.fileUrl,
        });
      } else {
        logger.error('导出数据到 Excel API - 响应失败', {
          responseTime: `${responseTime}ms`,
          exportType: params.exportType,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('导出数据到 Excel API - 请求异常', {
        responseTime: `${responseTime}ms`,
        exportType: params.exportType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 下载导入模板
   * @param params 模板下载参数
   * @returns 模板文件的下载URL
   */
  static async downloadTemplate(
    params: DownloadTemplateParams,
  ): Promise<ApiResponse<{ fileUrl: string; fileName: string }>> {
    const startTime = performance.now();
    logger.info('调用下载导入模板 API - 请求开始', {
      templateType: params.templateType,
    });

    logger.debug('下载导入模板 API - 请求参数', {
      params,
    });

    try {
      const response = await http.get<{ fileUrl: string; fileName: string }>(
        '/import-export/template',
        {
          params: {
            templateType: params.templateType,
          },
        },
      );
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (response.success) {
        logger.info('下载导入模板 API - 响应成功', {
          responseTime: `${responseTime}ms`,
          templateType: params.templateType,
          fileName: response.data?.fileName,
          fileUrl: response.data?.fileUrl,
        });
      } else {
        logger.error('下载导入模板 API - 响应失败', {
          responseTime: `${responseTime}ms`,
          templateType: params.templateType,
          error: response.error || response.message,
        });
      }

      return response;
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('下载导入模板 API - 请求异常', {
        responseTime: `${responseTime}ms`,
        templateType: params.templateType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 触发文件下载
   * @param fileUrl 文件URL
   * @param fileName 文件名
   */
  static triggerDownload(fileUrl: string, fileName: string): void {
    const startTime = performance.now();
    logger.info('触发文件下载 - 开始', {
      fileUrl,
      fileName,
    });

    logger.debug('触发文件下载 - 参数', {
      fileUrl,
      fileName,
    });

    try {
      // 创建隐藏的 a 标签触发下载
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      logger.info('触发文件下载 - 成功', {
        responseTime: `${responseTime}ms`,
        fileName,
      });
      logger.debug('文件下载触发成功', {
        fileName,
      });
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      logger.error('触发文件下载 - 失败', {
        responseTime: `${responseTime}ms`,
        fileName,
        error: error.message,
      });
      throw error;
    }
  }
}

export default ImportExportApi;
