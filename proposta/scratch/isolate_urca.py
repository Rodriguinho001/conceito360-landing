import bpy
import bmesh
import os
import mathutils
import math

DATA_DIR = r"C:\Users\rodri\Downloads\Sugarloaf Mountain, Rio de Janeiro, Brazil"
OUT_DIR = r"c:\pinokio\workspaces\20260426-t5fr6h\grupoconceito360"
SCRATCH_DIR = os.path.join(OUT_DIR, "scratch")

print("=== STARTING PIPELINE ===")

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# 1. Import
print("Importing meshes...")
try:
    bpy.ops.wm.obj_import(filepath=os.path.join(DATA_DIR, "model_0.obj"))
    bpy.ops.wm.obj_import(filepath=os.path.join(DATA_DIR, "model_1.obj"))
except:
    bpy.ops.import_scene.obj(filepath=os.path.join(DATA_DIR, "model_0.obj"))
    bpy.ops.import_scene.obj(filepath=os.path.join(DATA_DIR, "model_1.obj"))

bpy.ops.object.select_all(action='SELECT')
for obj in bpy.context.selected_objects:
    if obj.type == 'MESH':
        for i, uv in enumerate(obj.data.uv_layers):
            uv.name = "UVMap"

bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
bpy.ops.object.join()
obj = bpy.context.active_object
obj.name = "Urca_Isolada"

# Remove duplicate vertices from chunking
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.001)
bpy.ops.object.mode_set(mode='OBJECT')

# 2. Isolate Urca
print("Isolating Urca...")
bm = bmesh.new()
bm.from_mesh(obj.data)

# Find Sugarloaf peak (max Z)
max_z = -float('inf')
p1 = None
for v in bm.verts:
    if v.co.z > max_z:
        max_z = v.co.z
        p1 = v.co

# Find max XY distance from Sugarloaf
max_dist = 0
for v in bm.verts:
    d = (v.co.xy - p1.xy).length
    if d > max_dist:
        max_dist = d

# Find Urca peak (max Z that is at least 30% of max_dist away)
max_z2 = -float('inf')
p2 = None
for v in bm.verts:
    d = (v.co.xy - p1.xy).length
    if d > max_dist * 0.3:
        if v.co.z > max_z2:
            max_z2 = v.co.z
            p2 = v.co

print(f"Peak 1 (Sugarloaf): {p1}")
print(f"Peak 2 (Urca): {p2}")

midpoint = (p1 + p2) / 2.0
direction = (p1 - p2).copy()
direction.z = 0
direction.normalize()

# Bisect and clear Sugarloaf side
bmesh.ops.bisect_plane(
    bm,
    geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
    plane_co=midpoint,
    plane_no=direction,
    clear_outer=True # Assuming normal points towards P1 (Sugarloaf)
)

# Find vertex closest to P2 to select the Urca island
closest_v_idx = -1
min_d = float('inf')
for v in bm.verts:
    if not v.is_valid: continue
    d = (v.co - p2).length
    if d < min_d:
        min_d = d
        closest_v_idx = v.index
    v.select = False

# Flush selection
bm.to_mesh(obj.data)
bm.free()

bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bpy.ops.object.mode_set(mode='OBJECT')
obj.data.vertices[closest_v_idx].select = True
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_linked()
bpy.ops.mesh.select_all(action='INVERT')
bpy.ops.mesh.delete(type='VERT')
bpy.ops.object.mode_set(mode='OBJECT')

print("Urca isolated successfully.")

# 3. Texturing and UV
print("Applying Texture...")
tex_path = os.path.join(DATA_DIR, "Pão de Açucar_texture.png")
mat = bpy.data.materials.new(name="MorroMat")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
tex_node.image = bpy.data.images.load(tex_path)
mat.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
obj.data.materials.clear()
obj.data.materials.append(mat)

has_uv = len(obj.data.uv_layers) > 0
if not has_uv:
    print("No UVs found. Projecting from Top...")
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.55)
    bpy.ops.object.mode_set(mode='OBJECT')

