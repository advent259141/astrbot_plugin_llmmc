import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import { Bot } from './bot.js';
import { Actions } from './actions.js';
import { Observer } from './observer.js';
import { config } from './config.js';

/**
 * HTTP/WebSocket Server for the Mineflayer Bot
 * Provides API for Python backend to control the bot
 */
class BotServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    
    this.bot = null;
    this.actions = null;
    this.observer = null;
    this.wsClients = new Set();
    
    this._setupMiddleware();
    this._setupRoutes();
    this._setupWebSocket();
  }

  _setupMiddleware() {
    this.app.use(express.json());
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });
  }

  _setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });

    // Get bot status
    this.app.get('/status', (req, res) => {
      res.json({
        connected: this.bot?.isConnected || false,
        username: config.minecraft.username
      });
    });

    // Connect to Minecraft
    this.app.post('/connect', async (req, res) => {
      try {
        if (this.bot?.isConnected) {
          return res.json({ success: true, message: 'Already connected' });
        }
        
        this.bot = new Bot();
        await this.bot.connect();
        
        this.actions = new Actions(this.bot);
        this.observer = new Observer(this.bot);
        
        // Setup event forwarding
        this._setupEventForwarding();
        
        res.json({ success: true, message: 'Connected to Minecraft' });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // Disconnect from Minecraft
    this.app.post('/disconnect', (req, res) => {
      if (this.bot) {
        this.bot.disconnect();
        this.bot = null;
        this.actions = null;
        this.observer = null;
      }
      res.json({ success: true, message: 'Disconnected' });
    });

    // Get observation
    this.app.get('/observation', (req, res) => {
      if (!this.observer) {
        return res.status(400).json({ error: 'Bot not connected' });
      }
      res.json(this.observer.getObservation());
    });

    // Execute action
    this.app.post('/action', async (req, res) => {
      if (!this.actions) {
        return res.status(400).json({ success: false, message: 'Bot not connected' });
      }
      
      const { action, parameters } = req.body;
      
      if (!action) {
        return res.status(400).json({ success: false, message: 'Action required' });
      }
      
      try {
        const result = await this.actions.execute(action, parameters || {});
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
  }

  _setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('[Server] WebSocket client connected');
      this.wsClients.add(ws);
      
      ws.on('close', () => {
        console.log('[Server] WebSocket client disconnected');
        this.wsClients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('[Server] WebSocket error:', error);
        this.wsClients.delete(ws);
      });
    });
  }

  _setupEventForwarding() {
    if (!this.bot) return;
    
    const mcBot = this.bot.getMineflayerBot();
    
    // Forward chat messages
    mcBot.on('chat', (username, message) => {
      if (username === mcBot.username) return;
      this._broadcast({
        type: 'chat',
        username,
        message,
        timestamp: Date.now()
      });
    });

    // Forward health changes
    mcBot.on('health', () => {
      this._broadcast({
        type: 'health',
        health: mcBot.health,
        food: mcBot.food,
        timestamp: Date.now()
      });
    });

    // Forward death
    mcBot.on('death', () => {
      this._broadcast({
        type: 'death',
        timestamp: Date.now()
      });
    });

    // Forward spawn
    mcBot.on('spawn', () => {
      this._broadcast({
        type: 'spawn',
        timestamp: Date.now()
      });
    });

    // Forward player collect (when a player picks up an item)
    mcBot.on('playerCollect', (collector, collected) => {
      // collector: the entity that collected (usually a player)
      // collected: the item entity that was collected
      const collectorName = collector.username || collector.name || 'unknown';
      const collectorType = collector.type;
      
      // Get item info if available
      let itemInfo = null;
      if (collected.metadata) {
        // In Minecraft, item entities have metadata with item info
        // The item stack is usually in metadata[8] for recent versions
        const itemStack = collected.metadata[8] || collected.metadata[7];
        if (itemStack && itemStack.itemId !== undefined) {
          itemInfo = {
            itemId: itemStack.itemId,
            itemCount: itemStack.itemCount || 1,
            // We can't easily get item name without mcData lookup
          };
        }
      }
      
      this._broadcast({
        type: 'playerCollect',
        collector: {
          id: collector.id,
          name: collectorName,
          type: collectorType,
          position: collector.position ? {
            x: Math.floor(collector.position.x),
            y: Math.floor(collector.position.y),
            z: Math.floor(collector.position.z)
          } : null
        },
        collected: {
          id: collected.id,
          type: collected.type,
          name: collected.name,
          position: collected.position ? {
            x: Math.floor(collected.position.x),
            y: Math.floor(collected.position.y),
            z: Math.floor(collected.position.z)
          } : null,
          item: itemInfo
        },
        timestamp: Date.now()
      });
    });

    // Forward item drop (when an entity drops an item)
    mcBot.on('itemDrop', (entity) => {
      this._broadcast({
        type: 'itemDrop',
        entity: {
          id: entity.id,
          type: entity.type,
          name: entity.name,
          position: entity.position ? {
            x: Math.floor(entity.position.x),
            y: Math.floor(entity.position.y),
            z: Math.floor(entity.position.z)
          } : null
        },
        timestamp: Date.now()
      });
    });

    // Forward entity spawn (useful for tracking dropped items)
    mcBot.on('entitySpawn', (entity) => {
      // Only broadcast for item entities to avoid spam
      if (entity.type === 'object' && entity.objectType === 'Item') {
        this._broadcast({
          type: 'entitySpawn',
          entity: {
            id: entity.id,
            type: entity.type,
            objectType: entity.objectType,
            name: entity.name,
            position: entity.position ? {
              x: Math.floor(entity.position.x),
              y: Math.floor(entity.position.y),
              z: Math.floor(entity.position.z)
            } : null
          },
          timestamp: Date.now()
        });
      }
    });
  }

  _broadcast(data) {
    const message = JSON.stringify(data);
    for (const client of this.wsClients) {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    }
  }

  start(port = 3001) {
    return new Promise((resolve) => {
      this.server.listen(port, async () => {
        console.log(`[Server] Bot service running on port ${port}`);
        console.log(`[Server] HTTP API: http://localhost:${port}`);
        console.log(`[Server] WebSocket: ws://localhost:${port}`);
        
        // Auto-connect if enabled
        if (config.autoConnect) {
          console.log('[Server] Auto-connect enabled, connecting to Minecraft...');
          try {
            this.bot = new Bot();
            await this.bot.connect();
            this.actions = new Actions(this.bot);
            this.observer = new Observer(this.bot);
            this._setupEventForwarding();
            console.log('[Server] Auto-connect successful!');
          } catch (error) {
            console.error('[Server] Auto-connect failed:', error.message);
          }
        }
        
        resolve();
      });
    });
  }

  stop() {
    if (this.bot) {
      this.bot.disconnect();
    }
    this.server.close();
  }
}

export { BotServer };
export default BotServer;