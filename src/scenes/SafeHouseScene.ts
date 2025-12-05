import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager';
import { EQUIPMENT_CONFIGS, getEquipmentById, EquipmentItem, calculateEquipmentPrice } from '../config/EquipmentConfig';
import { rollAffixes, rollEquipmentQuality, getQualityColor, getQualityColorHex, generateEquipmentName, Rarity, AffixInstance } from '../config/AffixConfig';
import { DifficultyLevel, getDifficultyConfig } from '../config/DifficultyConfig';
import { EquipmentDetailRenderer } from '../systems/EquipmentDetailRenderer';

interface ShopEquipmentItem {
  baseItem: EquipmentItem;
  affixes: AffixInstance[];
  quality: Rarity;
  price: number;
}

interface SafeHouseData {
  skillRefreshCount: number; // 技能刷新次数
}

export class SafeHouseScene extends Phaser.Scene {
  private equipmentShop: ShopEquipmentItem[] = [];
  private totalCoins: number = 0;
  private coinText!: Phaser.GameObjects.Text;
  private currentTab: 'equipment' | 'attributes' = 'equipment';
  private shopContainer!: Phaser.GameObjects.Container;
  private attributeContainer!: Phaser.GameObjects.Container;
  private safeHouseData: SafeHouseData = { skillRefreshCount: 0 };
  private detailRenderer!: EquipmentDetailRenderer;
  
  constructor() {
    super({ key: 'SafeHouseScene' });
  }
  
  async init(data?: SafeHouseData & { shouldRefreshShop?: boolean }) {
    // 接收传入的安全屋数据，确保 skillRefreshCount 始终有效
    if (data && typeof data.skillRefreshCount === 'number') {
      this.safeHouseData = data;
    } else {
      this.safeHouseData = { skillRefreshCount: 0 };
    }
    
    // 如果标记了需要刷新商店，则清空保存的商店数据
    if (data && data.shouldRefreshShop) {
      await SaveManager.clearSafeHouseShop();
    }
  }
  
  async create() {
    const { width, height } = this.cameras.main;
    
    // 清空商店数组（防止重复添加）
    this.equipmentShop = [];
    
    // 加载金币数
    this.totalCoins = await SaveManager.getTotalCoins();
    
    // 创建装备详情渲染器
    this.detailRenderer = new EquipmentDetailRenderer(this);
    
    // 创建背景
    this.createBackground();
    
    // 标题
    this.add.text(width / 2, 40, '安全屋', {
      fontSize: '48px',
      color: '#ffd700',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);
    
    // 金币显示
    this.coinText = this.add.text(width - 40, 40, `💰 ${this.totalCoins}`, {
      fontSize: '28px',
      color: '#ffd700',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(1, 0);
    
    // 创建标签页按钮
    this.createTabButtons();
    
    // 生成装备商店物品（等待完成）
    await this.generateShopItems();
    
    // 创建商店容器
    this.createShopContainer();
    
    // 创建属性商店容器
    this.createAttributeContainer();
    
    // 显示装备商店
    this.showTab('equipment');
    
    // 开始游戏按钮
    this.createStartButton();
    
    // 打开背包按钮
    this.createInventoryButton();
    
    // 返回菜单按钮
    this.createBackButton();
    
    // 显示存档路径按钮
    this.createSavePathButton();
    
    // ESC键返回菜单
    this.input.keyboard!.on('keydown-ESC', () => {
      this.returnToMenu();
    });
    
    // 注册全局刷新商店函数（用于 DevTools 调试）
    (window as any).refreshShop = async () => {
      await this.refreshShop();
    };
  }
  
  createBackground() {
    const { width, height } = this.cameras.main;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f3460, 0x0f3460, 1);
    bg.fillRect(0, 0, width, height);
    
    // 添加装饰性网格
    bg.lineStyle(1, 0x444444, 0.2);
    for (let x = 0; x < width; x += 60) {
      bg.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 60) {
      bg.lineBetween(0, y, width, y);
    }
  }
  
  createTabButtons() {
    const { width } = this.cameras.main;
    const centerX = width / 2;
    const tabY = 120;
    
    // 装备商店标签
    const equipTab = this.add.text(centerX - 150, tabY, '装备商店', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#2c3e50',
      padding: { x: 20, y: 10 }
    }).setInteractive({ useHandCursor: true }).setOrigin(0.5);
    
    equipTab.on('pointerdown', () => {
      this.showTab('equipment');
    });
    
    // 属性商店标签
    const attrTab = this.add.text(centerX + 150, tabY, '属性商店', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#2c3e50',
      padding: { x: 20, y: 10 }
    }).setInteractive({ useHandCursor: true }).setOrigin(0.5);
    
    attrTab.on('pointerdown', () => {
      this.showTab('attributes');
    });
    
    // 存储引用以便更新样式
    (this as any).equipTab = equipTab;
    (this as any).attrTab = attrTab;
  }
  
