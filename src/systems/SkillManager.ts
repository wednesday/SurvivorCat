import { SkillConfig, SkillType, SKILL_CONFIGS } from '../config/SkillConfig';

// 技能管理器 - 管理玩家已学习的技能和属性
export class SkillManager {
  // 技能等级记录 <技能ID, 等级>
  private skillLevels: Map<string, number> = new Map();
  
  // 累计的属性值
  public stats = {
    // 子弹属性
    projectileCount: 1,        // 子弹数量（基础1）
    projectileDamage: 1,       // 子弹伤害（基础1）
    projectileSpeedMultiplier: 1, // 子弹速度倍数
    attackSpeedMultiplier: 1,  // 攻击速度倍数（越大越快）
    projectileSplit: 0,        // 子弹分裂数量（基础0）
    
    // 轨道属性
    orbitalCount: 0,           // 守护球数量（基础0）
    orbitalDamage: 1,          // 守护球伤害（基础1）
    orbitalRadius: 100,        // 轨道半径（基础100）
    orbitalSpeed: 0,           // 轨道速度（基础0）
    
    // 射线属性
    laserCount: 0,             // 激光数量（基础0）
    laserDamage: 1,            // 激光伤害（基础1）
    laserDuration: 500,        // 激光持续时间（基础500ms）
    laserInterval: 3000,       // 激光冷却时间（基础3000ms）
    
    // 爆炸属性
    explosionEnabled: false,   // 是否启用爆炸
    explosionDamage: 5,        // 爆炸伤害（基础5）
    explosionRadius: 80,       // 爆炸范围（基础80）
    explosionChance: 0,        // 爆炸概率（基础0）
    
    // 玩家属性
    moveSpeed: 200,            // 移动速度（基础200）
    maxHP: 100,                // 最大生命值（基础100）
    expGainMultiplier: 1,      // 经验获取倍数
    pickupRange: 100,          // 拾取范围（基础100）
    
    // 毒性属性
    drug: 0,                   // 毒性伤害等级（基础0）
    drugSpread: 0,             // 毒性扩散范围（基础0）
    
    // 寒冷属性
    ice: 0                     // 寒冷等级（基础0）
  };
  
  constructor() {}
  
  // 应用技能效果
  applySkill(skill: SkillConfig): void {
    // 增加技能等级
    const currentLevel = this.skillLevels.get(skill.id) || 0;
    this.skillLevels.set(skill.id, currentLevel + 1);
    
    if (!skill.effects) return;
    this.applyEffects(skill.effects);
  }

  // 只重置 stats 并保留已学技能等级，然后重新应用已学技能的效果
  resetStatsKeepLevels(): void {
    this.stats = {
      projectileCount: 1,
      projectileDamage: 1,
      projectileSpeedMultiplier: 1,
      attackSpeedMultiplier: 1,
      projectileSplit: 0,

      orbitalCount: 0,
      orbitalDamage: 1,
      orbitalRadius: 100,
      orbitalSpeed: 0,

      laserCount: 0,
      laserDamage: 1,
      laserDuration: 500,
      laserInterval: 3000,

      explosionEnabled: false,
      explosionDamage: 5,
      explosionRadius: 80,
      explosionChance: 0,

      moveSpeed: 200,
      maxHP: 100,
      expGainMultiplier: 1,
      pickupRange: 100,
      
      drug: 0,
      drugSpread: 0,
      
      ice: 0
    };

    // 重新应用已学技能的效果（根据 skillLevels）
    for (const [skillId, level] of this.skillLevels.entries()) {
      const cfg = SKILL_CONFIGS.find(s => s.id === skillId);
      if (!cfg || !cfg.effects) continue;
      for (let i = 0; i < level; i++) {
        this.applyEffects(cfg.effects);
      }
    }
  }

