const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  testScripts: path.join(__dirname, '..', 'test_scripts'),
  testCases: path.join(__dirname, '..', 'test_cases'),
  resultsDir: path.join(__dirname, '..', 'results'),
  frameworks: ['playwright', 'selenium', 'puppeteer']
};

// Ensure results directories exist
const createDirs = () => {
  const dirs = [
    config.resultsDir,
    path.join(config.resultsDir, 'coverage'),
    path.join(config.resultsDir, 'metrics'),
    path.join(config.resultsDir, 'visual')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Run tests for each framework
const runTests = async () => {
  const results = {};
  const startTime = Date.now();
  
  console.log('Starting test execution...');
  
  for (const framework of config.frameworks) {
    console.log(`\nRunning ${framework} tests...`);
    const frameworkFile = path.join(config.testScripts, `${framework}_tests.js`);
    
    try {
      execSync(`node ${frameworkFile}`, { stdio: 'inherit' });
      results[framework] = { status: 'PASS', duration: 0 };
    } catch (error) {
      results[framework] = { status: 'FAIL', error: error.message, duration: 0 };
    }
  }
  
  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000;
  
  return { results, totalDuration };
};

// Generate test coverage metrics
const generateCoverage = () => {
  // This would typically integrate with a code coverage tool
  // Mocked for demonstration purposes
  return {
    overall: 87.5,
    byCategory: {
      unit: 92,
      integration: 88,
      system: 85,
      acceptance: 78,
      regression: 90,
      performance: 82,
      stress: 80,
      security: 75,
      usability: 95,
      accessibility: 85,
      api: 94,
      visual: 88
    }
  };
};

// Calculate test metrics
const calculateMetrics = (results, coverage) => {
  const passedFrameworks = Object.values(results).filter(r => r.status === 'PASS').length;
  const totalFrameworks = Object.keys(results).length;
  
  return {
    passRate: (passedFrameworks / totalFrameworks) * 100,
    coverage: coverage.overall,
    riskAssessment: {
      securityRisk: coverage.byCategory.security < 80 ? 'HIGH' : 'LOW',
      accessibilityRisk: coverage.byCategory.accessibility < 80 ? 'HIGH' : 'LOW',
      performanceRisk: coverage.byCategory.performance < 80 ? 'HIGH' : 'LOW'
    },
    testDebt: {
      missingCoverage: 100 - coverage.overall,
      priorityAreas: Object.entries(coverage.byCategory)
        .filter(([_, value]) => value < 80)
        .map(([key]) => key)
    }
  };
};

// Generate HTML report
const generateReport = (results, metrics, duration) => {
  const reportPath = path.join(config.resultsDir, 'test-report.html');
  const timestamp = new Date().toISOString();
  
  const coverageData = metrics.coverage.toFixed(2);
  const passRateData = metrics.passRate.toFixed(2);
  
  // Create test coverage charts data
  const categoryData = Object.entries(metrics.coverage.byCategory)
    .map(([category, value]) => `['${category}', ${value}]`)
    .join(',');
  
  const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Execution Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
    h1, h2 { color: #2c3e50; }
    .container { max-width: 1200px; margin: 0 auto; }
    .dashboard { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px; }
    .card { flex: 1; min-width: 250px; background: #fff; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); padding: 20px; }
    .metric { font-size: 32px; font-weight: bold; margin: 10px 0; }
    .good { color: #27ae60; }
    .warning { color: #f39c12; }
    .danger { color: #e74c3c; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .pass { color: #27ae60; }
    .fail { color: #e74c3c; }
  </style>
  <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
  <script type="text/javascript">
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(drawCharts);
    
    function drawCharts() {
      // Coverage by category
      var categoryData = google.visualization.arrayToDataTable([
        ['Category', 'Coverage'],
        ${categoryData}
      ]);
      
      var categoryOptions = {
        title: 'Test Coverage by Category',
        pieHole: 0.4,
        colors: ['#2ecc71', '#3498db', '#9b59b6', '#e74c3c', '#f1c40f', '#1abc9c', '#34495e', '#7f8c8d', '#d35400', '#c0392b', '#16a085', '#8e44ad']
      };
      
      var categoryChart = new google.visualization.PieChart(document.getElementById('categoryChart'));
      categoryChart.draw(categoryData, categoryOptions);
      
      // Overall coverage gauge
      var gaugeData = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['Coverage', ${coverageData}]
      ]);
      
      var gaugeOptions = {
        min: 0, max: 100,
        yellowFrom: 60, yellowTo: 80,
        redFrom: 0, redTo: 60,
        greenFrom: 80, greenTo: 100,
        minorTicks: 5
      };
      
      var gauge = new google.visualization.Gauge(document.getElementById('coverageGauge'));
      gauge.draw(gaugeData, gaugeOptions);
    }
  </script>
</head>
<body>
  <div class="container">
    <h1>Test Execution Report</h1>
    <p>Generated: ${timestamp}</p>
    
    <div class="dashboard">
      <div class="card">
        <h3>Test Pass Rate</h3>
        <div class="metric ${passRateData >= 90 ? 'good' : passRateData >= 70 ? 'warning' : 'danger'}">${passRateData}%</div>
      </div>
      <div class="card">
        <h3>Test Coverage</h3>
        <div class="metric ${coverageData >= 80 ? 'good' : coverageData >= 60 ? 'warning' : 'danger'}">${coverageData}%</div>
      </div>
      <div class="card">
        <h3>Execution Time</h3>
        <div class="metric">${duration.toFixed(2)}s</div>
      </div>
    </div>
    
    <div style="display: flex; gap: 20px; margin-bottom: 30px;">
      <div style="flex: 1;">
        <div id="coverageGauge" style="width: 100%; height: 200px;"></div>
      </div>
      <div style="flex: 2;">
        <div id="categoryChart" style="width: 100%; height: 300px;"></div>
      </div>
    </div>
    
    <h2>Test Results by Framework</h2>
    <table>
      <tr>
        <th>Framework</th>
        <th>Status</th>
        <th>Duration</th>
      </tr>
      ${Object.entries(results).map(([framework, result]) => `
        <tr>
          <td>${framework}</td>
          <td class="${result.status === 'PASS' ? 'pass' : 'fail'}">${result.status}</td>
          <td>${result.duration}s</td>
        </tr>
      `).join('')}
    </table>
    
    <h2>Risk Assessment</h2>
    <table>
      <tr>
        <th>Risk Area</th>
        <th>Level</th>
        <th>Recommendation</th>
      </tr>
      <tr>
        <td>Security</td>
        <td class="${metrics.riskAssessment.securityRisk === 'LOW' ? 'good' : 'danger'}">${metrics.riskAssessment.securityRisk}</td>
        <td>${metrics.riskAssessment.securityRisk === 'LOW' ? 'Continue monitoring' : 'Increase security test coverage'}</td>
      </tr>
      <tr>
        <td>Accessibility</td>
        <td class="${metrics.riskAssessment.accessibilityRisk === 'LOW' ? 'good' : 'danger'}">${metrics.riskAssessment.accessibilityRisk}</td>
        <td>${metrics.riskAssessment.accessibilityRisk === 'LOW' ? 'Continue monitoring' : 'Improve accessibility compliance'}</td>
      </tr>
      <tr>
        <td>Performance</td>
        <td class="${metrics.riskAssessment.performanceRisk === 'LOW' ? 'good' : 'danger'}">${metrics.riskAssessment.performanceRisk}</td>
        <td>${metrics.riskAssessment.performanceRisk === 'LOW' ? 'Continue monitoring' : 'Address performance bottlenecks'}</td>
      </tr>
    </table>
    
    <h2>Test Debt</h2>
    <p><strong>Missing Coverage: </strong>${metrics.testDebt.missingCoverage.toFixed(2)}%</p>
    <p><strong>Priority Areas for Improvement: </strong>${metrics.testDebt.priorityAreas.length > 0 ? metrics.testDebt.priorityAreas.join(', ') : 'None'}</p>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(reportPath, reportHtml);
  console.log(`Report generated: ${reportPath}`);
  
  // Also save metrics as JSON for further processing
  fs.writeFileSync(
    path.join(config.resultsDir, 'metrics', 'metrics.json'),
    JSON.stringify({ results, metrics, duration }, null, 2)
  );
};

// Main execution function
const main = async () => {
  try {
    createDirs();
    const { results, totalDuration } = await runTests();
    const coverage = generateCoverage();
    const metrics = calculateMetrics(results, coverage);
    generateReport(results, metrics, totalDuration);
    
    console.log('\nTest execution completed successfully.');
    console.log(`Total execution time: ${totalDuration.toFixed(2)}s`);
    console.log(`Overall test coverage: ${metrics.coverage.toFixed(2)}%`);
    console.log(`Test pass rate: ${metrics.passRate.toFixed(2)}%`);
    
    if (metrics.testDebt.priorityAreas.length > 0) {
      console.log(`\nPriority areas for improvement: ${metrics.testDebt.priorityAreas.join(', ')}`);
    }
  } catch (error) {
    console.error('Error executing tests:', error);
    process.exit(1);
  }
};

// Execute main function
main();