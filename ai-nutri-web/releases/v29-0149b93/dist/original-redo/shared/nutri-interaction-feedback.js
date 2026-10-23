/* Presentation-only: never owns navigation, submits, confirmation, or application state. */
(function (w) {
 'use strict';
 if (w.NutriInteractionFeedback) return;
 const d = w.document, KEY = 'nutri-ui-sound-v1';
 let enabled = true, audio = null, pressed = null, pressTimer = 0, loadingTimer = 0, navTimer = 0, active = true;
 let toggle, notice, toolbar, observer, lastSound = 0;
 try { enabled = w.localStorage.getItem(KEY) !== 'off'; } catch (_) {}
 const selector = 'button,a[href],[role="button"],[data-tap],[data-tab],[data-action],input[type="button"],input[type="submit"]';
 function control(target) {
  const el = target && target.closest && target.closest(selector);
  if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('[inert]')) return null;
  return el;
 }
 function clearPress() {
  if (pressed) pressed.classList.remove('nutri-feedback-pressed');
  pressed = null; w.clearTimeout(pressTimer);
 }
 function press(el) {
  clearPress(); pressed = el; el.classList.add('nutri-feedback-pressed');
  pressTimer = w.setTimeout(clearPress, 220); // Visual cleanup only; never delays an action.
 }
 function sound(event) {
  if (!enabled || !event.isTrusted) return;
  const now = Date.now(); if (now - lastSound < 60) return;
  lastSound = now;
  try {
   const Ctx = w.AudioContext || w.webkitAudioContext;
   if (!Ctx) return;
   if (!audio || audio.state === 'closed') audio = new Ctx();
   const ctx = audio;
   function beep() {
    if (!enabled || !active || ctx.state !== 'running') return;
    try {
     const osc = ctx.createOscillator(), gain = ctx.createGain(), t = ctx.currentTime;
     osc.type = 'sine'; osc.frequency.setValueAtTime(620, t);
     osc.frequency.exponentialRampToValueAtTime(420, t + 0.035);
     gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.025, t + 0.004);
     gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
     osc.connect(gain); gain.connect(ctx.destination);
     osc.onended = function () { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
     osc.start(t); osc.stop(t + 0.045);
    } catch (_) {} // Optional sound must never block navigation/forms.
   }
   if (ctx.state === 'suspended') {
    const resumed = ctx.resume();
    if (resumed && resumed.then) resumed.then(beep).catch(function () {});
   } else beep();
  } catch (_) {}
 }
 function clearLoading() {
  w.clearTimeout(loadingTimer); w.clearTimeout(navTimer);
  if (notice) { notice.hidden = true; notice.textContent = ''; }
  d.documentElement.classList.remove('nutri-navigation-pending');
 }
 function showLoading() {
  if (!notice) return;
  notice.hidden = false; notice.textContent = '正在打开页面…';
  d.documentElement.classList.add('nutri-navigation-pending');
  w.clearTimeout(loadingTimer);
  loadingTimer = w.setTimeout(clearLoading, 4000); // Presentation failsafe, not navigation scheduling.
 }
 function sameTabNavigation(el, event) {
  const a = el.closest('a[href]');
  if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self') ||
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  try {
   const to = new w.URL(a.href, w.location.href), from = new w.URL(w.location.href);
   return to.origin === from.origin && /^https?:$/.test(to.protocol) &&
    (to.pathname !== from.pathname || to.search !== from.search);
  } catch (_) { return false; }
 }
 function click(event) {
  const el = control(event.target); if (!el) return;
  press(el);
  if (el === toggle) {
   enabled = !enabled;
   try { w.localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (_) {}
   updateToggle(); if (enabled) sound(event); return;
  }
  sound(event);
  if (sameTabNavigation(el, event)) {
   // A new task observes the final cancellation state after ALL native event listeners.
   // This schedules feedback only: navigation is never scheduled or delayed by this module.
   w.clearTimeout(navTimer);
   navTimer = w.setTimeout(function () { if (active && !event.defaultPrevented) showLoading(); }, 0);
  }
 }
 function updateToggle() {
  toggle.textContent = enabled ? '音效：开' : '音效：关';
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.setAttribute('aria-label', enabled ? '关闭按钮音效' : '开启按钮音效');
 }
 function placeToggle() {
  if (!toggle || !d.body) return;
  const candidates = ['[data-nutri-feedback-slot]', '.hd-demo-strip', '.nutri-demo-label'];
  const slot = candidates.map(function (selector) { return d.querySelector(selector); }).find(function (el) {
   if (!el || el.hidden || el.closest('[hidden],[inert]')) return false;
   if (w.getComputedStyle) { const style = w.getComputedStyle(el); if (style.display === 'none' || style.visibility === 'hidden') return false; }
   return !el.getClientRects || el.getClientRects().length > 0;
  });
  if (slot) { if (toggle.parentNode !== slot) slot.appendChild(toggle); }
  else {
   if (!toolbar) { toolbar = d.createElement('div'); toolbar.className = 'nutri-feedback-tools'; }
   if (!toolbar.parentNode) d.body.insertBefore(toolbar, d.body.firstChild);
   if (toggle.parentNode !== toolbar) toolbar.appendChild(toggle);
  }
 }
 function mount() {
  if (toggle || !d.body) return;
  toggle = d.createElement('button'); toggle.type = 'button'; toggle.id = 'nutri-sound-toggle';
  toggle.className = 'nutri-sound-toggle'; updateToggle();
  notice = d.createElement('div'); notice.id = 'nutri-feedback-status';
  notice.className = 'nutri-feedback-status'; notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite'); notice.hidden = true;
  placeToggle(); d.body.appendChild(notice);
  if (w.MutationObserver) { observer = new w.MutationObserver(placeToggle); observer.observe(d.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] }); }
 }
 d.addEventListener('pointerdown', function (e) { if (e.button === 0) { const el = control(e.target); if (el) press(el); } }, true);
 d.addEventListener('pointercancel', clearPress, true);
 d.addEventListener('pointerup', clearPress, true);
 d.addEventListener('keydown', function (e) { if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) { const el = control(e.target); if (el) press(el); } }, true);
 d.addEventListener('keyup', clearPress, true);
 d.addEventListener('click', click, true);
 w.addEventListener('pageshow', function () { active = true; clearPress(); clearLoading(); });
 w.addEventListener('pagehide', function () { active = false; clearPress(); clearLoading(); });
 w.addEventListener('blur', clearPress);
 w.NutriInteractionFeedback = Object.freeze({ version: 1 });
 if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})(window);
