# -*- coding: utf-8 -*-
"""Create exposed mechanical assemblies for guitar and kick drive concepts."""
import os
import math
import struct
import bpy
from mathutils import Vector

OUT = os.environ["ACCESSIBLE_OUT"]


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 900
    scene.render.image_settings.file_format = "PNG"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    scene.world.color = (0.01, 0.02, 0.04)
    return scene


def mat(name, color, metal=0.0, rough=0.4, glow=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    if glow:
        p.inputs["Emission Color"].default_value = (*color, 1)
        p.inputs["Emission Strength"].default_value = glow
    return m

DARK = None
STEEL = None
COPPER = None
TEAL = None
ORANGE = None
RUBBER = None
WHITE = None


def mats():
    global DARK, STEEL, COPPER, TEAL, ORANGE, RUBBER, WHITE
    DARK = mat("Housing", (0.04, 0.07, 0.10), .4, .28)
    STEEL = mat("Steel", (0.42, .50, .56), .9, .2)
    COPPER = mat("Coil copper", (.75, .19, .05), .75, .27)
    TEAL = mat("Active teal", (.02, .62, .55), .35, .25, .18)
    ORANGE = mat("Motion orange", (.98, .30, .04), .25, .27, .18)
    RUBBER = mat("Rubber", (.04, .07, .09), 0, .7)
    WHITE = mat("Guide white", (.85, .92, .95), .2, .3)


def finish(o, material, bevel=.0):
    o.data.materials.append(material)
    if bevel:
        mod = o.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel; mod.segments = 3
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o


def box(name, loc, scale, material, bevel=.0, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    o = bpy.context.object; o.name = name; o.scale = scale
    if rot: o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return finish(o, material, bevel)


def cyl(name, loc, r, d, material, rot=None, bevel=.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=r, depth=d, location=loc)
    o = bpy.context.object; o.name = name
    if rot:
        o.rotation_euler = rot
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return finish(o, material, bevel)


def spring(name, start, length, radius, turns, material, axis="Z"):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"; curve.bevel_depth = radius * .16; curve.bevel_resolution = 3
    spl = curve.splines.new("POLY")
    count = turns * 28
    spl.points.add(count - 1)
    for i in range(count):
        t = i / (count - 1)
        a = t * turns * math.pi * 2
        x = math.cos(a) * radius; y = math.sin(a) * radius; z = t * length
        if axis == "X": coord = (start[0] + z, start[1] + x, start[2] + y, 1)
        elif axis == "Y": coord = (start[0] + x, start[1] + z, start[2] + y, 1)
        else: coord = (start[0] + x, start[1] + y, start[2] + z, 1)
        spl.points[i].co = coord
    o = bpy.data.objects.new(name, curve); bpy.context.collection.objects.link(o)
    o.data.materials.append(material); return o


def label(body, loc, size=.32):
    bpy.ops.object.text_add(location=loc, rotation=(math.radians(66), 0, 0))
    o = bpy.context.object; o.data.body = body; o.data.size = size; o.data.align_x = "CENTER"; o.data.extrude=.012
    bpy.ops.object.convert(target="MESH"); finish(bpy.context.object, WHITE)


def floor():
    box("Floor", (0,0,-.25), (15,10,.08), DARK,.04)
    for x in range(-12,13,2): box("Grid",(x,0,-.15),(.01,9,.004),TEAL)
    for y in range(-8,9,2): box("Grid",(0,y,-.15),(14,.01,.004),TEAL)


def camera(target, loc):
    for p,e,s,c in [((8,-10,12),1500,6,(.8,.94,1)),((-8,-4,8),850,5,(.05,.9,.75)),((4,8,9),900,4,(1,.28,.05))]:
        bpy.ops.object.light_add(type="AREA", location=p); l=bpy.context.object; l.data.energy=e; l.data.size=s; l.data.color=c
    bpy.ops.object.camera_add(location=loc); c=bpy.context.object
    c.rotation_euler=(Vector(target)-c.location).to_track_quat("-Z","Y").to_euler(); bpy.context.scene.camera=c


def save(base):
    sc=bpy.context.scene; png=os.path.join(OUT,base+"_render.png"); glb=os.path.join(OUT,base+".glb"); obj=os.path.join(OUT,base+".obj"); blend=os.path.join(OUT,base+".blend")
    sc.render.filepath=png; bpy.ops.render.render(write_still=True); bpy.ops.export_scene.gltf(filepath=glb,export_format="GLB"); bpy.ops.wm.obj_export(filepath=obj,export_materials=True); bpy.ops.wm.save_as_mainfile(filepath=blend)
    data=open(glb,"rb").read(); assert data[:4]==b"glTF"; assert struct.unpack("<II",data[4:12])[1]==len(data)


def guitar_cutaway():
    reset(); mats(); floor()
    box("Fretboard cross section", (0,-2.7,.45),(8.8,1.0,.22),RUBBER,.08)
    for y in [-3.25,-3.02,-2.79,-2.56,-2.33,-2.10]:
        cyl("String", (0,y,.82), .027,17.0,WHITE,(0,math.radians(90),0))
    box("Rail left",(0,.65,3.7),(7.9,.14,.14),STEEL,.05)
    box("Rail right",(0,1.55,3.7),(7.9,.14,.14),STEEL,.05)
    for x in [-5.3,0,5.3]:
        box("Carriage",(x,1.1,3.25),(.70,.65,.25),DARK,.08)
        for yi in [-.36,-.12,.12,.36]:
            y=1.1+yi
            cyl("Solenoid housing",(x,y,2.42),.18,1.28,STEEL,None,.03)
            cyl("Coil",(x,y,2.43),.135,1.05,COPPER,None,.02)
            cyl("Plunger",(x,y,1.62),.075,.62,WHITE,None,.02)
            spring("Return spring",(x,y,1.87),.105,.45,7,TEAL)
            cyl("Soft fret tip",(x,y,1.22),.095,.20,TEAL,None,.03)
            box("Guide sleeve",(x,y,1.95),(.14,.14,.20),DARK,.03)
    box("Clamp jaw A",(-8.2,-1.0,1.7),(.28,2.0,1.45),DARK,.1); box("Clamp jaw B",(8.2,-1.0,1.7),(.28,2.0,1.45),DARK,.1)
    box("TPU liner A",(-7.9,-1.9,.8),(.12,1.0,.18),TEAL,.05); box("TPU liner B",(7.9,-1.9,.8),(.12,1.0,.18),TEAL,.05)
    cyl("Clamp screw A",(-8.2,-3.2,1.7),.25,.5,ORANGE,(math.radians(90),0,0),.03); cyl("Clamp screw B",(8.2,-3.2,1.7),.25,.5,ORANGE,(math.radians(90),0,0),.03)
    box("Driver board enclosure",(0,3.0,2.0),(2.3,.65,.65),DARK,.1)
    label("SOLENOID  →  PLUNGER  →  SPRING  →  SOFT FRET TIP",(0,4.1,.4),.31)
    label("18-POINT GUITAR FRET ASSIST / EXPOSED MECHANISM",(0,5.0,.4),.35)
    camera((0,0,1.8),(14,-18,12)); save("guitar_fret_assist_mechanical_v2")


def drum_cutaway():
    reset(); mats(); floor()
    cyl("Drum shell",(-3,0,3.2),3.3,1.8,DARK,(math.radians(90),0,0),.06); cyl("Drum head",(-3,-.98,3.2),3.03,.08,WHITE,(math.radians(90),0,0),.02)
    cyl("Crank shaft",(.5,-.55,3.15),.16,2.4,STEEL,(0,math.radians(90),0),.03); cyl("Bearing A",(.0,-.55,3.15),.42,.30,DARK,(0,math.radians(90),0),.04); cyl("Bearing B",(1.0,-.55,3.15),.42,.30,DARK,(0,math.radians(90),0),.04)
    cyl("Crank disk",(.35,-.55,3.15),.62,.16,ORANGE,(math.radians(90),0,0),.04)
    box("Crank pin",(.85,-.55,3.52),(.14,.14,.14),TEAL,.04)
    box("Connecting rod",(2.05,-.55,3.55),(1.25,.12,.12),STEEL,.04,rot=(0,0,math.radians(-13)))
    cyl("Rod end bearing",(3.2,-.55,3.55),.26,.22,DARK,(math.radians(90),0,0),.03)
    box("Slider carriage",(4.1,-.55,3.55),(.58,.50,.42),DARK,.08)
    box("Linear guide rail",(5.5,-.55,3.55),(2.0,.16,.16),STEEL,.04)
    cyl("Actuator body",(7.6,-.55,3.55),.42,2.3,STEEL,(0,math.radians(90),0),.07)
    cyl("Actuator coil",(7.6,-.55,3.55),.30,1.65,COPPER,(0,math.radians(90),0),.03)
    cyl("Actuator rod",(5.9,-.55,3.55),.12,2.0,WHITE,(0,math.radians(90),0),.02)
    spring("Actuator return spring",(5.2,-.55,3.55),1.0,.19,10,TEAL,"X")
    box("Front limit switch",(3.45,.1,4.08),(.18,.25,.14),ORANGE,.03);box("Rear limit switch",(4.75,.1,4.08),(.18,.25,.14),ORANGE,.03)
    box("Beater arm",(-.8,-.55,3.15),(1.2,.10,.10),STEEL,.04,rot=(0,0,math.radians(-18)));cyl("Beater felt",(-2.0,-.72,3.15),.34,.34,TEAL,(0,math.radians(90),0),.05)
    box("Hoop clamp",(-.1,1.0,4.8),(.65,.4,.65),DARK,.08);box("Controller bay",(7.7,2.0,.75),(1.65,.9,.58),DARK,.12);cyl("Emergency stop",(7.7,2.0,1.42),.38,.18,ORANGE,None,.06)
    label("ACTUATOR → SLIDER → ROD → CRANK → SHAFT → BEATER",(2.4,4.9,.4),.33);label("KICK DRIVE / EXPOSED TRANSMISSION & LIMITS",(2.4,5.8,.4),.38)
    camera((1.7,0,3.0),(15,-18,12));save("kick_drive_mechanical_v2")

os.makedirs(OUT,exist_ok=True);guitar_cutaway();drum_cutaway();print("OK mechanical cutaways")
