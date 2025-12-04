import Phaser from 'phaser';
import { 
  EnemyConfig, 
  getRandomEnemy, 
  calculateEnemyStats, 
  calculateSpawnRate,
  getAvailableBoss
} from '../config/EnemyConfig';
import { DifficultyLevel, getDifficultyConfig } from '../config/DifficultyConfig';

// 怪物实例接口
export interface Enemy extends Phaser.GameObjects.Sprite {
  enemyConfig: EnemyConfig;
  hp: number;
  maxHP: number;
  damage: number;
  speed: number;
  expValue: number;
  laserHitThisFrame?: boolean;
}

// 怪物管理器
export class EnemyManager {
  private scene: Phaser.Scene;
  private enemyGroup: Phaser.Physics.Arcade.Group;
  private player: Phaser.GameObjects.GameObject;
  
  private spawnTimer: number = 0;
  private currentDifficulty: number = 1;
  private gameDifficulty: DifficultyLevel = DifficultyLevel.NORMAL; // 游戏难度设置
  private bossSpawned: Set<number> = new Set(); // 记录已生成过Boss的难度等级
  
  // 地图边界
  private mapWidth: number;
  private mapHeight: number;
  
  constructor(
    scene: Phaser.Scene, 
    enemyGroup: Phaser.Physics.Arcade.Group,
    player: Phaser.GameObjects.GameObject,
    mapWidth: number = 3000,
    mapHeight: number = 3000,
    gameDifficulty: DifficultyLevel = DifficultyLevel.NORMAL
  ) {
    this.scene = scene;
    this.enemyGroup = enemyGroup;
    this.player = player;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.gameDifficulty = gameDifficulty;
  }
  
  // 设置游戏难度
  setGameDifficulty(difficulty: DifficultyLevel): void {
    this.gameDifficulty = difficulty;
  }
  
  // 更新难度等级
  setDifficulty(level: number): void {
    this.currentDifficulty = level;
    
    // 检查是否需要生成Boss
    this.checkAndSpawnBoss();
  }
  
  // 检查并生成Boss
  private checkAndSpawnBoss(): void {
    // 如果这个难度已经生成过Boss，跳过
    if (this.bossSpawned.has(this.currentDifficulty)) {
      return;
    }
    
    // 获取该难度的Boss配置
    const bossConfig = getAvailableBoss(this.currentDifficulty);
    
    if (bossConfig) {
      // 生成Boss
      this.spawnBoss(bossConfig);
      // 标记该难度已生成Boss
      this.bossSpawned.add(this.currentDifficulty);
    }
  }
  
