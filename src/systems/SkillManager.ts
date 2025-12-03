import { SkillConfig, SkillType } from '../config/SkillConfig';

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
    
    // 轨道属性
    orbitalCount: 0,           // 轨道球数量（基础0）
    orbitalDamage: 1,          // 轨道球伤害（基础1）
    orbitalRadius: 100,        // 轨道半径（基础100）
    orbitalSpeedMultiplier: 1, // 轨道速度倍数
    
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
    pickupRange: 100           // 拾取范围（基础100）
  };
  
  constructor() {}
  
  // 应用技能效果
  applySkill(skill: SkillConfig): void {
    // 增加技能等级
    const currentLevel = this.skillLevels.get(skill.id) || 0;
    this.skillLevels.set(skill.id, currentLevel + 1);
    
    if (!skill.effects) return;
    
    const effects = skill.effects;
    
    // 应用子弹类效果
    if (effects.projectileCount !== undefined) {
      this.stats.projectileCount += effects.projectileCount;
    }
    if (effects.projectileDamage !== undefined) {
      this.stats.projectileDamage += effects.projectileDamage;
    }
    if (effects.projectileSpeed !== undefined) {
      this.stats.projectileSpeedMultiplier += effects.projectileSpeed;
    }
    if (effects.attackSpeed !== undefined) {
      this.stats.attackSpeedMultiplier += effects.attackSpeed;
    }
    
    // 应用轨道类效果
    if (effects.orbitalCount !== undefined) {
      this.stats.orbitalCount += effects.orbitalCount;
    }
    if (effects.orbitalDamage !== undefined) {
      this.stats.orbitalDamage += effects.orbitalDamage;
    }
    if (effects.orbitalRadius !== undefined) {
      this.stats.orbitalRadius += effects.orbitalRadius;
    }
    if (effects.orbitalSpeed !== undefined) {
      this.stats.orbitalSpeedMultiplier += effects.orbitalSpeed;
    }
    
    // 应用射线类效果
    if (effects.laserCount !== undefined) {
      this.stats.laserCount += effects.laserCount;
    }
    if (effects.laserDamage !== undefined) {
      this.stats.laserDamage += effects.laserDamage;
    }
    if (effects.laserDuration !== undefined) {
      this.stats.laserDuration += effects.laserDuration;
    }
    if (effects.laserInterval !== undefined) {
      this.stats.laserInterval += effects.laserInterval;
      // 确保最小值
      this.stats.laserInterval = Math.max(1000, this.stats.laserInterval);
    }
    
    // 应用爆炸类效果
    if (effects.explosionChance !== undefined) {
      this.stats.explosionEnabled = true;
      this.stats.explosionChance += effects.explosionChance;
      // 限制最大概率
      this.stats.explosionChance = Math.min(1, this.stats.explosionChance);
    }
    if (effects.explosionDamage !== undefined) {
      this.stats.explosionDamage += effects.explosionDamage;
    }
    if (effects.explosionRadius !== undefined) {
      this.stats.explosionRadius += effects.explosionRadius;
    }
    
    // 应用属性增强
    if (effects.moveSpeed !== undefined) {
      this.stats.moveSpeed += effects.moveSpeed;
    }
    if (effects.maxHP !== undefined) {
      this.stats.maxHP += effects.maxHP;
    }
    if (effects.expGain !== undefined) {
      this.stats.expGainMultiplier += effects.expGain;
    }
    if (effects.pickupRange !== undefined) {
      this.stats.pickupRange += effects.pickupRange;
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
      
      orbitalCount: 0,
      orbitalDamage: 1,
      orbitalRadius: 100,
      orbitalSpeedMultiplier: 1,
      
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
      pickupRange: 100
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
      lines.push(`轨道球: ${this.stats.orbitalCount}`);
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
