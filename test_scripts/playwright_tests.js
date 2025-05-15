const { test, expect } = require('@playwright/test');

// Unit Testing
test.describe('Unit Testing - Login Component', () => {
  test('should validate username format', async ({ page }) => {
    await page.goto('https://demo.example.com');
    await page.fill('#username', 'invalid@email');
    await page.click('#validate-username');
    const validationMessage = await page.locator('#username-validation').textContent();
    expect(validationMessage).toContain('Invalid format');
  });
});

// Integration Testing
test.describe('Integration Testing - Login Flow', () => {
  test('should authenticate and redirect to dashboard', async ({ page }) => {
    await page.goto('https://demo.example.com');
    await page.fill('#username', 'demo_user');
    await page.fill('#password', 'demo_password');
    await page.click('#login-button');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    // Verify user session is created
    const userInfo = await page.locator('#user-info').textContent();
    expect(userInfo).toContain('demo_user');
  });
});

// System Testing
test.describe('System Testing - End-to-End Flow', () => {
  test('should allow user to login, create a task, and logout', async ({ page }) => {
    // Login
    await page.goto('https://demo.example.com');
    await page.fill('#username', 'demo_user');
    await page.fill('#password', 'demo_password');
    await page.click('#login-button');
    
    // Create task
    await page.click('#new-task-button');
    await page.fill('#task-title', 'Test Task');
    await page.fill('#task-description', 'This is a test task');
    await page.click('#save-task');
    
    // Verify task creation
    const taskList = await page.locator('.task-list');
    await expect(taskList).toContainText('Test Task');
    
    // Logout
    await page.click('#logout');
    await expect(page).toHaveURL(/.*login/);
  });
});

// Visual Regression Testing
test('Visual Testing - Dashboard Layout', async ({ page }) => {
  await page.goto('https://demo.example.com/dashboard');
  // Take screenshot and compare with baseline
  await expect(page).toHaveScreenshot('dashboard.png');
});

// Accessibility Testing
test('Accessibility Testing - Login Page', async ({ page }) => {
  await page.goto('https://demo.example.com');
  // Run accessibility audit
  const accessibilityViolations = await page.evaluate(() => {
    return window.runAxe();
  });
  expect(accessibilityViolations.length).toBe(0);
});

// Security Testing
test('Security Testing - XSS Prevention', async ({ page }) => {
  await page.goto('https://demo.example.com/profile');
  await page.fill('#bio', '<script>alert("XSS")</script>');
  await page.click('#save-profile');
  
  // Navigate to page where the content is displayed
  await page.goto('https://demo.example.com/user/profile');
  
  // Verify script tags were sanitized
  const bioContent = await page.locator('#user-bio').innerHTML();
  expect(bioContent).not.toContain('<script>');
});