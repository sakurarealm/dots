"""Run one lightweight CPU preview while protecting 2GiB of system RAM."""
from pathlib import Path
import os,sys,time,subprocess,signal,json,datetime
ROOT=Path(__file__).resolve().parents[1];RESERVE=2*1024**3;BUDGET=180*1024**2
def available():return next(int(x.split()[1])*1024 for x in Path('/proc/meminfo').read_text().splitlines() if x.startswith('MemAvailable:'))
style,name=sys.argv[1:3];w=sys.argv[3] if len(sys.argv)>3 else '640';h=sys.argv[4] if len(sys.argv)>4 else '720';records=[]
while available()<RESERVE+BUDGET:
    print('WAIT_RESOURCE',round(available()/1024**2),'MiB; no renderer running',flush=True);time.sleep(15)
env=dict(os.environ);env.update(OPENBLAS_NUM_THREADS='1',OMP_NUM_THREADS='1',MKL_NUM_THREADS='1');start=available();log=ROOT/'validation'/f'{style}_{name}_light_run.log'
with log.open('w') as stream:
    p=subprocess.Popen(['python3',str(ROOT/'sources/render_actual_glb.py'),style,name,w,h],env=env,stdout=stream,stderr=subprocess.STDOUT,start_new_session=True)
    print('CPU_RENDER_STARTED',p.pid,flush=True)
    while p.poll() is None:
        mem=available();records.append({'at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'available_bytes':mem})
        if mem<RESERVE:
            os.killpg(p.pid,signal.SIGTERM);p.wait();print('STOP_OWN_PREVIEW_PROTECT_2GiB',flush=True);break
        time.sleep(.5)
result={'startup_available_bytes':start,'minimum_available_bytes':min(x['available_bytes'] for x in records) if records else available(),'reserve_bytes':RESERVE,'exit_code':p.returncode,'history':records,'scope':'only this lightweight renderer process; no Blender or shared heavy lock used'}
(ROOT/'validation'/f'{style}_{name}_resource_guard.json').write_text(json.dumps(result,indent=2));print('CPU_RENDER_FINISHED',p.returncode,flush=True);sys.exit(p.returncode)
