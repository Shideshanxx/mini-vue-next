import { ShapeFlags } from '../shared/index';
import { createComponentInstance, setupComponent } from './component';

export function render(vnode, container) {
  patch(vnode, container);
}

function patch(vnode, container) {
  const { shapeFlag } = vnode;

  // 通过 VNode 的 shapeFlag property 与枚举变量 ShapeFlags 进行与运算是否大于0来判断 VNode 类型
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(vnode, container);
  } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container);
  }
}

function processElement(vnode: any, container: any) {
  // 元素初始化
  mountElement(vnode, container);

  // TODO 元素更新
}

function mountElement(vnode: any, container: any) {
  // 将元素el存到vnode.el：访问this.$el时，即可从代理对象上访问instance.vnode.el
  const el = (vnode.el = document.createElement(vnode.type));
  const { children, props, shapeFlag } = vnode;

  // 1. 处理children
  // 通过 VNode 的 shapeFlag property 与枚举变量 ShapeFlags 进行与运算是否大于0来判断 children 类型
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 如果包含子节点
    mountChildren(vnode, el);
  } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 如果是文本节点
    el.textContent = children;
  }

  // 2. 处理props
  for (const key in props) {
    const val = props[key];
    const isOn = (key: string) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
      // 处理事件
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, val);
    } else {
      // 处理普通属性
      el.setAttribute(key, val);
    }
  }
  container.append(el);
}

function mountChildren(vnode, container) {
  vnode.children.forEach(v => {
    patch(v, container);
  });
}

function processComponent(vnode: any, container: any) {
  // 组件初始化
  mountComponent(vnode, container);

  // TODO updateComponent
}

function mountComponent(initialVNode, container) {
  // 1. 创建组件实例
  const instance = createComponentInstance(initialVNode);
  // 2. 初始化组件属性：initProps、initSlots，调用setup、处理setup的返回值（当前仅处理返回类型为object）赋值到instance.setupState，将组件的render函数赋值到instance.render上
  setupComponent(instance);

  // 3. 执行render函数、递归patch，渲染组件
  setupRenderEffect(instance, initialVNode, container);
}

function setupRenderEffect(instance: any, initialVNode, container) {
  // 执行render函数，生成vnode树
  const { proxy } = instance;
  const subTree = instance.render.call(proxy);

  // 递归调用子VNode
  patch(subTree, container);
  // 设置父组件的 vnode.el，使得proxy代理对象在处理this.$el时有值，不会报错undefined
  initialVNode.el = subTree.el;
}