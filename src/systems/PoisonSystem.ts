import Phaser from 'phaser';

// 毒性状态接口
interface PoisonStatus {
  damage: number;          // 每次毒伤
  duration: number;        // 剩余持续时间(ms)
  interval: number;        // 伤害间隔(ms)
  lastDamageTime: number;  // 上次造成伤害的时间
  spreadRadius: number;    // 扩散范围
  drugLevel: number;       // 原始毒性等级（用于扩散）
}

/**
 * 毒性系统 - 管理敌人的中毒状态和毒性扩散
 */
export class PoisonSystem {
  private scene: Phaser.Scene;
  private poisonedEnemies: Map<any, PoisonStatus> = new Map();
  private poisonParticles: Map<any, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 对敌人施加毒性效果
   * @param enemy 目标敌人
   * @param drugLevel 毒性等级
   * @param spreadRadius 扩散范围
   */
  applyPoison(enemy: any, drugLevel: number, spreadRadius: number = 0): void {
    if (!enemy || !enemy.active || drugLevel <= 0) return;
    
    // 检查毒素免疫
    if (enemy.enemyConfig?.immuneToPoison) return;

    // 计算毒性伤害（每秒造成毒性等级的伤害）
    const poisonDamage = drugLevel * 0.5; // 每次伤害 = 毒性等级 * 0.5
    const poisonDuration = 3000; // 持续3秒
    const damageInterval = 500; // 每0.5秒造成一次伤害

    // 如果敌人已经中毒，刷新中毒状态
    const existingPoison = this.poisonedEnemies.get(enemy);
    if (existingPoison) {
      existingPoison.damage = Math.max(existingPoison.damage, poisonDamage);
      existingPoison.duration = poisonDuration;
      existingPoison.spreadRadius = Math.max(existingPoison.spreadRadius, spreadRadius);
    } else {
      // 新增中毒状态
      this.poisonedEnemies.set(enemy, {
        damage: poisonDamage,
        duration: poisonDuration,
        interval: damageInterval,
        lastDamageTime: this.scene.game.getTime(),
        spreadRadius: spreadRadius,
        drugLevel: drugLevel
      });
      
      // 添加中毒视觉效果
      this.createPoisonEffect(enemy);
    }
  }

  /**
   * 更新所有中毒敌人的状态
   * @param delta 时间增量(ms)
   * @param enemies 敌人组
   * @param onEnemyDamage 敌人受伤回调
   */
  update(
    delta: number, 
    enemies: Phaser.Physics.Arcade.Group,
    onEnemyDamage: (enemy: any, damage: number) => void
  ): void {
    const currentTime = this.scene.game.getTime();
    const enemiesToRemove: any[] = [];

    this.poisonedEnemies.forEach((poison, enemy) => {
      // 检查敌人是否还存活
      if (!enemy || !enemy.active) {
        enemiesToRemove.push(enemy);
        return;
      }

      // 更新持续时间
      poison.duration -= delta;

      // 检查是否应该造成伤害
      if (currentTime - poison.lastDamageTime >= poison.interval) {
        onEnemyDamage(enemy, poison.damage);
        poison.lastDamageTime = currentTime;
        
        // 爆发毒素粒子效果
        const poisonParticles = this.poisonParticles.get(enemy);
        if (poisonParticles) {
          poisonParticles.setPosition(enemy.x, enemy.y);
          poisonParticles.explode(3);
        }

        // 毒性扩散逻辑
        if (poison.spreadRadius > 0) {
          this.spreadPoison(enemy, poison, enemies, onEnemyDamage);
        }
      }

      // 检查中毒是否结束
      if (poison.duration <= 0) {
        enemiesToRemove.push(enemy);
      }
    });

    // 清理过期的中毒状态
    enemiesToRemove.forEach(enemy => {
      this.removePoisonEffect(enemy);
      this.poisonedEnemies.delete(enemy);
    });
  }

  /**
   * 毒性扩散 - 对附近敌人造成毒性效果
   */
  private spreadPoison(
    sourceEnemy: any,
    poison: PoisonStatus,
    enemies: Phaser.Physics.Arcade.Group,
    onEnemyDamage: (enemy: any, damage: number) => void
  ): void {
    // 根据扩散范围计算最大传染数量
    // 范围60 = 1个, 范围80 = 2个, 范围100 = 3个, 以此类推
    const maxSpreadCount = Math.max(1, Math.floor(poison.spreadRadius / 40));
    
    // 收集范围内的未中毒敌人
    const validTargets: Array<{enemy: any, distance: number}> = [];
    
    enemies.getChildren().forEach((enemy: any) => {
      if (!enemy || !enemy.active || enemy === sourceEnemy) return;

      const distance = Phaser.Math.Distance.Between(
        sourceEnemy.x,
        sourceEnemy.y,
        enemy.x,
        enemy.y
      );

      // 如果在扩散范围内且未中毒
      if (distance <= poison.spreadRadius && !this.poisonedEnemies.has(enemy)) {
        validTargets.push({ enemy, distance });
      }
    });
    
    // 按距离排序，优先传染最近的敌人
    validTargets.sort((a, b) => a.distance - b.distance);
    
    // 只传染最多maxSpreadCount个敌人
    const spreadCount = Math.min(maxSpreadCount, validTargets.length);
    
    for (let i = 0; i < spreadCount; i++) {
      const target = validTargets[i];
      // 使用原始毒性等级的60%进行扩散
      this.applyPoison(target.enemy, poison.drugLevel * 0.6, 0); // 扩散的毒性不再二次扩散
    }
    
    if (spreadCount > 0) {
      console.log('[PoisonSystem] Poison spread to', spreadCount, '/', validTargets.length, 'enemies (max:', maxSpreadCount, '). Spread radius:', poison.spreadRadius);
    }
  }

