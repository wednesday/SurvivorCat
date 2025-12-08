import Phaser from "phaser";
import { PlayerSystem } from "./PlayerSystem";
import { DifficultyLevel, getDifficultyName, getDifficultyColor } from "../config/DifficultyConfig";

/**
 * 游戏UI系统 - 管理游戏内所有UI元素的显示和更新
 */
export class GameUISystem {
  private scene: Phaser.Scene;
  private playerSystem: PlayerSystem;

  // UI文本元素
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private expText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private diffText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, playerSystem: PlayerSystem) {
    this.scene = scene;
    this.playerSystem = playerSystem;
  }

  /**
   * 创建所有游戏UI元素
   */
  create(
    gameDifficulty: DifficultyLevel,
    difficultyLevel: number,
    killCount: number,
    coinsCollected: number
  ): void {
    const style = { fontSize: "18px", color: "#ffffff", fontFamily: "Arial" };

    this.hpText = this.scene.add.text(
      10,
      10,
      `HP: ${this.playerSystem.getHP()}/${this.playerSystem.getMaxHP()}`,
      style
    );
    this.hpText.setScrollFactor(0);

    this.levelText = this.scene.add.text(
      10,
      35,
      `Level: ${this.playerSystem.getLevel()}`,
      style
    );
    this.levelText.setScrollFactor(0);

    this.expText = this.scene.add.text(
      10,
      60,
      `EXP: ${this.playerSystem.getExp()}/${this.playerSystem.getExpToNextLevel()}`,
      style
    );
    this.expText.setScrollFactor(0);

    this.timeText = this.scene.add.text(10, 85, `Time: 0:00`, style);
    this.timeText.setScrollFactor(0);

    this.killText = this.scene.add.text(10, 110, `Kills: ${killCount}`, style);
    this.killText.setScrollFactor(0);

    this.coinText = this.scene.add.text(10, 135, `Coins: ${coinsCollected}`, {
      fontSize: "18px",
      color: "#ffd700",
      fontFamily: "Arial",
    });
    this.coinText.setScrollFactor(0);

    // 添加游戏难度显示（带颜色）
    const difficultyName = getDifficultyName(gameDifficulty);
    const difficultyColor = getDifficultyColor(gameDifficulty);
    this.diffText = this.scene.add.text(
      10,
      160,
      `游戏难度: ${difficultyName} | 波数: ${difficultyLevel}`,
      {
        fontSize: "18px",
        color: difficultyColor,
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    this.diffText.setScrollFactor(0);

    // 添加暂停提示
    const pauseHint = this.scene.add.text(
      this.scene.cameras.main.width - 10,
      10,
      "ESC/P: 暂停",
      {
        fontSize: "14px",
        color: "#888888",
        fontFamily: "Arial",
      }
    );
    pauseHint.setOrigin(1, 0);
    pauseHint.setScrollFactor(0);
  }

  /**
   * 更新HP显示
   */
  updateHP(): void {
    if (this.hpText) {
      this.hpText.setText(
        `HP: ${this.playerSystem.getHP()}/${this.playerSystem.getMaxHP()}`
      );
    }
  }

  /**
   * 更新等级显示
   */
  updateLevel(): void {
    if (this.levelText) {
      this.levelText.setText(`Level: ${this.playerSystem.getLevel()}`);
    }
  }

  /**
   * 更新经验值显示
   */
  updateExp(): void {
    if (this.expText) {
      this.expText.setText(
        `EXP: ${this.playerSystem.getExp()}/${this.playerSystem.getExpToNextLevel()}`
      );
    }
  }

  /**
   * 更新时间显示
   */
  updateTime(gameTime: number): void {
    if (this.timeText) {
      const minutes = Math.floor(gameTime / 60);
      const seconds = Math.floor(gameTime % 60);
      this.timeText.setText(
        `Time: ${minutes}:${seconds.toString().padStart(2, "0")}`
      );
    }
  }

  /**
   * 更新击杀数显示
   */
  updateKills(killCount: number): void {
    if (this.killText) {
      this.killText.setText(`Kills: ${killCount}`);
    }
  }

  /**
   * 更新金币显示
   */
  updateCoins(coinsCollected: number): void {
    if (this.coinText) {
      this.coinText.setText(`Coins: ${coinsCollected}`);
    }
  }

  /**
   * 更新难度显示
   */
  updateDifficulty(
    gameDifficulty: DifficultyLevel,
    difficultyLevel: number
  ): void {
    if (this.diffText) {
      const difficultyName = getDifficultyName(gameDifficulty);
      const difficultyColor = getDifficultyColor(gameDifficulty);
      this.diffText.setText(
        `游戏难度: ${difficultyName} | 波数: ${difficultyLevel}`
      );
      this.diffText.setStyle({ color: difficultyColor as any });
    }
  }

  /**
   * 更新所有需要玩家数据的UI
   */
  updatePlayerUI(): void {
    this.updateHP();
    this.updateLevel();
    this.updateExp();
  }

  /**
   * 销毁所有UI元素
   */
  destroy(): void {
    if (this.hpText) this.hpText.destroy();
    if (this.levelText) this.levelText.destroy();
    if (this.expText) this.expText.destroy();
    if (this.timeText) this.timeText.destroy();
    if (this.killText) this.killText.destroy();
    if (this.diffText) this.diffText.destroy();
    if (this.coinText) this.coinText.destroy();
  }
}
