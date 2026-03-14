import pathfinderPkg from 'mineflayer-pathfinder';
const { goals } = pathfinderPkg;
import Vec3 from 'vec3';
import minecraftData from 'minecraft-data';

/**
 * Action system for the bot
 * Provides high-level actions that can be invoked via API
 */
export class Actions {
  constructor(bot) {
    this.bot = bot;
    this.mcBot = bot.getMineflayerBot();
  }

  /**
   * Get available actions list
   * @returns {Array<{name: string, description: string, parameters: object}>}
   */
  static getActionList() {
    return [
      {
        name: 'chat',
        description: 'Send a chat message to the server',
        parameters: { message: 'string - The message to send' }
      },
      {
        name: 'goTo',
        description: 'Walk to a specific coordinate',
        parameters: { x: 'number', y: 'number', z: 'number' }
      },
      {
        name: 'followPlayer',
        description: 'Follow a specific player',
        parameters: { playerName: 'string - Name of the player to follow' }
      },
      {
        name: 'stopMoving',
        description: 'Stop all movement',
        parameters: {}
      },
      {
        name: 'jump',
        description: 'Make the bot jump',
        parameters: {}
      },
      {
        name: 'lookAt',
        description: 'Look at a specific coordinate',
        parameters: { x: 'number', y: 'number', z: 'number' }
      },
      {
        name: 'attack',
        description: 'Attack the nearest entity of specified type',
        parameters: { entityType: 'string - Type of entity to attack (e.g., zombie, skeleton)' }
      },
      {
        name: 'collectBlock',
        description: 'Mine and collect a specific type of block nearby',
        parameters: { blockType: 'string - Type of block to collect (e.g., oak_log, stone)' }
      },
      {
        name: 'wait',
        description: 'Wait for a specified duration',
        parameters: { seconds: 'number - Duration to wait in seconds' }
      },
      {
        name: 'viewInventory',
        description: 'View all items in inventory/backpack and return the list',
        parameters: {}
      },
      {
        name: 'equipItem',
        description: 'Equip an item to hand (hold it)',
        parameters: { itemName: 'string - Name of the item to equip (e.g., diamond_sword, diamond_pickaxe)' }
      },
      {
        name: 'placeBlock',
        description: 'Place a block at a specific position',
        parameters: {
          blockName: 'string - Name of the block to place (must be in inventory)',
          x: 'number - X coordinate',
          y: 'number - Y coordinate',
          z: 'number - Z coordinate'
        }
      },
      {
        name: 'scanBlocks',
        description: 'Scan and count blocks of specified types within a range',
        parameters: {
          blockTypes: 'array - List of block names to search for (e.g., ["diamond_ore", "iron_ore"])',
          range: 'number - Search radius (default: 16, max: 32)'
        }
      },
      {
        name: 'findBlock',
        description: 'Find the nearest block of a specific type and return its location',
        parameters: {
          blockType: 'string - Block name to find (e.g., diamond_ore, water)',
          maxDistance: 'number - Maximum search distance (default: 32)'
        }
      },
      {
        name: 'getBlockAt',
        description: 'Get information about the block at a specific coordinate',
        parameters: {
          x: 'number - X coordinate',
          y: 'number - Y coordinate',
          z: 'number - Z coordinate'
        }
      },
      {
        name: 'scanEntities',
        description: 'Scan all entities within range and return detailed information',
        parameters: {
          range: 'number - Search radius (default: 16)',
          entityType: 'string - Optional: filter by entity type (e.g., player, zombie, cow)'
        }
      },
      {
        name: 'listPlayers',
        description: 'List all online players on the server with their names and positions',
        parameters: {}
      },
      {
        name: 'dropItem',
        description: 'Drop/throw items from inventory',
        parameters: {
          itemName: 'string - Name of the item to drop',
          count: 'number - Optional: number of items to drop (default: all)'
        }
      },
      {
        name: 'eat',
        description: 'Eat food to restore hunger',
        parameters: {
          foodName: 'string - Optional: specific food to eat (if not provided, will eat any food)'
        }
      },
      {
        name: 'useItem',
        description: 'Use the currently held item (e.g., shoot bow, drink potion, throw ender pearl)',
        parameters: {}
      },
      {
        name: 'activateBlock',
        description: 'Right-click/activate a block (e.g., open door, press button, pull lever, use bed)',
        parameters: {
          x: 'number - X coordinate',
          y: 'number - Y coordinate',
          z: 'number - Z coordinate'
        }
      },
      {
        name: 'canReach',
        description: 'Check if a coordinate is reachable by pathfinding (without actually moving)',
        parameters: {
          x: 'number - X coordinate',
          y: 'number - Y coordinate',
          z: 'number - Z coordinate'
        }
      },
      {
        name: 'getPathTo',
        description: 'Calculate and return the path to a coordinate (without moving)',
        parameters: {
          x: 'number - X coordinate',
          y: 'number - Y coordinate',
          z: 'number - Z coordinate'
        }
      },
      // ===== 合成相关动作 =====
      {
        name: 'craft',
        description: 'Craft an item using a crafting table (will find nearby crafting table or use inventory crafting)',
        parameters: {
          itemName: 'string - Name of the item to craft (e.g., oak_planks, stick, crafting_table)',
          count: 'number - Optional: number of items to craft (default: 1)'
        }
      },
      {
        name: 'listRecipes',
        description: 'List all available recipes for crafting an item',
        parameters: {
          itemName: 'string - Name of the item to get recipes for'
        }
      },
      {
        name: 'smelt',
        description: 'Smelt items in a furnace (will find nearby furnace)',
        parameters: {
          itemName: 'string - Name of the item to smelt (e.g., raw_iron, raw_gold, cobblestone)',
          fuelName: 'string - Optional: Name of fuel to use (default: any fuel in inventory)',
          count: 'number - Optional: number of items to smelt (default: 1)'
        }
      },
      {
        name: 'openContainer',
        description: 'Open a container (chest, barrel, etc.) at specified coordinates',
        parameters: {
          x: 'number - X coordinate',
          y: 'number - Y coordinate',
          z: 'number - Z coordinate'
        }
      },
      {
        name: 'closeContainer',
        description: 'Close the currently open container',
        parameters: {}
      },
      {
        name: 'depositItem',
        description: 'Deposit items into the currently open container',
        parameters: {
          itemName: 'string - Name of the item to deposit',
          count: 'number - Optional: number of items to deposit (default: all)'
        }
      },
      {
        name: 'withdrawItem',
        description: 'Withdraw items from the currently open container',
        parameters: {
          itemName: 'string - Name of the item to withdraw',
          count: 'number - Optional: number of items to withdraw (default: all)'
        }
      },
      {
        name: 'findCraftingTable',
        description: 'Find the nearest crafting table',
        parameters: {
          maxDistance: 'number - Optional: maximum search distance (default: 32)'
        }
      },
      {
        name: 'findFurnace',
        description: 'Find the nearest furnace',
        parameters: {
          maxDistance: 'number - Optional: maximum search distance (default: 32)'
        }
      },
      {
        name: 'findChest',
        description: 'Find the nearest chest or barrel',
        parameters: {
          maxDistance: 'number - Optional: maximum search distance (default: 32)'
        }
      },
      // ===== 实体交互动作 =====
      {
        name: 'mountEntity',
        description: 'Mount/ride an entity like horse, boat, minecart, pig, etc.',
        parameters: {
          entityType: 'string - Optional: type of entity to mount (e.g., horse, boat, minecart). If not specified, mounts nearest mountable entity'
        }
      },
      {
        name: 'dismount',
        description: 'Dismount from the currently mounted entity (get off horse, boat, etc.)',
        parameters: {}
      },
      {
        name: 'useOnEntity',
        description: 'Right-click/interact with an entity (e.g., feed animal, trade with villager, attach lead)',
        parameters: {
          entityType: 'string - Type of entity to interact with',
          hand: 'string - Optional: which hand to use (hand or off-hand, default: hand)'
        }
      },
      // ===== 数据查询动作 =====
      {
        name: 'getRecipeData',
        description: 'Get recipe data from minecraft-data for an item (raw recipe info from game data)',
        parameters: {
          itemName: 'string - Name of the item to get recipe data for'
        }
      },
      {
        name: 'getAllRecipes',
        description: 'Get all available recipes from minecraft-data (for caching/analysis)',
        parameters: {}
      }
    ];
  }

