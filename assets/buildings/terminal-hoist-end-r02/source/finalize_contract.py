from pathlib import Path
import json
O=Path(__file__).resolve().parents[1];p=O/'component-catalog.json';rows=json.loads(p.read_text())
for r in rows:
 r.update(coordinateFrame='Local to unchanged cargo.hoist root. SourceZUp to GltfYUp: (x,y,z)->(x,z,-y)',sourceToGltfMatrixRowMajor=[[1,0,0,0],[0,0,1,0],[0,-1,0,0],[0,0,0,1]],pivotMeaning='Static authored origin only, no interactive rotation pivot implemented',rotationAxisSourceZUp=None,rotationAxisGltfYUp=None)
 if r['id'].endswith('termination'):pos=[0,0,.64];kind='cable.clamp';r['clampPinsNominalCableOverlapMetres']=.0025
 elif r['id'].endswith('link'):pos=[0,0,.55];kind='termination.fixed.link'
 else:pos=[0,0,.461];kind='orthogonal.suspension.eye';r['tubeEndsCappedInTerminalDerivative']=True
 r['interfaces']=[{'id':kind,'positionSourceZUp':pos,'positionGltfYUp':[pos[0],pos[2],-pos[1]],'contractOnly':True}]
p.write_text(json.dumps(rows,indent=2))
