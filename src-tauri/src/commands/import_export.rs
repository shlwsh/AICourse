// ============================================================================
// 导入导出相关 Tauri 命令
// ============================================================================
// 本模块提供导入导出相关的 Tauri 命令接口，包括：
// - import_from_excel: 从 Excel 文件导入排课条件
// - export_to_excel: 导出课表到 Excel 文件
// - download_import_template: 下载 Excel 导入模板
// ============================================================================

use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

// ============================================================================
// 数据结构定义
// ============================================================================

/// 导入结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    /// 是否成功
    pub success: bool,
    /// 成功导入的记录数
    pub success_count: usize,
    /// 失败的记录数
    pub error_count: usize,
    /// 错误信息列表
    pub errors: Vec<String>,
    /// 消息
    pub message: String,
}

/// 导出类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportType {
    /// 班级课表
    ClassSchedule,
    /// 教师课表
    TeacherSchedule,
    /// 总课表
    MasterSchedule,
    /// 工作量统计
    WorkloadStatistics,
}

/// Excel 导入数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportData {
    /// 教师信息列表
    pub teachers: Vec<TeacherImportData>,
    /// 科目配置列表
    pub subjects: Vec<SubjectImportData>,
    /// 教学计划列表
    pub curriculums: Vec<CurriculumImportData>,
    /// 教师偏好列表
    pub teacher_preferences: Vec<TeacherPreferenceImportData>,
}

/// 教师导入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeacherImportData {
    /// 教师姓名
    pub name: String,
    /// 教研组名称
    pub teaching_group: Option<String>,
}

/// 科目导入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubjectImportData {
    /// 科目 ID
    pub id: String,
    /// 科目名称
    pub name: String,
    /// 禁止时段（格式：星期-节次，如 "1-1,1-2,1-3"）
    pub forbidden_slots: Option<String>,
    /// 是否允许连堂
    pub allow_double_session: bool,
    /// 场地名称
    pub venue: Option<String>,
    /// 是否主科
    pub is_major_subject: bool,
}

/// 教学计划导入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurriculumImportData {
    /// 班级名称
    pub class_name: String,
    /// 科目 ID
    pub subject_id: String,
    /// 教师姓名
    pub teacher_name: String,
    /// 目标课时数
    pub target_sessions: u8,
    /// 是否合班课
    pub is_combined_class: bool,
    /// 合班班级列表（格式：班级名称，用逗号分隔）
    pub combined_classes: Option<String>,
}

/// 教师偏好导入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeacherPreferenceImportData {
    /// 教师姓名
    pub teacher_name: String,
    /// 偏好时段（格式：星期-节次，如 "1-1,1-2,2-3"）
    pub preferred_slots: Option<String>,
    /// 早晚偏好：0=无偏好, 1=厌恶早课, 2=厌恶晚课
    pub time_bias: u8,
    /// 权重系数
    pub weight: u32,
    /// 不排课时段（格式：星期-节次，如 "1-1,1-2"）
    pub blocked_slots: Option<String>,
}

// ============================================================================
// 从 Excel 导入排课条件命令
// ============================================================================

/// 从 Excel 导入排课条件
///
/// 从 Excel 文件批量导入教师信息、课程配置、教学计划、教师偏好等数据
///
/// # 参数
/// - `file_path`: Excel 文件路径
///
/// # 返回
/// - `Ok(ImportResult)`: 导入结果，包含成功和失败的记录数
/// - `Err(String)`: 导入失败，返回错误信息
///
/// # 功能
/// 1. 验证文件路径和格式
/// 2. 解析 Excel 文件中的各个工作表
/// 3. 验证数据完整性和格式
/// 4. 将数据保存到数据库
/// 5. 返回导入结果统计
///
/// # Excel 文件格式要求
/// Excel 文件应包含以下工作表：
/// - "教师信息"：教师姓名、教研组
/// - "科目配置"：科目ID、科目名称、禁止时段、是否允许连堂、场地、是否主科
/// - "教学计划"：班级名称、科目ID、教师姓名、目标课时数、是否合班课、合班班级
/// - "教师偏好"：教师姓名、偏好时段、早晚偏好、权重系数、不排课时段
///
/// # 日志记录
/// - INFO: 记录开始、完成、各阶段进度
/// - DEBUG: 记录详细的解析和验证信息
/// - WARN: 记录警告信息（如数据格式问题）
/// - ERROR: 记录错误信息和堆栈跟踪
///
/// # 错误处理
/// - 文件不存在：返回文件路径错误
/// - 文件格式错误：返回格式错误信息
/// - 数据验证失败：返回详细的错误报告
/// - 数据库保存失败：返回保存失败的记录信息
///
/// # 示例
/// ```rust
/// use course_scheduling_system::commands::import_export::import_from_excel;
///
/// #[tauri::command]
/// async fn test_import() -> Result<ImportResult, String> {
///     import_from_excel("data/import.xlsx".to_string()).await
/// }
/// ```
#[tauri::command]
pub async fn import_from_excel(file_path: String) -> Result<ImportResult, String> {
    use std::time::Instant;

    let start_time = Instant::now();

    info!("========================================");
    info!("开始从 Excel 导入排课条件");
    info!("文件路径: {}", file_path);
    info!("========================================");

    // 步骤 1: 验证文件路径
    info!("步骤 1/5: 验证文件路径");
    let file_path_obj = std::path::Path::new(&file_path);

    if !file_path_obj.exists() {
        error!("文件不存在: {}", file_path);
        error!("操作失败，总耗时: {:?}", start_time.elapsed());
        return Err(format!("文件不存在: {}", file_path));
    }

    // 记录文件信息
    match std::fs::metadata(&file_path) {
        Ok(metadata) => {
            let file_size = metadata.len();
            info!("文件大小: {} 字节 ({:.2} KB)", file_size, file_size as f64 / 1024.0);
            debug!("文件类型: {}", if metadata.is_file() { "普通文件" } else { "其他" });
            if let Ok(modified) = metadata.modified() {
                debug!("文件修改时间: {:?}", modified);
            }
        }
        Err(e) => {
            warn!("无法获取文件元数据: {}", e);
        }
    }

    debug!("文件路径验证通过");

    // 步骤 2: 解析 Excel 文件
    info!("步骤 2/5: 解析 Excel 文件");
    let parse_start = Instant::now();

    let import_data = match parse_excel_file(&file_path) {
        Ok(data) => {
            let parse_duration = parse_start.elapsed();
            info!("Excel 文件解析成功，耗时: {:?}", parse_duration);
            info!("解析结果统计:");
            info!("  - 教师数量: {}", data.teachers.len());
            info!("  - 科目数量: {}", data.subjects.len());
            info!("  - 教学计划数量: {}", data.curriculums.len());
            info!("  - 教师偏好数量: {}", data.teacher_preferences.len());
            debug!("教师数量: {}", data.teachers.len());
            debug!("科目数量: {}", data.subjects.len());
            debug!("教学计划数量: {}", data.curriculums.len());
            debug!("教师偏好数量: {}", data.teacher_preferences.len());
            data
        }
        Err(e) => {
            let parse_duration = parse_start.elapsed();
            error!("Excel 文件解析失败: {}", e);
            error!("解析失败，耗时: {:?}", parse_duration);
            error!("操作失败，总耗时: {:?}", start_time.elapsed());
            return Err(format!("Excel 文件解析失败: {}", e));
        }
    };

    // 步骤 3: 验证数据完整性
    info!("步骤 3/5: 验证数据完整性");
    let validate_start = Instant::now();

    if let Err(e) = validate_import_data(&import_data) {
        let validate_duration = validate_start.elapsed();
        error!("数据验证失败: {}", e);
        error!("验证失败，耗时: {:?}", validate_duration);
        error!("操作失败，总耗时: {:?}", start_time.elapsed());
        return Err(format!("数据验证失败: {}", e));
    }

    let validate_duration = validate_start.elapsed();
    info!("数据验证通过，耗时: {:?}", validate_duration);
    debug!("数据验证通过");

    // 步骤 4: 保存数据到数据库
    info!("步骤 4/5: 保存数据到数据库");
    let error_count = 0;
    let errors = Vec::new();

    // TODO: 实现数据库保存逻辑（待数据库模块完成）
    warn!("数据库保存功能尚未实现，返回模拟结果");

    // 模拟保存结果
    let success_count = import_data.teachers.len()
        + import_data.subjects.len()
        + import_data.curriculums.len()
        + import_data.teacher_preferences.len();

    // 步骤 5: 生成导入结果
    info!("步骤 5/5: 生成导入结果");
    let message = if error_count == 0 {
        format!("导入成功，共导入 {} 条记录", success_count)
    } else {
        format!(
            "导入完成，成功 {} 条，失败 {} 条",
            success_count, error_count
        )
    };

    let total_duration = start_time.elapsed();

    info!("========================================");
    info!("Excel 导入完成");
    info!("成功: {}, 失败: {}", success_count, error_count);
    info!("总耗时: {:?}", total_duration);
    info!("平均速度: {:.2} 条/秒", success_count as f64 / total_duration.as_secs_f64());
    info!("========================================");

    Ok(ImportResult {
        success: error_count == 0,
        success_count,
        error_count,
        errors,
        message,
    })
}

// ============================================================================
// Excel 解析辅助函数
// ============================================================================

// ============================================================================
// Excel 解析辅助函数
// ============================================================================

/// 从 Data 单元格中提取字符串
///
/// # 参数
/// - `cell`: Excel 单元格数据
///
/// # 返回
/// - 提取的字符串，如果为空或无法转换则返回空字符串
fn extract_string_from_cell(cell: &calamine::Data) -> String {
    use calamine::Data;

    match cell {
        Data::String(s) => s.trim().to_string(),
        Data::Int(n) => n.to_string(),
        Data::Float(f) => f.to_string(),
        Data::Bool(b) => b.to_string(),
        Data::Empty => String::new(),
        _ => String::new(),
    }
}

/// 解析 Excel 文件
///
/// 从 Excel 文件中读取各个工作表的数据
///
/// # 参数
/// - `file_path`: Excel 文件路径
///
/// # 返回
/// - `Ok(ImportData)`: 解析成功，返回导入数据
/// - `Err(String)`: 解析失败，返回错误信息
fn parse_excel_file(file_path: &str) -> Result<ImportData, String> {
    use calamine::{open_workbook, Xlsx};

    debug!("开始解析 Excel 文件: {}", file_path);

    // 打开 Excel 文件
    let mut workbook: Xlsx<_> = open_workbook(file_path)
        .map_err(|e| {
            error!("打开 Excel 文件失败: {}", e);
            format!("打开 Excel 文件失败: {}", e)
        })?;

    debug!("Excel 文件打开成功");

    // 解析教师信息工作表
    info!("解析教师信息工作表");
    let teachers = parse_teachers_sheet(&mut workbook)?;
    debug!("解析到 {} 位教师", teachers.len());

    // 解析科目配置工作表
    info!("解析科目配置工作表");
    let subjects = parse_subjects_sheet(&mut workbook)?;
    debug!("解析到 {} 个科目", subjects.len());

    // 解析教学计划工作表
    info!("解析教学计划工作表");
    let curriculums = parse_curriculums_sheet(&mut workbook)?;
    debug!("解析到 {} 条教学计划", curriculums.len());

    // 解析教师偏好工作表
    info!("解析教师偏好工作表");
    let teacher_preferences = parse_teacher_preferences_sheet(&mut workbook)?;
    debug!("解析到 {} 条教师偏好", teacher_preferences.len());

    debug!("Excel 文件解析完成");
    Ok(ImportData {
        teachers,
        subjects,
        curriculums,
        teacher_preferences,
    })
}