  /**
   * Execute an action by name
   * @param {string} actionName 
   * @param {object} params 
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async execute(actionName, params = {}) {
    try {
      switch (actionName) {
        case 'chat':
          return await this.chat(params.message);
        case 'goTo':
          return await this.goTo(params.x, params.y, params.z);
        case 'followPlayer':
          return await this.followPlayer(params.playerName);
        case 'stopMoving':
          return await this.stopMoving();
        case 'jump':
          return await this.jump();
        case 'lookAt':
          return await this.lookAt(params.x, params.y, params.z);
        case 'attack':
          return await this.attack(params.entityType);
        case 'collectBlock':
          return await this.collectBlock(params.blockType);
        case 'wait':
          return await this.wait(params.seconds);
        case 'viewInventory':
          return await this.viewInventory();
        case 'equipItem':
          return await this.equipItem(params.itemName);
        case 'placeBlock':
          return await this.placeBlock(params.blockName, params.x, params.y, params.z);
        case 'scanBlocks':
          return await this.scanBlocks(params.blockTypes, params.range);
        case 'findBlock':
          return await this.findBlock(params.blockType, params.maxDistance);
        case 'getBlockAt':
          return await this.getBlockAt(params.x, params.y, params.z);
        case 'scanEntities':
          return await this.scanEntities(params.range, params.entityType);
        case 'listPlayers':
          return await this.listPlayers();
        case 'dropItem':
          return await this.dropItem(params.itemName, params.count);
        case 'eat':
          return await this.eat(params.foodName);
        case 'useItem':
          return await this.useItem();
        case 'activateBlock':
          return await this.activateBlock(params.x, params.y, params.z);
        case 'canReach':
          return await this.canReach(params.x, params.y, params.z);
        case 'getPathTo':
          return await this.getPathTo(params.x, params.y, params.z);
        // 合成相关动作
        case 'craft':
          return await this.craft(params.itemName, params.count);
        case 'listRecipes':
          return await this.listRecipes(params.itemName);
        case 'smelt':
          return await this.smelt(params.itemName, params.fuelName, params.count);
        case 'openContainer':
          return await this.openContainer(params.x, params.y, params.z);
        case 'closeContainer':
          return await this.closeContainer();
        case 'depositItem':
          return await this.depositItem(params.itemName, params.count);
        case 'withdrawItem':
          return await this.withdrawItem(params.itemName, params.count);
        case 'findCraftingTable':
          return await this.findCraftingTable(params.maxDistance);
        case 'findFurnace':
          return await this.findFurnace(params.maxDistance);
        case 'findChest':
          return await this.findChest(params.maxDistance);
        // 实体交互动作
        case 'mountEntity':
          return await this.mountEntity(params.entityType);
        case 'dismount':
          return await this.dismount();
        case 'useOnEntity':
          return await this.useOnEntity(params.entityType, params.hand);
        // 数据查询动作
        case 'getRecipeData':
          return await this.getRecipeData(params.itemName);
        case 'getAllRecipes':
          return await this.getAllRecipes();
        default:
          return { success: false, message: `Unknown action: ${actionName}` };
      }
    } catch (error) {
      return { success: false, message: `Action failed: ${error.message}` };
    }
  }

  /**
   * Send chat message
   */
  async chat(message) {
    this.mcBot.chat(message);
    return { success: true, message: `Said: ${message}` };
  }

