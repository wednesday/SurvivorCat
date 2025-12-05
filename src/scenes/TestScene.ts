import Phaser from "phaser";
import { SKILL_CONFIGS } from "../config/SkillConfig";

/**
 * 测试场景 - 不继承GameScene，而是手动复用其功能
 * 这样可以避免构造函数冲突问题
 */
export class TestScene extends Phaser.Scene {
  private dpsText?: Phaser.GameObjects.Text;
  private totalDamage: number = 0;
  private damageHistory: Array<{ damage: number; time: number }> = [];
  private startTime: number = 0;
  private gameScene?: any;

  constructor() {
    super({ key: "TestScene" });
  }

  async create() {
    console.log("[TestScene] 测试模式启动 - 通过代码复用GameScene");
    
    // 启动GameScene但隐藏它，然后创建测试环境
    this.scene.launch("GameScene");
    const gameScene = this.scene.get("GameScene") as any;
    this.gameScene = gameScene;
    
    // 等待GameScene初始化完成
    await new Promise(resolve => this.time.delayedCall(200, resolve));
    
    console.log("[TestScene] GameScene已启动，开始配置测试环境");
    
    // 记录开始时间
    this.startTime = Date.now();
    this.totalDamage = 0;
    this.damageHistory = [];
    
    // 禁用敌人生成和AI - 设置游戏时间为一个很大的值防止刷怪
    gameScene.gameTime = 999999;
    
    // 清除所有现有敌人
    if (gameScene.enemies) {
      gameScene.enemies.clear(true, true);
    }
    
    // 停止敌人管理器的生成
    if (gameScene.enemyManager) {
      gameScene.enemyManager = null;
    }
    
    // 在GameScene中创建无敌木桩
    if (gameScene.player) {
      const player = gameScene.player;
      const dummy = gameScene.add.sprite(player.x + 400, player.y, "slime", 0);
      dummy.setScale(3);
      dummy.setTint(0x888888);
      gameScene.physics.add.existing(dummy);
      
      // 设置木桩为完全静止的无敌目标
      const dummyBody = dummy.body as Phaser.Physics.Arcade.Body;
      if (dummyBody) {
        dummyBody.setImmovable(true);
        dummyBody.moves = false;
        dummyBody.setVelocity(0, 0);
      }
      
      (dummy as any).hp = 999999;
      (dummy as any).maxHp = 999999;
      (dummy as any).speed = 0;
      (dummy as any).originalSpeed = 0;
      (dummy as any).iceValue = 0;
      (dummy as any).isFrozen = false;
      (dummy as any).expValue = 0;
      (dummy as any).enemyConfig = { isBoss: false };
      
      // 追踪木桩受到的伤害
      const originalHp = 999999;
      
      if (gameScene.enemies) {
        gameScene.enemies.add(dummy);
      }
      
      // 添加标签
      const label = gameScene.add.text(0, 0, "🎯 无敌木桩", {
        fontSize: "18px",
        color: "#ffff00",
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 },
      });
      label.setOrigin(0.5);
      label.setDepth(100);
      
      // 保持标签位置和木桩无敌状态，同时追踪伤害
      gameScene.events.on('update', () => {
        if (dummy.active) {
          label.x = dummy.x;
          label.y = dummy.y - 70;
          
          // 计算受到的伤害
          const currentHp = (dummy as any).hp;
          if (currentHp < originalHp) {
            const damageTaken = originalHp - currentHp;
            this.totalDamage += damageTaken;
            this.damageHistory.push({ damage: damageTaken, time: Date.now() });
            
            // 恢复血量
            (dummy as any).hp = originalHp;
          }
          
          // 确保木桩完全静止
          if (dummyBody) {
            dummyBody.setVelocity(0, 0);
          }
        }
      });
    }
    
    // 在GameScene上添加测试模式UI
    const testHint = gameScene.add.text(10, 10, "🧪 测试模式 | ESC: 返回菜单", {
      fontSize: "20px",
      color: "#ffff00",
      backgroundColor: "#000000",
      padding: { x: 10, y: 8 },
    });
    testHint.setScrollFactor(0);
    testHint.setDepth(10000);
    
