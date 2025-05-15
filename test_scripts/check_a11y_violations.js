/**
 * Check accessibility violations from axe-core results
 */
const fs = require('fs');

/**
 * Process accessibility results and report critical violations
 * @param {string} reportPath - Path to the JSON report file
 * @returns {number} - Exit code (0 for success, 1 for violations)
 */
function checkViolations(reportPath) {
    try {
        // Read and parse the report file
        const reportData = fs.readFileSync(reportPath, 'utf8');
        const results = JSON.parse(reportData);
        
        if (!results || !results.violations) {
            console.error('Invalid report format or no violations section found');
            return 1;
        }
        
        // Critical impact levels that should fail the test
        const criticalImpacts = ['critical', 'serious'];
        
        // Filter for critical violations
        const criticalViolations = results.violations.filter(
            violation => criticalImpacts.includes(violation.impact)
        );
        
        // Generate summary report
        const totalViolations = results.violations.length;
        const criticalCount = criticalViolations.length;
        
        console.log('=== Accessibility Test Results ===');
        console.log(`Total Violations: ${totalViolations}`);
        console.log(`Critical Violations: ${criticalCount}`);
        
        // If there are critical violations, log details and fail the test
        if (criticalCount > 0) {
            console.log('\nCritical Violations:');
            criticalViolations.forEach((violation, index) => {
                console.log(`\n${index + 1}. ${violation.id} - ${violation.description}`);
                console.log(`   Impact: ${violation.impact}`);
                console.log(`   Help: ${violation.help}`);
                console.log(`   Help URL: ${violation.helpUrl}`);
                console.log('   Affected Elements:');
                
                violation.nodes.forEach((node, nodeIndex) => {
                    console.log(`     ${nodeIndex + 1}. ${node.html}`);
                    
                    if (node.failureSummary) {
                        console.log(`        ${node.failureSummary.replace(/\n/g, '\n        ')}`);
                    }
                });
            });
            
            return 1; // Critical violations found
        }
        
        // Create a detailed report file
        const reportContent = generateDetailedReport(results);
        const detailedReportPath = reportPath.replace('.json', '-detailed.html');
        fs.writeFileSync(detailedReportPath, reportContent);
        
        console.log(`\nDetailed report saved to: ${detailedReportPath}`);
        
        return 0; // No critical violations
    } catch (error) {
        console.error(`Error processing accessibility report: ${error.message}`);
        return 1;
    }
}

/**
 * Generate detailed HTML report from accessibility results
 * @param {Object} results - Accessibility test results
 * @returns {string} - HTML report content
 */
