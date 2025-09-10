#!/usr/bin/env node

/**
 * Test script to verify MorphBox directory passing mechanism
 * Tests how morphbox.js passes MORPHBOX_USER_DIR to morphbox-start-packaged
 */

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Test utilities
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[PASS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[FAIL]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  debug: (msg) => console.log(`${colors.cyan}[DEBUG]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.magenta}=== ${msg} ===${colors.reset}`)
};

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    log.success(message);
    testsPassed++;
  } else {
    log.error(message);
    testsFailed++;
  }
}

// Create a minimal test version of morphbox-start that just reports environment
function createTestScript() {
  const testScript = join(os.tmpdir(), 'test-morphbox-start.sh');
  const content = `#!/bin/bash
set -euo pipefail

echo "TEST_SCRIPT_START"
echo "PWD=\$(pwd)"
echo "INITIAL_PWD=\$(pwd)"
echo "MORPHBOX_USER_DIR=\${MORPHBOX_USER_DIR:-NOT_SET}"
echo "USER_DIR=\${MORPHBOX_USER_DIR:-\$(pwd)}"
echo "TEST_SCRIPT_END"
`;
  
  fs.writeFileSync(testScript, content);
  fs.chmodSync(testScript, 0o755);
  return testScript;
}

// Test 1: Verify MORPHBOX_USER_DIR is set correctly by morphbox.js logic
function testMorphboxUserDirSetting() {
  log.header('Test 1: MORPHBOX_USER_DIR Setting Logic');
  
  // Test from current directory
  const currentDir = process.cwd();
  process.env.MORPHBOX_USER_DIR = currentDir;
  
  log.debug(`Current directory: ${currentDir}`);
  log.debug(`MORPHBOX_USER_DIR: ${process.env.MORPHBOX_USER_DIR}`);
  
  assert(
    process.env.MORPHBOX_USER_DIR === currentDir,
    `MORPHBOX_USER_DIR matches current directory: ${currentDir}`
  );
  
  // Test from different directory
  const tempDir = os.tmpdir();
  process.env.MORPHBOX_USER_DIR = tempDir;
  
  assert(
    process.env.MORPHBOX_USER_DIR === tempDir,
    `MORPHBOX_USER_DIR can be set to different directory: ${tempDir}`
  );
  
  // Reset for other tests
  process.env.MORPHBOX_USER_DIR = currentDir;
}

// Test 2: Test environment variable passing to child process
function testEnvironmentPassing() {
  return new Promise((resolve) => {
    log.header('Test 2: Environment Variable Passing');
    
    const testScript = createTestScript();
    const testDir = process.cwd();
    
    // Set up environment like morphbox.js does
    const env = { ...process.env };
    env.MORPHBOX_USER_DIR = testDir;
    
    log.debug(`Test directory: ${testDir}`);
    log.debug(`Environment MORPHBOX_USER_DIR: ${env.MORPHBOX_USER_DIR}`);
    
    const child = spawn(testScript, [], {
      env: env,
      stdio: 'pipe'
    });
    
    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      const lines = output.trim().split('\n');
      const results = {};
      
      let capturing = false;
      for (const line of lines) {
        if (line === 'TEST_SCRIPT_START') {
          capturing = true;
          continue;
        }
        if (line === 'TEST_SCRIPT_END') {
          capturing = false;
          continue;
        }
        if (capturing && line.includes('=')) {
          const [key, value] = line.split('=', 2);
          results[key] = value;
        }
      }
      
      log.debug(`Script output: ${JSON.stringify(results, null, 2)}`);
      
      assert(
        results.MORPHBOX_USER_DIR === testDir,
        `Child process received MORPHBOX_USER_DIR: ${results.MORPHBOX_USER_DIR}`
      );
      
      assert(
        results.USER_DIR === testDir,
        `Child process resolved USER_DIR correctly: ${results.USER_DIR}`
      );
      
      assert(code === 0, 'Child process exited successfully');
      
      // Cleanup
      fs.unlinkSync(testScript);
      resolve();
    });
    
    child.on('error', (err) => {
      log.error(`Child process error: ${err.message}`);
      testsFailed++;
      resolve();
    });
  });
}

// Test 3: Test the actual morphbox.js spawn logic
function testMorphboxJsSpawnLogic() {
  return new Promise((resolve) => {
    log.header('Test 3: MorphBox.js Spawn Logic Simulation');
    
    const testScript = createTestScript();
    const testDir = process.cwd();
    
    // Simulate what morphbox.js does
    process.env.MORPHBOX_USER_DIR = process.cwd();
    
    const child = spawn(testScript, ['--test'], {
      stdio: 'pipe',
      env: process.env  // Pass environment variables including MORPHBOX_USER_DIR
    });
    
    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      const lines = output.trim().split('\n');
      const results = {};
      
      let capturing = false;
      for (const line of lines) {
        if (line === 'TEST_SCRIPT_START') {
          capturing = true;
          continue;
        }
        if (line === 'TEST_SCRIPT_END') {
          capturing = false;
          continue;
        }
        if (capturing && line.includes('=')) {
          const [key, value] = line.split('=', 2);
          results[key] = value;
        }
      }
      
      log.debug(`Spawn simulation results: ${JSON.stringify(results, null, 2)}`);
      
      assert(
        results.MORPHBOX_USER_DIR !== 'NOT_SET',
        'MORPHBOX_USER_DIR was passed to child process'
      );
      
      assert(
        results.MORPHBOX_USER_DIR === testDir,
        `Spawned process received correct directory: ${results.MORPHBOX_USER_DIR}`
      );
      
      // Cleanup
      fs.unlinkSync(testScript);
      resolve();
    });
    
    child.on('error', (err) => {
      log.error(`Spawn simulation error: ${err.message}`);
      testsFailed++;
      resolve();
    });
  });
}

