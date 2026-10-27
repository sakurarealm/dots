/* Read-only profile page presentation. No account, storage, health or network API. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else factory().mount(root);
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const SLOT = '__nutriProfileSetupViewV1';
  function mount(w) {
    const d = w.document;
    if (!d || d.body?.dataset.originalPage !== 'profile-setup') return null;
    if (w[SLOT]) return w[SLOT];
    const help = d.getElementById('psp-help');
    const dialog = d.getElementById('psp-dialog');
    const dismiss = d.getElementById('psp-dialog-close');
    const status = d.getElementById('psp-status');
    const limits = d.getElementById('psp-limits');
    const save = d.getElementById('psp-save');
    if (!help || !dialog || !dismiss || !status || !limits || !save) {
      if (help) help.disabled = true;
      if (save) save.disabled = true;
      if (status) {
        status.dataset.state = 'error';
        status.textContent = '说明组件未完整加载；资料仍不可填写或保存。请阅读页面说明，或返回我的。';
      }
      return null;
    }
    let active = true;
    function ready() {
      active = true;
      help.disabled = false;
      save.disabled = true;
      status.dataset.state = 'ready';
      status.textContent = '资料结构预览 · 编辑与保存未开放。';
    }
    function restoreFocus() {
      if (active && !dialog.open && !help.disabled && help.isConnected !== false) help.focus();
    }
    function close() {
      if (!active || !dialog.open) return;
      dialog.close();
      restoreFocus();
    }
    function fallback() {
      limits.open = true;
      status.dataset.state = 'error';
      status.textContent = '当前浏览器未能打开弹窗，已展开下方资料说明。资料仍不可填写或保存。';
      limits.querySelector('summary')?.focus();
    }
    function open() {
      if (!active || help.disabled || dialog.open) return;
      if (typeof dialog.showModal !== 'function' || typeof dialog.close !== 'function') {
        fallback();
        return;
      }
      try {
        dialog.showModal();
        status.dataset.state = 'ready';
        status.textContent = '资料结构预览 · 编辑与保存未开放。';
        dismiss.focus();
      } catch (_) {
        if (dialog.open) dialog.close();
        fallback();
      }
    }
    function cancel(event) {
      event.preventDefault();
      close();
    }
    function hide() {
      active = false;
      help.disabled = true;
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      limits.open = false;
    }
    help.addEventListener('click', open);
    dismiss.addEventListener('click', close);
    dialog.addEventListener('cancel', cancel);
    dialog.addEventListener('close', restoreFocus);
    w.addEventListener('pagehide', hide);
    w.addEventListener('pageshow', ready);
    const api = Object.freeze({ buildId: 'profile-setup-readonly-v1' });
    Object.defineProperty(w, SLOT, { value: api, configurable: false, writable: false });
    ready();
    return api;
  }
  return Object.freeze({ mount });
});