  /**
   * 显示毒性扩散效果（绿色连线）
   */
  private showSpreadEffect(fromEnemy: any, toEnemy: any): void {
    const line = this.scene.add.line(
      0, 0,
      fromEnemy.x, fromEnemy.y,
      toEnemy.x, toEnemy.y,
      0x00ff00, 0.6
    );
    line.setLineWidth(2);
    line.setDepth(100);
    
    // 线条淡出动画
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 500,
      onComplete: () => line.destroy()
    });
  }

  /**
   * 创建中毒视觉效果
   */
  private createPoisonEffect(enemy: any): void {
    // 移除旧的粒子效果（如果存在）
    const oldEmitter = this.poisonParticles.get(enemy);
    if (oldEmitter) {
      oldEmitter.stop();
      oldEmitter.destroy();
    }

    // 创建绿色毒雾粒子效果（参考燃烧效果）
    const particles = this.scene.add.particles(enemy.x, enemy.y, 'poison-bullet-sheet', {
      lifespan: 500,
      speed: { min: 20, max: 40 },
      scale: { start: 0.3, end: 0 },
      blendMode: 'ADD',
      emitting: false
    });

    this.poisonParticles.set(enemy, particles);
  }

  /**
   * 移除中毒视觉效果
   */
  private removePoisonEffect(enemy: any): void {
    const emitter = this.poisonParticles.get(enemy);
    if (emitter) {
      emitter.stop();
      // 延迟销毁，让现有粒子播放完
      this.scene.time.delayedCall(1000, () => {
        if (emitter) {
          emitter.destroy();
        }
      });
      this.poisonParticles.delete(enemy);
    }
  }

  /**
   * 清理所有中毒状态（用于重置游戏）
   */
  clear(): void {
    this.poisonedEnemies.forEach((_, enemy) => {
      this.removePoisonEffect(enemy);
    });
    this.poisonedEnemies.clear();
    this.poisonParticles.clear();
  }

  /**
   * 检查敌人是否中毒
   */
  isPoisoned(enemy: any): boolean {
    return this.poisonedEnemies.has(enemy);
  }

  /**
   * 获取敌人的剩余毒伤总值
   * @param enemy 目标敌人
   * @returns 剩余毒伤总值
   */
  getTotalPoisonDamage(enemy: any): number {
    const poison = this.poisonedEnemies.get(enemy);
    if (!poison) return 0;
    
    // 计算剩余的毒伤次数
    const remainingTicks = Math.ceil(poison.duration / poison.interval);
    const totalRemainingDamage = poison.damage * remainingTicks;
    
    return totalRemainingDamage;
  }

  /**
   * 清除敌人的毒性状态
   * @param enemy 目标敌人
   */
  clearPoison(enemy: any): void {
    if (this.poisonedEnemies.has(enemy)) {
      this.removePoisonEffect(enemy);
      this.poisonedEnemies.delete(enemy);
    }
  }

  /**
   * 引爆范围内所有中毒敌人的剩余毒伤
   * @param x 爆炸中心X
   * @param y 爆炸中心Y
   * @param radius 爆炸范围
   * @param enemies 敌人组
   * @param onEnemyDamage 敌人受伤回调
   * @returns 引爆的敌人数量
   */
  detonatePoison(
    x: number,
    y: number,
    radius: number,
    enemies: Phaser.Physics.Arcade.Group,
    onEnemyDamage: (enemy: any, damage: number) => void
  ): number {
    let detonatedCount = 0;
    const enemiesToDetonate: any[] = [];

    // 找出范围内所有中毒的敌人
    enemies.getChildren().forEach((enemy: any) => {
      if (!enemy || !enemy.active) return;

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      
      if (distance <= radius && this.poisonedEnemies.has(enemy)) {
        enemiesToDetonate.push(enemy);
      }
    });

    // 引爆每个中毒敌人的剩余毒伤
    enemiesToDetonate.forEach(enemy => {
      const poison = this.poisonedEnemies.get(enemy);
      if (poison) {
        // 计算剩余的毒伤次数
        const remainingTicks = Math.ceil(poison.duration / poison.interval);
        const totalRemainingDamage = poison.damage * remainingTicks;
        
        // 立即造成所有剩余伤害
        onEnemyDamage(enemy, totalRemainingDamage);
        
        // 清除中毒状态
        this.removePoisonEffect(enemy);
        this.poisonedEnemies.delete(enemy);
        
        detonatedCount++;
      }
    });

    if (detonatedCount > 0) {
      console.log('[PoisonSystem] Detonated poison on', detonatedCount, 'enemies in explosion radius');
    }

    return detonatedCount;
  }
}
