import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { ClaudeAgent } from './claude-agent.js';
import chalk from 'chalk';

export class AgentManager extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.agentTypes = new Map();
  }

  async initialize() {
    // Register available agent types
    this.registerAgentType('claude', ClaudeAgent);
    
    // Future agent types can be registered here
    // this.registerAgentType('openai', OpenAIAgent);
    // this.registerAgentType('ollama', OllamaAgent);
  }

  registerAgentType(name, AgentClass) {
    this.agentTypes.set(name, AgentClass);
    console.log(chalk.green(`Registered agent type: ${name}`));
  }

  async launchAgent(type, options) {
    const AgentClass = this.agentTypes.get(type);
    
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    const agentId = `agent_${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const agent = new AgentClass(agentId, options);

    try {
      await agent.initialize();
      this.agents.set(agentId, agent);
      
      console.log(chalk.green(`Launched ${type} agent: ${agentId}`));
      
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
      console.error(chalk.red(`Failed to launch ${type} agent:`), error);
      throw error;
    }
  }

  async sendToAgent(agentId, input) {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    return agent.sendInput(input);
  }

  async stopAgent(agentId) {
    const agent = this.agents.get(agentId);
    
    if (agent) {
      await agent.stop();
      this.agents.delete(agentId);
      console.log(chalk.yellow(`Stopped agent: ${agentId}`));
    }
  }

  async stopAllAgents() {
    const stopPromises = Array.from(this.agents.keys()).map(agentId => 
      this.stopAgent(agentId)
    );

    await Promise.all(stopPromises);
  }

  getActiveAgents() {
    return Array.from(this.agents.entries()).map(([id, agent]) => ({
      id,
      type: agent.type,
      status: agent.status,
      startTime: agent.startTime
    }));
  }

  handleAgentExit(agentId, code) {
    console.log(chalk.yellow(`Agent ${agentId} exited with code ${code}`));
    this.agents.delete(agentId);
    this.emit('agent_exit', { agentId, code });
  }
}