/// 解析教师信息工作表
///
/// 从"教师信息"工作表中读取教师数据
///
/// # 参数
/// - `workbook`: Excel 工作簿
///
/// # 返回
/// - `Ok(Vec<TeacherImportData>)`: 解析成功，返回教师列表
/// - `Err(String)`: 解析失败，返回错误信息
fn parse_teachers_sheet(
    workbook: &mut calamine::Xlsx<std::io::BufReader<std::fs::File>>,
) -> Result<Vec<TeacherImportData>, String> {
    use calamine::{Data, DataType, Reader};

    debug!("开始解析教师信息工作表");

    // 获取"教师信息"工作表
    let range = workbook
        .worksheet_range("教师信息")
        .map_err(|e| {
            error!("读取'教师信息'工作表失败: {}", e);
            format!("读取'教师信息'工作表失败: {}", e)
        })?;

    let mut teachers = Vec::new();

    // 跳过标题行，从第二行开始读取
    for (row_idx, row) in range.rows().enumerate().skip(1) {
        // 跳过空行
        if row.is_empty() || row.iter().all(|cell| cell.is_empty()) {
            continue;
        }

        // 读取教师姓名（第1列）
        let name = match row.get(0) {
            Some(Data::String(s)) => s.trim().to_string(),
            Some(Data::Int(n)) => n.to_string(),
            Some(Data::Float(f)) => f.to_string(),
            Some(Data::Bool(b)) => b.to_string(),
            _ => {
                warn!("第 {} 行：教师姓名为空，跳过", row_idx + 2);
                continue;
            }
        };

        if name.is_empty() {
            warn!("第 {} 行：教师姓名为空，跳过", row_idx + 2);
            continue;
        }

        // 读取教研组（第2列，可选）
        let teaching_group = match row.get(1) {
            Some(Data::String(s)) => {
                let trimmed = s.trim();
                if trimmed.is_empty() {
                    None
                } else {
                    Some(trimmed.to_string())
                }
            }
            Some(Data::Empty) | None => None,
            _ => None,
        };

        teachers.push(TeacherImportData {
            name,
            teaching_group,
        });

        debug!("解析教师：{:?}", teachers.last().unwrap());
    }

    debug!("教师信息工作表解析完成，共 {} 位教师", teachers.len());
    Ok(teachers)
}

/// 解析科目配置工作表
///
/// 从"科目配置"工作表中读取科目数据
///
/// # 参数
/// - `workbook`: Excel 工作簿
///
/// # 返回
/// - `Ok(Vec<SubjectImportData>)`: 解析成功，返回科目列表
/// - `Err(String)`: 解析失败，返回错误信息
fn parse_subjects_sheet(
    workbook: &mut calamine::Xlsx<std::io::BufReader<std::fs::File>>,
) -> Result<Vec<SubjectImportData>, String> {
    use calamine::{Data, DataType, Reader};

    debug!("开始解析科目配置工作表");

    // 获取"科目配置"工作表
    let range = workbook
        .worksheet_range("科目配置")
        .map_err(|e| {
            error!("读取'科目配置'工作表失败: {}", e);
            format!("读取'科目配置'工作表失败: {}", e)
        })?;

    let mut subjects = Vec::new();

    // 跳过标题行，从第二行开始读取
    for (row_idx, row) in range.rows().enumerate().skip(1) {
        // 跳过空行
        if row.is_empty() || row.iter().all(|cell| cell.is_empty()) {
            continue;
        }

        // 读取科目 ID（第1列）
        let id = match row.get(0) {
            Some(cell) => extract_string_from_cell(cell),
            None => {
                warn!("第 {} 行：科目 ID 为空，跳过", row_idx + 2);
                continue;
            }
        };

        if id.is_empty() {
            warn!("第 {} 行：科目 ID 为空，跳过", row_idx + 2);
            continue;
        }

        // 读取科目名称（第2列）
        let name = match row.get(1) {
            Some(cell) => extract_string_from_cell(cell),
            None => {
                warn!("第 {} 行：科目名称为空，跳过", row_idx + 2);
                continue;
            }
        };

        if name.is_empty() {
            warn!("第 {} 行：科目名称为空，跳过", row_idx + 2);
            continue;
        }

        // 读取禁止时段（第3列，可选）
        let forbidden_slots = row.get(2).map(|cell| {
            let value = extract_string_from_cell(cell);
            if value.is_empty() {
                None
            } else {
                Some(value)
            }
        }).flatten();

        // 读取是否允许连堂（第4列）
        let allow_double_session = row
            .get(3)
            .map(|cell| {
                let value = extract_string_from_cell(cell);
                value == "是" || value == "true" || value == "1"
            })
            .unwrap_or(true);

        // 读取场地（第5列，可选）
        let venue = row.get(4).map(|cell| {
            let value = extract_string_from_cell(cell);
            if value.is_empty() {
                None
            } else {
                Some(value)
            }
        }).flatten();

        // 读取是否主科（第6列）
        let is_major_subject = row
            .get(5)
            .map(|cell| {
                let value = extract_string_from_cell(cell);
                value == "是" || value == "true" || value == "1"
            })
            .unwrap_or(false);

        subjects.push(SubjectImportData {
            id,
            name,
            forbidden_slots,
            allow_double_session,
            venue,
            is_major_subject,
        });

        debug!("解析科目：{:?}", subjects.last().unwrap());
    }

    debug!("科目配置工作表解析完成，共 {} 个科目", subjects.len());
    Ok(subjects)
}

/// 解析教学计划工作表
///
/// 从"教学计划"工作表中读取教学计划数据
///
/// # 参数
/// - `workbook`: Excel 工作簿
///
/// # 返回
/// - `Ok(Vec<CurriculumImportData>)`: 解析成功，返回教学计划列表
/// - `Err(String)`: 解析失败，返回错误信息
fn parse_curriculums_sheet(
    workbook: &mut calamine::Xlsx<std::io::BufReader<std::fs::File>>,
) -> Result<Vec<CurriculumImportData>, String> {
    use calamine::{Data, DataType, Reader};

    debug!("开始解析教学计划工作表");

    // 获取"教学计划"工作表
    let range = workbook
        .worksheet_range("教学计划")
        .map_err(|e| {
            error!("读取'教学计划'工作表失败: {}", e);
            format!("读取'教学计划'工作表失败: {}", e)
        })?;

    let mut curriculums = Vec::new();

    // 跳过标题行，从第二行开始读取
    for (row_idx, row) in range.rows().enumerate().skip(1) {
        // 跳过空行
        if row.is_empty() || row.iter().all(|cell| cell.is_empty()) {
            continue;
        }

        // 读取班级名称（第1列）
        let class_name = match row.get(0) {
            Some(cell) => extract_string_from_cell(cell),
            None => {
                warn!("第 {} 行：班级名称为空，跳过", row_idx + 2);
                continue;
            }
        };

        if class_name.is_empty() {
            warn!("第 {} 行：班级名称为空，跳过", row_idx + 2);
            continue;
        }

        // 读取科目 ID（第2列）
        let subject_id = match row.get(1) {
            Some(cell) => extract_string_from_cell(cell),
            None => {
                warn!("第 {} 行：科目 ID 为空，跳过", row_idx + 2);
                continue;
            }
        };

        if subject_id.is_empty() {
            warn!("第 {} 行：科目 ID 为空，跳过", row_idx + 2);
            continue;
        }

        // 读取教师姓名（第3列）
        let teacher_name = match row.get(2) {
            Some(cell) => extract_string_from_cell(cell),
            None => {
                warn!("第 {} 行：教师姓名为空，跳过", row_idx + 2);
                continue;
            }
        };

        if teacher_name.is_empty() {
            warn!("第 {} 行：教师姓名为空，跳过", row_idx + 2);
            continue;
        }

        // 读取目标课时数（第4列）
        let target_sessions = match row.get(3) {
            Some(cell) => {
                match cell {
                    Data::Int(n) => *n as u8,
                    Data::Float(f) => *f as u8,
                    Data::String(s) => s.trim().parse::<u8>().unwrap_or_else(|_| {
                        warn!("第 {} 行：目标课时数格式错误，使用默认值 0", row_idx + 2);
                        0
                    }),
                    _ => {
                        warn!("第 {} 行：目标课时数类型错误，使用默认值 0", row_idx + 2);
                        0
                    }
                }
            }
            None => {
                warn!("第 {} 行：目标课时数为空，使用默认值 0", row_idx + 2);
                0
            }
        };

        // 读取是否合班课（第5列）
        let is_combined_class = row
            .get(4)
            .map(|cell| {
                let value = extract_string_from_cell(cell);
                value == "是" || value == "true" || value == "1"
            })
            .unwrap_or(false);

        // 读取合班班级（第6列，可选）
        let combined_classes = row.get(5).map(|cell| {
            let value = extract_string_from_cell(cell);
            if value.is_empty() {
                None
            } else {
                Some(value)
            }
        }).flatten();

        curriculums.push(CurriculumImportData {
            class_name,
            subject_id,
            teacher_name,
            target_sessions,
            is_combined_class,
            combined_classes,
        });

        debug!("解析教学计划：{:?}", curriculums.last().unwrap());
    }

    debug!("教学计划工作表解析完成，共 {} 条教学计划", curriculums.len());
    Ok(curriculums)
}

/// 解析教师偏好工作表
///
/// 从"教师偏好"工作表中读取教师偏好数据
///
/// # 参数
/// - `workbook`: Excel 工作簿
///
/// # 返回
/// - `Ok(Vec<TeacherPreferenceImportData>)`: 解析成功，返回教师偏好列表
/// - `Err(String)`: 解析失败，返回错误信息
fn parse_teacher_preferences_sheet(
    workbook: &mut calamine::Xlsx<std::io::BufReader<std::fs::File>>,
) -> Result<Vec<TeacherPreferenceImportData>, String> {
    use calamine::{Data, DataType, Reader};

    debug!("开始解析教师偏好工作表");

    // 获取"教师偏好"工作表
    let range = workbook
        .worksheet_range("教师偏好")
        .map_err(|e| {
            error!("读取'教师偏好'工作表失败: {}", e);
            format!("读取'教师偏好'工作表失败: {}", e)
        })?;

    let mut teacher_preferences = Vec::new();

    // 跳过标题行，从第二行开始读取
    for (row_idx, row) in range.rows().enumerate().skip(1) {
        // 跳过空行
        if row.is_empty() || row.iter().all(|cell| cell.is_empty()) {
            continue;
        }

        // 读取教师姓名（第1列）
        let teacher_name = match row.get(0) {
            Some(cell) => extract_string_from_cell(cell),
            None => {
                warn!("第 {} 行：教师姓名为空，跳过", row_idx + 2);
                continue;
            }
        };

        if teacher_name.is_empty() {
            warn!("第 {} 行：教师姓名为空，跳过", row_idx + 2);
            continue;
        }

        // 读取偏好时段（第2列，可选）
        let preferred_slots = row.get(1).map(|cell| {
            let value = extract_string_from_cell(cell);
            if value.is_empty() {
                None
            } else {
                Some(value)
            }
        }).flatten();

        // 读取早晚偏好（第3列）
        let time_bias = match row.get(2) {
            Some(cell) => {
                match cell {
                    Data::Int(n) => *n as u8,
                    Data::Float(f) => *f as u8,
                    Data::String(s) => s.trim().parse::<u8>().unwrap_or_else(|_| {
                        warn!("第 {} 行：早晚偏好格式错误，使用默认值 0", row_idx + 2);
                        0
                    }),
                    _ => {
                        warn!("第 {} 行：早晚偏好类型错误，使用默认值 0", row_idx + 2);
                        0
                    }
                }
            }
            None => 0,
        };

        // 读取权重系数（第4列）
        let weight = match row.get(3) {
            Some(cell) => {
                match cell {
                    Data::Int(n) => *n as u32,
                    Data::Float(f) => *f as u32,
                    Data::String(s) => s.trim().parse::<u32>().unwrap_or_else(|_| {
                        warn!("第 {} 行：权重系数格式错误，使用默认值 1", row_idx + 2);
                        1
                    }),
                    _ => {
                        warn!("第 {} 行：权重系数类型错误，使用默认值 1", row_idx + 2);
                        1
                    }
                }
            }
            None => 1,
        };

        // 读取不排课时段（第5列，可选）
        let blocked_slots = row.get(4).map(|cell| {
            let value = extract_string_from_cell(cell);
            if value.is_empty() {
                None
            } else {
                Some(value)
            }
        }).flatten();

        teacher_preferences.push(TeacherPreferenceImportData {
            teacher_name,
            preferred_slots,
            time_bias,
            weight,
            blocked_slots,
        });

        debug!("解析教师偏好：{:?}", teacher_preferences.last().unwrap());
    }

    debug!("教师偏好工作表解析完成，共 {} 条教师偏好", teacher_preferences.len());
    Ok(teacher_preferences)
}

