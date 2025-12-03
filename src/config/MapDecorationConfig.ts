import { DecorationConfig } from '../systems/MapManager';

/**
 * 地图装饰物配置
 * 
 * 可以在这里自定义每种装饰物的属性：
 * - frame: 图片帧索引 (0-14)
 * - name: 装饰物名称
 * - scale: 大小缩放 (1.0 = 原始大小, >1.0 = 放大, <1.0 = 缩小)
 * - collides: 是否阻挡通行 (true = 不可通过障碍物, false = 可通过)
 * - count: 生成数量
 * - alpha: 透明度 (0-1, 可选, 默认0.8)
 */
// 默认装饰物配置
export const CUSTOM_DECORATION_CONFIG: DecorationConfig[] = [
  // 第1行：草1(0)/草2(1)/花1(2)/花团1(3)/花团2(4) - 小型装饰，可通过
  { frame: 0, name: '草1', scale: 2.0, collides: false, count: 2, alpha: 0.8 },
  { frame: 1, name: '草2', scale: 2.0, collides: false, count: 2, alpha: 0.8 },
  { frame: 2, name: '花1', scale: 2.0, collides: false, count: 1, alpha: 0.8 },
  { frame: 3, name: '花团1', scale: 2.4, collides: false, count: 1, alpha: 0.85 },
  { frame: 4, name: '花团2', scale: 2.4, collides: false, count: 1, alpha: 0.85 },
  
  // 第2行：树桩1(5)/树桩2(6)/石头1(7)/灌木1(8)/草堆1(9) - 中大型障碍物
  { frame: 5, name: '树桩1', scale: 3.0, collides: true, count: 1 },
  { frame: 6, name: '树桩2', scale: 3.0, collides: true, count: 1 },
  { frame: 7, name: '石头1', scale: 2.6, collides: true, count: 1 },
  { frame: 8, name: '灌木1', scale: 2.4, collides: true, count: 1 },
  { frame: 9, name: '草堆1', scale: 2.0, collides: false, count: 2, alpha: 0.8 },
  
  // 第3行：石头2(10)/木桩3(11)/花2(12)/花3(13)/花4(14)
  { frame: 10, name: '石头2', scale: 2.8, collides: true, count: 1 },
  { frame: 11, name: '木桩3', scale: 3.2, collides: true, count: 1 },
  { frame: 12, name: '花2', scale: 2.0, collides: false, count: 1, alpha: 0.8 },
  { frame: 13, name: '花3', scale: 2.0, collides: false, count: 1, alpha: 0.8 },
  { frame: 14, name: '花4', scale: 2.0, collides: false, count: 1, alpha: 0.85 },
];

/**
 * 使用示例：
 * 
 * 1. 增加某种装饰物的数量：
 *    找到对应的配置，修改 count 值
 *    例如：{ frame: 0, name: '草1', scale: 1.0, collides: false, count: 50 }
 * 
 * 2. 调整大小：
 *    修改 scale 值
 *    例如：{ frame: 5, name: '树桩1', scale: 2.0, collides: true, count: 8 } // 放大到2倍
 * 
 * 3. 改变是否可通过：
 *    修改 collides 值
 *    例如：{ frame: 7, name: '石头1', scale: 1.3, collides: false, count: 10 } // 石头变为可通过
 * 
 * 4. 调整透明度：
 *    修改 alpha 值 (0=完全透明, 1=完全不透明)
 *    例如：{ frame: 2, name: '花1', scale: 1.0, collides: false, count: 15, alpha: 0.5 } // 半透明
 * 
 * 5. 添加新的装饰物（使用已有帧）：
 *    添加新的配置对象
 *    例如：{ frame: 0, name: '草1-大', scale: 2.0, collides: false, count: 5, alpha: 1.0 }
 */
