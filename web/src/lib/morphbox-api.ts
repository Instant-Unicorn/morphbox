/**
 * MorphBox Global API
 *
 * Centralized data store and event system for custom panels
 * Provides access to all MorphBox data and functionality
 */

import { get, derived, writable, type Readable, type Writable } from 'svelte/store';
import { panelStore, panels, activePanel, panelsByType } from '$lib/stores/panels';
import { browser } from '$app/environment';

// Define the data structure
export interface MorphBoxData {
  panels: any[];
  activePanel: any | null;
  panelsByType: Record<string, any[]>;
  terminals: Record<string, any>;
  context: {
    used: number;
    max: number;
    percentage: number;
  } | null;
  messages: any[];
  websocket: {
    connected: boolean;
    url: string;
  } | null;
}

// Define event types
export interface MorphBoxEvents {
  'panel:added': { panel: any };
  'panel:removed': { panelId: string };
  'panel:updated': { panelId: string; updates: any };
  'context:updated': { used: number; max: number };
  'terminal:output': { panelId: string; data: string };
  'websocket:message': { type: string; data: any };
  'websocket:connected': { url: string };
  'websocket:disconnected': {};
}

class MorphBoxAPI {
  private dataStore: Writable<MorphBoxData>;
  private eventListeners: Map<keyof MorphBoxEvents, Set<Function>> = new Map();
  private subscriptions: Map<string, Function> = new Map();

  constructor() {
    // Initialize data store
    this.dataStore = writable<MorphBoxData>({
      panels: [],
      activePanel: null,
      panelsByType: {},
      terminals: {},
      context: null,
      messages: [],
      websocket: null
    });

    // Setup if in browser
    if (browser) {
      this.initialize();
    }
  }

  private initialize() {
    // Subscribe to panel store changes
    panelStore.subscribe(state => {
      this.updateData({
        panels: state.panels,
        activePanel: state.activePanel ?
          state.panels.find(p => p.id === state.activePanel) : null,
        panelsByType: this.groupPanelsByType(state.panels)
      });
    });

    // Track terminals
    if (window.morphboxTerminals) {
      this.updateData({ terminals: window.morphboxTerminals });
    }

    // Setup WebSocket tracking
    this.trackWebSocket();

    // Expose globally
    (window as any).MorphBox = this;
  }

  private groupPanelsByType(panels: any[]): Record<string, any[]> {
    const byType: Record<string, any[]> = {};
    panels.forEach(panel => {
      if (!byType[panel.type]) byType[panel.type] = [];
      byType[panel.type].push(panel);
    });
    return byType;
  }

  private updateData(updates: Partial<MorphBoxData>) {
    this.dataStore.update(data => ({ ...data, ...updates }));
  }

  private trackWebSocket() {
    // Override WebSocket constructor to track connections
    const OriginalWebSocket = window.WebSocket;
    const api = this;

    window.WebSocket = function(url: string, protocols?: string | string[]) {
      const ws = new OriginalWebSocket(url, protocols);

      // Track this WebSocket
      ws.addEventListener('open', () => {
        api.updateData({
          websocket: { connected: true, url }
        });
        api.emit('websocket:connected', { url });
      });

      ws.addEventListener('close', () => {
        api.updateData({
          websocket: { connected: false, url }
        });
        api.emit('websocket:disconnected', {});
      });

      ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);

          // Track messages
          api.dataStore.update(data => ({
            ...data,
            messages: [...data.messages.slice(-99), message] // Keep last 100 messages
          }));

          api.emit('websocket:message', { type: message.type, data: message.data });

          // Handle specific message types
          if (message.type === 'context_update' && message.data?.tokens) {
            const { used, max } = message.data.tokens;
            api.updateContext(used, max);
          }

          if (message.type === 'OUTPUT' && message.data) {
            // Try to extract context from output
            const contextMatch = message.data.match(/<budget:token_budget>(\d+)\/(\d+)<\/budget:token_budget>/);
            if (contextMatch) {
              const used = parseInt(contextMatch[1]);
              const max = parseInt(contextMatch[2]);
              api.updateContext(used, max);
            }

            // Emit terminal output event
            api.emit('terminal:output', {
              panelId: 'unknown', // Would need to track which terminal
              data: message.data
            });
          }
        } catch (e) {
          // Not JSON or parsing error
        }
      });

      return ws;
    } as any;
  }

  // Public API methods

  /**
   * Get current data snapshot
   */
  getData(): MorphBoxData {
    return get(this.dataStore);
  }

  /**
   * Subscribe to data changes
   */
  subscribe(callback: (data: MorphBoxData) => void): () => void {
    const unsubscribe = this.dataStore.subscribe(callback);
    const id = Math.random().toString(36).substr(2, 9);
    this.subscriptions.set(id, unsubscribe);

    return () => {
      unsubscribe();
      this.subscriptions.delete(id);
    };
  }

  /**
   * Get specific data path
   */
  get(path: string): any {
    const data = this.getData();
    return path.split('.').reduce((obj, key) => obj?.[key], data as any);
  }

  /**
   * Update context data
   */
  updateContext(used: number, max: number) {
    const percentage = max > 0 ? Math.round((used / max) * 100) : 0;
    this.updateData({
      context: { used, max, percentage }
    });
    this.emit('context:updated', { used, max });
  }

  /**
   * Add event listener
   */
  on<K extends keyof MorphBoxEvents>(
    event: K,
    callback: (data: MorphBoxEvents[K]) => void
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit event
   */
  emit<K extends keyof MorphBoxEvents>(event: K, data: MorphBoxEvents[K]) {
    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`Error in event listener for ${event}:`, e);
      }
    });
  }

  /**
   * Send data to a specific panel
   */
  sendToPanel(panelId: string, data: any) {
    // This would be implemented based on panel communication needs
    const panel = this.getData().panels.find(p => p.id === panelId);
    if (panel) {
      // Could use postMessage if panels are in iframes
      // Or custom event system
      this.emit('websocket:message', {
        type: 'PANEL_DATA',
        data: { panelId, data }
      });
    }
  }

  /**
   * Get terminal for a panel
   */
  getTerminal(panelId: string) {
    return (window as any).morphboxTerminals?.[panelId];
  }

  /**
   * Panel management shortcuts
   */
  panels = {
    add: (type: string, config?: any) => panelStore.addPanel(type, config),
    remove: (id: string) => panelStore.removePanel(id),
    update: (id: string, updates: any) => panelStore.updatePanel(id, updates),
    getAll: () => this.getData().panels,
    getActive: () => this.getData().activePanel,
    getByType: (type: string) => this.getData().panelsByType[type] || []
  };

  /**
   * Utility to wait for data
   */
  async waitFor(
    condition: (data: MorphBoxData) => boolean,
    timeout: number = 5000
  ): Promise<MorphBoxData> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        const data = this.getData();
        if (condition(data)) {
          resolve(data);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 100);
        }
      };

      check();
    });
  }
}

// Create and export the API instance
export const morphboxAPI = new MorphBoxAPI();

// Auto-initialize if in browser
if (browser) {
  // Make it available globally
  (window as any).MorphBox = morphboxAPI;

  // Also expose as a simpler data object for custom panels
  (window as any).morphboxData = () => morphboxAPI.getData();

  // Convenience methods for custom panels
  (window as any).morphboxSubscribe = (callback: Function) => morphboxAPI.subscribe(callback);
  (window as any).morphboxOn = (event: string, callback: Function) => morphboxAPI.on(event as any, callback);

  console.log('[MorphBox API] Initialized and available as window.MorphBox');
}

export default morphboxAPI;