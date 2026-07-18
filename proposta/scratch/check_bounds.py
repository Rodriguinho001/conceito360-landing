import bpy
import os
import mathutils

DATA_DIR = r"C:\Users\rodri\Downloads\Sugarloaf Mountain, Rio de Janeiro, Brazil"
OUT_DIR = r"c:\pinokio\workspaces\20260426-t5fr6h\grupoconceito360\scratch"

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

try:
    bpy.ops.wm.obj_import(filepath=os.path.join(DATA_DIR, "model_0.obj"))
    bpy.ops.wm.obj_import(filepath=os.path.join(DATA_DIR, "model_1.obj"))
except:
    bpy.ops.import_scene.obj(filepath=os.path.join(DATA_DIR, "model_0.obj"))
    bpy.ops.import_scene.obj(filepath=os.path.join(DATA_DIR, "model_1.obj"))

with open(os.path.join(OUT_DIR, "mesh_info.txt"), "w") as f:
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            # Calc bounds
            min_c = [float('inf'), float('inf'), float('inf')]
            max_c = [float('-inf'), float('-inf'), float('-inf')]
            for corner in obj.bound_box:
                w = obj.matrix_world @ mathutils.Vector(corner)
                for i in range(3):
                    if w[i] < min_c[i]: min_c[i] = w[i]
                    if w[i] > max_c[i]: max_c[i] = w[i]
            
            f.write(f"Mesh: {obj.name} | Verts: {len(obj.data.vertices)} | Z_max: {max_c[2]:.2f} | X_center: {(min_c[0]+max_c[0])/2:.2f}\n")
