// 怪物类型枚举
export enum EnemyType {
  SLIME_RED = 'slime_red',
  SLIME_BLUE = 'slime_blue',
  SLIME_GREEN = 'slime_green',
  SLIME_YELLOW = 'slime_yellow',
  BUGBIT = 'bugbit',
  PEBBLIN = 'pebblin',
  SPORA = 'spora',
  SPOOKMOTH = 'spookmoth',
  SLUB = 'slub'
}

// 怪物配置接口
export interface EnemyConfig {
  id: string;
  type: EnemyType;
  name: string;
  
  // 基础属性（数组索引对应难度等级，从1开始）
  hp: number[];                // 各难度生命值
  damage: number[];            // 各难度伤害
  speed: number[];             // 各难度移动速度
  expValue: number[];          // 各难度经验值
  
  // 视觉属性
  spriteKey: string;           // 精灵图key
  animKey: string;             // 动画key
  scale: number;               // 缩放比例
  tint?: number;               // 色调（可选）
  
  // 生成密度（数组索引对应难度等级，值越高越容易生成）
  spawnDensity: number[];      // 各难度的生成密度权重
  
  // Boss属性
  isBoss: boolean;             // 是否为Boss
  
  // 免疫属性
  immuneToPoison?: boolean;    // 是否免疫毒素
  immuneToCold?: boolean;      // 是否免疫寒冷
}

// 怪物波次配置
export interface EnemySpawnConfig {
  baseSpawnRate: number;       // 基础生成间隔（毫秒）
  baseSpawnCount: number;      // 基础每次生成数量
  
  // 难度缩放
  difficultySpawnRateScale: number;  // 每个难度等级减少的生成间隔
  difficultyHPScale: number;         // 每个难度等级增加的生命值倍数
  difficultySpeedScale: number;      // 每个难度等级增加的速度
  
  minSpawnRate: number;        // 最小生成间隔
}