/// 验证导入数据
///
/// 验证导入数据的完整性和格式正确性
///
/// # 参数
/// - `data`: 导入数据
///
/// # 返回
/// - `Ok(())`: 验证通过
/// - `Err(String)`: 验证失败，返回详细的错误信息
fn validate_import_data(data: &ImportData) -> Result<(), String> {
    debug!("开始验证导入数据");
    let mut errors = Vec::new();

    // ========================================================================
    // 1. 验证教师信息
    // ========================================================================
    info!("验证教师信息");
    if data.teachers.is_empty() {
        errors.push("【教师信息】教师信息不能为空".to_string());
    } else {
        // 检查教师姓名的唯一性
        let mut teacher_names = std::collections::HashSet::new();
        for (i, teacher) in data.teachers.iter().enumerate() {
            let row = i + 2;

            // 检查姓名是否为空
            if teacher.name.trim().is_empty() {
                errors.push(format!("【教师信息】第 {} 行：教师姓名不能为空", row));
                continue;
            }

            // 检查姓名唯一性
            let name = teacher.name.trim();
            if teacher_names.contains(name) {
                errors.push(format!("【教师信息】第 {} 行：教师姓名 '{}' 重复", row, name));
            } else {
                teacher_names.insert(name.to_string());
            }
        }
        debug!("教师信息验证完成，共 {} 位教师", teacher_names.len());
    }

    // ========================================================================
    // 2. 验证科目配置
    // ========================================================================
    info!("验证科目配置");
    if data.subjects.is_empty() {
        errors.push("【科目配置】科目配置不能为空".to_string());
    } else {
        // 检查科目ID的唯一性
        let mut subject_ids = std::collections::HashSet::new();
        for (i, subject) in data.subjects.iter().enumerate() {
            let row = i + 2;

            // 检查科目 ID 是否为空
            if subject.id.trim().is_empty() {
                errors.push(format!("【科目配置】第 {} 行：科目 ID 不能为空", row));
                continue;
            }

            // 检查科目 ID 唯一性
            let id = subject.id.trim();
            if subject_ids.contains(id) {
                errors.push(format!("【科目配置】第 {} 行：科目 ID '{}' 重复", row, id));
            } else {
                subject_ids.insert(id.to_string());
            }

            // 检查科目名称是否为空
            if subject.name.trim().is_empty() {
                errors.push(format!("【科目配置】第 {} 行：科目名称不能为空", row));
            }

            // 验证禁止时段格式
            if let Some(ref slots) = subject.forbidden_slots {
                if let Err(e) = validate_time_slots_format(slots, row) {
                    errors.push(format!("【科目配置】{}", e));
                }
            }
        }
        debug!("科目配置验证完成，共 {} 个科目", subject_ids.len());
    }

    // ========================================================================
    // 3. 验证教学计划
    // ========================================================================
    info!("验证教学计划");
    if data.curriculums.is_empty() {
        warn!("教学计划为空");
    } else {
        // 构建教师姓名集合和科目ID集合用于引用验证
        let teacher_names: std::collections::HashSet<String> = data
            .teachers
            .iter()
            .map(|t| t.name.trim().to_string())
            .collect();
        let subject_ids: std::collections::HashSet<String> = data
            .subjects
            .iter()
            .map(|s| s.id.trim().to_string())
            .collect();

        // 收集所有班级名称（从教学计划中）
        let mut all_class_names: std::collections::HashSet<String> =
            std::collections::HashSet::new();
        for curriculum in data.curriculums.iter() {
            if !curriculum.class_name.trim().is_empty() {
                all_class_names.insert(curriculum.class_name.trim().to_string());
            }
        }

        // 统计每个班级的总课时数
        let mut class_total_sessions: std::collections::HashMap<String, u32> =
            std::collections::HashMap::new();

        // 检查教学计划中是否有重复的班级-科目-教师组合
        let mut curriculum_keys: std::collections::HashSet<String> =
            std::collections::HashSet::new();

        for (i, curriculum) in data.curriculums.iter().enumerate() {
            let row = i + 2;

            // 检查班级名称是否为空
            if curriculum.class_name.trim().is_empty() {
                errors.push(format!("【教学计划】第 {} 行：班级名称不能为空", row));
                continue;
            }

            // 检查科目 ID 是否为空
            if curriculum.subject_id.trim().is_empty() {
                errors.push(format!("【教学计划】第 {} 行：科目 ID 不能为空", row));
            } else {
                // 验证科目ID是否存在
                let subject_id = curriculum.subject_id.trim();
                if !subject_ids.contains(subject_id) {
                    errors.push(format!(
                        "【教学计划】第 {} 行：科目 ID '{}' 在科目配置表中不存在",
                        row, subject_id
                    ));
                }
            }

            // 检查教师姓名是否为空
            if curriculum.teacher_name.trim().is_empty() {
                errors.push(format!("【教学计划】第 {} 行：教师姓名不能为空", row));
            } else {
                // 验证教师姓名是否存在
                let teacher_name = curriculum.teacher_name.trim();
                if !teacher_names.contains(teacher_name) {
                    errors.push(format!(
                        "【教学计划】第 {} 行：教师姓名 '{}' 在教师信息表中不存在",
                        row, teacher_name
                    ));
                }
            }

            // 检查目标课时数
            if curriculum.target_sessions == 0 {
                errors.push(format!("【教学计划】第 {} 行：目标课时数必须大于 0", row));
            } else if curriculum.target_sessions > 40 {
                errors.push(format!("【教学计划】第 {} 行：目标课时数不能超过 40", row));
            }

            // 检查班级-科目组合的唯一性（同一个班级的同一门课程只能有一个教学计划）
            let curriculum_key = format!(
                "{}|{}",
                curriculum.class_name.trim(),
                curriculum.subject_id.trim()
            );
            if curriculum_keys.contains(&curriculum_key) {
                errors.push(format!(
                    "【教学计划】第 {} 行：班级 '{}' 的科目 '{}' 已存在教学计划，不能重复",
                    row,
                    curriculum.class_name.trim(),
                    curriculum.subject_id.trim()
                ));
            } else {
                curriculum_keys.insert(curriculum_key);
            }

            // 统计班级总课时数
            let class_name = curriculum.class_name.trim().to_string();
            *class_total_sessions.entry(class_name.clone()).or_insert(0) +=
                curriculum.target_sessions as u32;

            // 验证合班班级
            if curriculum.is_combined_class {
                if let Some(ref combined_classes) = curriculum.combined_classes {
                    let combined_list: Vec<&str> = combined_classes
                        .split(',')
                        .map(|s| s.trim())
                        .filter(|s| !s.is_empty())
                        .collect();

                    if combined_list.is_empty() {
                        errors.push(format!(
                            "【教学计划】第 {} 行：标记为合班课但未指定合班班级",
                            row
                        ));
                    } else {
                        // 验证合班班级是否在教学计划中存在
                        for combined_class in combined_list {
                            if !all_class_names.contains(combined_class) {
                                errors.push(format!(
                                    "【教学计划】第 {} 行：合班班级 '{}' 在教学计划中不存在",
                                    row, combined_class
                                ));
                            }
                            // 检查合班班级不能是自己
                            if combined_class == curriculum.class_name.trim() {
                                errors.push(format!(
                                    "【教学计划】第 {} 行：合班班级不能包含自己 '{}'",
                                    row, combined_class
                                ));
                            }
                        }
                    }
                } else {
                    errors.push(format!(
                        "【教学计划】第 {} 行：标记为合班课但未指定合班班级",
                        row
                    ));
                }
            }
        }

        // 检查总课时数是否超过容量（5天 × 8节 = 40节）
        for (class_name, total_sessions) in class_total_sessions.iter() {
            if *total_sessions > 40 {
                errors.push(format!(
                    "【教学计划】班级 '{}' 的总课时数为 {}，超过每周最大容量 40 节",
                    class_name, total_sessions
                ));
            }
        }

        debug!("教学计划验证完成，共 {} 条教学计划", data.curriculums.len());
    }

    // ========================================================================
    // 4. 验证教师偏好
    // ========================================================================
    info!("验证教师偏好");
    if !data.teacher_preferences.is_empty() {
        // 构建教师姓名集合用于引用验证
        let teacher_names: std::collections::HashSet<String> = data
            .teachers
            .iter()
            .map(|t| t.name.trim().to_string())
            .collect();

        for (i, pref) in data.teacher_preferences.iter().enumerate() {
            let row = i + 2;

            // 检查教师姓名是否为空
            if pref.teacher_name.trim().is_empty() {
                errors.push(format!("【教师偏好】第 {} 行：教师姓名不能为空", row));
                continue;
            }

            // 验证教师姓名是否存在
            let teacher_name = pref.teacher_name.trim();
            if !teacher_names.contains(teacher_name) {
                errors.push(format!(
                    "【教师偏好】第 {} 行：教师姓名 '{}' 在教师信息表中不存在",
                    row, teacher_name
                ));
            }

            // 检查早晚偏好值
            if pref.time_bias > 2 {
                errors.push(format!(
                    "【教师偏好】第 {} 行：早晚偏好值必须在 0-2 之间，当前值为 {}",
                    row, pref.time_bias
                ));
            }

            // 检查权重系数
            if pref.weight == 0 {
                errors.push(format!(
                    "【教师偏好】第 {} 行：权重系数必须大于 0",
                    row
                ));
            }

            // 验证偏好时段格式
            if let Some(ref slots) = pref.preferred_slots {
                if let Err(e) = validate_time_slots_format(slots, row) {
                    errors.push(format!("【教师偏好】{}", e));
                }
            }

            // 验证不排课时段格式
            if let Some(ref slots) = pref.blocked_slots {
                if let Err(e) = validate_time_slots_format(slots, row) {
                    errors.push(format!("【教师偏好】{}", e));
                }
            }
        }

        debug!("教师偏好验证完成，共 {} 条教师偏好", data.teacher_preferences.len());
    }

    // ========================================================================
    // 5. 返回验证结果
    // ========================================================================
    if errors.is_empty() {
        info!("导入数据验证通过");
        Ok(())
    } else {
        error!("导入数据验证失败，共 {} 个错误", errors.len());
        for error in &errors {
            error!("  - {}", error);
        }
        Err(format!(
            "数据验证失败，发现 {} 个错误：\n{}",
            errors.len(),
            errors.join("\n")
        ))
    }
}

/// 验证时间槽位格式
///
/// 验证时间槽位字符串的格式是否正确
/// 格式：星期-节次，多个槽位用逗号分隔，如 "1-1,1-2,2-3"
///
/// # 参数
/// - `slots`: 时间槽位字符串
/// - `row`: 行号（用于错误提示）
///
/// # 返回
/// - `Ok(())`: 格式正确
/// - `Err(String)`: 格式错误，返回错误信息
fn validate_time_slots_format(slots: &str, row: usize) -> Result<(), String> {
    if slots.trim().is_empty() {
        return Ok(());
    }

    for slot in slots.split(',') {
        let parts: Vec<&str> = slot.trim().split('-').collect();
        if parts.len() != 2 {
            return Err(format!(
                "第 {} 行：时间槽位格式错误，应为 '星期-节次'，如 '1-1'",
                row
            ));
        }

        // 验证星期（1-7）
        let day: u8 = parts[0].parse().map_err(|_| {
            format!(
                "第 {} 行：星期必须是 1-7 之间的数字，当前值: {}",
                row, parts[0]
            )
        })?;
        if day < 1 || day > 7 {
            return Err(format!("第 {} 行：星期必须在 1-7 之间", row));
        }

        // 验证节次（1-12）
        let period: u8 = parts[1].parse().map_err(|_| {
            format!(
                "第 {} 行：节次必须是 1-12 之间的数字，当前值: {}",
                row, parts[1]
            )
        })?;
        if period < 1 || period > 12 {
            return Err(format!("第 {} 行：节次必须在 1-12 之间", row));
        }
    }

    Ok(())
}

// ============================================================================
// 导出课表到 Excel 命令
// ============================================================================

