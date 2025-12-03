import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager';

export class MenuScene extends Phaser.Scene {
  private startButton!: Phaser.GameObjects.Text;
  private continueButton!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private instructionsText!: Phaser.GameObjects.Text;
  private saveInfoText!: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: 'MenuScene' });
  }
  
  preload() {
    // 预加载资源 - 史莱姆精灵图
    this.load.spritesheet('slime-red', 'assets/slime/Red Slime-Sheet.png', {
      frameWidth: 18,
      frameHeight: 14
    });
    this.load.spritesheet('slime-blue', 'assets/slime/Blue Slime-Sheet.png', {
      frameWidth: 18,
      frameHeight: 14
    });
    this.load.spritesheet('slime-green', 'assets/slime/Green Slime-Sheet.png', {
      frameWidth: 18,
      frameHeight: 14
    });
    this.load.spritesheet('slime-yellow', 'assets/slime/Yellow Slime-Sheet.png', {
      frameWidth: 18,
      frameHeight: 14
    });
    
    // 预加载Boss精灵图 - BugBit
    this.load.spritesheet('bugbit', 'assets/BugBit/WalkBug.png', {
      frameWidth: 24,
      frameHeight: 24
    });
    
    // 预加载Boss精灵图 - Pebblin
    this.load.spritesheet('pebblin', 'assets/Pebblin/IdlePebblin.png', {
      frameWidth: 24,
      frameHeight: 24
    });
    
    // 预加载Boss精灵图 - Spora
    this.load.spritesheet('spora', 'assets/Spora/MoveSpora.png', {
      frameWidth: 24,
      frameHeight: 24
    });
    
    // 预加载Boss精灵图 - Spookmoth
    this.load.spritesheet('spookmoth', 'assets/Spookmoth/FlySpookmoth.png', {
      frameWidth: 25,
      frameHeight: 25
    });
    
    // 预加载Boss精灵图 - Slub
    this.load.spritesheet('slub', 'assets/Slub/Slub.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    
    // 预加载猫咪玩家精灵
    this.load.spritesheet('cat-idle', 'assets/cat_player/Cat_idle_1.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.spritesheet('cat-walk', 'assets/cat_player/Cat_walk_1.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.spritesheet('cat-ducking', 'assets/cat_player/Cat_ducking_1.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    
    // 预加载金币GIF
    this.load.image('coin-gif', 'assets/coin/slowcoin.gif');
    
    // 预加载宝箱精灵图（8列x2行，使用第一行前4帧）
    this.load.spritesheet('treasure-chest', 'assets/items/Treasure_Chest.png', {
      frameWidth: 36,
      frameHeight: 25
    });
    
    // 预加载地面装饰精灵图（5列x3行）
    this.load.spritesheet('ground-deco', 'assets/items/IMG_4282.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    
    // 预加载草皮纹理精灵图（5列x3行）
    // 预加载地形tile图集
    this.load.spritesheet('terrain-tiles', 'assets/tile/tail.png', {
      frameWidth: 176,
      frameHeight: 176
    });
    
    // 预加载muddy-ground地形
    this.load.image('tiles', 'assets/tile/muddy-ground.png');
    this.load.bitmapFont('nokia16', 'assets/tile/nokia16.png', 'assets/tile/nokia16.xml');
    
    // 预加载子弹精灵图（25行x5列，每行代表一种子弹）
    this.load.spritesheet('bullet-sheet', 'assets/bullet/Bullet_Pixel_16x16.png', {
      frameWidth: 16,
      frameHeight: 16
    });
  }
  
  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    
    // 创建背景效果
    this.createBackground();
    
    // 游戏标题
    this.titleText = this.add.text(
      centerX,
      centerY - 150,
      'SURVIVOR CAT',
      {
        fontSize: '72px',
        color: '#ffff00',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 8
      }
    );
    this.titleText.setOrigin(0.5);
    
    // 标题闪烁效果
    this.tweens.add({
      targets: this.titleText,
      scale: { from: 1, to: 1.1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // 副标题
    this.subtitleText = this.add.text(
      centerX,
      centerY - 80,
      '存活下来，打败史莱姆！',
      {
        fontSize: '28px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }
    );
    this.subtitleText.setOrigin(0.5);
    
    // 显示存档信息
    const hasSave = SaveManager.hasSave();
    const totalCoins = SaveManager.getTotalCoins();
    
    if (hasSave) {
      this.saveInfoText = this.add.text(
        centerX,
        centerY - 30,
        `总金币: ${totalCoins} 💰`,
        {
          fontSize: '24px',
          color: '#ffd700',
          fontFamily: 'Arial'
        }
      );
      this.saveInfoText.setOrigin(0.5);
      
      // 继续游戏按钮
      this.continueButton = this.add.text(
        centerX,
        centerY + 20,
        '继续游戏',
        {
          fontSize: '28px',
          color: '#00ff00',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          backgroundColor: '#003300',
          padding: { x: 25, y: 12 }
        }
      );
      this.continueButton.setOrigin(0.5);
      this.continueButton.setInteractive({ useHandCursor: true });
      
      this.continueButton.on('pointerover', () => {
        this.continueButton.setScale(1.1);
        this.continueButton.setStyle({ color: '#ffff00', backgroundColor: '#004400' });
      });
      
      this.continueButton.on('pointerout', () => {
        this.continueButton.setScale(1);
        this.continueButton.setStyle({ color: '#00ff00', backgroundColor: '#003300' });
      });
      
      this.continueButton.on('pointerdown', () => {
        this.startGame();
      });
      
      // 新游戏按钮
      this.startButton = this.add.text(
        centerX,
        centerY + 80,
        '新游戏',
        {
          fontSize: '28px',
          color: '#88ff88',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          backgroundColor: '#002200',
          padding: { x: 25, y: 12 }
        }
      );
      this.startButton.setOrigin(0.5);
      this.startButton.setInteractive({ useHandCursor: true });
      
      this.startButton.on('pointerover', () => {
        this.startButton.setScale(1.1);
        this.startButton.setStyle({ color: '#ffff00', backgroundColor: '#003300' });
      });
      
      this.startButton.on('pointerout', () => {
        this.startButton.setScale(1);
        this.startButton.setStyle({ color: '#88ff88', backgroundColor: '#002200' });
      });
      
      this.startButton.on('pointerdown', () => {
        // 确认重置存档
        this.showNewGameConfirmation();
      });
      
      // 装备管理按钮
      const inventoryButton = this.add.text(
        centerX,
        centerY + 140,
        '📦 装备管理',
        {
          fontSize: '24px',
          color: '#00aaff',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          backgroundColor: '#002244',
          padding: { x: 20, y: 10 }
        }
      );
      inventoryButton.setOrigin(0.5);
      inventoryButton.setInteractive({ useHandCursor: true });
      
      inventoryButton.on('pointerover', () => {
        inventoryButton.setScale(1.1);
        inventoryButton.setStyle({ color: '#ffff00', backgroundColor: '#003366' });
      });
      
      inventoryButton.on('pointerout', () => {
        inventoryButton.setScale(1);
        inventoryButton.setStyle({ color: '#00aaff', backgroundColor: '#002244' });
      });
      
      inventoryButton.on('pointerdown', () => {
        this.openInventory();
      });
    } else {
      // 开始按钮（无存档时）
      this.startButton = this.add.text(
        centerX,
        centerY + 20,
        '开始游戏',
        {
          fontSize: '36px',
          color: '#00ff00',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          backgroundColor: '#003300',
          padding: { x: 30, y: 15 }
        }
      );
      this.startButton.setOrigin(0.5);
      this.startButton.setInteractive({ useHandCursor: true });
      
      this.startButton.on('pointerover', () => {
        this.startButton.setScale(1.1);
        this.startButton.setStyle({ color: '#ffff00', backgroundColor: '#004400' });
      });
      
      this.startButton.on('pointerout', () => {
        this.startButton.setScale(1);
        this.startButton.setStyle({ color: '#00ff00', backgroundColor: '#003300' });
      });
      
      this.startButton.on('pointerdown', () => {
        this.startGame();
      });
    }
    
    // 也可以按空格或回车键开始
    this.input.keyboard!.on('keydown-SPACE', () => {
      this.startGame();
    });
    
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.startGame();
    });
    
    // 创建装饰性的史莱姆动画（如果资源可用）
    this.createDecorativeSlimes();
  }
  
  showNewGameConfirmation() {
    // 创建确认对话框
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    );
    overlay.setInteractive();
    
    const dialogBg = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      400,
      250,
      0x222222,
      1
    );
    
    const confirmText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      '开始新游戏将重置存档！\n确定要继续吗？',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center'
      }
    );
    confirmText.setOrigin(0.5);
    
    const yesButton = this.add.text(
      this.cameras.main.centerX - 80,
      this.cameras.main.centerY + 50,
      '确定',
      {
        fontSize: '28px',
        color: '#ff0000',
        fontFamily: 'Arial',
        backgroundColor: '#440000',
        padding: { x: 20, y: 10 }
      }
    );
    yesButton.setOrigin(0.5);
    yesButton.setInteractive({ useHandCursor: true });
    
    yesButton.on('pointerover', () => {
      yesButton.setScale(1.1);
    });
    
    yesButton.on('pointerout', () => {
      yesButton.setScale(1);
    });
    
    yesButton.on('pointerdown', () => {
      SaveManager.deleteSave();
      overlay.destroy();
      dialogBg.destroy();
      confirmText.destroy();
      yesButton.destroy();
      noButton.destroy();
      this.startGame();
    });
    
    const noButton = this.add.text(
      this.cameras.main.centerX + 80,
      this.cameras.main.centerY + 50,
      '取消',
      {
        fontSize: '28px',
        color: '#00ff00',
        fontFamily: 'Arial',
        backgroundColor: '#004400',
        padding: { x: 20, y: 10 }
      }
    );
    noButton.setOrigin(0.5);
    noButton.setInteractive({ useHandCursor: true });
    
    noButton.on('pointerover', () => {
      noButton.setScale(1.1);
    });
    
    noButton.on('pointerout', () => {
      noButton.setScale(1);
    });
    
    noButton.on('pointerdown', () => {
      overlay.destroy();
      dialogBg.destroy();
      confirmText.destroy();
      yesButton.destroy();
      noButton.destroy();
    });
  }
  
  createBackground() {
    // 创建渐变背景效果
    const graphics = this.add.graphics();
    
    // 深色背景
    graphics.fillGradientStyle(0x001133, 0x001133, 0x000511, 0x000511, 1);
    graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
    
    // 添加星星效果
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, this.cameras.main.width);
      const y = Phaser.Math.Between(0, this.cameras.main.height);
      const size = Phaser.Math.Between(1, 3);
      
      const star = this.add.circle(x, y, size, 0xffffff, 0.8);
      
      // 闪烁效果
      this.tweens.add({
        targets: star,
        alpha: 0.2,
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      });
    }
  }
  
  createDecorativeSlimes() {
    // 检查资源是否加载
    if (!this.textures.exists('slime-red')) {
      return;
    }
    
    // 创建史莱姆动画
    if (!this.anims.exists('slime-red-idle')) {
      this.anims.create({
        key: 'slime-red-idle',
        frames: this.anims.generateFrameNumbers('slime-red', { start: 0, end: 12 }),
        frameRate: 10,
        repeat: -1
      });
    }
    
    if (!this.anims.exists('slime-blue-idle')) {
      this.anims.create({
        key: 'slime-blue-idle',
        frames: this.anims.generateFrameNumbers('slime-blue', { start: 0, end: 12 }),
        frameRate: 10,
        repeat: -1
      });
    }
    
    // 创建Boss动画
    if (this.textures.exists('bugbit') && !this.anims.exists('bugbit-walk')) {
      try {
        const frameCount = this.textures.get('bugbit').frameTotal;
        this.anims.create({
          key: 'bugbit-walk',
          frames: this.anims.generateFrameNumbers('bugbit', { start: 0, end: Math.min(3, frameCount - 1) }),
          frameRate: 8,
          repeat: -1
        });
      } catch (e) {
        console.error('Failed to create bugbit-walk animation:', e);
      }
    }
    
    if (this.textures.exists('pebblin') && !this.anims.exists('pebblin-idle')) {
      try {
        const frameCount = this.textures.get('pebblin').frameTotal;
        this.anims.create({
          key: 'pebblin-idle',
          frames: this.anims.generateFrameNumbers('pebblin', { start: 0, end: Math.min(3, frameCount - 1) }),
          frameRate: 6,
          repeat: -1
        });
      } catch (e) {
        console.error('Failed to create pebblin-idle animation:', e);
      }
    }
    
    if (this.textures.exists('spora') && !this.anims.exists('spora-move')) {
      try {
        const frameCount = this.textures.get('spora').frameTotal;
        this.anims.create({
          key: 'spora-move',
          frames: this.anims.generateFrameNumbers('spora', { start: 0, end: Math.min(3, frameCount - 1) }),
          frameRate: 7,
          repeat: -1
        });
      } catch (e) {
        console.error('Failed to create spora-move animation:', e);
      }
    }
    
    if (this.textures.exists('spookmoth') && !this.anims.exists('spookmoth-fly')) {
      try {
        const frameCount = this.textures.get('spookmoth').frameTotal;
        this.anims.create({
          key: 'spookmoth-fly',
          frames: this.anims.generateFrameNumbers('spookmoth', { start: 0, end: Math.min(3, frameCount - 1) }),
          frameRate: 10,
          repeat: -1
        });
      } catch (e) {
        console.error('Failed to create spookmoth-fly animation:', e);
      }
    }
    
    // if (this.textures.exists('slub') && !this.anims.exists('slub-idle')) {
    //   try {
    //     // Slub精灵图有5行，每行5帧，只使用第一行（0-4帧）
    //     this.anims.create({
    //       key: 'slub-idle',
    //       frames: this.anims.generateFrameNumbers('slub', { start: 0, end: 4 }),
    //       frameRate: 8,
    //       repeat: -1
    //     });
    //     console.log('slub animation created with frames 0-4');
    //   } catch (e) {
    //     console.error('Failed to create slub-idle animation:', e);
    //   }
    // }
    
    // 在菜单两侧添加装饰性史莱姆
    const leftSlime = this.add.sprite(100, this.cameras.main.centerY, 'slime-red');
    leftSlime.setScale(4);
    leftSlime.play('slime-red-idle');
    
    const rightSlime = this.add.sprite(this.cameras.main.width - 100, this.cameras.main.centerY, 'slime-blue');
    rightSlime.setScale(4);
    rightSlime.play('slime-blue-idle');
    
    // 添加弹跳动画
    this.tweens.add({
      targets: leftSlime,
      y: leftSlime.y - 20,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    this.tweens.add({
      targets: rightSlime,
      y: rightSlime.y - 20,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 500
    });
    
    // 显示Boss怪物预览（底部一行）
    const bossY = this.cameras.main.height - 100;
    const bosses = [
      { key: 'bugbit', anim: 'bugbit-walk', x: 200 },
      { key: 'pebblin', anim: 'pebblin-idle', x: 400 },
      { key: 'spora', anim: 'spora-move', x: 640 },
      { key: 'spookmoth', anim: 'spookmoth-fly', x: 880 },
      { key: 'slub', anim: 'slub-idle', x: 1080 }
    ];
    
    bosses.forEach(boss => {
      if (this.textures.exists(boss.key) && this.anims.exists(boss.anim)) {
        const sprite = this.add.sprite(boss.x, bossY, boss.key);
        sprite.setScale(3);
        sprite.play(boss.anim);
        
        // 添加悬浮效果
        this.tweens.add({
          targets: sprite,
          y: bossY - 10,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 500)
        });
        
        // 添加Boss标签
        const label = this.add.text(boss.x, bossY + 40, boss.key.toUpperCase(), {
          fontSize: '12px',
          color: '#ff0000',
          fontFamily: 'Arial',
          fontStyle: 'bold'
        });
        label.setOrigin(0.5);
      }
    });
    
    // 创建猫咪预览
    if (this.textures.exists('cat-idle')) {
      if (!this.anims.exists('cat-idle-anim-menu')) {
        this.anims.create({
          key: 'cat-idle-anim-menu',
          frames: this.anims.generateFrameNumbers('cat-idle', { start: 0, end: 2 }),
          frameRate: 6,
          repeat: -1
        });
      }
      
      const catPreview = this.add.sprite(
        this.cameras.main.centerX - 340,
        this.cameras.main.centerY - 160,
        'cat-idle'
      );
      catPreview.setScale(4);
      catPreview.play('cat-idle-anim-menu');
      
      // 轻微摇摆效果
      this.tweens.add({
        targets: catPreview,
        angle: -5,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }
  
  startGame() {
    // 添加过渡效果
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene');
    });
    
    // 播放开始音效（如果有的话）
    // this.sound.play('start-sound');
  }
  
  openInventory() {
    // 切换到装备管理场景
    this.cameras.main.fadeOut(300, 0, 0, 0);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('InventoryScene');
    });
  }
}
