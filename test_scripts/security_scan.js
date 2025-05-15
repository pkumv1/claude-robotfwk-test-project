/**
 * Automated security scan
 */
const axios = require('axios');
const { JSDOM } = require('jsdom');
const fs = require('fs');

// Security checks to perform
const securityChecks = [
    {
        name: 'HTTP Headers',
        description: 'Check for important security headers',
        check: async (url) => {
            try {
                const response = await axios.get(url, { 
                    validateStatus: () => true,
                    headers: { 'User-Agent': 'Security-Scanner/1.0' }
                });
                
                const headers = response.headers;
                const results = [];
                
                // Check for important security headers
                const securityHeaders = {
                    'strict-transport-security': { required: true, description: 'Ensures the browser only uses HTTPS' },
                    'content-security-policy': { required: true, description: 'Controls resources the browser is allowed to load' },
                    'x-content-type-options': { required: true, description: 'Prevents MIME type sniffing' },
                    'x-frame-options': { required: true, description: 'Protects against clickjacking' },
                    'x-xss-protection': { required: false, description: 'Enables browser XSS filtering' },
                    'referrer-policy': { required: false, description: 'Controls referrer information' },
                    'permissions-policy': { required: false, description: 'Controls browser features and APIs' },
                };
                
                Object.entries(securityHeaders).forEach(([header, config]) => {
                    const headerValue = headers[header];
                    results.push({
                        check: `${header} header`,
                        status: headerValue ? 'PASS' : (config.required ? 'FAIL' : 'WARN'),
                        value: headerValue || 'Not Present',
                        description: config.description
                    });
                });
                
                // Check for cookies
                const cookies = headers['set-cookie'] || [];
                let cookieResults = [];
                
                if (cookies.length > 0) {
                    cookies.forEach(cookie => {
                        const isSecure = cookie.includes('Secure');
                        const isHttpOnly = cookie.includes('HttpOnly');
                        const hasSameSite = cookie.includes('SameSite');
                        
                        cookieResults.push({
                            check: `Cookie: ${cookie.split(';')[0].split('=')[0]}`,
                            status: (isSecure && isHttpOnly && hasSameSite) ? 'PASS' : 'WARN',
                            value: `Secure: ${isSecure}, HttpOnly: ${isHttpOnly}, SameSite: ${hasSameSite}`,
                            description: 'Cookie security flags'
                        });
                    });
                } else {
                    cookieResults.push({
                        check: 'Cookies',
                        status: 'INFO',
                        value: 'No cookies set',
                        description: 'No cookies found in response'
                    });
                }
                
                return [...results, ...cookieResults];
            } catch (error) {
                return [{
                    check: 'HTTP Headers',
                    status: 'ERROR',
                    value: error.message,
                    description: 'Error checking HTTP headers'
                }];
            }
        }
    },
    {
        name: 'TLS/SSL Configuration',
        description: 'Check TLS/SSL configuration',
        check: async (url) => {
            try {
                // This is a simplified check - in a real scenario, you would use
                // a tool like sslyze or OpenSSL to check TLS configuration
                const isHttps = url.startsWith('https://');
                
                return [{
                    check: 'HTTPS Enabled',
                    status: isHttps ? 'PASS' : 'FAIL',
                    value: isHttps ? 'Yes' : 'No',
                    description: 'Website should use HTTPS'
                }];
            } catch (error) {
                return [{
                    check: 'HTTPS Check',
                    status: 'ERROR',
                    value: error.message,
                    description: 'Error checking HTTPS configuration'
                }];
            }
        }
    },
    {
        name: 'Form Security',
        description: 'Check form security implementation',
        check: async (url) => {
            try {
                const response = await axios.get(url, {
                    validateStatus: () => true,
                    headers: { 'User-Agent': 'Security-Scanner/1.0' }
                });
                
                const dom = new JSDOM(response.data);
                const document = dom.window.document;
                const forms = document.querySelectorAll('form');
                
                if (forms.length === 0) {
                    return [{
                        check: 'Form Security',
                        status: 'INFO',
                        value: 'No forms found',
                        description: 'No forms to check on this page'
                    }];
                }
                
                const results = [];
                
                forms.forEach((form, index) => {
                    const formId = form.id || form.name || `form-${index + 1}`;
                    const method = form.method.toUpperCase() || 'GET';
                    const hasCsrfToken = !!form.querySelector('input[name*="csrf"], input[name*="token"]');
                    
                    results.push({
                        check: `Form Method (${formId})`,
                        status: method === 'POST' ? 'PASS' : 'WARN',
                        value: method,
                        description: 'Forms should use POST method for data submission'
                    });
                    
                    results.push({
                        check: `CSRF Protection (${formId})`,
                        status: hasCsrfToken ? 'PASS' : 'FAIL',
                        value: hasCsrfToken ? 'Present' : 'Missing',
                        description: 'Forms should contain CSRF tokens'
                    });
                    
                    // Check for autocomplete on sensitive fields
                    const passwordFields = form.querySelectorAll('input[type="password"]');
                    passwordFields.forEach((field, fieldIndex) => {
                        const autocomplete = field.getAttribute('autocomplete');
                        results.push({
                            check: `Password Autocomplete (${formId}, field ${fieldIndex + 1})`,
                            status: autocomplete === 'off' || autocomplete === 'new-password' ? 'PASS' : 'WARN',
                            value: autocomplete || 'Not Set',
                            description: 'Password fields should have autocomplete disabled'
                        });
                    });
                });
                
                return results;
            } catch (error) {
                return [{
                    check: 'Form Security',
                    status: 'ERROR',
                    value: error.message,
                    description: 'Error checking form security'
                }];
            }
        }
    },
    {
        name: 'Client-Side Security',
        description: 'Check for client-side security issues',
        check: async (url) => {
            try {
                const response = await axios.get(url, {
                    validateStatus: () => true,
                    headers: { 'User-Agent': 'Security-Scanner/1.0' }
                });
                
                const dom = new JSDOM(response.data);
                const document = dom.window.document;
                
                const results = [];
                
                // Check for inline scripts
                const inlineScripts = document.querySelectorAll('script:not([src])');
                results.push({
                    check: 'Inline Scripts',
                    status: inlineScripts.length === 0 ? 'PASS' : 'WARN',
                    value: `${inlineScripts.length} found`,
                    description: 'Inline scripts may violate Content Security Policy'
                });
                
                // Check for eval usage
                const scriptContent = Array.from(inlineScripts).map(script => script.textContent).join('\n');
                const hasEval = scriptContent.includes('eval(');
                results.push({
                    check: 'Eval Usage',
                    status: hasEval ? 'FAIL' : 'PASS',
                    value: hasEval ? 'Found' : 'Not Found',
                    description: 'Eval usage can lead to XSS vulnerabilities'
                });
                
                // Check third-party scripts
                const externalScripts = document.querySelectorAll('script[src]');
                const thirdPartyScripts = Array.from(externalScripts).filter(script => {
                    const src = script.getAttribute('src');
                    return src && !src.startsWith('/') && !src.startsWith('./') && !src.startsWith('../');
                });
                
                results.push({
                    check: 'Third-Party Scripts',
                    status: thirdPartyScripts.length === 0 ? 'PASS' : 'INFO',
                    value: `${thirdPartyScripts.length} found`,
                    description: 'Third-party scripts should be carefully reviewed'
                });
                
                return results;
            } catch (error) {
                return [{
                    check: 'Client-Side Security',
                    status: 'ERROR',
                    value: error.message,
                    description: 'Error checking client-side security'
                }];
            }
        }
    }
];