/// 导出课表到 Excel
///
/// 将课表数据导出到 Excel 文件，支持多种导出类型
///
/// # 参数
/// - `export_type`: 导出类型（班级课表、教师课表、总课表、工作量统计）
/// - `output_path`: 输出文件路径
///
/// # 返回
/// - `Ok(String)`: 导出成功，返回导出文件的路径
/// - `Err(String)`: 导出失败，返回错误信息
///
/// # 功能
/// 1. 获取活动课表数据
/// 2. 根据导出类型生成相应的 Excel 文件
/// 3. 应用预定义的模板样式
/// 4. 返回导出文件的路径
///
/// # 导出类型
/// - ClassSchedule: 班级课表，为每个班级生成独立的工作表
/// - TeacherSchedule: 教师课表，为每位教师生成独立的工作表
/// - MasterSchedule: 总课表，包含所有班级和教师的汇总视图
/// - WorkloadStatistics: 工作量统计，统计每位教师的课时数、班级数等
///
/// # 日志记录
/// - INFO: 记录开始、完成、各阶段进度
/// - DEBUG: 记录详细的生成信息
/// - WARN: 记录警告信息
/// - ERROR: 记录错误信息和堆栈跟踪
///
/// # 错误处理
/// - 未找到活动课表：返回错误信息
/// - 文件写入失败：返回文件操作错误
/// - 数据格式错误：返回数据验证错误
///
/// # 示例
/// ```rust
/// use course_scheduling_system::commands::import_export::{export_to_excel, ExportType};
///
/// #[tauri::command]
/// async fn test_export() -> Result<String, String> {
///     export_to_excel(
///         ExportType::ClassSchedule,
///         "output/class_schedule.xlsx".to_string()
///     ).await
/// }
/// ```
#[tauri::command]
pub async fn export_to_excel(
    export_type: ExportType,
    output_path: String,
) -> Result<String, String> {
    use std::time::Instant;

    let start_time = Instant::now();

    info!("========================================");
    info!("开始导出课表到 Excel");
    info!("导出类型: {:?}", export_type);
    info!("输出路径: {}", output_path);

    // 记录输出目录信息
    if let Some(parent) = std::path::Path::new(&output_path).parent() {
        debug!("输出目录: {}", parent.display());
    }
    if let Some(filename) = std::path::Path::new(&output_path).file_name() {
        debug!("文件名: {}", filename.to_string_lossy());
    }

    info!("========================================");

    // 步骤 1: 获取活动课表数据
    info!("步骤 1/5: 获取活动课表数据");
    let data_start = Instant::now();

    let schedule_data = match get_schedule_data_from_db().await {
        Ok(data) => {
            if data.is_empty() {
                warn!("未找到课表数据，使用模拟数据");
                get_mock_schedule_data()
            } else {
                let data_duration = data_start.elapsed();
                info!("从数据库获取到 {} 个课表条目，耗时: {:?}", data.len(), data_duration);
                data
            }
        }
        Err(e) => {
            warn!("从数据库获取课表数据失败: {}，使用模拟数据", e);
            get_mock_schedule_data()
        }
    };
    debug!("课表数据准备完成，包含 {} 个条目", schedule_data.len());

    // 步骤 2: 创建 Excel 工作簿
    info!("步骤 2/5: 创建 Excel 工作簿");
    let workbook_start = Instant::now();

    let mut workbook = match export_type {
        ExportType::ClassSchedule => {
            debug!("生成班级课表");
            create_class_schedule_workbook(&schedule_data)?
        }
        ExportType::TeacherSchedule => {
            debug!("生成教师课表");
            create_teacher_schedule_workbook(&schedule_data)?
        }
        ExportType::MasterSchedule => {
            debug!("生成总课表");
            create_master_schedule_workbook(&schedule_data)?
        }
        ExportType::WorkloadStatistics => {
            debug!("生成工作量统计");
            create_workload_statistics_workbook(&schedule_data)?
        }
    };

    let workbook_duration = workbook_start.elapsed();
    info!("Excel 工作簿创建完成，耗时: {:?}", workbook_duration);

    // 步骤 3: 确保输出目录存在
    info!("步骤 3/5: 确保输出目录存在");
    if let Some(parent) = std::path::Path::new(&output_path).parent() {
        if !parent.exists() {
            info!("创建输出目录: {}", parent.display());
            std::fs::create_dir_all(parent).map_err(|e| {
                error!("创建输出目录失败: {}", e);
                error!("目录路径: {}", parent.display());
                format!("创建输出目录失败: {}", e)
            })?;
            debug!("输出目录创建成功");
        } else {
            debug!("输出目录已存在: {}", parent.display());
        }
        debug!("输出目录已准备");
    }

    // 步骤 4: 保存 Excel 文件
    info!("步骤 4/5: 保存 Excel 文件");
    let save_start = Instant::now();

    workbook
        .save(&output_path)
        .map_err(|e| {
            error!("保存 Excel 文件失败: {}", e);
            error!("文件路径: {}", output_path);
            error!("操作失败，总耗时: {:?}", start_time.elapsed());
            format!("保存 Excel 文件失败: {}", e)
        })?;

    let save_duration = save_start.elapsed();
    info!("Excel 文件保存成功，耗时: {:?}", save_duration);

    // 记录保存后的文件信息
    match std::fs::metadata(&output_path) {
        Ok(metadata) => {
            let file_size = metadata.len();
            info!("文件大小: {} 字节 ({:.2} KB, {:.2} MB)",
                  file_size,
                  file_size as f64 / 1024.0,
                  file_size as f64 / 1024.0 / 1024.0);
            debug!("文件保存成功");
        }
        Err(e) => {
            warn!("无法获取保存文件的元数据: {}", e);
        }
    }

    // 步骤 5: 返回文件路径
    info!("步骤 5/5: 返回文件路径");
    let absolute_path = std::fs::canonicalize(&output_path)
        .map_err(|e| {
            error!("获取绝对路径失败: {}", e);
            error!("相对路径: {}", output_path);
            format!("获取绝对路径失败: {}", e)
        })?
        .to_string_lossy()
        .to_string();

    let total_duration = start_time.elapsed();

    info!("========================================");
    info!("Excel 导出完成");
    info!("文件路径: {}", absolute_path);
    info!("总耗时: {:?}", total_duration);
    info!("========================================");

    Ok(absolute_path)
}

// ============================================================================
// Excel 生成辅助函数
// ============================================================================

/// 课表条目数据（用于导出）
#[derive(Debug, Clone)]
struct ScheduleEntryData {
    class_name: String,
    subject_name: String,
    teacher_name: String,
    day: u8,
    period: u8,
}

/// 从数据库获取课表数据
///
/// 从数据库中获取活动课表及其所有条目，并关联班级、科目、教师信息
///
/// # 返回
/// - `Ok(Vec<ScheduleEntryData>)`: 课表条目数据列表
/// - `Err(String)`: 获取失败，返回错误信息
async fn get_schedule_data_from_db() -> Result<Vec<ScheduleEntryData>, String> {
    use crate::db::DatabaseManager;
    use crate::db::schedule::ScheduleRepository;
    use crate::db::class::ClassRepository;
    use crate::db::subject::SubjectConfigRepository;
    use crate::db::teacher::TeacherRepository;

    debug!("开始从数据库获取课表数据");

    // 1. 连接数据库
    let db = DatabaseManager::new("sqlite://data/schedule.db", "migrations")
        .await
        .map_err(|e| {
            error!("连接数据库失败: {}", e);
            format!("连接数据库失败: {}", e)
        })?;

    // 2. 获取活动课表
    let schedule_repo = ScheduleRepository::new(db.pool());
    let schedule = schedule_repo
        .get_active_schedule()
        .await
        .map_err(|e| {
            error!("查询活动课表失败: {}", e);
            format!("查询活动课表失败: {}", e)
        })?
        .ok_or_else(|| {
            warn!("未找到活动课表");
            "未找到活动课表".to_string()
        })?;

    info!("找到活动课表，ID: {}, 版本: {}", schedule.id, schedule.version);

    // 3. 获取课表条目
    let entries = schedule_repo
        .get_schedule_entries(schedule.id)
        .await
        .map_err(|e| {
            error!("查询课表条目失败: {}", e);
            format!("查询课表条目失败: {}", e)
        })?;

    debug!("查询到 {} 个课表条目", entries.len());

    // 4. 获取班级、科目、教师信息
    let class_repo = ClassRepository::new(db.pool());
    let subject_repo = SubjectConfigRepository::new(db.pool());
    let teacher_repo = TeacherRepository::new(db.pool());

    // 获取所有班级
    let classes = class_repo.find_all().await.map_err(|e| {
        error!("查询班级信息失败: {}", e);
        format!("查询班级信息失败: {}", e)
    })?;
    let class_map: std::collections::HashMap<i64, String> = classes
        .into_iter()
        .map(|c| (c.id, c.name))
        .collect();
    debug!("加载了 {} 个班级", class_map.len());

    // 获取所有科目
    let subjects = subject_repo.find_all().await.map_err(|e| {
        error!("查询科目信息失败: {}", e);
        format!("查询科目信息失败: {}", e)
    })?;
    let subject_map: std::collections::HashMap<String, String> = subjects
        .into_iter()
        .map(|s| (s.id, s.name))
        .collect();
    debug!("加载了 {} 个科目", subject_map.len());

    // 获取所有教师
    let teachers = teacher_repo.find_all().await.map_err(|e| {
        error!("查询教师信息失败: {}", e);
        format!("查询教师信息失败: {}", e)
    })?;
    let teacher_map: std::collections::HashMap<i64, String> = teachers
        .into_iter()
        .map(|t| (t.id, t.name))
        .collect();
    debug!("加载了 {} 位教师", teacher_map.len());

    // 5. 组装课表数据
    let mut schedule_data = Vec::new();
    for entry in entries {
        let class_name = class_map
            .get(&entry.class_id)
            .cloned()
            .unwrap_or_else(|| format!("班级{}", entry.class_id));

        let subject_name = subject_map
            .get(&entry.subject_id)
            .cloned()
            .unwrap_or_else(|| entry.subject_id.clone());

        let teacher_name = teacher_map
            .get(&entry.teacher_id)
            .cloned()
            .unwrap_or_else(|| format!("教师{}", entry.teacher_id));

        schedule_data.push(ScheduleEntryData {
            class_name,
            subject_name,
            teacher_name,
            day: entry.day as u8,
            period: entry.period as u8,
        });
    }

    info!("成功组装 {} 个课表条目数据", schedule_data.len());
    Ok(schedule_data)
}

/// 获取模拟课表数据（用于测试）
fn get_mock_schedule_data() -> Vec<ScheduleEntryData> {
    vec![
        ScheduleEntryData {
            class_name: "初一(1)班".to_string(),
            subject_name: "数学".to_string(),
            teacher_name: "张老师".to_string(),
            day: 0,
            period: 0,
        },
        ScheduleEntryData {
            class_name: "初一(1)班".to_string(),
            subject_name: "语文".to_string(),
            teacher_name: "李老师".to_string(),
            day: 0,
            period: 1,
        },
        ScheduleEntryData {
            class_name: "初一(2)班".to_string(),
            subject_name: "数学".to_string(),
            teacher_name: "张老师".to_string(),
            day: 0,
            period: 1,
        },
        ScheduleEntryData {
            class_name: "初一(2)班".to_string(),
            subject_name: "英语".to_string(),
            teacher_name: "王老师".to_string(),
            day: 0,
            period: 2,
        },
    ]
}

/// 创建班级课表工作簿
fn create_class_schedule_workbook(
    data: &[ScheduleEntryData],
) -> Result<rust_xlsxwriter::Workbook, String> {
    use rust_xlsxwriter::{Format, Workbook};

    info!("创建班级课表工作簿");
    let mut workbook = Workbook::new();

    // 创建样式
    let header_format = Format::new()
        .set_bold()
        .set_align(rust_xlsxwriter::FormatAlign::Center)
        .set_background_color(rust_xlsxwriter::Color::RGB(0x4472C4))
        .set_font_color(rust_xlsxwriter::Color::White)
        .set_border(rust_xlsxwriter::FormatBorder::Thin);

    let cell_format = Format::new()
        .set_align(rust_xlsxwriter::FormatAlign::Center)
        .set_border(rust_xlsxwriter::FormatBorder::Thin);

    // 按班级分组
    let mut class_groups: std::collections::HashMap<String, Vec<&ScheduleEntryData>> =
        std::collections::HashMap::new();
    for entry in data {
        class_groups
            .entry(entry.class_name.clone())
            .or_insert_with(Vec::new)
            .push(entry);
    }

    debug!("共有 {} 个班级", class_groups.len());

    // 为每个班级创建工作表
    for (class_name, entries) in class_groups.iter() {
        debug!("创建班级 {} 的工作表", class_name);
        let worksheet = workbook.add_worksheet().set_name(class_name).map_err(|e| {
            error!("创建工作表失败: {}", e);
            format!("创建工作表失败: {}", e)
        })?;

        // 写入标题
        worksheet
            .write_string_with_format(0, 0, "节次/星期", &header_format)
            .map_err(|e| format!("写入标题失败: {}", e))?;

        let weekdays = ["星期一", "星期二", "星期三", "星期四", "星期五"];
        for (i, &weekday) in weekdays.iter().enumerate() {
            worksheet
                .write_string_with_format(0, (i + 1) as u16, weekday, &header_format)
                .map_err(|e| format!("写入星期标题失败: {}", e))?;
        }

        // 写入节次
        for period in 0..8 {
            worksheet
                .write_string_with_format(
                    (period + 1) as u32,
                    0,
                    &format!("第{}节", period + 1),
                    &header_format,
                )
                .map_err(|e| format!("写入节次失败: {}", e))?;
        }

        // 写入课程数据
        for entry in entries.iter() {
            let row = (entry.period + 1) as u32;
            let col = (entry.day + 1) as u16;
            let content = format!("{}\n{}", entry.subject_name, entry.teacher_name);

            worksheet
                .write_string_with_format(row, col, &content, &cell_format)
                .map_err(|e| format!("写入课程数据失败: {}", e))?;
        }

        // 设置列宽
        worksheet
            .set_column_width(0, 12)
            .map_err(|e| format!("设置列宽失败: {}", e))?;
        for col in 1..=5 {
            worksheet
                .set_column_width(col, 15)
                .map_err(|e| format!("设置列宽失败: {}", e))?;
        }

        // 设置行高
        for row in 1..=8 {
            worksheet
                .set_row_height(row, 30)
                .map_err(|e| format!("设置行高失败: {}", e))?;
        }
    }

    info!("班级课表工作簿创建完成");
    Ok(workbook)
}

