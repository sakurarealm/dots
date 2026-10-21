import bpy,json,hashlib,shutil,struct
from pathlib import Path
D=Path(__file__).resolve().parent;SRC=D.parent/'grid-stone-template-r1/stone-grid-trial.blend'
bpy.ops.wm.open_mainfile(filepath=str(SRC));bpy.ops.object.select_all(action='DESELECT');selected=[];hidden=[]
for name in ['WORKSHOP_SAMPLE','ROOFTOP_CLOUD_MODULES']:
 for o in bpy.data.collections[name].objects:
  if not o.hide_render:o.select_set(True);selected.append(o.name)
  else:hidden.append(o.name)
bpy.ops.export_scene.gltf(filepath=str(D/'stone-grid-trial-corrected.glb'),export_format='GLB',use_selection=True,export_extras=True)
# Byte-identical source Blend copy: no author geometry or render-state edit.
shutil.copy2(SRC,D/'stone-grid-trial.blend')
def glb(p):
 b=p.read_bytes();l=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+l])
def keys(g):return {n['extras']['logicalPlacementKey']for n in g['nodes']if n.get('extras',{}).get('logicalPlacementKey')}
a=glb(D.parent/'workshop-levels-L5-rooftop-cloud-r9c/rooftop-cloud.glb');b=glb(D/'stone-grid-trial-corrected.glb');old=keys(a);new=keys(b)
ar={a['nodes'][i]['name']for i in a['scenes'][a.get('scene',0)]['nodes']};br={b['nodes'][i]['name']for i in b['scenes'][b.get('scene',0)]['nodes']}
m=json.loads((D.parent/'grid-stone-template-r1/migration-and-tests.json').read_text());expected_removed={v['stableLogicalKey']for v in m['replacementMapping']if not v['remainingLegacyRoot']};expected_added={v['stableLogicalKey']for v in m['instances']};assert old-new==expected_removed;assert new-old==expected_added
assert ar-br==expected_removed;assert br-ar==expected_added
r={'status':'AUTHOR_EXPORT_SCOPE_CORRECTED_PENDING_INDEPENDENT_REVIEW','baselineSceneRootCount':len(a['scenes'][a.get('scene',0)]['nodes']),'correctedSceneRootCount':len(b['scenes'][b.get('scene',0)]['nodes']),'removedLogicalKeys':sorted(old-new),'addedLogicalKeys':sorted(new-old),'expectedRootLogicalDeltaPass':True,'exactSceneRootNameDeltaPass':True,'removedSceneRootNames':sorted(ar-br),'addedSceneRootNames':sorted(br-ar),'selectedObjectCount':len(selected),'selectedObjects':selected,'excludedHiddenObjects':hidden,'exportCollections':['WORKSHOP_SAMPLE','ROOFTOP_CLOUD_MODULES'],'blendByteIdenticalToR1':hashlib.sha256(SRC.read_bytes()).hexdigest()==hashlib.sha256((D/'stone-grid-trial.blend').read_bytes()).hexdigest(),'renderInheritance':'R1 before-close/after-close/after-full-corrected remain geometry-valid because Blend byte-identical. Original R1 GLB has erroneous extra prototype/hidden meshes and is superseded.'}
(D/'export-scope-tests.json').write_text(json.dumps(r,indent=2));(D/'SHA256.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in D.iterdir()if p.is_file()and p.name!='SHA256.json'},indent=2));print('PASS',len(old-new),len(new-old),len(selected))
