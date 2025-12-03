// 装备配置与类型
import { Rarity } from './AffixConfig';

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
