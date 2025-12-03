// 存档管理系统 - 管理游戏存档和读取
import { AffixInstance, Rarity } from '../config/AffixConfig';

export interface PlayerSaveData {
  totalCoins: number;           // 总金币数
  permanentUpgrades: {          // 永久升级（可扩展）
    maxHPBonus: number;
    damageBonus: number;
    speedBonus: number;
  };
  statistics: {                 // 统计数据
    totalPlayTime: number;      // 总游戏时间（秒）
    totalKills: number;         // 总击杀数
    maxWaveReached: number;     // 最高波数
    gamesPlayed: number;        // 游戏次数
  };
  lastPlayed: string;          // 最后游玩时间
  // 装备插槽（四个位置） - 每个槽位存储 { id, affixes, quality }
  equipment: {
    ring1: { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
    ring2: { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
    necklace: { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
    cloth: { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
  };
  // 背包：存放已获得但未装备的装备实例
  inventory?: { id: string; affixes: AffixInstance[]; quality?: Rarity }[];
}

export class SaveManager {
  private static readonly SAVE_KEY = 'survivor_cat_save';
  
  // 获取默认存档数据
  static getDefaultSave(): PlayerSaveData {
    return {
      totalCoins: 0,
      permanentUpgrades: {
        maxHPBonus: 0,
        damageBonus: 0,
        speedBonus: 0
      },
      statistics: {
        totalPlayTime: 0,
        totalKills: 0,
        maxWaveReached: 0,
        gamesPlayed: 0
      },
      lastPlayed: new Date().toISOString(),
      equipment: {
        ring1: { id: null, affixes: [] },
        ring2: { id: null, affixes: [] },
        necklace: { id: null, affixes: [] },
        cloth: { id: null, affixes: [] }
      }
      ,
      inventory: []
    };
  }
  
  // 加载存档
  static loadSave(): PlayerSaveData {
    try {
      const saveData = localStorage.getItem(this.SAVE_KEY);
      if (saveData) {
        const parsed = JSON.parse(saveData);
        // 确保所有字段都存在（兼容旧版本存档）
        return {
          ...this.getDefaultSave(),
          ...parsed,
          permanentUpgrades: {
            ...this.getDefaultSave().permanentUpgrades,
            ...(parsed.permanentUpgrades || {})
          },
          statistics: {
            ...this.getDefaultSave().statistics,
            ...(parsed.statistics || {})
          },
          equipment: {
            ...this.getDefaultSave().equipment,
            ...(parsed.equipment || {})
          },
          inventory: (parsed.inventory || this.getDefaultSave().inventory || [])
        };
      }
    } catch (error) {
      console.error('加载存档失败:', error);
    }
    return this.getDefaultSave();
  }
  
  // 保存存档
  static saveSave(saveData: PlayerSaveData): boolean {
    try {
      saveData.lastPlayed = new Date().toISOString();
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error('保存存档失败:', error);
      return false;
    }
  }

  // 添加装备到背包
  static addToInventory(item: { id: string; affixes: AffixInstance[]; quality?: Rarity }): void {
    const save = this.loadSave();
    if (!save.inventory) save.inventory = [];
    save.inventory.push(item);
    this.saveSave(save);
  }

  // 从背包移除指定索引的物品（返回是否成功）
  static removeFromInventoryAt(index: number): boolean {
    const save = this.loadSave();
    if (!save.inventory || index < 0 || index >= save.inventory.length) return false;
    save.inventory.splice(index, 1);
    this.saveSave(save);
    return true;
  }

  // 获取背包列表（引用快照）
  static getInventory(): { id: string; affixes: AffixInstance[]; quality?: Rarity }[] {
    const save = this.loadSave();
    return save.inventory || [];
  }
  
  // 增加金币
  static addCoins(amount: number): void {
    const save = this.loadSave();
    save.totalCoins += amount;
    this.saveSave(save);
  }
  
  // 扣除金币（用于购买升级）
  static spendCoins(amount: number): boolean {
    const save = this.loadSave();
    if (save.totalCoins >= amount) {
      save.totalCoins -= amount;
      this.saveSave(save);
      return true;
    }
    return false;
  }
  
  // 更新统计数据
  static updateStatistics(
    playTime: number,
    kills: number,
    waveReached: number
  ): void {
    const save = this.loadSave();
    save.statistics.totalPlayTime += playTime;
    save.statistics.totalKills += kills;
    save.statistics.maxWaveReached = Math.max(
      save.statistics.maxWaveReached,
      waveReached
    );
    save.statistics.gamesPlayed += 1;
    this.saveSave(save);
  }
  
  // 检查是否有存档
  static hasSave(): boolean {
    return localStorage.getItem(this.SAVE_KEY) !== null;
  }
  
  // 删除存档（重置游戏）
  static deleteSave(): void {
    localStorage.removeItem(this.SAVE_KEY);
  }
  
  // 获取总金币数
  static getTotalCoins(): number {
    return this.loadSave().totalCoins;
  }
}
