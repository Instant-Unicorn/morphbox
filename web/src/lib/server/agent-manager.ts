import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import { SSHAgent } from './agents/ssh-agent';
import { BashAgent } from './agents/bash-agent';

export interface AgentOptions {
  workspacePath?: string;
  sessionId: string;  // WebSocket session ID
  terminalSessionId?: string;  // Terminal session ID for persistence
  vmHost?: string;
  vmPort?: number;
  vmUser?: string;
}

export interface Agent extends EventEmitter {
  id: string;
  type: string;
  status: string;
  startTime: number;
  initialize(): Promise<void>;
  sendInput(input: string): Promise<void>;
  stop(): Promise<void>;
  resize?(cols: number, rows: number): Promise<void>;
}

// Removed local ClaudeAgent - now using SSH connection to VM

export class AgentManager extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private agentTypes: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    // Register available agent types
    this.registerAgentType('ssh', SSHAgent);
    this.registerAgentType('bash', BashAgent);
    
    // Future agent types can be registered here
    // this.registerAgentType('openai', OpenAIAgent);
    // this.registerAgentType('ollama', OllamaAgent);
  }

  registerAgentType(name: string, AgentClass: any): void {
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
      agent.on('output', (data: any) => {
        this.emit('agent_output', { agentId, data });
      });

      agent.on('error', (error: any) => {
        this.emit('agent_error', { agentId, error });
      });

      agent.on('exit', (code: number | null) => {
        this.handleAgentExit(agentId, code);
      });

      agent.on('sessionId', (sessionId: string) => {
        this.emit('agent_sessionId', { agentId, sessionId });
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

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  private handleAgentExit(agentId: string, code: number | null): void {
    console.log(`Agent ${agentId} exited with code ${code}`);
    this.agents.delete(agentId);
    this.emit('agent_exit', { agentId, code: code ?? 0 });
  }
}