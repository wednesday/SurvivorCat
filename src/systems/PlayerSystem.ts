import Phaser from "phaser";

/**
 * 玩家系统 - 管理玩家的状态、移动、动画和属性
 */
export class PlayerSystem {
  private scene: Phaser.Scene;
  private player: Phaser.GameObjects.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  
  // 玩家属性
  private hp: number = 100;
  private maxHP: number = 100;
  private level: number = 1;
  private exp: number = 0;
  private expToNextLevel: number = 10;
  private isHurt: boolean = false;
  
  // 移动相关
  private moveSpeed: number = 150;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.GameObjects.Sprite,
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
  ) {
    this.scene = scene;
    this.player = player;
    this.cursors = cursors;
  }

  /**
   * 初始化玩家
   */
  init(startX: number, startY: number) {
    this.player.setPosition(startX, startY);
    this.hp = this.maxHP;
    this.level = 1;
    this.exp = 0;
    this.expToNextLevel = 10;
    this.isHurt = false;
  }

  /**
   * 更新玩家状态
   */
  update(delta: number) {
    this.handleMovement();
  }

  /**
   * 处理玩家移动
   */
  private handleMovement() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    let velocityX = 0;
    let velocityY = 0;

    // 键盘输入
    if (this.cursors.left.isDown) {
      velocityX = -this.moveSpeed;
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      velocityX = this.moveSpeed;
      this.player.setFlipX(false);
    }

    if (this.cursors.up.isDown) {
      velocityY = -this.moveSpeed;
    } else if (this.cursors.down.isDown) {
      velocityY = this.moveSpeed;
    }

    // 应用速度
    body.setVelocity(velocityX, velocityY);

    // 处理动画
    this.updateAnimation(velocityX, velocityY);
  }

  /**
   * 更新玩家动画
   */
  private updateAnimation(velocityX: number, velocityY: number) {
    if (velocityX !== 0 || velocityY !== 0) {
      if (this.player.anims.currentAnim?.key !== "cat-walk-anim") {
        this.player.play("cat-walk-anim", true);
      }
    } else {
      if (this.player.anims.currentAnim?.key !== "cat-idle-anim") {
        this.player.play("cat-idle-anim", true);
      }
    }
  }

  /**
   * 受到伤害
   */
  takeDamage(damage: number): boolean {
    if (this.isHurt) return false;

    this.hp -= damage;
    this.isHurt = true;

    // 播放受伤动画
    this.player.setTint(0xff0000);
    
    this.scene.time.delayedCall(200, () => {
      this.player.clearTint();
      this.isHurt = false;
    });

    return this.hp <= 0;
  }

  /**
   * 治疗
   */
  heal(amount: number) {
    this.hp = Math.min(this.hp + amount, this.maxHP);
  }

  /**
   * 增加经验
   */
  addExp(amount: number): boolean {
    this.exp += amount;
    
    if (this.exp >= this.expToNextLevel) {
      this.levelUp();
      return true;
    }
    
    return false;
  }

  /**
   * 升级
   */
  private levelUp() {
    this.level++;
    this.exp -= this.expToNextLevel;
    this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
    
    // 升级时恢复少量生命值
    this.heal(this.maxHP * 0.2);
  }

  /**
   * 设置移动速度
   */
  setMoveSpeed(speed: number) {
    this.moveSpeed = speed;
  }

  /**
   * 设置最大生命值
   */
  setMaxHP(maxHP: number) {
    const hpRatio = this.hp / this.maxHP;
    this.maxHP = maxHP;
    this.hp = maxHP * hpRatio;
  }

  // Getters
  getHP(): number { return this.hp; }
  getMaxHP(): number { return this.maxHP; }
  getLevel(): number { return this.level; }
  getExp(): number { return this.exp; }
  getExpToNextLevel(): number { return this.expToNextLevel; }
  isPlayerHurt(): boolean { return this.isHurt; }
  getPlayer(): Phaser.GameObjects.Sprite { return this.player; }
  getMoveSpeed(): number { return this.moveSpeed; }

  // Setters
  setHP(hp: number) { this.hp = Math.min(Math.max(0, hp), this.maxHP); }
  setLevel(level: number) { this.level = level; }
  setExp(exp: number) { this.exp = exp; }
  setExpToNextLevel(exp: number) { this.expToNextLevel = exp; }
}
