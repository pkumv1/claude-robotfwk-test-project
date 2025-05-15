/**
 * Load time analysis script
 */
const fs = require('fs');
const path = require('path');

/**
 * Analyze page load times from CSV data
 * @param {string} filePath - Path to CSV file with load time data
 */
function analyzeLoadTimes(filePath) {
    try {
        // Read CSV file
        const data = fs.readFileSync(filePath, 'utf8');
        const lines = data.trim().split('\n');
        
        // Parse data
        const loadTimes = {};
        lines.forEach(line => {
            const [page, time] = line.split(',');
            if (!loadTimes[page]) {
                loadTimes[page] = [];
            }
            loadTimes[page].push(parseFloat(time));
        });
        
        // Calculate statistics
        const stats = {};
        let slowestPage = null;
        let fastestPage = null;
        let slowestTime = -1;
        let fastestTime = Number.MAX_VALUE;
        
        Object.entries(loadTimes).forEach(([page, times]) => {
            // Calculate average
            const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
            
            // Calculate min/max
            const min = Math.min(...times);
            const max = Math.max(...times);
            
            // Calculate median
            const sortedTimes = [...times].sort((a, b) => a - b);
            const mid = Math.floor(sortedTimes.length / 2);
            const median = sortedTimes.length % 2 === 0
                ? (sortedTimes[mid - 1] + sortedTimes[mid]) / 2
                : sortedTimes[mid];
            
            // Calculate standard deviation
            const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
            const stdDev = Math.sqrt(variance);
            
            // Store stats
            stats[page] = {
                count: times.length,
                avg,
                min,
                max,
                median,
                stdDev
            };
            
            // Track slowest/fastest pages
            if (avg > slowestTime) {
                slowestTime = avg;
                slowestPage = page;
            }
            
            if (avg < fastestTime) {
                fastestTime = avg;
                fastestPage = page;
            }
        });
        
        // Define performance thresholds
        const thresholds = {
            good: 1.0,    // Load time <= 1s is good
            acceptable: 3.0  // Load time <= 3s is acceptable
        };
        
        // Analyze results against thresholds
        const analysis = {
            overall: {
                fastestPage,
                fastestTime,
                slowestPage,
                slowestTime
            },
            pageAnalysis: {}
        };
        
        Object.entries(stats).forEach(([page, pageStats]) => {
            let performance;
            if (pageStats.avg <= thresholds.good) {
                performance = 'good';
            } else if (pageStats.avg <= thresholds.acceptable) {
                performance = 'acceptable';
            } else {
                performance = 'poor';
            }
            
            analysis.pageAnalysis[page] = {
                ...pageStats,
                performance,
                needsOptimization: performance === 'poor'
            };
        });
        
        // Output as JSON
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            thresholds,
            stats,
            analysis
        }, null, 2);
    } catch (error) {
        console.error('Error analyzing load times:', error);
        return JSON.stringify({ error: error.message });
    }
}

// Check if file path is provided as argument
if (process.argv.length < 3) {
    console.error('Usage: node analyze_load_times.js <csv-file-path>');
    process.exit(1);
}

// Process the file and output results
const filePath = process.argv[2];
const analysis = analyzeLoadTimes(filePath);
console.log(analysis);
