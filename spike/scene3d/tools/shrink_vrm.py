"""Shrink a VRM (glTF binary) by downscaling its textures.

Usage: python shrink_vrm.py IN.vrm OUT.vrm [MAX_SIZE]
Images wider or taller than MAX_SIZE (default 512) are resized; opaque ones
become JPEG. Everything else in the file is kept byte for byte.
"""
import io, json, struct, sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 512
data = open(src, 'rb').read()
jlen = struct.unpack('<I', data[12:16])[0]
gltf = json.loads(data[20:20 + jlen])
bin_start = 20 + jlen + 8
blob = data[bin_start:bin_start + struct.unpack('<I', data[20 + jlen:24 + jlen])[0]]

views = gltf['bufferViews']
new_bytes = {}
for img in gltf['images']:
    v = img['bufferView']
    raw = blob[views[v].get('byteOffset', 0):][:views[v]['byteLength']]
    im = Image.open(io.BytesIO(raw))
    if max(im.size) > limit:
        im.thumbnail((limit, limit), Image.LANCZOS)
    out = io.BytesIO()
    alpha = im.mode in ('RGBA', 'LA', 'P') and im.convert('RGBA').getextrema()[3][0] < 255
    if alpha:
        im.convert('RGBA').save(out, 'PNG', optimize=True)
        img['mimeType'] = 'image/png'
    else:
        im.convert('RGB').save(out, 'JPEG', quality=85)
        img['mimeType'] = 'image/jpeg'
    new_bytes[v] = out.getvalue()

# Rebuild the binary chunk with every view 4-byte aligned.
parts, offset = [], 0
for i, view in enumerate(views):
    chunk = new_bytes.get(i, blob[view.get('byteOffset', 0):][:view['byteLength']])
    pad = (-offset) % 4
    parts.append(b'\0' * pad); offset += pad
    view['byteOffset'] = offset; view['byteLength'] = len(chunk)
    parts.append(chunk); offset += len(chunk)
body = b''.join(parts) + b'\0' * ((-offset) % 4)
gltf['buffers'][0]['byteLength'] = len(body)

js = json.dumps(gltf, separators=(',', ':')).encode()
js += b' ' * ((-len(js)) % 4)
total = 12 + 8 + len(js) + 8 + len(body)
with open(dst, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, total))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(body), 0x004E4942)); f.write(body)
print(f'{src}: {len(data) / 1e6:.1f} MB -> {total / 1e6:.1f} MB')
