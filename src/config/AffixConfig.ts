import { EquipmentEffects } from './EquipmentConfig';

export enum Rarity {
  Common = 0,
  Rare = 1,
  Epic = 2,
  Legendary = 4
};

// 词条类型
export enum AffixType {
  Basic = 'basic',        // 基础（公共）词条：通用属性提升
  Effect = 'effect',      // 特效词条：特殊效果（如轨道、激光、爆炸）
  Special = 'special'     // 特殊词条：稀有特殊效果（如子弹分裂）
}

export interface AffixTemplate {
  id: string;
  name: string;
  description?: string; // generic description for base value
  type: AffixType; // 词条类型
  baseEffects: EquipmentEffects; // base values to be scaled by rarity
  weight?: number; // base weight for selection
  allowedSlots?: ('ring' | 'necklace' | 'cloth')[]; // 限定可生成的装备槽位，undefined表示所有槽位
  minQuality?: Rarity; // 需要的最低装备品质，undefined表示无限制
}

// 实例化的词条，带有实际值与稀有度
export interface AffixInstance {
  id: string;
  name: string;
  rarity: Rarity;
  values: EquipmentEffects; // actual numeric values applied
}

// rarity tiers and their multipliers / weights
export const RARITY_TIERS: { rarity: Rarity; multiplier: number; weight: number; range: [number, number] }[] = [
  { rarity: Rarity.Common, multiplier: 1.0, weight: 60, range: [0.9, 1.1] },
  { rarity: Rarity.Rare, multiplier: 1.3, weight: 25, range: [1.05, 1.25] },
  { rarity: Rarity.Epic, multiplier: 1.6, weight: 10, range: [1.15, 1.35] },
  { rarity: Rarity.Legendary, multiplier: 2.0, weight: 5, range: [1.2, 1.5] }
];

export const AFFIX_TEMPLATES: AffixTemplate[] = [
  // ========== 基础（公共）词条 ==========
  { id: 'affix_fortitude', name: '坚韧的', description: '+ 最大生命值', type: AffixType.Basic, baseEffects: { maxHP: 15 }, weight: 10 },
  { id: 'affix_swift', name: '迅捷的', description: '+ 移动速度', type: AffixType.Basic, baseEffects: { moveSpeed: 15 }, weight: 10 },
  { id: 'affix_power', name: '强力的', description: '+ 子弹伤害', type: AffixType.Basic, baseEffects: { projectileDamage: 1 }, weight: 8 },
  { id: 'affix_barrage', name: '弹幕之', description: '+ 子弹数量', type: AffixType.Basic, baseEffects: { projectileCount: 1 }, weight: 6 },
  { id: 'affix_magnet', name: '磁力之', description: '+ 拾取范围', type: AffixType.Basic, baseEffects: { pickupRange: 30 }, weight: 6 },
  { id: 'affix_sage', name: '贤者的', description: '+ 经验获取', type: AffixType.Basic, baseEffects: { expGain: 0.1 }, weight: 4 },
  { id: 'affix_haste', name: '急速的', description: '+ 攻击速度', type: AffixType.Basic, baseEffects: { attackSpeed: 0.15 }, weight: 8 },
  { id: 'affix_bulletspeed', name: '穿透的', description: '+ 子弹速度', type: AffixType.Basic, baseEffects: { projectileSpeed: 0.3 }, weight: 7 },
  { id: 'affix_experience_big', name: '学识之', description: '+ 经验获取', type: AffixType.Basic, baseEffects: { expGain: 0.2 }, weight: 2 },
  { id: 'affix_hp_boost', name: '生命之', description: '+ 最大生命值', type: AffixType.Basic, baseEffects: { maxHP: 30 }, weight: 3 },

  // ========== 特效词条 ==========
  { id: 'affix_orbital_guard', name: '守护之', description: '+ 轨道球', type: AffixType.Effect, baseEffects: { orbitalCount: 1 }, weight: 6 },
  { id: 'affix_orbital_strike', name: '打击之', description: '+ 轨道伤害', type: AffixType.Effect, baseEffects: { orbitalDamage: 2 }, weight: 5 },
  { id: 'affix_orbital_radius', name: '扩展之', description: '+ 轨道半径', type: AffixType.Effect, baseEffects: { orbitalRadius: 20 }, weight: 4 },
  { id: 'affix_laser_focus', name: '聚焦之', description: '+ 激光伤害', type: AffixType.Effect, baseEffects: { laserDamage: 1 }, weight: 5 },
  { id: 'affix_laser_extender', name: '延伸之', description: '+ 激光持续时间', type: AffixType.Effect, baseEffects: { laserDuration: 300 }, weight: 4 },
  { id: 'affix_shrapnel', name: '碎片之', description: '+ 爆炸伤害', type: AffixType.Effect, baseEffects: { explosionDamage: 3 }, weight: 5 },
  { id: 'affix_boom', name: '爆裂之', description: '+ 爆炸概率', type: AffixType.Effect, baseEffects: { explosionChance: 0.05 }, weight: 4 },

  // ========== 特殊词条 ==========
  { id: 'affix_split', name: '分裂之', description: '子弹分裂', type: AffixType.Special, baseEffects: { projectileSplit: 2 }, weight: 2, allowedSlots: ['necklace'], minQuality: Rarity.Epic }
];

