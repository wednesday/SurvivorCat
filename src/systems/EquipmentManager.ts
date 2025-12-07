import { SaveManager } from './SaveManager';
import { EquipmentItem, getEquipmentById } from '../config/EquipmentConfig';
import { AffixInstance, Rarity } from '../config/AffixConfig';
import { SkillManager } from './SkillManager';

// 管理已装备的物品（四个槽位）
export class EquipmentManager {
  private slots: {
    ring1: { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
    ring2: { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
    necklace: { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
    cloth: { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
  };
  private onEquipmentChangeCallback?: () => void;

  constructor(private skillManager: SkillManager) {
    // 初始化需要异步加载
    this.slots = {
      ring1: { id: null, affixes: [] },
      ring2: { id: null, affixes: [] },
      necklace: { id: null, affixes: [] },
      cloth: { id: null, affixes: [] }
    };
    this.init();
  }

  private async init() {
    const save = await SaveManager.loadSave();
    this.slots = { ...save.equipment };
    // 应用装备效果到 skillManager
    this.applyAll();
  }

  // 设置装备变化回调
  setEquipmentChangeCallback(callback: () => void): void {
    this.onEquipmentChangeCallback = callback;
  }

  // 获取当前装备
  getEquipped(): { ring1: { id: string | null; affixes: AffixInstance[]; quality?: Rarity }; ring2: { id: string | null; affixes: AffixInstance[]; quality?: Rarity }; necklace: { id: string | null; affixes: AffixInstance[]; quality?: Rarity }; cloth: { id: string | null; affixes: AffixInstance[]; quality?: Rarity } } {
    return { ...this.slots };
  }

  // 装备物品到指定槽位（ring1/ring2/necklace/cloth）
  async equip(slot: keyof EquipmentManager['slots'], itemId: string | null, affixes: AffixInstance[] = [], quality?: Rarity): Promise<void> {
    const current = this.slots[slot];
    const newVal = { id: itemId, affixes, quality };
    // 如果相同则跳过
    if (current && current.id === newVal.id && JSON.stringify(current.affixes) === JSON.stringify(newVal.affixes) && current.quality === newVal.quality) return;
    this.slots[slot] = newVal;
    await this.persist();
    this.applyAll();
  }

  // 卸下指定槽位
  async unequip(slot: keyof EquipmentManager['slots']): Promise<void> {
    await this.equip(slot, null);
  }

  // 将当前装备写入存档
  private async persist(): Promise<void> {
    const save = await SaveManager.loadSave();
    save.equipment = { ...this.slots };
    await SaveManager.saveSave(save);
  }

  // 清除并重新应用所有装备效果（先重置 skillManager 基础值）
  applyAll(): void {
    // 先重置技能管理器的基础属性但保留已学技能等级
    if ((this.skillManager as any).resetStatsKeepLevels) {
      (this.skillManager as any).resetStatsKeepLevels();
    } else {
      this.skillManager.reset();
    }

    // apply base equipment effects + affix effects
    for (const key of Object.keys(this.slots) as (keyof EquipmentManager['slots'])[]) {
      const slotVal = this.slots[key];
      if (!slotVal || !slotVal.id) continue;
      const eq = getEquipmentById(slotVal.id);
      if (eq && eq.effects) this.applyEffectsToSkillManager(eq.effects);
      // affixes (instances with concrete values)
      if (slotVal.affixes && slotVal.affixes.length > 0) {
        for (const affInst of slotVal.affixes) {
          if (affInst && affInst.values) this.applyEffectsToSkillManager(affInst.values);
        }
      }
    }

    // 装备变化后调用回调
    if (this.onEquipmentChangeCallback) {
      this.onEquipmentChangeCallback();
    }
  }

  // 将单件装备的效果应用到 skillManager.stats
  private applyEffectsToSkillManager(effects: any): void {
    const s = (this.skillManager as any).stats;
    if (!s) return;

    // 玩家基础属性
    if (effects.moveSpeed !== undefined) {
      s.moveSpeed += effects.moveSpeed;
    }
    if (effects.maxHP !== undefined) {
      s.maxHP += effects.maxHP;
    }
    if (effects.pickupRange !== undefined) {
      s.pickupRange += effects.pickupRange;
    }
    if (effects.expGain !== undefined) {
      s.expGainMultiplier += effects.expGain;
    }

    // 子弹/投射物属性
    if (effects.projectileCount !== undefined) {
      s.projectileCount += effects.projectileCount;
    }
    if (effects.projectileDamage !== undefined) {
      s.projectileDamage += effects.projectileDamage;
    }
    if (effects.projectileSpeed !== undefined) {
      s.projectileSpeedMultiplier += effects.projectileSpeed;
    }
    if (effects.attackSpeed !== undefined) {
      s.attackSpeedMultiplier += effects.attackSpeed;
    }
    if (effects.projectileSplit !== undefined) {
      s.projectileSplit += effects.projectileSplit;
    }

    // 守护球属性
    if (effects.orbitalCount !== undefined) {
      s.orbitalCount += effects.orbitalCount;
    }
    if (effects.orbitalDamage !== undefined) {
      s.orbitalDamage += effects.orbitalDamage;
    }
    if (effects.orbitalRadius !== undefined) {
      s.orbitalRadius += effects.orbitalRadius;
    }
    if (effects.orbitalSpeed !== undefined) {
      s.orbitalSpeedMultiplier += effects.orbitalSpeed;
    }

    // 激光属性
    if (effects.laserCount !== undefined) {
      s.laserCount += effects.laserCount;
    }
    if (effects.laserDamage !== undefined) {
      s.laserDamage += effects.laserDamage;
    }
    if (effects.laserDuration !== undefined) {
      s.laserDuration += effects.laserDuration;
    }
    if (effects.laserInterval !== undefined) {
      s.laserInterval += effects.laserInterval;
      s.laserInterval = Math.max(1000, s.laserInterval);
    }

    // 爆炸属性
    if (effects.explosionChance !== undefined) {
      s.explosionEnabled = true;
      s.explosionChance += effects.explosionChance;
      s.explosionChance = Math.min(1, s.explosionChance);
    }
    if (effects.explosionDamage !== undefined) {
      s.explosionDamage += effects.explosionDamage;
    }
    if (effects.explosionRadius !== undefined) {
      s.explosionRadius += effects.explosionRadius;
    }

    // 毒性属性
    if (effects.drug !== undefined) {
      s.drug += effects.drug;
    }
    if (effects.drugSpread !== undefined) {
      s.drugSpread += effects.drugSpread;
    }
    
    // 寒冷属性
    if (effects.ice !== undefined) {
      s.ice += effects.ice;
    }
    
    // 火焰属性
    if (effects.fire !== undefined) {
      s.fire += effects.fire;
    }
    
    // 风属性
    if (effects.wind !== undefined) {
      s.wind += effects.wind;
    }
    
    // 斥力属性（守护球被扔出）
    if (effects.repulsion !== undefined) {
      s.repulsion = effects.repulsion || s.repulsion;
    }
    
    // spread 属性 - 直接应用到对应属性，不做条件判断
    if (effects.spread !== undefined) {
      s.orbitalRadius += effects.spread;
      s.explosionRadius += effects.spread;
      s.drugSpread += effects.spread;
    }
  }
}