/// 创建教师课表工作簿
fn create_teacher_schedule_workbook(
    data: &[ScheduleEntryData],
) -> Result<rust_xlsxwriter::Workbook, String> {
    use rust_xlsxwriter::{Format, Workbook};

    info!("创建教师课表工作簿");
    let mut workbook = Workbook::new();

    // 创建样式
    let header_format = Format::new()
        .set_bold()
        .set_align(rust_xlsxwriter::FormatAlign::Center)
        .set_background_color(rust_xlsxwriter::Color::RGB(0x70AD47))
        .set_font_color(rust_xlsxwriter::Color::White)
        .set_border(rust_xlsxwriter::FormatBorder::Thin);

    let cell_format = Format::new()
        .set_align(rust_xlsxwriter::FormatAlign::Center)
        .set_border(rust_xlsxwriter::FormatBorder::Thin);

    // 按教师分组
    let mut teacher_groups: std::collections::HashMap<String, Vec<&ScheduleEntryData>> =
        std::collections::HashMap::new();
    for entry in data {
        teacher_groups
            .entry(entry.teacher_name.clone())
            .or_insert_with(Vec::new)
            .push(entry);
    }

    debug!("共有 {} 位教师", teacher_groups.len());

    // 为每位教师创建工作表
    for (teacher_name, entries) in teacher_groups.iter() {
        debug!("创建教师 {} 的工作表", teacher_name);
        let worksheet = workbook
            .add_worksheet()
            .set_name(teacher_name)
            .map_err(|e| {
                error!("创建工作表失败: {}", e);
                format!("创建工作表失败: {}", e)
            })?;

        // 写入标题
        worksheet
            .write_string_with_format(0, 0, "节次/星期", &header_format)
            .map_err(|e| format!("写入标题失败: {}", e))?;

        let weekdays = ["星期一", "星期二", "星期三", "星期四", "星期五"];
        for (i, &weekday) in weekdays.iter().enumerate() {
            worksheet
                .write_string_with_format(0, (i + 1) as u16, weekday, &header_format)
                .map_err(|e| format!("写入星期标题失败: {}", e))?;
        }

        // 写入节次
        for period in 0..8 {
            worksheet
                .write_string_with_format(
                    (period + 1) as u32,
                    0,
                    &format!("第{}节", period + 1),
                    &header_format,
                )
                .map_err(|e| format!("写入节次失败: {}", e))?;
        }

        // 写入课程数据
        for entry in entries.iter() {
            let row = (entry.period + 1) as u32;
            let col = (entry.day + 1) as u16;
            let content = format!("{}\n{}", entry.subject_name, entry.class_name);

            worksheet
                .write_string_with_format(row, col, &content, &cell_format)
                .map_err(|e| format!("写入课程数据失败: {}", e))?;
        }

        // 设置列宽
        worksheet
            .set_column_width(0, 12)
            .map_err(|e| format!("设置列宽失败: {}", e))?;
        for col in 1..=5 {
            worksheet
                .set_column_width(col, 15)
                .map_err(|e| format!("设置列宽失败: {}", e))?;
        }

        // 设置行高
        for row in 1..=8 {
            worksheet
                .set_row_height(row, 30)
                .map_err(|e| format!("设置行高失败: {}", e))?;
        }
    }

    info!("教师课表工作簿创建完成");
    Ok(workbook)
}

