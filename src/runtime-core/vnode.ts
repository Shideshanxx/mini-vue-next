import { ShapeFlags } from '../shared/index';

interface VNode {
  /* html标签名、有状态组件的配置、函数式组件 */
  type: string | object | Function;
  /* 组件/元素的attributes、prop、事件 */
  props?: object;
  /* 子代VNode、文本 */
  children?: string | Array<VNode> | object;
  el?;
  // vnode的类型（元素或组件），children的类型（string或array）
  shapeFlag?;
}

export function createVNode(type, props?, children?) {
  const vnode: VNode = {
    type,
    props,
    children,
    el: null,
    shapeFlag: getShapeFlag(type),
  };

  // 用 或运算符 进行shapeFlag的合并，来设置children类型
  if (typeof children === 'string') {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }

  return vnode;
}

// 根据vnode.type设置初始的vnode.shapeFlag
function getShapeFlag(type) {
  return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT;
}