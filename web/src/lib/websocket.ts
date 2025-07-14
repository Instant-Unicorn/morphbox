export type WebSocketMessageHandler = (data: string) => void;
export type WebSocketEventHandler = () => void;
export type WebSocketErrorHandler = (error: Event) => void;

export interface WebSocketClientOptions {
  url: string;
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnect: boolean;
  private reconnectDelay: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  // Event handlers
  private onOpenHandlers: WebSocketEventHandler[] = [];
  private onCloseHandlers: WebSocketEventHandler[] = [];
  private onMessageHandlers: WebSocketMessageHandler[] = [];
  private onErrorHandlers: WebSocketErrorHandler[] = [];
  
  constructor(options: WebSocketClientOptions) {
    this.url = options.url;
    this.reconnect = options.reconnect ?? true;
    this.reconnectDelay = options.reconnectDelay ?? 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? Infinity;
  }
  
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.clearReconnectTimeout();
        this.onOpenHandlers.forEach(handler => handler());
      };
      
      this.ws.onclose = () => {
        this.onCloseHandlers.forEach(handler => handler());
        
        if (this.reconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };
      
      this.ws.onmessage = (event) => {
        this.onMessageHandlers.forEach(handler => handler(event.data));
      };
      
      this.ws.onerror = (error) => {
        this.onErrorHandlers.forEach(handler => handler(error));
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      if (this.reconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    }
  }
  
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.clearReconnectTimeout();
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }
  
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  disconnect(): void {
    this.reconnect = false;
    this.clearReconnectTimeout();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  send(data: string | ArrayBuffer | Blob): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn('WebSocket is not connected');
    }
  }
  
  onOpen(handler: WebSocketEventHandler): void {
    this.onOpenHandlers.push(handler);
  }
  
  onClose(handler: WebSocketEventHandler): void {
    this.onCloseHandlers.push(handler);
  }
  
  onMessage(handler: WebSocketMessageHandler): void {
    this.onMessageHandlers.push(handler);
  }
  
  onError(handler: WebSocketErrorHandler): void {
    this.onErrorHandlers.push(handler);
  }
  
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}