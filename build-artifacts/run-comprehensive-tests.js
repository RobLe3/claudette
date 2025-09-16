#!/usr/bin/env node

// Master Test Runner for Comprehensive Claudette Database and Cache Testing
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// Import all test suites
const { runComprehensiveDatabaseTest } = require('./comprehensive-database-test.js');
const { runComprehensiveCacheTest } = require('./comprehensive-cache-test.js');
const { runComprehensiveIntegrationTest } = require('./comprehensive-integration-test.js');

class MasterTestRunner {
    constructor() {
        this.testSuites = [
            { 
                name: 'Database System Tests', 
                runner: runComprehensiveDatabaseTest,
                reportFile: 'database-test-report.json',
                description: 'Tests DatabaseManager functionality, schema, performance, and reliability'
            },
            { 
                name: 'Cache System Tests', 
                runner: runComprehensiveCacheTest,
                reportFile: 'cache-test-report.json',
                description: 'Tests CacheSystem functionality, TTL, statistics, and performance'
            },
            { 
                name: 'Integration Tests', 
                runner: runComprehensiveIntegrationTest,
                reportFile: 'integration-test-report.json',
                description: 'Tests database-cache integration, memory pressure, and recovery scenarios'
            }
        ];
        
        this.results = [];
        this.startTime = null;
        this.endTime = null;
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        console.log(`${timestamp} [${level.toUpperCase()}] ${message}`);
        if (data) console.log('  Data:', JSON.stringify(data, null, 2));
    }

    async runAllTests() {
        this.log('info', '🚀 Starting Comprehensive Claudette Database and Cache System Testing');
        this.log('info', '================================================================================');
        
        this.startTime = performance.now();
        const overallStartTime = new Date();

        console.log('\n📋 TEST SUITE OVERVIEW:');
        this.testSuites.forEach((suite, index) => {
            console.log(`  ${index + 1}. ${suite.name}`);
            console.log(`     ${suite.description}`);
        });
        console.log('');

        // Run each test suite
        for (const suite of this.testSuites) {
            this.log('info', `🧪 Running ${suite.name}...`);
            console.log('=' .repeat(80));
            
            const suiteStart = performance.now();
            
            try {
                const success = await suite.runner();
                const duration = performance.now() - suiteStart;
                
                this.results.push({
                    suite: suite.name,
                    success,
                    duration: Math.round(duration),
                    reportFile: suite.reportFile,
                    timestamp: new Date().toISOString()
                });

                this.log('info', `${success ? '✅' : '❌'} ${suite.name} ${success ? 'PASSED' : 'FAILED'} (${Math.round(duration)}ms)`);
                
            } catch (error) {
                const duration = performance.now() - suiteStart;
                
                this.results.push({
                    suite: suite.name,
                    success: false,
                    duration: Math.round(duration),
                    reportFile: suite.reportFile,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });

                this.log('error', `❌ ${suite.name} FAILED with ERROR (${Math.round(duration)}ms)`, { error: error.message });
            }
            
            console.log('');
        }

        this.endTime = performance.now();
        const totalDuration = this.endTime - this.startTime;
        
        // Generate master report
        await this.generateMasterReport(overallStartTime, totalDuration);
        
        return this.results.every(r => r.success);
    }

