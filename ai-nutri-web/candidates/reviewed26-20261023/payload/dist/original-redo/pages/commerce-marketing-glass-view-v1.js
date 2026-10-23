/* Prepared render-only module. The commerce controller owns every event and write.
 * renderWallet(state, { summary: model.summary(state), viewToken, editorToken,
 *   incomingRef, disabled, operationState, message, shareOpen }) -> escaped HTML.
 * No snapshot read, DOM mutation, event binding, URL generation or persistence here.
 * Existing controller contracts: #inviter-form/code/data-editor; #share-text;
 * data-action=share|example-create|example-refund|refresh with data-view.
 * Mount/load order, locks, fresh authority and original-request retry stay with owner.
 */
(function (g) {
  'use strict';
  const BUILD = 'commerce-marketing-glass-view-v1';
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cents = n => Number.isSafeInteger(n) ? (n < 0 ? '−' : '') + '¥' + (Math.abs(n) / 100).toFixed(2) : '—';
  const list = x => Array.isArray(x) ? x : [];
  const validCode = code => typeof code === 'string' && /^DEMO-[A-Z0-9]{3,20}$/.test(code);
  const icons = {
    share:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="5" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8 11 8-5m-8 7 8 5"/>',
    ticket:'<path d="M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4zM9 5v3m0 3v2m0 3v3"/>',
    link:'<path d="m9 15 6-6m-5-3 2-2a5 5 0 0 1 7 7l-2 2M14 18l-2 2a5 5 0 0 1-7-7l2-2"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    alert:'<path d="M12 5v8m0 4v1"/><circle cx="12" cy="12" r="10"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v3"/>',
    ledger:'<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4V2h6v2M9 10h6m-6 4h6m-6 4h4"/>'
  };
  const icon = key => '<svg class="nmg-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + icons[key] + '</svg>';
  const tag = (text, kind) => '<span class="nmg-tag ' + (kind || '') + '">' + esc(text) + '</span>';
  const money = n => '<span class="nmg-money">' + cents(n) + '</span>';
  const orderLabels = {pending:'待支付',paid:'待发货',shipped:'待收货',completed:'已完成',cancelled:'已取消',refunded:'已退款'};
  const ledgerLabels = {payment:'模拟支付',refund:'模拟退款',commission:'模拟推荐佣金记账',commission_reversal:'模拟佣金退款冲回'};

  function renderWallet(state, options) {
    const o = options || {}, s = state || {}, sum = o.summary;
    // A caller must supply the model summary from the same snapshot. Missing or
    // non-synthetic input is never filled with demo balances or a fake success.
    if (s.mode !== 'synthetic' || !sum || !s.referral) {
      return '<section class="nmg-wallet"><article class="nmg-panel nmg-empty" role="status">' + icon('alert') + '<h1>权益数据暂不可用</h1><p>请通过现有账号入口核对本地合成数据。未生成邀请关系、优惠券或收益。</p></article></section>';
    }
    const token = Number.isSafeInteger(o.viewToken) && o.viewToken > 0 ? String(o.viewToken) : '';
    const editor = Number.isSafeInteger(o.editorToken) && o.editorToken > 0 ? String(o.editorToken) : '';
    const operation = ['idle','busy','unknown','failed','stale'].includes(o.operationState) ? o.operationState : 'idle';
    const locked = !!o.disabled || !token || !editor || ['busy','unknown','stale'].includes(operation);
    const button = (text, action, secondary) => '<button type="button" class="nmg-button' + (secondary ? ' nmg-secondary' : '') + '" data-action="' + action + '" data-id="" data-view="' + token + '"' + (locked ? ' disabled' : '') + '>' + esc(text) + '</button>';
    const orders = list(s.orders), coupons = list(s.coupons), ledger = list(s.ledger), examples = list(s.referral.examples);
    const blocking = orders.filter(x => x.status !== 'cancelled');
    const bound = !!sum.inviter, canBind = !bound && blocking.length === 0;
    const incoming = typeof o.incomingRef === 'string' ? o.incomingRef : '';
    const incomingValid = validCode(incoming), sameCode = bound && incomingValid && incoming === sum.inviter;
    const selfCode = incomingValid && incoming === sum.inviteCode;
    const available = coupons.filter(c => c.status === 'available').length;
    const reserved = coupons.filter(c => c.status === 'reserved').length;
    const used = coupons.filter(c => c.status === 'used').length;
    const count = list(sum.invitees).length;
    const operationText = {
      busy:'正在核对本次本地操作，请勿重复提交。',
      unknown:'结果尚未核对。当前填写与原请求保留；请在账号入口重试原操作或核对记录，不要新建重复请求。',
      failed:'本次操作未完成，请查看控制器给出的原因；没有据此宣称绑定成功或收益到账。',
      stale:'显示版本已变化。当前填写保留，请先核对最新数据。'
    };
    let html = '<section class="nmg-wallet" aria-label="分享邀请与演示权益">';
    html += '<div class="nmg-boundary" role="note">本地合成演示 · 无真实支付、发货、分销收益或提现。请勿填写真实个人资料。</div>';
    if (operation !== 'idle' || o.message) html += '<div class="nmg-operation" role="status" aria-live="polite">' + esc(o.message || operationText[operation]) + '</div>';
    html += '<header class="nmg-intro"><p class="nmg-eyebrow">AI-NUTRI / LOCAL DEMO</p><h1>一起分享，<br>每一份权益都有据</h1><p>查看邀请关系、优惠与模拟记账。不会向任何人自动发送。</p></header>';
    html += '<nav class="nmg-jumps" aria-label="本页权益内容"><a href="#nmg-invite">' + icon('share') + '邀请</a><a href="#nmg-coupons">' + icon('ticket') + '优惠券 <span>' + coupons.length + '</span></a><a href="#nmg-ledger">' + icon('ledger') + '模拟明细</a></nav>';
    html += '<section class="nmg-panel nmg-overview" aria-labelledby="nmg-overview-title"><div class="nmg-heading"><h2 id="nmg-overview-title">我的演示权益</h2>' + tag('仅模拟记账') + '</div><dl class="nmg-metrics"><div><dt>本人净消费 · 演示</dt><dd>' + money(sum.ownConsumption) + '</dd></div><div><dt>本人佣金净额 · 演示</dt><dd>' + money(sum.earnedCommission) + '</dd></div></dl><p class="nmg-muted">不是可提现余额；本人订单支付给邀请人的佣金，不计入本人收入。</p></section>';

    html += '<article id="nmg-invite" class="nmg-panel nmg-invite" aria-labelledby="nmg-invite-title"><div class="nmg-heading"><h2 id="nmg-invite-title">生成邀请内容</h2><span class="nmg-orb">' + icon('share') + '</span></div><div class="nmg-share-card"><p class="nmg-eyebrow">一起了解饮食记录</p><h3>分享体验，<br>不分享健康隐私。</h3><p>邀请你体验 AI-Nutri 本地合成演示。</p><ul class="nmg-mini-list"><li>不包含饮食、健康或聊天记录</li><li>真实跨账号邀请归因尚未接入</li><li>AI 营养服务尚未连接</li></ul><div class="nmg-code-box"><span>我的演示邀请码</span><strong>' + esc(sum.inviteCode || '暂无邀请码') + '</strong></div></div>';
    html += button('预览本地邀请内容', 'share') + '<div id="share-text" class="nmg-share-preview"' + (o.shareOpen ? '' : ' hidden') + '><h3>仅本地内容预览</h3><label for="nmg-share-code">可手动复制的演示邀请码<input id="nmg-share-code" readonly value="' + esc(sum.inviteCode || '') + '"></label><p>邀请你体验 AI-Nutri 本地合成演示。演示邀请码：<b>' + esc(sum.inviteCode || '暂无') + '</b>。</p><p class="nmg-muted">只显示文本，不生成真实邀请链接，也不会打开系统分享、写入剪贴板或向外发送。固定演示账号不能绑定自己的邀请码。</p></div></article>';

    const title = bound ? (sameCode ? '本账号已存在同一邀请关系' : '本账号邀请关系已绑定') : blocking.length ? '暂时无法绑定' : '尚未绑定邀请人';
    html += '<article id="nmg-relation" class="nmg-panel" aria-labelledby="nmg-relation-title"><div class="nmg-heading"><h2 id="nmg-relation-title">邀请归因</h2>' + tag(bound ? '已绑定 · 本地' : blocking.length ? '不符合条件' : '尚未绑定',bound ? 'nmg-good' : 'nmg-warn') + '</div><div class="nmg-relation"><span class="nmg-orb ' + (bound ? 'nmg-green' : blocking.length ? 'nmg-coral' : '') + '">' + icon(bound ? 'check' : blocking.length ? 'alert' : 'link') + '</span><div><h3>' + title + '</h3><p>邀请人：<b>' + esc(sum.inviter || '尚未绑定') + '</b></p></div></div>';
    if (incoming) html += '<p class="nmg-callout">' + (incomingValid ? '收到演示邀请码 <b>' + esc(incoming) + '</b>。' + (sameCode ? '这是本账号已存在的关系；无需重复绑定，不会重复产生权益。' : bound ? '当前关系不能更改。' : selfCode ? '不能绑定自己的邀请码，请输入其他演示邀请码。' : canBind ? '请核对后在下方明确确认。' : '当前不符合绑定条件，请查看原因。') : '此链接的邀请码格式无效，未自动绑定。') + ' 打开页面或预览不会建立关系。</p>';
    html += '<p id="inviter-eligibility" class="nmg-callout">' + (bound ? '已绑定邀请人，不能更改关系。相同邀请码的重复请求按本账号关系幂等处理，不重复建立关系。' : blocking.length ? '当前不能绑定：已有未取消的演示订单（包括已退款订单）。退款或净消费为 0 不会恢复绑定资格。' : '可绑定：尚无订单，或全部演示订单已取消。绑定后不能更改。') + '</p>';
    if (canBind) html += '<form id="inviter-form" data-editor="' + editor + '" class="nmg-form"><label for="nmg-inviter-code">绑定演示邀请人<input id="nmg-inviter-code" name="code" aria-describedby="inviter-eligibility nmg-code-help" placeholder="DEMO-FRIEND" value="' + esc(incomingValid ? incoming : '') + '" pattern="DEMO-[A-Z0-9]{3,20}" maxlength="25" autocomplete="off" spellcheck="false" required' + (locked ? ' disabled' : '') + '></label><p id="nmg-code-help" class="nmg-muted">仅接受其他演示邀请码，例如 DEMO-FRIEND；以现有模型核验结果为准。</p><button type="submit" class="nmg-button"' + (locked ? ' disabled' : '') + '>确认绑定演示关系</button></form>';
    html += '<details class="nmg-details"><summary>绑定条件与幂等说明</summary><ul class="nmg-rule-list"><li>仅在没有订单或全部订单已取消时，才能首次绑定本账号的邀请关系。</li><li>任何未取消订单均阻断首次绑定；已退款订单也不例外。</li><li>不能自邀、不能更换已绑定邀请人；相同关系重复确认不重复生效。</li><li>幂等范围是本账号邀请关系，不是“每个分享链接在所有账号中只能使用一次”。</li><li>当前模型没有“只能通过邀请码首次注册”的额外资格限制。</li></ul></details>';
    if (blocking.length) {
      const rows = blocking.map(order => '<li class="nmg-list-row"><span><b>' + esc(order.id) + '</b><small>订单未取消，因此仍阻断首次绑定</small></span>' + tag(orderLabels[order.status] || '未识别状态 · 待核对') + '</li>');
      html += '<details class="nmg-details"><summary>相关演示订单 <span>' + blocking.length + ' 单</span></summary>' + foldRows(rows,'订单') + '<a class="nmg-text-link" href="orders.html">查看订单与退款进度 →</a></details>';
    }
    html += '</article>';

    html += '<article id="nmg-coupons" class="nmg-panel" aria-labelledby="nmg-coupon-title"><div class="nmg-heading"><h2 id="nmg-coupon-title">我的优惠券</h2>' + tag('本地合成券') + '</div><div class="nmg-counts" aria-label="优惠券状态统计"><span>可用 <b>' + available + '</b></span><span>订单锁定 <b>' + reserved + '</b></span><span>已使用 <b>' + used + '</b></span></div>';
    const couponRows = coupons.map(c => {
      const usable = c.status === 'available', label = {available:'可使用 · 需满足门槛',reserved:'订单锁定',used:'已使用'}[c.status] || '状态待核对';
      return '<li class="nmg-ticket' + (usable ? '' : ' nmg-ticket-muted') + '"><div class="nmg-ticket-value">' + money(c.value) + '<small>满 ' + cents(c.threshold) + '</small></div><div class="nmg-ticket-content"><h3>' + esc(c.title || '演示优惠券') + '</h3>' + tag(label,usable ? 'nmg-good' : '') + '<p>以结算模型核算结果为准</p>' + (usable ? '<a class="nmg-text-link" href="shop.html#cart">到演示结算核对 →</a>' : '') + '</div></li>';
    });
    html += couponRows.length ? foldRows(couponRows,'优惠券') : '<div class="nmg-empty">' + icon('ticket') + '<h3>暂无演示优惠券</h3><p>不会根据邀请或注册状态虚构发券。</p></div>';
    html += '<p class="nmg-muted">可使用不代表当前购物车已满足门槛。取消或退款后演示券恢复可用；当前模型无券有效期字段，不虚构已过期状态或有效日期。</p></article>';

    html += '<article class="nmg-panel" aria-labelledby="nmg-rule-title"><div class="nmg-heading"><h2 id="nmg-rule-title">模拟分销规则</h2><span class="nmg-orb">' + icon('ledger') + '</span></div><p>' + esc(sum.rule || '当前规则未提供，请核对模型状态。') + '</p><div class="nmg-callout">待支付不计佣金；订单完成后才生成邀请人模拟记账；退款全额冲回。具体金额来自模型，不把参考图的金额、人数或订单量当成记录。</div><p class="nmg-muted">无真实分销到账、充值、提现或多级分佣。</p></article>';
    html += '<article class="nmg-panel" aria-labelledby="nmg-privacy-title"><div class="nmg-heading"><h2 id="nmg-privacy-title">受邀人授权范围</h2><span class="nmg-orb nmg-green">' + icon('lock') + '</span></div><p>本地模型的受邀人记录：<b>' + count + ' 人</b></p><div class="nmg-empty"><h3>暂无真实受邀人授权数据</h3><p>不展示姓名、健康、饮食、聊天或个人订单；不会推测好友消费。记录数量不代表真实授权或跨账号归因已接入。</p></div></article>';
    html += '<article class="nmg-panel" aria-labelledby="nmg-sandbox-title"><div class="nmg-heading"><h2 id="nmg-sandbox-title">虚构结算沙盒</h2>' + tag('主动操作后生成') + '</div><p>使用模型内置虚构结算算例，核对佣金与全额退款冲回；不是真实客户、授权或收益。</p>';
    html += !examples.length ? button('生成虚构结算示例','example-create',true) : examples[0].refunded ? '<p class="nmg-callout nmg-good">虚构示例已标记退款。净额请核对下方实际模拟流水，不据此宣称真实退款到账。</p>' : button('模拟示例退款冲回','example-refund',true);
    html += '</article>';

    html += '<article id="nmg-ledger" class="nmg-panel" aria-labelledby="nmg-ledger-title"><div class="nmg-heading"><h2 id="nmg-ledger-title">消费、退款与佣金明细</h2>' + tag(ledger.length + ' 笔') + '</div><p class="nmg-muted">下列是本地模型流水，不是资金到账凭证。受益人不是本人的佣金不计入上方本人净额。</p>';
    const ledgerRows = ledger.map(l => '<li class="nmg-list-row"><span><b>' + esc(ledgerLabels[l.type] || '未识别流水 · 待核对') + '</b><small>' + esc(l.orderId) + (l.beneficiary ? ' · ' + (l.beneficiary === sum.inviteCode ? '本人演示邀请码' : '其他演示邀请人') : '') + '</small></span><strong class="nmg-ledger-amount' + (Number.isSafeInteger(l.cents) && l.cents < 0 ? ' nmg-negative' : '') + '">' + cents(l.cents) + '</strong></li>');
    html += ledgerRows.length ? foldRows(ledgerRows,'流水') : '<div class="nmg-empty">' + icon('ledger') + '<h3>还没有模拟流水</h3><p>所有汇总来自同一模型快照，不展示参考图中的示例订单。</p></div>';
    html += '<a class="nmg-text-link" href="orders.html">查看订单与退款进度 →</a></article><p class="nmg-footer-note">只在本地合成账号内演示。邀请关系、优惠与流水均由现有控制器和模型处理；错误与重试以账号入口的核验状态为准。</p></section>';
    return html;
  }
  function foldRows(rows, label) {
    const head = '<ul class="nmg-list">' + rows.slice(0,5).join('') + '</ul>';
    return head + (rows.length > 5 ? '<details class="nmg-details nmg-more"><summary>展开其余 ' + (rows.length - 5) + ' 条' + label + '</summary><ul class="nmg-list">' + rows.slice(5).join('') + '</ul></details>' : '');
  }
  const api = Object.freeze({buildId:BUILD,renderWallet});
  g.NutriCommerceMarketingGlass = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
