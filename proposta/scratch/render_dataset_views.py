import bpy
import os
import math

DATA_DIR = r"C:\Users\rodri\Downloads\Sugarloaf Mountain, Rio de Janeiro, Brazil"
OUT_DIR = r"C:\pinokio\workspaces\20260426-t5fr6h\grupoconceito360\scratch"

print("=== STARTING IMPORT AND RENDER ===")

# 1. Limpar cena
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# 2. Importar OBJs
obj0 = os.path.join(DATA_DIR, "model_0.obj")
obj1 = os.path.join(DATA_DIR, "model_1.obj")

try:
    # Blender 3.2+ new fast importer
    bpy.ops.wm.obj_import(filepath=obj0)
    bpy.ops.wm.obj_import(filepath=obj1)
except AttributeError:
    # Older Blender fallback
    bpy.ops.import_scene.obj(filepath=obj0)
    bpy.ops.import_scene.obj(filepath=obj1)

print("OBJ models imported.")

# Coletar meshes e materiais
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not meshes:
    print("[ERROR] No meshes imported!")
    exit()

# Aplicar um material básico claro para visualizar melhor as formas
mat_solid = bpy.data.materials.new(name="SolidMat")
mat_solid.use_nodes = True
mat_solid.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1)

for m in meshes:
    if m.data.materials:
        m.data.materials[0] = mat_solid
    else:
        m.data.materials.append(mat_solid)

import mathutils

# Calcular bounding box global para posicionar as câmeras
min_coords = [float('inf'), float('inf'), float('inf')]
max_coords = [float('-inf'), float('-inf'), float('-inf')]

for m in meshes:
    m.select_set(True)
    # Pegar bounds em world space
    for corner in m.bound_box:
        world_corner = m.matrix_world @ mathutils.Vector(corner)
        for i in range(3):
            if world_corner[i] < min_coords[i]: min_coords[i] = world_corner[i]
            if world_corner[i] > max_coords[i]: max_coords[i] = world_corner[i]

center = [
    (min_coords[0] + max_coords[0]) / 2,
    (min_coords[1] + max_coords[1]) / 2,
    (min_coords[2] + max_coords[2]) / 2
]

size_x = max_coords[0] - min_coords[0]
size_y = max_coords[1] - min_coords[1]
size_z = max_coords[2] - min_coords[2]
max_size = max(size_x, size_y, size_z)

print(f"Global Bounds Center: {center}, Max Size: {max_size}")

# 3. Setup de Render e Luzes
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = 16
bpy.context.scene.render.resolution_x = 1024
bpy.context.scene.render.resolution_y = 768

# Luz do sol
sun_data = bpy.data.lights.new(name="Sun", type='SUN')
sun_data.energy = 3.0
sun_obj = bpy.data.objects.new(name="Sun", object_data=sun_data)
bpy.context.collection.objects.link(sun_obj)
sun_obj.rotation_euler = (math.radians(45), math.radians(45), 0)

# Ambient/World
world = bpy.context.scene.world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs[0].default_value = (0.1, 0.2, 0.3, 1) # dark blue bg
bg.inputs[1].default_value = 1.0

# Setup Camera Helper
cam_data = bpy.data.cameras.new("RenderCam")
cam_data.clip_end = max_size * 10.0 + 1000.0
cam_data.clip_start = 0.1
cam_obj = bpy.data.objects.new("RenderCam", cam_data)
bpy.context.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj


def render_view(name, pos, rot_euler):
    cam_obj.location = pos
    cam_obj.rotation_euler = rot_euler
    out_path = os.path.join(OUT_DIR, f"{name}.png")
    bpy.context.scene.render.filepath = out_path
    print(f"Rendering {name}...")
    bpy.ops.render.render(write_still=True)
    return out_path

dist = max_size * 1.5

# View 1: Perspective
pos_p = (center[0] - dist*0.8, center[1] - dist*0.8, center[2] + dist*0.6)
render_view("view_perspective", pos_p, (math.radians(60), 0, math.radians(-45)))

# View 2: Top
pos_t = (center[0], center[1], center[2] + dist)
render_view("view_top", pos_t, (0, 0, 0))

# View 3: Side
pos_s = (center[0] - dist, center[1], center[2] + dist*0.1)
render_view("view_side", pos_s, (math.radians(90), 0, math.radians(-90)))

# View 4: Wireframe
# To render wireframe in Cycles easily, we change the material to a wireframe node setup
mat_wire = bpy.data.materials.new(name="WireMat")
mat_wire.use_nodes = True
nodes = mat_wire.node_tree.nodes
links = mat_wire.node_tree.links
for n in nodes: nodes.remove(n)

wire_node = nodes.new('ShaderNodeWireframe')
emission_node = nodes.new('ShaderNodeEmission')
emission_node.inputs[0].default_value = (0, 1, 0, 1) # Green wire
out_node = nodes.new('ShaderNodeOutputMaterial')

links.new(wire_node.outputs[0], emission_node.inputs[1]) # Factor to strength
links.new(emission_node.outputs[0], out_node.inputs[0])

for m in meshes:
    m.data.materials[0] = mat_wire

render_view("view_wireframe", pos_p, (math.radians(60), 0, math.radians(-45)))

print("=== DONE ===")
