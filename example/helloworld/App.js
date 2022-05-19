import { h } from '../../lib/guid-mini-vue.esm.js';

export const App = {
  // template也会被编译成render函数
  render() {
    // 测试在render函数中通过this获取到setup的返回对象的property
    return h(
      'div',
      {
        id: 'app',
        name: ['111', '222'],
      },
      // 'hi,' + this.msg,  // string文本
      [h('p', { class: 'red' }, 'hi'), h('p', { class: 'blue' }, 'mini-vue-next')],
    );
  },
  setup() {
    // 可以返回一个对象或函数，如果是函数则表示返回的是render函数
    return {
      msg: 'mini-vue-next',
    };
  },
};
