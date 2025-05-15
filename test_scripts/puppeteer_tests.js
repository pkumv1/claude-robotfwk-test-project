const puppeteer = require('puppeteer');
const expect = require('expect');

// Self-healing test functions
function getElementSelector(page, elementDescription) {
  // Strategy pattern for element selection with fallbacks
  const selectors = {
    'login button': ['#login-button', '[data-test="login"]', 'button:contains("Login")'],
    'username field': ['#username', '[name="username"]', 'input[placeholder*="username" i]'],
    'password field': ['#password', '[name="password"]', 'input[type="password"]'],
    'dashboard title': ['#dashboard-title', '.dashboard-header h1', 'h1:contains("Dashboard")']
  };
  
  return selectors[elementDescription] || [];
}

async function findElement(page, elementDescription) {
  const selectors = getElementSelector(page, elementDescription);
  
  // Try each selector in priority order
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        console.log(`Found ${elementDescription} with selector: ${selector}`);
        return { element, selector };
      }
    } catch (error) {
      console.log(`Selector ${selector} failed, trying next option`);
    }
  }
  
  throw new Error(`Could not find element: ${elementDescription}`);
}

// Test cases
async function runSystemTest() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // System test - Complete user journey
    console.log('Running system test - Complete user journey');
    await page.goto('https://demo.example.com');
    
    // Login with self-healing selectors
    const { selector: usernameSelector } = await findElement(page, 'username field');
    const { selector: passwordSelector } = await findElement(page, 'password field');
    const { selector: loginButtonSelector } = await findElement(page, 'login button');
    
    await page.type(usernameSelector, 'demo_user');
    await page.type(passwordSelector, 'demo_password');
    await page.click(loginButtonSelector);
    
    // Verify dashboard loaded
    await page.waitForNavigation();
    const { element: dashboardTitle } = await findElement(page, 'dashboard title');
    const titleText = await page.evaluate(el => el.textContent, dashboardTitle);
    expect(titleText).toContain('Dashboard');
    
    // Create new item
    await page.click('#create-new');
    await page.type('#item-name', 'Test Item');
    await page.click('#save-item');
    
    // Verify item created
    await page.waitForSelector('.item-card');
    const itemName = await page.$eval('.item-card:first-child .item-name', el => el.textContent);
    expect(itemName).toBe('Test Item');
    
    console.log('System test passed');
  } catch (error) {
    console.error('System test failed:', error);
  } finally {
    await browser.close();
  }
}

async function runStressTest() {
  const browser = await puppeteer.launch({ headless: true });
  
  try {
    console.log('Running stress test - Multiple concurrent sessions');
    
    // Launch multiple browsers to simulate concurrent users
    const browserCount = 5;
    const pages = [];
    
    for (let i = 0; i < browserCount; i++) {
      const page = await browser.newPage();
      pages.push(page);
    }
    
    // Run operations concurrently
    await Promise.all(pages.map(async (page, index) => {
      await page.goto('https://demo.example.com');
      
      // Login process
      await page.type('#username', `user${index}`);
      await page.type('#password', 'password');
      await page.click('#login-button');
      
      // Perform random operations
      for (let i = 0; i < 10; i++) {
        await page.click('#random-action');
        await page.waitForSelector('#action-result');
      }
      
      // Measure response time
      const startTime = Date.now();
      await page.click('#dashboard-link');
      await page.waitForSelector('#dashboard-loaded');
      const loadTime = Date.now() - startTime;
      
      console.log(`Browser ${index} load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000); // Response time under 5 seconds
    }));
    
    console.log('Stress test passed');
  } catch (error) {
    console.error('Stress test failed:', error);
  } finally {
    await browser.close();
  }
}

async function runVisualRegressionTest() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Running visual regression test');
    await page.goto('https://demo.example.com/dashboard');
    
    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1280, height: 800 });
    
    // Take screenshot of key components
    await page.screenshot({ path: 'results/visual/dashboard_current.png' });
    
    // Compare with baseline image (simplified for example)
    const pixelmatch = require('pixelmatch');
    const { readFileSync } = require('fs');
    const { PNG } = require('pngjs');
    
    const baseline = PNG.sync.read(readFileSync('results/visual/dashboard_baseline.png'));
    const current = PNG.sync.read(readFileSync('results/visual/dashboard_current.png'));
    const diff = new PNG({ width: baseline.width, height: baseline.height });
    
    const mismatchedPixels = pixelmatch(
      baseline.data, 
      current.data, 
      diff.data, 
      baseline.width, 
      baseline.height, 
      { threshold: 0.1 }
    );
    
    const mismatchPercentage = (mismatchedPixels / (baseline.width * baseline.height)) * 100;
    console.log(`Visual difference: ${mismatchPercentage.toFixed(2)}%`);
    
    // Visual test passes if difference is less than 5%
    expect(mismatchPercentage).toBeLessThan(5);
    console.log('Visual regression test passed');
  } catch (error) {
    console.error('Visual regression test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run tests
async function runAllTests() {
  await runSystemTest();
  await runStressTest();
  await runVisualRegressionTest();
  console.log('All Puppeteer tests completed');
}

runAllTests();