    async generateMasterReport(startTime, totalDuration) {
        this.log('info', '📊 Generating Master Test Report');
        
        // Collect individual reports
        const individualReports = {};
        
        for (const suite of this.testSuites) {
            const reportPath = path.join(__dirname, suite.reportFile);
            if (fs.existsSync(reportPath)) {
                try {
                    const reportContent = fs.readFileSync(reportPath, 'utf8');
                    individualReports[suite.name] = JSON.parse(reportContent);
                } catch (error) {
                    this.log('warn', `Failed to read report for ${suite.name}`, { error: error.message });
                }
            }
        }

        // Aggregate statistics
        const aggregateStats = this.calculateAggregateStats(individualReports);
        
        // Generate comprehensive analysis
        const systemAnalysis = this.generateSystemAnalysis(individualReports, aggregateStats);
        
        // Generate recommendations
        const recommendations = this.generateMasterRecommendations(individualReports, systemAnalysis);

        const masterReport = {
            overview: {
                testRunTimestamp: startTime.toISOString(),
                totalDuration: Math.round(totalDuration),
                testSuitesExecuted: this.testSuites.length,
                testSuitesPassedCount: this.results.filter(r => r.success).length,
                testSuitesFailedCount: this.results.filter(r => !r.success).length,
                overallSuccess: this.results.every(r => r.success)
            },
            suiteResults: this.results,
            aggregateStatistics: aggregateStats,
            systemAnalysis,
            recommendations,
            individualReports,
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                memoryUsage: process.memoryUsage(),
                workingDirectory: process.cwd()
            },
            generatedAt: new Date().toISOString()
        };

        // Save master report
        const masterReportPath = path.join(__dirname, 'comprehensive-test-master-report.json');
        fs.writeFileSync(masterReportPath, JSON.stringify(masterReport, null, 2));
        
        // Generate and save summary report
        const summaryReport = this.generateSummaryReport(masterReport);
        const summaryPath = path.join(__dirname, 'COMPREHENSIVE_DATABASE_CACHE_TEST_RESULTS.md');
        fs.writeFileSync(summaryPath, summaryReport);

        this.log('info', `📁 Master report saved to: ${masterReportPath}`);
        this.log('info', `📄 Summary report saved to: ${summaryPath}`);