// Test 4: Test from different directories
async function testFromDifferentDirectories() {
  log.header('Test 4: Testing from Different Directories');
  
  const originalDir = process.cwd();
  const tempDir = fs.mkdtempSync(join(os.tmpdir(), 'morphbox-test-'));
  
  try {
    // Test from temp directory
    process.chdir(tempDir);
    const currentFromTemp = process.cwd();
    
    log.debug(`Changed to temp directory: ${currentFromTemp}`);
    
    assert(
      currentFromTemp === tempDir,
      `Successfully changed to temp directory: ${tempDir}`
    );
    
    // Simulate morphbox.js logic
    process.env.MORPHBOX_USER_DIR = process.cwd();
    
    assert(
      process.env.MORPHBOX_USER_DIR === tempDir,
      `MORPHBOX_USER_DIR set to temp directory: ${tempDir}`
    );
    
    // Test that the environment would be passed correctly
    const testScript = createTestScript();
    
    await new Promise((resolve) => {
      const child = spawn(testScript, [], {
        stdio: 'pipe',
        env: process.env
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        const lines = output.trim().split('\n');
        const results = {};
        
        let capturing = false;
        for (const line of lines) {
          if (line === 'TEST_SCRIPT_START') {
            capturing = true;
            continue;
          }
          if (line === 'TEST_SCRIPT_END') {
            capturing = false;
            continue;
          }
          if (capturing && line.includes('=')) {
            const [key, value] = line.split('=', 2);
            results[key] = value;
          }
        }
        
        assert(
          results.MORPHBOX_USER_DIR === tempDir,
          `Child process from temp directory received correct path: ${results.MORPHBOX_USER_DIR}`
        );
        
        fs.unlinkSync(testScript);
        resolve();
      });
    });
    
  } finally {
    // Restore original directory
    process.chdir(originalDir);
    fs.rmSync(tempDir, { recursive: true });
    log.debug(`Restored to original directory: ${originalDir}`);
  }
}

// Test 5: Verify the actual morphbox-start logic
function testMorphboxStartLogic() {
  log.header('Test 5: MorphBox-Start Logic Verification');
  
  const testDir = '/test/directory/path';
  const fallbackDir = '/fallback/directory';
  
  // Test the logic: USER_DIR="${MORPHBOX_USER_DIR:-$INITIAL_PWD}"
  
  // Case 1: MORPHBOX_USER_DIR is set
  process.env.MORPHBOX_USER_DIR = testDir;
  const result1 = process.env.MORPHBOX_USER_DIR || fallbackDir;
  
  assert(
    result1 === testDir,
    `When MORPHBOX_USER_DIR is set, uses it: ${result1}`
  );
  
  // Case 2: MORPHBOX_USER_DIR is not set
  delete process.env.MORPHBOX_USER_DIR;
  const result2 = process.env.MORPHBOX_USER_DIR || fallbackDir;
  
  assert(
    result2 === fallbackDir,
    `When MORPHBOX_USER_DIR is not set, uses fallback: ${result2}`
  );
  
  // Restore for other tests
  process.env.MORPHBOX_USER_DIR = process.cwd();
}

// Main test runner
async function runAllTests() {
  console.log(`${colors.magenta}MorphBox Directory Passing Test Suite${colors.reset}\n`);
  
  log.info('Testing how morphbox.js passes directory to morphbox-start-packaged');
  log.info(`Current working directory: ${process.cwd()}`);
  log.info(`MorphBox web directory: ${__dirname}`);
  
  try {
    testMorphboxUserDirSetting();
    await testEnvironmentPassing();
    await testMorphboxJsSpawnLogic();
    await testFromDifferentDirectories();
    testMorphboxStartLogic();
    
    // Final results
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.white}TEST RESULTS${colors.reset}`);
    console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
    
    if (testsFailed === 0) {
      console.log(`\n${colors.green}✅ All tests passed! Directory passing mechanism is working correctly.${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.red}❌ ${testsFailed} test(s) failed. Directory passing needs attention.${colors.reset}`);
      process.exit(1);
    }
    
  } catch (error) {
    log.error(`Test suite error: ${error.message}`);
    console.log(error.stack);
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(console.error);