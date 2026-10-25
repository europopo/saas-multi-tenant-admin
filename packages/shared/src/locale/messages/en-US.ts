/**
 * 英文语言包聚合入口：合并 common + portal（+ 未来各子系统）命名空间。
 */
import common from './en-US/common';
import portal from './en-US/portal';

export default {
  ...common,
  ...portal,
};
