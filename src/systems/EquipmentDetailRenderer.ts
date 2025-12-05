import Phaser from 'phaser';
import { getEquipmentById, EquipmentItem, calculateEquipmentSellPrice } from '../config/EquipmentConfig';
import { AffixInstance, Rarity, getQualityColor, generateEquipmentName, getAffixTemplateById } from '../config/AffixConfig';

export interface EquipmentDetailOptions {
  id: string;
  affixes: AffixInstance[];
  quality: Rarity;
  slotLabel?: string; // 可选的槽位标签，如 "戒指 1"
  showActions?: boolean; // 是否显示操作按钮
  onUnequip?: () => void; // 卸下回调
  onEquip?: () => void; // 装备回调
  onSell?: () => void; // 出售回调
  onClose?: () => void; // 关闭回调
}

/**
 * 装备详情渲染器 - 用于显示装备的详细信息
 */
export class EquipmentDetailRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 显示装备详情面板
   */
  show(options: EquipmentDetailOptions) {
    // 清除旧的面板
    this.hide();

    const { width, height } = this.scene.cameras.main;
    const config = getEquipmentById(options.id);
    
    if (!config) {
      console.warn('找不到装备配置:', options.id);
      return;
    }

    // 计算面板高度
    const baseHeight = 350;
    const storyHeight = config.story ? 80 : 0; // 为故事预留空间
    const affixHeight = (options.affixes?.length || 0) * 25;
    const actionHeight = options.showActions ? 60 : 0;
    const panelHeight = baseHeight + storyHeight + affixHeight + actionHeight;
    const panelWidth = 450;

    // 创建半透明遮罩
    this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    this.overlay.setInteractive();
    this.overlay.on('pointerdown', () => {
      if (options.onClose) {
        options.onClose();
      }
      this.hide();
    });

    // 创建面板容器
    this.container = this.scene.add.container(width / 2, height / 2);

    // 面板背景
    const bg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a2e, 1);
    bg.setStrokeStyle(3, 0xffd700);
    this.container.add(bg);

    // 装备名称
    const displayName = generateEquipmentName(config.name, options.affixes || [], options.quality);
    const nameColor = getQualityColor(options.quality);
    const title = this.scene.add.text(0, -panelHeight / 2 + 30, displayName, {
      fontSize: '26px',
      color: nameColor,
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);

    // 装备类型和槽位
    let typeStr = `类型: ${config.slot || '未知'}`;
    if (options.slotLabel) {
      typeStr += ` | 槽位: ${options.slotLabel}`;
    }
    const typeText = this.scene.add.text(0, -panelHeight / 2 + 65, typeStr, {
      fontSize: '16px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    this.container.add(typeText);

    // 显示出售价格（如果有出售功能）- 右上角固定位置
    if (options.onSell && this.container) {
      const sellPrice = calculateEquipmentSellPrice(options.quality, options.affixes || []);
      const sellPriceText = this.scene.add.text(panelWidth / 2 - 20, -panelHeight / 2 + 20, `💰 ${sellPrice}`, {
        fontSize: '16px',
        color: '#ffd700',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(1, 0);
      this.container.add(sellPriceText);
    }

    // 装备描述
    if (config.description) {
      const desc = this.scene.add.text(-panelWidth / 2 + 30, -panelHeight / 2 + 105, config.description, {
        fontSize: '16px',
        color: '#cccccc',
        fontFamily: 'Arial',
        wordWrap: { width: panelWidth - 60 }
      });
      this.container.add(desc);
    }

    // 装备故事
    let yOffset = -panelHeight / 2 + 135;
    if (config.story) {
      const storyText = this.scene.add.text(-panelWidth / 2 + 30, yOffset, config.story, {
        fontSize: '13px',
        color: '#999999',
        fontFamily: 'Arial',
        fontStyle: 'italic',
        wordWrap: { width: panelWidth - 60, useAdvancedWrap: true },
        lineSpacing: 3
      });
      this.container.add(storyText);
      yOffset += storyText.height + 15;
    } else {
      yOffset = -panelHeight / 2 + 150;
    }

    // 词条
    if (options.affixes && options.affixes.length > 0 && this.container) {
      yOffset += 10;
      const affixTitle = this.scene.add.text(-panelWidth / 2 + 30, yOffset, '附加词条:', {
        fontSize: '18px',
        color: '#9c27b0',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      });
      this.container.add(affixTitle);
      yOffset += 25;

      options.affixes.forEach(affix => {
        const rarityColor = this.getRarityColor([affix]);
        const template = getAffixTemplateById(affix.id);
        let affixDesc = affix.name;
        
        if (template && template.description) {
          // 使用描述模板，将 {value} 替换为实际值
          affixDesc = template.description;
          // 获取第一个效果值
          const firstValue = Object.values(affix.values)[0];
          if (firstValue !== undefined) {
            // 格式化值：如果是百分比（小于1的小数），转换为百分比显示
            let displayValue: string;
            if (Math.abs(firstValue) < 1 && firstValue !== 0) {
              displayValue = `${Math.round(firstValue * 100)}`;
            } else {
              displayValue = String(firstValue);
            }
            affixDesc = affixDesc.replace('{value}', displayValue);
          }
        }
        
        const affixText = this.scene.add.text(-panelWidth / 2 + 40, yOffset, `• ${affixDesc}`, {
          fontSize: '15px',
          color: rarityColor,
          fontFamily: 'Arial'
        });
        this.container!.add(affixText);
        yOffset += 25;
      });
    }

    // 操作按钮
    if (options.showActions) {
      this.renderActionButtons(options, panelWidth, panelHeight);
    }
  }

  /**
   * 渲染装备效果
   */
  private renderEffects(effects: any, panelWidth: number, startY: number): number {
    let yOffset = startY;
    const leftMargin = -panelWidth / 2 + 40;

    // 玩家属性
    if (effects.maxHP) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.maxHP} 最大生命值`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }
    if (effects.moveSpeed) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.moveSpeed} 移动速度`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }
    if (effects.pickupRange) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.pickupRange} 拾取范围`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }
    if (effects.expGain) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${Math.round(effects.expGain * 100)}% 经验获取`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }

    // 攻击属性
    if (effects.attackSpeed) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.attackSpeed} 攻击速度`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }
    if (effects.projectileCount) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.projectileCount} 子弹数量`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }
    if (effects.projectileDamage) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.projectileDamage} 子弹伤害`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }
    if (effects.projectileSpeed) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${Math.round(effects.projectileSpeed * 100)}% 子弹速度`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }

    // 守护球
    if (effects.orbitalCount) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.orbitalCount} 守护球数量`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }
    if (effects.orbitalDamage) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.orbitalDamage} 守护球伤害`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }
    if (effects.orbitalRadius) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.orbitalRadius} 轨道半径`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }

    // 激光
    if (effects.laserCount) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.laserCount} 激光数量`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }
    if (effects.laserDamage) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.laserDamage} 激光伤害`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }
    if (effects.laserInterval) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `${effects.laserInterval > 0 ? '+' : ''}${effects.laserInterval}ms 激光间隔`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }

    // 爆炸
    if (effects.explosionChance) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${Math.round(effects.explosionChance * 100)}% 爆炸几率`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }
    if (effects.explosionDamage) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.explosionDamage} 爆炸伤害`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }

    // 效果范围
    if (effects.spread) {
      this.container!.add(this.scene.add.text(leftMargin, yOffset, `+ ${effects.spread} 效果范围`, {
        fontSize: '15px', color: '#00ff00', fontFamily: 'Arial'
      }));
      yOffset += 22;
    }

    return yOffset;
  }

  /**
   * 渲染操作按钮
   */
  private renderActionButtons(options: EquipmentDetailOptions, panelWidth: number, panelHeight: number) {
    const buttonY = panelHeight / 2 - 40;
    let buttonX = 0;
    const buttonSpacing = 140;

    // 计算需要显示的按钮数量
    const buttons = [];
    
    if (options.onUnequip) {
      buttons.push({ label: '卸下', color: '#f44336', callback: options.onUnequip });
    }
    
    if (options.onEquip) {
      buttons.push({ label: '装备', color: '#4caf50', callback: options.onEquip });
    }
    
    if (options.onSell) {
      buttons.push({ label: '出售', color: '#ff9800', callback: options.onSell });
    }

    // 添加关闭按钮
    buttons.push({ label: '关闭', color: '#666666', callback: () => {
      if (options.onClose) options.onClose();
      this.hide();
    }});

    // 计算起始位置，使按钮居中
    const totalWidth = (buttons.length - 1) * buttonSpacing;
    buttonX = -totalWidth / 2;

    // 创建按钮
    buttons.forEach((btn) => {
      const button = this.scene.add.text(buttonX, buttonY, btn.label, {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        backgroundColor: btn.color,
        padding: { x: 20, y: 10 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      
      button.on('pointerover', () => {
        button.setScale(1.1);
      });
      
      button.on('pointerout', () => {
        button.setScale(1);
      });
      
      button.on('pointerdown', () => {
        btn.callback();
      });
      
      this.container!.add(button);
      buttonX += buttonSpacing;
    });
  }

  /**
   * 获取词条稀有度颜色
   */
  private getRarityColor(affixes: AffixInstance[]): string {
    if (affixes.length === 0) return '#ffffff';
    
    // 根据词条数量和强度返回不同颜色
    const totalPower = affixes.reduce((sum, affix) => {
      const values = Object.values(affix.values) as number[];
      return sum + values.reduce((a, b) => a + Math.abs(b), 0);
    }, 0);
    
    if (totalPower > 100) return '#ff6600'; // 传奇橙色
    if (totalPower > 50) return '#a335ee'; // 史诗紫色
    if (totalPower > 20) return '#0070dd'; // 稀有蓝色
    return '#1eff00'; // 绿色
  }

  /**
   * 隐藏并销毁详情面板
   */
  hide() {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }

  /**
   * 清理资源
   */
  destroy() {
    this.hide();
  }
}
