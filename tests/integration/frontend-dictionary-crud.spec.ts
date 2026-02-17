/**
 * 字典 CRUD 功能测试
 * 测试教师、班级、科目字典的增删改查功能
 */
import { test, expect } from '@playwright/test';

test.describe('字典 CRUD 功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // 导航到字典管理页面
    await page.click('text=字典管理');
    await page.waitForLoadState('networkidle');
  });

  test('1. 教师字典 - 添加教师', async ({ page }) => {
    // 切换到教师标签页
    await page.click('.el-tabs__item:has-text("教师")');
    await page.waitForTimeout(500);

    // 点击添加按钮
    await page.click('button:has-text("添加教师")');
    await page.waitForTimeout(500);

    // 填写表单
    await page.fill('input[placeholder="请输入教师姓名"]', '测试教师');

    // 点击保存
    await page.click('.el-dialog button:has-text("保存")');
    await page.waitForTimeout(500);

    // 验证添加成功
    await expect(page.locator('text=添加成功')).toBeVisible();

    console.log('✓ 教师添加成功');
  });

  test('2. 班级字典 - 添加班级', async ({ page }) => {
    // 切换到班级标签页
    await page.click('.el-tabs__item:has-text("班级")');
    await page.waitForTimeout(500);

    // 点击添加按钮
    await page.click('button:has-text("添加班级")');
    await page.waitForTimeout(500);

    // 填写表单
    await page.fill('input[placeholder="请输入班级名称"]', '测试班级');

    // 点击保存
    await page.click('.el-dialog button:has-text("保存")');
    await page.waitForTimeout(500);

    // 验证添加成功
    await expect(page.locator('text=添加成功')).toBeVisible();

    console.log('✓ 班级添加成功');
  });

  test('3. 科目字典 - 添加科目', async ({ page }) => {
    // 切换到科目标签页
    await page.click('.el-tabs__item:has-text("科目")');
    await page.waitForTimeout(500);

    // 点击添加按钮
    await page.click('button:has-text("添加科目")');
    await page.waitForTimeout(500);

    // 填写表单
    await page.fill('input[placeholder="请输入科目名称"]', '测试科目');

    // 点击保存
    await page.click('.el-dialog button:has-text("保存")');
    await page.waitForTimeout(500);

    // 验证添加成功
    await expect(page.locator('text=添加成功')).toBeVisible();

    console.log('✓ 科目添加成功');
  });

  test('4. 教师字典 - 编辑和删除', async ({ page }) => {
    // 切换到教师标签页
    await page.click('.el-tabs__item:has-text("教师")');
    await page.waitForTimeout(500);

    // 先添加一个教师
    await page.click('button:has-text("添加教师")');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="请输入教师姓名"]', '待编辑教师');
    await page.click('.el-dialog button:has-text("保存")');
    await page.waitForTimeout(1000);

    // 点击编辑按钮（第一行的编辑按钮）
    const editButton = page.locator('.el-table tbody tr').first().locator('button.el-button--primary');
    await editButton.click();
    await page.waitForTimeout(500);

    // 修改名称
    await page.fill('input[placeholder="请输入教师姓名"]', '已编辑教师');
    await page.click('.el-dialog button:has-text("保存")');
    await page.waitForTimeout(500);

    // 验证更新成功
    await expect(page.locator('text=更新成功')).toBeVisible();
    await page.waitForTimeout(1000);

    // 点击删除按钮
    const deleteButton = page.locator('.el-table tbody tr').first().locator('button.el-button--danger');
    await deleteButton.click();
    await page.waitForTimeout(500);

    // 确认删除
    await page.click('.el-message-box button:has-text("确定")');
    await page.waitForTimeout(500);

    // 验证删除成功
    await expect(page.locator('text=删除成功')).toBeVisible();

    console.log('✓ 教师编辑和删除成功');
  });

  test('5. 验证所有字典都有添加按钮', async ({ page }) => {
    // 教师
    await page.click('.el-tabs__item:has-text("教师")');
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("添加教师")')).toBeVisible();

    // 班级
    await page.click('.el-tabs__item:has-text("班级")');
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("添加班级")')).toBeVisible();

    // 科目
    await page.click('.el-tabs__item:has-text("科目")');
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("添加科目")')).toBeVisible();

    // 教研组
    await page.click('.el-tabs__item:has-text("教研组")');
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("添加教研组")')).toBeVisible();

    // 年级
    await page.click('.el-tabs__item:has-text("年级")');
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("添加年级")')).toBeVisible();

    // 场地
    await page.click('.el-tabs__item:has-text("场地")');
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("添加场地")')).toBeVisible();

    console.log('✓ 所有字典都有添加按钮');
  });
});
