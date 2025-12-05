import Phaser from 'phaser';

// 爆炸系统 - 管理爆炸效果
export class ExplosionSystem {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  // 创建爆炸效果
  createExplosion(
    x: number,
    y: number,
    damage: number,
    radius: number,
    enemies: Phaser.Physics.Arcade.Group,
    onEnemyHit: (enemy: any, damage: number) => void,
    isPoisonExplosion: boolean = false,
    iceLevel: number = 0,
    onApplyIce?: (enemy: any, iceValue: number) => void,
    isFusionExplosion: boolean = false
  ): void {
    // 爆炸音效
    this.scene.sound.play('culverinshoot1');
    
    // 创建爆炸视觉效果 - 扩散的圆圈（融合爆炸为紫色，毒性爆炸为绿色，寒冰爆炸为蓝色）
    const isIceExplosion = iceLevel > 0;
    let explosionColor = 0xff6600; // 默认橙色
    if (isFusionExplosion) {
      explosionColor = 0x9900ff; // 融合紫色
    } else if (isIceExplosion) {
      explosionColor = 0x00ffff; // 寒冰蓝色
    } else if (isPoisonExplosion) {
      explosionColor = 0x00ff00; // 毒性绿色
    }
    const explosion = this.scene.add.circle(x, y, 10, explosionColor, 0.8);
    
    // 扩散动画
    this.scene.tweens.add({
      targets: explosion,
      radius: radius,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => explosion.destroy()
    });
    
    // 添加粒子效果
    this.createExplosionParticles(x, y, radius, isPoisonExplosion, isIceExplosion, isFusionExplosion);
    
    // 屏幕震动
    this.scene.cameras.main.shake(100, 0.005);
    
    // 伤害计算 - 检测范围内的所有敌人
    enemies.getChildren().forEach((enemy: any) => {
      if (!enemy || !enemy.active || !enemy.body) return;
      
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      
      if (distance <= radius) {
        // 距离越近伤害越高（最远50%伤害）
        const damageMultiplier = 1 - (distance / radius) * 0.5;
        const finalDamage = Math.ceil(damage * damageMultiplier);
        
        // 应用伤害
        onEnemyHit(enemy, finalDamage);
        
        // 如果是寒冰爆炸，应用寒冷效果
        if (iceLevel > 0 && onApplyIce) {
          // 检查寒冷免疫
          if (!enemy.enemyConfig?.immuneToCold) {
            // 中心50%范围：全额寒冷值
            // 外围50%范围：一半寒冷值
            const innerRadius = radius * 0.5;
            const iceValue = distance <= innerRadius ? iceLevel : Math.ceil(iceLevel / 2);
            onApplyIce(enemy, iceValue);
          }
        }
        
        // 击退效果
        const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
        const knockbackForce = 200 * (1 - distance / radius);
        
        const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
        if (enemyBody) {
          enemyBody.setVelocity(
            Math.cos(angle) * knockbackForce,
            Math.sin(angle) * knockbackForce
          );
        }
        
        // 爆炸命中效果（融合爆炸为紫色，毒性爆炸为绿色，寒冰爆炸为蓝色，普通爆炸为橙色闪烁）
        let hitTint = 0xff6600; // 默认橙色
        if (isFusionExplosion) {
          hitTint = 0x9900ff; // 融合紫色
        } else if (isIceExplosion) {
          hitTint = 0x00ffff; // 寒冰蓝色
        } else if (isPoisonExplosion) {
          hitTint = 0x00ff00; // 毒性绿色
        }
        this.scene.tweens.add({
          targets: enemy,
          tint: hitTint,
          duration: 150,
          yoyo: true,
          onComplete: () => {
            if (enemy.active) {
              enemy.clearTint();
            }
          }
        });
      }
    });
  }
  
  // 创建爆炸粒子效果
  private createExplosionParticles(x: number, y: number, radius: number, isPoisonExplosion: boolean = false, isIceExplosion: boolean = false, isFusionExplosion: boolean = false): void {
    const particleCount = 12;
    let particleColor = 0xff8800; // 默认橙色
    if (isFusionExplosion) {
      particleColor = 0x9900ff; // 融合紫色
    } else if (isIceExplosion) {
      particleColor = 0x00ffff; // 寒冰蓝色
    } else if (isPoisonExplosion) {
      particleColor = 0x00ff00; // 毒性绿色
    }
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = radius * 0.7;
      
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;
      
      // 创建粒子（小圆点）
      const particle = this.scene.add.circle(x, y, 5, particleColor, 1);
      
      // 粒子飞出动画
      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.2,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
    
    // 添加火花效果
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = radius * (0.3 + Math.random() * 0.4);
      
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;
      
      const spark = this.scene.add.circle(x, y, 3, 0xffff00, 1);
      
      this.scene.tweens.add({
        targets: spark,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Power1',
        onComplete: () => spark.destroy()
      });
    }
  }
  
  // 创建连锁爆炸效果（可选，用于特殊情况）
  createChainExplosion(
    x: number,
    y: number,
    damage: number,
    radius: number,
    enemies: Phaser.Physics.Arcade.Group,
    onEnemyHit: (enemy: any, damage: number) => void,
    chainCount: number = 0,
    maxChain: number = 3
  ): void {
    this.createExplosion(x, y, damage, radius, enemies, onEnemyHit);
    
    if (chainCount >= maxChain) return;
    
    // 20%概率触发连锁爆炸
    if (Math.random() < 0.2) {
      // 在附近随机位置创建下一个爆炸
      const angle = Math.random() * Math.PI * 2;
      const distance = radius * 1.5;
      const nextX = x + Math.cos(angle) * distance;
      const nextY = y + Math.sin(angle) * distance;
      
      this.scene.time.delayedCall(200, () => {
        this.createChainExplosion(
          nextX,
          nextY,
          damage * 0.7, // 连锁伤害递减
          radius * 0.8, // 连锁范围递减
          enemies,
          onEnemyHit,
          chainCount + 1,
          maxChain
        );
      });
    }
  }
}