  showTab(tab: 'equipment' | 'attributes') {
    this.currentTab = tab;
    
    // 更新标签样式
    const equipTab = (this as any).equipTab as Phaser.GameObjects.Text;
    const attrTab = (this as any).attrTab as Phaser.GameObjects.Text;
    
    if (tab === 'equipment') {
      equipTab.setStyle({ backgroundColor: '#34495e', color: '#ffd700' });
      attrTab.setStyle({ backgroundColor: '#2c3e50', color: '#ffffff' });
      this.shopContainer.setVisible(true);
      this.attributeContainer.setVisible(false);
      // 显示滚动提示
      if ((this.shopContainer as any).scrollHint) {
        ((this.shopContainer as any).scrollHint as Phaser.GameObjects.Text).setVisible(true);
      }
      // 重置滚动位置
      if ((this.shopContainer as any).resetScroll) {
        (this.shopContainer as any).resetScroll();
      }
    } else {
      equipTab.setStyle({ backgroundColor: '#2c3e50', color: '#ffffff' });
      attrTab.setStyle({ backgroundColor: '#34495e', color: '#ffd700' });
      this.shopContainer.setVisible(false);
      this.attributeContainer.setVisible(true);
      // 隐藏滚动提示
      if ((this.shopContainer as any).scrollHint) {
        ((this.shopContainer as any).scrollHint as Phaser.GameObjects.Text).setVisible(false);
      }
    }
  }
  
  async generateShopItems() {
    // 先尝试从存档加载商店装备
    const savedShop = await SaveManager.getSafeHouseShop();
    
    if (savedShop && savedShop.length > 0) {
      // 使用保存的商店装备
      this.equipmentShop = savedShop.map(item => ({
        baseItem: getEquipmentById(item.id)!,
        affixes: item.affixes,
        quality: item.quality,
        price: item.price
      }));
      return;
    }
    
    // 如果没有保存的商店装备，生成新的
    const difficulty = await SaveManager.getDifficulty();
    // 使用当前难度的上一个难度的配置（最低为简单难度）
    const shopDifficulty = Math.max(0, difficulty - 1);
    
    // 随机生成5-8件装备
    const itemCount = Phaser.Math.Between(5, 8);
    
    for (let i = 0; i < itemCount; i++) {
      // 随机选择装备类型
      const randomItem = Phaser.Utils.Array.GetRandom(EQUIPMENT_CONFIGS);
      
      // 根据难度生成品质
      const quality = rollEquipmentQuality(shopDifficulty as DifficultyLevel);
      
      // 根据品质生成词条
      const affixes = rollAffixes(randomItem.slot as any, quality);
      
      // 根据词条计算价格
      const price = calculateEquipmentPrice(quality, affixes);
      
      this.equipmentShop.push({
        baseItem: randomItem,
        affixes,
        quality,
        price
      });
    }
    
    // 保存生成的商店装备
    this.saveShopToStorage();
  }
  
  async saveShopToStorage() {
    const shopData = this.equipmentShop.map(item => ({
      id: item.baseItem.id,
      affixes: item.affixes,
      quality: item.quality,
      price: item.price
    }));
    await SaveManager.saveSafeHouseShop(shopData);
  }
  
  /**
   * 刷新商店（用于 DevTools 调试）
   */
  async refreshShop() {
    console.log('开始刷新商店...');
    
    // 清空当前商店
    this.equipmentShop = [];
    
    // 清空保存的商店数据
    await SaveManager.clearSafeHouseShop();
    
    // 重新生成商店物品
    await this.generateShopItems();
    
    // 销毁旧的商店容器
    if (this.shopContainer) {
      this.shopContainer.destroy();
    }
    
    // 重新创建商店容器
    this.createShopContainer();
    
    // 如果当前在装备标签页，显示新的商店
    if (this.currentTab === 'equipment') {
      this.showTab('equipment');
    }
    
    console.log('商店刷新完成！');
  }
  
