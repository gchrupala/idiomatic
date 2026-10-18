/*
 * 3D scene spike: sentences s10–s19 of the Spanish chapter 1, played with
 * VRM characters (three-vrm) in a kitchen built from KayKit furniture.
 *
 * Characters are posed procedurally: walking, sitting, crouching, arm
 * gestures, head turns, blinking, expressions, and lip-sync driven by the
 * loudness of the sentence audio. Each sentence is a list of beats that only
 * set targets, so seeking replays earlier beats instantly.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const ROOT = '../../';
const FIRST = 's10';
const $ = (id) => document.getElementById(id);

// ---------- renderer, camera, room ----------

const stage = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#2b2420');
const camera = new THREE.PerspectiveCamera(40, 16 / 10, 0.05, 50);

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

scene.add(new THREE.HemisphereLight('#fff6e8', '#6b5539', 1.6));
const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
sun.position.set(-2.5, 4.5, 3.5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -2, near: 0.5, far: 14 });
sun.shadow.bias = -0.0005;
scene.add(sun);

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

const WALL_Z = -2.5, DOOR_X = 2.6, DOOR_W = 0.9, DOOR_H = 2.05, ROOM_H = 2.7;
const wall = mat('#f1e3c8');
box(8, 0.02, 7, mat('#c9a77a'), 0, -0.01, 0.5); // floor
// back wall with a door opening and a window
box(DOOR_X - DOOR_W / 2 + 4, ROOM_H, 0.1, wall, (DOOR_X - DOOR_W / 2 - 4) / 2, ROOM_H / 2, WALL_Z - 0.05);
box(4 - DOOR_X - DOOR_W / 2, ROOM_H, 0.1, wall, (4 + DOOR_X + DOOR_W / 2) / 2, ROOM_H / 2, WALL_Z - 0.05);
box(DOOR_W, ROOM_H - DOOR_H, 0.1, wall, DOOR_X, (ROOM_H + DOOR_H) / 2, WALL_Z - 0.05);
box(-0.0 + 3.6, ROOM_H, 0.1, wall, -4, ROOM_H / 2, -0.7).rotation.y = Math.PI / 2; // left wall
box(1.3, 0.95, 0.02, mat('#bfe0f5', { emissive: '#9fd0f0', emissiveIntensity: 0.6 }), -0.6, 1.6, WALL_Z + 0.01); // window glass
for (const [w, h, x, y] of [[1.42, 0.07, -0.6, 2.1], [1.42, 0.07, -0.6, 1.1], [0.07, 1.0, -1.28, 1.6], [0.07, 1.0, 0.08, 1.6], [0.05, 1.0, -0.6, 1.6]]) {
  box(w, h, 0.05, mat('#ffffff'), x, y, WALL_Z + 0.03);
}
// door frame and panel (hinged on its left edge, opens outwards)
const frameMat = mat('#7a5b3a');
box(0.08, DOOR_H + 0.08, 0.14, frameMat, DOOR_X - DOOR_W / 2 - 0.04, DOOR_H / 2, WALL_Z - 0.05);
box(0.08, DOOR_H + 0.08, 0.14, frameMat, DOOR_X + DOOR_W / 2 + 0.04, DOOR_H / 2, WALL_Z - 0.05);
box(DOOR_W + 0.16, 0.08, 0.14, frameMat, DOOR_X, DOOR_H + 0.04, WALL_Z - 0.05);
const door = new THREE.Group();
door.position.set(DOOR_X - DOOR_W / 2, 0, WALL_Z - 0.07);
const panel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.05), mat('#a8743f'));
panel.position.set(DOOR_W / 2, DOOR_H / 2, 0);
panel.castShadow = true;
const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035), mat('#d8b45a', { metalness: 0.6, roughness: 0.3 }));
knob.position.set(DOOR_W - 0.1, 1.0, 0.05);
panel.add(knob);
door.add(panel);
scene.add(door);
// the landing outside: bright, so an open door reads as "nobody there"
box(2.2, 0.02, 2, mat('#d9cfc0'), DOOR_X, -0.005, WALL_Z - 1.1);
box(2.2, ROOM_H, 0.1, mat('#fbf6ee', { emissive: '#fff4e0', emissiveIntensity: 0.5 }), DOOR_X, ROOM_H / 2, WALL_Z - 2.1);
const landingLight = new THREE.PointLight('#fff2dd', 3, 4);
landingLight.position.set(DOOR_X, 2.2, WALL_Z - 1.2);
scene.add(landingLight);

// ---------- props on the table ----------

const props = {};
function prop(name, mesh, x, y, z) {
  mesh.position.set(x, y, z);
  mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  mesh.userData.base = mesh.position.clone();
  scene.add(mesh);
  props[name] = mesh;
  return mesh;
}
const TABLE_Y = 0.75;
function plate(x, z) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.02, 24), mat('#ffffff', { roughness: 0.4 }));
  return prop('plate' + x, p, x, TABLE_Y + 0.01, z);
}
plate(-0.45, -0.45); plate(0.45, -0.45);
{
  const g = new THREE.Group();
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.08, 20, 1, true), mat('#b07a3c', { side: THREE.DoubleSide }));
  basket.position.y = 0.04;
  g.add(basket);
  for (const [x, z, r] of [[-0.05, 0, 0.3], [0.06, 0.03, -0.4]]) {
    const loaf = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 6, 12), mat('#d9a35f'));
    loaf.rotation.set(0, r, Math.PI / 2);
    loaf.position.set(x, 0.09, z);
    g.add(loaf);
  }
  prop('pan', g, 0, TABLE_Y, -0.05);
}
{
  const g = new THREE.Group();
  for (const [x, z, s] of [[0, 0, 1], [0.09, 0.05, 0.85]]) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.045 * s, 20, 14), mat('#d8332a', { roughness: 0.35 }));
    t.scale.y = 0.85;
    t.position.set(x, 0.04 * s, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02), mat('#3f7d2a'));
    stem.position.set(x, 0.08 * s, z);
    g.add(t, stem);
  }
  prop('tomate', g, 0.32, TABLE_Y, 0.08);
}
{
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 16), mat('#3d3d42', { metalness: 0.5, roughness: 0.35 }));
  pot.position.y = 0.1;
  const lid = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.06, 16), mat('#3d3d42', { metalness: 0.5, roughness: 0.35 }));
  lid.position.y = 0.23;
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.033, 0.07, 16), mat('#ffffff', { roughness: 0.4 }));
  cup.position.set(0.14, 0.035, 0.06);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.036, 16), mat('#4a2c17'));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.set(0.14, 0.066, 0.06);
  g.add(pot, lid, cup, coffee);
  prop('café', g, -0.4, TABLE_Y, 0.05);
}
{
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 16), mat('#ffffff', { transparent: true, opacity: 0.35, roughness: 0.1 }));
  glass.position.y = 0.06;
  const juice = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.095, 16), mat('#f59a1b', { roughness: 0.3 }));
  juice.position.y = 0.05;
  g.add(glass, juice);
  prop('zumo', g, -0.25, TABLE_Y, -0.42);
}
{
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.004, 0.15), mat('#fffaf0', { roughness: 0.6 }));
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 16), mat('#b3261e'));
  seal.position.y = 0.004;
  g.add(paper, seal);
  prop('carta', g, DOOR_X + 0.1, 0.004, WALL_Z - 0.55).rotation.y = 0.4;
}

// highlight ring for "look at this"
const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.19, 40), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
ring.rotation.x = -Math.PI / 2;
scene.add(ring);

// ---------- loading ----------

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));
const load = (url) => new Promise((ok, fail) => loader.load(url, ok, undefined, fail));

const FURNITURE = 0.75; // KayKit units to metres (their table is 1 unit high)
async function furniture(name, x, z, rotY = 0, y = 0, s = FURNITURE) {
  const g = (await load(`assets/furniture/${name}.gltf`)).scene;
  g.scale.setScalar(s);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);
  return g;
}

// ---------- characters ----------

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();

class Actor {
  constructor(name, vrm, scale) {
    this.name = name;
    this.vrm = vrm;
    this.root = new THREE.Group();
    this.root.add(vrm.scene);
    this.root.scale.setScalar(scale);
    scene.add(this.root);
    vrm.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    const h = vrm.humanoid;
    this.bone = (n) => h.getNormalizedBoneNode(n);
    const wp = (n) => h.getNormalizedBoneNode(n).getWorldPosition(new THREE.Vector3());
    vrm.scene.updateMatrixWorld(true);
    this.thigh = wp('leftUpperLeg').distanceTo(wp('leftLowerLeg'));
    this.shin = wp('leftLowerLeg').distanceTo(wp('leftFoot'));
    this.hipsY = this.bone('hips').position.y;
    // VRM0 models are turned round to face +Z, so their bone frames are mirrored in x and z
    this.f = vrm.meta.metaVersion === '0' ? -1 : 1;
    this.eyeTarget = new THREE.Object3D();
    scene.add(this.eyeTarget);
    vrm.lookAt.target = this.eyeTarget;
    this.reset();
  }

  reset() {
    this.path = []; this.onArrive = null;
    this.yaw = this.yawTarget = 0;
    this.sit = this.sitTarget = 0;
    this.crouch = this.crouchTarget = 0;
    this.phase = 0; this.stride = 0;
    this.look = null; this.headYaw = 0; this.headPitch = 0;
    this.shakeT = 9; this.nodT = 9;
    this.arms = { right: 'down', left: 'down' };
    this.armQ = {};
    this.expr = { happy: 0, surprised: 0, sad: 0 };
    this.exprNow = { happy: 0, surprised: 0, sad: 0 };
    this.blinkIn = 1 + Math.random() * 3; this.blink = 0;
    this.mouth = 0;
  }

  place(x, z, yaw) { this.root.position.set(x, 0, z); this.yaw = this.yawTarget = yaw; this.path = []; }

  // Walk through points; `then` runs on arrival. Instant mode jumps there.
  walk(points, { speed = 1.1, face, then, instant } = {}) {
    if (instant) {
      const p = points[points.length - 1];
      this.root.position.x = p[0]; this.root.position.z = p[1];
      if (face !== undefined) this.yaw = this.yawTarget = face;
      this.sit = this.sitTarget = 0;
      then && then(true);
      return;
    }
    this.path = points.map(([x, z]) => V(x, 0, z));
    this.speed = speed; this.faceAfter = face; this.onArrive = then || null;
  }

  update(dt, t) {
    const pos = this.root.position;
    let moving = false;
    if (this.path.length) {
      const goal = this.path[0];
      tmpV.subVectors(goal, pos).setY(0);
      const d = tmpV.length();
      const step = this.speed * dt * Math.min(1, 0.3 + this.stride * 2); // ease in
      if (d <= step) {
        pos.x = goal.x; pos.z = goal.z;
        this.path.shift();
        if (!this.path.length) {
          if (this.faceAfter !== undefined) this.yawTarget = this.faceAfter;
          const f = this.onArrive; this.onArrive = null; f && f(false);
        }
      } else {
        tmpV.multiplyScalar(step / d);
        pos.add(tmpV);
        this.yawTarget = Math.atan2(tmpV.x, tmpV.z);
        this.phase += step / (0.33 * this.root.scale.x) * Math.PI / 2;
        moving = true;
      }
    }
    this.stride = damp(this.stride, moving ? 1 : 0, 8, dt);
    let dy = this.yawTarget - this.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw += dy * (1 - Math.exp(-7 * dt));
    this.root.rotation.y = this.yaw;
    this.sit = damp(this.sit, this.sitTarget, 5, dt);
    this.crouch = damp(this.crouch, this.crouchTarget, 6, dt);
    this.pose(dt, t);
    this.face(dt);
    this.vrm.update(dt);
  }

  pose(dt, t) {
    const b = this.bone, s = this.stride, ph = this.phase;
    // legs: sitting and crouching bend hip and knee; the walk swings them
    const swing = (p) => -0.5 * Math.sin(p) * s;
    const knee = (p) => (0.12 + 0.75 * Math.max(0, Math.sin(p - 0.4))) * s;
    let hipL = swing(ph), hipR = swing(ph + Math.PI);
    let kneeL = knee(ph), kneeR = knee(ph + Math.PI);
    hipL += -1.5 * this.sit - 1.25 * this.crouch; hipR += -1.5 * this.sit - 1.25 * this.crouch;
    kneeL += 1.5 * this.sit + 2.1 * this.crouch; kneeR += 1.5 * this.sit + 2.1 * this.crouch;
    const f = this.f;
    b('leftUpperLeg').rotation.set(f * hipL, 0, -0.03 * f);
    b('rightUpperLeg').rotation.set(f * hipR, 0, 0.03 * f);
    b('leftLowerLeg').rotation.set(f * kneeL, 0, 0);
    b('rightLowerLeg').rotation.set(f * kneeR, 0, 0);
    b('leftFoot').rotation.set(-0.6 * f * this.crouch, 0, 0);
    b('rightFoot').rotation.set(-0.6 * f * this.crouch, 0, 0);
    // keep the feet on the floor: the hip drops by what the bent legs lose
    const legDrop = (a1, a2) => this.thigh + this.shin - (this.thigh * Math.cos(a1) + this.shin * Math.cos(a2 + a1));
    const drop = Math.min(legDrop(hipL, kneeL), legDrop(hipR, kneeR));
    b('hips').position.y = this.hipsY - Math.max(0, drop) + 0.012 * Math.sin(2 * ph) * s;
    b('spine').rotation.set(f * (0.55 * this.crouch + 0.04 * s + 0.015 * Math.sin(t * 1.7)), 0, 0);
    b('chest').rotation.set(f * 0.15 * this.crouch, 0.05 * Math.sin(ph) * s, 0);
    // arms aim along directions given in the character's own frame
    for (const side of ['right', 'left']) {
      const m = side === 'right' ? -1 : 1;
      const [up, low] = this.armDirs(side, t);
      if (s > 0.05 && this.arms[side] === 'down') {
        const sw = 0.35 * Math.sin(ph + (side === 'right' ? 0 : Math.PI)) * s;
        up.z += sw; low.z += sw * 1.3;
      }
      this.aim(`${side}UpperArm`, V(m, 0, 0), up.normalize(), null, dt);
      this.aim(`${side}LowerArm`, V(m, 0, 0), low.normalize(), `${side}UpperArm`, dt);
    }
  }

  armDirs(side, t) {
    const m = side === 'right' ? -1 : 1;
    const kind = this.arms[side];
    if (kind === 'offer') return [V(m * 0.35, -0.55, 0.65), V(m * 0.25, -0.1, 1)];
    if (kind === 'hold') return [V(m * 0.12, -0.85, 0.3), V(-m * 0.35, 0.1, 0.95)];
    if (kind === 'show') return [V(m * 0.12, -0.5, 0.85), V(-m * 0.3, 0.3, 1)];
    if (kind === 'reach') return [V(m * 0.1, -0.55, 0.8), V(m * 0.05, -0.9, 0.45)];
    if (kind === 'point' && this.pointAt) {
      // towards the target, in this character's frame
      const sh = this.bone(`${side}UpperArm`).getWorldPosition(tmpV2);
      const d = this.pointAt().clone().sub(sh);
      d.applyAxisAngle(V(0, 1, 0), -this.yaw).normalize();
      return [d.clone().add(V(0, -0.25, 0)), d];
    }
    if (kind === 'wave') return [V(m * 0.9, 0.5, 0.2), V(m * 0.15 * Math.sin(t * 9), 1, 0.2)];
    return [V(m * 0.2, -1, 0.06), V(m * 0.12, -1, 0.18)];
  }

  aim(name, rest, dir, parent, dt) {
    rest.x *= this.f; rest.z *= this.f; dir.x *= this.f; dir.z *= this.f;
    let local = dir;
    if (parent) local = dir.clone().applyQuaternion(tmpQ.copy(this.armQ[parent]).invert());
    const q = new THREE.Quaternion().setFromUnitVectors(rest, local);
    const cur = this.armQ[name] || q.clone();
    cur.slerp(q, 1 - Math.exp(-9 * dt));
    this.armQ[name] = cur;
    this.bone(name).quaternion.copy(cur);
  }

  face(dt) {
    // head turns towards what the character looks at, eyes follow it
    let yaw = 0, pitch = 0;
    if (this.look) {
      const target = typeof this.look === 'function' ? this.look() : this.look;
      const head = this.bone('head').getWorldPosition(tmpV2);
      const d = target.clone().sub(head).applyAxisAngle(V(0, 1, 0), -this.yaw);
      yaw = THREE.MathUtils.clamp(Math.atan2(d.x, d.z), -1.2, 1.2);
      pitch = THREE.MathUtils.clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.5, 0.8);
      this.eyeTarget.position.copy(target);
    } else {
      this.bone('head').getWorldPosition(this.eyeTarget.position);
      this.eyeTarget.position.add(V(Math.sin(this.yaw), 0, Math.cos(this.yaw)));
    }
    this.headYaw = damp(this.headYaw, yaw, 6, dt);
    this.headPitch = damp(this.headPitch, pitch, 6, dt);
    this.shakeT += dt; this.nodT += dt;
    const shake = this.shakeT < 0.9 ? 0.32 * Math.sin(this.shakeT * 16) * (1 - this.shakeT / 0.9) : 0;
    const nod = this.nodT < 0.7 ? 0.25 * Math.sin(this.nodT * 14) * (1 - this.nodT / 0.7) : 0;
    this.bone('neck').rotation.set(this.f * this.headPitch * 0.4, this.headYaw * 0.4, 0);
    this.bone('head').rotation.set(this.f * (this.headPitch * 0.6 + nod), this.headYaw * 0.6 + shake, 0);
    // expressions, blinking and the mouth
    const em = this.vrm.expressionManager;
    for (const k of Object.keys(this.expr)) {
      this.exprNow[k] = damp(this.exprNow[k], this.expr[k], 5, dt);
      em.setValue(k, this.exprNow[k]);
    }
    this.blinkIn -= dt;
    if (this.blinkIn < 0) { this.blink = 0.16; this.blinkIn = 2 + Math.random() * 3.5; }
    this.blink = Math.max(0, this.blink - dt);
    const closed = this.blink > 0 ? Math.sin((this.blink / 0.16) * Math.PI) : 0;
    em.setValue('blink', Math.max(closed, this.exprNow.happy * 0.3) * (1 - this.exprNow.surprised));
    const level = speaker === this ? mouthLevel : 0;
    this.mouth = damp(this.mouth, level, 25, dt);
    const wobble = 0.5 + 0.5 * Math.sin(performance.now() / 70);
    em.setValue('aa', this.mouth * (0.55 + 0.45 * wobble));
    em.setValue('oh', this.mouth * 0.5 * (1 - wobble));
  }

  headPos() { return this.bone('head').getWorldPosition(new THREE.Vector3()).add(V(0, 0.05, 0)); }
}

async function actor(name, file, scale) {
  const vrm = (await load(`assets/avatars/${file}`)).userData.vrm;
  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  VRMUtils.combineSkeletons(vrm.scene);
  VRMUtils.rotateVRM0(vrm);
  return new Actor(name, vrm, scale);
}

// ---------- sound: audio for lip-sync, and a knock ----------

let ctx = null, analyser = null, speaker = null, mouthLevel = 0;
const audio = new Audio();
audio.crossOrigin = 'anonymous';
const buf = new Float32Array(1024);
function initAudio() {
  if (ctx) return;
  ctx = new AudioContext();
  analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaElementSource(audio).connect(analyser);
  analyser.connect(ctx.destination);
}
function measure() {
  if (!analyser || audio.paused) { mouthLevel = 0; return; }
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const v of buf) sum += v * v;
  mouthLevel = THREE.MathUtils.clamp((Math.sqrt(sum / buf.length) - 0.015) * 9, 0, 1);
}
function knock() {
  if (!ctx) return;
  for (let i = 0; i < 3; i++) {
    const t0 = ctx.currentTime + i * 0.22;
    const len = 0.12, noise = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.018));
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 380;
    const g = ctx.createGain();
    g.gain.value = 2.2;
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start(t0);
  }
}

// ---------- camera shots ----------

const shots = {
  wide: [V(0.6, 1.7, 4.3), V(0.4, 0.9, -1.2)],
  table: [V(0.05, 1.35, 1.25), V(0, 0.78, -0.15)],
  carmen: [V(-0.35, 1.5, 1.3), V(-1.5, 1.2, -0.3)],
  lucia: [V(-0.15, 1.18, 0.45), V(-0.48, 1.08, -1.15)],
  door: [V(0.9, 1.55, 0.9), V(2.55, 1.0, -2.2)],
  floor: [V(1.75, 1.45, -0.9), V(DOOR_X + 0.05, 0.1, WALL_Z - 0.5)],
  luciaDoor: [V(2.05, 1.45, 0.35), V(2.5, 1.25, -1.8)],
  two: [V(1.2, 1.4, 1.1), V(2.15, 1.0, -1.75)],
  letter: [V(2.25, 1.35, -0.75), V(2.48, 1.0, -1.85)],
};
const cam = { from: shots.wide.map((v) => v.clone()), to: shots.wide, t: 1, dur: 1 };
function shot(name, { cut = false, dur = 1.4 } = {}, instant) {
  const s = shots[name];
  if (cut || instant) { cam.from = s.map((v) => v.clone()); cam.t = 1; }
  else { cam.from = [camera.position.clone(), cam.lookNow.clone()]; cam.t = 0; }
  cam.to = s; cam.dur = dur; cam.drift = 0;
}
cam.lookNow = shots.wide[1].clone();
function updateCamera(dt) {
  cam.t = Math.min(1, cam.t + dt / cam.dur);
  const e = cam.t < 0.5 ? 2 * cam.t * cam.t : 1 - (-2 * cam.t + 2) ** 2 / 2;
  cam.drift = (cam.drift || 0) + dt;
  const push = Math.min(cam.drift, 8) * 0.012; // slow push-in
  camera.position.lerpVectors(cam.from[0], cam.to[0], e);
  cam.lookNow.lerpVectors(cam.from[1], cam.to[1], e);
  camera.position.lerp(cam.lookNow, push);
  camera.lookAt(cam.lookNow);
}

// ---------- the script ----------

let A = {}; // actors by name
const CHAIR_Z = -1.15;
const SEAT = { lucia: [-0.45, CHAIR_Z + 0.08], pablo: [0.45, CHAIR_Z + 0.08] };
const AT_DOOR = [DOOR_X, WALL_Z + 0.55];

function initialState() {
  for (const a of Object.values(A)) a.reset();
  A.carmen.place(-1.6, -0.15, Math.PI / 2);
  A.lucia.place(...SEAT.lucia, 0); A.lucia.sit = A.lucia.sitTarget = 1;
  A.pablo.place(...SEAT.pablo, 0); A.pablo.sit = A.pablo.sitTarget = 1;
  A.carmen.look = () => A.lucia.headPos();
  A.lucia.look = () => props['pan'].position.clone();
  A.pablo.look = () => props['pan'].position.clone();
  A.pablo.expr.happy = 0.4;
  door.rotation.y = 0;
  props.zumo.visible = false;
  props.carta.visible = true;
  scene.attach(props.carta);
  props.carta.position.copy(props.carta.userData.base);
  props.carta.rotation.set(0, 0.4, 0);
  $('letter').classList.remove('on');
  ring.material.opacity = 0;
  shot('wide', {}, true);
}

const pending = []; // timed one-offs: bounce a prop, door shake, highlight
function bounce(name, instant) {
  if (instant) return;
  const p = props[name];
  ring.position.set(p.position.x, TABLE_Y + 0.005, p.position.z);
  pending.push({ t: 0, dur: 0.9, fn: (k) => {
    p.position.y = p.userData.base.y + 0.06 * Math.sin(Math.min(k * 2, 1) * Math.PI);
    ring.material.opacity = Math.sin(k * Math.PI) * 0.9;
  } });
}
function doorShake(instant) {
  if (instant) return;
  pending.push({ t: 0, dur: 0.7, fn: (k) => { door.rotation.y = 0.02 * Math.sin(k * 40) * (1 - k); } });
}
function openDoor(instant) {
  if (instant) { door.rotation.y = 1.7; return; }
  pending.push({ t: 0, dur: 1.1, fn: (k) => { door.rotation.y = 1.7 * (1 - (1 - k) ** 3); } });
}
function pickLetter(instant) {
  const hand = A.lucia.vrm.humanoid.getRawBoneNode('rightHand');
  hand.attach(props.carta);
  props.carta.position.set(-0.07, -0.02, 0.06);
  props.carta.rotation.set(0.2, 0, 1.4);
}

// Each beat: [seconds into the sentence, function(instant)]. Speakers come from the chapter JSON.
const SCRIPT = {
  s10: [
    [0, (i) => shot('table', {}, i)],
    [0.85, (i) => { bounce('pan', i); A.lucia.look = A.pablo.look = () => props.pan.position.clone(); }],
    [1.35, (i) => { bounce('tomate', i); A.pablo.look = () => props.tomate.position.clone(); }],
    [1.85, (i) => { bounce('café', i); A.lucia.look = () => props['café'].position.clone(); }],
  ],
  s11: [
    [0, (i) => { shot('carmen', { cut: true }, i); A.lucia.look = A.pablo.look = () => A.carmen.headPos(); A.carmen.expr.happy = 0.5; }],
    [0.6, () => { A.carmen.arms.right = 'offer'; }],
    [2.2, () => { A.carmen.arms.right = 'down'; }],
  ],
  s12: [
    [0, (i) => { shot('lucia', { cut: true }, i); A.lucia.shakeT = i ? 9 : 0; A.lucia.expr.happy = 0.3; }],
    [0.9, () => { A.lucia.expr.happy = 0.5; }],
    [1.9, (i) => { props.zumo.visible = true; A.carmen.nodT = i ? 9 : 0; bounce('zumo', i); A.lucia.look = () => props.zumo.position.clone(); }],
  ],
  s13: [
    [0, (i) => shot('wide', {}, i)],
    [1.2, (i) => {
      if (!i) knock();
      doorShake(i);
      for (const a of Object.values(A)) { a.look = () => V(DOOR_X, 1.3, WALL_Z); a.expr.happy = 0; a.expr.surprised = 0.8; }
    }],
  ],
  s14: [
    [0, (i) => { shot('door', {}, i); A.lucia.sitTarget = 0; for (const a of Object.values(A)) a.expr.surprised = 0.2; }],
    [0.5, (i) => {
      A.lucia.look = null;
      A.carmen.look = A.pablo.look = () => A.lucia.headPos();
      A.lucia.walk([[-0.45, -1.7], [2.1, -1.75], AT_DOOR], { face: Math.PI, instant: i, then: (inst) => {
        A.lucia.arms.right = 'reach';
        A.lucia.look = () => V(DOOR_X, 1.2, WALL_Z - 1);
        setTimeoutOrNow(inst, 300, () => { openDoor(inst); A.lucia.arms.right = 'down'; });
        setTimeoutOrNow(inst, 1300, () => { A.lucia.look = () => V(DOOR_X - 1.2, 1.3, WALL_Z - 1.2); });
        setTimeoutOrNow(inst, 2100, () => { A.lucia.look = () => V(DOOR_X + 1.2, 1.3, WALL_Z - 1.2); });
      } });
    }],
  ],
  s15: [
    [0, (i) => { shot('floor', { cut: true }, i); A.lucia.look = () => props.carta.position.clone(); }],
    [0.9, (i) => { if (!i) { ring.position.set(props.carta.position.x, 0.01, props.carta.position.z); pending.push({ t: 0, dur: 1.2, fn: (k) => { ring.material.opacity = Math.sin(k * Math.PI) * 0.9; } }); } }],
  ],
  s16: [
    [0, (i) => { shot('luciaDoor', { cut: true }, i); A.lucia.crouchTarget = 1; A.lucia.arms.right = 'reach'; if (i) A.lucia.crouch = 1; }],
    [0.85, (i) => { pickLetter(i); }],
    [1.25, (i) => {
      A.lucia.crouchTarget = 0; A.lucia.arms.right = 'hold'; A.lucia.yawTarget = 0.15;
      A.lucia.look = () => props.carta.getWorldPosition(new THREE.Vector3()); A.lucia.expr.surprised = 0.6;
      if (i) { A.lucia.crouch = 0; A.lucia.yaw = 0.15; }
      A.pablo.sitTarget = 0;
    }],
    [1.4, (i) => { A.pablo.walk([[0.45, -1.65], [1.75, -1.6]], { speed: 1.5, face: 1.2, instant: i }); }],
  ],
  s17: [
    [0, (i) => {
      shot('two', { cut: true }, i);
      A.pablo.pointAt = () => A.lucia.headPos().add(V(0, -0.35, 0));
      A.pablo.arms.right = 'point'; A.pablo.expr.surprised = 0; A.pablo.expr.happy = 0.8;
      A.pablo.look = () => A.lucia.headPos(); A.lucia.look = () => A.pablo.headPos(); A.lucia.yawTarget = -0.9;
      if (i) A.lucia.yaw = -0.9;
    }],
    [1.4, () => { A.pablo.arms.right = 'down'; A.pablo.look = () => props.carta.getWorldPosition(new THREE.Vector3()); }],
  ],
  s18: [
    [0, (i) => { shot('letter', {}, i); A.lucia.arms.right = 'show'; A.lucia.look = () => props.carta.getWorldPosition(new THREE.Vector3()); A.lucia.expr.surprised = 0.3; }],
    [0.9, () => { $('letter').classList.add('on'); }],
    [4.6, () => { $('letter').classList.remove('on'); }],
  ],
  s19: [
    [0, (i) => { shot('lucia2', { cut: true }, i); A.lucia.arms.right = 'hold'; A.lucia.look = () => camera.position.clone(); A.lucia.expr.surprised = 0.9; A.lucia.expr.happy = 0; }],
    [0.9, () => { A.lucia.expr.surprised = 0.2; A.lucia.expr.happy = 0.5; }],
  ],
};
// a close-up that follows wherever Lucía ends up
Object.defineProperty(shots, 'lucia2', { get() {
  const h = A.lucia.headPos();
  return [V(h.x - 0.35, h.y + 0.02, h.z + 1.05), h.clone().add(V(0, -0.08, 0))];
} });

const timers = [];
function setTimeoutOrNow(instant, ms, fn) {
  if (instant) fn(); else timers.push({ at: clock + ms / 1000, fn });
}

// ---------- playback ----------

let chapter, sentences, index = 0, clock = 0, sentStart = 0, beatIdx = 0, playing = false, ending = 0;

function speakerOf(s) { return A[s.who] || null; }

function seek(i) {
  initialState();
  timers.length = 0; pending.length = 0;
  for (let k = 0; k < i; k++) for (const [, fn] of SCRIPT[sentences[k].id] || []) fn(true);
  for (const a of Object.values(A)) {
    a.path = []; a.onArrive = null;
    a.sit = a.sitTarget; a.crouch = a.crouchTarget; a.yaw = a.yawTarget;
    for (const k of Object.keys(a.expr)) a.exprNow[k] = a.expr[k];
  }
  start(i);
}

function start(i) {
  index = i; sentStart = clock; beatIdx = 0; ending = 0;
  const s = sentences[i];
  speaker = speakerOf(s);
  const name = s.who === 'narrator' ? '' : chapter.cast[s.who].name;
  $('subtitle').innerHTML = `<span class="who">${name || '&nbsp;'}</span>${s.text}`;
  audio.src = ROOT + chapter.audio[s.text].file;
  audio.playbackRate = 1;
  if (playing) audio.play();
}

function tick(dt) {
  clock += dt;
  if (!sentences) return;
  if (playing) {
    const beats = SCRIPT[sentences[index].id] || [];
    const now = clock - sentStart;
    while (beatIdx < beats.length && beats[beatIdx][0] <= now) beats[beatIdx++][1](false);
    for (let k = timers.length - 1; k >= 0; k--) if (timers[k].at <= clock) { const f = timers[k].fn; timers.splice(k, 1); f(); }
    const busy = Object.values(A).some((a) => a.path.length) || timers.length || beatIdx < beats.length;
    if (audio.ended || (audio.paused && now > 0.5 && !audio.src)) {
      if (!busy) ending += dt;
      if (ending > 0.7) {
        if (index + 1 < sentences.length) start(index + 1);
        else { playing = false; $('play').textContent = '▶'; }
      }
    }
  }
  for (let k = pending.length - 1; k >= 0; k--) {
    const p = pending[k];
    p.t += dt;
    p.fn(Math.min(1, p.t / p.dur));
    if (p.t >= p.dur) pending.splice(k, 1);
  }
}

// ---------- boot ----------

const clockT = new THREE.Clock();
const MAX_DT = +(new URLSearchParams(location.search).get('maxdt') || 0.05); // tests on slow software GL raise it
function frame() {
  const dt = Math.min(clockT.getDelta(), MAX_DT);
  if (playing || !sentences) tick(dt); else clock += dt;
  measure();
  for (const a of Object.values(A)) a.update(dt, clock);
  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

async function boot() {
  resize();
  const [ch, au] = await Promise.all([
    fetch(ROOT + 'content/es/ch01.json').then((r) => r.json()),
    fetch(ROOT + 'content/es/ch01.audio.json').then((r) => r.json()),
  ]);
  chapter = ch; chapter.audio = au;
  const from = ch.sentences.findIndex((s) => s.id === FIRST);
  const all = await Promise.all([
    furniture('table_medium_long', 0, 0, 0, 0, 0.75),
    furniture('chair_A_wood', -0.45, CHAIR_Z, 0),
    furniture('chair_A_wood', 0.45, CHAIR_Z, 0),
    furniture('chair_A_wood', 1.25, 0.1, -Math.PI / 2),
    furniture('cabinet_medium_decorated', -3.3, -1.4, Math.PI / 2),
    furniture('shelf_B_small_decorated', 1.2, WALL_Z, 0, 1.3),
    furniture('pictureframe_large_A', -2.2, WALL_Z, 0, 1.6),
    furniture('lamp_standing', 3.6, -2.0, 0, 0, 0.7),
    furniture('rug_rectangle_stripes_A', 0, 0, 0, 0, 1.05),
    furniture('cactus_medium_A', -3.4, 0.6, 0, 0, 0.5),
    actor('lucia', 'lucia.vrm', 1.0),
    actor('pablo', 'pablo.vrm', 0.8),
    actor('carmen', 'carmen.vrm', 1.04),
  ]);
  const [lucia, pablo, carmen] = all.slice(-3);
  A = { lucia, pablo, carmen };
  sentences = ch.sentences.slice(from);
  seek(0);
  $('loading').hidden = true;
  $('start').hidden = false;
  window.mowaScene = { seek, A, shot, scene, THREE, get playing() { return playing; }, get clock() { return clock; }, get beat() { return beatIdx; }, get index() { return index; }, shots, camera, setPlaying: (p) => { playing = p; } };
}

$('start').onclick = () => {
  initAudio();
  $('overlay').hidden = true;
  playing = true;
  seek(0);
};
$('play').onclick = () => {
  playing = !playing;
  $('play').textContent = playing ? '⏸' : '▶';
  if (playing) { initAudio(); $('overlay').hidden = true; if (audio.ended) seek(index); else audio.play(); } else audio.pause();
};
$('prev').onclick = () => seek(Math.max(0, index - (clock - sentStart < 1.5 ? 1 : 0)));
$('next').onclick = () => seek(Math.min(sentences.length - 1, index + 1));

requestAnimationFrame(frame);
boot().catch((e) => { $('loading').textContent = 'Error: ' + e.message; console.error(e); });
