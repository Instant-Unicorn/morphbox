import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface TaskInfo {
  id: string;
  command: string;
  process?: ChildProcess;
  output: string[];
  running: boolean;
  startTime?: Date;
  endTime?: Date;
  exitCode?: number;
  pid?: number;
}

class TaskManager extends EventEmitter {
  private tasks = new Map<string, TaskInfo>();
  
  runTask(taskId: string, command: string): number | null {
    // Check if task already exists
    if (this.tasks.has(taskId)) {
      const existing = this.tasks.get(taskId)!;
      if (existing.running) {
        throw new Error('Task is already running');
      }
    }
    
    // Parse command
    const [cmd, ...args] = command.split(' ');
    
    // Create task info
    const task: TaskInfo = {
      id: taskId,
      command,
      output: [],
      running: true,
      startTime: new Date()
    };
    
    // Spawn process
    const proc = spawn(cmd, args, {
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env }
    });
    
    task.process = proc;
    task.pid = proc.pid;
    this.tasks.set(taskId, task);
    
    // Capture output
    proc.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(line => line);
      task.output.push(...lines);
      this.emit('output', taskId, lines);
    });
    
    proc.stderr.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(line => line);
      task.output.push(...lines);
      this.emit('output', taskId, lines);
    });
    
    // Handle exit
    proc.on('close', (code: number) => {
      task.running = false;
      task.endTime = new Date();
      task.exitCode = code;
      delete task.process;
      this.emit('completed', taskId, code);
    });
    
    // Handle error
    proc.on('error', (error: Error) => {
      task.running = false;
      task.endTime = new Date();
      task.exitCode = 1;
      task.output.push(`Error: ${error.message}`);
      delete task.process;
      this.emit('error', taskId, error);
    });
    
    return proc.pid || null;
  }
  
  stopTask(pid: number): void {
    // Find task by pid
    const task = Array.from(this.tasks.values()).find(t => t.pid === pid);
    if (!task || !task.process) {
      throw new Error('Task not found or not running');
    }
    
    // Kill process
    task.process.kill('SIGTERM');
    
    // Force kill after timeout
    setTimeout(() => {
      if (task.process && task.running) {
        task.process.kill('SIGKILL');
      }
    }, 2000);
  }
  
  getTaskOutput(taskId: string, fromLine: number = 0): {
    output: string[];
    completed: boolean;
    exitCode?: number;
  } {
    const task = this.tasks.get(taskId);
    if (!task) {
      return { output: [], completed: true };
    }
    
    return {
      output: task.output.slice(fromLine),
      completed: !task.running,
      exitCode: task.exitCode
    };
  }
  
  clearTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && task.running && task.process) {
      task.process.kill('SIGKILL');
    }
    this.tasks.delete(taskId);
  }
  
  getAllTasks(): TaskInfo[] {
    return Array.from(this.tasks.values());
  }
}

// Singleton instance
export const taskManager = new TaskManager();