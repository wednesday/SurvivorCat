// 难度配置系统
export enum DifficultyLevel {
  EASY = 0,           // 简单 - 灰色
  NORMAL = 1,         // 普通 - 白色
  HARD = 2,           // 困难 - 绿色
  NIGHTMARE_1 = 3,    // 噩梦1 - 紫色
  NIGHTMARE_2 = 4,    // 噩梦2 - 紫色
  NIGHTMARE_3 = 5,    // 噩梦3 - 紫色
  INFERNO_1 = 6,      // 炼狱1 - 橙色
  INFERNO_2 = 7,      // 炼狱2 - 橙色
  INFERNO_3 = 8       // 炼狱3 - 橙色
}

export interface DifficultySettings {
  level: DifficultyLevel;
  name: string;
  color: string;              // 十六进制颜色值
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  enemySpawnRateMultiplier: number;
  bossHealthMultiplier: number;
  bossDamageMultiplier: number;
  expMultiplier: number;      // 经验倍率
  coinMultiplier: number;     // 金币倍率
  description: string;
  rarityDropRateMultiplier: number; // 稀有掉落率倍率 0~10
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultySettings> = {
  [DifficultyLevel.EASY]: {
    level: DifficultyLevel.EASY,
    name: '简单',
    color: '#888888',  // 灰色
    enemyHealthMultiplier: 0.7,
    enemyDamageMultiplier: 0.7,
    enemySpeedMultiplier: 0.8,
    enemySpawnRateMultiplier: 0.7,
    bossHealthMultiplier: 0.7,
    bossDamageMultiplier: 0.7,
    expMultiplier: 1.0,
    coinMultiplier: 0.8,
    description: '适合新手玩家，敌人较弱',
    rarityDropRateMultiplier: 0.8,
  },
  [DifficultyLevel.NORMAL]: {
    level: DifficultyLevel.NORMAL,
    name: '普通',
    color: '#FFFFFF',  // 白色
    enemyHealthMultiplier: 1.0,
    enemyDamageMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    enemySpawnRateMultiplier: 1.0,
    bossHealthMultiplier: 1.0,
    bossDamageMultiplier: 1.0,
    expMultiplier: 1.0,
    coinMultiplier: 1.0,
    description: '标准难度，平衡的游戏体验',
    rarityDropRateMultiplier: 1,
  },
  [DifficultyLevel.HARD]: {
    level: DifficultyLevel.HARD,
    name: '困难',
    color: '#00FF00',  // 绿色
    enemyHealthMultiplier: 1.5,
    enemyDamageMultiplier: 1.3,
    enemySpeedMultiplier: 1.1,
    enemySpawnRateMultiplier: 1.3,
    bossHealthMultiplier: 1.5,
    bossDamageMultiplier: 1.3,
    expMultiplier: 1.0,
    coinMultiplier: 1.3,
    description: '挑战性增强，敌人更强大',
    rarityDropRateMultiplier: 1.4,
  },
  [DifficultyLevel.NIGHTMARE_1]: {
    level: DifficultyLevel.NIGHTMARE_1,
    name: '噩梦1',
    color: '#9C27B0',  // 紫色
    enemyHealthMultiplier: 2.0,
    enemyDamageMultiplier: 1.6,
    enemySpeedMultiplier: 1.15,
    enemySpawnRateMultiplier: 1.6,
    bossHealthMultiplier: 2.0,
    bossDamageMultiplier: 1.6,
    expMultiplier: 1.0,
    coinMultiplier: 1.6,
    description: '噩梦难度第一阶段，极具挑战性',
    rarityDropRateMultiplier: 1.8,
  },
  [DifficultyLevel.NIGHTMARE_2]: {
    level: DifficultyLevel.NIGHTMARE_2,
    name: '噩梦2',
    color: '#7B1FA2',  // 深紫色
    enemyHealthMultiplier: 2.5,
    enemyDamageMultiplier: 2.0,
    enemySpeedMultiplier: 1.2,
    enemySpawnRateMultiplier: 2.0,
    bossHealthMultiplier: 2.5,
    bossDamageMultiplier: 2.0,
    expMultiplier: 1.0,
    coinMultiplier: 2.0,
    description: '噩梦难度第二阶段，恐怖的挑战',
    rarityDropRateMultiplier: 2.2,
  },
  [DifficultyLevel.NIGHTMARE_3]: {
    level: DifficultyLevel.NIGHTMARE_3,
    name: '噩梦3',
    color: '#6A1B9A',  // 更深紫色
    enemyHealthMultiplier: 3.0,
    enemyDamageMultiplier: 2.5,
    enemySpeedMultiplier: 1.25,
    enemySpawnRateMultiplier: 2.5,
    bossHealthMultiplier: 3.0,
    bossDamageMultiplier: 2.5,
    expMultiplier: 1.0,
    coinMultiplier: 2.5,
    description: '噩梦难度第三阶段，几乎不可能',
    rarityDropRateMultiplier: 2.6,
  },
  [DifficultyLevel.INFERNO_1]: {
    level: DifficultyLevel.INFERNO_1,
    name: '炼狱1',
    color: '#FF9800',  // 橙色
    enemyHealthMultiplier: 4.0,
    enemyDamageMultiplier: 3.0,
    enemySpeedMultiplier: 1.3,
    enemySpawnRateMultiplier: 3.0,
    bossHealthMultiplier: 4.0,
    bossDamageMultiplier: 3.0,
    expMultiplier: 1.0,
    coinMultiplier: 3.0,
    description: '炼狱难度第一阶段，只有最强者能生存',
    rarityDropRateMultiplier: 3.0,
  },
  [DifficultyLevel.INFERNO_2]: {
    level: DifficultyLevel.INFERNO_2,
    name: '炼狱2',
    color: '#F57C00',  // 深橙色
    enemyHealthMultiplier: 5.0,
    enemyDamageMultiplier: 3.5,
    enemySpeedMultiplier: 1.35,
    enemySpawnRateMultiplier: 3.5,
    bossHealthMultiplier: 5.0,
    bossDamageMultiplier: 3.5,
    expMultiplier: 1.0,
    coinMultiplier: 3.5,
    description: '炼狱难度第二阶段，地狱般的考验',
    rarityDropRateMultiplier: 4.0,
  },
  [DifficultyLevel.INFERNO_3]: {
    level: DifficultyLevel.INFERNO_3,
    name: '炼狱3',
    color: '#E65100',  // 更深橙色
    enemyHealthMultiplier: 6.0,
    enemyDamageMultiplier: 4.0,
    enemySpeedMultiplier: 1.4,
    enemySpawnRateMultiplier: 4.0,
    bossHealthMultiplier: 6.0,
    bossDamageMultiplier: 4.0,
    expMultiplier: 1.0,
    coinMultiplier: 4.0,
    description: '炼狱难度第三阶段，终极挑战',
    rarityDropRateMultiplier: 5.0,
  }
};

// 获取难度配置
export function getDifficultyConfig(level: DifficultyLevel): DifficultySettings {
  return DIFFICULTY_CONFIGS[level];
}

// 获取所有难度配置（用于菜单选择）
export function getAllDifficulties(): DifficultySettings[] {
  return Object.values(DIFFICULTY_CONFIGS);
}

// 根据难度等级获取颜色
export function getDifficultyColor(level: DifficultyLevel): string {
  return DIFFICULTY_CONFIGS[level].color;
}

// 根据难度等级获取名称
export function getDifficultyName(level: DifficultyLevel): string {
  return DIFFICULTY_CONFIGS[level].name;
}
