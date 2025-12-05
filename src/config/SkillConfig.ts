// 技能类型枚举
export enum SkillType {
  PROJECTILE = 'projectile',  // 子弹类
  ORBITAL = 'orbital',         // 轨道类
  LASER = 'laser',             // 射线类
  EXPLOSION = 'explosion',     // 爆炸类
  STAT = 'stat'                // 属性增强类
}

// 技能配置接口
export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  color: string;
  icon?: string;
  maxLevel?: number;  // 最大等级，undefined表示无上限
  
  // 技能效果配置
  effects?: {
    // 子弹类效果
    projectileCount?: number;      // 增加子弹数量
    projectileDamage?: number;     // 增加子弹伤害
    projectileSpeed?: number;      // 增加子弹速度
    attackSpeed?: number;          // 攻击速度加成（减少冷却时间）
    
    // 轨道类效果
    orbitalCount?: number;         // 增加守护球数量
    orbitalDamage?: number;        // 增加守护球伤害
    
    // 射线类效果
    laserCount?: number;           // 增加激光数量
    laserDamage?: number;          // 增加激光伤害
    laserInterval?: number;        // 减少激光冷却时间
    
    // 爆炸类效果
    explosionDamage?: number;      // 爆炸伤害
    explosionChance?: number;      // 爆炸触发概率
    
    // 效果范围
    spread?: number;               // 效果扩散范围（轨道半径/爆炸范围/毒扩散等）
    
    // 属性增强
    moveSpeed?: number;            // 移动速度
    maxHP?: number;                // 最大生命值
    hpRegen?: number;              // 生命恢复
    expGain?: number;              // 经验加成
    pickupRange?: number;          // 拾取范围
    
    // 毒性效果
    drug?: number;                 // 毒性伤害等级
  };
}

// 所有技能配置
export const SKILL_CONFIGS: SkillConfig[] = [
  // ========== 子弹类技能 ==========
  {
    id: 'projectile_count',
    name: '多重射击',
    description: '+1 子弹数量',
    type: SkillType.PROJECTILE,
    color: '#ffff00',
    effects: {
      projectileCount: 1
    }
  },
  {
    id: 'projectile_damage',
    name: '贫铀弹',
    description: '+1 子弹伤害',
    type: SkillType.PROJECTILE,
    color: '#ff4444',
    effects: {
      projectileDamage: 1
    }
  },
  {
    id: 'attack_speed',
    name: '快速射击',
    description: '攻击速度 +15%',
    type: SkillType.PROJECTILE,
    color: '#ff8800',
    maxLevel: 5,
    effects: {
      attackSpeed: 0.15
    }
  },
  {
    id: 'projectile_speed',
    name: '高速弹',
    description: '+30% 子弹速度',
    type: SkillType.PROJECTILE,
    color: '#ffaa00',
    maxLevel: 3,
    effects: {
      projectileSpeed: 0.3
    }
  },
  
  // ========== 轨道类技能 ==========
  {
    id: 'orbital_add',
    name: '守护之球',
    description: '+1 守护之球',
    type: SkillType.ORBITAL,
    color: '#ff00ff',
    effects: {
      orbitalCount: 1
    }
  },
  {
    id: 'orbital_damage',
    name: '能量球',
    description: '+1 守护之球伤害',
    type: SkillType.ORBITAL,
    color: '#ff44ff',
    effects: {
      orbitalDamage: 1
    }
  },
  {
    id: 'spread_boost',
    name: '效果范围',
    description: '+20 效果范围',
    type: SkillType.STAT,
    color: '#ff00cc',
    maxLevel: 3,
    effects: {
      spread: 20
    }
  },
  
  // ========== 射线类技能 ==========
  {
    id: 'laser_add',
    name: '激光束',
    description: '+1 激光',
    type: SkillType.LASER,
    color: '#00ffff',
    effects: {
      laserCount: 1
    }
  },
  {
    id: 'laser_damage',
    name: '强化激光',
    description: '+1 激光伤害',
    type: SkillType.LASER,
    color: '#00ddff',
    effects: {
      laserDamage: 1
    }
  },
  {
    id: 'laser_interval',
    name: '快速充能',
    description: '-500ms 激光冷却',
    type: SkillType.LASER,
    color: '#44ffff',
    maxLevel: 4,
    effects: {
      laserInterval: -500
    }
  },
  
  // ========== 爆炸类技能 ==========
  {
    id: 'explosion_damage',
    name: '爆炸强化',
    description: '+3 爆炸伤害',
    type: SkillType.EXPLOSION,
    color: '#ff4400',
    effects: {
      explosionDamage: 3
    }
  },
  {
    id: 'explosion_chance',
    name: '连锁爆炸',
    description: '+5% 爆炸概率',
    type: SkillType.EXPLOSION,
    color: '#ffaa44',
    maxLevel: 5,
    effects: {
      explosionChance: 0.05
    }
  },
  
  // ========== 属性增强类技能 ==========
  {
    id: 'speed_boost',
    name: '迅捷步伐',
    description: '+20 移动速度',
    type: SkillType.STAT,
    color: '#00ff00',
    maxLevel: 5,
    effects: {
      moveSpeed: 20
    }
  },
  {
    id: 'max_hp',
    name: '生命强化',
    description: '+20 最大生命值',
    type: SkillType.STAT,
    color: '#ff0000',
    effects: {
      maxHP: 20
    }
  },
  {
    id: 'hp_regen',
    name: '生命恢复',
    description: '恢复满生命值',
    type: SkillType.STAT,
    color: '#ff4444',
    effects: {
      hpRegen: 1
    }
  },
  {
    id: 'exp_gain',
    name: '经验加成',
    description: '+20% 经验获取',
    type: SkillType.STAT,
    color: '#00ffff',
    maxLevel: 3,
    effects: {
      expGain: 0.2
    }
  },
  {
    id: 'pickup_range',
    name: '磁力场',
    description: '+50 拾取范围',
    type: SkillType.STAT,
    color: '#ffff00',
    maxLevel: 3,
    effects: {
      pickupRange: 50
    }
  }
];

// 获取随机技能配置（用于升级选择）
export function getRandomSkills(count: number, currentLevels: Map<string, number>, isFirstUpgrade: boolean = false): SkillConfig[] {
  // 第一次升级时，强制返回三个初始技能
  if (isFirstUpgrade) {
    const firstSkills = [
      SKILL_CONFIGS.find(s => s.id === 'projectile_count'),
      SKILL_CONFIGS.find(s => s.id === 'orbital_add'),
      SKILL_CONFIGS.find(s => s.id === 'laser_add')
    ].filter(s => s !== undefined) as SkillConfig[];
    
    return firstSkills;
  }
  
  // 过滤掉已达到最大等级的技能
  const availableSkills = SKILL_CONFIGS.filter(skill => {
    const currentLevel = currentLevels.get(skill.id) || 0;
    return !skill.maxLevel || currentLevel < skill.maxLevel;
  });
  
  if (availableSkills.length === 0) {
    return [];
  }
  
  // 随机打乱并选择指定数量
  const shuffled = Phaser.Utils.Array.Shuffle([...availableSkills]);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// 根据ID获取技能配置
export function getSkillById(id: string): SkillConfig | undefined {
  return SKILL_CONFIGS.find(skill => skill.id === id);
}

// 按类型获取技能
export function getSkillsByType(type: SkillType): SkillConfig[] {
  return SKILL_CONFIGS.filter(skill => skill.type === type);
}
