// 装备配置与类型
import { Rarity, AffixInstance } from './AffixConfig';

export type EquipmentSlot = 'ring' | 'necklace' | 'cloth';
export type EquipmentQuality = Rarity; // 装备品质与词条稀有度统一

export interface EquipmentEffects {
  // 子弹/攻击相关
  projectileCount?: number;
  projectileDamage?: number;
  projectileSpeed?: number; // 例如 0.3 表示 +30% 子弹速度
  attackSpeed?: number; // 例如 0.15 表示 +15% 攻击速度

  // 攻击特效类型（仅项链）
  projectileSplit?: number; // 子弹分裂数量，例如 2 表示分裂成2个子弹

  // 轨道相关
  orbitalCount?: number;
  orbitalDamage?: number;
  orbitalRadius?: number;
  orbitalSpeed?: number;

  // 激光相关
  laserCount?: number;
  laserDamage?: number;
  laserDuration?: number;
  laserInterval?: number;

  // 爆炸相关
  explosionChance?: number;
  explosionDamage?: number;
  explosionRadius?: number;

  // 玩家相关
  moveSpeed?: number;
  maxHP?: number;
  expGain?: number; // 比例，例如 0.1 表示 +10%
  pickupRange?: number;

  // 备用/拓展字段
  // 可以随时扩展
}

export interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  slot: EquipmentSlot | 'ring';
  icon?: string;
  effects?: EquipmentEffects;
  quality?: EquipmentQuality; // 装备品质，默认Common
}

// 简单示例装备 - 你可以根据需求扩展
export const EQUIPMENT_CONFIGS: EquipmentItem[] = [
  {
    id: 'ring_of_power',
    name: '力量戒指',
    description: '+1 子弹伤害',
    slot: 'ring',
    effects: {
      projectileDamage: 1
    }
  },
  {
    id: 'ring_of_swiftness',
    name: '迅捷戒指',
    description: '+20 移动速度',
    slot: 'ring',
    effects: {
      moveSpeed: 20
    }
  },
  {
    id: 'amulet_of_vigor',
    name: '活力项链',
    description: '+20 最大生命值',
    slot: 'necklace',
    effects: {
      maxHP: 20
    }
  },
  {
    id: 'leather_armor',
    name: '皮甲',
    description: '+10 最大生命值',
    slot: 'cloth',
    effects: {
      maxHP: 10
    }
  },
  {
    id: 'amulet_of_splitting',
    name: '分裂项链',
    description: '子弹分裂成2个',
    slot: 'necklace',
    effects: {
      projectileSplit: 2
    }
  }
];

export function getEquipmentById(id: string | null): EquipmentItem | undefined {
  if (!id) return undefined;
  return EQUIPMENT_CONFIGS.find(e => e.id === id);
}

/**
 * 计算装备价格（用于购买和出售）
 * @param quality 装备品质
 * @param affixes 附加词条
 * @returns 装备价格
 */
export function calculateEquipmentPrice(quality: Rarity, affixes: AffixInstance[]): number {
  // 基础价格根据品质
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
    // 词条稀有度基础价值
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
      if (affix.values.projectileDamage) effectValue += affix.values.projectileDamage * 10;
      if (affix.values.orbitalDamage) effectValue += affix.values.orbitalDamage * 8;
      if (affix.values.laserDamage) effectValue += affix.values.laserDamage * 8;
      if (affix.values.explosionDamage) effectValue += affix.values.explosionDamage * 5;
      
      // 数量类
      if (affix.values.projectileCount) effectValue += affix.values.projectileCount * 30;
      if (affix.values.orbitalCount) effectValue += affix.values.orbitalCount * 40;
      if (affix.values.laserCount) effectValue += affix.values.laserCount * 35;
      
      // 速度/倍率类
      if (affix.values.attackSpeed) effectValue += affix.values.attackSpeed * 15;
      if (affix.values.projectileSpeed) effectValue += (affix.values.projectileSpeed || 0) * 100;
      if (affix.values.orbitalSpeed) effectValue += (affix.values.orbitalSpeed || 0) * 100;
      
      // 范围类
      if (affix.values.pickupRange) effectValue += affix.values.pickupRange * 0.5;
      if (affix.values.orbitalRadius) effectValue += affix.values.orbitalRadius * 0.3;
      if (affix.values.explosionRadius) effectValue += affix.values.explosionRadius * 1;
      
      // 特殊效果
      if (affix.values.projectileSplit) effectValue += affix.values.projectileSplit * 50;
      if (affix.values.explosionChance) effectValue += (affix.values.explosionChance || 0) * 200;
      if (affix.values.expGain) effectValue += (affix.values.expGain || 0) * 100;
    }
    
    affixValue += rarityValue + effectValue;
  }
  
  return Math.round(basePrice + affixValue);
}

/**
 * 计算装备出售价格（购买价格的1/10）
 * @param quality 装备品质
 * @param affixes 附加词条
 * @returns 出售价格
 */
export function calculateEquipmentSellPrice(quality: Rarity, affixes: AffixInstance[]): number {
  return Math.round(calculateEquipmentPrice(quality, affixes) / 10);
}