  calculateEquipmentPrice(quality: Rarity, affixes: AffixInstance[]): number {
    // 基础价格根据品质（使用对象映射而不是数组索引）
    const basePriceMap: Record<Rarity, number> = {
      [Rarity.Common]: 50,
      [Rarity.Rare]: 100,
      [Rarity.Epic]: 200,
      [Rarity.Legendary]: 400
    };
    const basePrice = basePriceMap[quality] ?? 50;
    
    // 计算词条价值
    let affixValue = 0;
    
    for (const affix of affixes) {
      // 词条稀有度基础价值（同样使用对象映射）
      const rarityValueMap: Record<Rarity, number> = {
        [Rarity.Common]: 20,
        [Rarity.Rare]: 50,
        [Rarity.Epic]: 100,
        [Rarity.Legendary]: 200
      };
      const rarityValue = rarityValueMap[affix.rarity] ?? 20;
      
      // 根据词条效果计算额外价值
      let effectValue = 0;
      if (affix.values) {
        // 生命值类
        if (affix.values.maxHP) effectValue += affix.values.maxHP * 2;
        
        // 移动速度
        if (affix.values.moveSpeed) effectValue += affix.values.moveSpeed * 1.5;
        
        // 伤害类
        if (affix.values.projectileDamage) effectValue += affix.values.projectileDamage * 30;
        if (affix.values.orbitalDamage) effectValue += affix.values.orbitalDamage * 25;
        if (affix.values.laserDamage) effectValue += affix.values.laserDamage * 30;
        if (affix.values.explosionDamage) effectValue += affix.values.explosionDamage * 20;
        
        // 数量类
        if (affix.values.projectileCount) effectValue += affix.values.projectileCount * 80;
        if (affix.values.orbitalCount) effectValue += affix.values.orbitalCount * 100;
        if (affix.values.laserCount) effectValue += affix.values.laserCount * 100;
        
        // 特殊效果
        if (affix.values.projectileSplit) effectValue += affix.values.projectileSplit * 150;
        if (affix.values.explosionChance) effectValue += affix.values.explosionChance * 500;
        
        // 速度类
        if (affix.values.attackSpeed) effectValue += affix.values.attackSpeed * 200;
        if (affix.values.projectileSpeed) effectValue += affix.values.projectileSpeed * 100;
        
        // 范围类
        if (affix.values.pickupRange) effectValue += affix.values.pickupRange * 1;
        if (affix.values.orbitalRadius) effectValue += affix.values.orbitalRadius * 2;
        if (affix.values.spread) effectValue += affix.values.spread * 0.8;
        
        // 经验增益
        if (affix.values.expGain) effectValue += affix.values.expGain * 300;
      }
      
      affixValue += rarityValue + effectValue;
    }
    
    // 总价格 = 基础价格 + 词条价值
    // 使用统一的价格计算函数
    return calculateEquipmentPrice(quality, affixes);
  }
  
  createShopContainer() {
    const { width, height } = this.cameras.main;
    this.shopContainer = this.add.container(0, 0);
    
    const startY = 180;
    const itemHeight = 100;
    const padding = 10;
    
    // 创建滚动区域
    const scrollAreaHeight = height - startY - 120;
    const contentHeight = this.equipmentShop.length * (itemHeight + padding);
    
    this.equipmentShop.forEach((item, index) => {
      const yPos = startY + index * (itemHeight + padding);
      const itemContainer = this.createShopItemCard(item, width / 2, yPos, width - 100);
      this.shopContainer.add(itemContainer);
    });
    
    // 如果内容超出，添加滚动功能
    if (contentHeight > scrollAreaHeight) {
      // 添加滚动提示文本（不添加到shopContainer中，保持固定位置）
      const scrollHint = this.add.text(width / 2, height - 100, '⬆ 滚动查看更多 ⬇', {
        fontSize: '16px',
        color: '#888888',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      
      // 存储提示文本引用，以便切换标签时控制显示
      (this.shopContainer as any).scrollHint = scrollHint;
      
      // 添加滚轮事件
      let currentScrollY = 0;
      const maxScroll = Math.max(0, contentHeight - scrollAreaHeight);
      
      this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number, deltaZ: number) => {
        if (this.currentTab === 'equipment' && this.shopContainer.visible) {
          currentScrollY += deltaY * 0.5;
          currentScrollY = Phaser.Math.Clamp(currentScrollY, 0, maxScroll);
          this.shopContainer.y = -currentScrollY;
        }
      });
      
      // 存储滚动状态以便切换标签时重置
      (this.shopContainer as any).resetScroll = () => {
        currentScrollY = 0;
        this.shopContainer.y = 0;
      };
    }
  }
  
