import { effect } from '../reactivity/effect';
import { ShapeFlags } from '../shared/index';
import { createComponentInstance, setupComponent } from './component';
import { createAppAPI } from './createApp';
import { Fragment, Text } from './vnode';

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    createText: hostCreateText,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options;

  function render(vnode, container) {
    // render方法是在createApp中调用的，此时为根组件，parentComponent是null，anchor也是null
    patch(null, vnode, container, null, null);
  }

  // n1是老的vnode，如果n1不存在，则说明是初始化
  // n2是新的vnode
  function patch(n1, n2, container, parentComponent, anchor) {
    const { type, shapeFlag } = n2;

    switch (type) {
      // Fragment 只渲染 children
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        // 通过 VNode 的 shapeFlag property 与枚举变量 ShapeFlags 进行与运算是否大于0来判断 VNode 类型
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent, anchor);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent, anchor);
        }
        break;
    }
  }

  function processFragment(n1, n2: any, container: any, parentComponent, anchor) {
    mountChildren(n2.children, container, parentComponent, anchor);
  }

  function processText(n1, n2: any, container: any) {
    const { children } = n2;
    const textNode = (n2.el = hostCreateText(children));
    hostInsert(textNode, container);
  }

  function processElement(n1, n2: any, container: any, parentComponent, anchor) {
    if (!n1) {
      // 元素初始化
      mountElement(n2, container, parentComponent, anchor);
    } else {
      // 元素更新
      patchElement(n1, n2, container, parentComponent, anchor);
    }
  }

  function patchElement(n1, n2, container, parentComponent, anchor) {
    // el 是在mountElement时赋值给vnode.el 的，更新时是没有vnode.el的，所以需要把旧vnode的el赋值给新vnode
    const el = (n2.el = n1.el);

    // 更新props
    const oldProps = n1.props;
    const newProps = n2.props;
    patchProps(el, oldProps, newProps);

    // 更新children
    patchChildren(n1, n2, el, parentComponent, anchor);
  }

  function patchChildren(n1, n2, container, parentComponent, anchor) {
    const prevShapFlag = n1.shapeFlag;
    const c1 = n1.children;
    const { shapeFlag } = n2;
    const c2 = n2.children;
    // 1. 如果新的children是text，老的children是Array或text
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 如果老的children是array，则把老的 children 清空
      if (prevShapFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(n1.children);
      }
      if (c1 !== c2) {
        // 当新旧text不相等时，直接将新的text插入节点中
        hostSetElementText(container, c2);
      }
    } else {
      // 2. 否则新的children是数组
      // 2.1 如果老的children是文本
      if (prevShapFlag & ShapeFlags.TEXT_CHILDREN) {
        // 清空文本
        hostSetElementText(container, '');
        // 渲染新的children
        mountChildren(c2, container, parentComponent, anchor);
      } else {
        // 2.2 否则老的children 也是数组
        // TODO...diff
        /**
         * 1. 首尾对比
         * 2. 乱序对比
         */
        patchKeydChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }

  function patchKeydChildren(c1, c2, container, parentComponent, parentAnchor) {
    const l2 = c2.length;
    let i = 0; // 指向队首
    let e1 = c1.length - 1; // 指向c1的末尾
    let e2 = l2 - 1; // 指向c2的末尾

    function isSameVNodeType(n1, n2) {
      // vnode.type和vnode.key都相等时，则为同一vnode
      return n1.type === n2.type && n1.key === n2.key;
    }

    // 1. 左侧指针
    while (i <= e1 && i <= e2) {
      // 获取i指向的节点
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVNodeType(n1, n2)) {
        // 递归patch
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        // 退出循环
        break;
      }
      i++;
    }

    // 2. 右侧指针
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVNodeType(n1, n2)) {
        // 递归patch
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        // 退出循环
        break;
      }
      e1--;
      e2--;
    }

    // 3. 新的比老的多，需要创建新元素
    // i > e1 && i <= e2：多的元素无论是在队首还是队尾，都能匹配到
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1;
        // 锚点是真实元素
        // e2 + 1 > c2.length则放到队尾，否则插入到nextPos之前
        const anchor = nextPos < l2 ? c2[nextPos].el : null;
        while (i <= e2) {
          // anchor是固定的，不需要放入循环
          patch(null, c2[i], container, parentComponent, anchor);
          // 每插入一个节点，i向后移动一位
          i++;
        }
      }
    } else if (i > e2) {
      // 4. 老的比新的多
      while (i <= e1) {
        // 删除多余的老节点
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      // 5. 乱序比较
    }
  }

  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      // el 是真实节点
      const el = children[i].el;
      hostRemove(el);
    }
  }

  // 更新props
  function patchProps(el, oldProps, newProps) {
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prevProp = oldProps[key];
        const nextProp = newProps[key];
        if (prevProp !== nextProp) {
          // 当修改prop时：1. nextProp是一个新值；2.nextProp是undefined/null
          hostPatchProp(el, key, prevProp, nextProp);
        }
      }
      if (JSON.stringify(oldProps) !== '{}') {
        for (const key in oldProps) {
          // 删除newProps中没有的旧属性
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
      }
    }
  }

  function mountElement(vnode: any, container: any, parentComponent, anchor) {
    // 将元素el存到vnode.el：访问this.$el时，即可从代理对象上访问instance.vnode.el
    const el = (vnode.el = hostCreateElement(vnode.type));
    const { children, props, shapeFlag } = vnode;

    // 1. 处理children
    // 通过 VNode 的 shapeFlag property 与枚举变量 ShapeFlags 进行与运算是否大于0来判断 children 类型
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 如果包含子节点
      mountChildren(vnode.children, el, parentComponent, anchor);
    } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 如果是文本节点
      hostSetElementText(el, children);
    }

    // 2. 初始化时添加props
    for (const key in props) {
      const val = props[key];
      hostPatchProp(el, key, null, val);
    }

    hostInsert(el, container, anchor);
  }

  function mountChildren(children, container, parentComponent, anchor) {
    children.forEach(v => {
      // 处于元素初始化的流程中，没有旧vnode，设为null
      patch(null, v, container, parentComponent, anchor);
    });
  }

  function processComponent(n1, n2: any, container: any, parentComponent, anchor) {
    // 组件初始化
    mountComponent(n2, container, parentComponent, anchor);

    // TODO updateComponent
  }

  function mountComponent(initialVNode, container, parentComponent, anchor) {
    // 1. 创建组件实例
    const instance = createComponentInstance(initialVNode, parentComponent);
    // 2. 初始化组件属性：initProps、initSlots，调用setup、处理setup的返回值（当前仅处理返回类型为object）赋值到instance.setupState，将组件的render函数赋值到instance.render上
    setupComponent(instance);

    // 3. 执行render函数、递归patch，渲染组件
    setupRenderEffect(instance, initialVNode, container, anchor);
  }

  function setupRenderEffect(instance: any, initialVNode, container, anchor) {
    /**
     * 1. 使用effect包裹render逻辑，初次执行effect时会执行回调里的render函数，进行依赖收集；
     * 2. 当响应式对象的值发生变化时，会触发 _effect.run()，重新执行render函数。
     */

    effect(() => {
      const { proxy } = instance;
      // 如果是初始化
      if (!instance.isMounted) {
        console.log('init');
        // 执行render函数，生成vnode树
        const subTree = (instance.subTree = instance.render.call(proxy));
        // 子节点树的 parentComponent 就是当前instance，作为第四个参数传入
        patch(null, subTree, container, instance, anchor);
        // 设置父组件的 vnode.el，使得proxy代理对象在处理this.$el时有值，不会报错undefined
        initialVNode.el = subTree.el;
        instance.isMounted = true;
      } else {
        console.log('update');
        const preSubTree = instance.subTree;
        const subTree = (instance.subTree = instance.render.call(proxy));
        patch(preSubTree, subTree, container, instance, anchor);
      }
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}
