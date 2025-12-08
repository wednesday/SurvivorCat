import Phaser from "phaser";
import { SkillManager } from "./SkillManager";

/**
 * 暂停UI系统 - 管理暂停界面和统计面板
 */
export class PauseUISystem {
  private scene: Phaser.Scene;
  private skillManager: SkillManager;

  // UI元素
  private pauseOverlay!: Phaser.GameObjects.Rectangle;
  private pauseText!: Phaser.GameObjects.Text;
  private pauseHintText!: Phaser.GameObjects.Text;
  private pauseStatsPanel: Phaser.GameObjects.Container | null = null;
  private hintTween: Phaser.Tweens.Tween | null = null;

  private isPaused: boolean = false;

  constructor(scene: Phaser.Scene, skillManager: SkillManager) {
    this.scene = scene;
    this.skillManager = skillManager;
  }

  /**
   * 创建暂停UI元素
   */
  create(): void {
    // 半透明黑色遮罩
    this.pauseOverlay = this.scene.add.rectangle(
      0,
      0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0.7
    );
    this.pauseOverlay.setOrigin(0);
    this.pauseOverlay.setScrollFactor(0);
    this.pauseOverlay.setDepth(1000);
    this.pauseOverlay.setVisible(false);

    // 暂停文字
    this.pauseText = this.scene.add.text(
      this.scene.cameras.main.centerX - 250,
      this.scene.cameras.main.centerY - 200,
      "游戏已暂停",
      {
        fontSize: "48px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      }
    );
    this.pauseText.setOrigin(0.5);
    this.pauseText.setScrollFactor(0);
    this.pauseText.setDepth(1001);
    this.pauseText.setVisible(false);

    // 提示文字
    this.pauseHintText = this.scene.add.text(
      this.scene.cameras.main.centerX - 250,
      this.scene.cameras.main.centerY + 220,
      "按 ESC 或 P 键继续游戏",
      {
        fontSize: "24px",
        color: "#ffff00",
        fontFamily: "Arial",
      }
    );
    this.pauseHintText.setOrigin(0.5);
    this.pauseHintText.setScrollFactor(0);
    this.pauseHintText.setDepth(1001);
    this.pauseHintText.setVisible(false);
  }

  /**
   * 切换暂停状态
   */
  toggle(orbitalsCount: number): boolean {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.show(orbitalsCount);
    } else {
      this.hide();
    }

    return this.isPaused;
  }

  /**
   * 显示暂停UI
   */
  private show(orbitalsCount: number): void {
    this.pauseOverlay.setVisible(true);
    this.pauseText.setVisible(true);
    this.pauseHintText.setVisible(true);

    // 创建技能统计面板
    this.createStatsPanel(orbitalsCount);

    // 添加闪烁效果
    this.hintTween = this.scene.tweens.add({
      targets: this.pauseHintText,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * 隐藏暂停UI
   */
  private hide(): void {
    this.pauseOverlay.setVisible(false);
    this.pauseText.setVisible(false);
    this.pauseHintText.setVisible(false);

    // 销毁技能统计面板
    if (this.pauseStatsPanel) {
      this.pauseStatsPanel.destroy();
      this.pauseStatsPanel = null;
    }

    // 停止闪烁效果
    if (this.hintTween) {
      this.hintTween.stop();
      this.hintTween = null;
    }
    this.pauseHintText.setAlpha(1);
  }

  /**
   * 创建暂停统计面板
   */
  private createStatsPanel(orbitalsCount: number): void {
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY;

    // 创建容器（右侧）
    this.pauseStatsPanel = this.scene.add.container(centerX + 250, centerY);
    this.pauseStatsPanel.setScrollFactor(0);
    this.pauseStatsPanel.setDepth(1002);

    // 面板背景
    const panelBg = this.scene.add.rectangle(0, 0, 450, 550, 0x222222, 0.95);
    panelBg.setStrokeStyle(4, 0xffaa00);
    this.pauseStatsPanel.add(panelBg);

    // 标题
    const title = this.scene.add.text(0, -230, "技能统计", {
      fontSize: "32px",
      color: "#ffaa00",
      fontFamily: "Arial",
      fontStyle: "bold",
    });
    title.setOrigin(0.5);
    this.pauseStatsPanel.add(title);

    // 统计数据
    const stats = [
      { label: "移动速度", value: this.skillManager.stats.moveSpeed.toFixed(0) },
      { label: "子弹数量", value: this.skillManager.stats.projectileCount.toString() },
      { label: "子弹伤害", value: this.skillManager.stats.projectileDamage.toString() },
      {
        label: "攻击速度",
        value: (1000 / this.skillManager.getProjectileRate(1000)).toFixed(2) + "/s",
      },
      { label: "守护球数量", value: orbitalsCount.toString() },
      { label: "守护球伤害", value: this.skillManager.stats.orbitalDamage.toString() },
      { label: "轨道轨道半径", value: this.skillManager.stats.orbitalRadius.toString() },
      { label: "激光数量", value: this.skillManager.stats.laserCount.toString() },
      { label: "激光伤害", value: this.skillManager.stats.laserDamage.toString() },
      { label: "拾取范围", value: this.skillManager.stats.pickupRange.toFixed(0) },
      {
        label: "经验加成",
        value: (this.skillManager.stats.expGainMultiplier * 100).toFixed(0) + "%",
      },
      {
        label: "爆炸几率",
        value: this.skillManager.stats.explosionEnabled
          ? (this.skillManager.stats.explosionChance * 100).toFixed(0) + "%"
          : "未解锁",
      },
      {
        label: "爆炸伤害",
        value: this.skillManager.stats.explosionEnabled
          ? this.skillManager.stats.explosionDamage.toString()
          : "未解锁",
      },
    ];

    // 显示统计项（单列布局）
    const startY = -180;
    const lineHeight = 28;

    stats.forEach((stat, index) => {
      const y = startY + index * lineHeight;

      const text = this.scene.add.text(0, y, `${stat.label}: ${stat.value}`, {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "Arial",
      });
      text.setOrigin(0.5, 0.5);
      if (this.pauseStatsPanel) {
        this.pauseStatsPanel.add(text);
      }
    });
  }

  /**
   * 获取当前暂停状态
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * 清理暂停统计面板（用于场景清理）
   */
  clearStatsPanel(): void {
    if (this.pauseStatsPanel) {
      this.pauseStatsPanel.destroy();
      this.pauseStatsPanel = null;
    }
  }

  /**
   * 重置暂停UI（用于重新开始游戏）
   */
  reset(): void {
    this.isPaused = false;
    if (this.pauseOverlay) this.pauseOverlay.setVisible(false);
    if (this.pauseText) this.pauseText.setVisible(false);
    if (this.pauseHintText) {
      this.pauseHintText.setVisible(false);
      this.pauseHintText.setAlpha(1);
    }
    if (this.hintTween) {
      this.hintTween.stop();
      this.hintTween = null;
    }
    this.clearStatsPanel();
  }

  /**
   * 销毁所有UI元素
   */
  destroy(): void {
    if (this.hintTween) {
      this.hintTween.stop();
      this.hintTween = null;
    }
    if (this.pauseStatsPanel) {
      this.pauseStatsPanel.destroy();
      this.pauseStatsPanel = null;
    }
    if (this.pauseOverlay) this.pauseOverlay.destroy();
    if (this.pauseText) this.pauseText.destroy();
    if (this.pauseHintText) this.pauseHintText.destroy();
  }
}
