#!/usr/bin/env python3
"""Original state-specific Aether audio recipes; stdlib, deterministic, no external samples."""
from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parents[1]
MATRIX=ROOT/'requirements/requirements-matrix.json'
if not MATRIX.exists():
 MATRIX.parent.mkdir(exist_ok=True)
 shutil.copyfile(ROOT.parent/'aether-audio-requirements-20261012/requirements-matrix.json',MATRIX)
req=json.loads(MATRIX.read_text())
def modal(f,t=.12,g=.4,start=0,kind='wood'):
 ratios,weights,damping={'wood':([1,2.76,5.4],[.72,.19,.05],[24,45,70]),'stone':([1,1.43,2.37,3.81],[.66,.22,.08,.025],[20,31,47,66]),'glass':([1,2.013,2.756,4.087],[.6,.23,.1,.04],[10,16,23,35]),'ceramic':([1,1.87,3.14],[.65,.22,.09],[17,29,48])}[kind]
 return dict(type='modal',freq=f,duration=t,gain=g,start=start,ratios=ratios,weights=weights,damping=damping,attack=.002)
def tone(f,end,t=.12,g=.16,start=0):return dict(type='tone',freq=f,endFreq=end,duration=t,gain=g,start=start,decay=9,attack=.006)
def noise(t=.12,g=.12,cut=1800,start=0):return dict(type='noise',duration=t,gain=g,cutoff=cut,start=start,decay=5,attack=.004)
def glass(f=1200,t=.13,g=.15,start=0):return modal(f,t,g,start,'glass')
def wood(f=380,t=.10,g=.40,start=0):return modal(f,t,g,start,'wood')
def stone(f=170,t=.16,g=.42,start=0):return modal(f,t,g,start,'stone')
def ceramic(f=720,t=.17,g=.32,start=0):return modal(f,t,g,start,'ceramic')
# Each recipe is a composed set of onset, material, gesture and consequence-specific layers.
# gain is intentional mix priority: UI hover is quieter than committed actions.
R={
'ui_focus_tick':('焦点 · 薄光微触','悬浮',.10,.035,[glass(1750,.052,.18),noise(.042,.07,5500)]),
'ui_panel_open':('面板 · 空气展开','悬浮',.18,.12,[noise(.18,.24,3600),tone(540,960,.16,.14),glass(1320,.15,.09,.026)]),
'ui_panel_close':('面板 · 轻柔收拢','悬浮',.14,.07,[noise(.12,.16,1700),tone(790,370,.13,.14),wood(430,.065,.13,.045)]),
'ui_tab_switch':('标签 · 横向滑片','悬浮',.13,.035,[noise(.068,.20,2700),tone(1150,1030,.072,.15),glass(1580,.055,.07,.017)]),
'ui_plan_accepted':('计划 · 双段落锁','木',.23,.10,[wood(520,.10,.46),wood(480,.09,.39,.082),glass(1150,.08,.065,.094)]),
'ui_action_cancel':('取消 · 柔性退让','悬浮',.16,.09,[tone(470,320,.16,.18),noise(.18,.16,1500),wood(310,.055,.11)]),
'ui_soft_warning':('提醒 · 轻木双点','木',.21,.075,[wood(610,.08,.38),wood(575,.08,.30,.105),noise(.13,.06,1600,.035)]),
'ui_action_blocked':('受阻 · 钝玻璃止动','石',.25,.05,[ceramic(360,.14,.44),stone(150,.09,.24),noise(.06,.13,1900)]),
'build_placement_valid':('定位 · 木榫轻扣','木',.17,.035,[wood(650,.075,.36),noise(.032,.075,2300)]),
'build_placement_commit':('放置 · 木石稳落','石',.32,.15,[wood(360,.13,.42),stone(135,.22,.51,.035),noise(.095,.17,1050,.03)]),
'build_construction_complete':('完工 · 材质安定','石',.34,.23,[stone(185,.22,.43),wood(470,.17,.36,.095),glass(830,.32,.21,.165),glass(1245,.28,.11,.235)]),
'production_batch_start':('投料 · 陶木起炉','木',.28,.12,[wood(400,.13,.39),ceramic(610,.17,.30,.052),noise(.21,.16,2100,.07)]),
'production_stage_complete':('工序 · 陶木接合','木',.22,.08,[ceramic(710,.15,.32),wood(565,.09,.36,.065),noise(.048,.05,1300,.065)]),
'production_batch_ready':('待领 · 温暖双音','金属',.27,.18,[ceramic(780,.28,.37),glass(1040,.32,.25,.17),tone(390,390,.21,.12)]),
'production_claim_commit':('领取 · 布袋落物','木',.28,.10,[noise(.15,.23,950),wood(315,.12,.48,.062),glass(1390,.12,.105,.11)]),
'production_material_blocked':('缺料 · 空陶止动','石',.25,.065,[ceramic(410,.15,.46),wood(255,.08,.25,.096),noise(.044,.065,1650)]),
'inventory_transfer_commit':('调拨 · 布木交接','木',.27,.085,[noise(.12,.22,1100),wood(370,.11,.42,.052),wood(590,.08,.23,.125)]),
'inventory_capacity_blocked':('满载 · 木箱闷扣','木',.24,.045,[wood(205,.13,.53),stone(120,.08,.18),noise(.058,.08,620)]),
'item_gear_apply':('配装 · 皮革细扣','金属',.26,.10,[noise(.13,.22,900),wood(410,.09,.25,.043),glass(1940,.13,.20,.094)]),
'trade_commit':('交易 · 一币一物','金属',.28,.13,[glass(2230,.24,.30),wood(330,.12,.41,.083),noise(.075,.12,1150,.073)]),
'agriculture_water_commit':('浇水 · 陶罐湿土','石',.28,.13,[ceramic(850,.16,.16),noise(.36,.35,2700,.025),tone(1200,510,.095,.11,.075),tone(860,360,.10,.10,.208),stone(155,.12,.19,.29)]),
'agriculture_harvest_commit':('收获 · 纤维入袋','木',.28,.10,[noise(.075,.30,4800),noise(.21,.24,1000,.08),wood(280,.13,.34,.13),wood(430,.07,.15,.195)]),
'companion_invite_sent':('邀请 · 轻声送出','悬浮',.20,.14,[glass(1140,.16,.18),wood(540,.08,.22,.065),wood(595,.07,.17,.13),tone(570,660,.15,.07)]),
'companion_invite_accepted':('应邀 · 温暖回应','木',.24,.14,[ceramic(620,.23,.32),wood(465,.09,.22,.09),glass(930,.15,.11,.12)]),
'companion_arrived':('到场 · 柔软停驻','木',.25,.09,[noise(.18,.24,880),wood(240,.13,.36,.055),wood(270,.10,.25,.165),glass(1170,.10,.07,.21)]),
'companion_activity_complete':('协作 · 双材质呼应','木',.30,.20,[wood(520,.16,.39),ceramic(780,.24,.36,.14),wood(650,.13,.24,.26),glass(1040,.23,.13,.31)]),
'companion_work_blocked':('同伴 · 中性顿点','木',.22,.075,[wood(325,.13,.41),noise(.21,.17,1250,.04),tone(490,440,.15,.06,.04)]),
'companion_invite_declined':('改期 · 空气轻落','悬浮',.17,.11,[noise(.20,.19,950),tone(590,455,.18,.14),wood(345,.065,.10,.09)]),
'fishing_cast':('抛竿 · 细绳入水','木',.31,.15,[noise(.17,.30,4500),tone(680,1280,.11,.12),noise(.14,.27,2100,.18),tone(1150,480,.09,.18,.19)]),
'fishing_bite':('咬钩 · 浮标轻击','木',.28,.07,[tone(920,440,.082,.22),noise(.08,.21,2800),wood(950,.078,.39,.05)]),
'fishing_reel_tension':('收线 · 柔弦张力','木',.24,.05,[noise(.52,.26,2150),tone(185,230,.52,.19),tone(372,460,.50,.095),wood(380,.048,.13,.12),wood(410,.048,.11,.30)]),
'fishing_catch_commit':('鱼获 · 湿触回执','木',.31,.12,[noise(.13,.28,2600),tone(1080,510,.088,.16),wood(280,.14,.44,.09),noise(.09,.14,900,.16)]),
'fishing_escape':('脱钩 · 水面释线','悬浮',.24,.12,[noise(.21,.31,2300),tone(760,210,.16,.17),noise(.085,.12,4200,.10)]),
'route_departure_accepted':('出发 · 整备前移','木',.27,.15,[noise(.13,.22,1050),wood(370,.11,.35,.035),glass(1680,.095,.11,.07),tone(420,650,.22,.13,.09),noise(.23,.13,3100,.10)]),
'route_path_blocked':('阻路 · 碎石滑停','石',.28,.07,[noise(.17,.26,2600),stone(205,.18,.40,.065),wood(290,.09,.25,.13)]),
'world_safety_interrupt':('避险 · 低压定向','石',.32,.16,[noise(.31,.27,720),stone(135,.28,.45),wood(430,.10,.27,.13),glass(810,.17,.17,.22)])
}
assert set(R)=={e['event_id'] for e in req['events']}
presets=[];meta={}
for i,e in enumerate(req['events']):
 id=e['event_id'];name,material,gain,room,modules=R[id];duration=max(m.get('start',0)+m['duration'] for m in modules)+.012
 presets.append(dict(version=1,id=id,name=name,category=e['category'],material=material,description=e['sound_direction'][:80],seed=90001+i*103,variantSeeds=[90001+i*103,150001+i*107],duration=max(.06,round(duration,4)),global_=None,modules=modules))
 presets[-1].pop('global_');presets[-1]['global']={'pitch':0,'stretch':1,'softness':.62 if material in ['木','石'] else .50,'room':room,'gain':gain}
 meta[id]={**e,'asset_status':'original_procedural_candidate','playback_space':'prebaked_stereo_preview_and_dry_mono_source','loop_prototype':id=='fishing_reel_tension'}
(ROOT/'dist/game-events.json').write_text(json.dumps(presets,ensure_ascii=False,indent=2)+'\n')
(ROOT/'dist/game-events.js').write_text('window.AETHER_GAME_EVENTS = '+json.dumps(presets,ensure_ascii=False,indent=2)+';\nwindow.AETHER_EVENT_METADATA = '+json.dumps(meta,ensure_ascii=False,indent=2)+';\n')
(ROOT/'requirements/event-asset-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print(f'Created {len(presets)} distinct state-specific recipes, 2 seeds each. No code hooks verified.')