        return masterReport;
    }

    calculateAggregateStats(individualReports) {
        const stats = {
            totalTests: 0,
            totalPassed: 0,
            totalFailed: 0,
            totalDuration: 0,
            averageTestDuration: 0,
            performanceMetrics: {
                totalOperations: 0,
                totalThroughput: 0,
                averageThroughput: 0,
                cacheOperations: {
                    setOperations: 0,
                    getOperations: 0,
                    avgSetTime: 0,
                    avgGetTime: 0
                },
                databaseOperations: {
                    quotaOperations: 0,
                    cacheStorageOperations: 0,
                    avgQuotaTime: 0,
                    avgCacheStorageTime: 0
                }
            },
            reliabilityMetrics: {
                overallSuccessRate: 0,
                databaseReliability: 0,
                cacheReliability: 0,
                integrationReliability: 0
            }
        };

        let totalThroughputValues = [];
        let cacheSetTimes = [];
        let cacheGetTimes = [];
        let quotaTimes = [];

        // Aggregate data from all reports
        Object.values(individualReports).forEach(report => {
            if (report.summary) {
                stats.totalTests += report.summary.totalTests || 0;
                stats.totalPassed += report.summary.passedTests || 0;
                stats.totalFailed += report.summary.failedTests || 0;
                stats.totalDuration += report.summary.testDuration || 0;
            }

            if (report.performanceMetrics) {
                report.performanceMetrics.forEach(metric => {
                    stats.performanceMetrics.totalOperations += metric.itemCount || 0;
                    
                    if (metric.throughput) {
                        totalThroughputValues.push(metric.throughput);
                    }

                    if (metric.operation.includes('Cache Set')) {
                        cacheSetTimes.push(metric.avgTimePerItem || metric.duration);
                        stats.performanceMetrics.cacheOperations.setOperations++;
                    } else if (metric.operation.includes('Cache Get')) {
                        cacheGetTimes.push(metric.avgTimePerItem || metric.duration);
                        stats.performanceMetrics.cacheOperations.getOperations++;
                    } else if (metric.operation.includes('Quota')) {
                        quotaTimes.push(metric.avgTimePerItem || metric.duration);
                        stats.performanceMetrics.databaseOperations.quotaOperations++;
                    }
                });
            }
        });

        // Calculate averages
        if (stats.totalTests > 0) {
            stats.averageTestDuration = Math.round((stats.totalDuration / stats.totalTests) * 100) / 100;
            stats.reliabilityMetrics.overallSuccessRate = Math.round((stats.totalPassed / stats.totalTests) * 100);
        }

        if (totalThroughputValues.length > 0) {
            stats.performanceMetrics.averageThroughput = Math.round(
                totalThroughputValues.reduce((sum, val) => sum + val, 0) / totalThroughputValues.length
            );
        }

        if (cacheSetTimes.length > 0) {
            stats.performanceMetrics.cacheOperations.avgSetTime = Math.round(
                (cacheSetTimes.reduce((sum, val) => sum + val, 0) / cacheSetTimes.length) * 100
            ) / 100;
        }

        if (cacheGetTimes.length > 0) {
            stats.performanceMetrics.cacheOperations.avgGetTime = Math.round(
                (cacheGetTimes.reduce((sum, val) => sum + val, 0) / cacheGetTimes.length) * 100
            ) / 100;
        }

        if (quotaTimes.length > 0) {
            stats.performanceMetrics.databaseOperations.avgQuotaTime = Math.round(
                (quotaTimes.reduce((sum, val) => sum + val, 0) / quotaTimes.length) * 100
            ) / 100;
        }

        // Calculate component-specific reliability
        const dbReport = individualReports['Database System Tests'];
        const cacheReport = individualReports['Cache System Tests'];
        const integrationReport = individualReports['Integration Tests'];

        if (dbReport && dbReport.summary) {
            stats.reliabilityMetrics.databaseReliability = Math.round(
                (dbReport.summary.passedTests / dbReport.summary.totalTests) * 100
            );
        }

        if (cacheReport && cacheReport.summary) {
            stats.reliabilityMetrics.cacheReliability = Math.round(
                (cacheReport.summary.passedTests / cacheReport.summary.totalTests) * 100
            );
        }

        if (integrationReport && integrationReport.summary) {
            stats.reliabilityMetrics.integrationReliability = Math.round(
                (integrationReport.summary.passedTests / integrationReport.summary.totalTests) * 100
            );
        }

        return stats;
    }

    generateSystemAnalysis(individualReports, aggregateStats) {
        const analysis = {
            overallSystemHealth: 'unknown',
            componentHealth: {
                database: 'unknown',
                cache: 'unknown',
                integration: 'unknown'
            },
            performanceProfile: {
                rating: 'unknown',
                bottlenecks: [],
                strengths: []
            },
            scalabilityAssessment: {
                rating: 'unknown',
                memoryEfficiency: 'unknown',
                concurrencyHandling: 'unknown'
            },
            reliabilityAssessment: {
                rating: 'unknown',
                errorRecovery: 'unknown',
                dataIntegrity: 'unknown'
            },
            keyFindings: []
        };

        // Overall system health assessment
        const overallSuccessRate = aggregateStats.reliabilityMetrics.overallSuccessRate;
        analysis.overallSystemHealth = overallSuccessRate >= 95 ? 'excellent' :
                                     overallSuccessRate >= 85 ? 'good' :
                                     overallSuccessRate >= 70 ? 'fair' : 'poor';

        // Component health assessment
        analysis.componentHealth.database = this.getHealthRating(aggregateStats.reliabilityMetrics.databaseReliability);
        analysis.componentHealth.cache = this.getHealthRating(aggregateStats.reliabilityMetrics.cacheReliability);
        analysis.componentHealth.integration = this.getHealthRating(aggregateStats.reliabilityMetrics.integrationReliability);

        // Performance profile assessment
        const avgThroughput = aggregateStats.performanceMetrics.averageThroughput;
        analysis.performanceProfile.rating = avgThroughput >= 1000 ? 'excellent' :
                                           avgThroughput >= 500 ? 'good' :
                                           avgThroughput >= 200 ? 'fair' : 'poor';

        // Identify bottlenecks and strengths
        const avgCacheSetTime = aggregateStats.performanceMetrics.cacheOperations.avgSetTime;
        const avgCacheGetTime = aggregateStats.performanceMetrics.cacheOperations.avgGetTime;
        const avgQuotaTime = aggregateStats.performanceMetrics.databaseOperations.avgQuotaTime;

        if (avgCacheSetTime > 5) {
            analysis.performanceProfile.bottlenecks.push(`Slow cache SET operations (${avgCacheSetTime}ms avg)`);
        }
        if (avgCacheGetTime > 2) {
            analysis.performanceProfile.bottlenecks.push(`Slow cache GET operations (${avgCacheGetTime}ms avg)`);
        }
        if (avgQuotaTime > 3) {
            analysis.performanceProfile.bottlenecks.push(`Slow database quota operations (${avgQuotaTime}ms avg)`);
        }

        if (avgCacheGetTime < 1) {
            analysis.performanceProfile.strengths.push(`Fast cache retrieval (${avgCacheGetTime}ms avg)`);
        }
        if (avgThroughput > 500) {
            analysis.performanceProfile.strengths.push(`High throughput capability (${avgThroughput} ops/sec avg)`);
        }

        // Scalability assessment
        const integrationReport = individualReports['Integration Tests'];
        if (integrationReport) {
            const memoryTests = integrationReport.testResults.filter(t => t.test.includes('Memory Pressure:'));
            const memorySuccessRate = memoryTests.length > 0 ? 
                memoryTests.filter(t => t.passed).length / memoryTests.length : 0;
            
            analysis.scalabilityAssessment.memoryEfficiency = memorySuccessRate >= 0.8 ? 'good' :
                                                            memorySuccessRate >= 0.6 ? 'fair' : 'poor';
            
            analysis.scalabilityAssessment.rating = memorySuccessRate >= 0.8 ? 'good' : 'limited';
        }

        // Reliability assessment
        const recoveryTests = integrationReport ? 
            integrationReport.testResults.filter(t => t.test.includes('Recovery:')) : [];
        const recoverySuccessRate = recoveryTests.length > 0 ? 
            recoveryTests.filter(t => t.passed).length / recoveryTests.length : 0;

        analysis.reliabilityAssessment.errorRecovery = recoverySuccessRate >= 0.9 ? 'excellent' :
                                                     recoverySuccessRate >= 0.7 ? 'good' : 'poor';
        analysis.reliabilityAssessment.rating = overallSuccessRate >= 90 && recoverySuccessRate >= 0.8 ? 'high' : 'moderate';

        // Key findings
        if (overallSuccessRate >= 95) {
            analysis.keyFindings.push('System demonstrates excellent overall reliability');
        }
        if (avgThroughput >= 1000) {
            analysis.keyFindings.push('High-performance capabilities confirmed');
        }
        if (analysis.componentHealth.database === 'excellent' && analysis.componentHealth.cache === 'excellent') {
            analysis.keyFindings.push('Both database and cache systems are highly reliable');
        }
        if (analysis.performanceProfile.bottlenecks.length === 0) {
            analysis.keyFindings.push('No significant performance bottlenecks identified');
        }
        if (recoverySuccessRate >= 0.9) {
            analysis.keyFindings.push('Excellent error recovery and resilience capabilities');
        }

        return analysis;
    }

    getHealthRating(successRate) {
        return successRate >= 95 ? 'excellent' :
               successRate >= 85 ? 'good' :
               successRate >= 70 ? 'fair' : 'poor';
    }

    generateMasterRecommendations(individualReports, systemAnalysis) {
        const recommendations = [];

        // System-level recommendations
        if (systemAnalysis.overallSystemHealth === 'poor') {
            recommendations.push({
                category: 'System Health',
                severity: 'critical',
                message: 'Overall system health is poor. Immediate investigation and fixes required.',
                priority: 1
            });
        }

        // Performance recommendations
        if (systemAnalysis.performanceProfile.rating === 'poor') {
            recommendations.push({
                category: 'Performance',
                severity: 'high',
                message: 'System performance is below acceptable thresholds. Performance optimization required.',
                priority: 2
            });
        }

        systemAnalysis.performanceProfile.bottlenecks.forEach(bottleneck => {
            recommendations.push({
                category: 'Performance',
                severity: 'medium',
                message: `Performance bottleneck identified: ${bottleneck}`,
                priority: 3
            });
        });

        // Component-specific recommendations
        if (systemAnalysis.componentHealth.database === 'poor') {
            recommendations.push({
                category: 'Database',
                severity: 'high',
                message: 'Database system reliability is poor. Review database operations and error handling.',
                priority: 2
            });
        }

        if (systemAnalysis.componentHealth.cache === 'poor') {
            recommendations.push({
                category: 'Cache',
                severity: 'high',
                message: 'Cache system reliability is poor. Review cache implementation and memory management.',
                priority: 2
            });
        }

        if (systemAnalysis.componentHealth.integration === 'poor') {
            recommendations.push({
                category: 'Integration',
                severity: 'high',
                message: 'Database-cache integration has issues. Review data synchronization and consistency.',
                priority: 2
            });
        }

        // Scalability recommendations
        if (systemAnalysis.scalabilityAssessment.rating === 'limited') {
            recommendations.push({
                category: 'Scalability',
                severity: 'medium',
                message: 'System shows limited scalability. Consider memory optimization and load handling improvements.',
                priority: 4
            });
        }

        // Positive recommendations
        if (systemAnalysis.overallSystemHealth === 'excellent') {
            recommendations.push({
                category: 'System Health',
                severity: 'info',
                message: 'Excellent system health achieved. System is production-ready.',
                priority: 10
            });
        }

        systemAnalysis.performanceProfile.strengths.forEach(strength => {
            recommendations.push({
                category: 'Performance',
                severity: 'info',
                message: `Performance strength identified: ${strength}`,
                priority: 10
            });
        });

        // Sort by priority and severity
        recommendations.sort((a, b) => {
            const severityWeight = { critical: 1, high: 2, medium: 3, low: 4, info: 5 };
            if (a.priority !== b.priority) return a.priority - b.priority;
            return severityWeight[a.severity] - severityWeight[b.severity];
        });

        return recommendations;
    }

    generateSummaryReport(masterReport) {
        const report = [];
        
        report.push('# Comprehensive Claudette Database and Cache System Test Results');
        report.push('');
        report.push(`**Test Execution Date:** ${masterReport.overview.testRunTimestamp}`);
        report.push(`**Total Duration:** ${Math.round(masterReport.overview.totalDuration / 1000)}s`);
        report.push(`**Overall Result:** ${masterReport.overview.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
        report.push('');

        // Executive Summary
        report.push('## Executive Summary');
        report.push('');
        report.push(`This comprehensive test suite evaluated the Claudette database and caching systems across ${masterReport.overview.testSuitesExecuted} major test categories, executing a total of ${masterReport.aggregateStatistics.totalTests} individual tests.`);
        report.push('');
        
        const successRate = masterReport.aggregateStatistics.reliabilityMetrics.overallSuccessRate;
        const healthAssessment = masterReport.systemAnalysis.overallSystemHealth;
        
        report.push(`**Overall Success Rate:** ${successRate}% (${masterReport.aggregateStatistics.totalPassed}/${masterReport.aggregateStatistics.totalTests} tests passed)`);
        report.push(`**System Health Rating:** ${healthAssessment.toUpperCase()}`);
        report.push('');

        // Test Suite Results
        report.push('## Test Suite Results');
        report.push('');
        report.push('| Test Suite | Status | Duration | Success Rate |');
        report.push('|------------|--------|----------|--------------|');
        
        masterReport.suiteResults.forEach(suite => {
            const suiteReport = masterReport.individualReports[suite.suite];
            const suiteSuccessRate = suiteReport && suiteReport.summary ? 
                Math.round((suiteReport.summary.passedTests / suiteReport.summary.totalTests) * 100) : 'N/A';
            
            report.push(`| ${suite.suite} | ${suite.success ? '✅ PASS' : '❌ FAIL'} | ${suite.duration}ms | ${suiteSuccessRate}% |`);
        });
        report.push('');

        // System Analysis
        report.push('## System Analysis');
        report.push('');
        
        report.push('### Component Health');
        report.push(`- **Database System:** ${masterReport.systemAnalysis.componentHealth.database.toUpperCase()} (${masterReport.aggregateStatistics.reliabilityMetrics.databaseReliability}% success rate)`);
        report.push(`- **Cache System:** ${masterReport.systemAnalysis.componentHealth.cache.toUpperCase()} (${masterReport.aggregateStatistics.reliabilityMetrics.cacheReliability}% success rate)`);
        report.push(`- **System Integration:** ${masterReport.systemAnalysis.componentHealth.integration.toUpperCase()} (${masterReport.aggregateStatistics.reliabilityMetrics.integrationReliability}% success rate)`);
        report.push('');

        report.push('### Performance Profile');
        report.push(`- **Overall Rating:** ${masterReport.systemAnalysis.performanceProfile.rating.toUpperCase()}`);
        report.push(`- **Average Throughput:** ${masterReport.aggregateStatistics.performanceMetrics.averageThroughput} operations/second`);
        report.push(`- **Cache GET Performance:** ${masterReport.aggregateStatistics.performanceMetrics.cacheOperations.avgGetTime}ms average`);
        report.push(`- **Cache SET Performance:** ${masterReport.aggregateStatistics.performanceMetrics.cacheOperations.avgSetTime}ms average`);
        report.push(`- **Database Operations:** ${masterReport.aggregateStatistics.performanceMetrics.databaseOperations.avgQuotaTime}ms average`);
        report.push('');

        if (masterReport.systemAnalysis.performanceProfile.bottlenecks.length > 0) {
            report.push('#### Performance Bottlenecks');
            masterReport.systemAnalysis.performanceProfile.bottlenecks.forEach(bottleneck => {
                report.push(`- ${bottleneck}`);
            });
            report.push('');
        }

        if (masterReport.systemAnalysis.performanceProfile.strengths.length > 0) {
            report.push('#### Performance Strengths');
            masterReport.systemAnalysis.performanceProfile.strengths.forEach(strength => {
                report.push(`- ${strength}`);
            });
            report.push('');
        }

        // Key Findings
        if (masterReport.systemAnalysis.keyFindings.length > 0) {
            report.push('## Key Findings');
            report.push('');
            masterReport.systemAnalysis.keyFindings.forEach(finding => {
                report.push(`- ${finding}`);
            });
            report.push('');
        }

        // Recommendations
        report.push('## Recommendations');
        report.push('');

        const criticalRecs = masterReport.recommendations.filter(r => r.severity === 'critical');
        const highRecs = masterReport.recommendations.filter(r => r.severity === 'high');
        const mediumRecs = masterReport.recommendations.filter(r => r.severity === 'medium');
        const infoRecs = masterReport.recommendations.filter(r => r.severity === 'info');

        if (criticalRecs.length > 0) {
            report.push('### 🚨 Critical Issues (Immediate Action Required)');
            criticalRecs.forEach(rec => {
                report.push(`- **${rec.category}:** ${rec.message}`);
            });
            report.push('');
        }

        if (highRecs.length > 0) {
            report.push('### ⚠️ High Priority Issues');
            highRecs.forEach(rec => {
                report.push(`- **${rec.category}:** ${rec.message}`);
            });
            report.push('');
        }

        if (mediumRecs.length > 0) {
            report.push('### 📋 Medium Priority Issues');
            mediumRecs.forEach(rec => {
                report.push(`- **${rec.category}:** ${rec.message}`);
            });
            report.push('');
        }

        if (infoRecs.length > 0) {
            report.push('### ℹ️ Positive Findings');
            infoRecs.forEach(rec => {
                report.push(`- **${rec.category}:** ${rec.message}`);
            });
            report.push('');
        }

        // Technical Details
        report.push('## Technical Details');
        report.push('');
        report.push('### Test Statistics');
        report.push(`- **Total Tests Executed:** ${masterReport.aggregateStatistics.totalTests}`);
        report.push(`- **Total Operations Tested:** ${masterReport.aggregateStatistics.performanceMetrics.totalOperations}`);
        report.push(`- **Total Test Duration:** ${Math.round(masterReport.aggregateStatistics.totalDuration / 1000)}s`);
        report.push(`- **Average Test Duration:** ${masterReport.aggregateStatistics.averageTestDuration}ms`);
        report.push('');

        report.push('### Environment');
        report.push(`- **Node.js Version:** ${masterReport.environment.nodeVersion}`);
        report.push(`- **Platform:** ${masterReport.environment.platform} (${masterReport.environment.arch})`);
        report.push(`- **Memory Usage:** ${Math.round(masterReport.environment.memoryUsage.heapUsed / 1024 / 1024)}MB heap used`);
        report.push('');

        // Conclusion
        report.push('## Conclusion');
        report.push('');
        
        if (masterReport.overview.overallSuccess) {
            report.push('✅ **The Claudette database and cache systems have successfully passed comprehensive testing.**');
            report.push('');
            if (healthAssessment === 'excellent') {
                report.push('The systems demonstrate excellent reliability, performance, and integration capabilities. They are ready for production use.');
            } else if (healthAssessment === 'good') {
                report.push('The systems show good overall health with minor areas for improvement identified in the recommendations above.');
            }
        } else {
            report.push('❌ **The comprehensive test suite has identified critical issues that must be addressed.**');
            report.push('');
            report.push('Please review the critical and high-priority recommendations above before proceeding with production deployment.');
        }
        report.push('');

        report.push('---');
        report.push('');
        report.push(`*Report generated on ${new Date().toISOString()}*`);
        report.push('');
        report.push('**Detailed Reports:**');
        report.push('- `comprehensive-test-master-report.json` - Complete technical report with all data');
        report.push('- `database-test-report.json` - Database system test details');
        report.push('- `cache-test-report.json` - Cache system test details');
        report.push('- `integration-test-report.json` - Integration test details');

        return report.join('\n');
    }

    async displayResults() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY');
        console.log('='.repeat(80));
        
        const totalDuration = this.endTime - this.startTime;
        const successCount = this.results.filter(r => r.success).length;
        const failureCount = this.results.length - successCount;
        
        console.log(`\n⏱️  Total Execution Time: ${Math.round(totalDuration / 1000)}s`);
        console.log(`🧪 Test Suites Executed: ${this.results.length}`);
        console.log(`✅ Passed: ${successCount}`);
        console.log(`❌ Failed: ${failureCount}`);
        console.log(`📈 Success Rate: ${Math.round((successCount / this.results.length) * 100)}%`);
        
        console.log('\n📋 INDIVIDUAL SUITE RESULTS:');
        this.results.forEach(result => {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            const duration = `(${result.duration}ms)`;
            console.log(`  ${status} ${result.suite} ${duration}`);
            if (result.error) {
                console.log(`    Error: ${result.error}`);
            }
        });
        
        const overallSuccess = this.results.every(r => r.success);
        console.log(`\n🎯 OVERALL RESULT: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        if (overallSuccess) {
            console.log('\n🎉 Congratulations! The Claudette database and cache systems have passed comprehensive testing.');
            console.log('   Systems are validated for reliability, performance, and integration.');
        } else {
            console.log('\n⚠️  Some test suites failed. Please review the detailed reports and address the issues.');
            console.log('   Check the individual report files for specific failure details and recommendations.');
        }
        
        console.log('\n📁 GENERATED REPORTS:');
        console.log('  - comprehensive-test-master-report.json (Complete technical data)');
        console.log('  - COMPREHENSIVE_DATABASE_CACHE_TEST_RESULTS.md (Executive summary)');
        console.log('  - database-test-report.json (Database test details)');
        console.log('  - cache-test-report.json (Cache test details)');
        console.log('  - integration-test-report.json (Integration test details)');
        
        console.log('\n' + '='.repeat(80));
    }
}

async function main() {
    const runner = new MasterTestRunner();
    
    try {
        const success = await runner.runAllTests();
        await runner.displayResults();
        
        process.exit(success ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Master test runner failed:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { MasterTestRunner };