/**
 * Run security scan on provided URL
 * @param {string} url - URL to scan
 * @returns {Object} - Scan results
 */
async function runSecurityScan(url) {
    console.log(`Running security scan on ${url}...`);
    
    const results = {
        target: url,
        timestamp: new Date().toISOString(),
        summary: {
            pass: 0,
            warn: 0,
            fail: 0,
            info: 0,
            error: 0
        },
        checks: {}
    };
    
    for (const check of securityChecks) {
        console.log(`Running check: ${check.name}`);
        try {
            const checkResults = await check.check(url);
            
            results.checks[check.name] = {
                description: check.description,
                results: checkResults
            };
            
            // Update summary
            checkResults.forEach(result => {
                const status = result.status.toLowerCase();
                if (results.summary[status] !== undefined) {
                    results.summary[status]++;
                }
            });
        } catch (error) {
            console.error(`Error in check "${check.name}":`, error);
            results.checks[check.name] = {
                description: check.description,
                error: error.message
            };
            results.summary.error++;
        }
    }
    
    return results;
}

/**
 * Main execution function
 * @param {string} url - URL to scan
 * @returns {number} - Exit code (0 for no critical issues, 1 for critical issues)
 */
async function main(url) {
    try {
        const results = await runSecurityScan(url);
        
        // Output results
        console.log('\n=== Security Scan Results ===');
        console.log(`Target: ${results.target}`);
        console.log(`Timestamp: ${results.timestamp}`);
        console.log('\nSummary:');
        console.log(`PASS: ${results.summary.pass}`);
        console.log(`WARN: ${results.summary.warn}`);
        console.log(`FAIL: ${results.summary.fail}`);
        console.log(`INFO: ${results.summary.info}`);
        console.log(`ERROR: ${results.summary.error}`);
        
        // Log JSON results
        console.log(JSON.stringify(results, null, 2));
        
        // Return code based on failures
        return (results.summary.fail > 0 || results.summary.error > 0) ? 1 : 0;
    } catch (error) {
        console.error('Error running security scan:', error);
        return 1;
    }
}

// Check if URL is provided as argument
if (process.argv.length < 3) {
    console.error('Usage: node security_scan.js <url>');
    process.exit(1);
}

// Run the scan and exit with appropriate code
const url = process.argv[2];
main(url).then(exitCode => {
    process.exit(exitCode);
}).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
