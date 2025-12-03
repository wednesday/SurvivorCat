import Phaser from "phaser";
import { SkillManager } from "../systems/SkillManager";
import { MapManager } from "../systems/MapManager";
import { ExplosionSystem } from "../systems/ExplosionSystem";
import { EnemyManager, Enemy } from "../systems/EnemyManager";
import { getRandomSkills, SkillConfig } from "../config/SkillConfig";
import { SaveManager } from "../systems/SaveManager";
import { CUSTOM_DECORATION_CONFIG } from "../config/MapDecorationConfig";

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private bossProjectiles!: Phaser.Physics.Arcade.Group; // Boss子弹
  private expOrbs!: Phaser.Physics.Arcade.Group;
  private magnetItems!: Phaser.Physics.Arcade.Group; // 磁力收集物
  private treasureChests!: Phaser.Physics.Arcade.Group; // 宝箱
  private coins!: Phaser.Physics.Arcade.Group; // 金币

  // 技能管理系统
  private skillManager!: SkillManager;
  private explosionSystem!: ExplosionSystem;
  private enemyManager!: EnemyManager;
  private mapManager!: MapManager;
  
  // 加载进度UI
  private loadingOverlay: Phaser.GameObjects.Rectangle | null = null;
  private loadingBar: Phaser.GameObjects.Rectangle | null = null;
  private loadingBarBg: Phaser.GameObjects.Rectangle | null = null;
  private loadingText: Phaser.GameObjects.Text | null = null;

  // 玩家基础属性
  private playerHP = 100;
  private playerLevel = 1;
  private exp = 0;
  private expToNextLevel = 10;
  private isPlayerHurt = false; // 玩家受伤状态

  // 游戏定时器
  private projectileTimer = 0;
  private laserTimer = 0;

  // 轨道系统
  private orbitals: Phaser.GameObjects.Sprite[] = [];
  private orbitalRotation = 0;
  private orbitalSpeedBase = 0.05; // 基础旋转速度

  // 激光系统
  private lasers: Phaser.GameObjects.Rectangle[] = [];

  private killCount = 0;
  private gameTime = 0;
  private bonusLevelCount = 0; // 连续升级次数统计
  private bonusLevelChain = 0; // 当前连续升级链计数
  private coinsCollected = 0; // 本局收集的金币

  // 难度提升相关
  private difficultyLevel = 1;
  private lastDifficultyIncreaseTime = 0;
  private difficultyIncreaseInterval = 60; // 1分钟 = 60秒

  // 地图尺寸
  private mapWidth = 3000;
  private mapHeight = 3000;

  // UI 文本
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private expText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private diffText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;

  // 暂停相关
  private isPaused = false;
  private pauseOverlay!: Phaser.GameObjects.Rectangle;
  private pauseText!: Phaser.GameObjects.Text;
  private pauseHintText!: Phaser.GameObjects.Text;
  private pauseStatsPanel: Phaser.GameObjects.Container | null = null;
  private isUpgrading = false; // 防止升级UI重叠

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    // 资源已在 MenuScene 中预加载，这里不需要重复加载
    // 如果需要额外的游戏场景专属资源，可以在这里加载
  }

  create() {
    // 设置物理世界边界
    this.physics.world.setBounds(
      -this.mapWidth / 2,
      -this.mapHeight / 2,
      this.mapWidth,
      this.mapHeight
    );

    // 创建玩家动画
    if (!this.anims.exists("cat-idle-anim")) {
      this.anims.create({
        key: "cat-idle-anim",
        frames: this.anims.generateFrameNumbers("cat-idle", {
          start: 0,
          end: 2,
        }),
        frameRate: 6,
        repeat: -1,
      });
    }

    if (!this.anims.exists("cat-walk-anim")) {
      this.anims.create({
        key: "cat-walk-anim",
        frames: this.anims.generateFrameNumbers("cat-walk", {
          start: 0,
          end: 2,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists("cat-ducking-anim")) {
      this.anims.create({
        key: "cat-ducking-anim",
        frames: this.anims.generateFrameNumbers("cat-ducking", {
          start: 0,
          end: 2,
        }),
        frameRate: 8,
        repeat: 0, // 只播放一次
      });
    }

    // 创建玩家（使用猫咪精灵）
    this.player = this.add.sprite(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      "cat-idle"
    ) as any;
    this.player.setScale(2); // 放大2倍
    this.player.play("cat-idle-anim");

    this.physics.add.existing(this.player);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    // 移除世界边界限制，允许无限移动
    playerBody.setCollideWorldBounds(false);
    playerBody.setSize(16, 20); // 缩小碰撞体积
    playerBody.setOffset(8, 12); // 调整碰撞框位置，使其更贴合猫咪身体

    // 创建敌人组
    this.enemies = this.physics.add.group();

    // 创建抛射物组
    this.projectiles = this.physics.add.group();
    
    // 创建Boss子弹组
    this.bossProjectiles = this.physics.add.group();

    // 创建经验球组
    this.expOrbs = this.physics.add.group();

    // 创建磁力收集物组
    this.magnetItems = this.physics.add.group();

    // 创建宝箱组
    this.treasureChests = this.physics.add.group();

    // 创建金币组
    this.coins = this.physics.add.group();

    // 初始化技能管理系统（每次create时重置）
    if (!this.skillManager) {
      this.skillManager = new SkillManager();
      this.explosionSystem = new ExplosionSystem(this);
    } else {
      this.skillManager.reset();
    }

    // 初始化敌人管理器（在enemies组创建之后）
    if (!this.enemyManager) {
      this.enemyManager = new EnemyManager(
        this,
        this.enemies,
        this.player,
        this.mapWidth,
        this.mapHeight
      );
    } else {
      this.enemyManager.reset();
    }

    // 设置初始难度
    this.enemyManager.setDifficulty(this.difficultyLevel);

    // 重置玩家状态
    this.playerHP = this.skillManager.stats.maxHP;
    this.playerLevel = 1;
    this.exp = 0;
    this.expToNextLevel = 10;
    this.killCount = 0;
    this.coinsCollected = 0;
    this.gameTime = 0;
    this.bonusLevelCount = 0;
    this.bonusLevelChain = 0;
    this.difficultyLevel = 1;
    this.lastDifficultyIncreaseTime = 0;

    // 清空轨道球
    this.orbitals = [];
    this.orbitalRotation = 0;

    // 清空激光
    this.lasers = [];

    // 碰撞检测
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.hitEnemy as any,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.hitPlayer as any,
      undefined,
      this
    );
    
    // Boss子弹与玩家碰撞
    this.physics.add.overlap(
      this.player,
      this.bossProjectiles,
      this.hitPlayerByBossProjectile as any,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.expOrbs,
      this.collectExp as any,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.magnetItems,
      this.collectMagnetItem as any,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.treasureChests,
      this.openTreasureChest as any,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.coins,
      this.collectCoin as any,
      undefined,
      this
    );

    // 轨道球与敌人的碰撞检测（将在update中手动检测）

    // 设置键盘输入
    this.cursors = this.input.keyboard!.createCursorKeys();

    // 添加暂停键监听（ESC 或 P）
    this.input.keyboard!.on("keydown-ESC", this.togglePause, this);
    this.input.keyboard!.on("keydown-P", this.togglePause, this);

    // 初始化技能管理系统
    this.skillManager = new SkillManager();
    this.explosionSystem = new ExplosionSystem(this);
    
    // 初始化无限地图管理器
    this.mapManager = new MapManager(this, CUSTOM_DECORATION_CONFIG);
    
    // 设置与障碍物的碰撞
    const obstacles = this.mapManager.getObstaclesGroup();
    if (obstacles) {
      // 玩家与障碍物碰撞
      this.physics.add.collider(this.player, obstacles);
      
      // 敌人与障碍物碰撞
      this.physics.add.collider(this.enemies, obstacles);
      
      // 玩家子弹与障碍物碰撞（子弹被阻挡）
      this.physics.add.collider(this.projectiles, obstacles, (projectile: any) => {
        if (projectile && projectile.active) {
          projectile.destroy();
        }
      });
      
      // Boss子弹与障碍物碰撞（子弹被阻挡）
      this.physics.add.collider(this.bossProjectiles, obstacles, (projectile: any) => {
        if (projectile && projectile.active) {
          projectile.destroy();
        }
      });
    }

    // 创建 UI
    this.createUI();

    // 创建史莱姆动画
    this.createSlimeAnimations();
  }

  createSlimeAnimations() {
    // 检查资源是否加载成功
    if (!this.textures.exists("slime-red")) {
      console.error("Slime textures not loaded!");
      return;
    }

    // 红色史莱姆动画
    if (!this.anims.exists("slime-red-idle")) {
      this.anims.create({
        key: "slime-red-idle",
        frames: this.anims.generateFrameNumbers("slime-red", {
          start: 0,
          end: 12,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // 蓝色史莱姆动画
    if (!this.anims.exists("slime-blue-idle")) {
      this.anims.create({
        key: "slime-blue-idle",
        frames: this.anims.generateFrameNumbers("slime-blue", {
          start: 0,
          end: 12,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // 绿色史莱姆动画
    if (!this.anims.exists("slime-green-idle")) {
      this.anims.create({
        key: "slime-green-idle",
        frames: this.anims.generateFrameNumbers("slime-green", {
          start: 0,
          end: 12,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // 黄色史莱姆动画
    if (!this.anims.exists("slime-yellow-idle")) {
      this.anims.create({
        key: "slime-yellow-idle",
        frames: this.anims.generateFrameNumbers("slime-yellow", {
          start: 0,
          end: 12,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // Boss动画 - BugBit
    if (this.textures.exists("bugbit") && !this.anims.exists("bugbit-walk")) {
      try {
        const frameCount = this.textures.get("bugbit").frameTotal;
        this.anims.create({
          key: "bugbit-walk",
          frames: this.anims.generateFrameNumbers("bugbit", {
            start: 0,
            end: Math.min(3, frameCount - 1),
          }),
          frameRate: 8,
          repeat: -1,
        });
      } catch (e) {
        console.warn("Failed to create bugbit-walk animation:", e);
      }
    }

    // Boss动画 - Pebblin
    if (this.textures.exists("pebblin") && !this.anims.exists("pebblin-idle")) {
      try {
        const frameCount = this.textures.get("pebblin").frameTotal;
        this.anims.create({
          key: "pebblin-idle",
          frames: this.anims.generateFrameNumbers("pebblin", {
            start: 0,
            end: Math.min(3, frameCount - 1),
          }),
          frameRate: 6,
          repeat: -1,
        });
      } catch (e) {
        console.warn("Failed to create pebblin-idle animation:", e);
      }
    }

    // Boss动画 - Spora
    if (this.textures.exists("spora") && !this.anims.exists("spora-move")) {
      try {
        const frameCount = this.textures.get("spora").frameTotal;
        this.anims.create({
          key: "spora-move",
          frames: this.anims.generateFrameNumbers("spora", {
            start: 0,
            end: Math.min(3, frameCount - 1),
          }),
          frameRate: 7,
          repeat: -1,
        });
      } catch (e) {
        console.warn("Failed to create spora-move animation:", e);
      }
    }

    // Boss动画 - Spookmoth
    if (
      this.textures.exists("spookmoth") &&
      !this.anims.exists("spookmoth-fly")
    ) {
      try {
        const frameCount = this.textures.get("spookmoth").frameTotal;
        this.anims.create({
          key: "spookmoth-fly",
          frames: this.anims.generateFrameNumbers("spookmoth", {
            start: 0,
            end: Math.min(3, frameCount - 1),
          }),
          frameRate: 10,
          repeat: -1,
        });
      } catch (e) {
        console.warn("Failed to create spookmoth-fly animation:", e);
      }
    }

    // Boss动画 - Slub
    // if (this.textures.exists('slub') && !this.anims.exists('slub-idle')) {
    //   try {
    //     // Slub精灵图有5行，每行5帧，只使用第一行（0-4帧）
    //     this.anims.create({
    //       key: 'slub-idle',
    //       frames: this.anims.generateFrameNumbers('slub', { start: 0, end: 4 }),
    //       frameRate: 8,
    //       repeat: -1
    //     });
    //   } catch (e) {
    //     console.warn('Failed to create slub-idle animation:', e);
    //   }
    // }
  }

  createUI() {
    const style = { fontSize: "18px", color: "#ffffff", fontFamily: "Arial" };

    this.hpText = this.add.text(
      10,
      10,
      `HP: ${this.playerHP}/${this.skillManager.stats.maxHP}`,
      style
    );
    this.levelText = this.add.text(10, 35, `Level: ${this.playerLevel}`, style);
    this.expText = this.add.text(
      10,
      60,
      `EXP: ${this.exp}/${this.expToNextLevel}`,
      style
    );
    this.timeText = this.add.text(10, 85, `Time: 0:00`, style);
    this.killText = this.add.text(10, 110, `Kills: ${this.killCount}`, style);
    this.coinText = this.add.text(10, 135, `Coins: ${this.coinsCollected}`, {
      fontSize: "18px",
      color: "#ffd700",
      fontFamily: "Arial",
    });
    this.coinText.setScrollFactor(0);

    // 添加难度等级显示
    this.diffText = this.add.text(
      10,
      160,
      `难度: ${this.difficultyLevel}`,
      style
    );
    this.diffText.setScrollFactor(0);

    // 添加暂停提示
    const pauseHint = this.add.text(
      this.cameras.main.width - 10,
      10,
      "ESC/P: 暂停",
      {
        fontSize: "14px",
        color: "#888888",
        fontFamily: "Arial",
      }
    );
    pauseHint.setOrigin(1, 0);
    pauseHint.setScrollFactor(0);

    // 设置 UI 为固定位置
    this.hpText.setScrollFactor(0);
    this.levelText.setScrollFactor(0);
    this.expText.setScrollFactor(0);
    this.timeText.setScrollFactor(0);
    this.killText.setScrollFactor(0);

    // 创建暂停UI（初始隐藏）
    this.createPauseUI();
  }

  createPauseUI() {
    // 半透明黑色遮罩
    this.pauseOverlay = this.add.rectangle(
      0,
      0,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    );
    this.pauseOverlay.setOrigin(0);
    this.pauseOverlay.setScrollFactor(0);
    this.pauseOverlay.setDepth(1000);
    this.pauseOverlay.setVisible(false);

    // 暂停文字
    this.pauseText = this.add.text(
      this.cameras.main.centerX - 250,
      this.cameras.main.centerY - 200,
      "游戏已暂停",
      {
        fontSize: "48px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    this.pauseText.setOrigin(0.5);
    this.pauseText.setScrollFactor(0);
    this.pauseText.setDepth(1001);
    this.pauseText.setVisible(false);

    // 提示文字
    this.pauseHintText = this.add.text(
      this.cameras.main.centerX - 250,
      this.cameras.main.centerY + 220,
      "按 ESC 或 P 键继续游戏",
      {
        fontSize: "24px",
        color: "#ffff00",
        fontFamily: "Arial",
      }
    );
    this.pauseHintText.setOrigin(0.5);
    this.pauseHintText.setScrollFactor(0);
    this.pauseHintText.setDepth(1001);
    this.pauseHintText.setVisible(false);
  }

  togglePause() {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      // 暂停游戏
      this.physics.pause();
      this.pauseOverlay.setVisible(true);
      this.pauseText.setVisible(true);
      this.pauseHintText.setVisible(true);
      
      // 创建技能统计面板
      this.createPauseStatsPanel();

      // 添加闪烁效果
      this.tweens.add({
        targets: this.pauseHintText,
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    } else {
      // 恢复游戏
      this.physics.resume();
      this.pauseOverlay.setVisible(false);
      this.pauseText.setVisible(false);
      this.pauseHintText.setVisible(false);
      
      // 销毁技能统计面板
      if (this.pauseStatsPanel) {
        this.pauseStatsPanel.destroy();
        this.pauseStatsPanel = null;
      }

      // 停止闪烁效果
      this.tweens.killTweensOf(this.pauseHintText);
      this.pauseHintText.setAlpha(1);
    }
  }
  
  createPauseStatsPanel() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    
    // 创建容器（右侧）
    this.pauseStatsPanel = this.add.container(centerX + 250, centerY);
    this.pauseStatsPanel.setScrollFactor(0);
    this.pauseStatsPanel.setDepth(1002);
    
    // 面板背景
    const panelBg = this.add.rectangle(0, 0, 450, 550, 0x222222, 0.95);
    panelBg.setStrokeStyle(4, 0xffaa00);
    this.pauseStatsPanel.add(panelBg);
    
    // 标题
    const title = this.add.text(0, -230, '技能统计', {
      fontSize: '32px',
      color: '#ffaa00',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this.pauseStatsPanel.add(title);
    
    // 统计数据
    const stats = [
      { label: '移动速度', value: this.skillManager.stats.moveSpeed.toFixed(0) },
      { label: '子弹数量', value: this.skillManager.stats.projectileCount.toString() },
      { label: '子弹伤害', value: this.skillManager.stats.projectileDamage.toString() },
      { label: '攻击速度', value: (1000 / this.skillManager.getProjectileRate(1000)).toFixed(2) + '/s' },
      { label: '轨道球数量', value: this.orbitals.length.toString() },
      { label: '轨道球伤害', value: this.skillManager.stats.orbitalDamage.toString() },
      { label: '轨道球伤害', value: this.skillManager.stats.orbitalDamage.toString() },
      { label: '轨道球伤害', value: this.skillManager.stats.orbitalDamage.toString() },
      { label: '激光数量', value: this.skillManager.stats.laserCount.toString() },
      { label: '激光伤害', value: this.skillManager.stats.laserDamage.toString() },
      { label: '拾取范围', value: this.skillManager.stats.pickupRange.toFixed(0) },
      { label: '经验加成', value: (this.skillManager.stats.expGainMultiplier * 100).toFixed(0) + '%' },
      { label: '爆炸几率', value: this.skillManager.stats.explosionEnabled 
          ? (this.skillManager.stats.explosionChance * 100).toFixed(0) + '%' 
          : '未解锁' },
      { label: '爆炸伤害', value: this.skillManager.stats.explosionEnabled 
          ? this.skillManager.stats.explosionDamage.toString() 
          : '未解锁' },
      { label: '爆炸范围', value: this.skillManager.stats.explosionEnabled 
          ? this.skillManager.stats.explosionRadius.toFixed(0) 
          : '未解锁' }
    ];
    
    // 显示统计项（单列布局）
    const startY = -180;
    const lineHeight = 28;
    
    stats.forEach((stat, index) => {
      const y = startY + index * lineHeight;
      
      const text = this.add.text(0, y, `${stat.label}: ${stat.value}`, {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial'
      });
      text.setOrigin(0.5, 0.5);
      if (this.pauseStatsPanel) {
        this.pauseStatsPanel.add(text);
      }
    });
  }


  showLoadingProgress() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    
    // 半透明背景
    this.loadingOverlay = this.add.rectangle(
      centerX, centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000, 0.7
    );
    this.loadingOverlay.setScrollFactor(0);
    this.loadingOverlay.setDepth(10000);
    
    // 加载文本
    this.loadingText = this.add.text(
      centerX, centerY - 50,
      '生成地图中...',
      {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }
    );
    this.loadingText.setOrigin(0.5);
    this.loadingText.setScrollFactor(0);
    this.loadingText.setDepth(10001);
    
    // 进度条背景
    this.loadingBarBg = this.add.rectangle(
      centerX, centerY + 20,
      400, 30,
      0x333333
    );
    this.loadingBarBg.setScrollFactor(0);
    this.loadingBarBg.setDepth(10001);
    this.loadingBarBg.setStrokeStyle(2, 0xffffff);
    
    // 进度条
    this.loadingBar = this.add.rectangle(
      centerX - 200, centerY + 20,
      0, 26,
      0x00ff00
    );
    this.loadingBar.setOrigin(0, 0.5);
    this.loadingBar.setScrollFactor(0);
    this.loadingBar.setDepth(10002);
  }
  
  updateLoadingProgress(progress: number) {
    if (this.loadingBar) {
      this.loadingBar.width = 400 * progress;
    }
    if (this.loadingText) {
      this.loadingText.setText(`生成地图中... ${Math.floor(progress * 100)}%`);
    }
  }
  
  hideLoadingProgress() {
    if (this.loadingOverlay) {
      this.tweens.add({
        targets: this.loadingOverlay,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          if (this.loadingOverlay) this.loadingOverlay.destroy();
          this.loadingOverlay = null;
        }
      });
    }
    
    if (this.loadingBar) {
      this.loadingBar.destroy();
      this.loadingBar = null;
    }
    
    if (this.loadingBarBg) {
      this.loadingBarBg.destroy();
      this.loadingBarBg = null;
    }
    
    if (this.loadingText) {
      this.tweens.add({
        targets: this.loadingText,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          if (this.loadingText) this.loadingText.destroy();
          this.loadingText = null;
        }
      });
    }
  }


  shootProjectile() {
    if (this.enemies.getChildren().length === 0) return;

    // 找到最近的几个敌人（根据子弹数量）
    const targets: any[] = [];
    const enemyList = this.enemies.getChildren().slice();

    // 按距离排序
    enemyList.sort((a: any, b: any) => {
      const distA = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        a.x,
        a.y
      );
      const distB = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        b.x,
        b.y
      );
      return distA - distB;
    });

    // 选择最近的N个敌人
    for (
      let i = 0;
      i < Math.min(this.skillManager.stats.projectileCount, enemyList.length);
      i++
    ) {
      targets.push(enemyList[i]);
    }

    // 向每个目标发射子弹
    targets.forEach((target: any) => {
      // 创建抛射物（使用第4行子弹，帧15-19）
      const projectile = this.add.sprite(
        this.player.x,
        this.player.y,
        'bullet-sheet',
        20 // 第4行第1帧 (行索引从0开始，所以第4行=3*5=15)
      );
      
      // 播放子弹动画（第4行的5帧）
      const bulletAnimKey = 'bullet-type4-anim';
      if (!this.anims.exists(bulletAnimKey)) {
        this.anims.create({
          key: bulletAnimKey,
          frames: this.anims.generateFrameNumbers('bullet-sheet', {
            start: 20, // 第4行第1帧
            end: 24    // 第4行第5帧
          }),
          frameRate: 10,
          repeat: -1
        });
      }
      projectile.play(bulletAnimKey);
      projectile.setScale(1.5); // 放大1.5倍使其更明显
      
      this.physics.add.existing(projectile);
      this.projectiles.add(projectile);

      // 计算方向
      const angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        target.x,
        target.y
      );
      
      // 根据飞行方向旋转子弹（sprite默认方向为右，即0度）
      projectile.setRotation(angle);

      const projectileBody = projectile.body as Phaser.Physics.Arcade.Body;
      if (projectileBody) {
        const speed = 400 * this.skillManager.stats.projectileSpeedMultiplier;
        projectileBody.setVelocity(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed
        );
      }

      // 2秒后销毁
      this.time.delayedCall(2000, () => {
        if (projectile.active) {
          projectile.destroy();
        }
      });
    });
  }

  shootLaser() {
    if (this.skillManager.stats.laserCount <= 0) return;
    if (this.enemies.getChildren().length === 0) return;

    // 找到最近的敌人作为激光方向
    const enemyList = this.enemies.getChildren().slice();

    // 按距离排序
    enemyList.sort((a: any, b: any) => {
      const distA = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        a.x,
        a.y
      );
      const distB = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        b.x,
        b.y
      );
      return distA - distB;
    });

    // 选择最近的N个敌人（N = laserCount）
    const targetCount = Math.min(
      this.skillManager.stats.laserCount,
      enemyList.length
    );

    for (let i = 0; i < targetCount; i++) {
      const enemy = enemyList[i] as any;
      if (enemy && enemy.active) {
        const angle = Phaser.Math.Angle.Between(
          this.player.x,
          this.player.y,
          enemy.x,
          enemy.y
        );

        // 创建激光束（长矩形）
        const laserLength = 800;
        const laser = this.add.rectangle(
          this.player.x,
          this.player.y,
          laserLength,
          6,
          0x00ffff
        );
        laser.setRotation(angle);
        laser.setOrigin(0, 0.5);
        laser.setAlpha(0.8);

        this.physics.add.existing(laser);
        const body = laser.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.setSize(laserLength, 6);
        }

        this.lasers.push(laser);

        // 激光效果：从细变粗再变细
        this.tweens.add({
          targets: laser,
          scaleY: 2,
          alpha: 1,
          duration: 100,
          yoyo: true,
          repeat: 1,
        });

        // 激光持续时间后销毁
        this.time.delayedCall(this.skillManager.stats.laserDuration, () => {
          const index = this.lasers.indexOf(laser);
          if (index > -1) {
            this.lasers.splice(index, 1);
          }
          if (laser.active) {
            laser.destroy();
          }
        });
      }
    }
  }

  hitEnemy(projectile: any, enemy: any) {
    projectile.destroy();

    const damage = this.skillManager.stats.projectileDamage;
    enemy.hp -= damage;
    
    // 显示伤害数字
    this.showDamageText(enemy.x, enemy.y - 20, damage);

    // 闪烁效果
    this.tweens.add({
      targets: enemy,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
    });

    // 检查是否触发爆炸
    if (
      this.skillManager.stats.explosionEnabled &&
      Math.random() < this.skillManager.stats.explosionChance
    ) {
      this.explosionSystem.createExplosion(
        enemy.x,
        enemy.y,
        this.skillManager.stats.explosionDamage,
        this.skillManager.stats.explosionRadius,
        this.enemies,
        (hitEnemy, damage) => this.damageEnemy(hitEnemy, damage)
      );
    }

    if (enemy.hp <= 0) {
      const expValue = (enemy as any).expValue || 1;
      const isBoss = (enemy as any).enemyConfig?.isBoss || false;

      // Boss掉落宝箱和更多金币，普通敌人掉落经验球和金币
      if (isBoss) {
        this.spawnTreasureChest(enemy.x, enemy.y);
        // Boss掉落更多金币
        this.spawnCoin(enemy.x + 20, enemy.y, 10);
        this.spawnCoin(enemy.x - 20, enemy.y, 10);
      } else {
        this.spawnExpOrb(enemy.x, enemy.y, expValue);

        // 30%概率掉落金币
        if (Math.random() < 0.3) {
          this.spawnCoin(
            enemy.x + Math.random() * 4,
            enemy.y + Math.random() * 4,
            1
          );
        }

        // 1%概率掉落磁力收集物
        if (Math.random() < 0.01) {
          this.spawnMagnetItem(enemy.x, enemy.y);
        }
      }

      enemy.destroy();
      this.killCount++;
      this.killText.setText(`Kills: ${this.killCount}`);
    }
  }

  // 辅助方法 - 对敌人造成伤害
  damageEnemy(enemy: any, damage: number) {
    if (!enemy.active) return;

    enemy.hp -= damage;
    
    // 显示伤害数字
    this.showDamageText(enemy.x, enemy.y - 20, damage);

    // 闪烁效果
    this.tweens.add({
      targets: enemy,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
    });

    if (enemy.hp <= 0) {
      const expValue = (enemy as any).expValue || 1;
      const isBoss = (enemy as any).enemyConfig?.isBoss || false;

      // Boss掉落宝箱和更多金币，普通敌人掉落经验球和金币
      if (isBoss) {
        this.spawnTreasureChest(enemy.x, enemy.y);
        // Boss掉落更多金币
        this.spawnCoin(enemy.x + 20, enemy.y, 10);
        this.spawnCoin(enemy.x - 20, enemy.y, 10);
      } else {
        this.spawnExpOrb(enemy.x, enemy.y, expValue);

        // 30%概率掉落金币
        if (Math.random() < 0.3) {
          this.spawnCoin(enemy.x, enemy.y, 1);
        }

        // 1%概率掉落磁力收集物
        if (Math.random() < 0.01) {
          this.spawnMagnetItem(enemy.x, enemy.y);
        }
      }

      enemy.destroy();
      this.killCount++;
      this.killText.setText(`Kills: ${this.killCount}`);
    }
  }

  hitEnemyWithLaser(enemy: any) {
    if (!enemy || !enemy.active) return;

    // 检查是否已经被这一帧的激光击中过（避免重复伤害）
    if (enemy.laserHitThisFrame) return;
    enemy.laserHitThisFrame = true;

    // 下一帧重置
    this.time.delayedCall(50, () => {
      if (enemy.active) {
        enemy.laserHitThisFrame = false;
      }
    });

    const damage = this.skillManager.stats.laserDamage;
    enemy.hp -= damage;
    
    // 显示伤害数字
    this.showDamageText(enemy.x, enemy.y - 20, damage);

    // 激光命中效果（青色闪烁）
    this.tweens.add({
      targets: enemy,
      tint: 0x00ffff,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        if (enemy.active) {
          enemy.clearTint();
        }
      },
    });

    if (enemy.hp <= 0) {
      const expValue = (enemy as any).expValue || 1;
      const isBoss = (enemy as any).enemyConfig?.isBoss || false;

      // Boss掉落宝箱和更多金币，普通敌人掉落经验球和金币
      if (isBoss) {
        this.spawnTreasureChest(enemy.x, enemy.y);
        // Boss掉落更多金币
        this.spawnCoin(enemy.x + 20, enemy.y, 10);
        this.spawnCoin(enemy.x - 20, enemy.y, 10);
      } else {
        this.spawnExpOrb(enemy.x, enemy.y, expValue);

        // 30%概率掉落金币
        if (Math.random() < 0.3) {
          this.spawnCoin(enemy.x, enemy.y, 1);
        }

        // 1%概率掉落磁力收集物
        if (Math.random() < 0.01) {
          this.spawnMagnetItem(enemy.x, enemy.y);
        }
      }

      enemy.destroy();
      this.killCount++;
      this.killText.setText(`Kills: ${this.killCount}`);
    }
  }

  hitPlayer(player: any, enemy: any) {
    const expValue = (enemy as any).expValue || 1;
    enemy.destroy();
    this.playerHP -= 10;
    this.hpText.setText(
      `HP: ${this.playerHP}/${this.skillManager.stats.maxHP}`
    );

    // 设置受伤状态
    this.isPlayerHurt = true;

    // 播放蹲下动画（受伤效果）
    this.player.play("cat-ducking-anim");

    // 动画结束后恢复到idle并清除受伤状态
    this.player.once("animationcomplete", () => {
      this.isPlayerHurt = false;
      if (this.player.active && this.playerHP > 0) {
        this.player.play("cat-idle-anim");
      }
    });

    // 玩家受伤闪烁
    this.tweens.add({
      targets: this.player,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 3,
    });

    if (this.playerHP <= 0) {
      this.gameOver();
    }
  }
  
  // Boss子弹击中玩家
  hitPlayerByBossProjectile(player: any, projectile: any) {
    const damage = (projectile as any).damage || 5;
    projectile.destroy();
    
    this.playerHP -= damage;
    this.hpText.setText(
      `HP: ${this.playerHP}/${this.skillManager.stats.maxHP}`
    );

    // 设置受伤状态
    this.isPlayerHurt = true;

    // 播放蹲下动画（受伤效果）
    this.player.play("cat-ducking-anim");

    // 动画结束后恢复到idle并清除受伤状态
    this.player.once("animationcomplete", () => {
      this.isPlayerHurt = false;
      if (this.player.active && this.playerHP > 0) {
        this.player.play("cat-idle-anim");
      }
    });

    // 玩家受伤闪烁
    this.tweens.add({
      targets: this.player,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 3,
    });

    if (this.playerHP <= 0) {
      this.gameOver();
    }
  }
  
  // Boss攻击系统
  bossAttack(boss: any) {
    if (!boss.active || !this.player.active) return;
    
    const bossType = (boss as any).enemyType;
    const bossX = boss.x;
    const bossY = boss.y;
    
    // 计算朝向玩家的角度
    const angleToPlayer = Phaser.Math.Angle.Between(
      bossX, bossY,
      this.player.x, this.player.y
    );
    
    switch(bossType) {
      case 'bugbit':
        // BugBit: 单发子弹
        this.createBossProjectile(bossX, bossY, angleToPlayer, 5, 300);
        break;
        
      case 'pebblin':
        // Pebblin: 扇形3发子弹
        const spreadAngle = Math.PI / 6; // 30度
        for (let i = -1; i <= 1; i++) {
          const angle = angleToPlayer + i * spreadAngle / 2;
          this.createBossProjectile(bossX, bossY, angle, 8, 250);
        }
        break;
        
      case 'spora':
        // Spora: 12发子弹（圆形发散）
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 / 12) * i;
          this.createBossProjectile(bossX, bossY, angle, 10, 200);
        }
        break;
        
      case 'spookmoth':
        // Spookmoth: 8发弧形子弹
        for (let i = 0; i < 8; i++) {
          const angle = angleToPlayer + (i - 3.5) * (Math.PI / 8);
          this.createBossProjectile(bossX, bossY, angle, 10, 220, true);
        }
        break;
    }
  }
  
  // 创建Boss子弹
  createBossProjectile(
    x: number, 
    y: number, 
    angle: number, 
    damage: number, 
    speed: number,
    curved: boolean = false
  ) {
    const projectile = this.add.circle(x, y, 8, 0xff0000);
    this.physics.add.existing(projectile);
    this.bossProjectiles.add(projectile);
    
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    
    // 设置初始速度
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    body.setVelocity(vx, vy);
    
    // 保存属性
    (projectile as any).damage = damage;
    (projectile as any).initialAngle = angle;
    (projectile as any).curved = curved;
    (projectile as any).createdTime = this.gameTime;
    
    // 添加发光效果
    projectile.setAlpha(0.8);
    this.tweens.add({
      targets: projectile,
      scale: 1.3,
      alpha: 0.6,
      duration: 300,
      yoyo: true,
      repeat: -1
    });
    
    // 5秒后自动销毁
    this.time.delayedCall(5000, () => {
      if (projectile.active) {
        projectile.destroy();
      }
    });
  }

  spawnExpOrb(x: number, y: number, expValue: number = 1) {
    const orb = this.add.circle(x, y, 3, 0x00ffff);
    this.physics.add.existing(orb);
    this.expOrbs.add(orb);

    (orb as any).expValue = expValue;

    // 根据经验值调整大小和颜色
    const scale = 1 + (expValue - 1) * 0.1;
    orb.setScale(scale);

    // 高等级经验球使用不同颜色
    if (expValue >= 4) {
      orb.setFillStyle(0xffff00); // 黄色
    } else if (expValue >= 3) {
      orb.setFillStyle(0x00ff00); // 绿色
    } else if (expValue >= 2) {
      orb.setFillStyle(0x00aaff); // 淡蓝色
    }

    // 闪烁效果
    this.tweens.add({
      targets: orb,
      scale: scale * 1.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  collectExp(player: any, orb: any) {
    orb.destroy();
    const expGained = Math.ceil(
      orb.expValue * this.skillManager.stats.expGainMultiplier
    );
    this.exp += expGained;
    this.expText.setText(`EXP: ${this.exp}/${this.expToNextLevel}`);

    if (this.exp >= this.expToNextLevel) {
      this.levelUp();
    }
  }

  spawnCoin(x: number, y: number, coinValue: number = 1) {
    const coin = this.add.sprite(x, y, "coin-gif");
    coin.setScale(0.25);
    this.physics.add.existing(coin);
    this.coins.add(coin);

    (coin as any).coinValue = coinValue;

    // 闪烁效果
    this.tweens.add({
      targets: coin,
      scale: 0.3,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  collectCoin(player: any, coin: any) {
    const coinValue = (coin as any).coinValue || 1;
    this.coinsCollected += coinValue;
    this.coinText.setText(`Coins: ${this.coinsCollected}`);

    // 收集音效提示（可选）
    const text = this.add.text(coin.x, coin.y - 20, `+${coinValue}`, {
      fontSize: "16px",
      color: "#ffd700",
      fontFamily: "Arial",
      fontStyle: "bold",
    });
    text.setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });

    coin.destroy();
  }

  spawnMagnetItem(x: number, y: number) {
    // 创建金币磁力物（使用GIF）
    const magnet = this.add.circle(x, y, 5, 0xffd700);
    magnet.setScale(1.5);
    this.physics.add.existing(magnet);
    this.magnetItems.add(magnet);

    // 脉冲效果
    this.tweens.add({
      targets: magnet,
      scale: { from: 1.5, to: 2.0 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  collectMagnetItem(player: any, magnet: any) {
    // 收集所有屏幕内的经验球
    magnet.destroy();

    // 显示收集提示
    const text = this.add.text(this.player.x, this.player.y - 50, "MAGNET!", {
      fontSize: "32px",
      color: "#ffd700",
      fontFamily: "Arial",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4,
    });
    text.setOrigin(0.5);
    text.setDepth(1000);

    this.tweens.add({
      targets: text,
      y: text.y - 100,
      alpha: 0,
      duration: 1500,
      onComplete: () => {
        if (text.active) text.destroy();
      },
    });

    // 吸取所有经验球
    this.expOrbs.getChildren().forEach((orb: any) => {
      if (orb.active) {
        // 创建飞向玩家的动画
        this.tweens.add({
          targets: orb,
          x: this.player.x,
          y: this.player.y,
          duration: 300,
          ease: "Power2",
          onComplete: () => {
            if (orb.active && this.scene.isActive()) {
              this.exp += orb.expValue;
              this.expText.setText(`EXP: ${this.exp}/${this.expToNextLevel}`);
              orb.destroy();

              if (this.exp >= this.expToNextLevel) {
                this.levelUp();
              }
            }
          },
        });
      }
    });
  }

  spawnTreasureChest(x: number, y: number) {
    // 创建宝箱精灵
    const chest = this.add.sprite(x, y, 'treasure-chest');
    chest.setScale(1.5);
    chest.play('treasure-idle');
    this.physics.add.existing(chest);
    this.treasureChests.add(chest);

    // 添加宝箱标记属性
    (chest as any).isChest = true;


    // 跳动效果
    this.tweens.add({
      targets: chest,
      y: y - 10,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 显示Boss击败提示
    const bossText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 150,
      "🎉 Boss已击败! 宝箱出现! 🎉",
      {
        fontSize: "36px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      }
    );
    bossText.setOrigin(0.5);
    bossText.setScrollFactor(0);

    this.tweens.add({
      targets: bossText,
      alpha: 0,
      y: bossText.y - 80,
      duration: 3000,
      ease: "Power2",
      onComplete: () => {
        if (bossText.active) bossText.destroy();
      },
    });
  }

  openTreasureChest(player: any, chest: any) {
    if (!chest.active || !(chest as any).isChest) return;

    // 销毁宝箱
    chest.destroy();

    // 宝箱爆炸效果
    const particles = [];
    for (let i = 0; i < 20; i++) {
      const particle = this.add.circle(chest.x, chest.y, 5, 0xffd700);
      particles.push(particle);

      const angle = (i / 20) * Math.PI * 2;
      const distance = Phaser.Math.Between(50, 150);

      this.tweens.add({
        targets: particle,
        x: chest.x + Math.cos(angle) * distance,
        y: chest.y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          if (particle.active) particle.destroy();
        },
      });
    }

    // 显示开启宝箱提示
    const text = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 200,
      "⭐ 宝箱已开启! ⭐",
      {
        fontSize: "48px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 50,
      duration: 2000,
      ease: "Power2",
      onComplete: () => {
        if (text.active) text.destroy();
      },
    });

    // 提供2次升级选项
    this.showTreasureUpgrade(1);
  }

  showTreasureUpgrade(upgradeCount: number) {
    // 设置升级中标志
    this.isUpgrading = true;
    
    // 暂停游戏
    this.physics.pause();

    // 创建半透明背景
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(2000);

    // 标题
    const title = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 150,
      `宝箱奖励 (${upgradeCount}/2)`,
      {
        fontSize: "48px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#8b4513",
        strokeThickness: 6,
      }
    );
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(2001);

    // 使用新的配置系统获取随机技能
    const skills = getRandomSkills(3, this.skillManager.getAllSkillLevels());

    if (skills.length === 0) {
      // 所有技能已满级，直接恢复游戏
      overlay.destroy();
      title.destroy();

      if (upgradeCount < 2) {
        this.showTreasureUpgrade(upgradeCount + 1);
      } else {
        this.physics.resume();
      }
      return;
    }

    // 创建选项按钮
    const allElements: any[] = [overlay, title];
    const xOffsets =
      skills.length === 3
        ? [-350, 0, 350]
        : skills.length === 2
        ? [-200, 200]
        : [0];

    skills.forEach((skill, index) => {
      const buttonElements = this.createUpgradeButton(skill, xOffsets[index]);
      allElements.push(...buttonElements);

      // 添加点击事件
      buttonElements[0].on("pointerdown", () => {
        // 销毁所有UI元素
        allElements.forEach((element) => element.destroy());

        // 应用技能效果
        this.applySkill(skill);

        // 如果还有升级次数，继续显示
        if (upgradeCount < 2) {
          this.time.delayedCall(300, () => {
            this.showTreasureUpgrade(upgradeCount + 1);
          });
        } else {
          // 两次升级完成，恢复游戏
          this.isUpgrading = false;
          this.physics.resume();
        }
      });
    });
  }

  showDamageText(x: number, y: number, damage: number) {
    const damageText = this.add.text(x, y, `-${damage}`, {
      fontSize: '20px',
      color: '#ff4444',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    damageText.setOrigin(0.5);
    damageText.setDepth(1000);
    
    this.tweens.add({
      targets: damageText,
      y: damageText.y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => damageText.destroy()
    });
  }

  addOrbital() {
    // 创建轨道球（使用第2行子弹，帧5-9）
    const orbital = this.add.sprite(0, 0, 'bullet-sheet', 5);
    orbital.setScale(1.8);
    
    // 创建轨道球动画（第2行的5帧）
    const orbitalAnimKey = 'bullet-type2-anim';
    if (!this.anims.exists(orbitalAnimKey)) {
      this.anims.create({
        key: orbitalAnimKey,
        frames: this.anims.generateFrameNumbers('bullet-sheet', {
          start: 5, // 第2行第1帧
          end: 9    // 第2行第5帧
        }),
        frameRate: 10,
        repeat: -1
      });
    }
    orbital.play(orbitalAnimKey);
    orbital.setScale(1.8); // 放大1.8倍
    
    this.physics.add.existing(orbital);
    (orbital.body as Phaser.Physics.Arcade.Body).setCircle(12);

    this.orbitals.push(orbital);

    // 添加发光效果
    this.tweens.add({
      targets: orbital,
      alpha: 0.8,
      duration: 300,
      yoyo: true,
      repeat: -1,
    });
  }

  updateOrbitals() {
    if (this.orbitals.length === 0) return;

    // 更新轨道旋转
    this.orbitalRotation +=
      this.orbitalSpeedBase * this.skillManager.stats.orbitalSpeedMultiplier;

    // 更新每个轨道球的位置
    this.orbitals.forEach((orbital, index) => {
      if (!orbital || !orbital.active) return;

      const angle =
        (Math.PI * 2 * index) / this.orbitals.length + this.orbitalRotation;
      const x =
        this.player.x + Math.cos(angle) * this.skillManager.stats.orbitalRadius;
      const y =
        this.player.y + Math.sin(angle) * this.skillManager.stats.orbitalRadius;

      orbital.setPosition(x, y);

      // 检查与敌人的碰撞
      this.enemies.getChildren().forEach((enemy: any) => {
        if (!enemy || !enemy.active) return;

        const distance = Phaser.Math.Distance.Between(
          orbital.x,
          orbital.y,
          enemy.x,
          enemy.y
        );

        if (distance < 20) {
          this.hitEnemyWithOrbital(orbital, enemy);
        }
      });
    });
  }

  hitEnemyWithOrbital(orbital: any, enemy: any) {
    if (!enemy || !enemy.active) return;

    const damage = this.skillManager.stats.orbitalDamage;
    enemy.hp -= damage;
    
    // 显示伤害数字
    this.showDamageText(enemy.x, enemy.y - 20, damage);

    // 闪烁效果
    this.tweens.add({
      targets: enemy,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
    });

    // 轨道球碰撞效果
    this.tweens.add({
      targets: orbital,
      scale: 1.5,
      duration: 100,
      yoyo: true,
    });

    if (enemy.hp <= 0) {
      const expValue = (enemy as any).expValue || 1;
      const isBoss = (enemy as any).enemyConfig?.isBoss || false;

      // Boss掉落宝箱和更多金币，普通敌人掉落经验球和金币
      if (isBoss) {
        this.spawnTreasureChest(enemy.x, enemy.y);
        // Boss掉落更多金币
        this.spawnCoin(enemy.x + 20, enemy.y, 10);
        this.spawnCoin(enemy.x - 20, enemy.y, 10);
      } else {
        this.spawnExpOrb(enemy.x, enemy.y, expValue);

        // 30%概率掉落金币
        if (Math.random() < 0.3) {
          this.spawnCoin(enemy.x, enemy.y, 1);
        }
      }

      enemy.destroy();
      this.killCount++;
      this.killText.setText(`Kills: ${this.killCount}`);
    }
  }

  levelUp() {
    // 如果正在显示升级界面，不再触发新的升级
    if (this.isUpgrading) {
      return;
    }
    
    this.playerLevel++;
    this.exp = 0;
    this.expToNextLevel = Math.floor(this.expToNextLevel * 1.2);

    this.levelText.setText(`Level: ${this.playerLevel}`);
    this.expText.setText(`EXP: ${this.exp}/${this.expToNextLevel}`);

    // 升级效果
    const circle = this.add.circle(this.player.x, this.player.y, 10, 0xffff00);
    this.tweens.add({
      targets: circle,
      scale: 10,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        if (circle.active) circle.destroy();
      },
    });

    // 暂停游戏并显示升级选项
    this.physics.pause();
    this.showUpgradeOptions();
  }

  showUpgradeOptions() {
    // 设置升级中标志
    this.isUpgrading = true;
    
    // 创建半透明背景
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(2000);

    // 标题
    const title = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 150,
      `LEVEL UP! (${this.playerLevel})`,
      {
        fontSize: "48px",
        color: "#ffff00",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(2001);

    // 计算当前连续升级概率
    const baseChance = 0.2;
    const chainPenalty = this.bonusLevelChain * 0.05;
    const currentChance = Math.max(0.05, baseChance - chainPenalty);
    const chancePercent = (currentChance * 100).toFixed(0);

    let bonusHintText = `🎲 ${chancePercent}% 概率获得连续升级！`;
    if (this.bonusLevelChain > 0) {
      bonusHintText += ` (连锁 x${this.bonusLevelChain})`;
    }

    // 添加连续升级提示
    const bonusHint = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 100,
      bonusHintText,
      {
        fontSize: "20px",
        color: "#ff00ff",
        fontFamily: "Arial",
        fontStyle: "italic",
      }
    );
    bonusHint.setOrigin(0.5);
    bonusHint.setScrollFactor(0);
    bonusHint.setDepth(2001);

    // 闪烁效果
    this.tweens.add({
      targets: bonusHint,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // 使用新的配置系统获取随机技能
    const skills = getRandomSkills(3, this.skillManager.getAllSkillLevels());

    if (skills.length === 0) {
      // 所有技能已满级，直接恢复游戏
      overlay.destroy();
      title.destroy();
      bonusHint.destroy();
      this.physics.resume();
      return;
    }

    // 创建选项按钮
    const allElements: any[] = [overlay, title, bonusHint];
    const xOffsets =
      skills.length === 3
        ? [-350, 0, 350]
        : skills.length === 2
        ? [-200, 200]
        : [0];

    skills.forEach((skill, index) => {
      const buttonElements = this.createUpgradeButton(skill, xOffsets[index]);
      allElements.push(...buttonElements);

      // 添加点击事件
      buttonElements[0].on("pointerdown", () => {
        this.onSkillSelected(allElements, skill);
      });
    });
  }

  onSkillSelected(allElements: any[], skill: SkillConfig) {
    // 销毁所有UI元素
    allElements.forEach((element) => element.destroy());

    // 应用技能效果
    this.applySkill(skill);
    
    // 清除升级标志
    this.isUpgrading = false;

    // 检查是否触发连续升级（20%概率）
    this.checkBonusLevelUp();
  }

  checkBonusLevelUp() {
    // 计算当前概率：基础20%，每次连续触发降低5%，最低5%
    const baseChance = 0.2;
    const chainPenalty = this.bonusLevelChain * 0.05;
    const currentChance = Math.max(0.05, baseChance - chainPenalty);

    // 判断是否触发
    if (Math.random() < currentChance) {
      // 增加连续升级计数
      this.bonusLevelCount++;
      this.bonusLevelChain++;

      // 显示连续升级提示
      this.showBonusLevelUpNotification(this.bonusLevelChain);

      // 屏幕闪光效果
      const flash = this.add.rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        this.cameras.main.width,
        this.cameras.main.height,
        0xff00ff,
        0.5
      );
      flash.setScrollFactor(0);
      flash.setDepth(2998);

      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          if (flash.active) flash.destroy();
        },
      });

      // 屏幕震动
      this.cameras.main.shake(300, 0.01);

      // 延迟后触发下一次升级
      this.time.delayedCall(800, () => {
        if (!this.scene.isActive()) return;

        // 再次升级
        this.playerLevel++;
        this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
        this.levelText.setText(`Level: ${this.playerLevel}`);

        // 升级特效（紫色）
        const circle = this.add.circle(
          this.player.x,
          this.player.y,
          10,
          0xff00ff
        );
        this.tweens.add({
          targets: circle,
          scale: 10,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            if (circle.active) circle.destroy();
          },
        });

        // 显示升级选项（游戏已经暂停）
        this.showUpgradeOptions();
      });
    } else {
      // 没有触发连续升级，重置连续链，恢复游戏
      this.bonusLevelChain = 0;
      this.physics.resume();
    }
  }

  showBonusLevelUpNotification(chain: number = 1) {
    // 根据连续链数调整颜色和文字
    const colors = ["#ff00ff", "#ff3399", "#ff6600", "#ffcc00", "#00ff00"];
    const color = colors[Math.min(chain - 1, colors.length - 1)];
    const chainText = chain > 1 ? ` x${chain}` : "";

    // 创建闪亮的通知文字
    const bonusText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `🎉 BONUS LEVEL UP${chainText}! 🎉`,
      {
        fontSize: "48px",
        color: color,
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#ffffff",
        strokeThickness: 6,
      }
    );
    bonusText.setOrigin(0.5);
    bonusText.setScrollFactor(0);
    bonusText.setDepth(3000);

    // 闪烁和放大效果
    this.tweens.add({
      targets: bonusText,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 1, to: 0 },
      y: bonusText.y - 100,
      duration: 800,
      ease: "Power2",
      onComplete: () => bonusText.destroy(),
    });

    // 创建粒子效果
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const distance = 100;
      const particle = this.add.circle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        6,
        0xff00ff
      );
      particle.setScrollFactor(0);
      particle.setDepth(2999);

      this.tweens.add({
        targets: particle,
        x: this.cameras.main.centerX + Math.cos(angle) * distance,
        y: this.cameras.main.centerY + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 600,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }
  }

  createUpgradeButton(upgrade: any, xOffset: number) {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // 按钮背景
    const buttonBg = this.add.rectangle(
      centerX + xOffset,
      centerY,
      300,
      200,
      0x333333
    );
    buttonBg.setStrokeStyle(4, parseInt(upgrade.color.replace("#", "0x")));
    buttonBg.setScrollFactor(0);
    buttonBg.setDepth(2001);
    buttonBg.setInteractive({ useHandCursor: true });

    // 升级名称
    const nameText = this.add.text(
      centerX + xOffset,
      centerY - 40,
      upgrade.name,
      {
        fontSize: "28px",
        color: upgrade.color,
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    nameText.setOrigin(0.5);
    nameText.setScrollFactor(0);
    nameText.setDepth(2002);

    // 显示当前等级
    const currentLevel = this.skillManager.getSkillLevel(upgrade.id);
    let levelInfo = "";
    if (currentLevel > 0) {
      levelInfo = ` (Lv.${currentLevel})`;
    }
    if (upgrade.maxLevel) {
      levelInfo += ` [Max: ${upgrade.maxLevel}]`;
    }

    // 升级描述
    const descText = this.add.text(
      centerX + xOffset,
      centerY + 20,
      upgrade.description + levelInfo,
      {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "Arial",
        align: "center",
        wordWrap: { width: 280 },
      }
    );
    descText.setOrigin(0.5);
    descText.setScrollFactor(0);
    descText.setDepth(2002);

    // 鼠标悬停效果
    buttonBg.on("pointerover", () => {
      buttonBg.setFillStyle(0x555555);
      this.tweens.add({
        targets: [buttonBg, nameText, descText],
        scale: 1.1,
        duration: 200,
      });
    });

    buttonBg.on("pointerout", () => {
      buttonBg.setFillStyle(0x333333);
      this.tweens.add({
        targets: [buttonBg, nameText, descText],
        scale: 1,
        duration: 200,
      });
    });

    // 返回所有元素供外部管理
    return [buttonBg, nameText, descText];
  }

  applySkill(skill: SkillConfig) {
    // 应用技能到技能管理器
    this.skillManager.applySkill(skill);

    // 特殊处理 - 生命恢复
    if (skill.effects?.hpRegen) {
      this.playerHP = this.skillManager.stats.maxHP;
      this.hpText.setText(
        `HP: ${this.playerHP}/${this.skillManager.stats.maxHP}`
      );
    }

    // 如果是轨道类技能，需要创建新的轨道球
    if (skill.effects?.orbitalCount && skill.effects.orbitalCount > 0) {
      this.addOrbital();
    }

    // 显示升级提示
    this.showUpgradeText(skill.name);
  }

  showUpgradeText(text: string) {
    const upgradeText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 100,
      text,
      {
        fontSize: "32px",
        color: "#ffff00",
        fontFamily: "Arial",
      }
    );
    upgradeText.setOrigin(0.5);
    upgradeText.setScrollFactor(0);

    this.tweens.add({
      targets: upgradeText,
      y: upgradeText.y - 50,
      alpha: 0,
      duration: 1500,
      onComplete: () => upgradeText.destroy(),
    });
  }

  gameOver() {
    this.scene.pause();

    // 保存游戏数据到存档
    SaveManager.addCoins(this.coinsCollected);
    SaveManager.updateStatistics(
      Math.floor(this.gameTime),
      this.killCount,
      this.difficultyLevel
    );

    const bg = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      400,
      400,
      0x000000,
      0.8
    );
    bg.setScrollFactor(0);

    const gameOverText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 140,
      "GAME OVER",
      {
        fontSize: "48px",
        color: "#ff0000",
        fontFamily: "Arial",
      }
    );
    gameOverText.setOrigin(0.5);
    gameOverText.setScrollFactor(0);

    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60);

    const statsText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      `Time: ${minutes}:${seconds.toString().padStart(2, "0")}\nKills: ${
        this.killCount
      }\nLevel: ${this.playerLevel}\nCoins: ${
        this.coinsCollected
      } 💰\nBonus Levels: ${this.bonusLevelCount} 🎲`,
      {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
        align: "center",
      }
    );
    statsText.setOrigin(0.5);
    statsText.setScrollFactor(0);

    // 显示总金币数
    const totalCoins = SaveManager.getTotalCoins();
    const totalCoinsText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 40,
      `Total Coins: ${totalCoins} 💰`,
      {
        fontSize: "20px",
        color: "#ffd700",
        fontFamily: "Arial",
      }
    );
    totalCoinsText.setOrigin(0.5);
    totalCoinsText.setScrollFactor(0);

    const restartText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 80,
      "Press R to Restart",
      {
        fontSize: "20px",
        color: "#00ff00",
        fontFamily: "Arial",
      }
    );
    restartText.setOrigin(0.5);
    restartText.setScrollFactor(0);

    const menuText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 120,
      "Press M to Main Menu",
      {
        fontSize: "20px",
        color: "#ffff00",
        fontFamily: "Arial",
      }
    );
    menuText.setOrigin(0.5);
    menuText.setScrollFactor(0);

    this.input.keyboard!.once("keydown-R", () => {
      this.scene.restart();
    });

    this.input.keyboard!.once("keydown-M", () => {
      this.scene.start("MenuScene");
    });
  }

  update(time: number, delta: number) {
    // 如果游戏暂停，不更新游戏逻辑
    if (this.isPaused) {
      return;
    }
    
    // 更新无限地图（根据玩家位置动态加载chunks）
    if (this.mapManager && this.player) {
      this.mapManager.update(this.player.x, this.player.y);
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    // 玩家移动（WASD 或方向键）
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown || this.input.keyboard!.addKey("A").isDown) {
      velocityX = -this.skillManager.stats.moveSpeed;
    } else if (
      this.cursors.right.isDown ||
      this.input.keyboard!.addKey("D").isDown
    ) {
      velocityX = this.skillManager.stats.moveSpeed;
    }

    if (this.cursors.up.isDown || this.input.keyboard!.addKey("W").isDown) {
      velocityY = -this.skillManager.stats.moveSpeed;
    } else if (
      this.cursors.down.isDown ||
      this.input.keyboard!.addKey("S").isDown
    ) {
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

    // 摄像机跟随玩家
    this.cameras.main.centerOn(this.player.x, this.player.y);

    // 更新轨道球位置
    this.updateOrbitals();

    // 更新敌人管理器（生成和AI）
    this.enemyManager.update(delta);
    this.enemyManager.updateEnemyAI();
    
    // Boss攻击逻辑
    this.enemies.getChildren().forEach((enemy: any) => {
      if (!enemy || !enemy.active) return;
      
      // 检查是否为Boss
      if ((enemy as any).isBoss) {
        // 初始化Boss攻击定时器
        if (!(enemy as any).attackTimer) {
          (enemy as any).attackTimer = 0;
          (enemy as any).attackInterval = 2000; // 2秒攻击一次
        }
        
        (enemy as any).attackTimer += delta;
        
        if ((enemy as any).attackTimer >= (enemy as any).attackInterval) {
          this.bossAttack(enemy);
          (enemy as any).attackTimer = 0;
        }
      }
    });
    
    // 更新弧形子弹轨迹
    this.bossProjectiles.getChildren().forEach((projectile: any) => {
      if (!projectile || !projectile.active || !projectile.curved) return;
      
      const body = projectile.body as Phaser.Physics.Arcade.Body;
      if (!body) return;
      
      // 弧形运动：随时间增加横向偏移
      const timeAlive = this.gameTime - (projectile as any).createdTime;
      const curveFactor = Math.sin(timeAlive * 3) * 50; // 正弦波产生弧形
      
      const initialAngle = (projectile as any).initialAngle;
      const perpAngle = initialAngle + Math.PI / 2; // 垂直于初始方向
      
      // 保持原速度，添加横向偏移
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      const newVx = Math.cos(initialAngle) * speed + Math.cos(perpAngle) * curveFactor;
      const newVy = Math.sin(initialAngle) * speed + Math.sin(perpAngle) * curveFactor;
      
      body.setVelocity(newVx, newVy);
    });

    // 自动射击
    this.projectileTimer += delta;
    const projectileRate = this.skillManager.getProjectileRate(1000); // 基础冷却 1000ms
    if (this.projectileTimer >= projectileRate) {
      this.shootProjectile();
      this.projectileTimer = 0;
    }

    // 激光攻击
    this.laserTimer += delta;
    if (this.laserTimer >= this.skillManager.stats.laserInterval) {
      this.shootLaser();
      this.laserTimer = 0;
    }

    // 激光碰撞检测（穿透性）
    this.lasers.forEach((laser) => {
      if (!laser || !laser.active) return;

      this.enemies.children.entries.forEach((enemy) => {
        if (!enemy || !enemy.active) return;

        const bounds1 = laser.getBounds();
        const bounds2 = (enemy as any).getBounds();
        if (Phaser.Geom.Intersects.RectangleToRectangle(bounds1, bounds2)) {
          this.hitEnemyWithLaser(enemy);
        }
      });
    });

    // 敌人追踪玩家
    this.enemies.getChildren().forEach((enemy: any) => {
      if (!enemy || !enemy.active || !enemy.body) return;

      const distance = Phaser.Math.Distance.Between(
        enemy.x,
        enemy.y,
        this.player.x,
        this.player.y
      );

      // 如果敌人距离玩家太远（超过视野外一定距离），重新刷新到视野边缘
      const despawnDistance = 1000; // 超过这个距离就重新刷新
      if (distance > despawnDistance) {
        // 在玩家视野边缘随机位置重新生成
        const edge = Phaser.Math.Between(0, 3);
        const padding = 100;

        switch (edge) {
          case 0: // 上
            enemy.x = Phaser.Math.Between(
              this.player.x - 800,
              this.player.x + 800
            );
            enemy.y = this.player.y - 400 - padding;
            break;
          case 1: // 右
            enemy.x = this.player.x + 640 + padding;
            enemy.y = Phaser.Math.Between(
              this.player.y - 400,
              this.player.y + 400
            );
            break;
          case 2: // 下
            enemy.x = Phaser.Math.Between(
              this.player.x - 800,
              this.player.x + 800
            );
            enemy.y = this.player.y + 400 + padding;
            break;
          default: // 左
            enemy.x = this.player.x - 640 - padding;
            enemy.y = Phaser.Math.Between(
              this.player.y - 400,
              this.player.y + 400
            );
            break;
        }
        return; // 重新定位后跳过本次移动
      }

      const angle = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        this.player.x,
        this.player.y
      );

      const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
      if (enemyBody) {
        const speed = (enemy as any).speed || 80;
        enemyBody.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      }
    });

    // 经验球被吸引到玩家
    this.expOrbs.getChildren().forEach((orb: any) => {
      if (!orb || !orb.active || !orb.body) return;

      const distance = Phaser.Math.Distance.Between(
        orb.x,
        orb.y,
        this.player.x,
        this.player.y
      );

      if (distance < this.skillManager.stats.pickupRange) {
        const angle = Phaser.Math.Angle.Between(
          orb.x,
          orb.y,
          this.player.x,
          this.player.y
        );

        const orbBody = orb.body as Phaser.Physics.Arcade.Body;
        if (orbBody) {
          const speed = 300;
          orbBody.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        }
      }
    });

    // 金币被吸引到玩家
    this.coins.getChildren().forEach((coin: any) => {
      if (!coin || !coin.active || !coin.body) return;

      const distance = Phaser.Math.Distance.Between(
        coin.x,
        coin.y,
        this.player.x,
        this.player.y
      );

      if (distance < this.skillManager.stats.pickupRange) {
        const angle = Phaser.Math.Angle.Between(
          coin.x,
          coin.y,
          this.player.x,
          this.player.y
        );

        const coinBody = coin.body as Phaser.Physics.Arcade.Body;
        if (coinBody) {
          const speed = 300;
          coinBody.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
          );
        }
      }
    });

    // 更新游戏时间（暂停时不增加）
    if (!this.isPaused) {
      this.gameTime += delta / 1000;
      const minutes = Math.floor(this.gameTime / 60);
      const seconds = Math.floor(this.gameTime % 60);
      this.timeText.setText(
        `Time: ${minutes}:${seconds.toString().padStart(2, "0")}`
      );

      // 每3分钟提升难度
      if (
        this.gameTime - this.lastDifficultyIncreaseTime >=
        this.difficultyIncreaseInterval
      ) {
        this.increaseDifficulty();
      }
    }
  }

  increaseDifficulty() {
    this.difficultyLevel++;
    this.lastDifficultyIncreaseTime = this.gameTime;

    // 更新EnemyManager的难度等级（只影响新生成的怪物）
    this.enemyManager.setDifficulty(this.difficultyLevel);

    // 更新难度显示
    this.diffText.setText(`难度: ${this.difficultyLevel}`);

    // 显示难度提升提示
    const diffText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 150,
      `难度提升！等级 ${this.difficultyLevel}`,
      {
        fontSize: "36px",
        color: "#ff0000",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    diffText.setOrigin(0.5);
    diffText.setScrollFactor(0);

    const detailText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 100,
      `敌人更强更快了！`,
      {
        fontSize: "24px",
        color: "#ffaa00",
        fontFamily: "Arial",
      }
    );
    detailText.setOrigin(0.5);
    detailText.setScrollFactor(0);

    // 闪烁和淡出效果
    this.tweens.add({
      targets: [diffText, detailText],
      y: "-=50",
      alpha: 0,
      duration: 2000,
      ease: "Power2",
      onComplete: () => {
        diffText.destroy();
        detailText.destroy();
      },
    });

    // 屏幕震动效果
    this.cameras.main.shake(200, 0.01);
  }
}
