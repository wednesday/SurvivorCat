// 存档管理系统 - 管理游戏存档和读取
import { AffixInstance, Rarity } from '../config/AffixConfig';
import { DifficultyLevel } from '../config/DifficultyConfig';

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
  selectedDifficulty: DifficultyLevel; // 选中的难度等级
  unlockedDifficulties: DifficultyLevel[]; // 已解锁的难度等级
  highestCompletedDifficulty: DifficultyLevel; // 最高完成的难度
  // 装备插槽（四个位置） - 每个槽位存储 { id, affixes, quality }
  equipment: {
    ring1: { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
    ring2: { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
    necklace: { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
    cloth: { id: string | null; affixes: AffixInstance[]; quality?: Rarity };
  };
  // 背包：存放已获得但未装备的装备实例
  inventory?: { id: string; affixes: AffixInstance[]; quality?: Rarity }[];
  // 安全屋商店装备（每次游戏结束刷新）
  safeHouseShop?: { id: string; affixes: AffixInstance[]; quality: Rarity; price: number }[];
}

export class SaveManager {
  private static readonly SAVE_FILE = 'survivor_cat_save.json';
  private static currentSave: PlayerSaveData | null = null; // 内存中的存档实例
  private static isTauriAvailable: boolean | null = null;
  
  // 检查是否运行在 Tauri 环境
  private static async checkTauriAvailable(): Promise<boolean> {
    if (this.isTauriAvailable !== null) {
      return this.isTauriAvailable;
    }
    
    try {
      // 检查 window.__TAURI__ 是否存在
      this.isTauriAvailable = typeof window !== 'undefined' && '__TAURI__' in window;
      console.log('[SaveManager] Tauri environment detected:', this.isTauriAvailable);
      return this.isTauriAvailable;
    } catch {
      this.isTauriAvailable = false;
      console.log('[SaveManager] Not in Tauri environment, using localStorage');
      return false;
    }
  }
  
  // 使用文件系统保存（Tauri）
  private static async saveToFile(data: PlayerSaveData): Promise<boolean> {
    try {
      console.log('[SaveManager] Attempting to save to file...');
      const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const jsonString = JSON.stringify(data, null, 2);
      await writeTextFile(this.SAVE_FILE, jsonString, { 
        baseDir: BaseDirectory.AppData 
      });
      console.log('[SaveManager] Successfully saved to file:', this.SAVE_FILE);
      return true;
    } catch (error) {
      console.error('[SaveManager] Failed to save to file:', error);
      return false;
    }
  }
  
  // 从文件系统加载（Tauri）
  private static async loadFromFile(): Promise<PlayerSaveData | null> {
    try {
      const { readTextFile, exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      
      const fileExists = await exists(this.SAVE_FILE, { 
        baseDir: BaseDirectory.AppData 
      });
      
      if (!fileExists) {
        return null;
      }
      
      const content = await readTextFile(this.SAVE_FILE, { 
        baseDir: BaseDirectory.AppData 
      });
      return JSON.parse(content);
    } catch (error) {
      console.error('从文件加载失败:', error);
      return null;
    }
  }
  
  // 使用 localStorage 保存（浏览器回退方案）
  private static saveToLocalStorage(data: PlayerSaveData): boolean {
    try {
      localStorage.setItem('survivor_cat_save', JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('保存到 localStorage 失败:', error);
      return false;
    }
  }
  
  // 从 localStorage 加载（浏览器回退方案）
  private static loadFromLocalStorage(): PlayerSaveData | null {
    try {
      const saveData = localStorage.getItem('survivor_cat_save');
      if (saveData) {
        return JSON.parse(saveData);
      }
    } catch (error) {
      console.error('从 localStorage 加载失败:', error);
    }
    return null;
  }
  
  // 检查文件是否存在（Tauri）
  private static async fileExists(): Promise<boolean> {
    try {
      const { exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      return await exists(this.SAVE_FILE, { 
        baseDir: BaseDirectory.AppData 
      });
    } catch {
      return false;
    }
  }

  // 获取存档文件的完整路径
  static async getSaveFilePath(): Promise<string> {
    const useTauri = await this.checkTauriAvailable();
    
    if (useTauri) {
      try {
        const { appDataDir } = await import('@tauri-apps/api/path');
        const appDataPath = await appDataDir();
        return `文件: ${appDataPath}${this.SAVE_FILE}`;
      } catch (error) {
        console.error('获取文件路径失败:', error);
        return '文件: Tauri AppData 目录 (无法获取具体路径)';
      }
    } else {
      // LocalStorage 位置
      const identifier = 'com.phaser.game';
      const username = window.location.hostname === 'localhost' ? 'YourUser' : 'User';
      return `LocalStorage (浏览器存储)\n存储位置: ${window.location.origin}\n\n实际文件位于:\nC:\\Users\\${username}\\AppData\\Local\\${identifier}\\EBWebView\\Default\\Local Storage\\leveldb\\`;
    }
  }
  
  // 获取存档信息（用于调试）
  static async getSaveInfo(): Promise<{ location: string; exists: boolean; size: number }> {
    const useTauri = await this.checkTauriAvailable();
    
    if (useTauri) {
      const exists = await this.fileExists();
      return {
        location: 'Tauri File System',
        exists,
        size: 0
      };
    } else {
      const data = localStorage.getItem('survivor_cat_save');
      return {
        location: 'LocalStorage',
        exists: !!data,
        size: data ? new Blob([data]).size : 0
      };
    }
  }
  
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
      selectedDifficulty: DifficultyLevel.NORMAL,
      unlockedDifficulties: [DifficultyLevel.EASY, DifficultyLevel.NORMAL],
      highestCompletedDifficulty: DifficultyLevel.EASY,
      equipment: {
        ring1: { id: null, affixes: [] },
        ring2: { id: null, affixes: [] },
        necklace: { id: null, affixes: [] },
        cloth: { id: null, affixes: [] }
      },
      inventory: [],
      safeHouseShop: []
    };
  }
  
  // 加载存档（如果已有内存缓存则返回缓存）
  static async loadSave(): Promise<PlayerSaveData> {
    // 如果已有缓存，直接返回
    if (this.currentSave !== null) {
      return this.currentSave;
    }
    
    const useTauri = await this.checkTauriAvailable();
    
    // 尝试从对应的存储加载
    try {
      let parsed: PlayerSaveData | null = null;
      
      if (useTauri) {
        parsed = await this.loadFromFile();
      } else {
        parsed = this.loadFromLocalStorage();
      }
      
      if (parsed) {
        // 确保所有字段都存在（兼容旧版本存档）
        this.currentSave = {
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
          inventory: (parsed.inventory || this.getDefaultSave().inventory || []),
          unlockedDifficulties: (parsed.unlockedDifficulties || this.getDefaultSave().unlockedDifficulties || [DifficultyLevel.EASY, DifficultyLevel.NORMAL]),
          highestCompletedDifficulty: (parsed.highestCompletedDifficulty !== undefined ? parsed.highestCompletedDifficulty : this.getDefaultSave().highestCompletedDifficulty),
          safeHouseShop: (parsed.safeHouseShop || [])
        };
        return this.currentSave!;
      }
    } catch (error) {
      console.error('加载存档失败:', error);
    }
    
    // 创建新存档
    this.currentSave = this.getDefaultSave();
    return this.currentSave;
  }
  
  // 保存存档（保存内存中的存档到文件或 localStorage）
  static async saveSave(saveData?: PlayerSaveData): Promise<boolean> {
    try {
      // 如果提供了 saveData，更新内存缓存
      if (saveData) {
        this.currentSave = saveData;
      }
      
      // 如果没有内存缓存，先加载
      if (!this.currentSave) {
        this.currentSave = await this.loadSave();
      }
      
      // 更新时间戳
      this.currentSave.lastPlayed = new Date().toISOString();
      
      const useTauri = await this.checkTauriAvailable();
      
      // 保存到对应的存储
      if (useTauri) {
        return await this.saveToFile(this.currentSave);
      } else {
        return this.saveToLocalStorage(this.currentSave);
      }
    } catch (error) {
      console.error('保存存档失败:', error);
      return false;
    }
  }
  
  // 强制重新加载存档（清除内存缓存）
  static async reloadSave(): Promise<PlayerSaveData> {
    this.currentSave = null;
    return await this.loadSave();
  }

  // 添加装备到背包
  static async addToInventory(item: { id: string; affixes: AffixInstance[]; quality?: Rarity }): Promise<void> {
    const save = await this.loadSave();
    if (!save.inventory) save.inventory = [];
    save.inventory.push(item);
    await this.saveSave(); // 不需要传参，直接保存内存中的存档
  }

  // 从背包移除指定索引的物品（返回是否成功）
  static async removeFromInventoryAt(index: number): Promise<boolean> {
    const save = await this.loadSave();
    if (!save.inventory || index < 0 || index >= save.inventory.length) return false;
    save.inventory.splice(index, 1);
    await this.saveSave();
    return true;
  }

  // 获取背包列表（引用快照）
  static async getInventory(): Promise<{ id: string; affixes: AffixInstance[]; quality?: Rarity }[]> {
    const save = await this.loadSave();
    return save.inventory || [];
  }
  
  // 保存安全屋商店装备
  static async saveSafeHouseShop(shop: { id: string; affixes: AffixInstance[]; quality: Rarity; price: number }[]): Promise<void> {
    const save = await this.loadSave();
    save.safeHouseShop = shop;
    await this.saveSave();
  }
  
  // 获取安全屋商店装备
  static async getSafeHouseShop(): Promise<{ id: string; affixes: AffixInstance[]; quality: Rarity; price: number }[]> {
    const save = await this.loadSave();
    return save.safeHouseShop || [];
  }
  
  // 清空安全屋商店（游戏结束时调用）
  static async clearSafeHouseShop(): Promise<void> {
    const save = await this.loadSave();
    save.safeHouseShop = [];
    await this.saveSave();
  }
  
  // 增加金币
  static async addCoins(amount: number): Promise<void> {
    const save = await this.loadSave();
    save.totalCoins += amount;
    await this.saveSave();
  }
  
  // 扣除金币（用于购买升级）
  static async spendCoins(amount: number): Promise<boolean> {
    const save = await this.loadSave();
    if (save.totalCoins >= amount) {
      save.totalCoins -= amount;
      await this.saveSave();
      return true;
    }
    return false;
  }
  
  // 更新统计数据
  static async updateStatistics(
    playTime: number,
    kills: number,
    waveReached: number
  ): Promise<void> {
    const save = await this.loadSave();
    save.statistics.totalPlayTime += playTime;
    save.statistics.totalKills += kills;
    save.statistics.maxWaveReached = Math.max(
      save.statistics.maxWaveReached,
      waveReached
    );
    save.statistics.gamesPlayed += 1;
    await this.saveSave();
  }
  
  // 检查是否有存档
  static async hasSave(): Promise<boolean> {
    const useTauri = await this.checkTauriAvailable();
    
    if (useTauri) {
      return await this.fileExists();
    } else {
      return localStorage.getItem('survivor_cat_save') !== null;
    }
  }
  
  // 删除存档（重置游戏）
  static async deleteSave(): Promise<void> {
    const useTauri = await this.checkTauriAvailable();
    
    if (useTauri) {
      try {
        const { remove, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        await remove(this.SAVE_FILE, { baseDir: BaseDirectory.AppData });
      } catch (error) {
        console.error('删除存档文件失败:', error);
      }
    } else {
      localStorage.removeItem('survivor_cat_save');
    }
    this.currentSave = null; // 清除内存缓存
  }
  
  // 获取总金币数
  static async getTotalCoins(): Promise<number> {
    const save = await this.loadSave();
    return save.totalCoins;
  }
  
  // 设置难度等级
  static async setDifficulty(difficulty: DifficultyLevel): Promise<void> {
    const save = await this.loadSave();
    save.selectedDifficulty = difficulty;
    await this.saveSave();
  }
  
  // 获取当前难度等级
  static async getDifficulty(): Promise<DifficultyLevel> {
    const save = await this.loadSave();
    return save.selectedDifficulty;
  }
  
  // 获取已解锁的难度列表
  static async getUnlockedDifficulties(): Promise<DifficultyLevel[]> {
    const save = await this.loadSave();
    return save.unlockedDifficulties || [DifficultyLevel.EASY, DifficultyLevel.NORMAL];
  }
  
  // 解锁新难度
  static async unlockDifficulty(difficulty: DifficultyLevel): Promise<void> {
    const save = await this.loadSave();
    if (!save.unlockedDifficulties) {
      save.unlockedDifficulties = [DifficultyLevel.EASY, DifficultyLevel.NORMAL];
    }
    if (!save.unlockedDifficulties.includes(difficulty)) {
      save.unlockedDifficulties.push(difficulty);
      await this.saveSave();
    }
  }
  
  // 完成难度（解锁下一个难度）
  static async completeDifficulty(difficulty: DifficultyLevel): Promise<void> {
    const save = await this.loadSave();
    
    // 更新最高完成难度
    if (!save.highestCompletedDifficulty || difficulty > save.highestCompletedDifficulty) {
      save.highestCompletedDifficulty = difficulty;
    }
    // 解锁下一个难度
    const nextDifficulty = difficulty + 1;
    if (nextDifficulty <= DifficultyLevel.INFERNO_3) {
      if (!save.unlockedDifficulties) {
        save.unlockedDifficulties = [DifficultyLevel.EASY, DifficultyLevel.NORMAL];
      }
      if (!save.unlockedDifficulties.includes(nextDifficulty as DifficultyLevel)) {
        save.unlockedDifficulties.push(nextDifficulty as DifficultyLevel);
      }
    }
    
    await this.saveSave();
  }
  
  // 检查难度是否已解锁
  static async isDifficultyUnlocked(difficulty: DifficultyLevel): Promise<boolean> {
    const unlockedDifficulties = await this.getUnlockedDifficulties();
    return unlockedDifficulties.includes(difficulty);
  }
}