    // 添加秒伤统计显示
    this.dpsText = gameScene.add.text(10, 50, "", {
      fontSize: "18px",
      color: "#00ff00",
      backgroundColor: "#000000",
      padding: { x: 10, y: 8 },
    });
    this.dpsText!.setScrollFactor(0);
    this.dpsText!.setDepth(10000);
    
    // 添加技能选择面板
    this.createSkillPanel(gameScene);
    
    // 停止当前场景的渲染（让GameScene可见）
    this.scene.setVisible(false, "TestScene");
    this.scene.bringToTop("GameScene");
  }
  
  createSkillPanel(gameScene: any) {
    const panelX = this.cameras.main.width - 220;
    const panelY = 10;
    const panelWidth = 210;
    
    // 面板背景
    const panelBg = gameScene.add.rectangle(
      panelX,
      panelY,
      panelWidth,
      this.cameras.main.height - 20,
      0x000000,
      0.8
    );
    panelBg.setOrigin(0, 0);
    panelBg.setScrollFactor(0);
    panelBg.setDepth(9999);
    
    // 面板标题
    const title = gameScene.add.text(panelX + 10, panelY + 10, "🎮 技能选择", {
      fontSize: "20px",
      color: "#ffff00",
      fontFamily: "Arial",
      fontStyle: "bold"
    });
    title.setScrollFactor(0);
    title.setDepth(10000);
    
    // 创建技能按钮
    let yOffset = 50;
    SKILL_CONFIGS.forEach(skill => {
      const button = gameScene.add.text(
        panelX + 10,
        panelY + yOffset,
        skill.name,
        {
          fontSize: "14px",
          color: skill.color,
          fontFamily: "Arial",
          backgroundColor: "#222222",
          padding: { x: 8, y: 4 }
        }
      );
      button.setScrollFactor(0);
      button.setDepth(10000);
      button.setInteractive({ useHandCursor: true });
      
      button.on('pointerover', () => {
        button.setScale(1.05);
        button.setStyle({ backgroundColor: "#444444" });
      });
      
      button.on('pointerout', () => {
        button.setScale(1);
        button.setStyle({ backgroundColor: "#222222" });
      });
      
      button.on('pointerdown', () => {
        this.applySkill(gameScene, skill.id);
        button.setStyle({ color: "#00ff00" });
        this.time.delayedCall(200, () => {
          button.setStyle({ color: skill.color });
        });
      });
      
      yOffset += 30;
    });
  }
  
  applySkill(gameScene: any, skillId: string) {
    if (!gameScene.skillManager) return;
    
    // 找到技能配置
    const skill = SKILL_CONFIGS.find(s => s.id === skillId);
    if (!skill) return;
    
    // 使用GameScene的applySkill方法来应用技能
    gameScene.applySkill(skill);
    console.log(`[TestScene] 应用技能: ${skill.name}`, gameScene.skillManager.stats);
  }

  update() {
    // ESC返回菜单
    const escKey = this.input.keyboard!.addKey('ESC');
    if (Phaser.Input.Keyboard.JustDown(escKey)) {
      this.scene.stop("GameScene");
      this.scene.start("MenuScene");
    }
    
    // 更新秒伤统计
    if (this.dpsText) {
      const now = Date.now();
      const elapsedSeconds = (now - this.startTime) / 1000;
      
      // 计算最近1秒的伤害（即时DPS）
      const oneSecondAgo = now - 1000;
      this.damageHistory = this.damageHistory.filter(d => d.time > oneSecondAgo);
      const recentDamage = this.damageHistory.reduce((sum, d) => sum + d.damage, 0);
      
      // 计算平均DPS
      const avgDps = elapsedSeconds > 0 ? this.totalDamage / elapsedSeconds : 0;
      
      this.dpsText.setText(
        `总伤害: ${this.totalDamage.toFixed(0)}\n` +
        `平均DPS: ${avgDps.toFixed(1)}\n` +
        `瞬时DPS: ${recentDamage.toFixed(1)}`
      );
    }
  }
}