# 4. Orientation Fix & Watertight Base
print("Fixing orientation and base...")

# First, fix orientation: Peak is currently pointing at -X. We rotate 90 deg around Y to point it to +Z.
bpy.ops.object.mode_set(mode='OBJECT')
obj.rotation_euler = (0, math.radians(90), 0)
# Also apply a slight rotation around Z if needed to align it nicely, but let's stick to the main fix first.
# Apply rotation
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

# Find the boundary (waterline) average Z to set the origin perfectly at the waterline
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bpy.ops.mesh.select_non_manifold() # Selects boundary edges
bpy.ops.object.mode_set(mode='OBJECT')

waterline_z = 0
count = 0
for v in obj.data.vertices:
    if v.select:
        waterline_z += v.co.z
        count += 1
if count > 0:
    waterline_z /= count

# Move the object so the waterline is exactly at Z=0
obj.location.z -= waterline_z
# Center X and Y based on volume, but keep Z
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_VOLUME')
obj.location.x = 0
obj.location.y = 0
# Move Z back so the waterline remains at Z=0 relative to the object origin?
# Wait, if we set origin to center of volume, the origin moves to the middle of the rock.
# The user wants "Pivot coerente na base". So we should put the origin at Z=0!
# We can do this by moving the 3D cursor to (0,0,0) and setting origin to 3D cursor.
bpy.context.scene.cursor.location = (0, 0, 0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

# Apply transform again to ensure 0,0,0
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Now extrude the skirt deep down so we can raise the mountain high in Three.js
bpy.ops.object.mode_set(mode='EDIT')
# non-manifold is still selected
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={'value':(0,0,-100.0)})
bpy.ops.mesh.merge(type='CENTER')
bpy.ops.object.mode_set(mode='OBJECT')

# 5. Decimate and Export
# Removed Decimation to preserve UV atlas

out_glb = os.path.join(OUT_DIR, "morro_clean_final.glb")
print(f"Exporting GLB to {out_glb}...")
bpy.ops.export_scene.gltf(
    filepath=out_glb,
    export_format='GLB',
    use_selection=True,
    export_normals=True,
    export_texcoords=True,
    export_materials='EXPORT',
    export_image_format='JPEG'
)

# Render isolated result for validation
print("Rendering validation screenshots...")
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = 16
bpy.context.scene.render.resolution_x = 1024
bpy.context.scene.render.resolution_y = 768

sun = bpy.data.lights.new(name="Sun", type='SUN')
sun.energy = 3.0
sun_obj = bpy.data.objects.new(name="Sun", object_data=sun)
bpy.context.collection.objects.link(sun_obj)
sun_obj.rotation_euler = (0.785, 0.785, 0)

world = bpy.context.scene.world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs[0].default_value = (0.5, 0.7, 0.9, 1)

cam_data = bpy.data.cameras.new("RenderCam")
cam_data.clip_end = 50000
cam_obj = bpy.data.objects.new("RenderCam", cam_data)
bpy.context.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

min_c = [float('inf')]*3
max_c = [float('-inf')]*3
for corner in obj.bound_box:
    w = obj.matrix_world @ mathutils.Vector(corner)
    for i in range(3):
        if w[i] < min_c[i]: min_c[i] = w[i]
        if w[i] > max_c[i]: max_c[i] = w[i]
sz = max(max_c[0]-min_c[0], max_c[1]-min_c[1], max_c[2]-min_c[2])

dist = sz * 1.5

cam_obj.location = (0, -dist, (min_c[2]+max_c[2])/2)
cam_obj.rotation_euler = (1.57, 0, 0)
bpy.context.scene.render.filepath = os.path.join(SCRATCH_DIR, "isolated_side.png")
bpy.ops.render.render(write_still=True)

cam_obj.location = (dist*0.7, -dist*0.7, dist*0.5 + min_c[2])
cam_obj.rotation_euler = (1.04, 0, 0.78)
bpy.context.scene.render.filepath = os.path.join(SCRATCH_DIR, "isolated_perspective.png")
bpy.ops.render.render(write_still=True)

print("=== DONE ===")
