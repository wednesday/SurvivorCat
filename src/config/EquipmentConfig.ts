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
  spread?: number; // 效果范围

  // 攻击特效类型（仅项链）
  projectileSplit?: number; // 子弹分裂数量，例如 2 表示分裂成2个子弹

  // 轨道相关
  orbitalCount?: number;
  orbitalDamage?: number;
  orbitalRadius?: number;
  // orbitalSpeed?: number;

  // 激光相关
  laserCount?: number;
  laserDamage?: number;
  // laserDuration?: number;
  laserInterval?: number;

  // 爆炸相关
  explosionChance?: number;
  explosionDamage?: number;
  // explosionRadius?: number;

  // 玩家相关
  moveSpeed?: number;
  maxHP?: number;
  expGain?: number; // 比例，例如 0.1 表示 +10%
  pickupRange?: number;

  // 备用/拓展字段
  // 可以随时扩展
  drug?: number; // 子弹毒性等级
  ice?: number;  // 子弹寒冷等级

  fire?: number; // 魔法火焰等级
  wind?: number; // 风属性等级

  repulsion?: boolean; // 守护球被扔出去（仅戒指）
}

export interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  slot: EquipmentSlot | 'ring';
  icon?: string;
  effects?: EquipmentEffects;
  quality?: EquipmentQuality; // 装备品质，默认Common
  story?: string; // 装备背景故事
}

// 简单示例装备 - 你可以根据需求扩展
export const EQUIPMENT_CONFIGS: EquipmentItem[] = [
  {
    id: 'ring_of_power',
    name: '力量戒指',
    description: '+1 子弹伤害',
    story: "戒指内侧刻着一行小字：'力量源于代价'。前任主人为了获得强大的力量，最终消失在了废墟深处，只留下这枚沾满血迹的戒指。",
    slot: 'ring',
    effects: {
      projectileDamage: 1
    }
  },
  {
    id: 'ring_of_swiftness',
    name: '迅捷戒指',
    description: '+20 移动速度',
    story: "据说这枚戒指的主人曾是个逃犯，他跑得比任何人都快。但最终，他还是没能逃脱命运的追捕，戒指在他冰冷的手指上被人摘下。",
    slot: 'ring',
    effects: {
      moveSpeed: 20
    }
  },
  {
    id: 'ring_of_drugs',
    name: '污浊戒指',
    description: '+2 子弹毒性',
    story: "怎得如此之脏，来来回回清洗了好多次，还是觉得脏兑允的。",
    slot: 'ring',
    effects: {
      drug: 2
    }
  },
  {
    id: 'ring_of_ice',
    name: '冰霜戒指',
    description: '+2 子弹寒冷',
    story: "这枚戒指永远保持着冰冷的温度，触碰它会让人感到刺骨的寒意。传说它是从冰封千年的古墓中挖掘出来的，前任主人在寒冷中沉睡至今。",
    slot: 'ring',
    effects: {
      ice: 2
    }
  },
  {
    id: 'ring_of_repulsion',
    name: '抗拒者戒指',
    description: '守护之球会被扔出去',
    story: "这枚戒指散发着一股奇异的力量，佩戴者能够感受到周围空间的扭曲。传说它曾属于一位强大的法师，他利用戒指的力量驱散了无数敌人，但最终也被这股力量吞噬。",
    slot: 'ring',
    effects: {
      repulsion: true
    }
  },
  {
    id: 'amulet_of_vigor',
    name: '活力项链',
    description: '+20 最大生命值',
    story: "项链的吊坠中封存着一滴暗红色的液体，据说是某位炼金术士用自己的心血制成。虽然能延续生命，但佩戴者总能听到心跳般的低语声。",
    slot: 'necklace',
    effects: {
      maxHP: 20
    }
  },
  {
    id: 'leather_armor',
    name: '皮甲',
    description: '+10 最大生命值',
    story: "这件皮甲散发着淡淡的腐臭味，缝线处依稀可见旧主人留下的抓痕。它确实能保护你，但你永远不想知道这皮革的真正来源。",
    slot: 'cloth',
    effects: {
      maxHP: 10
    }
  },
  {
    id: 'fire_leather_armor',
    name: '焰甲',
    description: '+1 守护火焰等级',
    story: "这件皮甲散发着淡淡的火焰气息，仿佛能感受到它内部燃烧的热量。传说它是由一位火焰祭司穿戴，他在一次仪式中献祭了自己，以换取永恒的守护之力。",
    slot: 'cloth',
    effects: {
      fire: 1
    }
  },
  {
    id: 'amulet_of_splitting',
    name: '分裂项链',
    description: '子弹分裂成2个',
    story: "项链上的宝石似乎有生命一般，内部不断分裂重组。传说它曾属于一位疯狂的魔法师，他痴迷于分裂万物的魔法，最后连自己的灵魂也一分为二。",
    slot: 'necklace',
    effects: {
      projectileSplit: 2
    }
  },
  {
    id: 'amulet_of_wind',
    name: '风之力',
    description: '+1 风属性等级',
    story: "这条项链据说蕴含着风神的力量，佩戴者能够感受到风的轻抚与怒吼。传说一位冒险者在暴风雨中获得了它，从此他能驾驭风的力量，穿越任何障碍。",
    slot: 'necklace',
    effects: {
      wind: 1
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

      // 范围类
      if (affix.values.pickupRange) effectValue += affix.values.pickupRange * 0.5;
      if (affix.values.orbitalRadius) effectValue += affix.values.orbitalRadius * 0.3;
      if (affix.values.spread) effectValue += affix.values.spread * 0.8;

      // 特殊效果
      if (affix.values.projectileSplit) effectValue += affix.values.projectileSplit * 50;
      if (affix.values.explosionChance) effectValue += (affix.values.explosionChance || 0) * 200;
      if (affix.values.expGain) effectValue += (affix.values.expGain || 0) * 100;

      // 毒性效果
      if (affix.values.drug) effectValue += affix.values.drug * 8;

      // 寒冷效果
      if (affix.values.ice) effectValue += affix.values.ice * 8;
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