export function getAffixTemplateById(id: string | null | undefined): AffixTemplate | undefined {
  if (!id) return undefined;
  return AFFIX_TEMPLATES.find(a => a.id === id);
}

// 随机生成装备品质
export function rollEquipmentQuality(): Rarity {
  const rand = Math.random();
  if (rand < 0.50) return Rarity.Common;      // 50%
  if (rand < 0.75) return Rarity.Rare;        // 25%
  if (rand < 0.92) return Rarity.Epic;        // 17%
  return Rarity.Legendary;                    // 8%
}

// 根据装备品质返回颜色（字符串格式，用于 Phaser text）
export function getQualityColor(quality: Rarity): string {
  switch (quality) {
    case Rarity.Legendary: return '#ff6600'; // 橙色
    case Rarity.Epic: return '#9c27b0';      // 紫色
    case Rarity.Rare: return '#2196f3';      // 蓝色
    case Rarity.Common:
    default: return '#ffffff';                // 白色
  }
}

// 根据装备品质返回颜色（数字格式，用于边框）
export function getQualityColorHex(quality: Rarity): number {
  switch (quality) {
    case Rarity.Legendary: return 0xff6600;
    case Rarity.Epic: return 0x9c27b0;
    case Rarity.Rare: return 0x2196f3;
    case Rarity.Common:
    default: return 0xffffff;
  }
}

// 根据词缀生成装备名称前缀
// 选择第一个非基础词条的名称作为前缀，如果没有特殊词条则选择最高稀有度的词条
export function generateEquipmentName(baseName: string, affixes: AffixInstance[], quality: Rarity): string {
  if (!affixes || affixes.length === 0) {
    return baseName;
  }

  // 优先选择 Special 或 Effect 类型的词条
  let prefixAffix = affixes.find(a => {
    const tpl = getAffixTemplateById(a.id);
    return tpl && (tpl.type === AffixType.Special || tpl.type === AffixType.Effect);
  });

  // 如果没有特殊词条，选择稀有度最高的词条
  if (!prefixAffix) {
    prefixAffix = affixes.reduce((prev, curr) => 
      curr.rarity > prev.rarity ? curr : prev
    , affixes[0]);
  }

  // 如果词条名称以"的"或"之"结尾，直接拼接；否则添加"的"
  const prefix = prefixAffix.name;
  if (prefix.endsWith('的') || prefix.endsWith('之')) {
    return `${prefix}${baseName}`;
  }
  return `${prefix}的${baseName}`;
}

