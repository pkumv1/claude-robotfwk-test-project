/**
 * Enhanced Puppeteer tests with self-healing capabilities
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { SelfHealingPage } = require('./self_healing_utils');

// Configuration
const config = {
  url: 'https://demo.example.com',
  screenshotsDir: path.join(__dirname, '..', 'results', 'visual'),
  resultsDir: path.join(__dirname, '..', 'results')
};

// Ensure directories exist
if (!fs.existsSync(config.screenshotsDir)) {
  fs.mkdirSync(config.screenshotsDir, { recursive: true });
}

/**
 * Run all Puppeteer tests
 */
async function runTests() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const healingPage = new SelfHealingPage(page);
  
  // Define element selectors with alternatives for self-healing
  healingPage.element('username', ['#username', '[name="username"]', '[data-test="username"]']);
  healingPage.element('password', ['#password', '[name="password"]', '[data-test="password"]']);
  healingPage.element('loginButton', ['#login-button', 'button[type="submit"]', '[data-test="login-button"]']);
  healingPage.element('welcomeMessage', ['.welcome-message', '#welcome', 'h1.greeting']);
  
  // Test results collection
  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    // Run login test with self-healing
    await runTest('Login with valid credentials', async () => {
      await healingPage.goto(`${config.url}`);
      await healingPage.screenshot(`${config.screenshotsDir}/login-page.png`);
      
      await healingPage.element('username').type('demo_user');
      await healingPage.element('password').type('demo_password');
      await healingPage.element('loginButton').click();
      
      // Wait for redirect and welcome message
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      const welcomeVisible = await healingPage.element('welcomeMessage').waitForVisible(5000);
      
      if (!welcomeVisible) {
        throw new Error('Welcome message not displayed after login');
      }
      
      await healingPage.screenshot(`${config.screenshotsDir}/dashboard-after-login.png`);
      
      const welcomeText = await healingPage.element('welcomeMessage').getText();
      if (!welcomeText.includes('Welcome')) {
        throw new Error(`Welcome message does not contain expected text. Found: "${welcomeText}"`);
      }
      
      return true;
    }, testResults);
    
    // Run invalid login test
    await runTest('Login with invalid credentials', async () => {
      await healingPage.goto(`${config.url}`);
      
      await healingPage.element('username').type('invalid_user');
      await healingPage.element('password').type('invalid_password');
      await healingPage.element('loginButton').click();
      
      // Check for error message
      healingPage.element('errorMessage', ['.error-message', '#error', '[data-test="error"]']);
      const errorVisible = await healingPage.element('errorMessage').waitForVisible(5000);
      
      if (!errorVisible) {
        throw new Error('Error message not displayed after invalid login');
      }
      
      await healingPage.screenshot(`${config.screenshotsDir}/login-error.png`);
      
      const errorText = await healingPage.element('errorMessage').getText();
      if (!errorText.includes('Invalid')) {
        throw new Error(`Error message does not contain expected text. Found: "${errorText}"`);
      }
      
      return true;
    }, testResults);
    
    // Visual regression test
    await runTest('Visual regression test - login page', async () => {
      await healingPage.goto(`${config.url}`);
      
      // Take screenshot for comparison
      await healingPage.screenshot(`${config.screenshotsDir}/login-current.png`);
      
      // This would normally compare with a baseline image
      // For demo purposes, we're just checking if the screenshot was taken
      if (!fs.existsSync(`${config.screenshotsDir}/login-current.png`)) {
        throw new Error('Failed to take screenshot for visual comparison');
      }
      
      return true;
    }, testResults);
    
    // Self-learning test (updates selectors based on actual page structure)
    await runTest('Self-learning test - discover new selectors', async () => {
      await healingPage.goto(`${config.url}`);
      
      // Discover and learn new selectors
      const newSelectors = await page.evaluate(() => {
        const selectors = {};
        
        // Find potential username fields
        const usernameFields = Array.from(document.querySelectorAll('input[type="text"], input[type="email"]'));
        selectors.username = usernameFields.map(el => {
          const id = el.id ? `#${el.id}` : '';
          const classes = el.className ? `.${el.className.replace(/\s+/g, '.')}` : '';
          const name = el.name ? `[name="${el.name}"]` : '';
          return [id, classes, name].filter(s => s).join(', ');
        });
        
        // Find potential password fields
        const passwordFields = Array.from(document.querySelectorAll('input[type="password"]'));
        selectors.password = passwordFields.map(el => {
          const id = el.id ? `#${el.id}` : '';
          const classes = el.className ? `.${el.className.replace(/\s+/g, '.')}` : '';
          const name = el.name ? `[name="${el.name}"]` : '';
          return [id, classes, name].filter(s => s).join(', ');
        });
        
        // Find potential login buttons
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        selectors.loginButton = buttons.map(el => {
          const id = el.id ? `#${el.id}` : '';
          const classes = el.className ? `.${el.className.replace(/\s+/g, '.')}` : '';
          const type = el.type ? `[type="${el.type}"]` : '';
          return [id, classes, type].filter(s => s).join(', ');
        });
        
        return selectors;
      });
      
      // Add new selectors to our healing elements
      for (const [name, selectors] of Object.entries(newSelectors)) {
        selectors.forEach(selector => {
          if (selector) {
            healingPage.element(name, selector);
          }
        });
      }
      
      // Test the learned selectors
      const usernameWorks = await healingPage.element('username').exists();
      const passwordWorks = await healingPage.element('password').exists();
      const loginButtonWorks = await healingPage.element('loginButton').exists();
      
      if (!usernameWorks || !passwordWorks || !loginButtonWorks) {
        throw new Error('Self-learning test failed: not all elements could be found with learned selectors');
      }
      
      // Save learned selectors for future use
      fs.writeFileSync(
        path.join(config.resultsDir, 'learned_selectors.json'),
        JSON.stringify(newSelectors, null, 2)
      );
      
      return true;
    }, testResults);
    
  } catch (error) {
    console.error('Unexpected error in test suite:', error);
    testResults.failed++;
  } finally {
    // Save test results
    const resultsPath = path.join(config.resultsDir, 'puppeteer-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    
    console.log('\nTest Results Summary:');
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Total: ${testResults.passed + testResults.failed}`);
    console.log(`Results saved to: ${resultsPath}`);
    
    await browser.close();
  }
  
  return testResults.failed === 0;
}

/**
 * Run a single test and record results
 * @param {string} name - Test name
 * @param {Function} testFn - Async test function
 * @param {Object} results - Results object to update
 */
async function runTest(name, testFn, results) {
  console.log(`\nRunning test: ${name}`);
  const startTime = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✓ Test passed (${duration}ms): ${name}`);
    results.passed++;
    results.tests.push({
      name,
      status: 'PASS',
      duration
    });
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`✗ Test failed (${duration}ms): ${name}`);
    console.error(`  Error: ${error.message}`);
    results.failed++;
    results.tests.push({
      name,
      status: 'FAIL',
      error: error.message,
      duration
    });
    return false;
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTests };
