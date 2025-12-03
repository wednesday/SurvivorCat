import Phaser from 'phaser';

// 地图物品配置接口
export interface DecorationConfig {
  frame: number;          // 帧索引
  name: string;          // 名称（用于标识）
  scale: number;         // 大小缩放（1.0 为原始大小）
  collides: boolean;     // 是否可碰撞（true=不可通过, false=可通过）
  count: number;         // 生成数量
  alpha?: number;        // 透明度（可选，默认0.8）
}

// 默认装饰物配置
export const DEFAULT_DECORATION_CONFIGS: DecorationConfig[] = [
  // 第1行：草1(0)/草2(1)/花1(2)/花团1(3)/花团2(4) - 小型装饰，可通过
  { frame: 0, name: '草1', scale: 2.0, collides: false, count: 2, alpha: 0.8 },
  { frame: 1, name: '草2', scale: 2.0, collides: false, count: 2, alpha: 0.8 },
  { frame: 2, name: '花1', scale: 2.0, collides: false, count: 1, alpha: 0.8 },
  { frame: 3, name: '花团1', scale: 2.4, collides: false, count: 1, alpha: 0.85 },
  { frame: 4, name: '花团2', scale: 2.4, collides: false, count: 1, alpha: 0.85 },
  
  // 第2行：树桩1(5)/树桩2(6)/石头1(7)/灌木1(8)/草堆1(9) - 中大型障碍物
  { frame: 5, name: '树桩1', scale: 3.0, collides: true, count: 1 },
  { frame: 6, name: '树桩2', scale: 3.0, collides: true, count: 1 },
  { frame: 7, name: '石头1', scale: 2.6, collides: true, count: 1 },
  { frame: 8, name: '灌木1', scale: 2.4, collides: true, count: 1 },
  { frame: 9, name: '草堆1', scale: 2.0, collides: false, count: 2, alpha: 0.8 },
  
  // 第3行：石头2(10)/木桩3(11)/花2(12)/花3(13)/花4(14)
  { frame: 10, name: '石头2', scale: 2.8, collides: true, count: 1 },
  { frame: 11, name: '木桩3', scale: 3.2, collides: true, count: 1 },
  { frame: 12, name: '花2', scale: 2.0, collides: false, count: 1, alpha: 0.8 },
  { frame: 13, name: '花3', scale: 2.0, collides: false, count: 1, alpha: 0.8 },
  { frame: 14, name: '花4', scale: 2.0, collides: false, count: 1, alpha: 0.85 },
];

export class MapManager {
  private scene: Phaser.Scene;
  private decorations: Phaser.GameObjects.Sprite[] = [];
  private decorationConfigs: DecorationConfig[];
  private obstaclesGroup?: Phaser.Physics.Arcade.StaticGroup;
  private tileSize = 16;
  private chunkSize = 16; // 减小chunk大小提升性能：16x16 tiles
  private loadedChunks: Map<string, Phaser.Tilemaps.Tilemap> = new Map(); // 存储tilemap
  private loadedLayers: Map<string, Phaser.Tilemaps.TilemapLayer> = new Map(); // 存储layer
  private decorationChunks: Map<string, Phaser.GameObjects.Sprite[]> = new Map();
  private lastPlayerChunkX = 0;
  private lastPlayerChunkY = 0;
  private renderDistance = 3; // 渲染距离（chunk单位）
  private tiles = [7, 7, 7, 6, 6, 6, 0, 0, 0, 1, 1, 2, 3, 4, 5]; // 权重瓦片索引

  constructor(
    scene: Phaser.Scene,
    configs?: DecorationConfig[]
  ) {
    this.scene = scene;
    this.decorationConfigs = configs || DEFAULT_DECORATION_CONFIGS;
    
    // 创建静态物理组用于障碍物碰撞
    this.obstaclesGroup = this.scene.physics.add.staticGroup();
  }
  
  // 每个chunk使用muddy-ground.png作为TileSprite，不需要选择帧
  // muddy-ground.png会自动平铺填充整个chunk区域
  
  // 更新地图（根据玩家位置）
  update(playerX: number, playerY: number): void {
    const chunkX = Math.floor(playerX / (this.chunkSize * this.tileSize));
    const chunkY = Math.floor(playerY / (this.chunkSize * this.tileSize));
    
    // 如果玩家移动到新的chunk，更新地图
    if (chunkX !== this.lastPlayerChunkX || chunkY !== this.lastPlayerChunkY) {
      this.lastPlayerChunkX = chunkX;
      this.lastPlayerChunkY = chunkY;
      this.updateChunks(chunkX, chunkY);
    }
  }
  
  // 更新周围的chunks
  private updateChunks(centerChunkX: number, centerChunkY: number): void {
    const newChunks = new Set<string>();
    
    // 加载周围的chunks
    for (let dy = -this.renderDistance; dy <= this.renderDistance; dy++) {
      for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
        const chunkX = centerChunkX + dx;
        const chunkY = centerChunkY + dy;
        const chunkKey = `${chunkX},${chunkY}`;
        
        newChunks.add(chunkKey);
        
        // 如果这个chunk还没加载，加载它
        if (!this.loadedChunks.has(chunkKey)) {
          this.loadChunk(chunkX, chunkY);
        }
      }
    }
    
    // 卸载远离的chunks
    const chunksToUnload: string[] = [];
    this.loadedChunks.forEach((_, chunkKey) => {
      if (!newChunks.has(chunkKey)) {
        chunksToUnload.push(chunkKey);
      }
    });
    
