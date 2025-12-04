import Phaser from "phaser";
import { SkillManager } from "../systems/SkillManager";
import { EquipmentManager } from "../systems/EquipmentManager";
import { MapManager } from "../systems/MapManager";
import { ExplosionSystem } from "../systems/ExplosionSystem";
import { EnemyManager, Enemy } from "../systems/EnemyManager";
import { getRandomSkills, SkillConfig } from "../config/SkillConfig";
import { EQUIPMENT_CONFIGS, getEquipmentById } from '../config/EquipmentConfig';
import { rollAffixes, AffixInstance, rollEquipmentQuality, Rarity, getQualityColor, generateEquipmentName } from '../config/AffixConfig';
import { SaveManager } from "../systems/SaveManager";
import { CUSTOM_DECORATION_CONFIG } from "../config/MapDecorationConfig";
import { DifficultyLevel, getDifficultyConfig, getDifficultyName, getDifficultyColor } from "../config/DifficultyConfig";

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
  private equipmentManager!: EquipmentManager;
  
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
  private bossesDefeated = 0; // 击败的Boss数量

  // 难度提升相关
  private difficultyLevel = 1;
  private lastDifficultyIncreaseTime = 0;
  private difficultyIncreaseInterval = 60; // 1分钟 = 60秒
  
  // 游戏难度设置
  private gameDifficulty: DifficultyLevel = DifficultyLevel.NORMAL;

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
    // 加载游戏难度设置
    this.gameDifficulty = SaveManager.getDifficulty();
    
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

    // 初始化技能管理系统（每次create时都重新创建以确保状态干净）
    this.skillManager = new SkillManager();
    this.explosionSystem = new ExplosionSystem(this);

    // 初始化敌人管理器（在enemies组创建之后，每次都重新创建）
    this.enemyManager = new EnemyManager(
      this,
      this.enemies,
      this.player,
      this.mapWidth,
      this.mapHeight,
      this.gameDifficulty
    );

    // 设置初始难度
    this.enemyManager.setDifficulty(this.difficultyLevel);

    // 重置玩家状态
    this.playerHP = this.skillManager.stats.maxHP;
    this.playerLevel = 1;
    this.exp = 0;
    this.expToNextLevel = 10;
    this.killCount = 0;
    this.coinsCollected = 0;
    this.bossesDefeated = 0;
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

    // 初始化装备管理器（会从存档加载已装备物品并将效果应用到 skillManager）
    this.equipmentManager = new EquipmentManager(this.skillManager);

    // 设置装备变化回调，用于同步轨道球数量
    this.equipmentManager.setEquipmentChangeCallback(() => {
      this.syncOrbitalCount();
    });

    // 同步轨道球数量
    this.syncOrbitalCount();
    // 确保玩家当前生命值基于装备和技能的最大生命值
    this.playerHP = this.skillManager.stats.maxHP;
    
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

    // 添加游戏难度显示（带颜色）
    const difficultyName = getDifficultyName(this.gameDifficulty);
    const difficultyColor = getDifficultyColor(this.gameDifficulty);
    this.diffText = this.add.text(
      10,
      160,
      `游戏难度: ${difficultyName} | 波数: ${this.difficultyLevel}`,
      {
        fontSize: "18px",
        color: difficultyColor,
        fontFamily: "Arial",
        fontStyle: "bold"
      }
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
      { label: '轨道轨道半径', value: this.skillManager.stats.orbitalRadius.toString() },
      { label: '轨道球速度', value: this.skillManager.stats.orbitalSpeedMultiplier.toString() },
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
        const laserLength = 400; // 减小激光长度
        const laserWidth = 4; // 减小激光宽度
        const laser = this.add.rectangle(
          this.player.x,
          this.player.y,
          laserLength,
          laserWidth,
          0x00ffff
        );
        laser.setRotation(angle);
        laser.setOrigin(0, 0.5);
        laser.setAlpha(0.8);

        this.physics.add.existing(laser);
        const body = laser.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.setSize(laserLength, laserWidth);
        }

        // 标记激光已击中的敌人，避免同一激光对同一敌人多次伤害
        (laser as any).hitEnemies = new Set<number>();
        
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
    // 子弹分裂逻辑 - 在销毁前检查
    if (this.skillManager.stats.projectileSplit > 0 && !(projectile as any).isSplitProjectile) {
      const splitCount = this.skillManager.stats.projectileSplit;
      const angleStep = (Math.PI * 2) / splitCount;
      // 添加随机偏移量，使分裂方向更加随机
      const randomOffset = Math.random() * Math.PI * 2;
      
      for (let i = 0; i < splitCount; i++) {
        const splitAngle = angleStep * i + randomOffset;
        
        // 创建分裂子弹
        const splitProjectile = this.add.sprite(
          projectile.x,
          projectile.y,
          'bullet-sheet',
          20
        );
        
        // 播放子弹动画
        const bulletAnimKey = 'bullet-type4-anim';
        if (this.anims.exists(bulletAnimKey)) {
          splitProjectile.play(bulletAnimKey);
        }
        splitProjectile.setScale(1.2); // 分裂子弹稍小
        
        this.physics.add.existing(splitProjectile);
        this.projectiles.add(splitProjectile);
        
        // 标记为分裂子弹，防止无限分裂
        (splitProjectile as any).isSplitProjectile = true;
        
        // 设置分裂子弹的速度
        const splitBody = splitProjectile.body as Phaser.Physics.Arcade.Body;
        if (splitBody) {
          const speed = 300 * this.skillManager.stats.projectileSpeedMultiplier;
          splitBody.setVelocity(
            Math.cos(splitAngle) * speed,
            Math.sin(splitAngle) * speed
          );
          splitProjectile.setRotation(splitAngle);
        }
        
        // 1.5秒后销毁分裂子弹
        this.time.delayedCall(1500, () => {
          if (splitProjectile.active) {
            splitProjectile.destroy();
          }
        });
      }
    }
    
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
      if (isBoss && !(enemy as any).dropped) {
        // 标记已掉落，防止重复掉落
        (enemy as any).dropped = true;
        this.bossesDefeated++;
        
        // 为Boss生成一件随机装备并附带词条（保存到宝箱上）
        const chosen = EQUIPMENT_CONFIGS[Math.floor(Math.random() * EQUIPMENT_CONFIGS.length)];
        const quality = rollEquipmentQuality(this.gameDifficulty);
        const affixes: AffixInstance[] = rollAffixes(chosen.slot as any, quality);
        this.spawnTreasureChest(enemy.x, enemy.y, { id: chosen.id, affixes, quality });
        // Boss掉落更多金币
        this.spawnCoin(enemy.x + 20, enemy.y, 10);
        this.spawnCoin(enemy.x - 20, enemy.y, 10);
        
        // 检查是否击败第4个Boss（通关）
        if (this.bossesDefeated >= 4) {
          this.gameVictory();
          return;
        }
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
      if (isBoss && !(enemy as any).dropped) {
        // 标记已掉落，防止重复掉落
        (enemy as any).dropped = true;
        this.bossesDefeated++;
        
        const chosen = EQUIPMENT_CONFIGS[Math.floor(Math.random() * EQUIPMENT_CONFIGS.length)];
        const quality = rollEquipmentQuality(this.gameDifficulty);
        const affixes: AffixInstance[] = rollAffixes(chosen.slot as any, quality);
        this.spawnTreasureChest(enemy.x, enemy.y, { id: chosen.id, affixes, quality });
        // Boss掉落更多金币
        this.spawnCoin(enemy.x + 20, enemy.y, 10);
        this.spawnCoin(enemy.x - 20, enemy.y, 10);
        
        // 检查是否击败第4个Boss（通关）
        if (this.bossesDefeated >= 4) {
          this.gameVictory();
          return;
        }
      } else if (!isBoss) {
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

  hitEnemyWithLaser(enemy: any, laser?: any) {
    if (!enemy || !enemy.active) return;

    // 如果提供了激光对象，检查该激光是否已经击中过这个敌人
    if (laser && (laser as any).hitEnemies) {
      // 使用敌人对象本身作为唯一标识（Set可以存储对象引用）
      if ((laser as any).hitEnemies.has(enemy)) {
        return; // 该激光已经击中过这个敌人，跳过
      }
      (laser as any).hitEnemies.add(enemy);
    }

    // 检查是否已经被激光击中过（全局冷却，避免重复伤害）
    if (enemy.laserHitThisFrame) return;
    enemy.laserHitThisFrame = true;

    // 冷却时间增加到200ms
    this.time.delayedCall(200, () => {
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
      if (isBoss && !(enemy as any).dropped) {
        // 标记已掉落，防止重复掉落
        (enemy as any).dropped = true;
        this.bossesDefeated++;
        
        const chosen = EQUIPMENT_CONFIGS[Math.floor(Math.random() * EQUIPMENT_CONFIGS.length)];
        const quality = rollEquipmentQuality(this.gameDifficulty);
        const affixes: AffixInstance[] = rollAffixes(chosen.slot as any, quality);
        this.spawnTreasureChest(enemy.x, enemy.y, { id: chosen.id, affixes, quality });
        // Boss掉落更多金币
        this.spawnCoin(enemy.x + 20, enemy.y, 10);
        this.spawnCoin(enemy.x - 20, enemy.y, 10);
        
        // 检查是否击败第4个Boss（通关）
        if (this.bossesDefeated >= 4) {
          this.gameVictory();
          return;
        }
      } else if (!isBoss) {
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
    // 通用处理：不再在玩家碰撞时销毁怪物（Boss 或普通怪）
    // 为避免多次触发，使用每个怪物上的临时冷却标志
    if ((enemy as any)._playerHitCooldown) {
      return;
    }
    (enemy as any)._playerHitCooldown = true;
    
    // 对玩家造成伤害并更新 UI
    this.playerHP -= 10;
    this.hpText.setText(`HP: ${this.playerHP}/${this.skillManager.stats.maxHP}`);

    // 对敌人施加向外击退 - 直接改变位置而不是速度
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    if (body) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      
      // 计算击退距离（像素）- 调整为更合理的距离
      const knockbackDistance = (enemy as any).enemyConfig?.isBoss ? 60 : 40;
      const newX = enemy.x + (dx / len) * knockbackDistance;
      const newY = enemy.y + (dy / len) * knockbackDistance;
      
      // 直接设置位置
      enemy.setPosition(newX, newY);
      
      // 同时设置速度为0，防止AI立即覆盖
      body.setVelocity(0, 0);
      
      // 添加视觉反馈 - 怪物变红表示被击退
      enemy.setTint(0xff6666);
      
      // 500ms后恢复AI控制
      this.time.delayedCall(500, () => {
        if (enemy.active) {
          (enemy as any)._playerHitCooldown = false;
          enemy.clearTint();
        }
      });
    }

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
    const diffConfig = getDifficultyConfig(this.gameDifficulty);
    const expGained = Math.ceil(
      orb.expValue * this.skillManager.stats.expGainMultiplier * diffConfig.expMultiplier
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
    const diffConfig = getDifficultyConfig(this.gameDifficulty);
    const finalCoinValue = Math.ceil(coinValue * diffConfig.coinMultiplier);
    this.coinsCollected += finalCoinValue;
    this.coinText.setText(`Coins: ${this.coinsCollected}`);

    // 收集音效提示（可选）
    const text = this.add.text(coin.x, coin.y - 20, `+${finalCoinValue}`, {
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

  spawnTreasureChest(x: number, y: number, equipmentPayload?: { id: string; affixes: AffixInstance[]; quality?: Rarity }) {
    // 创建宝箱精灵
    const chest = this.add.sprite(x, y, 'treasure-chest');
    chest.setScale(1.5);
    chest.play('treasure-idle');
    this.physics.add.existing(chest);
    this.treasureChests.add(chest);

    // 添加宝箱标记属性
    (chest as any).isChest = true;
    // 如果有装备掉落数据，附加到宝箱上
    if (equipmentPayload) {
      (chest as any).equipmentPayload = equipmentPayload;
    }


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

    // 保存是否有装备掉落到本次宝箱
    const payload = (chest as any).equipmentPayload as { id: string; affixes: AffixInstance[]; quality?: Rarity } | undefined;

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

    // 如果宝箱包含装备掉落，则弹出对话供玩家选择（存入背包 / 丢弃），否则继续原来的宝箱升级流程
    if (payload && payload.id) {
      const eq = getEquipmentById(payload.id);
      const quality = payload.quality !== undefined ? payload.quality : Rarity.Common;
      const title = eq ? generateEquipmentName(eq.name, payload.affixes || [], quality) : `未知装备 (${payload.id})`;
      const titleColor = getQualityColor(quality);
      const affixLines = (payload.affixes || []).map(a => `${a.name} (${a.rarity})`).join('\n');

      // 直接将装备放入背包
      let autoStored = false;
      try {
        SaveManager.addToInventory({ id: payload.id, affixes: payload.affixes || [], quality });
        autoStored = true;
      } catch (e) {
        console.warn('[openTreasureChest] Failed to auto-store equipment', e);
      }

      // 暂停游戏
      this.physics.pause();
      this.isPaused = true;

      // 弹出装备详情对话框（居中）
      const cx = this.cameras.main.centerX;
      const cy = this.cameras.main.centerY;
      const dlgW = 500;
      const dlgH = 280 + (payload.affixes ? payload.affixes.length * 24 : 0);
      
      // 背景
      const dlgBg = this.add.rectangle(cx, cy, dlgW, dlgH, 0x1a1a2e, 0.98).setDepth(3000).setScrollFactor(0);
      dlgBg.setStrokeStyle(3, 0xffd700);
      
      // 标题
      const dlgTitle = this.add.text(cx, cy - dlgH / 2 + 30, '🎁 获得装备 🎁', { 
        fontSize: '26px', 
        color: '#ffd700', 
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);
      
      // 装备名称
      const nameText = this.add.text(cx, cy - dlgH / 2 + 75, title, { 
        fontSize: '22px', 
        color: titleColor, 
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);
      
      // 装备描述
      const descText = this.add.text(cx - dlgW / 2 + 30, cy - dlgH / 2 + 115, eq?.description || '', { 
        fontSize: '16px', 
        color: '#cccccc', 
        fontFamily: 'Arial',
        wordWrap: { width: dlgW - 60 }
      }).setDepth(3001).setScrollFactor(0);

      // 词条列表
      const affStartY = cy - dlgH / 2 + 155;
      const affixTexts: Phaser.GameObjects.Text[] = [];
      if (payload.affixes && payload.affixes.length > 0) {
        const affixTitle = this.add.text(cx - dlgW / 2 + 30, affStartY - 10, '词条:', { 
          fontSize: '16px', 
          color: '#aaaaaa', 
          fontFamily: 'Arial' 
        }).setDepth(3001).setScrollFactor(0);
        affixTexts.push(affixTitle);
        
        payload.affixes.forEach((inst, i) => {
          const valStr = Object.entries(inst.values).map(([k, v]) => `${k}: ${v}`).join(', ');
          const rarityColor = inst.rarity === Rarity.Legendary ? '#ff6600' : inst.rarity === Rarity.Epic ? '#9c27b0' : inst.rarity === Rarity.Rare ? '#2196f3' : '#4caf50';
          const txt = this.add.text(cx - dlgW / 2 + 40, affStartY + 15 + i * 24, `• ${inst.name} (${valStr})`, { 
            fontSize: '15px', 
            color: rarityColor, 
            fontFamily: 'Arial' 
          }).setDepth(3001).setScrollFactor(0);
          affixTexts.push(txt);
        });
      }

      // 提示文字
      const hintText = this.add.text(cx, cy + dlgH / 2 - 80, autoStored ? '装备已自动放入背包' : '请选择操作', { 
        fontSize: '14px', 
        color: autoStored ? '#4caf50' : '#aaaaaa', 
        fontFamily: 'Arial',
        fontStyle: 'italic'
      }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);

      // 按钮：确认（放入背包） / 丢弃
      const btnConfirm = this.add.text(cx - 80, cy + dlgH / 2 - 40, '确认', { 
        fontSize: '20px', 
        color: '#ffffff', 
        fontFamily: 'Arial',
        fontStyle: 'bold',
        backgroundColor: '#4caf50', 
        padding: { x: 24, y: 10 } 
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(3001).setScrollFactor(0);
      
      const btnDiscard = this.add.text(cx + 80, cy + dlgH / 2 - 40, '丢弃', { 
        fontSize: '20px', 
        color: '#ffffff', 
        fontFamily: 'Arial',
        fontStyle: 'bold',
        backgroundColor: '#f44336', 
        padding: { x: 24, y: 10 } 
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(3001).setScrollFactor(0);

      const allElements = [dlgBg, dlgTitle, nameText, descText, hintText, btnConfirm, btnDiscard, ...affixTexts];

      const cleanupDlg = () => {
        // 强制销毁所有元素
        allElements.forEach(el => { 
          if (el) {
            el.removeAllListeners();
            if (el.active) {
              el.destroy(true);
            }
          }
        });
        // 清空数组
        allElements.length = 0;
        affixTexts.length = 0;
        // 恢复游戏
        this.physics.resume();
        this.isPaused = false;
      };

      btnConfirm.on('pointerdown', () => {
        // 确认放入背包（已经自动放入了）
        cleanupDlg();
        const info = this.add.text(cx, cy - 100, `✓ 已确认放入背包`, { 
          fontSize: '22px', 
          color: '#4caf50', 
          fontFamily: 'Arial',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4
        }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);
        this.tweens.add({ 
          targets: info, 
          alpha: 0, 
          y: info.y - 50, 
          duration: 2000, 
          ease: 'Power2', 
          onComplete: () => { if (info.active) info.destroy(); }
        });
      });

      btnDiscard.on('pointerdown', () => {
        // 丢弃装备（从背包移除）
        if (autoStored) {
          try {
            const inv = SaveManager.getInventory();
            const idx = inv.findIndex(it => it.id === payload.id && JSON.stringify(it.affixes) === JSON.stringify(payload.affixes));
            if (idx >= 0) {
              inv.splice(idx, 1);
              const save = SaveManager.loadSave();
              (save as any).inventory = inv;
              SaveManager.saveSave(save as any);
            }
          } catch (e) {
            console.warn('[openTreasureChest] Failed to remove equipment', e);
          }
        }
        
        cleanupDlg();
        const info = this.add.text(cx, cy - 100, `✗ 已丢弃装备`, { 
          fontSize: '22px', 
          color: '#f44336', 
          fontFamily: 'Arial',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4
        }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);
        this.tweens.add({ 
          targets: info, 
          alpha: 0, 
          y: info.y - 50, 
          duration: 2000, 
          ease: 'Power2', 
          onComplete: () => { if (info.active) info.destroy(); }
        });
      });
    } else {
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
        this.isPaused = false;
        this.isUpgrading = false;
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
          this.isPaused = false;
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

  // 同步轨道球数量与 skillManager.stats.orbitalCount
  syncOrbitalCount() {
    const targetCount = this.skillManager.stats.orbitalCount;
    const currentCount = this.orbitals.length;

    if (currentCount < targetCount) {
      // 需要添加轨道球
      for (let i = currentCount; i < targetCount; i++) {
        this.addOrbital();
      }
    } else if (currentCount > targetCount) {
      // 需要移除轨道球
      for (let i = currentCount; i > targetCount; i--) {
        const orbital = this.orbitals.pop();
        if (orbital) {
          orbital.destroy();
        }
      }
    }
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
      if (isBoss && !(enemy as any).dropped) {
        // 标记已掉落，防止重复掉落
        (enemy as any).dropped = true;
        const chosen = EQUIPMENT_CONFIGS[Math.floor(Math.random() * EQUIPMENT_CONFIGS.length)];
        const quality = rollEquipmentQuality(this.gameDifficulty);
        const affixes: AffixInstance[] = rollAffixes(chosen.slot as any, quality);
        this.spawnTreasureChest(enemy.x, enemy.y, { id: chosen.id, affixes, quality });
        // Boss掉落更多金币
        this.spawnCoin(enemy.x + 20, enemy.y, 10);
        this.spawnCoin(enemy.x - 20, enemy.y, 10);
      } else if (!isBoss) {
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
    // 设置升级中标志和暂停标志
    this.isUpgrading = true;
    this.isPaused = true;
    
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
      this.isPaused = false;
      this.isUpgrading = false;
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
      this.isPaused = false;
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

    // 如果是轨道类技能，需要同步轨道球数量
    if (skill.effects?.orbitalCount && skill.effects.orbitalCount > 0) {
      this.syncOrbitalCount();
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

  // 清理场景状态
  cleanupScene() {
    console.log('清理场景状态...');
    
    // 清理所有组
    if (this.enemies) {
      this.enemies.clear(true, true);
    }
    if (this.projectiles) {
      this.projectiles.clear(true, true);
    }
    if (this.bossProjectiles) {
      this.bossProjectiles.clear(true, true);
    }
    if (this.expOrbs) {
      this.expOrbs.clear(true, true);
    }
    if (this.magnetItems) {
      this.magnetItems.clear(true, true);
    }
    if (this.treasureChests) {
      this.treasureChests.clear(true, true);
    }
    if (this.coins) {
      this.coins.clear(true, true);
    }
    
    // 清理轨道球
    if (this.orbitals && this.orbitals.length > 0) {
      this.orbitals.forEach(orbital => {
        if (orbital && orbital.active) {
          orbital.destroy();
        }
      });
      this.orbitals = [];
    }
    
    // 清理激光
    if (this.lasers && this.lasers.length > 0) {
      this.lasers.forEach(laser => {
        if (laser && laser.active) {
          laser.destroy();
        }
      });
      this.lasers = [];
    }
    
    // 重置游戏状态标志
    this.isPaused = false;
    this.isUpgrading = false;
    
    // 重置游戏进度变量
    this.difficultyLevel = 1;
    this.gameTime = 0;
    this.lastDifficultyIncreaseTime = 0;
    this.killCount = 0;
    this.coinsCollected = 0;
    this.bossesDefeated = 0;
    this.playerLevel = 1;
    this.exp = 0;
    this.bonusLevelCount = 0;
    this.bonusLevelChain = 0;
    
    console.log('场景清理完成');
  }

  gameVictory() {
    this.isPaused = true;
    
    // 收集场上所有金币和宝箱
    const collectedCoins: { value: number }[] = [];
    const collectedChests: any[] = [];

    // 收集所有金币
    this.coins.getChildren().forEach((coin: any) => {
      if (coin && coin.active) {
        const coinValue = (coin as any).coinValue || 1;
        const diffConfig = getDifficultyConfig(this.gameDifficulty);
        const finalCoinValue = Math.ceil(coinValue * diffConfig.coinMultiplier);
        collectedCoins.push({ value: finalCoinValue });
        this.coinsCollected += finalCoinValue;
        coin.destroy();
      }
    });

    // 收集所有宝箱（只包含装备）
    this.treasureChests.getChildren().forEach((chest: any) => {
      if (chest && chest.active && (chest as any).isChest) {
        const payload = (chest as any).equipmentPayload;
        if (payload && payload.id) {
          collectedChests.push(payload);
          // 将装备自动放入背包
          try {
            SaveManager.addToInventory({ id: payload.id, affixes: payload.affixes || [], quality: payload.quality });
          } catch (e) {
            console.warn('[gameVictory] Failed to add equipment to inventory', e);
          }
        }
        chest.destroy();
      }
    });

    // 不要暂停场景，保持输入处理活跃
    // this.scene.pause();

    // 通关后解锁下一难度
    SaveManager.completeDifficulty(this.gameDifficulty);

    // 保存游戏数据到存档
    SaveManager.addCoins(this.coinsCollected);
    SaveManager.updateStatistics(
      Math.floor(this.gameTime),
      this.killCount,
      this.difficultyLevel
    );

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // 创建全屏背景
    const fullBg = this.add.rectangle(
      centerX,
      centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.9
    );
    fullBg.setScrollFactor(0);
    fullBg.setDepth(5000);

    // 左侧面板 - 胜利信息
    const leftPanel = this.add.rectangle(
      centerX - 300,
      centerY,
      500,
      600,
      0x1a1a2e,
      0.95
    );
    leftPanel.setScrollFactor(0);
    leftPanel.setDepth(5001);
    leftPanel.setStrokeStyle(4, 0xffd700);

    const victoryText = this.add.text(
      centerX - 300,
      centerY - 250,
      "🏆 VICTORY! 🏆",
      {
        fontSize: "56px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      }
    );
    victoryText.setOrigin(0.5);
    victoryText.setScrollFactor(0);
    victoryText.setDepth(5002);

    // 胜利闪烁效果
    this.tweens.add({
      targets: victoryText,
      scale: 1.1,
      alpha: 0.8,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    const subText = this.add.text(
      centerX - 300,
      centerY - 180,
      "击败了4个Boss！",
      {
        fontSize: "26px",
        color: "#00ff00",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    subText.setOrigin(0.5);
    subText.setScrollFactor(0);
    subText.setDepth(5002);

    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60);

    const statsText = this.add.text(
      centerX - 300,
      centerY - 80,
      `⏱️ Time: ${minutes}:${seconds.toString().padStart(2, "0")}\n\n` +
      `⚔️ Kills: ${this.killCount}\n\n` +
      `📊 Level: ${this.playerLevel}\n\n` +
      `💰 Coins: ${this.coinsCollected}\n\n` +
      `🎲 Bonus Levels: ${this.bonusLevelCount}`,
      {
        fontSize: "22px",
        color: "#ffffff",
        fontFamily: "Arial",
        align: "left",
        lineSpacing: 5,
      }
    );
    statsText.setOrigin(0.5);
    statsText.setScrollFactor(0);
    statsText.setDepth(5002);

    // 显示总金币数
    const totalCoins = SaveManager.getTotalCoins();
    const totalCoinsText = this.add.text(
      centerX - 300,
      centerY + 130,
      `💎 Total Coins: ${totalCoins}`,
      {
        fontSize: "24px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    totalCoinsText.setOrigin(0.5);
    totalCoinsText.setScrollFactor(0);
    totalCoinsText.setDepth(5002);

    // 显示难度解锁信息
    const nextDifficulty = this.gameDifficulty + 1;
    if (nextDifficulty <= DifficultyLevel.INFERNO_3) {
      const nextDiffName = getDifficultyName(nextDifficulty as DifficultyLevel);
      const nextDiffColor = getDifficultyColor(nextDifficulty as DifficultyLevel);
      const unlockText = this.add.text(
        centerX - 300,
        centerY + 180,
        `🎉 解锁: ${nextDiffName}`,
        {
          fontSize: "22px",
          color: nextDiffColor,
          fontFamily: "Arial",
          fontStyle: "bold",
        }
      );
      unlockText.setOrigin(0.5);
      unlockText.setScrollFactor(0);
      unlockText.setDepth(5002);

      // 闪烁效果
      this.tweens.add({
        targets: unlockText,
        alpha: 0.6,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }

    // 创建重启按钮
    const restartButton = this.add.rectangle(
      centerX - 300,
      centerY + 230,
      200,
      50,
      0x00aa00
    );
    restartButton.setStrokeStyle(3, 0x00ff00);
    restartButton.setScrollFactor(0);
    restartButton.setDepth(10000);
    restartButton.setInteractive({ useHandCursor: true });
    this.input.setTopOnly(false);

    const restartText = this.add.text(
      centerX - 300,
      centerY + 230,
      "重新开始",
      {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    restartText.setOrigin(0.5);
    restartText.setScrollFactor(0);
    restartText.setDepth(10001);
    restartText.setInteractive(false);

    // 创建菜单按钮
    const menuButton = this.add.rectangle(
      centerX - 300,
      centerY + 290,
      200,
      50,
      0xaa8800
    );
    menuButton.setStrokeStyle(3, 0xffff00);
    menuButton.setScrollFactor(0);
    menuButton.setDepth(10000);
    menuButton.setInteractive({ useHandCursor: true });

    const menuText = this.add.text(
      centerX - 300,
      centerY + 290,
      "返回菜单",
      {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    menuText.setOrigin(0.5);
    menuText.setScrollFactor(0);
    menuText.setDepth(10001);
    menuText.setInteractive(false);

    // 按钮悬停效果
    restartButton.on('pointerover', () => {
      restartButton.setFillStyle(0x00ff00);
      restartButton.setScale(1.05);
      restartText.setScale(1.05);
    });

    restartButton.on('pointerout', () => {
      restartButton.setFillStyle(0x00aa00);
      restartButton.setScale(1);
      restartText.setScale(1);
    });

    menuButton.on('pointerover', () => {
      menuButton.setFillStyle(0xffff00);
      menuButton.setScale(1.05);
      menuText.setScale(1.05);
    });

    menuButton.on('pointerout', () => {
      menuButton.setFillStyle(0xaa8800);
      menuButton.setScale(1);
      menuText.setScale(1);
    });

    // 按钮点击事件
    restartButton.on('pointerdown', () => {
      console.log('胜利界面-重新开始按钮被点击');
      this.cleanupScene();
      this.scene.restart();
    });

    menuButton.on('pointerdown', () => {
      console.log('胜利界面-返回菜单按钮被点击');
      this.scene.stop();
      this.scene.start("MenuScene");
    });
    const rightPanel = this.add.rectangle(
      centerX + 300,
      centerY,
      500,
      600,
      0x1a1a2e,
      0.95
    );
    rightPanel.setScrollFactor(0);
    rightPanel.setDepth(5001);
    rightPanel.setStrokeStyle(4, 0xffd700);

    const rewardsTitle = this.add.text(
      centerX + 300,
      centerY - 250,
      "🎁 收集物品 🎁",
      {
        fontSize: "36px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    rewardsTitle.setOrigin(0.5);
    rewardsTitle.setScrollFactor(0);
    rewardsTitle.setDepth(5002);

    // 显示金币数量
    const coinCountText = this.add.text(
      centerX + 300,
      centerY - 190,
      `💰 金币: ${this.coinsCollected}`,
      {
        fontSize: "28px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    coinCountText.setOrigin(0.5);
    coinCountText.setScrollFactor(0);
    coinCountText.setDepth(5002);

    // 显示宝箱装备
    const chestsTitle = this.add.text(
      centerX + 300,
      centerY - 140,
      "📦 获得装备:",
      {
        fontSize: "24px",
        color: "#ffaa00",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    chestsTitle.setOrigin(0.5);
    chestsTitle.setScrollFactor(0);
    chestsTitle.setDepth(5002);

    if (collectedChests.length === 0) {
      const noChestsText = this.add.text(
        centerX + 300,
        centerY - 90,
        "（无装备掉落）",
        {
          fontSize: "18px",
          color: "#888888",
          fontFamily: "Arial",
          fontStyle: "italic",
        }
      );
      noChestsText.setOrigin(0.5);
      noChestsText.setScrollFactor(0);
      noChestsText.setDepth(5002);
    } else {
      // 显示装备列表（最多显示5个）
      const maxDisplay = Math.min(collectedChests.length, 5);
      for (let i = 0; i < maxDisplay; i++) {
        const chest = collectedChests[i];
        const eq = getEquipmentById(chest.id);
        const quality = chest.quality !== undefined ? chest.quality : Rarity.Common;
        const equipName = eq ? generateEquipmentName(eq.name, chest.affixes || [], quality) : `未知装备 (${chest.id})`;
        const equipColor = getQualityColor(quality);

        const equipText = this.add.text(
          centerX + 120,
          centerY - 90 + i * 30,
          `• ${equipName}`,
          {
            fontSize: "16px",
            color: equipColor,
            fontFamily: "Arial",
            wordWrap: { width: 340 },
          }
        );
        equipText.setOrigin(0, 0.5);
        equipText.setScrollFactor(0);
        equipText.setDepth(5002);
      }

      if (collectedChests.length > 5) {
        const moreText = this.add.text(
          centerX + 300,
          centerY + 60,
          `...以及其他 ${collectedChests.length - 5} 件装备`,
          {
            fontSize: "14px",
            color: "#aaaaaa",
            fontFamily: "Arial",
            fontStyle: "italic",
          }
        );
        moreText.setOrigin(0.5);
        moreText.setScrollFactor(0);
        moreText.setDepth(5002);
      }

      // 提示装备已放入背包
      const bagHint = this.add.text(
        centerX + 300,
        centerY + 100,
        "✓ 所有装备已放入背包",
        {
          fontSize: "18px",
          color: "#4caf50",
          fontFamily: "Arial",
          fontStyle: "italic",
        }
      );
      bagHint.setOrigin(0.5);
      bagHint.setScrollFactor(0);
      bagHint.setDepth(5002);
    }
  }

  gameOver() {
    this.isPaused = true;
    // 不暂停场景，保持输入处理活跃
    // this.scene.pause();

    // 检查是否达到解锁下一难度的条件（例如：生存到一定波数）
    const unlockThreshold = 10; // 需要生存到第10波才能解锁下一难度
    if (this.difficultyLevel >= unlockThreshold) {
      SaveManager.completeDifficulty(this.gameDifficulty);
    }

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
    bg.setDepth(5000);

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
    gameOverText.setDepth(5001);

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
    statsText.setDepth(5001);

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
    totalCoinsText.setDepth(5001);
    
    // 显示难度解锁信息
    if (this.difficultyLevel >= unlockThreshold) {
      const nextDifficulty = this.gameDifficulty + 1;
      if (nextDifficulty <= DifficultyLevel.INFERNO_3) {
        const nextDiffName = getDifficultyName(nextDifficulty as DifficultyLevel);
        const nextDiffColor = getDifficultyColor(nextDifficulty as DifficultyLevel);
        const unlockText = this.add.text(
          this.cameras.main.centerX,
          this.cameras.main.centerY + 70,
          `🎉 解锁新难度: ${nextDiffName} 🎉`,
          {
            fontSize: "22px",
            color: nextDiffColor,
            fontFamily: "Arial",
            fontStyle: "bold"
          }
        );
        unlockText.setOrigin(0.5);
        unlockText.setScrollFactor(0);
        
        // 闪烁效果
        this.tweens.add({
          targets: unlockText,
          alpha: 0.5,
          duration: 500,
          yoyo: true,
          repeat: -1
        });
      }
    }

    // 创建重启按钮
    const restartButton = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 110,
      200,
      50,
      0x00aa00
    );
    restartButton.setStrokeStyle(3, 0x00ff00);
    restartButton.setScrollFactor(0);
    restartButton.setDepth(10000);
    restartButton.setInteractive({ useHandCursor: true });

    const restartText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 110,
      "重新开始",
      {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    restartText.setOrigin(0.5);
    restartText.setScrollFactor(0);
    restartText.setDepth(10001);

    // 创建菜单按钮
    const menuButton = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 170,
      200,
      50,
      0xaa8800
    );
    menuButton.setStrokeStyle(3, 0xffff00);
    menuButton.setScrollFactor(0);
    menuButton.setDepth(10000);
    menuButton.setInteractive({ useHandCursor: true });

    const menuText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 170,
      "返回菜单",
      {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    menuText.setOrigin(0.5);
    menuText.setScrollFactor(0);
    menuText.setDepth(10001);

    // 按钮悬停效果
    restartButton.on('pointerover', () => {
      restartButton.setFillStyle(0x00ff00);
      restartButton.setScale(1.05);
      restartText.setScale(1.05);
    });

    restartButton.on('pointerout', () => {
      restartButton.setFillStyle(0x00aa00);
      restartButton.setScale(1);
      restartText.setScale(1);
    });

    menuButton.on('pointerover', () => {
      menuButton.setFillStyle(0xffff00);
      menuButton.setScale(1.05);
      menuText.setScale(1.05);
    });

    menuButton.on('pointerout', () => {
      menuButton.setFillStyle(0xaa8800);
      menuButton.setScale(1);
      menuText.setScale(1);
    });

    // 按钮点击事件
    restartButton.on('pointerdown', () => {
      console.log('游戏结束界面-重新开始按钮被点击');
      this.cleanupScene();
      this.scene.restart();
    });

    menuButton.on('pointerdown', () => {
      console.log('游戏结束界面-返回菜单按钮被点击');
      this.scene.stop();
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
      
      // 弧形运动：通过累积角度变化来实现真正的弧线
      const timeAlive = this.gameTime - (projectile as any).createdTime;
      
      // 初始化当前角度
      if (projectile.currentAngle === undefined) {
        projectile.currentAngle = (projectile as any).initialAngle;
      }
      
      // 角度变化率（弧度/秒）- 使用余弦函数让子弹左右摆动
      const turnRate = Math.cos(timeAlive * 4) * 2.5; // 每秒4次振荡，最大转向速度±2.5弧度/秒
      
      // 累积角度变化（关键！每帧累加，而不是重新计算）
      projectile.currentAngle += turnRate * (delta / 1000); // delta是毫秒
      
      // 保持恒定速度，方向由当前角度决定
      const speed = 220;
      body.setVelocity(
        Math.cos(projectile.currentAngle) * speed,
        Math.sin(projectile.currentAngle) * speed
      );
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

        // 使用更精确的线段-圆形碰撞检测
        // 计算激光的起点和终点
        const angle = laser.rotation;
        const laserStartX = laser.x;
        const laserStartY = laser.y;
        const laserEndX = laser.x + Math.cos(angle) * 400; // laserLength
        const laserEndY = laser.y + Math.sin(angle) * 400;
        
        // 敌人位置
        const enemyX = (enemy as any).x;
        const enemyY = (enemy as any).y;
        const enemyRadius = 25; // 敌人碰撞半径（增大）
        
        // 计算点到线段的距离
        const distance = this.pointToLineSegmentDistance(
          enemyX, enemyY,
          laserStartX, laserStartY,
          laserEndX, laserEndY
        );
        
        // 如果距离小于敌人半径 + 激光半宽，则视为击中
        // 增加判定范围，让激光更容易击中
        if (distance < enemyRadius + 10) { // 10像素的容差
          this.hitEnemyWithLaser(enemy, laser);
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
    const difficultyName = getDifficultyName(this.gameDifficulty);
    const difficultyColor = getDifficultyColor(this.gameDifficulty);
    this.diffText.setText(`游戏难度: ${difficultyName} | 波数: ${this.difficultyLevel}`);
    this.diffText.setStyle({ color: difficultyColor });

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
  
  // 计算点到线段的最短距离
  pointToLineSegmentDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) {
      // 线段退化为一个点
      return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }
    
    // 计算投影参数 t
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    
    // 计算投影点
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    // 返回距离
    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
  }
}
