import bpy,json,sys,struct,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from topology_contract import ROOT
from build_shapes import select_only
from inspect_glb_format import inspect

def main():
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'source'/'oak_fence_patterns_cost_reference.blend'))
    ob=bpy.data.objects['COST_partial52_render_only'];mat=ob.data.materials[0]
    output=mat.node_tree.nodes.get('Material Output')
    for link in list(output.inputs['Surface'].links):mat.node_tree.links.remove(link)
    mat.node_tree.links.new(mat.node_tree.nodes.get('Principled BSDF').outputs['BSDF'],output.inputs['Surface'])
    mat.use_backface_culling=True;select_only(ob)
    path=ROOT/'exports'/'oak_fence_partial52_render_reference.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
       export_texcoords=True,export_normals=True,export_tangents=False,export_materials='EXPORT')
    b=path.read_bytes();n,t=struct.unpack_from('<II',b,12);j=json.loads(b[20:20+n])
    assert j.get('images') and j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']==0
    stats=inspect(path);assert stats['index_count']==156 and not stats['material_double_sided']
    report=ROOT/'reports'/'fence-patterns-cost-study.json';r=json.loads(report.read_text())
    r['partial52_actual_export']=stats;r['partial52_export_material']='Standard PBR bridge with shared oak512; review diffuse-toon image is a separate approximation'
    r['overlapping60_render_observation']='A black coplanar-overlap patch appeared on the post top in the Blender comparison; native Unity rendering is not proven.'
    report.write_text(json.dumps(r,indent=2))
    print('RESULT '+json.dumps({'status':'partial52_PBR_shared_texture_export_verified','triangles':52,'collider_pass':False}),flush=True)

if __name__=='__main__':main()
