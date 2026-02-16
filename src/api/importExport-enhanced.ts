/**
 * 增强版下载模板方法
 * 包含完整的文件日志记录
 */

import { fileLogger } from '@/utils/file-logger';
import { logger } from '@/utils/logger';

const MODULE = 'ImportExportApi.downloadTemplate';

export interface DownloadTemplateParams {
  templateType: 'teacher' | 'subject' | 'curriculum' | 'all';
}

export async function downloadTemplateEnhanced(params: DownloadTemplateParams): Promise<void> {
  const startTime = performance.now();

  await fileLogger.info(MODULE, '========== 开始下载模板 ==========', { templateType: params.templateType });
  logger.info('调用下载导入模板 API - 请求开始', { templateType: params.templateType });

  try {
    // 构建下载 URL
    const url = `/api/import-export/template?templateType=${params.templateType}`;
    await fileLogger.debug(MODULE, '构建下载 URL', { url });

    // 检查是否在 Tauri 环境中
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
    await fileLogger.info(MODULE, '环境检测完成', {
      isTauri: !!isTauri,
      hasWindow: typeof window !== 'undefined',
      hasTauriAPI: !!(window as any).__TAURI__
    });

    if (isTauri) {
      await fileLogger.info(MODULE, '========== 进入 Tauri 模式 ==========');

      // 重要提示：由于 Tauri 1.5 的 dialog.save() API 存在阻塞问题，
      // 我们在 Tauri 环境下也使用浏览器的标准下载机制
      await fileLogger.warn(MODULE, 'Tauri 环境检测到，但使用浏览器下载机制以避免对话框阻塞');

      // 使用浏览器标准下载（与浏览器模式相同）
      const link = document.createElement('a');
      link.href = url;
      link.download = '排课系统导入模板.xlsx';
      link.style.display = 'none';
      document.body.appendChild(link);

      await fileLogger.debug(MODULE, '触发下载链接点击');
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        fileLogger.debug(MODULE, '下载链接已移除').catch(() => {});
      }, 100);

      await fileLogger.info(MODULE, 'Tauri 环境下的浏览器下载已触发');
    } else {
      // 浏览器模式
      await fileLogger.info(MODULE, '========== 进入浏览器模式 ==========');

      const link = document.createElement('a');
      link.href = url;
      link.download = '排课系统导入模板.xlsx';
      link.style.display = 'none';
      document.body.appendChild(link);

      await fileLogger.debug(MODULE, '触发下载链接点击');
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        fileLogger.debug(MODULE, '下载链接已移除').catch(() => {});
      }, 100);

      await fileLogger.info(MODULE, '浏览器下载已触发');
    }

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    await fileLogger.info(MODULE, '========== 下载完成 ==========', {
      responseTime: `${responseTime}ms`,
      templateType: params.templateType,
    });

    logger.info('下载导入模板 API - 下载成功', {
      responseTime: `${responseTime}ms`,
      templateType: params.templateType,
    });
  } catch (error: any) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    await fileLogger.error(MODULE, '========== 下载失败 ==========', {
      responseTime: `${responseTime}ms`,
      templateType: params.templateType,
      error: error.message,
      stack: error.stack,
    });

    logger.error('下载导入模板 API - 请求异常', {
      responseTime: `${responseTime}ms`,
      templateType: params.templateType,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }
}