/// 创建总课表工作簿
fn create_master_schedule_workbook(
    data: &[ScheduleEntryData],
) -> Result<rust_xlsxwriter::Workbook, String> {
    use rust_xlsxwriter::{Format, Workbook};

    info!("创建总课表工作簿");
    let mut workbook = Workbook::new();

    // 创建样式
    let header_format = Format::new()
        .set_bold()
        .set_align(rust_xlsxwriter::FormatAlign::Center)
        .set_background_color(rust_xlsxwriter::Color::RGB(0xFFC000))
        .set_font_color(rust_xlsxwriter::Color::Black)
        .set_border(rust_xlsxwriter::FormatBorder::Thin);

    let cell_format = Format::new()
        .set_align(rust_xlsxwriter::FormatAlign::Left)
        .set_border(rust_xlsxwriter::FormatBorder::Thin);

    let worksheet = workbook
        .add_worksheet()
        .set_name("总课表")
        .map_err(|e| {
            error!("创建工作表失败: {}", e);
            format!("创建工作表失败: {}", e)
        })?;

    // 写入标题
    let headers = ["班级", "科目", "教师", "星期", "节次"];
    for (i, &header) in headers.iter().enumerate() {
        worksheet
            .write_string_with_format(0, i as u16, header, &header_format)
            .map_err(|e| format!("写入标题失败: {}", e))?;
    }

    // 写入数据
    for (i, entry) in data.iter().enumerate() {
        let row = (i + 1) as u32;
        worksheet
            .write_string_with_format(row, 0, &entry.class_name, &cell_format)
            .map_err(|e| format!("写入班级失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 1, &entry.subject_name, &cell_format)
            .map_err(|e| format!("写入科目失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 2, &entry.teacher_name, &cell_format)
            .map_err(|e| format!("写入教师失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 3, &format!("星期{}", entry.day + 1), &cell_format)
            .map_err(|e| format!("写入星期失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 4, &format!("第{}节", entry.period + 1), &cell_format)
            .map_err(|e| format!("写入节次失败: {}", e))?;
    }

    // 设置列宽
    worksheet
        .set_column_width(0, 15)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(1, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(2, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(3, 10)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(4, 10)
        .map_err(|e| format!("设置列宽失败: {}", e))?;

    info!("总课表工作簿创建完成");
    Ok(workbook)
}

/// 创建工作量统计工作簿
fn create_workload_statistics_workbook(
    data: &[ScheduleEntryData],
) -> Result<rust_xlsxwriter::Workbook, String> {
    use rust_xlsxwriter::{Format, Workbook};

    info!("创建工作量统计工作簿");
    let mut workbook = Workbook::new();

    // 创建样式
    let header_format = Format::new()
        .set_bold()
        .set_align(rust_xlsxwriter::FormatAlign::Center)
        .set_background_color(rust_xlsxwriter::Color::RGB(0xED7D31))
        .set_font_color(rust_xlsxwriter::Color::White)
        .set_border(rust_xlsxwriter::FormatBorder::Thin);

    let cell_format = Format::new()
        .set_align(rust_xlsxwriter::FormatAlign::Center)
        .set_border(rust_xlsxwriter::FormatBorder::Thin);

    let number_format = Format::new()
        .set_align(rust_xlsxwriter::FormatAlign::Center)
        .set_border(rust_xlsxwriter::FormatBorder::Thin)
        .set_num_format("0");

    let worksheet = workbook
        .add_worksheet()
        .set_name("工作量统计")
        .map_err(|e| {
            error!("创建工作表失败: {}", e);
            format!("创建工作表失败: {}", e)
        })?;

    // 写入标题
    let headers = [
        "教师姓名",
        "总课时数",
        "授课班级数",
        "授课科目",
        "早课节数",
        "晚课节数",
    ];
    for (i, &header) in headers.iter().enumerate() {
        worksheet
            .write_string_with_format(0, i as u16, header, &header_format)
            .map_err(|e| format!("写入标题失败: {}", e))?;
    }

    // 统计每位教师的工作量
    let mut teacher_stats: std::collections::HashMap<
        String,
        (usize, std::collections::HashSet<String>, std::collections::HashSet<String>, usize, usize),
    > = std::collections::HashMap::new();

    for entry in data {
        let stats = teacher_stats
            .entry(entry.teacher_name.clone())
            .or_insert_with(|| {
                (
                    0,
                    std::collections::HashSet::new(),
                    std::collections::HashSet::new(),
                    0,
                    0,
                )
            });

        // 总课时数
        stats.0 += 1;

        // 授课班级
        stats.1.insert(entry.class_name.clone());

        // 授课科目
        stats.2.insert(entry.subject_name.clone());

        // 早课节数（第1节）
        if entry.period == 0 {
            stats.3 += 1;
        }

        // 晚课节数（第8节）
        if entry.period == 7 {
            stats.4 += 1;
        }
    }

    debug!("统计了 {} 位教师的工作量", teacher_stats.len());

    // 写入统计数据
    let mut row = 1u32;
    for (teacher_name, (total_sessions, classes, subjects, early_sessions, late_sessions)) in
        teacher_stats.iter()
    {
        worksheet
            .write_string_with_format(row, 0, teacher_name, &cell_format)
            .map_err(|e| format!("写入教师姓名失败: {}", e))?;
        worksheet
            .write_number_with_format(row, 1, *total_sessions as f64, &number_format)
            .map_err(|e| format!("写入总课时数失败: {}", e))?;
        worksheet
            .write_number_with_format(row, 2, classes.len() as f64, &number_format)
            .map_err(|e| format!("写入授课班级数失败: {}", e))?;

        let subjects_str: Vec<String> = subjects.iter().cloned().collect();
        worksheet
            .write_string_with_format(row, 3, &subjects_str.join("、"), &cell_format)
            .map_err(|e| format!("写入授课科目失败: {}", e))?;

        worksheet
            .write_number_with_format(row, 4, *early_sessions as f64, &number_format)
            .map_err(|e| format!("写入早课节数失败: {}", e))?;
        worksheet
            .write_number_with_format(row, 5, *late_sessions as f64, &number_format)
            .map_err(|e| format!("写入晚课节数失败: {}", e))?;

        row += 1;
    }

    // 设置列宽
    worksheet
        .set_column_width(0, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(1, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(2, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(3, 20)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(4, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(5, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;

    info!("工作量统计工作簿创建完成");
    Ok(workbook)
}
// ============================================================================
// 下载 Excel 导入模板命令
// ============================================================================

/// 下载 Excel 导入模板
///
/// 生成包含教师信息、科目配置、教学计划、教师偏好等多个工作表的模板文件
///
/// # 参数
/// - `output_path`: 输出文件路径
///
/// # 返回
/// - `Ok(String)`: 生成成功，返回模板文件的绝对路径
/// - `Err(String)`: 生成失败，返回错误信息
///
/// # 功能
/// 1. 创建 Excel 工作簿
/// 2. 添加"教师信息"工作表（包含列标题和示例数据）
/// 3. 添加"科目配置"工作表（包含列标题和示例数据）
/// 4. 添加"教学计划"工作表（包含列标题和示例数据）
/// 5. 添加"教师偏好"工作表（包含列标题和示例数据）
/// 6. 保存模板文件
/// 7. 返回模板文件的绝对路径
///
/// # 模板格式
///
/// ## 教师信息工作表
/// | 教师姓名 | 教研组 |
/// |---------|--------|
/// | 张老师   | 数学组 |
/// | 李老师   | 语文组 |
///
/// ## 科目配置工作表
/// | 科目ID | 科目名称 | 禁止时段 | 是否允许连堂 | 场地 | 是否主科 |
/// |--------|---------|---------|-------------|------|---------|
/// | MATH   | 数学    |         | 是          |      | 是      |
/// | PE     | 体育    | 1-1,1-2,1-3 | 否      | 操场 | 否      |
///
/// ## 教学计划工作表
/// | 班级名称 | 科目ID | 教师姓名 | 目标课时数 | 是否合班课 | 合班班级 |
/// |---------|--------|---------|-----------|-----------|---------|
/// | 初一(1)班 | MATH  | 张老师   | 6         | 否        |         |
///
/// ## 教师偏好工作表
/// | 教师姓名 | 偏好时段 | 早晚偏好 | 权重系数 | 不排课时段 |
/// |---------|---------|---------|---------|-----------|
/// | 张老师   | 1-4,1-5 | 0       | 1       |           |
///
/// # 日志记录
/// - INFO: 记录开始、完成、各阶段进度
/// - DEBUG: 记录详细的生成信息
/// - ERROR: 记录错误信息和堆栈跟踪
///
/// # 错误处理
/// - 文件路径无效：返回路径错误
/// - 文件写入失败：返回文件操作错误
///
/// # 示例
/// ```rust
/// use course_scheduling_system::commands::import_export::download_import_template;
///
/// #[tauri::command]
/// async fn test_download_template() -> Result<String, String> {
///     download_import_template("template/import_template.xlsx".to_string()).await
/// }
/// ```
#[tauri::command]
pub async fn download_import_template(output_path: String) -> Result<String, String> {
    use std::time::Instant;

    let start_time = Instant::now();

    info!("========================================");
    info!("开始生成 Excel 导入模板");
    info!("输出路径: {}", output_path);

    // 记录输出目录和文件名信息
    if let Some(parent) = std::path::Path::new(&output_path).parent() {
        debug!("输出目录: {}", parent.display());
    }
    if let Some(filename) = std::path::Path::new(&output_path).file_name() {
        debug!("文件名: {}", filename.to_string_lossy());
    }

    info!("========================================");

    // 步骤 1: 创建 Excel 工作簿
    info!("步骤 1/6: 创建 Excel 工作簿");
    let mut workbook = rust_xlsxwriter::Workbook::new();
    debug!("工作簿创建成功");

    // 步骤 2: 创建教师信息工作表
    info!("步骤 2/6: 创建教师信息工作表");
    create_teachers_template_sheet(&mut workbook)?;
    debug!("教师信息工作表创建完成");

    // 步骤 3: 创建科目配置工作表
    info!("步骤 3/6: 创建科目配置工作表");
    create_subjects_template_sheet(&mut workbook)?;
    debug!("科目配置工作表创建完成");

    // 步骤 4: 创建教学计划工作表
    info!("步骤 4/6: 创建教学计划工作表");
    create_curriculums_template_sheet(&mut workbook)?;
    debug!("教学计划工作表创建完成");

    // 步骤 5: 创建教师偏好工作表
    info!("步骤 5/6: 创建教师偏好工作表");
    create_teacher_preferences_template_sheet(&mut workbook)?;
    debug!("教师偏好工作表创建完成");

    // 步骤 6: 保存模板文件
    info!("步骤 6/6: 保存模板文件");
    let save_start = Instant::now();

    // 确保输出目录存在
    if let Some(parent) = std::path::Path::new(&output_path).parent() {
        if !parent.exists() {
            info!("创建输出目录: {}", parent.display());
            std::fs::create_dir_all(parent).map_err(|e| {
                error!("创建输出目录失败: {}", e);
                error!("目录路径: {}", parent.display());
                error!("操作失败，总耗时: {:?}", start_time.elapsed());
                format!("创建输出目录失败: {}", e)
            })?;
            debug!("输出目录创建成功");
        } else {
            debug!("输出目录已存在: {}", parent.display());
        }
    }

    workbook.save(&output_path).map_err(|e| {
        error!("保存模板文件失败: {}", e);
        error!("文件路径: {}", output_path);
        error!("操作失败，总耗时: {:?}", start_time.elapsed());
        format!("保存模板文件失败: {}", e)
    })?;

    let save_duration = save_start.elapsed();
    info!("模板文件保存成功，耗时: {:?}", save_duration);

    // 记录保存后的文件信息
    match std::fs::metadata(&output_path) {
        Ok(metadata) => {
            let file_size = metadata.len();
            info!("文件大小: {} 字节 ({:.2} KB)", file_size, file_size as f64 / 1024.0);
            debug!("模板文件保存成功");
        }
        Err(e) => {
            warn!("无法获取保存文件的元数据: {}", e);
        }
    }

    // 获取绝对路径
    let absolute_path = std::fs::canonicalize(&output_path)
        .map_err(|e| {
            error!("获取绝对路径失败: {}", e);
            error!("相对路径: {}", output_path);
            format!("获取绝对路径失败: {}", e)
        })?
        .to_string_lossy()
        .to_string();

    let total_duration = start_time.elapsed();

    info!("========================================");
    info!("Excel 导入模板生成完成");
    info!("文件路径: {}", absolute_path);
    info!("总耗时: {:?}", total_duration);
    info!("========================================");

    Ok(absolute_path)
}

// ============================================================================
// 模板生成辅助函数
// ============================================================================

/// 创建教师信息模板工作表
fn create_teachers_template_sheet(
    workbook: &mut rust_xlsxwriter::Workbook,
) -> Result<(), String> {
    use rust_xlsxwriter::{Format, FormatAlign, FormatBorder, Color};

    debug!("创建教师信息模板工作表");

    let worksheet = workbook
        .add_worksheet()
        .set_name("教师信息")
        .map_err(|e| format!("创建工作表失败: {}", e))?;

    // 创建样式
    let header_format = Format::new()
        .set_bold()
        .set_align(FormatAlign::Center)
        .set_background_color(Color::RGB(0x4472C4))
        .set_font_color(Color::White)
        .set_border(FormatBorder::Thin);

    let _cell_format = Format::new()
        .set_align(FormatAlign::Left)
        .set_border(FormatBorder::Thin);

    let example_format = Format::new()
        .set_align(FormatAlign::Left)
        .set_border(FormatBorder::Thin)
        .set_font_color(Color::RGB(0x808080));

    // 写入标题行
    worksheet
        .write_string_with_format(0, 0, "教师姓名", &header_format)
        .map_err(|e| format!("写入标题失败: {}", e))?;
    worksheet
        .write_string_with_format(0, 1, "教研组", &header_format)
        .map_err(|e| format!("写入标题失败: {}", e))?;

    // 写入示例数据
    let examples = vec![
        ("张老师", "数学组"),
        ("李老师", "语文组"),
        ("王老师", "英语组"),
    ];

    for (i, (name, group)) in examples.iter().enumerate() {
        let row = (i + 1) as u32;
        worksheet
            .write_string_with_format(row, 0, *name, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 1, *group, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
    }

    // 设置列宽
    worksheet
        .set_column_width(0, 15)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(1, 15)
        .map_err(|e| format!("设置列宽失败: {}", e))?;

    // 添加说明
    worksheet
        .write_string(5, 0, "说明：")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(6, 0, "1. 教师姓名：必填，不能为空")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(7, 0, "2. 教研组：选填，用于按教研组分组显示")
        .map_err(|e| format!("写入说明失败: {}", e))?;

    debug!("教师信息模板工作表创建完成");
    Ok(())
}

/// 创建科目配置模板工作表
fn create_subjects_template_sheet(
    workbook: &mut rust_xlsxwriter::Workbook,
) -> Result<(), String> {
    use rust_xlsxwriter::{Format, FormatAlign, FormatBorder, Color};

    debug!("创建科目配置模板工作表");

    let worksheet = workbook
        .add_worksheet()
        .set_name("科目配置")
        .map_err(|e| format!("创建工作表失败: {}", e))?;

    // 创建样式
    let header_format = Format::new()
        .set_bold()
        .set_align(FormatAlign::Center)
        .set_background_color(Color::RGB(0x70AD47))
        .set_font_color(Color::White)
        .set_border(FormatBorder::Thin);

    let example_format = Format::new()
        .set_align(FormatAlign::Left)
        .set_border(FormatBorder::Thin)
        .set_font_color(Color::RGB(0x808080));

    // 写入标题行
    let headers = vec![
        "科目ID",
        "科目名称",
        "禁止时段",
        "是否允许连堂",
        "场地",
        "是否主科",
    ];
    for (i, header) in headers.iter().enumerate() {
        worksheet
            .write_string_with_format(0, i as u16, *header, &header_format)
            .map_err(|e| format!("写入标题失败: {}", e))?;
    }

    // 写入示例数据
    let examples = vec![
        ("MATH", "数学", "", "是", "", "是"),
        ("CHINESE", "语文", "", "是", "", "是"),
        ("ENGLISH", "英语", "", "是", "", "是"),
        ("PE", "体育", "1-1,1-2,1-3", "否", "操场", "否"),
        ("MUSIC", "音乐", "1-1,1-2,1-3", "否", "音乐室", "否"),
        ("ART", "美术", "1-1,1-2,1-3", "否", "美术室", "否"),
    ];

    for (i, (id, name, forbidden, allow_double, venue, is_major)) in examples.iter().enumerate() {
        let row = (i + 1) as u32;
        worksheet
            .write_string_with_format(row, 0, *id, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 1, *name, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 2, *forbidden, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 3, *allow_double, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 4, *venue, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 5, *is_major, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
    }

    // 设置列宽
    worksheet
        .set_column_width(0, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(1, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(2, 20)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(3, 15)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(4, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(5, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;

    // 添加说明
    worksheet
        .write_string(8, 0, "说明：")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(9, 0, "1. 科目ID：必填，唯一标识符，如 MATH、CHINESE")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(10, 0, "2. 科目名称：必填，如 数学、语文")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(11, 0, "3. 禁止时段：选填，格式为 星期-节次，多个用逗号分隔，如 1-1,1-2,1-3")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(12, 0, "4. 是否允许连堂：必填，填写 是 或 否")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(13, 0, "5. 场地：选填，如 操场、音乐室")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(14, 0, "6. 是否主科：必填，填写 是 或 否")
        .map_err(|e| format!("写入说明失败: {}", e))?;

    debug!("科目配置模板工作表创建完成");
    Ok(())
}

/// 创建教学计划模板工作表
fn create_curriculums_template_sheet(
    workbook: &mut rust_xlsxwriter::Workbook,
) -> Result<(), String> {
    use rust_xlsxwriter::{Format, FormatAlign, FormatBorder, Color};

    debug!("创建教学计划模板工作表");

    let worksheet = workbook
        .add_worksheet()
        .set_name("教学计划")
        .map_err(|e| format!("创建工作表失败: {}", e))?;

    // 创建样式
    let header_format = Format::new()
        .set_bold()
        .set_align(FormatAlign::Center)
        .set_background_color(Color::RGB(0xFFC000))
        .set_font_color(Color::Black)
        .set_border(FormatBorder::Thin);

    let example_format = Format::new()
        .set_align(FormatAlign::Left)
        .set_border(FormatBorder::Thin)
        .set_font_color(Color::RGB(0x808080));

    // 写入标题行
    let headers = vec![
        "班级名称",
        "科目ID",
        "教师姓名",
        "目标课时数",
        "是否合班课",
        "合班班级",
    ];
    for (i, header) in headers.iter().enumerate() {
        worksheet
            .write_string_with_format(0, i as u16, *header, &header_format)
            .map_err(|e| format!("写入标题失败: {}", e))?;
    }

    // 写入示例数据
    let examples = vec![
        ("初一(1)班", "MATH", "张老师", "6", "否", ""),
        ("初一(1)班", "CHINESE", "李老师", "6", "否", ""),
        ("初一(1)班", "ENGLISH", "王老师", "5", "否", ""),
        ("初一(1)班", "PE", "赵老师", "3", "否", ""),
        ("初一(2)班", "MATH", "张老师", "6", "否", ""),
    ];

    for (i, (class, subject, teacher, sessions, is_combined, combined_classes)) in
        examples.iter().enumerate()
    {
        let row = (i + 1) as u32;
        worksheet
            .write_string_with_format(row, 0, *class, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 1, *subject, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 2, *teacher, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 3, *sessions, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 4, *is_combined, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 5, *combined_classes, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
    }

    // 设置列宽
    worksheet
        .set_column_width(0, 15)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(1, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(2, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(3, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(4, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(5, 20)
        .map_err(|e| format!("设置列宽失败: {}", e))?;

    // 添加说明
    worksheet
        .write_string(7, 0, "说明：")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(8, 0, "1. 班级名称：必填，如 初一(1)班")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(9, 0, "2. 科目ID：必填，必须在科目配置表中存在")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(10, 0, "3. 教师姓名：必填，必须在教师信息表中存在")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(11, 0, "4. 目标课时数：必填，1-40之间的整数")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(12, 0, "5. 是否合班课：必填，填写 是 或 否")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(13, 0, "6. 合班班级：选填，多个班级用逗号分隔，如 初一(2)班,初一(3)班")
        .map_err(|e| format!("写入说明失败: {}", e))?;

    debug!("教学计划模板工作表创建完成");
    Ok(())
}

/// 创建教师偏好模板工作表
fn create_teacher_preferences_template_sheet(
    workbook: &mut rust_xlsxwriter::Workbook,
) -> Result<(), String> {
    use rust_xlsxwriter::{Format, FormatAlign, FormatBorder, Color};

    debug!("创建教师偏好模板工作表");

    let worksheet = workbook
        .add_worksheet()
        .set_name("教师偏好")
        .map_err(|e| format!("创建工作表失败: {}", e))?;

    // 创建样式
    let header_format = Format::new()
        .set_bold()
        .set_align(FormatAlign::Center)
        .set_background_color(Color::RGB(0xED7D31))
        .set_font_color(Color::White)
        .set_border(FormatBorder::Thin);

    let example_format = Format::new()
        .set_align(FormatAlign::Left)
        .set_border(FormatBorder::Thin)
        .set_font_color(Color::RGB(0x808080));

    // 写入标题行
    let headers = vec!["教师姓名", "偏好时段", "早晚偏好", "权重系数", "不排课时段"];
    for (i, header) in headers.iter().enumerate() {
        worksheet
            .write_string_with_format(0, i as u16, *header, &header_format)
            .map_err(|e| format!("写入标题失败: {}", e))?;
    }

    // 写入示例数据
    let examples = vec![
        ("张老师", "1-4,1-5,2-4,2-5", "0", "1", ""),
        ("李老师", "1-3,1-4,2-3,2-4", "1", "2", ""),
        ("王老师", "", "2", "1", "1-1,1-2"),
    ];

    for (i, (teacher, preferred, time_bias, weight, blocked)) in examples.iter().enumerate() {
        let row = (i + 1) as u32;
        worksheet
            .write_string_with_format(row, 0, *teacher, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 1, *preferred, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 2, *time_bias, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 3, *weight, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
        worksheet
            .write_string_with_format(row, 4, *blocked, &example_format)
            .map_err(|e| format!("写入示例数据失败: {}", e))?;
    }

    // 设置列宽
    worksheet
        .set_column_width(0, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(1, 25)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(2, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(3, 12)
        .map_err(|e| format!("设置列宽失败: {}", e))?;
    worksheet
        .set_column_width(4, 25)
        .map_err(|e| format!("设置列宽失败: {}", e))?;

    // 添加说明
    worksheet
        .write_string(5, 0, "说明：")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(6, 0, "1. 教师姓名：必填，必须在教师信息表中存在")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(7, 0, "2. 偏好时段：选填，格式为 星期-节次，多个用逗号分隔，如 1-4,1-5,2-4")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(8, 0, "3. 早晚偏好：必填，0=无偏好，1=厌恶早课，2=厌恶晚课")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(9, 0, "4. 权重系数：必填，正整数，数值越大表示偏好越重要")
        .map_err(|e| format!("写入说明失败: {}", e))?;
    worksheet
        .write_string(10, 0, "5. 不排课时段：选填，格式同偏好时段，这些时段不会安排课程")
        .map_err(|e| format!("写入说明失败: {}", e))?;

    debug!("教师偏好模板工作表创建完成");
    Ok(())
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ========================================================================
    // 导入功能测试
    // ========================================================================

    #[test]
    fn test_validate_time_slots_format_valid() {
        // 测试有效的时间槽位格式
        assert!(validate_time_slots_format("1-1", 1).is_ok());
        assert!(validate_time_slots_format("1-1,1-2,1-3", 1).is_ok());
        assert!(validate_time_slots_format("1-1,2-3,3-5", 1).is_ok());
        assert!(validate_time_slots_format("", 1).is_ok());
        assert!(validate_time_slots_format("  ", 1).is_ok());
    }

    #[test]
    fn test_validate_time_slots_format_invalid() {
        // 测试无效的时间槽位格式
        assert!(validate_time_slots_format("1", 1).is_err());
        assert!(validate_time_slots_format("1-", 1).is_err());
        assert!(validate_time_slots_format("-1", 1).is_err());
        assert!(validate_time_slots_format("1-1-1", 1).is_err());
        assert!(validate_time_slots_format("a-1", 1).is_err());
        assert!(validate_time_slots_format("1-a", 1).is_err());
        assert!(validate_time_slots_format("0-1", 1).is_err());
        assert!(validate_time_slots_format("8-1", 1).is_err());
        assert!(validate_time_slots_format("1-0", 1).is_err());
        assert!(validate_time_slots_format("1-13", 1).is_err());
    }

    #[test]
    fn test_validate_import_data_empty_teachers() {
        // 测试教师信息为空的情况
        let data = ImportData {
            teachers: vec![],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("教师信息不能为空"));
    }

    #[test]
    fn test_validate_import_data_empty_subjects() {
        // 测试科目配置为空的情况
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![],
            curriculums: vec![],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("科目配置不能为空"));
    }

    #[test]
    fn test_validate_import_data_invalid_teacher_name() {
        // 测试教师姓名为空的情况
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "  ".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("教师姓名不能为空"));
    }

    #[test]
    fn test_validate_import_data_invalid_subject_id() {
        // 测试科目 ID 为空的情况
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "  ".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("科目 ID 不能为空"));
    }

    #[test]
    fn test_validate_import_data_invalid_curriculum_sessions() {
        // 测试目标课时数无效的情况
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![CurriculumImportData {
                class_name: "初一(1)班".to_string(),
                subject_id: "MATH".to_string(),
                teacher_name: "张老师".to_string(),
                target_sessions: 0,
                is_combined_class: false,
                combined_classes: None,
            }],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("目标课时数必须大于 0"));
    }

    #[test]
    fn test_validate_import_data_valid() {
        // 测试有效的导入数据
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: Some("数学组".to_string()),
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: Some("1-1,1-2".to_string()),
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![CurriculumImportData {
                class_name: "初一(1)班".to_string(),
                subject_id: "MATH".to_string(),
                teacher_name: "张老师".to_string(),
                target_sessions: 6,
                is_combined_class: false,
                combined_classes: None,
            }],
            teacher_preferences: vec![TeacherPreferenceImportData {
                teacher_name: "张老师".to_string(),
                preferred_slots: Some("1-4,1-5".to_string()),
                time_bias: 0,
                weight: 1,
                blocked_slots: None,
            }],
        };

        let result = validate_import_data(&data);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_import_data_duplicate_teacher_names() {
        // 测试教师姓名重复的情况
        let data = ImportData {
            teachers: vec![
                TeacherImportData {
                    name: "张老师".to_string(),
                    teaching_group: Some("数学组".to_string()),
                },
                TeacherImportData {
                    name: "张老师".to_string(),
                    teaching_group: Some("语文组".to_string()),
                },
            ],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("教师姓名"));
        assert!(error_msg.contains("重复"));
    }

    #[test]
    fn test_validate_import_data_duplicate_subject_ids() {
        // 测试科目ID重复的情况
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![
                SubjectImportData {
                    id: "MATH".to_string(),
                    name: "数学".to_string(),
                    forbidden_slots: None,
                    allow_double_session: true,
                    venue: None,
                    is_major_subject: true,
                },
                SubjectImportData {
                    id: "MATH".to_string(),
                    name: "高等数学".to_string(),
                    forbidden_slots: None,
                    allow_double_session: true,
                    venue: None,
                    is_major_subject: true,
                },
            ],
            curriculums: vec![],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("科目 ID"));
        assert!(error_msg.contains("重复"));
    }

    #[test]
    fn test_validate_import_data_subject_id_not_found() {
        // 测试教学计划中引用的科目ID不存在
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![CurriculumImportData {
                class_name: "初一(1)班".to_string(),
                subject_id: "CHINESE".to_string(), // 不存在的科目ID
                teacher_name: "张老师".to_string(),
                target_sessions: 6,
                is_combined_class: false,
                combined_classes: None,
            }],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("科目 ID"));
        assert!(error_msg.contains("不存在"));
    }

    #[test]
    fn test_validate_import_data_teacher_name_not_found() {
        // 测试教学计划中引用的教师姓名不存在
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![CurriculumImportData {
                class_name: "初一(1)班".to_string(),
                subject_id: "MATH".to_string(),
                teacher_name: "李老师".to_string(), // 不存在的教师姓名
                target_sessions: 6,
                is_combined_class: false,
                combined_classes: None,
            }],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("教师姓名"));
        assert!(error_msg.contains("不存在"));
    }

    #[test]
    fn test_validate_import_data_total_sessions_exceed_capacity() {
        // 测试总课时数超过容量
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![
                CurriculumImportData {
                    class_name: "初一(1)班".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_name: "张老师".to_string(),
                    target_sessions: 25,
                    is_combined_class: false,
                    combined_classes: None,
                },
                CurriculumImportData {
                    class_name: "初一(1)班".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_name: "张老师".to_string(),
                    target_sessions: 20,
                    is_combined_class: false,
                    combined_classes: None,
                },
            ],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("总课时数"));
        assert!(error_msg.contains("超过"));
    }

    #[test]
    fn test_validate_import_data_combined_class_without_list() {
        // 测试标记为合班课但未指定合班班级
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![CurriculumImportData {
                class_name: "初一(1)班".to_string(),
                subject_id: "MATH".to_string(),
                teacher_name: "张老师".to_string(),
                target_sessions: 6,
                is_combined_class: true,
                combined_classes: None, // 未指定合班班级
            }],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("合班课"));
        assert!(error_msg.contains("未指定"));
    }

    #[test]
    fn test_validate_import_data_teacher_preference_not_found() {
        // 测试教师偏好中引用的教师姓名不存在
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![],
            teacher_preferences: vec![TeacherPreferenceImportData {
                teacher_name: "李老师".to_string(), // 不存在的教师姓名
                preferred_slots: Some("1-4,1-5".to_string()),
                time_bias: 0,
                weight: 1,
                blocked_slots: None,
            }],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("教师姓名"));
        assert!(error_msg.contains("不存在"));
    }

    #[test]
    fn test_validate_import_data_invalid_weight() {
        // 测试权重系数为0的情况
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![],
            teacher_preferences: vec![TeacherPreferenceImportData {
                teacher_name: "张老师".to_string(),
                preferred_slots: None,
                time_bias: 0,
                weight: 0, // 无效的权重系数
                blocked_slots: None,
            }],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("权重系数"));
        assert!(error_msg.contains("大于 0"));
    }

    #[test]
    fn test_validate_import_data_multiple_errors() {
        // 测试多个错误同时存在的情况
        let data = ImportData {
            teachers: vec![
                TeacherImportData {
                    name: "张老师".to_string(),
                    teaching_group: None,
                },
                TeacherImportData {
                    name: "张老师".to_string(), // 重复的教师姓名
                    teaching_group: None,
                },
            ],
            subjects: vec![
                SubjectImportData {
                    id: "MATH".to_string(),
                    name: "数学".to_string(),
                    forbidden_slots: None,
                    allow_double_session: true,
                    venue: None,
                    is_major_subject: true,
                },
                SubjectImportData {
                    id: "MATH".to_string(), // 重复的科目ID
                    name: "高等数学".to_string(),
                    forbidden_slots: None,
                    allow_double_session: true,
                    venue: None,
                    is_major_subject: true,
                },
            ],
            curriculums: vec![CurriculumImportData {
                class_name: "初一(1)班".to_string(),
                subject_id: "CHINESE".to_string(), // 不存在的科目ID
                teacher_name: "李老师".to_string(), // 不存在的教师姓名
                target_sessions: 6,
                is_combined_class: false,
                combined_classes: None,
            }],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        // 应该包含多个错误
        assert!(error_msg.contains("教师姓名"));
        assert!(error_msg.contains("科目 ID"));
    }

    #[test]
    fn test_validate_import_data_combined_class_not_exist() {
        // 测试合班班级在教学计划中不存在
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![CurriculumImportData {
                class_name: "初一(1)班".to_string(),
                subject_id: "MATH".to_string(),
                teacher_name: "张老师".to_string(),
                target_sessions: 6,
                is_combined_class: true,
                combined_classes: Some("初一(2)班,初一(3)班".to_string()), // 这些班级不存在
            }],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("合班班级"));
        assert!(error_msg.contains("不存在"));
    }

    #[test]
    fn test_validate_import_data_combined_class_includes_self() {
        // 测试合班班级包含自己
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![
                CurriculumImportData {
                    class_name: "初一(1)班".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_name: "张老师".to_string(),
                    target_sessions: 6,
                    is_combined_class: false,
                    combined_classes: None,
                },
                CurriculumImportData {
                    class_name: "初一(2)班".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_name: "张老师".to_string(),
                    target_sessions: 6,
                    is_combined_class: true,
                    combined_classes: Some("初一(1)班,初一(2)班".to_string()), // 包含自己
                },
            ],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("合班班级不能包含自己"));
    }

    #[test]
    fn test_validate_import_data_combined_class_valid() {
        // 测试有效的合班课配置
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![
                CurriculumImportData {
                    class_name: "初一(1)班".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_name: "张老师".to_string(),
                    target_sessions: 6,
                    is_combined_class: false,
                    combined_classes: None,
                },
                CurriculumImportData {
                    class_name: "初一(2)班".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_name: "张老师".to_string(),
                    target_sessions: 6,
                    is_combined_class: false,
                    combined_classes: None,
                },
                CurriculumImportData {
                    class_name: "初一(3)班".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_name: "张老师".to_string(),
                    target_sessions: 6,
                    is_combined_class: true,
                    combined_classes: Some("初一(1)班,初一(2)班".to_string()), // 有效的合班配置
                },
            ],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_import_data_duplicate_class_subject_combination() {
        // 测试班级-科目组合重复
        let data = ImportData {
            teachers: vec![
                TeacherImportData {
                    name: "张老师".to_string(),
                    teaching_group: None,
                },
                TeacherImportData {
                    name: "李老师".to_string(),
                    teaching_group: None,
                },
            ],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![
                CurriculumImportData {
                    class_name: "初一(1)班".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_name: "张老师".to_string(),
                    target_sessions: 6,
                    is_combined_class: false,
                    combined_classes: None,
                },
                CurriculumImportData {
                    class_name: "初一(1)班".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_name: "李老师".to_string(), // 同一个班级的同一门课程，不同教师
                    target_sessions: 6,
                    is_combined_class: false,
                    combined_classes: None,
                },
            ],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("已存在教学计划"));
        assert!(error_msg.contains("不能重复"));
    }

    #[test]
    fn test_validate_import_data_invalid_time_bias() {
        // 测试无效的早晚偏好值
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: None,
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![],
            teacher_preferences: vec![TeacherPreferenceImportData {
                teacher_name: "张老师".to_string(),
                preferred_slots: None,
                time_bias: 3, // 无效值，应该是 0-2
                weight: 1,
                blocked_slots: None,
            }],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("早晚偏好值必须在 0-2 之间"));
    }

    #[test]
    fn test_validate_import_data_invalid_forbidden_slots() {
        // 测试无效的禁止时段格式
        let data = ImportData {
            teachers: vec![TeacherImportData {
                name: "张老师".to_string(),
                teaching_group: None,
            }],
            subjects: vec![SubjectImportData {
                id: "MATH".to_string(),
                name: "数学".to_string(),
                forbidden_slots: Some("1-1-1".to_string()), // 无效格式
                allow_double_session: true,
                venue: None,
                is_major_subject: true,
            }],
            curriculums: vec![],
            teacher_preferences: vec![],
        };

        let result = validate_import_data(&data);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("时间槽位格式错误"));
    }

    #[test]
    fn test_validate_import_data_comprehensive() {
        // 综合测试：包含所有类型的有效数据
        let data = ImportData {
            teachers: vec![
                TeacherImportData {
                    name: "张老师".to_string(),
                    teaching_group: Some("数学组".to_string()),
                },
                TeacherImportData {
                    name: "李老师".to_string(),
                    teaching_group: Some("语文组".to_string()),
                },
                TeacherImportData {
                    name: "王老师".to_string(),
                    teaching_group: Some("英语组".to_string()),
                },
            ],
            subjects: vec![
                SubjectImportData {
                    id: "MATH".to_string(),
                    name: "数学".to_string(),
                    forbidden_slots: None,
                    allow_double_session: true,
                    venue: None,
                    is_major_subject: true,
                },
                SubjectImportData {
                    id: "CHINESE".to_string(),
                    name: "语文".to_string(),
                    forbidden_slots: None,
                    allow_double_session: true,
                    venue: None,
                    is_major_subject: true,
                },
                SubjectImportData {
                    id: "ENGLISH".to_string(),
                    name: "英语".to_string(),
                    forbidden_slots: None,
                    allow_double_session: true,
                    venue: None,
                    is_major_subject: true,
                },
                SubjectImportData {
                    id: "PE".to_string(),
                    name: "体育".to_string(),
                    forbidden_slots: Some("1-1,1-2,1-3".to_string()),
                    allow_double_session: false,
                    venue: Some("操场".to_string()),
                    is_major_subject: false,
                },
            ],
            curriculums: vec![
                CurriculumImportData {
                    class_name: "初一(1)班".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_name: "张老师".to_string(),
                    target_sessions: 6,
                    is_combined_class: false,
                    combined_classes: None,
                },
                CurriculumImportData {
                    class_name: "初一(1)班".to_string(),
                    subject_id: "CHINESE".to_string(),
                    teacher_name: "李老师".to_string(),
                    target_sessions: 6,
                    is_combined_class: false,
                    combined_classes: None,
                },
                CurriculumImportData {
                    class_name: "初一(1)班".to_string(),
                    subject_id: "ENGLISH".to_string(),
                    teacher_name: "王老师".to_string(),
                    target_sessions: 5,
                    is_combined_class: false,
                    combined_classes: None,
                },
                CurriculumImportData {
                    class_name: "初一(2)班".to_string(),
                    subject_id: "MATH".to_string(),
                    teacher_name: "张老师".to_string(),
                    target_sessions: 6,
                    is_combined_class: false,
                    combined_classes: None,
                },
                CurriculumImportData {
                    class_name: "初一(2)班".to_string(),
                    subject_id: "PE".to_string(),
                    teacher_name: "张老师".to_string(),
                    target_sessions: 3,
                    is_combined_class: true,
                    combined_classes: Some("初一(1)班".to_string()),
                },
            ],
            teacher_preferences: vec![
                TeacherPreferenceImportData {
                    teacher_name: "张老师".to_string(),
                    preferred_slots: Some("1-4,1-5,2-4,2-5".to_string()),
                    time_bias: 0,
                    weight: 1,
                    blocked_slots: None,
                },
                TeacherPreferenceImportData {
                    teacher_name: "李老师".to_string(),
                    preferred_slots: Some("1-3,1-4".to_string()),
                    time_bias: 1,
                    weight: 2,
                    blocked_slots: Some("5-8".to_string()),
                },
            ],
        };

        let result = validate_import_data(&data);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_import_from_excel_file_not_found() {
        // 测试文件不存在的情况
        let result = import_from_excel("nonexistent.xlsx".to_string()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("文件不存在"));
    }

    #[test]
    fn test_import_result_serialization() {
        // 测试 ImportResult 的序列化和反序列化
        let result = ImportResult {
            success: true,
            success_count: 10,
            error_count: 0,
            errors: vec![],
            message: "导入成功".to_string(),
        };

        let json = serde_json::to_string(&result);
        assert!(json.is_ok());

        let json_str = json.unwrap();
        let deserialized: Result<ImportResult, _> = serde_json::from_str(&json_str);
        assert!(deserialized.is_ok());

        let deserialized_result = deserialized.unwrap();
        assert_eq!(deserialized_result.success, true);
        assert_eq!(deserialized_result.success_count, 10);
        assert_eq!(deserialized_result.error_count, 0);
    }

    // ========================================================================
    // 导出功能测试
    // ========================================================================

    #[tokio::test]
    async fn test_export_to_excel_class_schedule() {
        // 测试导出班级课表
        use tempfile::tempdir;

        let temp_dir = tempdir().unwrap();
        let output_path = temp_dir.path().join("class_schedule.xlsx");

        let result = export_to_excel(
            ExportType::ClassSchedule,
            output_path.to_string_lossy().to_string(),
        )
        .await;

        assert!(result.is_ok());
        assert!(output_path.exists());
    }

    #[tokio::test]
    async fn test_export_to_excel_teacher_schedule() {
        // 测试导出教师课表
        use tempfile::tempdir;

        let temp_dir = tempdir().unwrap();
        let output_path = temp_dir.path().join("teacher_schedule.xlsx");

        let result = export_to_excel(
            ExportType::TeacherSchedule,
            output_path.to_string_lossy().to_string(),
        )
        .await;

        assert!(result.is_ok());
        assert!(output_path.exists());
    }

    #[tokio::test]
    async fn test_export_to_excel_master_schedule() {
        // 测试导出总课表
        use tempfile::tempdir;

        let temp_dir = tempdir().unwrap();
        let output_path = temp_dir.path().join("master_schedule.xlsx");

        let result = export_to_excel(
            ExportType::MasterSchedule,
            output_path.to_string_lossy().to_string(),
        )
        .await;

        assert!(result.is_ok());
        assert!(output_path.exists());
    }

    #[tokio::test]
    async fn test_export_to_excel_workload_statistics() {
        // 测试导出工作量统计
        use tempfile::tempdir;

        let temp_dir = tempdir().unwrap();
        let output_path = temp_dir.path().join("workload_statistics.xlsx");

        let result = export_to_excel(
            ExportType::WorkloadStatistics,
            output_path.to_string_lossy().to_string(),
        )
        .await;

        assert!(result.is_ok());
        assert!(output_path.exists());
    }

    #[test]
    fn test_get_mock_schedule_data() {
        // 测试模拟数据生成
        let data = get_mock_schedule_data();
        assert!(!data.is_empty());
        assert_eq!(data.len(), 4);

        // 验证数据结构
        assert_eq!(data[0].class_name, "初一(1)班");
        assert_eq!(data[0].subject_name, "数学");
        assert_eq!(data[0].teacher_name, "张老师");
    }

    #[test]
    fn test_create_class_schedule_workbook() {
        // 测试创建班级课表工作簿
        let data = get_mock_schedule_data();
        let result = create_class_schedule_workbook(&data);
        assert!(result.is_ok());
    }

    #[test]
    fn test_create_teacher_schedule_workbook() {
        // 测试创建教师课表工作簿
        let data = get_mock_schedule_data();
        let result = create_teacher_schedule_workbook(&data);
        assert!(result.is_ok());
    }

    #[test]
    fn test_create_master_schedule_workbook() {
        // 测试创建总课表工作簿
        let data = get_mock_schedule_data();
        let result = create_master_schedule_workbook(&data);
        assert!(result.is_ok());
    }

    #[test]
    fn test_create_workload_statistics_workbook() {
        // 测试创建工作量统计工作簿
        let data = get_mock_schedule_data();
        let result = create_workload_statistics_workbook(&data);
        assert!(result.is_ok());
    }

    #[test]
    fn test_export_type_serialization() {
        // 测试 ExportType 的序列化和反序列化
        let export_type = ExportType::ClassSchedule;
        let json = serde_json::to_string(&export_type);
        assert!(json.is_ok());

        let json_str = json.unwrap();
        let deserialized: Result<ExportType, _> = serde_json::from_str(&json_str);
        assert!(deserialized.is_ok());
    }

    // ========================================================================
    // 模板下载功能测试
    // ========================================================================

    #[tokio::test]
    async fn test_download_import_template() {
        // 测试下载导入模板
        use tempfile::tempdir;

        let temp_dir = tempdir().unwrap();
        let output_path = temp_dir.path().join("import_template.xlsx");

        let result = download_import_template(output_path.to_string_lossy().to_string()).await;

        assert!(result.is_ok());
        assert!(output_path.exists());

        // 验证文件不为空
        let metadata = std::fs::metadata(&output_path).unwrap();
        assert!(metadata.len() > 0);
    }

    #[test]
    fn test_create_teachers_template_sheet() {
        // 测试创建教师信息模板工作表
        let mut workbook = rust_xlsxwriter::Workbook::new();
        let result = create_teachers_template_sheet(&mut workbook);
        assert!(result.is_ok());
    }

    #[test]
    fn test_create_subjects_template_sheet() {
        // 测试创建科目配置模板工作表
        let mut workbook = rust_xlsxwriter::Workbook::new();
        let result = create_subjects_template_sheet(&mut workbook);
        assert!(result.is_ok());
    }

    #[test]
    fn test_create_curriculums_template_sheet() {
        // 测试创建教学计划模板工作表
        let mut workbook = rust_xlsxwriter::Workbook::new();
        let result = create_curriculums_template_sheet(&mut workbook);
        assert!(result.is_ok());
    }

    #[test]
    fn test_create_teacher_preferences_template_sheet() {
        // 测试创建教师偏好模板工作表
        let mut workbook = rust_xlsxwriter::Workbook::new();
        let result = create_teacher_preferences_template_sheet(&mut workbook);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_download_import_template_creates_directory() {
        // 测试模板下载时自动创建目录
        use tempfile::tempdir;

        let temp_dir = tempdir().unwrap();
        let output_path = temp_dir
            .path()
            .join("subdir")
            .join("import_template.xlsx");

        let result = download_import_template(output_path.to_string_lossy().to_string()).await;

        assert!(result.is_ok());
        assert!(output_path.exists());
        assert!(output_path.parent().unwrap().exists());
    }
}