// rollAffixes returns AffixInstance[], each with rarity and concrete values
// equipmentQuality determines affix count and max rarity
export function rollAffixes(
  equipmentSlot?: 'ring' | 'necklace' | 'cloth',
  equipmentQuality: Rarity = Rarity.Common
): AffixInstance[] {
  // 根据装备品质决定词条数量和稀有度限制
  const qualityConfig = {
    [Rarity.Common]: { count: 0, maxRarity: null, minRarity: null },
    [Rarity.Rare]: { count: 1, maxRarity: Rarity.Rare, minRarity: null },
    [Rarity.Epic]: { count: 2, maxRarity: Rarity.Epic, minRarity: null },
    [Rarity.Legendary]: { count: 3, maxRarity: Rarity.Legendary, minRarity: Rarity.Rare }
  };

  const config = qualityConfig[equipmentQuality];
  if (config.count === 0) return []; // Common品质无词条

  // 过滤可用的稀有度层级
  const allowedTiers = RARITY_TIERS.filter(tier => {
    if (config.maxRarity) {
      const maxIndex = RARITY_TIERS.findIndex(t => t.rarity === config.maxRarity);
      const tierIndex = RARITY_TIERS.findIndex(t => t.rarity === tier.rarity);
      if (tierIndex > maxIndex) return false;
    }
    if (config.minRarity) {
      const minIndex = RARITY_TIERS.findIndex(t => t.rarity === config.minRarity);
      const tierIndex = RARITY_TIERS.findIndex(t => t.rarity === tier.rarity);
      if (tierIndex < minIndex) return false;
    }
    return true;
  });

  // shallow pool copy - 根据装备槽位和品质过滤
  const pool = AFFIX_TEMPLATES.filter(tpl => {
    // 检查槽位限制：如果词条限定了槽位，必须匹配
    if (tpl.allowedSlots) {
      // 如果词条有槽位限制，但没有提供装备槽位，则过滤掉
      if (!equipmentSlot) return false;
      // 如果提供了槽位但不匹配，则过滤掉
      if (!tpl.allowedSlots.includes(equipmentSlot)) return false;
    }
    // 检查品质限制
    if (tpl.minQuality !== undefined && equipmentQuality < tpl.minQuality) {
      return false;
    }
    return true;
  });
  const chosen: AffixInstance[] = [];

  const totalTemplateWeight = () => pool.reduce((s, p) => s + (p.weight || 1), 0);

  for (let i = 0; i < config.count; i++) {
    if (pool.length === 0) break;
    // pick template
    let r = Math.random() * totalTemplateWeight();
    let idx = 0;
    for (; idx < pool.length; idx++) {
      const w = pool[idx].weight || 1;
      if (r < w) break;
      r -= w;
    }
    const tpl = pool[Math.min(idx, pool.length - 1)];
    if (!tpl) break;

    // pick rarity by weights from allowed tiers
    const tw2 = allowedTiers.reduce((s, t) => s + t.weight, 0);
    let rr = Math.random() * tw2;
    let tierIdx = 0;
    for (; tierIdx < allowedTiers.length; tierIdx++) {
      if (rr < allowedTiers[tierIdx].weight) break;
      rr -= allowedTiers[tierIdx].weight;
    }
    const tier = allowedTiers[Math.min(tierIdx, allowedTiers.length - 1)];

    // compute actual values
    const values: EquipmentEffects = {};
    for (const key of Object.keys(tpl.baseEffects) as (keyof EquipmentEffects)[]) {
      const base = (tpl.baseEffects as any)[key] as number;
      // random factor within tier.range
      const rf = tier.range[0] + Math.random() * (tier.range[1] - tier.range[0]);
      let val = base * tier.multiplier * rf;
      // for small integral bases, round to nearest integer
      if (Math.abs(base) >= 1) {
        val = Math.round(val);
      } else {
        // keep 2 decimals for fractional stats
        val = Math.round(val * 100) / 100;
      }
      (values as any)[key] = val;
    }

    chosen.push({ id: tpl.id, name: tpl.name, rarity: tier.rarity, values });

    // remove tpl to avoid duplicates
    const rem = pool.findIndex(p => p.id === tpl.id);
    if (rem >= 0) pool.splice(rem, 1);
  }

  return chosen;
}
