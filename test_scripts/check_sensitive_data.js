/**
 * Check for sensitive data patterns in HTML content
 */
const fs = require('fs');

// Sensitive data patterns to check for
const sensitiveDataPatterns = [
    // Credit card numbers
    { 
        name: 'Credit Card Number', 
        regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g, 
        severity: 'High' 
    },
    // Social Security Numbers
    { 
        name: 'Social Security Number', 
        regex: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, 
        severity: 'High' 
    },
    // API Keys
    { 
        name: 'Potential API Key', 
        regex: /['"]?[a-zA-Z0-9_]{20,40}['"]?/g, 
        severity: 'Medium' 
    },
    // Email addresses
    { 
        name: 'Email Address', 
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 
        severity: 'Low' 
    },
    // JWT Tokens
    { 
        name: 'JWT Token', 
        regex: /eyJ[a-zA-Z0-9_-]{5,}\.eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}/g, 
        severity: 'High' 
    },
    // Private keys
    { 
        name: 'Private Key', 
        regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[^-]+-----END [A-Z ]+ PRIVATE KEY-----/g, 
        severity: 'Critical' 
    },
    // AWS Access Key IDs
    { 
        name: 'AWS Access Key', 
        regex: /AKIA[0-9A-Z]{16}/g, 
        severity: 'High' 
    },
    // Sensitive comments
    { 
        name: 'Sensitive Comment', 
        regex: /<!-- ?(FIXME|TODO|XXX|BUG|HACK|NOTE|SECRET|SENSITIVE|REMOVE) ?-->/gi, 
        severity: 'Medium' 
    }
];

/**
 * Scan content for sensitive data patterns
 * @param {string} filePath - Path to the file to scan
 * @returns {Array} - Array of findings
 */
function scanForSensitiveData(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const findings = [];
        
        sensitiveDataPatterns.forEach(pattern => {
            const matches = content.match(pattern.regex);
            
            if (matches && matches.length > 0) {
                // Deduplicate matches
                const uniqueMatches = [...new Set(matches)];
                
                uniqueMatches.forEach(match => {
                    // Mask sensitive data in the output
                    let maskedMatch = match;
                    if (pattern.severity === 'High' || pattern.severity === 'Critical') {
                        // Show only first and last 2 chars
                        if (match.length > 6) {
                            maskedMatch = `${match.substring(0, 2)}${'*'.repeat(match.length - 4)}${match.substring(match.length - 2)}`;
                        } else {
                            maskedMatch = '******';
                        }
                    }
                    
                    findings.push({
                        type: pattern.name,
                        match: maskedMatch,
                        severity: pattern.severity
                    });
                });
            }
        });
        
        return findings;
    } catch (error) {
        console.error(`Error scanning file: ${error.message}`);
        return [];
    }
}

/**
 * Main execution function
 * @param {string} filePath - Path to the file to scan
 * @returns {number} - Exit code (0 for no critical findings, 1 for critical findings)
 */
function main(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return 1;
    }
    
    const findings = scanForSensitiveData(filePath);
    const criticalFindings = findings.filter(f => f.severity === 'Critical' || f.severity === 'High');
    
    if (findings.length > 0) {
        console.log('=== Sensitive Data Scan Results ===');
        console.log(`Total findings: ${findings.length}`);
        console.log(`Critical findings: ${criticalFindings.length}`);
        
        console.log('\nFindings:');
        findings.forEach((finding, index) => {
            console.log(`\n${index + 1}. ${finding.type} (${finding.severity})`);
            console.log(`   Value: ${finding.match}`);
        });
        
        // Save a detailed report
        const reportPath = filePath + '.sensitive_data_report.json';
        fs.writeFileSync(reportPath, JSON.stringify({ findings }, null, 2));
        console.log(`\nDetailed report saved to: ${reportPath}`);
    } else {
        console.log('No sensitive data patterns found');
    }
    
    // Return 1 if critical findings found
    return criticalFindings.length > 0 ? 1 : 0;
}

// Check if file path is provided as argument
if (process.argv.length < 3) {
    console.error('Usage: node check_sensitive_data.js <file-path>');
    process.exit(1);
}

// Process the file and exit with appropriate code
const filePath = process.argv[2];
const exitCode = main(filePath);
process.exit(exitCode);
