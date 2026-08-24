/**
 * WebSocket Service
 * Manages real-time connection for chat messages, notifications, and status updates.
 * Uses native WebSocket with auto-reconnect and event subscription model.
 */

const WS_RECONNECT_DELAY = 2000;
const WS_MAX_RECONNECT_DELAY = 30000;
const WS_HEARTBEAT_INTERVAL = 30000;

class WebSocketService {
  constructor() {
    this.ws = null;
    this.url = null;
    this.token = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.isIntentionalClose = false;
    this.connectionState = 'disconnected'; // disconnected, connecting, connected
    this.stateListeners = new Set();
    this.messageQueue = [];
  }

  /**
   * Connect to the WebSocket server
   * @param {string} token - JWT auth token
   */
  connect(token) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.token = token;
    this.isIntentionalClose = false;
    this._setConnectionState('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(this.url);
      this._setupEventHandlers();
    } catch (err) {
      console.error('[WS] Connection error:', err);
      this._scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    this.isIntentionalClose = true;
    this._clearTimers();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this._setConnectionState('disconnected');
  }

  /**
   * Subscribe to a specific event type
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(eventType);
      }
    };
  }

  /**
   * Subscribe to connection state changes
   * @param {Function} callback - receives 'disconnected' | 'connecting' | 'connected'
   * @returns {Function} Unsubscribe
   */
  onStateChange(callback) {
    this.stateListeners.add(callback);
    // Immediately call with current state
    callback(this.connectionState);
    return () => this.stateListeners.delete(callback);
  }

  /**
   * Send a message through WebSocket
   * @param {string} type - Message type
   * @param {object} payload - Message data
   */
  send(type, payload = {}) {
    const message = JSON.stringify({ type, ...payload });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
    }
  }

  // --- Internal Methods ---

  _setupEventHandlers() {
    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.reconnectAttempts = 0;
      this._setConnectionState('connected');
      this._startHeartbeat();
      this._flushMessageQueue();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const eventType = data.type;

        // Emit to specific event listeners
        if (eventType && this.listeners.has(eventType)) {
          for (const callback of this.listeners.get(eventType)) {
            try {
              callback(data);
            } catch (err) {
              console.error(`[WS] Error in listener for ${eventType}:`, err);
            }
          }
        }

        // Emit to wildcard listeners
        if (this.listeners.has('*')) {
          for (const callback of this.listeners.get('*')) {
            try {
              callback(data);
            } catch (err) {
              console.error('[WS] Error in wildcard listener:', err);
            }
          }
        }
      } catch (err) {
        console.warn('[WS] Failed to parse message:', event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code, event.reason);
      this._clearTimers();
      this._setConnectionState('disconnected');

      if (!this.isIntentionalClose) {
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  }

  _setConnectionState(state) {
    this.connectionState = state;
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('[WS] Error in state listener:', err);
      }
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      WS_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      WS_MAX_RECONNECT_DELAY
    );

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    this._setConnectionState('connecting');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  _startHeartbeat() {
    this._clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping');
      }
    }, WS_HEARTBEAT_INTERVAL);
  }

  _clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _clearTimers() {
    this._clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  _flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(msg);
      }
    }
  }
}

// Singleton instance
const wsService = new WebSocketService();
export default wsService;
