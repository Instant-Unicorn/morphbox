import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface AgentOptions {
  workspacePath?: string;
  sessionId: string;
}

export interface Agent extends EventEmitter {
  id: string;
  type: string;
  status: string;
  startTime: number;
  initialize(): Promise<void>;
  sendInput(input: string): Promise<void>;
  stop(): Promise<void>;
}

class ClaudeAgent extends EventEmitter implements Agent {
  id: string;
  type: string = 'claude';
  status: string = 'initialized';
  startTime: number;
  private process: ChildProcess | null = null;
  private options: AgentOptions;
  private outputBuffer: string = '';

  constructor(id: string, options: AgentOptions) {
    super();
    this.id = id;
    this.options = options;
    this.startTime = Date.now();
  }

  async initialize(): Promise<void> {
    const { workspacePath, sessionId } = this.options;

    // Spawn Claude CLI process in interactive mode
    // The claude command doesn't take --session or --workspace arguments
    const args: string[] = [];

    try {
      console.log('Spawning claude process with args:', args);
      console.log('Working directory:', workspacePath || process.cwd());
      
      this.process = spawn('claude', args, {
        cwd: workspacePath || process.cwd(),
        env: {
          ...process.env,
          CLAUDE_SESSION_ID: sessionId,
          CLAUDE_WORKSPACE: workspacePath
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Set up event handlers immediately
      // Handle stdout
      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        this.outputBuffer += output;
        
        // Debug log
        console.log('Claude stdout:', output);
        
        // Emit output for real-time streaming
        this.emit('output', output);
      });

      // Handle stderr
      this.process.stderr?.on('data', (data) => {
        const error = data.toString();
        console.log('Claude stderr:', error);
        this.emit('error', error);
      });

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        this.status = 'stopped';
        this.emit('exit', code || 0);
      });

      this.process.on('error', (error) => {
        console.error('Claude process error:', error);
        this.status = 'error';
        this.emit('error', error.message);
      });

      this.status = 'running';
      
      // Wait a bit for Claude to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  async sendInput(input: string): Promise<void> {
    if (this.process && this.process.stdin) {
      this.process.stdin.write(input + '\n');
    } else {
      throw new Error('Agent process not running');
    }
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
      this.status = 'stopped';
    }
  }
}

export class AgentManager extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private agentTypes: Map<string, typeof ClaudeAgent> = new Map();

  async initialize(): Promise<void> {
    // Register available agent types
    this.registerAgentType('claude', ClaudeAgent);
    
    // Future agent types can be registered here
    // this.registerAgentType('openai', OpenAIAgent);
    // this.registerAgentType('ollama', OllamaAgent);
  }

  registerAgentType(name: string, AgentClass: typeof ClaudeAgent): void {
    this.agentTypes.set(name, AgentClass);
    console.log(`Registered agent type: ${name}`);
  }

  async launchAgent(type: string, options: AgentOptions): Promise<string> {
    const AgentClass = this.agentTypes.get(type);
    
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    const agentId = `agent_${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const agent = new AgentClass(agentId, options);

    try {
      await agent.initialize();
      this.agents.set(agentId, agent);
      
      console.log(`Launched ${type} agent: ${agentId}`);
      
      // Forward agent events
      agent.on('output', (data) => {
        this.emit('agent_output', { agentId, data });
      });

      agent.on('error', (error) => {
        this.emit('agent_error', { agentId, error });
      });

      agent.on('exit', (code) => {
        this.handleAgentExit(agentId, code);
      });

      return agentId;
    } catch (error) {
      console.error(`Failed to launch ${type} agent:`, error);
      throw error;
    }
  }

  async sendToAgent(agentId: string, input: string): Promise<void> {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    return agent.sendInput(input);
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    
    if (agent) {
      await agent.stop();
      this.agents.delete(agentId);
      console.log(`Stopped agent: ${agentId}`);
    }
  }

  async stopAllAgents(): Promise<void> {
    const stopPromises = Array.from(this.agents.keys()).map(agentId => 
      this.stopAgent(agentId)
    );

    await Promise.all(stopPromises);
  }

  getActiveAgents(): Array<{id: string, type: string, status: string, startTime: number}> {
    return Array.from(this.agents.entries()).map(([id, agent]) => ({
      id,
      type: agent.type,
      status: agent.status,
      startTime: agent.startTime
    }));
  }

  private handleAgentExit(agentId: string, code: number): void {
    console.log(`Agent ${agentId} exited with code ${code}`);
    this.agents.delete(agentId);
    this.emit('agent_exit', { agentId, code });
  }
}