import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager';
import { getEquipmentById, EquipmentItem } from '../config/EquipmentConfig';
import { AffixInstance, getAffixTemplateById, Rarity, getQualityColor, generateEquipmentName } from '../config/AffixConfig';

interface InventoryItem {
  id: string;
  affixes: AffixInstance[];
  quality?: Rarity;
}

export class InventoryScene extends Phaser.Scene {
  private selectedSlot: 'ring1' | 'ring2' | 'necklace' | 'cloth' | null = null;
  private slotSprites: { [key: string]: Phaser.GameObjects.Container } = {};
  private inventoryItems: Phaser.GameObjects.Container[] = [];
  private detailPanel?: Phaser.GameObjects.Container;
  
  constructor() {
    super({ key: 'InventoryScene' });
  }
  
  create() {
    const { width, height } = this.cameras.main;
    
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
    
    // 返回按钮
    this.createBackButton();
    
    // 创建装备栏区域
    this.createEquipmentSlots();
    
    // 创建背包区域
    this.createInventoryGrid();
    
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
  
  createEquipmentSlots() {
    const save = SaveManager.loadSave();
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
      bg.on('pointerdown', () => {
        this.showEquipmentDetail(slot.key);
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
  
  createInventoryGrid() {
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
    
    this.refreshInventoryGrid(startX, startY, itemSize, spacing, columns);
  }
  
  refreshInventoryGrid(startX: number, startY: number, itemSize: number, spacing: number, columns: number) {
    // 清除旧的背包物品
    this.inventoryItems.forEach(item => item.destroy());
    this.inventoryItems = [];
    
    const save = SaveManager.loadSave();
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
  
  showEquipmentDetail(slot: 'ring1' | 'ring2' | 'necklace' | 'cloth') {
    // 清除旧的详情面板
    if (this.detailPanel) {
      this.detailPanel.destroy();
    }
    
    const save = SaveManager.loadSave();
    const equippedItem = (save.equipment as any)[slot] as { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
    
    if (!equippedItem || !equippedItem.id) {
      this.showMessage('该槽位为空', 0xffaa00);
      return;
    }
    
    const { width, height } = this.cameras.main;
    const panelWidth = 450;
    const panelHeight = 350 + (equippedItem.affixes?.length || 0) * 25;
    
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setInteractive();
    
    const panel = this.add.container(width / 2, height / 2);
    
    // 面板背景
    const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a2e, 1);
    bg.setStrokeStyle(3, 0xffd700);
    panel.add(bg);
    
    // 标题
    const config = getEquipmentById(equippedItem.id);
    const quality = equippedItem.quality !== undefined ? equippedItem.quality : Rarity.Common;
    const displayName = config ? generateEquipmentName(config.name, equippedItem.affixes || [], quality) : '未知装备';
    const nameColor = getQualityColor(quality);
    const title = this.add.text(0, -panelHeight / 2 + 30, displayName, {
      fontSize: '26px',
      color: nameColor,
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(title);
    
    // 装备类型和槽位
    const slotLabel = { ring1: '戒指 1', ring2: '戒指 2', necklace: '项链', cloth: '衣服' }[slot];
    const typeText = this.add.text(0, -panelHeight / 2 + 65, `类型: ${config?.slot || '未知'} | 槽位: ${slotLabel}`, {
      fontSize: '16px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    panel.add(typeText);
    
    // 装备描述
    if (config?.description) {
      const desc = this.add.text(-panelWidth / 2 + 30, -panelHeight / 2 + 105, config.description, {
        fontSize: '16px',
        color: '#cccccc',
        fontFamily: 'Arial',
        wordWrap: { width: panelWidth - 60 }
      });
      panel.add(desc);
    }
    
    // 基础属性
    let yOffset = -panelHeight / 2 + 150;
    if (config && config.effects) {
      const statsText = this.add.text(-panelWidth / 2 + 30, yOffset, '基础属性:', {
        fontSize: '18px',
        color: '#4caf50',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      });
      panel.add(statsText);
      yOffset += 25;
      
      const eff = config.effects;
      
      // 玩家属性
      if (eff.maxHP) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${eff.maxHP} 最大生命值`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.moveSpeed) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${Math.round(eff.moveSpeed * 100)}% 移动速度`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.pickupRange) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${eff.pickupRange} 拾取范围`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.expGain) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${Math.round(eff.expGain * 100)}% 经验获取`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      
      // 攻击属性
      if (eff.attackSpeed) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${Math.round(eff.attackSpeed * 100)}% 攻击速度`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.projectileCount) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${eff.projectileCount} 子弹数量`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.projectileDamage) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${Math.round(eff.projectileDamage * 100)}% 子弹伤害`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.projectileSpeed) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${Math.round(eff.projectileSpeed * 100)}% 子弹速度`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      
      // 轨道球
      if (eff.orbitalCount) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${eff.orbitalCount} 轨道球数量`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.orbitalDamage) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${eff.orbitalDamage} 轨道球伤害`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.orbitalRadius) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${eff.orbitalRadius} 轨道半径`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.orbitalSpeed) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${Math.round(eff.orbitalSpeed * 100)}% 轨道速度`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      
      // 激光
      if (eff.laserCount) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${eff.laserCount} 激光数量`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.laserDamage) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${eff.laserDamage} 激光伤害`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.laserDuration) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${eff.laserDuration}ms 激光持续时间`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.laserInterval) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `${eff.laserInterval > 0 ? '+' : ''}${eff.laserInterval}ms 激光间隔`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      
      // 爆炸
      if (eff.explosionChance) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${Math.round(eff.explosionChance * 100)}% 爆炸几率`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.explosionDamage) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${eff.explosionDamage} 爆炸伤害`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
      if (eff.explosionRadius) {
        panel.add(this.add.text(-panelWidth / 2 + 40, yOffset, `+ ${eff.explosionRadius} 爆炸范围`, {
          fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
        }));
        yOffset += 22;
      }
    }
    
    // 词条
    if (equippedItem.affixes && equippedItem.affixes.length > 0) {
      yOffset += 10;
      const affixTitle = this.add.text(-panelWidth / 2 + 30, yOffset, '附加词条:', {
        fontSize: '18px',
        color: '#9c27b0',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      });
      panel.add(affixTitle);
      yOffset += 25;
      
      equippedItem.affixes.forEach(affix => {
        const rarityColor = this.getRarityColor([affix]);
        const valStr = Object.entries(affix.values).map(([k, v]) => `${k}: ${v}`).join(', ');
        const affixText = this.add.text(-panelWidth / 2 + 40, yOffset, `• ${affix.name} (${valStr})`, {
          fontSize: '15px',
          color: rarityColor,
          fontFamily: 'Arial'
        });
        panel.add(affixText);
        yOffset += 25;
      });
    }
    
    // 卸下按钮
    const unequipBtn = this.add.text(-70, panelHeight / 2 - 40, '卸下', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      backgroundColor: '#f44336',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    panel.add(unequipBtn);
    
    unequipBtn.on('pointerdown', () => {
      this.unequipItem(slot);
      panel.destroy();
      overlay.destroy();
    });
    
    // 关闭按钮
    const closeBtn = this.add.text(70, panelHeight / 2 - 40, '关闭', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      backgroundColor: '#666666',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    panel.add(closeBtn);
    
    closeBtn.on('pointerdown', () => {
      panel.destroy();
      overlay.destroy();
    });
    
    overlay.on('pointerdown', () => {
      panel.destroy();
      overlay.destroy();
    });
    
    this.detailPanel = panel;
  }
  
  showInventoryItemOptions(item: InventoryItem, index: number) {
    const { width, height } = this.cameras.main;
    const panelWidth = 450;
    const panelHeight = 300 + (item.affixes?.length || 0) * 25;
    
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setInteractive();
    
    const panel = this.add.container(width / 2, height / 2);
    
    // 面板背景
    const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a2e, 1);
    bg.setStrokeStyle(3, 0xffd700);
    panel.add(bg);
    
    const config = getEquipmentById(item.id);
    const quality = item.quality !== undefined ? item.quality : Rarity.Common;
    const displayName = config ? generateEquipmentName(config.name, item.affixes || [], quality) : '未知装备';
    const nameColor = getQualityColor(quality);
    
    // 标题
    const title = this.add.text(0, -panelHeight / 2 + 30, displayName, {
      fontSize: '26px',
      color: nameColor,
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(title);
    
    // 类型
    const typeText = this.add.text(0, -panelHeight / 2 + 65, `类型: ${config?.slot || '未知'}`, {
      fontSize: '16px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    panel.add(typeText);
    
    // 描述
    if (config?.description) {
      const desc = this.add.text(-panelWidth / 2 + 30, -panelHeight / 2 + 95, config.description, {
        fontSize: '15px',
        color: '#cccccc',
        fontFamily: 'Arial',
        wordWrap: { width: panelWidth - 60 }
      });
      panel.add(desc);
    }
    
    // 词条
    let yOffset = -panelHeight / 2 + 140;
    if (item.affixes && item.affixes.length > 0) {
      const affixTitle = this.add.text(-panelWidth / 2 + 30, yOffset, '词条:', {
        fontSize: '16px',
        color: '#9c27b0',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      });
      panel.add(affixTitle);
      yOffset += 25;
      
      item.affixes.forEach(affix => {
        const rarityColor = this.getRarityColor([affix]);
        const valStr = Object.entries(affix.values).map(([k, v]) => `${k}: ${v}`).join(', ');
        const affixText = this.add.text(-panelWidth / 2 + 40, yOffset, `• ${affix.name} (${valStr})`, {
          fontSize: '14px',
          color: rarityColor,
          fontFamily: 'Arial'
        });
        panel.add(affixText);
        yOffset += 25;
      });
    }
    
    // 装备按钮
    const equipBtn = this.add.text(-70, panelHeight / 2 - 40, '装备', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      backgroundColor: '#4caf50',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    panel.add(equipBtn);
    
    equipBtn.on('pointerdown', () => {
      this.equipItemFromInventory(item, index);
      panel.destroy();
      overlay.destroy();
    });
    
    // 丢弃按钮
    const discardBtn = this.add.text(70, panelHeight / 2 - 40, '丢弃', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      backgroundColor: '#f44336',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    panel.add(discardBtn);
    
    discardBtn.on('pointerdown', () => {
      this.discardItem(index);
      panel.destroy();
      overlay.destroy();
    });
    
    overlay.on('pointerdown', () => {
      panel.destroy();
      overlay.destroy();
    });
  }
  
  equipItemFromInventory(item: InventoryItem, index: number) {
    const save = SaveManager.loadSave();
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
    
    SaveManager.saveSave(save);
    
    this.showMessage(`已装备: ${config.name}`, 0x4caf50);
    this.scene.restart();
  }
  
  unequipItem(slot: 'ring1' | 'ring2' | 'necklace' | 'cloth') {
    const save = SaveManager.loadSave();
    const item = (save.equipment as any)[slot];
    
    if (item && item.id) {
      // 放入背包
      if (!save.inventory) save.inventory = [];
      save.inventory.push({ id: item.id, affixes: item.affixes || [], quality: item.quality });
      
      // 清空槽位
      (save.equipment as any)[slot] = { id: null, affixes: [] };
      
      SaveManager.saveSave(save);
      
      const config = getEquipmentById(item.id);
      this.showMessage(`已卸下: ${config?.name || '装备'}`, 0xffaa00);
      this.scene.restart();
    }
  }
  
  discardItem(index: number) {
    const save = SaveManager.loadSave();
    
    if (save.inventory && index >= 0 && index < save.inventory.length) {
      const item = save.inventory[index];
      const config = getEquipmentById(item.id);
      
      save.inventory.splice(index, 1);
      SaveManager.saveSave(save);
      
      this.showMessage(`已丢弃: ${config?.name || '装备'}`, 0xf44336);
      this.scene.restart();
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
      this.scene.start('MenuScene');
    });
  }
}