  /**
   * Navigate to coordinates with stuck detection
   */
  async goTo(x, y, z) {
    const goal = new goals.GoalBlock(x, y, z);
    const STUCK_CHECK_INTERVAL = 2000;  // 每2秒检查一次
    const STUCK_THRESHOLD = 0.5;        // 移动小于0.5格视为没动
    const STUCK_MAX_COUNT = 5;          // 连续5次没动（10秒）视为卡住
    
    return new Promise((resolve) => {
      let resolved = false;
      let lastPosition = this.mcBot.entity.position.clone();
      let stuckCount = 0;
      let stuckCheckInterval = null;
      
      const cleanup = () => {
        this.mcBot.removeListener('goal_reached', onGoalReached);
        this.mcBot.removeListener('path_update', onPathUpdate);
        this.mcBot.removeListener('path_stop', onPathStop);
        if (stuckCheckInterval) {
          clearInterval(stuckCheckInterval);
          stuckCheckInterval = null;
        }
      };
      
      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        this.mcBot.pathfinder.setGoal(null);
        resolve(result);
      };
      
      const onGoalReached = () => {
        finish({ success: true, message: `Arrived at (${x}, ${y}, ${z})` });
      };
      
      const onPathUpdate = (results) => {
        // 检查路径状态
        if (results.status === 'noPath') {
          finish({ success: false, message: `Cannot find path to (${x}, ${y}, ${z}) - no path exists` });
        } else if (results.status === 'timeout') {
          finish({ success: false, message: `Path calculation timeout to (${x}, ${y}, ${z})` });
        }
      };
      
      const onPathStop = () => {
        // 路径被中断（可能是被阻挡或其他原因）
        // 检查是否已经到达目标附近
        const currentPos = this.mcBot.entity.position;
        const distance = Math.sqrt(
          Math.pow(currentPos.x - x, 2) +
          Math.pow(currentPos.y - y, 2) +
          Math.pow(currentPos.z - z, 2)
        );
        
        if (distance < 2) {
          finish({ success: true, message: `Arrived near (${x}, ${y}, ${z}), distance: ${distance.toFixed(1)}` });
        }
        // 如果没到达，不做处理，等待超时或其他事件
      };
      
      // 卡住检测
      stuckCheckInterval = setInterval(() => {
        if (resolved) return;
        
        const currentPos = this.mcBot.entity.position;
        const moved = lastPosition.distanceTo(currentPos);
        
        if (moved < STUCK_THRESHOLD) {
          stuckCount++;
          console.log(`[goTo] Stuck check: moved ${moved.toFixed(2)} blocks, count: ${stuckCount}/${STUCK_MAX_COUNT}`);
          
          if (stuckCount >= STUCK_MAX_COUNT) {
            const distanceToTarget = Math.sqrt(
              Math.pow(currentPos.x - x, 2) +
              Math.pow(currentPos.y - y, 2) +
              Math.pow(currentPos.z - z, 2)
            );
            
            // 如果已经很近了，算成功
            if (distanceToTarget < 3) {
              finish({
                success: true,
                message: `Arrived near (${x}, ${y}, ${z}), distance: ${distanceToTarget.toFixed(1)} (stopped moving)`
              });
            } else {
              finish({
                success: false,
                message: `Stuck! No movement for 10 seconds. Distance to target: ${distanceToTarget.toFixed(1)} blocks`
              });
            }
          }
        } else {
          // 有移动，重置计数
          stuckCount = 0;
        }
        
        lastPosition = currentPos.clone();
      }, STUCK_CHECK_INTERVAL);
      
      this.mcBot.on('goal_reached', onGoalReached);
      this.mcBot.on('path_update', onPathUpdate);
      this.mcBot.on('path_stop', onPathStop);
      
      this.mcBot.pathfinder.setGoal(goal);

      // Timeout after 120 seconds (increased for long journeys)
      setTimeout(() => {
        const currentPos = this.mcBot.entity.position;
        const distance = Math.sqrt(
          Math.pow(currentPos.x - x, 2) +
          Math.pow(currentPos.y - y, 2) +
          Math.pow(currentPos.z - z, 2)
        );
        finish({
          success: false,
          message: `Navigation timeout after 120s. Current distance to target: ${distance.toFixed(1)} blocks`
        });
      }, 120000);
    });
  }

  /**
   * Follow a player
   */
  async followPlayer(playerName) {
    const player = this.mcBot.players[playerName];
    if (!player || !player.entity) {
      return { success: false, message: `Player ${playerName} not found or not in range` };
    }

    const goal = new goals.GoalFollow(player.entity, 2);
    this.mcBot.pathfinder.setGoal(goal, true); // dynamic goal
    return { success: true, message: `Following player ${playerName}` };
  }

  /**
   * Stop all movement
   */
  async stopMoving() {
    this.mcBot.pathfinder.setGoal(null);
    this.mcBot.clearControlStates();
    return { success: true, message: 'Stopped moving' };
  }

  /**
   * Jump once
   */
  async jump() {
    this.mcBot.setControlState('jump', true);
    await new Promise(r => setTimeout(r, 250));
    this.mcBot.setControlState('jump', false);
    return { success: true, message: 'Jumped' };
  }

  /**
   * Look at coordinates
   */
  async lookAt(x, y, z) {
    await this.mcBot.lookAt(new Vec3(x, y, z));
    return { success: true, message: `Looking at (${x}, ${y}, ${z})` };
  }

  /**
   * Attack nearest entity of type
   */
  async attack(entityType) {
    const entity = this.mcBot.nearestEntity((e) => {
      return e.name === entityType || e.mobType === entityType;
    });

    if (!entity) {
      return { success: false, message: `No ${entityType} found nearby` };
    }

    await this.mcBot.attack(entity);
    return { success: true, message: `Attacked ${entityType}` };
  }

  /**
   * Collect/mine a block type with stuck detection
   * Improved: finds reachable blocks and uses GoalNear
   */
  async collectBlock(blockType) {
    const mcData = minecraftData(this.mcBot.version);
    const blockId = mcData.blocksByName[blockType]?.id;
    
    if (!blockId) {
      return { success: false, message: `Unknown block type: ${blockType}` };
    }

    // 找到多个方块，选择最容易到达的
    const blocks = this.mcBot.findBlocks({
      matching: blockId,
      maxDistance: 32,
      count: 10  // 找最多10个候选
    });

    if (blocks.length === 0) {
      return { success: false, message: `No ${blockType} found nearby` };
    }

    const botPos = this.mcBot.entity.position;
    const botY = botPos.y;
    
    // 对候选方块评分，选择最容易到达的
    // 优先选择: 1. y坐标接近bot的 2. 距离近的
    const scoredBlocks = blocks.map(pos => {
      const distance = botPos.distanceTo(pos);
      const yDiff = Math.abs(pos.y - botY);
      // y差距大的给予惩罚（高处的木头难以到达）
      const score = distance + (yDiff > 3 ? yDiff * 3 : 0);
      return { pos, distance, yDiff, score };
    }).sort((a, b) => a.score - b.score);

    let lastError = null;
    
    // 尝试最多3个候选方块
    for (let i = 0; i < Math.min(3, scoredBlocks.length); i++) {
      const candidate = scoredBlocks[i];
      const blockPos = candidate.pos;
      
      console.log(`[collectBlock] Trying candidate ${i+1}: (${blockPos.x}, ${blockPos.y}, ${blockPos.z}), score: ${candidate.score.toFixed(1)}`);

      // 检查是否在挖掘范围内（大约4-5格）
      let currentDistance = this.mcBot.entity.position.distanceTo(blockPos);
      
      if (currentDistance > 4.5) {
        // 需要先走近一点，使用 GoalNear（不需要站在方块上）
        const STUCK_CHECK_INTERVAL = 2000;
        const STUCK_THRESHOLD = 0.5;
        const STUCK_MAX_COUNT = 5;
        
        try {
          // GoalNear: 走到方块3格范围内即可
          const goal = new goals.GoalNear(blockPos.x, blockPos.y, blockPos.z, 3);
          
          await new Promise((resolve, reject) => {
            let resolved = false;
            let lastPosition = this.mcBot.entity.position.clone();
            let stuckCount = 0;
            let stuckCheckInterval = null;
            
            const cleanup = () => {
              this.mcBot.removeListener('goal_reached', onGoalReached);
              this.mcBot.removeListener('path_update', onPathUpdate);
              if (stuckCheckInterval) {
                clearInterval(stuckCheckInterval);
                stuckCheckInterval = null;
              }
            };
            
            const finish = (success, error = null) => {
              if (resolved) return;
              resolved = true;
              cleanup();
              this.mcBot.pathfinder.setGoal(null);
              if (success) {
                resolve();
              } else {
                reject(error || new Error('Unknown error'));
              }
            };
            
            const onGoalReached = () => {
              finish(true);
            };
            
            const onPathUpdate = (results) => {
              if (results.status === 'noPath') {
                finish(false, new Error('No path to block'));
              } else if (results.status === 'timeout') {
                finish(false, new Error('Path calculation timeout'));
              }
            };
            
            // 卡住检测
            stuckCheckInterval = setInterval(() => {
              if (resolved) return;
              
              const currentPos = this.mcBot.entity.position;
              const moved = lastPosition.distanceTo(currentPos);
              
              if (moved < STUCK_THRESHOLD) {
                stuckCount++;
                
                if (stuckCount >= STUCK_MAX_COUNT) {
                  const newDistance = currentPos.distanceTo(blockPos);
                  if (newDistance <= 4.5) {
                    finish(true);  // 已经足够近了
                  } else {
                    finish(false, new Error(`Stuck at ${newDistance.toFixed(1)} blocks away`));
                  }
                }
              } else {
                stuckCount = 0;
              }
              
              lastPosition = currentPos.clone();
            }, STUCK_CHECK_INTERVAL);
            
            this.mcBot.on('goal_reached', onGoalReached);
            this.mcBot.on('path_update', onPathUpdate);
            
            this.mcBot.pathfinder.setGoal(goal);
            
            // 30秒总超时
            setTimeout(() => {
              const newDistance = this.mcBot.entity.position.distanceTo(blockPos);
              if (newDistance <= 4.5) {
                finish(true);
              } else {
                finish(false, new Error(`Timeout at ${newDistance.toFixed(1)} blocks away`));
              }
            }, 30000);
          });
        } catch (error) {
          console.log(`[collectBlock] Failed to reach candidate ${i+1}: ${error.message}`);
          lastError = error;
          continue;  // 尝试下一个候选
        }
      }

      // 检查现在是否在挖掘范围内
      currentDistance = this.mcBot.entity.position.distanceTo(blockPos);
      if (currentDistance > 5) {
        console.log(`[collectBlock] Still too far (${currentDistance.toFixed(1)}), trying next candidate`);
        lastError = new Error(`Still too far: ${currentDistance.toFixed(1)} blocks`);
        continue;
      }

      // 重新获取方块（可能位置变化了）
      const targetBlock = this.mcBot.blockAt(blockPos);
      if (!targetBlock || targetBlock.name !== blockType) {
        console.log(`[collectBlock] Block no longer exists, trying next candidate`);
        lastError = new Error('Block no longer exists');
        continue;
      }

      try {
        // 先看向方块
        await this.mcBot.lookAt(blockPos.offset(0.5, 0.5, 0.5));
        
        // 挖掘，添加超时
        const digPromise = this.mcBot.dig(targetBlock);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Dig timeout after 30s')), 30000);
        });
        
        await Promise.race([digPromise, timeoutPromise]);
        return {
          success: true,
          message: `Mined ${blockType} at (${blockPos.x}, ${blockPos.y}, ${blockPos.z})`
        };
      } catch (error) {
        console.log(`[collectBlock] Failed to mine candidate ${i+1}: ${error.message}`);
        lastError = error;
        continue;
      }
    }

    // 所有候选都失败了
    return {
      success: false,
      message: `Failed to collect ${blockType}: ${lastError?.message || 'All candidates failed'}`
    };
  }

  /**
   * Wait for duration
   */
  async wait(seconds) {
    await new Promise(r => setTimeout(r, seconds * 1000));
    return { success: true, message: `Waited ${seconds} seconds` };
  }

  /**
   * View inventory - list all items in inventory
   */
  async viewInventory() {
    const items = this.mcBot.inventory.items();
    
    if (items.length === 0) {
      return {
        success: true,
        message: 'Inventory is empty',
        inventory: []
      };
    }

    const inventoryList = items.map(item => ({
      name: item.name,
      displayName: item.displayName,
      count: item.count,
      slot: item.slot
    }));

    // 生成可读的文字描述
    const itemsText = inventoryList.map(i => `${i.name} x${i.count}`).join(', ');
    
    return {
      success: true,
      message: `Inventory (${items.length} items): ${itemsText}`,
      inventory: inventoryList
    };
  }

  /**
   * Equip an item to hand
   */
  async equipItem(itemName) {
    const item = this.mcBot.inventory.items().find(i =>
      i.name === itemName || i.name.includes(itemName)
    );

    if (!item) {
      return { success: false, message: `Item ${itemName} not found in inventory` };
    }

    try {
      await this.mcBot.equip(item, 'hand');
      return { success: true, message: `Equipped ${item.name} to hand` };
    } catch (error) {
      return { success: false, message: `Failed to equip: ${error.message}` };
    }
  }

  /**
   * Place a block at specific coordinates
   */
  async placeBlock(blockName, x, y, z) {
    // 1. 先检查背包里有没有这个方块
    const blockItem = this.mcBot.inventory.items().find(i =>
      i.name === blockName || i.name.includes(blockName)
    );

    if (!blockItem) {
      return { success: false, message: `Block ${blockName} not found in inventory` };
    }

    // 2. 装备方块到手上
    try {
      await this.mcBot.equip(blockItem, 'hand');
    } catch (error) {
      return { success: false, message: `Failed to equip block: ${error.message}` };
    }

    // 3. 找到要放置位置相邻的参考方块
    const targetPos = new Vec3(x, y, z);
    
    // 尝试找到目标位置下方的方块作为参考
    const referencePositions = [
      new Vec3(x, y - 1, z),  // 下方
      new Vec3(x - 1, y, z),  // 西边
      new Vec3(x + 1, y, z),  // 东边
      new Vec3(x, y, z - 1),  // 北边
      new Vec3(x, y, z + 1),  // 南边
      new Vec3(x, y + 1, z),  // 上方
    ];

    let referenceBlock = null;
    let faceVector = null;

    for (const pos of referencePositions) {
      const block = this.mcBot.blockAt(pos);
      if (block && block.name !== 'air') {
        referenceBlock = block;
        // 计算放置的面向
        faceVector = new Vec3(
          x - pos.x,
          y - pos.y,
          z - pos.z
        );
        break;
      }
    }

    if (!referenceBlock) {
      return { success: false, message: `No adjacent block found to place against at (${x}, ${y}, ${z})` };
    }

    // 4. 放置方块
    try {
      await this.mcBot.placeBlock(referenceBlock, faceVector);
      return { success: true, message: `Placed ${blockName} at (${x}, ${y}, ${z})` };
    } catch (error) {
      return { success: false, message: `Failed to place block: ${error.message}` };
    }
  }

  /**
   * Scan blocks of specified types within range
   */
  async scanBlocks(blockTypes, range = 16) {
    const mcData = minecraftData(this.mcBot.version);
    const maxRange = Math.min(range, 32);
    
    // 将方块名转换为ID
    const blockIds = [];
    const validBlockTypes = [];
    
    for (const blockType of blockTypes) {
      const blockInfo = mcData.blocksByName[blockType];
      if (blockInfo) {
        blockIds.push(blockInfo.id);
        validBlockTypes.push(blockType);
      }
    }
    
    if (blockIds.length === 0) {
      return { success: false, message: 'No valid block types specified' };
    }

    // 统计每种方块的数量和位置
    const results = {};
    for (const blockType of validBlockTypes) {
      results[blockType] = { count: 0, nearest: null, positions: [] };
    }
    
    const botPos = this.mcBot.entity.position;
    
    // 扫描范围内的方块
    const blocks = this.mcBot.findBlocks({
      matching: blockIds,
      maxDistance: maxRange,
      count: 100  // 最多返回100个
    });
    
    for (const pos of blocks) {
      const block = this.mcBot.blockAt(pos);
      if (block) {
        const blockType = block.name;
        if (results[blockType]) {
          results[blockType].count++;
          const distance = botPos.distanceTo(pos);
          results[blockType].positions.push({
            x: pos.x, y: pos.y, z: pos.z,
            distance: Math.round(distance * 10) / 10
          });
          
          // 更新最近的方块
          if (!results[blockType].nearest || distance < results[blockType].nearest.distance) {
            results[blockType].nearest = {
              x: pos.x, y: pos.y, z: pos.z,
              distance: Math.round(distance * 10) / 10
            };
          }
        }
      }
    }

    // 生成消息
    const summary = validBlockTypes.map(t => `${t}: ${results[t].count}`).join(', ');
    
    return {
      success: true,
      message: `Scan results within ${maxRange} blocks: ${summary}`,
      results: results
    };
  }

  /**
   * Find the nearest block of a specific type
   */
  async findBlock(blockType, maxDistance = 32) {
    const mcData = minecraftData(this.mcBot.version);
    const blockInfo = mcData.blocksByName[blockType];
    
    if (!blockInfo) {
      return { success: false, message: `Unknown block type: ${blockType}` };
    }

    const block = this.mcBot.findBlock({
      matching: blockInfo.id,
      maxDistance: Math.min(maxDistance, 64)
    });

    if (!block) {
      return {
        success: true,
        message: `No ${blockType} found within ${maxDistance} blocks`,
        found: false
      };
    }

    const distance = this.mcBot.entity.position.distanceTo(block.position);
    
    return {
      success: true,
      message: `Found ${blockType} at (${block.position.x}, ${block.position.y}, ${block.position.z}), distance: ${Math.round(distance * 10) / 10}`,
      found: true,
      blockName: block.name,
      position: {
        x: block.position.x,
        y: block.position.y,
        z: block.position.z
      },
      distance: Math.round(distance * 10) / 10
    };
  }

  /**
   * Get block info at specific coordinates
   */
  async getBlockAt(x, y, z) {
    const block = this.mcBot.blockAt(new Vec3(x, y, z));
    
    if (!block) {
      return { success: false, message: `Cannot access block at (${x}, ${y}, ${z})` };
    }

    const distance = this.mcBot.entity.position.distanceTo(block.position);
    
    return {
      success: true,
      message: `Block at (${x}, ${y}, ${z}): ${block.name}`,
      block: {
        name: block.name,
        displayName: block.displayName,
        type: block.type,
        hardness: block.hardness,
        diggable: block.diggable,
        transparent: block.transparent,
        light: block.light,
        x: x,
        y: y,
        z: z,
        distance: Math.round(distance * 10) / 10
      }
    };
  }

  /**
   * Drop items from inventory
   * Returns ALL dropped item entity IDs for tracking (handles stacks that split into multiple entities)
   */
  async dropItem(itemName, count = null) {
    const item = this.mcBot.inventory.items().find(i =>
      i.name === itemName || i.name.includes(itemName)
    );

    if (!item) {
      return { success: false, message: `Item ${itemName} not found in inventory` };
    }

    try {
      // 如果没指定数量，丢弃全部
      const dropCount = count || item.count;
      const actualDropCount = Math.min(dropCount, item.count);
      
      // 记录丢弃前bot附近的物品实体，以便识别新丢出的物品
      const botPos = this.mcBot.entity.position;
      const existingItemEntities = new Set();
      for (const entity of Object.values(this.mcBot.entities)) {
        if (entity.type === 'object' && entity.objectType === 'Item') {
          existingItemEntities.add(entity.id);
        }
      }
      
      // 收集所有新生成的物品实体（一组物品可能分成多个实体）
      const droppedEntityIds = [];
      const droppedEntities = [];
      
      const entitySpawnHandler = (entity) => {
        // 检查是否是物品实体
        if (entity.type === 'object' && entity.objectType === 'Item') {
          // 检查是否是新实体（不在之前的列表中）
          if (!existingItemEntities.has(entity.id)) {
            // 检查是否在bot附近（刚丢出的物品应该在附近）
            const distance = botPos.distanceTo(entity.position);
            if (distance < 5) {  // 稍微放宽距离，物品可能飞远一点
              droppedEntityIds.push(entity.id);
              droppedEntities.push({
                id: entity.id,
                position: {
                  x: Math.floor(entity.position.x),
                  y: Math.floor(entity.position.y),
                  z: Math.floor(entity.position.z)
                }
              });
            }
          }
        }
      };
      
      // 添加监听器
      this.mcBot.on('entitySpawn', entitySpawnHandler);
      
      // 执行丢弃
      await this.mcBot.toss(item.type, null, actualDropCount);
      
      // 等待一小段时间让所有实体生成事件触发
      // 丢弃大量物品可能需要更长时间
      await new Promise(r => setTimeout(r, 200));
      
      // 移除监听器
      this.mcBot.removeListener('entitySpawn', entitySpawnHandler);
      
      // 如果没捕获到任何实体ID，尝试在附近查找
      if (droppedEntityIds.length === 0) {
        for (const entity of Object.values(this.mcBot.entities)) {
          if (entity.type === 'object' && entity.objectType === 'Item') {
            if (!existingItemEntities.has(entity.id)) {
              const distance = botPos.distanceTo(entity.position);
              if (distance < 5) {
                droppedEntityIds.push(entity.id);
                droppedEntities.push({
                  id: entity.id,
                  position: {
                    x: Math.floor(entity.position.x),
                    y: Math.floor(entity.position.y),
                    z: Math.floor(entity.position.z)
                  }
                });
              }
            }
          }
        }
      }
      
      return {
        success: true,
        message: `Dropped ${actualDropCount} x ${item.name} (${droppedEntityIds.length} entities)`,
        itemName: item.name,
        count: actualDropCount,
        // 保持向后兼容：返回第一个实体ID
        droppedEntityId: droppedEntityIds.length > 0 ? droppedEntityIds[0] : null,
        droppedEntity: droppedEntities.length > 0 ? droppedEntities[0] : null,
        // 新增：返回所有实体ID和信息
        droppedEntityIds: droppedEntityIds,
        droppedEntities: droppedEntities,
        entityCount: droppedEntityIds.length
      };
    } catch (error) {
      return { success: false, message: `Failed to drop item: ${error.message}` };
    }
  }

  /**
   * Eat food to restore hunger
   */
  async eat(foodName = null) {
    // 常见食物列表
    const foodItems = [
      'bread', 'cooked_beef', 'cooked_porkchop', 'cooked_chicken', 'cooked_mutton',
      'cooked_rabbit', 'cooked_cod', 'cooked_salmon', 'baked_potato', 'cookie',
      'pumpkin_pie', 'golden_apple', 'enchanted_golden_apple', 'golden_carrot',
      'apple', 'melon_slice', 'sweet_berries', 'carrot', 'potato', 'beetroot',
      'dried_kelp', 'beef', 'porkchop', 'chicken', 'rabbit', 'mutton', 'cod', 'salmon',
      'tropical_fish', 'rotten_flesh', 'spider_eye', 'chorus_fruit', 'honey_bottle',
      'mushroom_stew', 'rabbit_stew', 'beetroot_soup', 'suspicious_stew'
    ];

    let foodItem = null;

    if (foodName) {
      // 寻找指定的食物
      foodItem = this.mcBot.inventory.items().find(i =>
        i.name === foodName || i.name.includes(foodName)
      );
      if (!foodItem) {
        return { success: false, message: `Food ${foodName} not found in inventory` };
      }
    } else {
      // 自动找任何可吃的食物
      for (const item of this.mcBot.inventory.items()) {
        if (foodItems.includes(item.name)) {
          foodItem = item;
          break;
        }
      }
      if (!foodItem) {
        return { success: false, message: 'No food found in inventory' };
      }
    }

    try {
      // 先装备食物
      await this.mcBot.equip(foodItem, 'hand');
      // 然后消耗它
      await this.mcBot.consume();
      return {
        success: true,
        message: `Ate ${foodItem.name}`,
        food: foodItem.name
      };
    } catch (error) {
      return { success: false, message: `Failed to eat: ${error.message}` };
    }
  }

  /**
   * Use the currently held item
   */
  async useItem() {
    try {
      // 激活使用物品（类似玩家右键持续按住）
      this.mcBot.activateItem();
      
      // 等待一段时间让动作完成
      await new Promise(r => setTimeout(r, 500));
      
      // 停止使用
      this.mcBot.deactivateItem();
      
      const heldItem = this.mcBot.heldItem;
      const itemName = heldItem ? heldItem.name : 'nothing';
      
      return {
        success: true,
        message: `Used item: ${itemName}`,
        item: itemName
      };
    } catch (error) {
      return { success: false, message: `Failed to use item: ${error.message}` };
    }
  }

  /**
   * Activate/interact with a block (right-click)
   */
  async activateBlock(x, y, z) {
    const block = this.mcBot.blockAt(new Vec3(x, y, z));
    
    if (!block) {
      return { success: false, message: `No block at (${x}, ${y}, ${z})` };
    }

    // 检查距离
    const distance = this.mcBot.entity.position.distanceTo(block.position);
    if (distance > 5) {
      return {
        success: false,
        message: `Block at (${x}, ${y}, ${z}) is too far (${distance.toFixed(1)} blocks). Move closer first.`
      };
    }

    try {
      // 先看向方块
      await this.mcBot.lookAt(block.position.offset(0.5, 0.5, 0.5));
      
      // 激活方块（右键交互）
      await this.mcBot.activateBlock(block);
      
      return {
        success: true,
        message: `Activated block ${block.name} at (${x}, ${y}, ${z})`,
        blockName: block.name,
        position: { x, y, z }
      };
    } catch (error) {
      return { success: false, message: `Failed to activate block: ${error.message}` };
    }
  }

  /**
   * Scan entities within range
   */
  async scanEntities(range = 16, entityType = null) {
    const maxRange = Math.min(range, 64);
    const botPos = this.mcBot.entity.position;
    const entities = [];
    
    for (const entity of Object.values(this.mcBot.entities)) {
      if (entity === this.mcBot.entity) continue;
      
      const distance = botPos.distanceTo(entity.position);
      if (distance > maxRange) continue;
      
      // 如果指定了类型，进行过滤
      if (entityType && entity.name !== entityType && entity.type !== entityType) {
        continue;
      }
      
      entities.push({
        name: entity.name || entity.username || 'unknown',
        type: entity.type,
        displayName: entity.displayName || entity.username || entity.name,
        x: Math.floor(entity.position.x),
        y: Math.floor(entity.position.y),
        z: Math.floor(entity.position.z),
        // 添加 position 对象以保持与其他 API 的一致性
        position: {
          x: Math.floor(entity.position.x),
          y: Math.floor(entity.position.y),
          z: Math.floor(entity.position.z)
        },
        distance: Math.round(distance * 10) / 10,
        health: entity.health || null,
        isHostile: ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'phantom'].includes(entity.name),
        isPlayer: entity.type === 'player'
      });
    }
    
    // 按距离排序
    entities.sort((a, b) => a.distance - b.distance);

    // 统计
    const playerCount = entities.filter(e => e.isPlayer).length;
    const hostileCount = entities.filter(e => e.isHostile).length;
    const otherCount = entities.length - playerCount - hostileCount;

    const summary = `Found ${entities.length} entities: ${playerCount} players, ${hostileCount} hostile, ${otherCount} other`;
    
    return {
      success: true,
      message: summary,
      entities: entities,
      stats: {
        total: entities.length,
        players: playerCount,
        hostile: hostileCount,
        other: otherCount
      }
    };
  }

  /**
   * List all online players on the server
   * Uses bot.players which contains all players with their usernames
   */
  async listPlayers() {
    const players = [];
    const botPos = this.mcBot.entity.position;
    
    for (const [username, player] of Object.entries(this.mcBot.players)) {
      // 跳过 bot 自己
      if (username === this.mcBot.username) continue;
      
      const playerInfo = {
        name: username,
        uuid: player.uuid || null,
        ping: player.ping || null,
        gamemode: player.gamemode || null,
      };
      
      // 如果玩家实体在范围内，添加位置信息
      if (player.entity) {
        const distance = botPos.distanceTo(player.entity.position);
        playerInfo.position = {
          x: Math.floor(player.entity.position.x),
          y: Math.floor(player.entity.position.y),
          z: Math.floor(player.entity.position.z)
        };
        playerInfo.distance = Math.round(distance * 10) / 10;
        playerInfo.inRange = true;
      } else {
        playerInfo.inRange = false;
        playerInfo.position = null;
        playerInfo.distance = null;
      }
      
      players.push(playerInfo);
    }
    
    // 按距离排序（在范围内的优先，然后按距离）
    players.sort((a, b) => {
      if (a.inRange && !b.inRange) return -1;
      if (!a.inRange && b.inRange) return 1;
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return 0;
    });
    
    const inRangeCount = players.filter(p => p.inRange).length;
    const playerNames = players.map(p => p.name).join(', ');
    
    return {
      success: true,
      message: `Found ${players.length} online player(s): ${playerNames || 'none'}. ${inRangeCount} in visible range.`,
      players: players,
      totalCount: players.length,
      inRangeCount: inRangeCount,
      botUsername: this.mcBot.username
    };
  }

  /**
   * Check if a coordinate is reachable by pathfinding
   * Returns immediately without actually moving
   */
  async canReach(x, y, z) {
    const goal = new goals.GoalBlock(x, y, z);
    
    return new Promise((resolve) => {
      let resolved = false;
      
      const cleanup = () => {
        this.mcBot.removeListener('path_update', onPathUpdate);
      };
      
      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        this.mcBot.pathfinder.setGoal(null);
        resolve(result);
      };
      
      const onPathUpdate = (results) => {
        if (results.status === 'noPath') {
          finish({
            success: true,
            reachable: false,
            message: `Position (${x}, ${y}, ${z}) is NOT reachable - no path exists`,
            reason: 'noPath'
          });
        } else if (results.status === 'success' || results.path) {
          // 找到路径了
          const pathLength = results.path ? results.path.length : 0;
          const distance = this.mcBot.entity.position.distanceTo(new Vec3(x, y, z));
          finish({
            success: true,
            reachable: true,
            message: `Position (${x}, ${y}, ${z}) is reachable`,
            pathLength: pathLength,
            directDistance: Math.round(distance * 10) / 10
          });
        } else if (results.status === 'timeout') {
          finish({
            success: true,
            reachable: false,
            message: `Cannot determine if (${x}, ${y}, ${z}) is reachable - path calculation timeout`,
            reason: 'timeout'
          });
        }
      };
      
      this.mcBot.on('path_update', onPathUpdate);
      
      // 开始路径计算
      this.mcBot.pathfinder.setGoal(goal);
      
      // 3秒超时（只是检查，不需要太久）
      setTimeout(() => {
        if (resolved) return;
        // 如果3秒内没有收到path_update，可能路径计算中
        const distance = this.mcBot.entity.position.distanceTo(new Vec3(x, y, z));
        if (distance < 2) {
          finish({
            success: true,
            reachable: true,
            message: `Already at position (${x}, ${y}, ${z})`,
            pathLength: 0,
            directDistance: Math.round(distance * 10) / 10
          });
        } else {
          finish({
            success: true,
            reachable: null,  // 未知
            message: `Path calculation still in progress for (${x}, ${y}, ${z})`,
            reason: 'timeout',
            directDistance: Math.round(distance * 10) / 10
          });
        }
      }, 3000);
    });
  }

  /**
   * Calculate and return the path to a coordinate without moving
   */
  async getPathTo(x, y, z) {
    const goal = new goals.GoalBlock(x, y, z);
    
    return new Promise((resolve) => {
      let resolved = false;
      
      const cleanup = () => {
        this.mcBot.removeListener('path_update', onPathUpdate);
      };
      
      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        this.mcBot.pathfinder.setGoal(null);
        resolve(result);
      };
      
      const onPathUpdate = (results) => {
        if (results.status === 'noPath') {
          finish({
            success: true,
            found: false,
            message: `No path found to (${x}, ${y}, ${z})`,
            reason: 'noPath'
          });
        } else if (results.path && results.path.length > 0) {
          // 转换路径为简单坐标数组
          const pathPoints = results.path.map(node => ({
            x: Math.floor(node.x),
            y: Math.floor(node.y),
            z: Math.floor(node.z)
          }));
          
          const distance = this.mcBot.entity.position.distanceTo(new Vec3(x, y, z));
          
          finish({
            success: true,
            found: true,
            message: `Found path to (${x}, ${y}, ${z}) with ${pathPoints.length} waypoints`,
            pathLength: pathPoints.length,
            directDistance: Math.round(distance * 10) / 10,
            path: pathPoints,
            // 只返回关键点（每隔几个点取一个，避免数据太多）
            keyPoints: pathPoints.filter((_, i) => i % 5 === 0 || i === pathPoints.length - 1)
          });
        } else if (results.status === 'timeout') {
          finish({
            success: true,
            found: false,
            message: `Path calculation timeout for (${x}, ${y}, ${z})`,
            reason: 'timeout'
          });
        }
      };
      
      this.mcBot.on('path_update', onPathUpdate);
      
      // 开始路径计算
      this.mcBot.pathfinder.setGoal(goal);
      
      // 5秒超时
      setTimeout(() => {
        finish({
          success: true,
          found: false,
          message: `Path calculation timeout for (${x}, ${y}, ${z})`,
          reason: 'timeout'
        });
      }, 5000);
    });
  }

  // ===== 合成相关动作实现 =====

  /**
   * Craft an item
   * @param {string} itemName - Name of item to craft
   * @param {number} count - Number to craft (default: 1)
   */
  async craft(itemName, count = 1) {
    const mcData = minecraftData(this.mcBot.version);
    
    // 查找物品
    const item = mcData.itemsByName[itemName];
    if (!item) {
      return { success: false, message: `Unknown item: ${itemName}` };
    }

    // 查找工作台
    const craftingTable = this.mcBot.findBlock({
      matching: mcData.blocksByName['crafting_table']?.id,
      maxDistance: 32
    });

    // 获取配方
    const recipes = this.mcBot.recipesFor(item.id, null, 1, craftingTable);
    
    if (!recipes || recipes.length === 0) {
      // 尝试不使用工作台的配方（2x2合成）
      const simpleRecipes = this.mcBot.recipesFor(item.id, null, 1, null);
      if (!simpleRecipes || simpleRecipes.length === 0) {
        return {
          success: false,
          message: `No recipe found for ${itemName}. You may need a crafting table nearby or different materials.`
        };
      }
      
      // 使用简单配方
      try {
        await this.mcBot.craft(simpleRecipes[0], count, null);
        return {
          success: true,
          message: `Crafted ${count} x ${itemName} (using inventory crafting)`
        };
      } catch (error) {
        return { success: false, message: `Failed to craft: ${error.message}` };
      }
    }

    // 需要工作台，检查距离并走近
    if (craftingTable) {
      const distance = this.mcBot.entity.position.distanceTo(craftingTable.position);
      if (distance > 4) {
        // 走到工作台附近
        const goal = new goals.GoalNear(
          craftingTable.position.x,
          craftingTable.position.y,
          craftingTable.position.z,
          3
        );
        
        try {
          await new Promise((resolve, reject) => {
            let resolved = false;
            const timeout = setTimeout(() => {
              if (!resolved) {
                resolved = true;
                this.mcBot.pathfinder.setGoal(null);
                reject(new Error('Timeout walking to crafting table'));
              }
            }, 30000);
            
            const onGoalReached = () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                this.mcBot.removeListener('goal_reached', onGoalReached);
                resolve();
              }
            };
            
            this.mcBot.on('goal_reached', onGoalReached);
            this.mcBot.pathfinder.setGoal(goal);
          });
        } catch (error) {
          return { success: false, message: `Failed to reach crafting table: ${error.message}` };
        }
      }
    }

    try {
      await this.mcBot.craft(recipes[0], count, craftingTable);
      return {
        success: true,
        message: `Crafted ${count} x ${itemName}`,
        usedCraftingTable: !!craftingTable
      };
    } catch (error) {
      return { success: false, message: `Failed to craft: ${error.message}` };
    }
  }

  /**
   * List recipes for an item
   * @param {string} itemName - Name of item to get recipes for
   */
  async listRecipes(itemName) {
    const mcData = minecraftData(this.mcBot.version);
    
    const item = mcData.itemsByName[itemName];
    if (!item) {
      return { success: false, message: `Unknown item: ${itemName}` };
    }

    // 查找工作台
    const craftingTable = this.mcBot.findBlock({
      matching: mcData.blocksByName['crafting_table']?.id,
      maxDistance: 32
    });

    // 获取所有配方
    const recipesWithTable = this.mcBot.recipesFor(item.id, null, 1, craftingTable);
    const recipesWithoutTable = this.mcBot.recipesFor(item.id, null, 1, null);

    const recipes = [];
    
    // 处理配方
    const processRecipes = (recipeList, needsTable) => {
      for (const recipe of recipeList || []) {
        const ingredients = {};
        
        // 获取原料信息
        if (recipe.delta) {
          for (const delta of recipe.delta) {
            if (delta.count < 0) {
              // 负数表示消耗的原料
              const ingredientItem = mcData.items[delta.id];
              if (ingredientItem) {
                ingredients[ingredientItem.name] = (ingredients[ingredientItem.name] || 0) + Math.abs(delta.count);
              }
            }
          }
        }
        
        recipes.push({
          needsCraftingTable: needsTable,
          ingredients: ingredients,
          result: {
            name: itemName,
            count: recipe.result?.count || 1
          }
        });
      }
    };

    processRecipes(recipesWithoutTable, false);
    processRecipes(recipesWithTable, true);

    if (recipes.length === 0) {
      return {
        success: true,
        message: `No recipes found for ${itemName}`,
        recipes: [],
        hasCraftingTable: !!craftingTable
      };
    }

    // 生成可读消息
    const recipeDesc = recipes.map((r, i) => {
      const ingList = Object.entries(r.ingredients)
        .map(([name, count]) => `${count}x ${name}`)
        .join(', ');
      return `Recipe ${i+1}: ${ingList} -> ${r.result.count}x ${itemName}${r.needsCraftingTable ? ' (needs crafting table)' : ''}`;
    }).join('; ');

    return {
      success: true,
      message: `Found ${recipes.length} recipe(s) for ${itemName}: ${recipeDesc}`,
      recipes: recipes,
      hasCraftingTable: !!craftingTable
    };
  }

  /**
   * Smelt items in a furnace
   * @param {string} itemName - Item to smelt
   * @param {string} fuelName - Fuel to use (optional)
   * @param {number} count - Number to smelt (default: 1)
   */
  async smelt(itemName, fuelName = null, count = 1) {
    const mcData = minecraftData(this.mcBot.version);

    // 查找熔炉
    const furnaceBlock = this.mcBot.findBlock({
      matching: [
        mcData.blocksByName['furnace']?.id,
        mcData.blocksByName['blast_furnace']?.id,
        mcData.blocksByName['smoker']?.id
      ].filter(Boolean),
      maxDistance: 32
    });

    if (!furnaceBlock) {
      return { success: false, message: 'No furnace found nearby' };
    }

    // 走到熔炉附近
    const distance = this.mcBot.entity.position.distanceTo(furnaceBlock.position);
    if (distance > 4) {
      const goal = new goals.GoalNear(
        furnaceBlock.position.x,
        furnaceBlock.position.y,
        furnaceBlock.position.z,
        3
      );
      
      try {
        await new Promise((resolve, reject) => {
          let resolved = false;
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              this.mcBot.pathfinder.setGoal(null);
              reject(new Error('Timeout walking to furnace'));
            }
          }, 30000);
          
          this.mcBot.once('goal_reached', () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve();
            }
          });
          
          this.mcBot.pathfinder.setGoal(goal);
        });
      } catch (error) {
        return { success: false, message: `Failed to reach furnace: ${error.message}` };
      }
    }

    // 打开熔炉
    const furnace = await this.mcBot.openFurnace(furnaceBlock);
    
    try {
      // 查找要烧制的物品
      const itemToSmelt = this.mcBot.inventory.items().find(i =>
        i.name === itemName || i.name.includes(itemName)
      );
      
      if (!itemToSmelt) {
        furnace.close();
        return { success: false, message: `Item ${itemName} not found in inventory` };
      }

      // 查找燃料
      const fuelItems = ['coal', 'charcoal', 'coal_block', 'lava_bucket',
                         'blaze_rod', 'dried_kelp_block', 'bamboo',
                         'oak_planks', 'birch_planks', 'spruce_planks',
                         'jungle_planks', 'acacia_planks', 'dark_oak_planks',
                         'stick', 'wooden_pickaxe', 'wooden_sword', 'wooden_axe'];
      
      let fuel = null;
      if (fuelName) {
        fuel = this.mcBot.inventory.items().find(i =>
          i.name === fuelName || i.name.includes(fuelName)
        );
      } else {
        for (const item of this.mcBot.inventory.items()) {
          if (fuelItems.includes(item.name)) {
            fuel = item;
            break;
          }
        }
      }

      if (!fuel) {
        furnace.close();
        return { success: false, message: 'No fuel found in inventory' };
      }

      // 放入燃料
      await furnace.putFuel(fuel.type, null, Math.min(fuel.count, Math.ceil(count / 8)));
      
      // 放入物品
      const smeltCount = Math.min(itemToSmelt.count, count);
      await furnace.putInput(itemToSmelt.type, null, smeltCount);

      // 等待烧制完成（每个物品约10秒）
      const waitTime = smeltCount * 10 * 1000 + 2000;
      await new Promise(r => setTimeout(r, Math.min(waitTime, 120000)));

      // 取出结果
      const output = furnace.outputItem();
      if (output) {
        await furnace.takeOutput();
      }

      furnace.close();
      
      return {
        success: true,
        message: `Smelting started for ${smeltCount} x ${itemName}`,
        smelted: smeltCount,
        furnaceType: furnaceBlock.name
      };
    } catch (error) {
      try { furnace.close(); } catch (e) {}
      return { success: false, message: `Failed to smelt: ${error.message}` };
    }
  }

  /**
   * Open a container at coordinates
   */
  async openContainer(x, y, z) {
    const block = this.mcBot.blockAt(new Vec3(x, y, z));
    
    if (!block) {
      return { success: false, message: `No block at (${x}, ${y}, ${z})` };
    }

    // 检查是否是容器
    const containerTypes = ['chest', 'trapped_chest', 'barrel', 'shulker_box',
                           'ender_chest', 'hopper', 'dispenser', 'dropper'];
    const isContainer = containerTypes.some(type => block.name.includes(type));
    
    if (!isContainer) {
      return { success: false, message: `Block ${block.name} is not a container` };
    }

    // 检查距离
    const distance = this.mcBot.entity.position.distanceTo(block.position);
    if (distance > 4) {
      // 走近
      const goal = new goals.GoalNear(x, y, z, 3);
      try {
        await new Promise((resolve, reject) => {
          let resolved = false;
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              this.mcBot.pathfinder.setGoal(null);
              reject(new Error('Timeout'));
            }
          }, 30000);
          
          this.mcBot.once('goal_reached', () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve();
            }
          });
          
          this.mcBot.pathfinder.setGoal(goal);
        });
      } catch (error) {
        return { success: false, message: `Failed to reach container: ${error.message}` };
      }
    }

    try {
      const container = await this.mcBot.openContainer(block);
      this.currentContainer = container;
      
      // 列出容器内容
      const items = container.containerItems();
      const itemList = items.map(i => ({
        name: i.name,
        count: i.count,
        slot: i.slot
      }));
      
      const itemsText = items.length > 0
        ? items.map(i => `${i.name} x${i.count}`).join(', ')
        : 'empty';

      return {
        success: true,
        message: `Opened ${block.name} with ${items.length} item types: ${itemsText}`,
        containerType: block.name,
        items: itemList,
        position: { x, y, z }
      };
    } catch (error) {
      return { success: false, message: `Failed to open container: ${error.message}` };
    }
  }

  /**
   * Close current container
   */
  async closeContainer() {
    if (!this.currentContainer) {
      return { success: false, message: 'No container is open' };
    }

    try {
      this.currentContainer.close();
      this.currentContainer = null;
      return { success: true, message: 'Container closed' };
    } catch (error) {
      return { success: false, message: `Failed to close container: ${error.message}` };
    }
  }

  /**
   * Deposit items into open container
   */
  async depositItem(itemName, count = null) {
    if (!this.currentContainer) {
      return { success: false, message: 'No container is open' };
    }

    const item = this.mcBot.inventory.items().find(i =>
      i.name === itemName || i.name.includes(itemName)
    );

    if (!item) {
      return { success: false, message: `Item ${itemName} not found in inventory` };
    }

    try {
      const depositCount = count || item.count;
      await this.currentContainer.deposit(item.type, null, Math.min(depositCount, item.count));
      return {
        success: true,
        message: `Deposited ${Math.min(depositCount, item.count)} x ${item.name}`
      };
    } catch (error) {
      return { success: false, message: `Failed to deposit: ${error.message}` };
    }
  }

  /**
   * Withdraw items from open container
   */
  async withdrawItem(itemName, count = null) {
    if (!this.currentContainer) {
      return { success: false, message: 'No container is open' };
    }

    const items = this.currentContainer.containerItems();
    const item = items.find(i =>
      i.name === itemName || i.name.includes(itemName)
    );

    if (!item) {
      return { success: false, message: `Item ${itemName} not found in container` };
    }

    try {
      const withdrawCount = count || item.count;
      await this.currentContainer.withdraw(item.type, null, Math.min(withdrawCount, item.count));
      return {
        success: true,
        message: `Withdrew ${Math.min(withdrawCount, item.count)} x ${item.name}`
      };
    } catch (error) {
      return { success: false, message: `Failed to withdraw: ${error.message}` };
    }
  }

  /**
   * Find nearest crafting table
   */
  async findCraftingTable(maxDistance = 32) {
    const mcData = minecraftData(this.mcBot.version);
    
    const block = this.mcBot.findBlock({
      matching: mcData.blocksByName['crafting_table']?.id,
      maxDistance: Math.min(maxDistance, 64)
    });

    if (!block) {
      return {
        success: true,
        found: false,
        message: `No crafting table found within ${maxDistance} blocks`
      };
    }

    const distance = this.mcBot.entity.position.distanceTo(block.position);
    return {
      success: true,
      found: true,
      message: `Found crafting table at (${block.position.x}, ${block.position.y}, ${block.position.z})`,
      position: {
        x: block.position.x,
        y: block.position.y,
        z: block.position.z
      },
      distance: Math.round(distance * 10) / 10
    };
  }

  /**
   * Find nearest furnace
   */
  async findFurnace(maxDistance = 32) {
    const mcData = minecraftData(this.mcBot.version);
    
    const block = this.mcBot.findBlock({
      matching: [
        mcData.blocksByName['furnace']?.id,
        mcData.blocksByName['blast_furnace']?.id,
        mcData.blocksByName['smoker']?.id
      ].filter(Boolean),
      maxDistance: Math.min(maxDistance, 64)
    });

    if (!block) {
      return {
        success: true,
        found: false,
        message: `No furnace found within ${maxDistance} blocks`
      };
    }

    const distance = this.mcBot.entity.position.distanceTo(block.position);
    return {
      success: true,
      found: true,
      message: `Found ${block.name} at (${block.position.x}, ${block.position.y}, ${block.position.z})`,
      furnaceType: block.name,
      position: {
        x: block.position.x,
        y: block.position.y,
        z: block.position.z
      },
      distance: Math.round(distance * 10) / 10
    };
  }

  /**
   * Find nearest chest or barrel
   */
  async findChest(maxDistance = 32) {
    const mcData = minecraftData(this.mcBot.version);
    
    const block = this.mcBot.findBlock({
      matching: [
        mcData.blocksByName['chest']?.id,
        mcData.blocksByName['trapped_chest']?.id,
        mcData.blocksByName['barrel']?.id
      ].filter(Boolean),
      maxDistance: Math.min(maxDistance, 64)
    });

    if (!block) {
      return {
        success: true,
        found: false,
        message: `No chest/barrel found within ${maxDistance} blocks`
      };
    }

    const distance = this.mcBot.entity.position.distanceTo(block.position);
    return {
      success: true,
      found: true,
      message: `Found ${block.name} at (${block.position.x}, ${block.position.y}, ${block.position.z})`,
      containerType: block.name,
      position: {
        x: block.position.x,
        y: block.position.y,
        z: block.position.z
      },
      distance: Math.round(distance * 10) / 10
    };
  }

  // ===== 实体交互动作实现 =====

  /**
   * Mount/ride an entity (horse, boat, minecart, pig, etc.)
   * @param {string} entityType - Optional: specific entity type to mount
   */
  async mountEntity(entityType = null) {
    // 可骑乘的实体类型
    const mountableTypes = [
      'horse', 'donkey', 'mule', 'skeleton_horse', 'zombie_horse',
      'pig', 'strider', 'camel', 'llama', 'trader_llama',
      'boat', 'chest_boat', 'minecart', 'chest_minecart', 'hopper_minecart',
      'oak_boat', 'spruce_boat', 'birch_boat', 'jungle_boat', 'acacia_boat',
      'dark_oak_boat', 'mangrove_boat', 'cherry_boat', 'bamboo_raft'
    ];

    const botPos = this.mcBot.entity.position;
    let targetEntity = null;
    let closestDistance = Infinity;

    // 查找可骑乘的实体
    for (const entity of Object.values(this.mcBot.entities)) {
      if (entity === this.mcBot.entity) continue;
      
      const entityName = entity.name || entity.displayName || '';
      const distance = botPos.distanceTo(entity.position);
      
      // 距离太远无法骑乘
      if (distance > 5) continue;
      
      // 如果指定了类型，检查是否匹配
      if (entityType) {
        if (entityName.toLowerCase().includes(entityType.toLowerCase())) {
          if (distance < closestDistance) {
            targetEntity = entity;
            closestDistance = distance;
          }
        }
      } else {
        // 没有指定类型，查找任何可骑乘的实体
        const isMountable = mountableTypes.some(type =>
          entityName.toLowerCase().includes(type.toLowerCase())
        );
        if (isMountable && distance < closestDistance) {
          targetEntity = entity;
          closestDistance = distance;
        }
      }
    }

    if (!targetEntity) {
      const typeMsg = entityType ? `${entityType}` : 'mountable entity';
      return {
        success: false,
        message: `No ${typeMsg} found nearby. Make sure you are within 5 blocks of the entity.`
      };
    }

    try {
      // 先看向实体
      await this.mcBot.lookAt(targetEntity.position.offset(0, 1, 0));
      
      // 骑乘实体
      await this.mcBot.mount(targetEntity);
      
      return {
        success: true,
        message: `Mounted ${targetEntity.name || 'entity'}`,
        entityName: targetEntity.name,
        entityId: targetEntity.id
      };
    } catch (error) {
      return { success: false, message: `Failed to mount: ${error.message}` };
    }
  }

  /**
   * Dismount from current vehicle/mount
   */
  async dismount() {
    const vehicle = this.mcBot.vehicle;
    
    if (!vehicle) {
      return { success: false, message: 'Not currently mounted on anything' };
    }

    try {
      await this.mcBot.dismount();
      return {
        success: true,
        message: `Dismounted from ${vehicle.name || 'entity'}`,
        entityName: vehicle.name
      };
    } catch (error) {
      return { success: false, message: `Failed to dismount: ${error.message}` };
    }
  }

  /**
   * Right-click/interact with an entity
   * @param {string} entityType - Type of entity to interact with
   * @param {string} hand - Which hand to use ('hand' or 'off-hand')
   */
  async useOnEntity(entityType, hand = 'hand') {
    const botPos = this.mcBot.entity.position;
    let targetEntity = null;
    let closestDistance = Infinity;

    // 查找目标实体
    for (const entity of Object.values(this.mcBot.entities)) {
      if (entity === this.mcBot.entity) continue;
      
      const entityName = entity.name || entity.displayName || '';
      const distance = botPos.distanceTo(entity.position);
      
      if (distance > 5) continue;
      
      if (entityName.toLowerCase().includes(entityType.toLowerCase())) {
        if (distance < closestDistance) {
          targetEntity = entity;
          closestDistance = distance;
        }
      }
    }

    if (!targetEntity) {
      return {
        success: false,
        message: `No ${entityType} found nearby (within 5 blocks)`
      };
    }

    try {
      // 先看向实体
      await this.mcBot.lookAt(targetEntity.position.offset(0, 1, 0));
      
      // 对实体使用（右键）
      // mineflayer 中使用 useOn 方法
      await this.mcBot.useOn(targetEntity);
      
      return {
        success: true,
        message: `Interacted with ${targetEntity.name || entityType}`,
        entityName: targetEntity.name,
        entityType: targetEntity.type,
        position: {
          x: Math.floor(targetEntity.position.x),
          y: Math.floor(targetEntity.position.y),
          z: Math.floor(targetEntity.position.z)
        }
      };
    } catch (error) {
      return { success: false, message: `Failed to interact with entity: ${error.message}` };
    }
  }

  // ===== 数据查询动作实现 =====

  /**
   * Get recipe data from minecraft-data for a specific item
   * Returns detailed recipe information including ingredients and crafting requirements
   * @param {string} itemName - Name of item to get recipe for
   */
  async getRecipeData(itemName) {
    const mcData = minecraftData(this.mcBot.version);
    
    // 查找物品
    const item = mcData.itemsByName[itemName];
    if (!item) {
      return { success: false, message: `Unknown item: ${itemName}` };
    }

    // 获取 minecraft-data 中的配方
    const recipes = mcData.recipes[item.id];
    
    if (!recipes || recipes.length === 0) {
      return {
        success: true,
        found: false,
        message: `No recipe found in minecraft-data for ${itemName}`,
        itemId: item.id,
        itemName: itemName
      };
    }

    // 解析配方信息
    const parsedRecipes = recipes.map((recipe, index) => {
      const parsed = {
        index: index,
        resultCount: recipe.result?.count || 1,
        needsCraftingTable: false,  // 默认假设不需要
        ingredients: {},
        inShape: null,
        outShape: null
      };

      // 处理有形配方 (shaped)
      if (recipe.inShape) {
        parsed.inShape = recipe.inShape;
        parsed.needsCraftingTable = recipe.inShape.length > 2 ||
                                    (recipe.inShape[0] && recipe.inShape[0].length > 2);
        
        // 统计材料
        for (const row of recipe.inShape) {
          if (!row) continue;
          for (const cell of row) {
            if (cell !== null && cell !== undefined) {
              const ingredientId = typeof cell === 'object' ? cell.id : cell;
              const ingredientItem = mcData.items[ingredientId];
              if (ingredientItem) {
                parsed.ingredients[ingredientItem.name] =
                  (parsed.ingredients[ingredientItem.name] || 0) + 1;
              }
            }
          }
        }
      }

      // 处理无形配方 (shapeless)
      if (recipe.ingredients) {
        for (const ing of recipe.ingredients) {
          if (ing !== null && ing !== undefined) {
            const ingredientId = typeof ing === 'object' ? ing.id : ing;
            const ingredientItem = mcData.items[ingredientId];
            if (ingredientItem) {
              parsed.ingredients[ingredientItem.name] =
                (parsed.ingredients[ingredientItem.name] || 0) + 1;
            }
          }
        }
        // 如果材料超过4个，需要工作台
        const totalIngredients = Object.values(parsed.ingredients).reduce((a, b) => a + b, 0);
        if (totalIngredients > 4) {
          parsed.needsCraftingTable = true;
        }
      }

      return parsed;
    });

    // 生成可读描述
    const recipeDescs = parsedRecipes.map((r, i) => {
      const ingList = Object.entries(r.ingredients)
        .map(([name, count]) => `${count}x ${name}`)
        .join(' + ');
      const tableNote = r.needsCraftingTable ? ' (需要工作台)' : ' (2x2合成)';
      return `配方${i+1}: ${ingList} -> ${r.resultCount}x ${itemName}${tableNote}`;
    });

    return {
      success: true,
      found: true,
      message: `Found ${recipes.length} recipe(s) for ${itemName}: ${recipeDescs.join('; ')}`,
      itemId: item.id,
      itemName: itemName,
      recipeCount: recipes.length,
      recipes: parsedRecipes,
      rawRecipes: recipes  // 原始配方数据
    };
  }

  /**
   * Get all recipes from minecraft-data
   * Returns a comprehensive list of all craftable items and their recipes
   * Useful for building a recipe cache on the Python side
   */
  async getAllRecipes() {
    const mcData = minecraftData(this.mcBot.version);
    const allRecipes = {};
    let totalRecipeCount = 0;

    // 遍历所有配方
    for (const [itemIdStr, recipes] of Object.entries(mcData.recipes)) {
      const itemId = parseInt(itemIdStr);
      const item = mcData.items[itemId];
      
      if (!item || !recipes || recipes.length === 0) continue;

      const parsedRecipes = recipes.map(recipe => {
        const parsed = {
          resultCount: recipe.result?.count || 1,
          needsCraftingTable: false,
          ingredients: {}
        };

        // 处理有形配方
        if (recipe.inShape) {
          parsed.needsCraftingTable = recipe.inShape.length > 2 ||
                                      (recipe.inShape[0] && recipe.inShape[0].length > 2);
          
          for (const row of recipe.inShape) {
            if (!row) continue;
            for (const cell of row) {
              if (cell !== null && cell !== undefined) {
                const ingredientId = typeof cell === 'object' ? cell.id : cell;
                const ingredientItem = mcData.items[ingredientId];
                if (ingredientItem) {
                  parsed.ingredients[ingredientItem.name] =
                    (parsed.ingredients[ingredientItem.name] || 0) + 1;
                }
              }
            }
          }
        }

        // 处理无形配方
        if (recipe.ingredients) {
          for (const ing of recipe.ingredients) {
            if (ing !== null && ing !== undefined) {
              const ingredientId = typeof ing === 'object' ? ing.id : ing;
              const ingredientItem = mcData.items[ingredientId];
              if (ingredientItem) {
                parsed.ingredients[ingredientItem.name] =
                  (parsed.ingredients[ingredientItem.name] || 0) + 1;
              }
            }
          }
          const totalIngredients = Object.values(parsed.ingredients).reduce((a, b) => a + b, 0);
          if (totalIngredients > 4) {
            parsed.needsCraftingTable = true;
          }
        }

        return parsed;
      });

      allRecipes[item.name] = {
        itemId: itemId,
        recipes: parsedRecipes
      };
      totalRecipeCount += recipes.length;
    }

    // 返回配方统计
    const craftableItems = Object.keys(allRecipes);
    
    return {
      success: true,
      message: `Retrieved ${totalRecipeCount} recipes for ${craftableItems.length} items`,
      totalRecipes: totalRecipeCount,
      totalItems: craftableItems.length,
      version: this.mcBot.version,
      recipes: allRecipes,
      // 仅返回可合成物品列表（配方数据太大时可以只返回这个）
      craftableItems: craftableItems
    };
  }
}

export default Actions;