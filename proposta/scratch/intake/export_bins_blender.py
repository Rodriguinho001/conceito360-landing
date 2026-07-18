import bpy
import struct
import os

GLB_FILE = r"C:\pinokio\workspaces\20260426-t5fr6h\grupoconceito360\morro_clean_final.glb"
OUT_DIR = r"C:\pinokio\workspaces\20260426-t5fr6h\grupoconceito360"

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

bpy.ops.import_scene.gltf(filepath=GLB_FILE)

obj = None
for o in bpy.context.scene.objects:
    if o.type == 'MESH':
        obj = o
        break

if not obj:
    print("No mesh found!")
    import sys
    sys.exit(1)

# Ensure geometry is triangulated
bpy.context.view_layer.objects.active = obj
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.quads_convert_to_tris()
bpy.ops.object.mode_set(mode='OBJECT')

depsgraph = bpy.context.evaluated_depsgraph_get()
obj_eval = obj.evaluated_get(depsgraph)
mesh = obj_eval.to_mesh()

mesh.calc_loop_triangles()
num_triangles = len(mesh.loop_triangles)

pos_file = open(os.path.join(OUT_DIR, "morro_triangles.bin"), "wb")
norm_file = open(os.path.join(OUT_DIR, "morro_normals.bin"), "wb")
uv_file = open(os.path.join(OUT_DIR, "morro_uvs.bin"), "wb")

has_uv = len(mesh.uv_layers) > 0
uv_layer = mesh.uv_layers.active.data if has_uv else None

min_c = [float('inf')]*3
max_c = [float('-inf')]*3

for tri in mesh.loop_triangles:
    for i in range(3):
        loop_idx = tri.loops[i]
        v_idx = tri.vertices[i]
        v = mesh.vertices[v_idx]
        
        # Position
        pos_file.write(struct.pack('<fff', v.co.x, v.co.y, v.co.z))
        
        for k in range(3):
            if v.co[k] < min_c[k]: min_c[k] = v.co[k]
            if v.co[k] > max_c[k]: max_c[k] = v.co[k]

        # Normal
        norm = mesh.loops[loop_idx].normal # using loop normal for flat/smooth shading support
        norm_file.write(struct.pack('<fff', norm.x, norm.y, norm.z))
        
        # UV
        if has_uv:
            uv_coord = uv_layer[loop_idx].uv
            uv_file.write(struct.pack('<ff', uv_coord.x, uv_coord.y))

pos_file.close()
norm_file.close()
uv_file.close()

# Meta
import json
meta = {
    "hasNormal": True,
    "hasUV": has_uv,
    "triangles": num_triangles,
    "min": min_c,
    "max": max_c
}
with open(os.path.join(OUT_DIR, "morro_meta.json"), "w") as f:
    json.dump(meta, f, indent=2)

print("Export SUCCESS!")
