import Phaser from "phaser";
import { SkillManager } from "./SkillManager";

/**
 * 玩家系统 - 管理玩家相关的所有逻辑
 * 包括：移动、动画、属性、受伤、升级等
 */
export class PlayerSystem {
  private scene: Phaser.Scene;
  private player: Phaser.GameObjects.Sprite;
  private skillManager: SkillManager;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  // 玩家状态
  private playerHP: number = 100;
  private playerLevel: number = 1;
  private exp: number = 0;
  private expToNextLevel: number = 10;
  private isPlayerHurt: boolean = false;

  // WASD键位
  private keyW: Phaser.Input.Keyboard.Key;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyS: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.GameObjects.Sprite,
    skillManager: SkillManager,
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
  ) {
    this.scene = scene;
    this.player = player;
    this.skillManager = skillManager;
    this.cursors = cursors;

    // 初始化WASD键位
    this.keyW = scene.input.keyboard!.addKey("W");
    this.keyA = scene.input.keyboard!.addKey("A");
    this.keyS = scene.input.keyboard!.addKey("S");
    this.keyD = scene.input.keyboard!.addKey("D");

    // 初始化玩家生命值
    this.playerHP = this.skillManager.stats.maxHP;
  }

  /**
   * 获取玩家精灵对象
   */
  getSprite(): Phaser.GameObjects.Sprite {
    return this.player;
  }

  /**
   * 获取玩家当前HP
   */
  getHP(): number {
    return this.playerHP;
  }

  /**
   * 设置玩家HP
   */
  setHP(hp: number): void {
    this.playerHP = Math.max(0, Math.min(hp, this.skillManager.stats.maxHP));
  }

  /**
   * 获取玩家最大HP
   */
  getMaxHP(): number {
    return this.skillManager.stats.maxHP;
  }

  /**
   * 获取玩家等级
   */
  getLevel(): number {
    return this.playerLevel;
  }

  /**
   * 设置玩家等级
   */
  setLevel(level: number): void {
    this.playerLevel = level;
  }

  /**
   * 获取当前经验值
   */
  getExp(): number {
    return this.exp;
  }

  /**
   * 获取下一级所需经验
   */
  getExpToNextLevel(): number {
    return this.expToNextLevel;
  }

  /**
   * 是否处于受伤状态
   */
  isHurt(): boolean {
    return this.isPlayerHurt;
  }

  /**
   * 重置玩家状态（游戏重新开始时使用）
   */
  reset(): void {
    this.playerHP = this.skillManager.stats.maxHP;
    this.playerLevel = 1;
    this.exp = 0;
    this.expToNextLevel = 10;
    this.isPlayerHurt = false;
  }

  /**
   * 添加经验值
   * @returns 是否升级
   */
  addExp(amount: number): boolean {
    this.exp += amount;

    if (this.exp >= this.expToNextLevel) {
      this.exp -= this.expToNextLevel;
      this.levelUp();
      return true;
    }

    return false;
  }

  /**
   * 升级
   */
  private levelUp(): void {
    this.playerLevel++;
    this.expToNextLevel = Math.floor(this.expToNextLevel * 1.2);

    // 升级时的视觉效果
    const circle = this.scene.add.circle(
      this.player.x,
      this.player.y,
      10,
      0xffff00
    );
    circle.setDepth(100);

    this.scene.tweens.add({
      targets: circle,
      scale: 15,
      alpha: 0,
      duration: 800,
      ease: "Power2",
      onComplete: () => {
        circle.destroy();
      },
    });

    // 播放升级音效
    this.scene.sound.play("levelup", { volume: 0.3 });
  }

  /**
   * 玩家受到伤害
   */
  takeDamage(damage: number, knockbackAngle?: number): void {
    if (this.isPlayerHurt) return; // 无敌帧期间不受伤害

    this.playerHP -= damage;
    this.isPlayerHurt = true;

    // 击退效果
    if (knockbackAngle !== undefined) {
      const knockbackForce = 300;
      const dx = Math.cos(knockbackAngle) * knockbackForce;
      const dy = Math.sin(knockbackAngle) * knockbackForce;

      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setVelocity(dx, dy);
      }
    }

    // 播放受伤动画
    this.player.play("cat-ducking-anim");

    // 无敌帧时间（0.5秒）
    this.scene.time.delayedCall(500, () => {
      this.isPlayerHurt = false;
      if (this.player.active && this.playerHP > 0) {
        this.player.play("cat-idle-anim");
      }
    });

    // 受伤闪烁效果
    this.scene.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 4,
    });

    // 播放受伤音效
    this.scene.sound.play("player_hit", { volume: 0.2 });
  }

  /**
   * 更新玩家移动和动画
   */
  update(): void {
    if (!this.player || !this.player.body) return;

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    // 玩家移动（WASD 或方向键）
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown || this.keyA.isDown) {
      velocityX = -this.skillManager.stats.moveSpeed;
    } else if (this.cursors.right.isDown || this.keyD.isDown) {
      velocityX = this.skillManager.stats.moveSpeed;
    }

    if (this.cursors.up.isDown || this.keyW.isDown) {
      velocityY = -this.skillManager.stats.moveSpeed;
    } else if (this.cursors.down.isDown || this.keyS.isDown) {
      velocityY = this.skillManager.stats.moveSpeed;
    }

    // 对角线移动速度标准化
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    playerBody.setVelocity(velocityX, velocityY);

    // 更新玩家动画和方向（受伤时不更新）
    if (!this.isPlayerHurt) {
      if (velocityX !== 0 || velocityY !== 0) {
        // 移动时播放走路动画
        if (this.player.anims.currentAnim?.key !== "cat-walk-anim") {
          this.player.play("cat-walk-anim");
        }
        // 根据移动方向翻转精灵
        if (velocityX < 0) {
          this.player.setFlipX(true); // 向左翻转
        } else if (velocityX > 0) {
          this.player.setFlipX(false); // 向右不翻转
        }
      } else {
        // 静止时播放idle动画
        if (this.player.anims.currentAnim?.key !== "cat-idle-anim") {
          this.player.play("cat-idle-anim");
        }
      }
    }
  }

  /**
   * 获取玩家位置
   */
  getPosition(): { x: number; y: number } {
    return { x: this.player.x, y: this.player.y };
  }

  /**
   * 检查玩家是否死亡
   */
  isDead(): boolean {
    return this.playerHP <= 0;
  }
}
