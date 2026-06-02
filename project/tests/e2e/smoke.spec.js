const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5000';
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'admin123';
const STUDENT_USERNAME = process.env.E2E_STUDENT_USERNAME || 'student';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'student123';

async function login(page, path, username, password) {
  await page.goto(BASE_URL + path);
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#btn-login').click();
}

test.describe('smoke and auth guards', () => {
  test('redirects anonymous users away from private pages', async ({ page }) => {
    await page.goto(BASE_URL + '/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.goto(BASE_URL + '/student/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin can sign in and reach admin dashboard', async ({ page }) => {
    await login(page, '/admin/login', ADMIN_USERNAME, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('student can sign in and reach student dashboard', async ({ page }) => {
    await login(page, '/login', STUDENT_USERNAME, STUDENT_PASSWORD);
    await expect(page).toHaveURL(/\/student\/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });
});
