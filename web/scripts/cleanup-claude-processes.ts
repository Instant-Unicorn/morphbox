#!/usr/bin/env node

/**
 * Utility script to clean up orphaned Claude processes in the Docker container
 * Run this script to kill all Claude processes that may be consuming memory
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

const execAsync = promisify(exec);

async function getClaudeProcesses(): Promise<Array<{pid: string, user: string, cpu: string, mem: string, cmd: string}>> {
  try {
    const { stdout } = await execAsync(
      'docker exec morphbox-vm ps aux | grep -E "claude.*dangerously-skip-permissions" | grep -v grep'
    );
    
    if (!stdout) return [];
    
    return stdout
      .trim()
      .split('\n')
      .map(line => {
        const parts = line.split(/\s+/);
        return {
          pid: parts[1],
          user: parts[0],
          cpu: parts[2],
          mem: parts[3],
          cmd: parts.slice(10).join(' ')
        };
      })
      .filter(p => p.pid);
  } catch (error) {
    return [];
  }
}

async function killProcess(pid: string): Promise<boolean> {
  try {
    await execAsync(`docker exec morphbox-vm kill -9 ${pid}`);
    return true;
  } catch (error) {
    console.error(`Failed to kill process ${pid}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔍 Checking for Claude processes in Docker container...\n');
  
  const processes = await getClaudeProcesses();
  
  if (processes.length === 0) {
    console.log('✅ No Claude processes found. System is clean!');
    return;
  }
  
  console.log(`Found ${processes.length} Claude process(es):\n`);
  
  // Display process information
  processes.forEach((proc, index) => {
    console.log(`${index + 1}. PID: ${proc.pid}`);
    console.log(`   User: ${proc.user}`);
    console.log(`   CPU: ${proc.cpu}%`);
    console.log(`   Memory: ${proc.mem}%`);
    console.log(`   Command: ${proc.cmd.substring(0, 80)}${proc.cmd.length > 80 ? '...' : ''}`);
    console.log('');
  });
  
  // Ask for confirmation if running interactively
  if (process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>(resolve => {
      rl.question('Kill all Claude processes? (y/N): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log('Aborted.');
      return;
    }
  }
  
  console.log('\n🔪 Killing processes...\n');
  
  // Kill all processes
  let killed = 0;
  for (const proc of processes) {
    process.stdout.write(`Killing PID ${proc.pid}... `);
    const success = await killProcess(proc.pid);
    if (success) {
      console.log('✅');
      killed++;
    } else {
      console.log('❌');
    }
  }
  
  console.log(`\n✅ Killed ${killed}/${processes.length} processes.`);
  
  // Check if any processes remain
  await new Promise(resolve => setTimeout(resolve, 1000));
  const remaining = await getClaudeProcesses();
  
  if (remaining.length > 0) {
    console.log(`\n⚠️  Warning: ${remaining.length} process(es) still running.`);
  } else {
    console.log('\n✅ All Claude processes have been terminated.');
  }
}

// Run the script
main().catch(console.error);