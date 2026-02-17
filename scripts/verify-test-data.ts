/**
 * 验证测试数据文件
 */
import ExcelJS from 'exceljs';
import path from 'path';

async function verifyTestData() {
  const filePath = path.resolve(process.cwd(), 'data/测试数据.xlsx');

  console.log('验证测试数据文件:', filePath);
  console.log('');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log('工作表列表:');
  workbook.worksheets.forEach((sheet, index) => {
    const rowCount = sheet.rowCount;
    console.log(`  ${index + 1}. ${sheet.name} (${rowCount} 行)`);
  });

  console.log('');
  console.log('详细数据统计:');

  workbook.worksheets.forEach(sheet => {
    const dataRows = sheet.rowCount - 1; // 减去标题行
    console.log(`  ${sheet.name}: ${dataRows} 条数据`);
  });
}

verifyTestData().catch(error => {
  console.error('验证失败:', error);
  process.exit(1);
});