// 所有怪物配置
export const ENEMY_CONFIGS: EnemyConfig[] = [
  // ========== 红色史莱姆 - 基础敌人 ==========
  {
    id: 'slime_red_basic',
    type: EnemyType.SLIME_RED,
    name: '红色史莱姆',
    
    // 难度1-15的属性值
    hp: [2, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 7, 7, 8],
    damage: [10, 10, 10, 10, 10, 10, 15, 15, 15, 15, 15, 18, 18, 18, 18],
    speed: [80, 80, 80, 90, 90, 90, 100, 100, 100, 120, 120, 120, 120, 120, 120],
    expValue: [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3],
    
    spriteKey: 'slime-red',
    animKey: 'slime-red-idle',
    scale: 2.5,
    
    // 难度1-15的生成密度（从难度1开始就可以生成）
    spawnDensity: [100, 100, 90, 80, 70, 60, 50, 40, 30, 25, 20, 15, 10, 5, 5],
    isBoss: false
  },
  
  // ========== 蓝色史莱姆 - 中级敌人 ==========
  {
    id: 'slime_blue_medium',
    type: EnemyType.SLIME_BLUE,
    name: '蓝色史莱姆',
    
    // 难度1-15的属性值
    hp: [0, 4, 4, 6, 6, 8, 8, 12, 12, 12, 16, 16, 16, 20, 24],
    damage: [0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    speed: [0, 90, 90, 90, 100, 100, 100, 110, 110, 110, 120, 130, 130, 130, 130],
    expValue: [0, 2, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 6, 6],
    
    spriteKey: 'slime-blue',
    animKey: 'slime-blue-idle',
    scale: 2.5,
    
    // 难度2开始出现，逐渐增加密度
    spawnDensity: [0, 40, 50, 60, 60, 70, 70, 60, 60, 45, 30, 25, 20, 15, 10],
    isBoss: false,
    immuneToCold: true  // 蓝色史莱姆免疫寒冷
  },
  
  // ========== 绿色史莱姆 - 高级敌人 ==========
  {
    id: 'slime_green_advanced',
    type: EnemyType.SLIME_GREEN,
    name: '绿色史莱姆',
    
    // 难度1-15的属性值
    hp: [0, 0, 0, 0, 12, 12, 12, 12, 20, 20, 20, 30, 30, 30, 40],
    damage: [0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    speed: [0, 0, 0, 0, 100, 100, 100, 110, 110, 110, 120, 120, 140, 140, 140],
    expValue: [0, 0, 0, 0, 4, 4, 6, 6, 6, 6, 6, 8, 8, 8, 8],
    
    spriteKey: 'slime-green',
    animKey: 'slime-green-idle',
    scale: 2.5,
    
    // 难度5开始出现
    spawnDensity: [0, 0, 0, 0, 50, 60, 70, 70, 60, 50, 45, 40, 35, 30, 25],
    isBoss: false,
    immuneToPoison: true  // 绿色史莱姆免疫毒素
  },
  
  // ========== 黄色史莱姆 - 精英敌人 ==========
  {
    id: 'slime_yellow_elite',
    type: EnemyType.SLIME_YELLOW,
    name: '黄色史莱姆',
    
    // 难度1-15的属性值
    hp: [0, 0, 0, 0, 0, 0, 0, 0, 40, 40, 40, 60, 60, 60, 80],
    damage: [0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10],
    speed: [0, 0, 0, 0, 110, 110, 110, 125, 125, 125, 125, 150, 150, 150, 180],
    expValue: [0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 12, 12, 16, 18],
    
    spriteKey: 'slime-yellow',
    animKey: 'slime-yellow-idle',
    scale: 2.5,
    
    // 难度5开始出现
    spawnDensity: [0, 0, 0, 0, 0, 0, 0, 0, 55, 60, 60, 55, 50, 45, 40],
    isBoss: false
  },
  
  // ========== BugBit - Boss (难度3) ==========
  {
    id: 'bugbit_boss',
    type: EnemyType.BUGBIT,
    name: 'BugBit Boss',
    
    // 难度1-15的属性值（难度3出现）
    hp: [0, 0, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    damage: [0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    speed: [0, 0, 120, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    expValue: [0, 0, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    
    spriteKey: 'bugbit',
    animKey: 'bugbit-walk',
    scale: 3.5,
    
    // Boss在特定难度出现（密度为0表示不通过随机生成）
    spawnDensity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    isBoss: true
  },
  
  // ========== Pebblin - Boss (难度6) ==========
  {
    id: 'pebblin_boss',
    type: EnemyType.PEBBLIN,
    name: 'Pebblin Boss',
    
    // 难度1-15的属性值（难度6出现）
    hp: [0, 0, 0, 0, 0, 80, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    damage: [0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    speed: [0, 0, 0, 0, 0, 160, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    expValue: [0, 0, 0, 0, 0, 75, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    
    spriteKey: 'pebblin',
    animKey: 'pebblin-idle',
    scale: 4.0,
    
    // Boss在特定难度出现
    spawnDensity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    isBoss: true
  },
  
  // ========== Spora - Boss (难度9) ==========
  {
    id: 'spora_boss',
    type: EnemyType.SPORA,
    name: 'Spora Boss',
    
    // 难度1-15的属性值（难度9出现）
    hp: [0, 0, 0, 0, 0, 0, 0, 0, 120, 0, 0, 0, 0, 0, 0],
    damage: [0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0],
    speed: [0, 0, 0, 0, 0, 0, 0, 0, 180, 0, 0, 0, 0, 0, 0],
    expValue: [0, 0, 0, 0, 0, 0, 0, 0, 125, 0, 0, 0, 0, 0, 0],
    
    spriteKey: 'spora',
    animKey: 'spora-move',
    scale: 4.5,
    
    // Boss在特定难度出现
    spawnDensity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    isBoss: true
  },
  
  // ========== Spookmoth - Boss (难度12) ==========
  {
    id: 'spookmoth_boss',
    type: EnemyType.SPOOKMOTH,
    name: 'Spookmoth Boss',
    
    // 难度1-15的属性值（难度12出现）
    hp: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 240, 0, 0, 0],
    damage: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0],
    speed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 200, 0, 0, 0],
    expValue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    
    spriteKey: 'spookmoth',
    animKey: 'spookmoth-fly',
    scale: 5.0,
    
    // Boss在特定难度出现
    spawnDensity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    isBoss: true
  },
  
  // ========== Slub - Boss (难度15) ==========
//   {
//     id: 'slub_boss',
//     type: EnemyType.SLUB,
//     name: 'Slub Boss',
    
//     baseHP: 250,
//     baseDamage: 75,
//     baseSpeed: 55,
    
//     spriteKey: 'slub',
//     animKey: 'slub-idle',
//     scale: 5.5,
    
//     expValue: 100,
//     spawnWeight: 0,
//     unlockDifficulty: 15,
//     isBoss: true
//   }
];

// 生成配置
export const SPAWN_CONFIG: EnemySpawnConfig = {
  baseSpawnRate: 1000,           // 1秒生成一次
  baseSpawnCount: 1,             // 每次生成1个
  
  difficultySpawnRateScale: 100, // 每个难度等级减少100ms
  difficultyHPScale: 1.1,        // 每个难度等级HP增加50%
  difficultySpeedScale: 0,       // 每个难度等级速度+5
  
  minSpawnRate: 500              // 最低0.5秒生成一次
};

// 根据难度获取可生成的敌人配置（不含Boss）
export function getAvailableEnemies(difficultyLevel: number): EnemyConfig[] {
  const index = difficultyLevel - 1; // 数组索引从0开始，难度从1开始
  return ENEMY_CONFIGS.filter(enemy => 
    !enemy.isBoss && 
    index >= 0 && 
    index < enemy.spawnDensity.length && 
    enemy.spawnDensity[index] > 0
  );
}

// 根据难度获取可生成的Boss配置
export function getAvailableBoss(difficultyLevel: number): EnemyConfig | null {
  // Boss每3个难度等级出现一次
  if (difficultyLevel % 3 !== 0) {
    return null;
  }
  
  const index = difficultyLevel - 1; // 数组索引从0开始
  
  // 找到该难度等级对应的Boss（hp值大于0表示该难度可以出现）
  const bosses = ENEMY_CONFIGS.filter(enemy => 
    enemy.isBoss && 
    index >= 0 && 
    index < enemy.hp.length && 
    enemy.hp[index] > 0
  );
  
  return bosses.length > 0 ? bosses[0] : null;
}

// 根据密度权重随机选择敌人
export function getRandomEnemy(difficultyLevel: number): EnemyConfig | null {
  const availableEnemies = getAvailableEnemies(difficultyLevel);
  
  if (availableEnemies.length === 0) {
    return null;
  }
  
  const index = difficultyLevel - 1; // 数组索引从0开始
  
  // 计算总密度权重
  const totalWeight = availableEnemies.reduce((sum, enemy) => {
    const density = enemy.spawnDensity[index] || 0;
    return sum + density;
  }, 0);
  
  if (totalWeight === 0) {
    return availableEnemies[0];
  }
  
  // 随机选择
  let random = Math.random() * totalWeight;
  
  for (const enemy of availableEnemies) {
    const density = enemy.spawnDensity[index] || 0;
    random -= density;
    if (random <= 0) {
      return enemy;
    }
  }
  
  // 默认返回第一个
  return availableEnemies[0];
}

// 根据难度获取敌人属性（直接从数组读取）
export function calculateEnemyStats(
  config: EnemyConfig,
  difficultyLevel: number
): {
  hp: number;
  damage: number;
  speed: number;
  expValue: number;
} {
  const index = difficultyLevel - 1; // 数组索引从0开始，难度从1开始
  
  // 确保索引有效
  if (index < 0 || index >= config.hp.length) {
    return {
      hp: config.hp[0] || 1,
      damage: config.damage[0] || 1,
      speed: config.speed[0] || 50,
      expValue: config.expValue[0] || 1
    };
  }
  
  return {
    hp: config.hp[index],
    damage: config.damage[index],
    speed: config.speed[index],
    expValue: config.expValue[index]
  };
}

// 根据难度计算生成间隔
export function calculateSpawnRate(difficultyLevel: number): number {
  const rate = SPAWN_CONFIG.baseSpawnRate - (difficultyLevel - 1) * SPAWN_CONFIG.difficultySpawnRateScale;
  return Math.max(SPAWN_CONFIG.minSpawnRate, rate);
}

// 根据ID获取敌人配置
export function getEnemyById(id: string): EnemyConfig | undefined {
  return ENEMY_CONFIGS.find(enemy => enemy.id === id);
}

// 根据类型获取敌人配置
export function getEnemiesByType(type: EnemyType): EnemyConfig[] {
  return ENEMY_CONFIGS.filter(enemy => enemy.type === type);
}