    chunksToUnload.forEach(chunkKey => {
      this.unloadChunk(chunkKey);
    });
  }
  
  // 加载一个chunk（使用tilemap系统和权重随机）
  private loadChunk(chunkX: number, chunkY: number): void {
    const chunkKey = `${chunkX},${chunkY}`;
    const chunkWorldX = chunkX * this.chunkSize * this.tileSize;
    const chunkWorldY = chunkY * this.chunkSize * this.tileSize;
    
    // 生成chunk的地图数据（使用权重随机）
    const mapData = [];
    for (let y = 0; y < this.chunkSize; y++) {
      const row = [];
      for (let x = 0; x < this.chunkSize; x++) {
        // 使用chunk坐标和tile坐标生成一致的随机数（确保相同chunk总是生成相同地形）
        const seed = (chunkX * this.chunkSize + x) * 73856093 ^ (chunkY * this.chunkSize + y) * 19349663;
        const random = Math.abs(Math.sin(seed) * 43758.5453) % 1;
        
        // 使用权重选择tile（模拟Phaser.Math.RND.weightedPick）
        const tileIndex = this.tiles[Math.floor(random * this.tiles.length)];
        row.push(tileIndex);
      }
      mapData.push(row);
    }
    
    // 创建tilemap
    const tilemap = this.scene.make.tilemap({
      data: mapData,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize
    });
    
    // 添加tileset
    const tileset = tilemap.addTilesetImage('tiles');
    
    // 创建layer
    const layer = tilemap.createLayer(0, tileset!, chunkWorldX, chunkWorldY);
    if (layer) {
      layer.setDepth(-2);
    }
    
    // 存储tilemap和layer
    this.loadedChunks.set(chunkKey, tilemap);
    this.loadedLayers.set(chunkKey, layer!);
    
    // 生成装饰物
    this.generateChunkDecorations(chunkX, chunkY);
  }
  
  // 卸载一个chunk
  private unloadChunk(chunkKey: string): void {
    // 销毁chunk的layer
    const layer = this.loadedLayers.get(chunkKey);
    if (layer) {
      layer.destroy();
      this.loadedLayers.delete(chunkKey);
    }
    
    // 销毁chunk的tilemap
    const tilemap = this.loadedChunks.get(chunkKey);
    if (tilemap) {
      tilemap.destroy();
      this.loadedChunks.delete(chunkKey);
    }
    
    // 销毁chunk的装饰物
    const sprites = this.decorationChunks.get(chunkKey);
    if (sprites) {
      sprites.forEach(sprite => {
        if (sprite.body) {
          this.obstaclesGroup?.remove(sprite);
        }
        sprite.destroy();
      });
      this.decorationChunks.delete(chunkKey);
    }
  }
  
  // 为chunk生成装饰物
  private generateChunkDecorations(chunkX: number, chunkY: number): void {
    const chunkKey = `${chunkX},${chunkY}`;
    const chunkWorldX = chunkX * this.chunkSize * this.tileSize;
    const chunkWorldY = chunkY * this.chunkSize * this.tileSize;
    const chunkSize = this.chunkSize * this.tileSize;
    
    // 每个chunk生成几个装饰物 (进一步减少数量，30%概率生成)
    // 使用概率控制，让大部分chunk没有装饰物
    const seed0 = chunkX * 73856093 ^ chunkY * 19349663;
    const shouldGenerate = Math.abs(Math.sin(seed0) * 43758.5453) % 1;
    
    // 只有30%的chunk会生成装饰物
    if (shouldGenerate > 0.3) {
      return;
    }
    
    const decorationCount = 1;
    
    for (let i = 0; i < decorationCount; i++) {
      // 使用chunk坐标和索引生成一致的随机数
      const seed = chunkX * 73856093 ^ chunkY * 19349663 ^ i * 83492791;
      const random1 = Math.abs(Math.sin(seed) * 43758.5453) % 1;
      const random2 = Math.abs(Math.sin(seed * 1.1) * 43758.5453) % 1;
      const random3 = Math.abs(Math.sin(seed * 1.3) * 43758.5453) % 1;
      
      const config = this.decorationConfigs[Math.floor(random1 * this.decorationConfigs.length)];
      
      const x = chunkWorldX + random2 * chunkSize;
      const y = chunkWorldY + random3 * chunkSize;
      
      const deco = this.scene.add.sprite(x, y, 'ground-deco', config.frame);
      deco.setDepth(-1);
      deco.setScale(config.scale);
      deco.setAlpha(config.alpha !== undefined ? config.alpha : 0.8);
      
      if (config.collides && this.obstaclesGroup) {
        this.scene.physics.add.existing(deco, true);
        this.obstaclesGroup.add(deco);
        
        const body = deco.body as Phaser.Physics.Arcade.StaticBody;
        if (body) {
          const colliderScale = 0.7;
          body.setSize(deco.width * colliderScale, deco.height * colliderScale);
          body.setOffset(
            (deco.width * (1 - colliderScale)) / 2,
            (deco.height * (1 - colliderScale)) / 2
          );
        }
      }
      
      if (!this.decorationChunks.has(chunkKey)) {
        this.decorationChunks.set(chunkKey, []);
      }
      this.decorationChunks.get(chunkKey)!.push(deco);
    }
  }

  // 清理所有
  clearAll(): void {
    // 清除所有chunks的layers
    this.loadedLayers.forEach((layer, chunkKey) => {
      layer.destroy();
    });
    this.loadedLayers.clear();
    
    // 清除所有chunks的tilemaps
    this.loadedChunks.forEach((tilemap, chunkKey) => {
      tilemap.destroy();
    });
    this.loadedChunks.clear();
    
    // 清除所有装饰物chunks
    this.decorationChunks.forEach((sprites, chunkKey) => {
      sprites.forEach(sprite => {
        if (sprite.body) {
          this.obstaclesGroup?.remove(sprite);
        }
        sprite.destroy();
      });
    });
    this.decorationChunks.clear();
    
    // 清空旧的装饰物数组
    this.decorations.forEach(deco => {
      if (deco.active) {
        deco.destroy();
      }
    });
    this.decorations = [];
    
    // 清空障碍物组
    if (this.obstaclesGroup) {
      this.obstaclesGroup.clear(true, true);
    }
  }
  
  // 获取障碍物组（用于与玩家等进行碰撞检测）
  getObstaclesGroup(): Phaser.Physics.Arcade.StaticGroup | undefined {
    return this.obstaclesGroup;
  }
  
  // 更新装饰物配置
  updateConfigs(configs: DecorationConfig[]): void {
    this.decorationConfigs = configs;
  }
  
  // 获取当前配置
  getConfigs(): DecorationConfig[] {
    return this.decorationConfigs;
  }
}