  // 仅应用效果（不改变技能等级），供复算使用
  private applyEffects(effects: SkillConfig['effects'] | undefined): void {
    if (!effects) return;
    const e = effects as any;

    if (e.projectileCount !== undefined) this.stats.projectileCount += e.projectileCount;
    if (e.projectileDamage !== undefined) this.stats.projectileDamage += e.projectileDamage;
    if (e.projectileSpeed !== undefined) this.stats.projectileSpeedMultiplier += e.projectileSpeed;
    if (e.attackSpeed !== undefined) this.stats.attackSpeedMultiplier += e.attackSpeed;
    if (e.projectileSplit !== undefined) this.stats.projectileSplit += e.projectileSplit;

    if (e.orbitalCount !== undefined) this.stats.orbitalCount += e.orbitalCount;
    if (e.orbitalDamage !== undefined) this.stats.orbitalDamage += e.orbitalDamage;
    if (e.orbitalRadius !== undefined) this.stats.orbitalRadius += e.orbitalRadius;

    if (e.laserCount !== undefined) this.stats.laserCount += e.laserCount;
    if (e.laserDamage !== undefined) this.stats.laserDamage += e.laserDamage;
    if (e.laserInterval !== undefined) {
      this.stats.laserInterval += e.laserInterval;
      this.stats.laserInterval = Math.max(1000, this.stats.laserInterval);
    }

    if (e.explosionChance !== undefined) {
      this.stats.explosionEnabled = true;
      this.stats.explosionChance += e.explosionChance;
      this.stats.explosionChance = Math.min(1, this.stats.explosionChance);
    }
    if (e.explosionDamage !== undefined) this.stats.explosionDamage += e.explosionDamage;

    if (e.moveSpeed !== undefined) this.stats.moveSpeed += e.moveSpeed;
    if (e.maxHP !== undefined) this.stats.maxHP += e.maxHP;
    if (e.expGain !== undefined) this.stats.expGainMultiplier += e.expGain;
    if (e.pickupRange !== undefined) this.stats.pickupRange += e.pickupRange;
    if (e.drug !== undefined) this.stats.drug += e.drug;
    if (e.ice !== undefined) this.stats.ice += e.ice;
    
    // spread 属性应用到轨道半径、爆炸范围和毒扩散范围
    if (e.spread !== undefined) {
      if (this.stats.orbitalCount > 0) this.stats.orbitalRadius += e.spread;
      if (this.stats.explosionEnabled) this.stats.explosionRadius += e.spread;
      if (this.stats.drug > 0) this.stats.drugSpread += e.spread;
    }
  }
  
  // 获取技能当前等级
  getSkillLevel(skillId: string): number {
    return this.skillLevels.get(skillId) || 0;
  }
  
  // 获取所有技能等级（用于生成随机技能列表）
  getAllSkillLevels(): Map<string, number> {
    return new Map(this.skillLevels);
  }
  
  // 获取攻击间隔（考虑攻击速度加成）
  getProjectileRate(baseRate: number): number {
    return baseRate / this.stats.attackSpeedMultiplier;
  }
  
  // 重置（用于重新开始游戏）
  reset(): void {
    this.skillLevels.clear();
    
    // 重置所有属性为基础值
    this.stats = {
      projectileCount: 1,
      projectileDamage: 1,
      projectileSpeedMultiplier: 1,
      attackSpeedMultiplier: 1,
      projectileSplit: 0,
      
      orbitalCount: 0,
      orbitalDamage: 1,
      orbitalRadius: 100,
      orbitalSpeed: 0,
      
      laserCount: 0,
      laserDamage: 1,
      laserDuration: 500,
      laserInterval: 3000,
      
      explosionEnabled: false,
      explosionDamage: 5,
      explosionRadius: 80,
      explosionChance: 0,
      
      moveSpeed: 200,
      maxHP: 100,
      expGainMultiplier: 1,
      pickupRange: 100,
      
      drug: 0,
      drugSpread: 0,
      
      ice: 0
    };
  }
  
  // 获取技能总结（用于UI显示）
  getSummary(): string {
    const lines: string[] = [];
    
    if (this.stats.projectileCount > 1) {
      lines.push(`子弹数: ${this.stats.projectileCount}`);
    }
    if (this.stats.projectileDamage > 1) {
      lines.push(`子弹伤害: ${this.stats.projectileDamage}`);
    }
    if (this.stats.orbitalCount > 0) {
      lines.push(`守护球: ${this.stats.orbitalCount}`);
    }
    if (this.stats.laserCount > 0) {
      lines.push(`激光: ${this.stats.laserCount}`);
    }
    if (this.stats.explosionEnabled) {
      lines.push(`爆炸概率: ${(this.stats.explosionChance * 100).toFixed(0)}%`);
    }
    
    return lines.join(' | ');
  }
}