  // 生成Boss
  private spawnBoss(bossConfig: EnemyConfig): void {
    const position = this.calculateSpawnPosition();
    const boss = this.createEnemy(bossConfig, position.x, position.y);
    
    // Boss特殊标记和效果
    if (boss) {
      // 添加Boss光环效果
      const glow = this.scene.add.circle(boss.x, boss.y, 60, 0xff0000, 0.3);
      this.scene.tweens.add({
        targets: glow,
        scale: { from: 1, to: 1.3 },
        alpha: { from: 0.3, to: 0.1 },
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
      
      // 让光环跟随Boss
      const updateHandler = () => {
        if (!this.scene.scene.isActive()) {
          this.scene.events.off('update', updateHandler);
          if (glow.active) glow.destroy();
          return;
        }
        if (boss.active) {
          glow.setPosition(boss.x, boss.y);
        } else {
          glow.destroy();
          this.scene.events.off('update', updateHandler);
        }
      };
      this.scene.events.on('update', updateHandler);
      
      // Boss出现提示
      const bossText = this.scene.add.text(
        this.scene.cameras.main.centerX,
        this.scene.cameras.main.centerY - 200,
        `⚠️ BOSS出现: ${bossConfig.name} ⚠️`,
        {
          fontSize: '48px',
          color: '#ff0000',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 6
        }
      );
      bossText.setOrigin(0.5);
      bossText.setScrollFactor(0);
      
      this.scene.tweens.add({
        targets: bossText,
        alpha: 0,
        y: bossText.y - 100,
        duration: 3000,
        ease: 'Power2',
        onComplete: () => {
          if (bossText.active) bossText.destroy();
        }
      });
    }
  }
  
  // 更新怪物生成（在游戏主循环中调用）
  update(delta: number): void {
    this.spawnTimer += delta;
    
    const spawnRate = calculateSpawnRate(this.currentDifficulty);
    const diffConfig = getDifficultyConfig(this.gameDifficulty);
    const finalSpawnRate = spawnRate / diffConfig.enemySpawnRateMultiplier;
    
    if (this.spawnTimer >= finalSpawnRate) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }
  }
  
  // 生成怪物
  spawnEnemy(): void {
    const enemyConfig = getRandomEnemy(this.currentDifficulty);
    
    if (!enemyConfig) {
      console.warn('No enemy config available for difficulty:', this.currentDifficulty);
      return;
    }
    
    // 计算生成位置（在玩家视野外）
    const position = this.calculateSpawnPosition();
    
    // 创建怪物
    this.createEnemy(enemyConfig, position.x, position.y);
  }
  
  // 计算生成位置
  private calculateSpawnPosition(): { x: number; y: number } {
    const playerSprite = this.player as any;
    const spawnDistance = 600; // 生成距离（屏幕外）
    const minSpawnDistance = 500; // 最小生成距离
    
    // 地图边界
    const halfWidth = this.mapWidth / 2;
    const halfHeight = this.mapHeight / 2;
    const mapBounds = {
      minX: -halfWidth + 100,
      maxX: halfWidth - 100,
      minY: -halfHeight + 100,
      maxY: halfHeight - 100
    };
    
    // 随机选择一个角度（360度）
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    
    // 在该角度方向上，从玩家位置向外扩展生成
    let x = playerSprite.x + Math.cos(angle) * spawnDistance;
    let y = playerSprite.y + Math.sin(angle) * spawnDistance;
    
    // 如果超出地图边界，将位置拉回到地图边界
    const needsClamp = x < mapBounds.minX || x > mapBounds.maxX || 
                       y < mapBounds.minY || y > mapBounds.maxY;
    
    if (needsClamp) {
      // 计算从玩家到目标点的射线与地图边界的交点
      const dx = x - playerSprite.x;
      const dy = y - playerSprite.y;
      
      // 计算射线与各边界的交点参数 t (0到1之间)
      const tValues: number[] = [];
      
      // 左边界
      if (dx !== 0) {
        const t = (mapBounds.minX - playerSprite.x) / dx;
        if (t > 0 && t <= 1) {
          const intersectY = playerSprite.y + t * dy;
          if (intersectY >= mapBounds.minY && intersectY <= mapBounds.maxY) {
            tValues.push(t);
          }
        }
      }
      
      // 右边界
      if (dx !== 0) {
        const t = (mapBounds.maxX - playerSprite.x) / dx;
        if (t > 0 && t <= 1) {
          const intersectY = playerSprite.y + t * dy;
          if (intersectY >= mapBounds.minY && intersectY <= mapBounds.maxY) {
            tValues.push(t);
          }
        }
      }
      
      // 上边界
      if (dy !== 0) {
        const t = (mapBounds.minY - playerSprite.y) / dy;
        if (t > 0 && t <= 1) {
          const intersectX = playerSprite.x + t * dx;
          if (intersectX >= mapBounds.minX && intersectX <= mapBounds.maxX) {
            tValues.push(t);
          }
        }
      }
      
      // 下边界
      if (dy !== 0) {
        const t = (mapBounds.maxY - playerSprite.y) / dy;
        if (t > 0 && t <= 1) {
          const intersectX = playerSprite.x + t * dx;
          if (intersectX >= mapBounds.minX && intersectX <= mapBounds.maxX) {
            tValues.push(t);
          }
        }
      }
      
      // 如果找到交点，使用最近的交点
      if (tValues.length > 0) {
        const t = Math.min(...tValues);
        x = playerSprite.x + t * dx;
        y = playerSprite.y + t * dy;
        
        // 轻微向内偏移，确保在边界内
        const offset = 10;
        if (x <= mapBounds.minX + offset) x = mapBounds.minX + offset;
        if (x >= mapBounds.maxX - offset) x = mapBounds.maxX - offset;
        if (y <= mapBounds.minY + offset) y = mapBounds.minY + offset;
        if (y >= mapBounds.maxY - offset) y = mapBounds.maxY - offset;
      } else {
        // 降级方案：简单clamp
        x = Phaser.Math.Clamp(x, mapBounds.minX, mapBounds.maxX);
        y = Phaser.Math.Clamp(y, mapBounds.minY, mapBounds.maxY);
      }
      
      // 验证最终距离，确保不会太近
      const finalDistance = Phaser.Math.Distance.Between(x, y, playerSprite.x, playerSprite.y);
      if (finalDistance < minSpawnDistance) {
        // 如果太近，在当前方向上推到最小距离
        const pushAngle = Math.atan2(y - playerSprite.y, x - playerSprite.x);
        x = playerSprite.x + Math.cos(pushAngle) * minSpawnDistance;
        y = playerSprite.y + Math.sin(pushAngle) * minSpawnDistance;
        
        // 最后确保在边界内
        x = Phaser.Math.Clamp(x, mapBounds.minX, mapBounds.maxX);
        y = Phaser.Math.Clamp(y, mapBounds.minY, mapBounds.maxY);
      }
    }
    
    return { x, y };
  }
  
  // 创建怪物实体
  createEnemy(config: EnemyConfig, x: number, y: number): Enemy {
    // 计算属性（应用难度倍率）
    const stats = calculateEnemyStats(config, this.currentDifficulty);
    const diffConfig = getDifficultyConfig(this.gameDifficulty);
    
    // 应用难度倍率
    const finalHP = config.isBoss 
      ? Math.floor(stats.hp * diffConfig.bossHealthMultiplier)
      : Math.floor(stats.hp * diffConfig.enemyHealthMultiplier);
    
    const finalDamage = config.isBoss
      ? Math.floor(stats.damage * diffConfig.bossDamageMultiplier)
      : Math.floor(stats.damage * diffConfig.enemyDamageMultiplier);
    
    const finalSpeed = stats.speed * diffConfig.enemySpeedMultiplier;
    
    // 调试日志：每20个怪物打印一次详细信息
    if (this.enemyGroup.getChildren().length % 20 === 0) {
      console.log(`[难度系统] 生成怪物: ${config.name}`, {
        游戏难度: `${diffConfig.name} (${this.gameDifficulty})`,
        当前波次难度: this.currentDifficulty,
        基础属性: { HP: stats.hp, 伤害: stats.damage, 速度: stats.speed },
        倍率: {
          HP倍率: config.isBoss ? diffConfig.bossHealthMultiplier : diffConfig.enemyHealthMultiplier,
          伤害倍率: config.isBoss ? diffConfig.bossDamageMultiplier : diffConfig.enemyDamageMultiplier,
          速度倍率: diffConfig.enemySpeedMultiplier
        },
        最终属性: { HP: finalHP, 伤害: finalDamage, 速度: finalSpeed.toFixed(1) }
      });
    }
    
    // 创建精灵
    let enemy: Phaser.GameObjects.Sprite;
    
    // 检查纹理和动画是否都存在
    const textureExists = this.scene.textures.exists(config.spriteKey);
    const animExists = this.scene.anims.exists(config.animKey);
    
    if (textureExists && animExists) {
      enemy = this.scene.add.sprite(x, y, config.spriteKey);
      enemy.play(config.animKey);
      enemy.setScale(config.scale);
    } else {
      // 降级处理：如果资源不可用，创建简单的彩色圆形
      console.warn(`Enemy sprite/animation not available: ${config.spriteKey}/${config.animKey}, using fallback`);
      
      // 创建一个圆形sprite作为替代
      const graphics = this.scene.add.graphics();
      const color = config.isBoss ? 0xff0000 : 0xff6600;
      graphics.fillStyle(color, 1);
      graphics.fillCircle(0, 0, 16);
      graphics.generateTexture(`enemy_fallback_${config.id}`, 32, 32);
      graphics.destroy();
      
      enemy = this.scene.add.sprite(x, y, `enemy_fallback_${config.id}`);
      enemy.setScale(config.scale);
    }
    
    this.scene.physics.add.existing(enemy);
    this.enemyGroup.add(enemy);
    
    // 扩展属性
    const enemyExtended = enemy as Enemy;
    enemyExtended.enemyConfig = config;
    enemyExtended.hp = finalHP;
    enemyExtended.maxHP = finalHP;
    enemyExtended.damage = finalDamage;
    enemyExtended.speed = finalSpeed;
    enemyExtended.expValue = stats.expValue;
    
    // 标记Boss和类型
    (enemyExtended as any).isBoss = config.isBoss;
    (enemyExtended as any).enemyType = config.type;
    
    // 如果是Boss，添加血条
    if (config.isBoss) {
      const barWidth = 80;
      const barHeight = 8;
      const barY = -40; // 血条在Boss上方的偏移
      
      // 血条背景（红色）
      const healthBarBg = this.scene.add.rectangle(
        enemy.x,
        enemy.y + barY,
        barWidth,
        barHeight,
        0x000000
      );
      healthBarBg.setStrokeStyle(2, 0xffffff);
      
      // 血条前景（绿色）
      const healthBar = this.scene.add.rectangle(
        enemy.x,
        enemy.y + barY,
        barWidth,
        barHeight,
        0x00ff00
      );
      healthBar.setOrigin(0, 0.5);
      healthBar.x = enemy.x - barWidth / 2;
      
      // Boss名字
      const nameText = this.scene.add.text(
        enemy.x,
        enemy.y + barY - 15,
        config.name,
        {
          fontSize: '12px',
          color: '#ffff00',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3
        }
      );
      nameText.setOrigin(0.5);
      
      // 将血条和名字附加到enemy对象上
      (enemyExtended as any).healthBarBg = healthBarBg;
      (enemyExtended as any).healthBar = healthBar;
      (enemyExtended as any).nameText = nameText;
      
      // 更新血条位置的处理器
      const updateHealthBar = () => {
        if (!this.scene.scene.isActive()) {
          this.scene.events.off('update', updateHealthBar);
          if (healthBarBg.active) healthBarBg.destroy();
          if (healthBar.active) healthBar.destroy();
          if (nameText.active) nameText.destroy();
          return;
        }
        
        if (enemy.active) {
          // 更新位置
          healthBarBg.setPosition(enemy.x, enemy.y + barY);
          healthBar.y = enemy.y + barY;
          healthBar.x = enemy.x - barWidth / 2;
          nameText.setPosition(enemy.x, enemy.y + barY - 15);
          
          // 更新血条宽度
          const healthPercent = Math.max(0, enemyExtended.hp / enemyExtended.maxHP);
          healthBar.width = barWidth * healthPercent;
          
          // 根据血量改变颜色
          if (healthPercent > 0.5) {
            healthBar.setFillStyle(0x00ff00); // 绿色
          } else if (healthPercent > 0.25) {
            healthBar.setFillStyle(0xffff00); // 黄色
          } else {
            healthBar.setFillStyle(0xff0000); // 红色
          }
        } else {
          // Boss死亡，清理血条
          healthBarBg.destroy();
          healthBar.destroy();
          nameText.destroy();
          this.scene.events.off('update', updateHealthBar);
        }
      };
      
      this.scene.events.on('update', updateHealthBar);
    }
    
    return enemyExtended;
  }
  
  // 更新所有怪物的AI（追踪玩家）
  updateEnemyAI(): void {
    const playerSprite = this.player as any;
    
    this.enemyGroup.getChildren().forEach((enemy: any) => {
      if (!enemy || !enemy.active || !enemy.body) return;
      // 如果敌人在被玩家碰撞后处于击退/冷却状态，跳过 AI 控制（避免覆盖击退速度）
      if ((enemy as any)._playerHitCooldown) {
        // console.log('Skipping AI for knocked back enemy');
        return;
      }
      
      const distance = Phaser.Math.Distance.Between(
        enemy.x,
        enemy.y,
        playerSprite.x,
        playerSprite.y
      );
      
      // 如果敌人距离玩家太远，重新刷新到视野边缘
      const despawnDistance = 1000;
      if (distance > despawnDistance) {
        const newPos = this.calculateSpawnPosition();
        enemy.x = newPos.x;
        enemy.y = newPos.y;
        return;
      }
      
      // 追踪玩家
      const angle = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        playerSprite.x,
        playerSprite.y
      );
      
      const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
      if (enemyBody) {
        const speed = enemy.speed || 80;
        enemyBody.setVelocity(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed
        );
      }
    });
  }
  
  // 对怪物造成伤害
  damageEnemy(enemy: Enemy, damage: number): boolean {
    if (!enemy || !enemy.active) return false;
    
    enemy.hp -= damage;
    
    // 闪烁效果
    this.scene.tweens.add({
      targets: enemy,
      alpha: 0.3,
      duration: 100,
      yoyo: true
    });
    
    // 如果死亡，返回true
    return enemy.hp <= 0;
  }
  
  // 获取怪物伤害值
  getEnemyDamage(enemy: Enemy): number {
    return enemy.damage || 10;
  }
  
  // 获取怪物经验值
  getEnemyExpValue(enemy: Enemy): number {
    return enemy.expValue || 1;
  }
  
  // 清空所有怪物
  clearAllEnemies(): void {
    this.enemyGroup.clear(true, true);
  }
  
  // 重置管理器
  reset(): void {
    this.spawnTimer = 0;
    this.currentDifficulty = 1;
    this.bossSpawned.clear();
    this.clearAllEnemies();
  }
  
  // 获取当前生成间隔
  getCurrentSpawnRate(): number {
    return calculateSpawnRate(this.currentDifficulty);
  }
  
  // 获取敌人数量
  getEnemyCount(): number {
    return this.enemyGroup.getChildren().length;
  }
}
