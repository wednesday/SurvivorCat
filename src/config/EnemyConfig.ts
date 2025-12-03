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
  
  // 基础属性
  baseHP: number;              // 基础生命值
  baseDamage: number;          // 基础伤害
  baseSpeed: number;           // 基础移动速度
  
  // 视觉属性
  spriteKey: string;           // 精灵图key
  animKey: string;             // 动画key
  scale: number;               // 缩放比例
  tint?: number;               // 色调（可选）
  
  // 掉落属性
  expValue: number;            // 经验值
  
  // 生成权重（用于随机生成）
  spawnWeight: number;         // 权重越高越容易生成
  
  // 解锁条件
  unlockDifficulty: number;    // 在哪个难度等级解锁
  
  // Boss属性
  isBoss: boolean;             // 是否为Boss
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
    
    baseHP: 2,
    baseDamage: 10,
    baseSpeed: 80,
    
    spriteKey: 'slime-red',
    animKey: 'slime-red-idle',
    scale: 2.5,
    
    expValue: 1,
    spawnWeight: 100,
    unlockDifficulty: 1,
    isBoss: false
  },
  
  // ========== 蓝色史莱姆 - 中级敌人 ==========
  {
    id: 'slime_blue_medium',
    type: EnemyType.SLIME_BLUE,
    name: '蓝色史莱姆',
    
    baseHP: 4,
    baseDamage: 15,
    baseSpeed: 90,
    
    spriteKey: 'slime-blue',
    animKey: 'slime-blue-idle',
    scale: 2.5,
    
    expValue: 2,
    spawnWeight: 60,
    unlockDifficulty: 2,
    isBoss: false
  },
  
  // ========== 绿色史莱姆 - 高级敌人 ==========
  {
    id: 'slime_green_advanced',
    type: EnemyType.SLIME_GREEN,
    name: '绿色史莱姆',
    
    baseHP: 8,
    baseDamage: 20,
    baseSpeed: 100,
    
    spriteKey: 'slime-green',
    animKey: 'slime-green-idle',
    scale: 2.5,
    
    expValue: 3,
    spawnWeight: 30,
    unlockDifficulty: 3,
    isBoss: false
  },
  
  // ========== 黄色史莱姆 - 精英敌人 ==========
  {
    id: 'slime_yellow_elite',
    type: EnemyType.SLIME_YELLOW,
    name: '黄色史莱姆',
    
    baseHP: 16,
    baseDamage: 25,
    baseSpeed: 110,
    
    spriteKey: 'slime-yellow',
    animKey: 'slime-yellow-idle',
    scale: 2.5,
    
    expValue: 4,
    spawnWeight: 15,
    unlockDifficulty: 5,
    isBoss: false
  },
  
  // ========== BugBit - Boss (难度3) ==========
  {
    id: 'bugbit_boss',
    type: EnemyType.BUGBIT,
    name: 'BugBit Boss',
    
    baseHP: 50,
    baseDamage: 35,
    baseSpeed: 70,
    
    spriteKey: 'bugbit',
    animKey: 'bugbit-walk',
    scale: 3.5,
    
    expValue: 20,
    spawnWeight: 0,  // Boss不参与随机生成
    unlockDifficulty: 3,
    isBoss: true
  },
  
  // ========== Pebblin - Boss (难度6) ==========
  {
    id: 'pebblin_boss',
    type: EnemyType.PEBBLIN,
    name: 'Pebblin Boss',
    
    baseHP: 80,
    baseDamage: 45,
    baseSpeed: 60,
    
    spriteKey: 'pebblin',
    animKey: 'pebblin-idle',
    scale: 4.0,
    
    expValue: 35,
    spawnWeight: 0,
    unlockDifficulty: 6,
    isBoss: true
  },
  
  // ========== Spora - Boss (难度9) ==========
  {
    id: 'spora_boss',
    type: EnemyType.SPORA,
    name: 'Spora Boss',
    
    baseHP: 120,
    baseDamage: 55,
    baseSpeed: 75,
    
    spriteKey: 'spora',
    animKey: 'spora-move',
    scale: 4.5,
    
    expValue: 50,
    spawnWeight: 0,
    unlockDifficulty: 9,
    isBoss: true
  },
  
  // ========== Spookmoth - Boss (难度12) ==========
  {
    id: 'spookmoth_boss',
    type: EnemyType.SPOOKMOTH,
    name: 'Spookmoth Boss',
    
    baseHP: 180,
    baseDamage: 65,
    baseSpeed: 85,
    
    spriteKey: 'spookmoth',
    animKey: 'spookmoth-fly',
    scale: 5.0,
    
    expValue: 75,
    spawnWeight: 0,
    unlockDifficulty: 12,
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
  return ENEMY_CONFIGS.filter(enemy => 
    enemy.unlockDifficulty <= difficultyLevel && !enemy.isBoss
  );
}

// 根据难度获取可生成的Boss配置
export function getAvailableBoss(difficultyLevel: number): EnemyConfig | null {
  // Boss每3个难度等级出现一次
  if (difficultyLevel % 3 !== 0) {
    return null;
  }
  
  // 找到该难度等级对应的Boss
  const bosses = ENEMY_CONFIGS.filter(enemy => 
    enemy.isBoss && enemy.unlockDifficulty === difficultyLevel
  );
  
  return bosses.length > 0 ? bosses[0] : null;
}

// 根据权重随机选择敌人
export function getRandomEnemy(difficultyLevel: number): EnemyConfig | null {
  const availableEnemies = getAvailableEnemies(difficultyLevel);
  
  if (availableEnemies.length === 0) {
    return null;
  }
  
  // 计算总权重
  const totalWeight = availableEnemies.reduce((sum, enemy) => sum + enemy.spawnWeight, 0);
  
  // 随机选择
  let random = Math.random() * totalWeight;
  
  for (const enemy of availableEnemies) {
    random -= enemy.spawnWeight;
    if (random <= 0) {
      return enemy;
    }
  }
  
  // 默认返回第一个
  return availableEnemies[0];
}

// 根据难度计算敌人属性
export function calculateEnemyStats(
  config: EnemyConfig,
  difficultyLevel: number
): {
  hp: number;
  damage: number;
  speed: number;
} {
  const difficultyMultiplier = difficultyLevel - 1; // 难度1不增加
  
  return {
    hp: Math.floor(config.baseHP + difficultyMultiplier * SPAWN_CONFIG.difficultyHPScale * config.baseHP),
    damage: config.baseDamage,
    speed: Math.floor(config.baseSpeed + difficultyMultiplier * SPAWN_CONFIG.difficultySpeedScale)
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
