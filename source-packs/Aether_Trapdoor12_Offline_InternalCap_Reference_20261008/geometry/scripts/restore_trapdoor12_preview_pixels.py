"""Verify lossless WebP pixels; optionally restore missing PNG pixel copies.

Original encoded PNG bytes and their hashes are not recreated by this helper.
"""
from pathlib import Path
from PIL import Image
import argparse, hashlib, json
OUT=Path(__file__).resolve().parents[1]/'next_trapdoor12'

def main():
    p=argparse.ArgumentParser();p.add_argument('--restore-png-pixels',action='store_true');args=p.parse_args()
    rows=json.loads((OUT/'delivery/preview_index.json').read_text())['rows']
    for row in rows:
        q=OUT/row['delivered_path'];assert hashlib.sha256(q.read_bytes()).hexdigest()==row['delivered_WebP_sha256']
        image=Image.open(q).convert('RGBA');assert list(image.size)==row['dimensions']
        assert hashlib.sha256(image.tobytes()).hexdigest()==row['decoded_RGBA_sha256']
        if args.restore_png_pixels:
            dest=OUT/row['original_path']
            if dest.is_file():assert Image.open(dest).convert('RGBA').tobytes()==image.tobytes()
            else:
                dest.parent.mkdir(parents=True,exist_ok=True);image.convert(row['original_mode']).save(dest,format='PNG')
    print(json.dumps({'verified_lossless_preview_pixels':len(rows),'restored_missing_PNG_pixels':args.restore_png_pixels,
        'original_encoded_PNG_bytes_or_sha256_recreated':False}))

if __name__=='__main__':main()