function generateDetailedReport(results) {
    const violations = results.violations || [];
    const passes = results.passes || [];
    const incomplete = results.incomplete || [];
    
    // Count by impact
    const impactCounts = violations.reduce((counts, violation) => {
        counts[violation.impact] = (counts[violation.impact] || 0) + 1;
        return counts;
    }, {});
    
    // Create HTML content
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #2c3e50; }
        .summary { display: flex; gap: 20px; margin-bottom: 30px; }
        .card { flex: 1; min-width: 150px; background: #fff; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); padding: 15px; }
        .card h3 { margin-top: 0; }
        .metric { font-size: 28px; font-weight: bold; margin: 10px 0; }
        .critical { color: #e74c3c; }
        .serious { color: #e67e22; }
        .moderate { color: #f1c40f; }
        .minor { color: #3498db; }
        .good { color: #2ecc71; }
        .violation { margin-bottom: 20px; border-left: 4px solid #e74c3c; padding-left: 15px; }
        .pass { margin-bottom: 20px; border-left: 4px solid #2ecc71; padding-left: 15px; }
        .incomplete { margin-bottom: 20px; border-left: 4px solid #f1c40f; padding-left: 15px; }
        details { margin: 10px 0; }
        summary { cursor: pointer; font-weight: bold; }
        .element { font-family: monospace; background: #f8f9fa; padding: 5px; margin: 5px 0; border-radius: 3px; }
        .tabs { display: flex; margin-bottom: 20px; }
        .tab { padding: 10px 20px; cursor: pointer; background: #f8f9fa; border: none; }
        .tab.active { background: #2c3e50; color: white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
    </style>
</head>
<body>
    <h1>Accessibility Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    <div class="summary">
        <div class="card">
            <h3>Violations</h3>
            <div class="metric ${violations.length > 0 ? 'critical' : 'good'}">${violations.length}</div>
        </div>
        <div class="card">
            <h3>Passes</h3>
            <div class="metric good">${passes.length}</div>
        </div>
        <div class="card">
            <h3>Incomplete</h3>
            <div class="metric ${incomplete.length > 0 ? 'moderate' : 'good'}">${incomplete.length}</div>
        </div>
    </div>
    
    <h2>Violations by Impact</h2>
    <div class="summary">
        <div class="card">
            <h3>Critical</h3>
            <div class="metric ${(impactCounts.critical || 0) > 0 ? 'critical' : 'good'}">${impactCounts.critical || 0}</div>
        </div>
        <div class="card">
            <h3>Serious</h3>
            <div class="metric ${(impactCounts.serious || 0) > 0 ? 'serious' : 'good'}">${impactCounts.serious || 0}</div>
        </div>
        <div class="card">
            <h3>Moderate</h3>
            <div class="metric ${(impactCounts.moderate || 0) > 0 ? 'moderate' : 'good'}">${impactCounts.moderate || 0}</div>
        </div>
        <div class="card">
            <h3>Minor</h3>
            <div class="metric ${(impactCounts.minor || 0) > 0 ? 'minor' : 'good'}">${impactCounts.minor || 0}</div>
        </div>
    </div>
    
    <div class="tabs">
        <button class="tab active" onclick="showTab(0)">Violations (${violations.length})</button>
        <button class="tab" onclick="showTab(1)">Passes (${passes.length})</button>
        <button class="tab" onclick="showTab(2)">Incomplete (${incomplete.length})</button>
    </div>
    
    <div class="tab-content active">
        <h2>Violations</h2>
        ${violations.length === 0 ? '<p>No violations found!</p>' : ''}
        ${violations.map(violation => `
            <div class="violation">
                <h3>${violation.id}: ${violation.help}</h3>
                <p><strong>Impact:</strong> <span class="${violation.impact}">${violation.impact}</span></p>
                <p>${violation.description}</p>
                <p><a href="${violation.helpUrl}" target="_blank">Learn more</a></p>
                <details>
                    <summary>Affected Elements (${violation.nodes.length})</summary>
                    ${violation.nodes.map(node => `
                        <div>
                            <div class="element">${escapeHTML(node.html)}</div>
                            <div>${node.failureSummary.replace(/\n/g, '<br>')}</div>
                        </div>
                    `).join('')}
                </details>
            </div>
        `).join('')}
    </div>
    
    <div class="tab-content">
        <h2>Passes</h2>
        ${passes.length === 0 ? '<p>No passing tests!</p>' : ''}
        ${passes.map(pass => `
            <div class="pass">
                <h3>${pass.id}: ${pass.help}</h3>
                <p>${pass.description}</p>
                <details>
                    <summary>Elements (${pass.nodes.length})</summary>
                    ${pass.nodes.slice(0, 5).map(node => `
                        <div class="element">${escapeHTML(node.html)}</div>
                    `).join('')}
                    ${pass.nodes.length > 5 ? `<p>...and ${pass.nodes.length - 5} more elements</p>` : ''}
                </details>
            </div>
        `).join('')}
    </div>
    
    <div class="tab-content">
        <h2>Incomplete</h2>
        ${incomplete.length === 0 ? '<p>No incomplete tests!</p>' : ''}
        ${incomplete.map(item => `
            <div class="incomplete">
                <h3>${item.id}: ${item.help}</h3>
                <p>${item.description}</p>
                <p><a href="${item.helpUrl}" target="_blank">Learn more</a></p>
                <details>
                    <summary>Elements (${item.nodes.length})</summary>
                    ${item.nodes.map(node => `
                        <div>
                            <div class="element">${escapeHTML(node.html)}</div>
                            <div>${(node.any || []).map(check => check.message).join('<br>')}</div>
                        </div>
                    `).join('')}
                </details>
            </div>
        `).join('')}
    </div>
    
    <script>
        function showTab(index) {
            const tabs = document.querySelectorAll('.tab');
            const contents = document.querySelectorAll('.tab-content');
            
            tabs.forEach(tab => tab.classList.remove('active'));
            contents.forEach(content => content.classList.remove('active'));
            
            tabs[index].classList.add('active');
            contents[index].classList.add('active');
        }
        
        // Initialize tabs
        document.addEventListener('DOMContentLoaded', () => {
            showTab(0);
        });
    </script>
</body>
</html>
    `;
}

/**
 * Escape HTML special characters
 * @param {string} html - HTML string to escape
 * @returns {string} - Escaped HTML
 */
function escapeHTML(html) {
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Check if file path is provided as argument
if (process.argv.length < 3) {
    console.error('Usage: node check_a11y_violations.js <report-path>');
    process.exit(1);
}

// Process the report and exit with appropriate code
const reportPath = process.argv[2];
const exitCode = checkViolations(reportPath);
process.exit(exitCode);
