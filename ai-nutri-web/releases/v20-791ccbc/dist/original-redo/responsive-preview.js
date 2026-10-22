'use strict';
(() => {
  // Only these existing same-origin entrypoints can be opened by this controller.
  // The embedded app retains its own navigation, storage and security policy.
  const routes = Object.freeze({
    home: Object.freeze({ path: 'index.html', label: '默认入口（助手）' }),
    booklet: Object.freeze({ path: 'nutrition-booklet.html', label: '营养册首页' }),
    aiAgent: Object.freeze({ path: 'pages/aiAgent.html', label: '营养助手' }),
    profile: Object.freeze({ path: 'pages/profile.html', label: '个人主页' }),
    intake: Object.freeze({ path: 'pages/intake.html', label: '今日摄入' }),
    family: Object.freeze({ path: 'pages/family.html', label: '合成家庭' }),
    shop: Object.freeze({ path: 'pages/shop.html', label: '营养商城' }),
    wallet: Object.freeze({ path: 'pages/wallet.html', label: '分享与权益' }),
    student: Object.freeze({ path: 'pages/student.html', label: '营养师与需求工作台' })
  });
  const widths = Object.freeze(['320', '390', '430']);
  const form = document.getElementById('route-form');
  const controls = document.getElementById('preview-controls');
  const routeSelect = document.getElementById('route-select');
  const openButton = document.getElementById('open-route');
  const frame = document.getElementById('preview-frame');
  const shell = document.getElementById('frame-shell');
  const placeholder = document.getElementById('frame-placeholder');
  const status = document.getElementById('preview-status');
  const widthOutput = document.getElementById('width-output');
  let openedRoute = null;

  // No URL/query/hash parsing and no parent access to the app's document/storage.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const key = routeSelect.value;
    if (!Object.prototype.hasOwnProperty.call(routes, key)) {
      status.textContent = '未打开：请选择列表中的现有页面。';
      return;
    }
    const route = routes[key];
    if (openedRoute !== null && !window.confirm(
      `打开「${route.label}」会离开当前嵌入页面，未保存的草稿可能丢失。\n` +
      '页面读取和操作可能改动同一浏览器中的合成演示状态。确定继续吗？'
    )) {
      routeSelect.value = openedRoute;
      status.textContent = '已取消打开，保留当前嵌入页面；未重新载入。';
      return;
    }
    openedRoute = key;
    placeholder.hidden = true;
    frame.hidden = false;
    status.textContent = `正在打开：${route.label}。如区域空白或被拦截，请检查原入口，不要降低站点安全策略。`;
    frame.setAttribute('src', route.path);
    openButton.textContent = '打开所选页面';
  });

  controls.addEventListener('change', (event) => {
    const input = event.target;
    if (!input || input.name !== 'preview-width' || !widths.includes(input.value)) return;
    // Resize this one iframe in place: never set src, replace the node or reload.
    frame.setAttribute('width', input.value);
    shell.setAttribute('data-width', input.value);
    widthOutput.textContent = `${input.value} CSS px`;
  });

  frame.addEventListener('load', () => {
    if (openedRoute === null) return;
    // A load event is not evidence that an embedded app rendered successfully.
    status.textContent = `最近打开入口：${routes[openedRoute].label}。请在下方查看实际页面；此处不判断加载成功，也不追踪页内导航。`;
  });

  controls.disabled = false;
})();
