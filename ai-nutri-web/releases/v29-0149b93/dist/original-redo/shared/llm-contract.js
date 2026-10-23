/* Offline-only contract candidate. No fetch/wx, credentials, persistence or real model. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NutriLLMOffline = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 'nutri-llm-offline/1';
  const messages = Object.freeze({
    NOT_CONNECTED: 'LLM 服务未连接；本机规则回复不是大模型回复。',
    INVALID_REQUEST: '请求格式不符合离线合成数据契约。',
    INVALID_RESPONSE: '离线响应格式或来源不符合契约。',
    CANCELLED: '请求已取消。', SUPERSEDED: '请求已被较新的请求替代。',
    CONTEXT_CHANGED: '页面、账号或演示上下文已变化。',
    TIMEOUT: '离线请求已超时，未自动重试。', TRANSPORT_ERROR: '离线适配器失败，未自动重试。'
  });
  function failure(code, requestId) {
    return Object.freeze({version: VERSION, ok: false, requestId, source: 'none', code, message: messages[code]});
  }
  function exact(value, keys) {
    return value && typeof value === 'object' && !Array.isArray(value) &&
      Object.keys(value).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(value, k));
  }
  function snapshot(value, keys) {
    if (!exact(value, keys)) return null;
    const copy = {};
    keys.forEach(key => { copy[key] = value[key]; });
    return copy;
  }
  // This seam is for offline tests ONLY, not a configurable production gateway.
  function createOfflineFixtureAdapter(run) {
    if (typeof run !== 'function') throw new TypeError('Offline fixture function required');
    return Object.freeze({kind: 'offline-fixture', run});
  }
  function create(options) {
    options = options || {};
    const adapter = options.adapter;
    if (adapter && (adapter.kind !== 'offline-fixture' || typeof adapter.run !== 'function')) throw new TypeError('Only offline fixtures supported');
    const timeoutMs = options.timeoutMs === undefined ? 10000 : options.timeoutMs;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw new TypeError('Invalid timeout');
    let serial = 0, active = null, closed = false, epoch = 0, invalidating = 0;
    function invalidate() {
      epoch++;
      invalidating++;
      const previous = active;
      active = null;
      try { if (previous) previous.finish(failure('CONTEXT_CHANGED', previous.id)); }
      finally { invalidating--; }
    }
    function send(input) {
      const id = 'offline-' + (++serial), generation = epoch;
      let settle, timer, completed = false, abort = null;
      const promise = new Promise(resolve => { settle = resolve; });
      const slot = {id, finish(result) {
        if (completed) return;
        if (result.ok && (generation !== epoch || closed || invalidating)) result = failure('CONTEXT_CHANGED', id);
        completed = true;
        clearTimeout(timer);
        if (active === slot) active = null;
        if (!result.ok && abort) { try { abort(); } catch (_) {} }
        settle(result);
      }};
      const handle = Object.freeze({requestId: id, promise, cancel() { slot.finish(failure('CANCELLED', id)); }});
      // Publish first: an old abort may synchronously send a newer request.
      const previous = active;
      active = slot;
      if (previous) previous.finish(failure('SUPERSEDED', previous.id));
      if (completed) return handle;
      if (closed || invalidating || generation !== epoch) { slot.finish(failure('CONTEXT_CHANGED', id)); return handle; }
      let valid = false, text;
      try {
        const copy = snapshot(input, ['text', 'synthetic']);
        valid = !!copy && copy.synthetic === true && typeof copy.text === 'string' && copy.text.trim().length > 0 && copy.text.length <= 400;
        if (valid) text = copy.text.trim();
      } catch (_) { valid = false; }
      if (completed) return handle;
      if (!valid) { slot.finish(failure('INVALID_REQUEST', id)); return handle; }
      if (!adapter) { slot.finish(failure('NOT_CONNECTED', id)); return handle; }
      const request = Object.freeze({version: VERSION, requestId: id, text, synthetic: true});
      timer = setTimeout(() => slot.finish(failure('TIMEOUT', id)), timeoutMs);
      // Defer fixture work so immediate cancellation can prevent even fixture dispatch.
      Promise.resolve().then(() => {
        if (completed) return;
        const task = adapter.run(request);
        if (!task || !task.promise || typeof task.promise.then !== 'function') throw new Error('Invalid fixture task');
        abort = typeof task.abort === 'function' ? () => task.abort() : null;
        if (completed) { if (abort) { try { abort(); } catch (_) {} } return task.promise.then(() => {}, () => {}); }
        return task.promise.then(response => {
          if (completed) return;
          let copy, valid = false;
          try {
            copy = snapshot(response, ['version', 'requestId', 'source', 'text']);
            valid = !!copy && copy.version === VERSION && copy.requestId === id && copy.source === 'offline-fixture' &&
              typeof copy.text === 'string' && copy.text.trim().length > 0 && copy.text.length <= 4000;
          } catch (_) {}
          if (!valid) { slot.finish(failure('INVALID_RESPONSE', id)); return; }
          slot.finish(Object.freeze({version: VERSION, ok: true, requestId: id,
            source: 'offline-fixture', text: copy.text, synthetic: true, isLLM: false}));
        });
      }).catch(() => slot.finish(failure('TRANSPORT_ERROR', id)));
      return handle;
    }
    return Object.freeze({send, invalidate, dispose() { closed = true; invalidate(); },
      status() { return Object.freeze({connected: false, mode: adapter ? 'offline-fixture' : 'disconnected', message: messages.NOT_CONNECTED}); }});
  }
  return Object.freeze({VERSION, create, createOfflineFixtureAdapter});
}));