  createShopItemCard(item: ShopEquipmentItem, x: number, y: number, cardWidth: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    // 背景卡片
    const bg = this.add.graphics();
    bg.fillStyle(0x2c3e50, 1);
    bg.fillRoundedRect(-cardWidth / 2, -45, cardWidth, 90, 10);
    
    // 品质边框
    const qualityColor = getQualityColorHex(item.quality);
    bg.lineStyle(3, qualityColor, 1);
    bg.strokeRoundedRect(-cardWidth / 2, -45, cardWidth, 90, 10);
    container.add(bg);
    
    // 添加交互区域 - 点击查看详情
    const interactiveZone = this.add.rectangle(0, 0, cardWidth - 200, 90, 0x000000, 0);
    interactiveZone.setInteractive({ useHandCursor: true });
    interactiveZone.on('pointerdown', () => {
      this.showEquipmentDetail(item);
    });
    interactiveZone.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x34495e, 1);
      bg.fillRoundedRect(-cardWidth / 2, -45, cardWidth, 90, 10);
      bg.lineStyle(3, qualityColor, 1);
      bg.strokeRoundedRect(-cardWidth / 2, -45, cardWidth, 90, 10);
    });
    interactiveZone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x2c3e50, 1);
      bg.fillRoundedRect(-cardWidth / 2, -45, cardWidth, 90, 10);
      bg.lineStyle(3, qualityColor, 1);
      bg.strokeRoundedRect(-cardWidth / 2, -45, cardWidth, 90, 10);
    });
    container.add(interactiveZone);
    
    // 装备名称
    const displayName = generateEquipmentName(item.baseItem.name, item.affixes, item.quality);
    const nameText = this.add.text(-cardWidth / 2 + 20, -30, displayName, {
      fontSize: '20px',
      color: getQualityColor(item.quality),
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    container.add(nameText);
    
    // 装备槽位
    const slotName = item.baseItem.slot === 'ring' ? '戒指' : 
                     item.baseItem.slot === 'necklace' ? '项链' : '护甲';
    const slotText = this.add.text(-cardWidth / 2 + 20, 0, `[${slotName}]`, {
      fontSize: '14px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    });
    container.add(slotText);
    
    // 词条信息
    if (item.affixes.length > 0) {
      const affixInfo = item.affixes.map(a => a.name).join(', ');
      const affixText = this.add.text(-cardWidth / 2 + 20, 20, affixInfo, {
        fontSize: '14px',
        color: '#88ccff',
        fontFamily: 'Arial'
      });
      container.add(affixText);
    }
    
    // 价格和购买按钮
    const priceText = this.add.text(cardWidth / 2 - 180, 0, `${item.price} 💰`, {
      fontSize: '20px',
      color: '#ffd700',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    container.add(priceText);
    
    const buyButton = this.add.text(cardWidth / 2 - 20, 0, '购买', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#27ae60',
      padding: { x: 15, y: 8 }
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    
    buyButton.on('pointerover', () => {
      buyButton.setStyle({ backgroundColor: '#2ecc71', color: '#ffff00' });
    });
    
    buyButton.on('pointerout', () => {
      buyButton.setStyle({ backgroundColor: '#27ae60', color: '#ffffff' });
    });
    
    buyButton.on('pointerdown', () => {
      this.purchaseEquipment(item);
    });
    
    container.add(buyButton);
    
    return container;
  }
  
  showEquipmentDetail(item: ShopEquipmentItem) {
    this.detailRenderer.show({
      id: item.baseItem.id,
      affixes: item.affixes,
      quality: item.quality,
      showActions: false,
      onClose: () => {
        // 关闭详情面板
      }
    });
  }
  
  async purchaseEquipment(item: ShopEquipmentItem) {
    if (this.totalCoins >= item.price) {
      // 扣除金币
      if (await SaveManager.spendCoins(item.price)) {
        this.totalCoins -= item.price;
        this.updateCoinDisplay();
        
        // 添加到背包
        await SaveManager.addToInventory({
          id: item.baseItem.id,
          affixes: item.affixes,
          quality: item.quality
        });
        
        // 从商店移除
        const index = this.equipmentShop.indexOf(item);
        if (index > -1) {
          this.equipmentShop.splice(index, 1);
        }
        
        // 保存更新后的商店到存档
        this.saveShopToStorage();
        
        // 重建商店界面
        this.shopContainer.removeAll(true);
        this.createShopContainer();
        
        // 提示
        this.showNotification('购买成功！物品已加入背包', '#27ae60');
      }
    } else {
      this.showNotification('金币不足！', '#e74c3c');
    }
  }
  
  createAttributeContainer() {
    const { width, height } = this.cameras.main;
    this.attributeContainer = this.add.container(0, 0);
    
    const startY = 200;
    
    // 说明文字
    const descText = this.add.text(width / 2, startY, '购买属性提升，仅在本局游戏中生效', {
      fontSize: '20px',
      color: '#cccccc',
      fontFamily: 'Arial',
      align: 'center'
    }).setOrigin(0.5);
    this.attributeContainer.add(descText);
    
    // 技能刷新次数购买
    this.createSkillRefreshPurchase(width / 2, startY + 80);
    
    // 可以在这里添加更多属性购买选项
    
    this.attributeContainer.setVisible(false);
  }
  
  createSkillRefreshPurchase(x: number, y: number) {
    const container = this.add.container(x, y);
    
    // 背景
    const bg = this.add.graphics();
    const cardWidth = 600;
    const cardHeight = 120;
    bg.fillStyle(0x34495e, 1);
    bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10);
    bg.lineStyle(2, 0x3498db, 1);
    bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10);
    container.add(bg);
    
    // 标题
    const titleText = this.add.text(0, -35, '额外技能刷新次数', {
      fontSize: '24px',
      color: '#3498db',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(titleText);
    
    // 说明
    const descText = this.add.text(0, -5, '在游戏中每次升级时可以额外刷新一次技能', {
      fontSize: '16px',
      color: '#bdc3c7',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    container.add(descText);
    
    // 当前数量（确保有默认值）
    const currentCount = this.safeHouseData?.skillRefreshCount ?? 0;
    const countText = this.add.text(-cardWidth / 2 + 30, 30, `当前: ${currentCount} 次`, {
      fontSize: '18px',
      color: '#ffd700',
      fontFamily: 'Arial'
    });
    container.add(countText);
    
    // 价格
    const basePrice = 200;
    const price = basePrice * (currentCount + 1);
    const priceText = this.add.text(cardWidth / 2 - 200, 30, `${price} 💰`, {
      fontSize: '20px',
      color: '#ffd700',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    container.add(priceText);
    
    // 购买按钮
    const buyButton = this.add.text(cardWidth / 2 - 30, 30, '购买 +1', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#3498db',
      padding: { x: 15, y: 8 }
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    
    buyButton.on('pointerover', () => {
      buyButton.setStyle({ backgroundColor: '#5dade2', color: '#ffff00' });
    });
    
    buyButton.on('pointerout', () => {
      buyButton.setStyle({ backgroundColor: '#3498db', color: '#ffffff' });
    });
    
    buyButton.on('pointerdown', async () => {
      if (this.totalCoins >= price) {
        if (await SaveManager.spendCoins(price)) {
          this.totalCoins -= price;
          this.updateCoinDisplay();
          this.safeHouseData.skillRefreshCount++;
          
          // 重建属性商店界面
          this.attributeContainer.removeAll(true);
          this.createAttributeContainer();
          this.attributeContainer.setVisible(true);
          
          this.showNotification('购买成功！技能刷新次数 +1', '#3498db');
        }
      } else {
        this.showNotification('金币不足！', '#e74c3c');
      }
    });
    
    container.add(buyButton);
    this.attributeContainer.add(container);
  }
  
  createStartButton() {
    const { width, height } = this.cameras.main;
    
    const startBtn = this.add.text(width / 2, height - 50, '开始游戏', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      backgroundColor: '#27ae60',
      padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    startBtn.on('pointerover', () => {
      startBtn.setScale(1.05);
      startBtn.setStyle({ backgroundColor: '#2ecc71', color: '#ffff00' });
    });
    
    startBtn.on('pointerout', () => {
      startBtn.setScale(1);
      startBtn.setStyle({ backgroundColor: '#27ae60', color: '#ffffff' });
    });
    
    startBtn.on('pointerdown', () => {
      this.startGame();
    });
  }
  
  createInventoryButton() {
    const { width, height } = this.cameras.main;
    
    const invBtn = this.add.text(width / 2 - 200, height - 50, '背包', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#3498db',
      padding: { x: 20, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    invBtn.on('pointerover', () => {
      invBtn.setStyle({ backgroundColor: '#5dade2', color: '#ffff00' });
    });
    
    invBtn.on('pointerout', () => {
      invBtn.setStyle({ backgroundColor: '#3498db', color: '#ffffff' });
    });
    
    invBtn.on('pointerdown', () => {
      // 传递安全屋数据到背包场景
      this.scene.start('InventoryScene', { returnTo: 'SafeHouseScene', safeHouseData: this.safeHouseData });
    });
  }
  
  createBackButton() {
    const backBtn = this.add.text(40, 40, '← 返回', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#333333',
      padding: { x: 16, y: 8 }
    }).setInteractive({ useHandCursor: true });
    
    backBtn.on('pointerover', () => {
      backBtn.setStyle({ backgroundColor: '#555555', color: '#ffd700' });
    });
    
    backBtn.on('pointerout', () => {
      backBtn.setStyle({ backgroundColor: '#333333', color: '#ffffff' });
    });
    
    backBtn.on('pointerdown', () => {
      this.returnToMenu();
    });
  }

  createSavePathButton() {
    const { width } = this.cameras.main;
    
    const pathBtn = this.add.text(width - 40, 80, '📁 存档位置', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial',
      backgroundColor: '#444444',
      padding: { x: 12, y: 6 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    
    pathBtn.on('pointerover', () => {
      pathBtn.setStyle({ backgroundColor: '#666666', color: '#ffd700' });
    });
    
    pathBtn.on('pointerout', () => {
      pathBtn.setStyle({ backgroundColor: '#444444', color: '#ffffff' });
    });
    
    pathBtn.on('pointerdown', async () => {
      const savePath = await SaveManager.getSaveFilePath();
      const saveInfo = await SaveManager.getSaveInfo();
      
      // 显示通知
      const { width, height } = this.cameras.main;
      
      // 创建半透明背景
      const overlay = this.add.graphics();
      overlay.fillStyle(0x000000, 0.7);
      overlay.fillRect(0, 0, width, height);
      overlay.setDepth(999).setInteractive();
      
      const infoText = `存档信息\n\n${savePath}\n\n存储方式: ${saveInfo.location}\n是否存在: ${saveInfo.exists ? '是' : '否'}\n大小: ${(saveInfo.size / 1024).toFixed(2)} KB`;
      
      const notification = this.add.text(width / 2, height / 2 - 50, infoText, {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial',
        backgroundColor: '#2c3e50',
        padding: { x: 30, y: 20 },
        align: 'left',
        wordWrap: { width: width - 100 }
      }).setOrigin(0.5).setDepth(1000);
      
      // 添加关闭按钮
      const closeBtn = this.add.text(width / 2, height / 2 + 150, '关闭', {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
        backgroundColor: '#e74c3c',
        padding: { x: 20, y: 10 }
      }).setOrigin(0.5).setDepth(1001).setInteractive({ useHandCursor: true });
      
      closeBtn.on('pointerover', () => {
        closeBtn.setStyle({ backgroundColor: '#c0392b' });
      });
      
      closeBtn.on('pointerout', () => {
        closeBtn.setStyle({ backgroundColor: '#e74c3c' });
      });
      
      closeBtn.on('pointerdown', () => {
        overlay.destroy();
        notification.destroy();
        closeBtn.destroy();
      });
    });
  }
  
  updateCoinDisplay() {
    this.coinText.setText(`💰 ${this.totalCoins}`);
  }
  
  showNotification(message: string, color: string) {
    const { width, height } = this.cameras.main;
    
    const notification = this.add.text(width / 2, height / 2 - 100, message, {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      backgroundColor: color,
      padding: { x: 30, y: 20 }
    }).setOrigin(0.5).setAlpha(0);
    
    // 淡入淡出动画
    this.tweens.add({
      targets: notification,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 1000,
      onComplete: () => {
        notification.destroy();
      }
    });
  }
  
  startGame() {
    // 传递安全屋数据到游戏场景
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { safeHouseData: this.safeHouseData });
    });
  }
  
  returnToMenu() {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MenuScene');
    });
  }
}
