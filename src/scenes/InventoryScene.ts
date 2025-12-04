import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager';
import { getEquipmentById, EquipmentItem, calculateEquipmentSellPrice } from '../config/EquipmentConfig';
import { AffixInstance, getAffixTemplateById, Rarity, getQualityColor, generateEquipmentName } from '../config/AffixConfig';
import { EquipmentDetailRenderer } from '../systems/EquipmentDetailRenderer';

interface InventoryItem {
  id: string;
  affixes: AffixInstance[];
  quality?: Rarity;
}

export class InventoryScene extends Phaser.Scene {
  private selectedSlot: 'ring1' | 'ring2' | 'necklace' | 'cloth' | null = null;
  private slotSprites: { [key: string]: Phaser.GameObjects.Container } = {};
  private inventoryItems: Phaser.GameObjects.Container[] = [];
  private detailRenderer!: EquipmentDetailRenderer;
  private returnTo: 'MenuScene' | 'SafeHouseScene' = 'MenuScene';
  private safeHouseData?: any;
  private totalCoins: number = 0;
  private coinText!: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: 'InventoryScene' });
  }
  
  init(data?: any) {
    // 接收返回场景信息
    if (data && data.returnTo) {
      this.returnTo = data.returnTo;
    } else {
      this.returnTo = 'MenuScene';
    }
    
    if (data && data.safeHouseData) {
      this.safeHouseData = data.safeHouseData;
    }
  }
  
  async create() {
    const { width, height } = this.cameras.main;
    
    // 加载金币数
    this.totalCoins = await SaveManager.getTotalCoins();
    
    // 初始化装备详情渲染器
    this.detailRenderer = new EquipmentDetailRenderer(this);
    
    // 创建背景
    this.createBackground();
    
    // 标题
    this.add.text(width / 2, 40, '装备与背包管理', {
      fontSize: '36px',
      color: '#ffd700',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
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
    
    // 返回按钮
    this.createBackButton();
    
    // 创建装备栏区域
    await this.createEquipmentSlots();
    
    // 创建背包区域
    await this.createInventoryGrid();
    
    // 创建详情面板
    this.createDetailPanel();
    
    // 添加说明文字
    this.add.text(width / 2, height - 30, '点击装备栏查看详情 | 点击背包物品装备或丢弃 | ESC 返回', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'Arial',
      align: 'center'
    }).setOrigin(0.5);
    
    // ESC键返回
    this.input.keyboard!.on('keydown-ESC', () => {
      this.returnToMenu();
    });
  }
  
  createBackground() {
    const { width, height } = this.cameras.main;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a1a2e, 0x1a1a2e, 1);
    bg.fillRect(0, 0, width, height);
    
    // 添加装饰性网格
    bg.lineStyle(1, 0x333333, 0.3);
    for (let x = 0; x < width; x += 50) {
      bg.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 50) {
      bg.lineBetween(0, y, width, y);
    }
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
  
  async createEquipmentSlots() {
    const save = await SaveManager.loadSave();
    const startX = 150;
    const startY = 220;
    const slotSize = 100;
    const spacing = 140;
    
    const slots = [
      { key: 'ring1' as const, label: '戒指 1', x: startX, y: startY },
      { key: 'ring2' as const, label: '戒指 2', x: startX + spacing, y: startY },
      { key: 'necklace' as const, label: '项链', x: startX, y: startY + spacing },
      { key: 'cloth' as const, label: '衣服', x: startX + spacing, y: startY + spacing }
    ];
    
    // 装备栏标题
    this.add.text(startX + spacing / 2, startY - 100, '装备栏', {
      fontSize: '24px',
      color: '#ffd700',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    slots.forEach(slot => {
      const container = this.add.container(slot.x, slot.y);
      
      // 槽位背景
      const bg = this.add.rectangle(0, 0, slotSize, slotSize, 0x2a2a3e, 1);
      bg.setStrokeStyle(3, 0x4a4a5e);
      container.add(bg);
      
      // 槽位标签
      const label = this.add.text(0, -slotSize / 2 - 20, slot.label, {
        fontSize: '16px',
        color: '#aaaaaa',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      container.add(label);
      
      // 获取装备信息
      const equippedItem = (save.equipment as any)[slot.key] as { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
      
      if (equippedItem && equippedItem.id) {
        const config = getEquipmentById(equippedItem.id);
        if (config) {
          const quality = equippedItem.quality !== undefined ? equippedItem.quality : Rarity.Common;
          const displayName = generateEquipmentName(config.name, equippedItem.affixes || [], quality);
          const nameColor = getQualityColor(quality);
          
          // 装备图标（使用文字表示）
          const icon = this.add.text(0, -10, this.getEquipmentIcon(config), {
            fontSize: '32px',
            color: nameColor,
            fontFamily: 'Arial'
          }).setOrigin(0.5);
          container.add(icon);
          
          // 装备名称
          const name = this.add.text(0, 30, displayName, {
            fontSize: '14px',
            color: nameColor,
            fontFamily: 'Arial',
            wordWrap: { width: slotSize - 10 }
          }).setOrigin(0.5);
          container.add(name);
        }
      } else {
        // 空槽位提示
        const emptyText = this.add.text(0, 0, '空', {
          fontSize: '20px',
          color: '#555555',
          fontFamily: 'Arial'
        }).setOrigin(0.5);
        container.add(emptyText);
      }
      
      // 添加交互
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', async () => {
        await this.showEquipmentDetail(slot.key);
      });
      
      bg.on('pointerover', () => {
        bg.setStrokeStyle(3, 0xffd700);
      });
      
      bg.on('pointerout', () => {
        bg.setStrokeStyle(3, 0x4a4a5e);
      });
      
      this.slotSprites[slot.key] = container;
    });
  }
  
  async createInventoryGrid() {
    const { width } = this.cameras.main;
    const startX = width / 2 + 100;
    const startY = 120;
    const itemSize = 80;
    const spacing = 95;
    const columns = 4;
    
    // 背包标题
    this.add.text(startX + (columns * spacing) / 2 - spacing / 2, startY - 50, '背包', {
      fontSize: '24px',
      color: '#ffd700',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    await this.refreshInventoryGrid(startX, startY, itemSize, spacing, columns);
  }
  
  async refreshInventoryGrid(startX: number, startY: number, itemSize: number, spacing: number, columns: number) {
    // 清除旧的背包物品
    this.inventoryItems.forEach(item => item.destroy());
    this.inventoryItems = [];
    
    const save = await SaveManager.loadSave();
    const inventory = save.inventory || [];
    
    inventory.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * spacing;
      const y = startY + row * spacing;
      
      const container = this.add.container(x, y);
      
      // 物品背景
      const bg = this.add.rectangle(0, 0, itemSize, itemSize, 0x2a2a3e, 1);
      const quality = item.quality !== undefined ? item.quality : Rarity.Common;
      bg.setStrokeStyle(2, this.getRarityBorderColor([{ rarity: quality } as any]));
      container.add(bg);
      
      // 物品图标
      const config = getEquipmentById(item.id);
      if (config) {
        const displayName = generateEquipmentName(config.name, item.affixes || [], quality);
        const nameColor = getQualityColor(quality);
        
        const icon = this.add.text(0, -10, this.getEquipmentIcon(config), {
          fontSize: '28px',
          color: nameColor,
          fontFamily: 'Arial'
        }).setOrigin(0.5);
        container.add(icon);
        
        // 物品名称（简化）
        const name = this.add.text(0, 25, displayName, {
          fontSize: '12px',
          color: nameColor,
          fontFamily: 'Arial',
          wordWrap: { width: itemSize - 10 }
        }).setOrigin(0.5);
        container.add(name);
      }
      
      // 添加交互
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        this.showInventoryItemOptions(item, index);
      });
      
      bg.on('pointerover', () => {
        bg.setStrokeStyle(3, 0xffd700);
      });
      
      bg.on('pointerout', () => {
        bg.setStrokeStyle(2, this.getRarityBorderColor(item.affixes));
      });
      
      this.inventoryItems.push(container);
    });
    
    // 显示背包空间信息
    const capacityText = this.add.text(startX + (columns * spacing) / 2 - spacing / 2, startY - 25, `${inventory.length} / 无限`, {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
  }
  
  createDetailPanel() {
    // 详情面板将在需要时动态创建
  }
  
  async showEquipmentDetail(slot: 'ring1' | 'ring2' | 'necklace' | 'cloth') {
    const save = await SaveManager.loadSave();
    const equippedItem = (save.equipment as any)[slot] as { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
    
    if (!equippedItem || !equippedItem.id) {
      this.showMessage('该槽位为空', 0xffaa00);
      return;
    }
    
    const slotLabel = { ring1: '戒指 1', ring2: '戒指 2', necklace: '项链', cloth: '衣服' }[slot];
    
    this.detailRenderer.show({
      id: equippedItem.id,
      affixes: equippedItem.affixes || [],
      quality: equippedItem.quality !== undefined ? equippedItem.quality : Rarity.Common,
      slotLabel: slotLabel,
      showActions: true,
      onUnequip: async () => {
        await this.unequipItem(slot);
        this.detailRenderer.hide();
      },
      onClose: () => {
        this.detailRenderer.hide();
      }
    });
  }
  
  showInventoryItemOptions(item: InventoryItem, index: number) {
    this.detailRenderer.show({
      id: item.id,
      affixes: item.affixes || [],
      quality: item.quality !== undefined ? item.quality : Rarity.Common,
      showActions: true,
      onEquip: async () => {
        await this.equipItemFromInventory(item, index);
        this.detailRenderer.hide();
      },
      onSell: async () => {
        await this.sellItem(index);
        this.detailRenderer.hide();
      },
      onClose: () => {
        this.detailRenderer.hide();
      }
    });
  }
  
  async equipItemFromInventory(item: InventoryItem, index: number) {
    const save = await SaveManager.loadSave();
    const config = getEquipmentById(item.id);
    
    if (!config) {
      this.showMessage('装备配置错误', 0xff0000);
      return;
    }
    
    // 确定目标槽位
    let targetSlot: 'ring1' | 'ring2' | 'necklace' | 'cloth' = 'cloth';
    if (config.slot === 'ring') {
      const ring1 = (save.equipment as any).ring1;
      const ring2 = (save.equipment as any).ring2;
      targetSlot = (!ring1 || !ring1.id) ? 'ring1' : (!ring2 || !ring2.id) ? 'ring2' : 'ring1';
    } else if (config.slot === 'necklace') {
      targetSlot = 'necklace';
    } else if (config.slot === 'cloth') {
      targetSlot = 'cloth';
    }
    
    // 如果目标槽位有装备，放回背包
    const oldItem = (save.equipment as any)[targetSlot];
    if (oldItem && oldItem.id) {
      if (!save.inventory) save.inventory = [];
      save.inventory.push({ id: oldItem.id, affixes: oldItem.affixes || [], quality: oldItem.quality });
    }
    
    // 装备新物品
    (save.equipment as any)[targetSlot] = { id: item.id, affixes: item.affixes, quality: item.quality };
    
    // 从背包移除
    if (save.inventory) {
      save.inventory.splice(index, 1);
    }
    
    await SaveManager.saveSave(save);
    
    this.showMessage(`已装备: ${config.name}`, 0x4caf50);
    this.scene.restart();
  }
  
  async unequipItem(slot: 'ring1' | 'ring2' | 'necklace' | 'cloth') {
    const save = await SaveManager.loadSave();
    const item = (save.equipment as any)[slot];
    
    if (item && item.id) {
      // 放入背包
      if (!save.inventory) save.inventory = [];
      save.inventory.push({ id: item.id, affixes: item.affixes || [], quality: item.quality });
      
      // 清空槽位
      (save.equipment as any)[slot] = { id: null, affixes: [] };
      
      await SaveManager.saveSave(save);
      
      const config = getEquipmentById(item.id);
      this.showMessage(`已卸下: ${config?.name || '装备'}`, 0xffaa00);
      this.scene.restart();
    }
  }
  
  async sellItem(index: number) {
    const save = await SaveManager.loadSave();
    
    if (save.inventory && index >= 0 && index < save.inventory.length) {
      const item = save.inventory[index];
      const config = getEquipmentById(item.id);
      
      // 计算出售价格（购买价格的1/10）
      const quality = item.quality !== undefined ? item.quality : Rarity.Common;
      const sellPrice = calculateEquipmentSellPrice(quality, item.affixes || []);
      
      // 移除装备并增加金币（在同一个存档对象上操作）
      save.inventory.splice(index, 1);
      save.totalCoins += sellPrice;
      await SaveManager.saveSave(save);
      
      // 更新金币显示
      this.totalCoins = save.totalCoins;
      this.coinText.setText(`💰 ${this.totalCoins}`);
      
      // 刷新背包显示而不是重启场景
      const { width } = this.cameras.main;
      const startX = width / 2 + 100;
      const startY = 120;
      const itemSize = 80;
      const spacing = 95;
      const columns = 4;
      await this.refreshInventoryGrid(startX, startY, itemSize, spacing, columns);
      
      this.showMessage(`已出售: ${config?.name || '装备'} (+${sellPrice}💰)`, 0xff9800);
    }
  }
  
  showMessage(text: string, color: number) {
    const { width, height } = this.cameras.main;
    const msg = this.add.text(width / 2, height / 2 - 100, text, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: msg,
      alpha: 0,
      y: msg.y - 50,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => msg.destroy()
    });
  }
  
  getEquipmentIcon(config: EquipmentItem): string {
    const icons: { [key: string]: string } = {
      ring: '💍',
      necklace: '📿',
      cloth: '👕'
    };
    return icons[config.slot] || '❓';
  }
  
  getRarityColor(affixes: AffixInstance[]): string {
    if (!affixes || affixes.length === 0) return '#ffffff';
    
    const hasLegendary = affixes.some(a => a.rarity === Rarity.Legendary);
    const hasEpic = affixes.some(a => a.rarity === Rarity.Epic);
    const hasRare = affixes.some(a => a.rarity === Rarity.Rare);
    
    if (hasLegendary) return '#ff6600';
    if (hasEpic) return '#9c27b0';
    if (hasRare) return '#2196f3';
    return '#4caf50';
  }
  
  getRarityBorderColor(affixes: AffixInstance[]): number {
    if (!affixes || affixes.length === 0) return 0x4a4a5e;
    
    const hasLegendary = affixes.some(a => a.rarity === Rarity.Legendary);
    const hasEpic = affixes.some(a => a.rarity === Rarity.Epic);
    const hasRare = affixes.some(a => a.rarity === Rarity.Rare);
    
    if (hasLegendary) return 0xff6600;
    if (hasEpic) return 0x9c27b0;
    if (hasRare) return 0x2196f3;
    return 0x4caf50;
  }
  
  returnToMenu() {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.returnTo === 'SafeHouseScene') {
        this.scene.start('SafeHouseScene', this.safeHouseData);
      } else {
        this.scene.start('MenuScene');
      }
    });
  }
}
