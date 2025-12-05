import Phaser from 'phaser';

export class LoadingScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;
  private assetText!: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: 'LoadingScene' });
  }
  
  preload() {
    // 创建加载界面UI
    this.createLoadingUI();
    
    // 设置加载进度监听
    this.load.on('progress', this.updateProgress, this);
    this.load.on('fileprogress', this.updateFileProgress, this);
    this.load.on('complete', this.onLoadComplete, this);
    
    // 预加载所有游戏资源
    this.loadGameAssets();
  }
  
  create() {
    // 加载完成后短暂延迟，然后切换到菜单场景
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
  
  private createLoadingUI() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    
    // 游戏标题
    const titleText = this.add.text(width / 2, height / 2 - 150, 'Survivor Cat', {
      fontSize: '64px',
      color: '#FFD700',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    });
    titleText.setOrigin(0.5);
    
    // 副标题
    const subtitleText = this.add.text(width / 2, height / 2 - 90, '生存类弹幕射击游戏', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    subtitleText.setOrigin(0.5);
    
    // Loading 文本
    this.loadingText = this.add.text(width / 2, height / 2 - 20, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    this.loadingText.setOrigin(0.5);
    
    // 进度条背景
    const barWidth = 500;
    const barHeight = 30;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2 + 30;
    
    this.loadingBar = this.add.graphics();
    this.loadingBar.fillStyle(0x222222, 1);
    this.loadingBar.fillRect(barX, barY, barWidth, barHeight);
    this.loadingBar.lineStyle(3, 0xffffff, 1);
    this.loadingBar.strokeRect(barX, barY, barWidth, barHeight);
    
    // 进度条
    this.progressBar = this.add.graphics();
    
    // 百分比文本
    this.percentText = this.add.text(width / 2, barY + barHeight / 2, '0%', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    this.percentText.setOrigin(0.5);
    
    // 当前加载资源文本
    this.assetText = this.add.text(width / 2, height / 2 + 100, '', {
      fontSize: '16px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    });
    this.assetText.setOrigin(0.5);
    
    // 提示文本
    const tipText = this.add.text(width / 2, height - 50, '© 2024 Survivor Cat | Made with Phaser 3', {
      fontSize: '14px',
      color: '#666666',
      fontFamily: 'Arial'
    });
    tipText.setOrigin(0.5);
    
    // 添加加载动画 - 旋转的猫咪图标（使用简单图形代替）
    const spinner = this.add.graphics();
    spinner.lineStyle(4, 0xFFD700, 1);
    spinner.arc(width / 2 - 280, height / 2 + 45, 20, 0, Math.PI * 1.5);
    
    this.tweens.add({
      targets: spinner,
      rotation: Math.PI * 2,
      duration: 1000,
      repeat: -1,
      ease: 'Linear'
    });
  }
  
  private updateProgress(progress: number) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const barWidth = 500;
    const barHeight = 30;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2 + 30;
    
    // 更新进度条
    this.progressBar.clear();
    this.progressBar.fillStyle(0x00ff88, 1);
    this.progressBar.fillRect(barX + 3, barY + 3, (barWidth - 6) * progress, barHeight - 6);
    
    // 添加渐变效果
    this.progressBar.fillStyle(0x00ffff, 0.5);
    this.progressBar.fillRect(barX + 3, barY + 3, (barWidth - 6) * progress, barHeight / 2 - 3);
    
    // 更新百分比
    const percent = Math.floor(progress * 100);
    this.percentText.setText(`${percent}%`);
  }
  
  private updateFileProgress(file: Phaser.Loader.File) {
    // 更新当前加载的文件名
    const fileName = file.key || file.url;
    this.assetText.setText(`Loading: ${fileName}`);
  }
  
  private onLoadComplete() {
    this.loadingText.setText('Complete!');
    this.assetText.setText('Starting game...');
  }
  
  private loadGameAssets() {
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
    
    // 预加载Boss精灵图
    this.load.spritesheet('bugbit', 'assets/BugBit/WalkBug.png', {
      frameWidth: 24,
      frameHeight: 24
    });
    this.load.spritesheet('pebblin', 'assets/Pebblin/IdlePebblin.png', {
      frameWidth: 24,
      frameHeight: 24
    });
    this.load.spritesheet('spora', 'assets/Spora/MoveSpora.png', {
      frameWidth: 24,
      frameHeight: 24
    });
    this.load.spritesheet('spookmoth', 'assets/Spookmoth/FlySpookmoth.png', {
      frameWidth: 25,
      frameHeight: 25
    });
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
    
    // 预加载金币和物品
    this.load.image('coin-gif', 'assets/coin/slowcoin.gif');
    this.load.spritesheet('treasure-chest', 'assets/items/Treasure_Chest.png', {
      frameWidth: 36,
      frameHeight: 25
    });
    this.load.spritesheet('ground-deco', 'assets/items/IMG_4282.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    
    // 预加载地形tile图集
    this.load.spritesheet('terrain-tiles', 'assets/tile/tail.png', {
      frameWidth: 176,
      frameHeight: 176
    });
    this.load.image('tiles', 'assets/tile/muddy-ground.png');
    this.load.bitmapFont('nokia16', 'assets/tile/nokia16.png', 'assets/tile/nokia16.xml');
    
    // 预加载子弹精灵图
    this.load.spritesheet('bullet-sheet', 'assets/bullet/Bullet_Pixel_16x16.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    
    // 预加载音效（使用实际存在的音效文件）
    this.load.audio('CrossbowShoot6', 'assets/audio/CrossbowShoot6.wav');
    this.load.audio('culverinshoot1', 'assets/audio/culverinshoot1.wav');
    this.load.audio('laserShot', 'assets/audio/laserShot.mp3');
    
    // 预加载背景音乐
    this.load.audio('bgm', 'assets/audio/n48.mp3');
    this.load.audio('bossBgm', 'assets/audio/illusion-of-deception-cinematic-background-music-for-video-short-430672.mp3');
    this.load.audio('gameOverBgm', 'assets/audio/relaxing-guitar-loop-v5-245859.mp3');
    this.load.audio('victoryBgm', 'assets/audio/epic-rise-334778.mp3');
  }
}
