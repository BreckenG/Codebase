import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export { THREE };
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const ease = {
  out3: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2),
};

export const TIERS = {
  bronze: { rgb: [0.72, 0.42, 0.18], rough: 0.32, glow: [1.0, 0.55, 0.22] },
  silver: { rgb: [0.86, 0.87, 0.9], rough: 0.24, glow: [0.85, 0.9, 1.0] },
  gold: { rgb: [1.0, 0.7, 0.24], rough: 0.2, glow: [1.0, 0.72, 0.28] },
  platinum: { rgb: [0.92, 0.94, 0.98], rough: 0.08, glow: [0.75, 0.95, 1.0] },
  ruby: { rgb: [0.85, 0.03, 0.06], glass: true, glow: [1.0, 0.12, 0.15] },
  sapphire: { rgb: [0.06, 0.28, 1.0], glass: true, glow: [0.2, 0.45, 1.0] },
};
export const BRAND = [0.94, 0.4, 0.08];

const BOXES = [
  [6, 2, 0, 5, 0, 5, 0xffffff],
  [0.6, 4, -4, 1.2, 1, 3.5, 0xffffff],
  [0.5, 3.6, 4, 1.4, 0.5, 2.6, 0xfff1dc],
  [5, 0.4, 0, 0.6, -4, 1.4, 0xffe0b0],
  [1.4, 1.4, 2.5, 2.5, 4, 2, 0xffffff],
  [7, 1.2, 0, -0.2, 5, 0.9, 0xfff6ea],
];

function studio(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x020203);
  for (const [w, h, x, y, z, v, tint] of BOXES) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(v), side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.lookAt(0, 0.5, 0);
    s.add(m);
  }
  return new THREE.PMREMGenerator(renderer).fromScene(s, 0.02).texture;
}

export function radial(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export function stage(canvas, { fov = 30, bloom = 0.35 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.environment = studio(renderer);
  scene.environmentIntensity = 1.3;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 160);
  scene.add(camera);
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const glow = new UnrealBloomPass(new THREE.Vector2(1, 1), bloom, 0.5, 1.0);
  Object.assign(glow.blendMaterial, {
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  composer.addPass(glow);
  composer.addPass(new OutputPass());
  const fit = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const watch = new ResizeObserver(fit);
  watch.observe(canvas);
  fit();
  let raf = 0;
  let visible = true;
  const seen = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
  });
  seen.observe(canvas);
  const loop = (tick) => {
    let last = performance.now() / 1000;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now() / 1000;
      const dt = Math.min(0.05, now - last);
      last = now;
      if (!visible) return;
      tick(now, dt);
      composer.render();
    };
    raf = requestAnimationFrame(frame);
  };
  const dispose = () => {
    cancelAnimationFrame(raf);
    watch.disconnect();
    seen.disconnect();
    scene.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) [o.material].flat().forEach((m) => m.dispose());
    });
    composer.dispose();
    renderer.dispose();
  };
  return { renderer, scene, camera, composer, glow, loop, dispose, fit };
}

const darkMat = new THREE.MeshPhysicalMaterial({
  color: 0x141418,
  roughness: 0.42,
  metalness: 0.3,
  clearcoat: 0.6,
  clearcoatRoughness: 0.25,
});
const topMat = new THREE.MeshPhysicalMaterial({
  color: 0x16161a,
  roughness: 0.3,
  metalness: 0.2,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
});
let blobTex;

export function stand(glow, plinth = 0) {
  blobTex ||= radial('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.66, 0.15 + plinth, 96), darkMat);
  body.position.y = -0.085 - plinth / 2;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.6, 0.02, 96), topMat);
  top.position.y = -0.005;
  const rimMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(...glow).multiplyScalar(1.6),
    toneMapped: false,
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.632, 0.007, 8, 160), rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.03;
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), blobMat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = -0.158 - plinth;
  const g = new THREE.Group().add(body, top, rim, blob);
  g.userData.rim = rimMat;
  return g;
}

export async function badge(png, size = 0.6) {
  const B = size / 32;
  const img = new Image();
  await new Promise((ok, bad) => {
    img.onload = ok;
    img.onerror = bad;
    img.src = png;
  });
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const cells = [];
  const s = img.width / 32;
  for (let gy = 0; gy < 32; gy++) {
    for (let gx = 0; gx < 32; gx++) {
      const d = x.getImageData(Math.floor((gx + 0.5) * s), Math.floor((gy + 0.5) * s), 1, 1).data;
      if (d[3] < 128) continue;
      const home = new THREE.Vector3((gx - 15.5) * B, (15.5 - gy) * B, 0);
      cells.push({ home, col: new THREE.Color().setRGB(d[0] / 255, d[1] / 255, d[2] / 255, THREE.SRGBColorSpace) });
    }
  }
  const mat = new THREE.MeshStandardMaterial({ metalness: 0.35, roughness: 0.38 });
  const glow = { value: 0.25 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uEmit = glow;
    sh.fragmentShader =
      'uniform float uEmit;\n' +
      sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor * uEmit;',
      );
  };
  const geo = new RoundedBoxGeometry(B * 0.94, B * 0.94, B * 2.4, 2, B * 0.18);
  const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
  const m = new THREE.Matrix4();
  cells.forEach((cell, i) => {
    mesh.setColorAt(i, cell.col);
    mesh.setMatrixAt(i, m.makeTranslation(cell.home));
  });
  return { g: new THREE.Group().add(mesh), mesh, cells, glow };
}

const models = {};

export function model(name) {
  models[name] ||= new GLTFLoader().loadAsync(`/models/${name}.glb`).then((gltf) => {
    const geos = {};
    for (const n of gltf.scene.children) {
      n.traverse((o) => {
        if (o.isMesh) geos[n.name] = o.geometry;
      });
    }
    return geos;
  });
  return models[name];
}

let furTex;
let baseTex;

function texture(src) {
  let done;
  const t = new THREE.TextureLoader().load(src, () => done());
  t.ready = new Promise((r) => {
    done = r;
  });
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  t.anisotropy = 4;
  return t;
}

export function fur(rgb) {
  furTex ||= texture('/img/gorilla/fur.png');
  baseTex ||= texture('/img/gorilla/base.png');
  const tint = { value: new THREE.Color().setRGB(...rgb, THREE.SRGBColorSpace) };
  const m = new THREE.MeshStandardMaterial({ map: furTex, roughness: 0.82 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBase = { value: baseTex };
    sh.uniforms.uTint = tint;
    sh.fragmentShader =
      'uniform sampler2D uBase;\nuniform vec3 uTint;\n' +
      sh.fragmentShader.replace(
        '#include <map_fragment>',
        'vec3 furC = texture2D(map, vMapUv).rgb;\nvec3 baseC = texture2D(uBase, vMapUv).rgb;\n' +
          'diffuseColor.rgb *= baseC + (furC - baseC) * uTint;',
      );
  };
  m.userData.tint = tint;
  return m;
}

export function metal(tier) {
  const t = TIERS[tier] || TIERS.bronze;
  const color = new THREE.Color().setRGB(...t.rgb);
  if (!t.glass) return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: t.rough });
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.05,
    transmission: 1,
    thickness: 0.7,
    ior: 1.77,
    attenuationColor: color,
    attenuationDistance: 0.8,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    emissive: color,
    emissiveIntensity: 0.3,
  });
}

export function sit(mesh) {
  mesh.geometry.computeBoundingBox();
  mesh.position.y = -mesh.geometry.boundingBox.min.y;
  return mesh;
}

let wardrobe;
const items = new Map();
const scenes = new Map();

function piece(file) {
  if (!scenes.has(file))
    scenes.set(
      file,
      new GLTFLoader().loadAsync(`/cosmetics/${file}`).then((g) => g.scene),
    );
  return scenes.get(file);
}

function item(id) {
  const tag = id.replace('.', '');
  if (!items.has(tag)) {
    const load = fetch(`/cosmetics/${tag}.json`).then((r) => (r.ok ? r.json() : null));
    items.set(
      tag,
      load.catch(() => null),
    );
  }
  return items.get(tag);
}

export async function dress(mesh, pose, ids) {
  if (!ids?.length) return;
  wardrobe ||= Promise.all([
    fetch('/cosmetics/poses.json').then((r) => r.json()),
    fetch('/cosmetics/index.json').then((r) => r.json()),
  ]).then(([d, list]) => ({ poses: d.poses, have: new Set(list) }));
  const { poses, have } = await wardrobe;
  const bones = poses[pose];
  if (!bones) return;
  const known = ids.filter((id) => have.has(id.replace('.', '')));
  const looks = (await Promise.all(known.map(item))).filter(Boolean);
  for (const look of looks) {
    const sides = new Set(look.pieces.map((p) => p.side));
    for (const p of look.pieces) {
      if (p.side === 'right' && sides.has('left')) continue;
      const obj = (await piece(p.glb).catch(() => null))?.clone();
      if (!obj || !bones[p.bone]) continue;
      obj.matrixAutoUpdate = false;
      obj.matrix.fromArray(bones[p.bone]).multiply(new THREE.Matrix4().fromArray(p.offset));
      mesh.add(obj);
    }
  }
}

let studioShot;
const shots = new Map();

async function portraitStage() {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 400;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setSize(320, 400, false);
  const scene = new THREE.Scene();
  scene.environment = studio(renderer);
  scene.environmentIntensity = 1.3;
  const camera = new THREE.PerspectiveCamera(30, 320 / 400, 0.1, 50);
  const key = new THREE.DirectionalLight(0xfff0dc, 1.2);
  key.position.set(2.2, 3.4, 3);
  const rim = new THREE.SpotLight(0xffffff, 60, 0, 0.5, 1, 2);
  rim.position.set(-2.4, 2.4, -2.6);
  scene.add(key, rim, rim.target);
  const geos = await model('gorillas');
  const mesh = new THREE.Mesh(geos.idle);
  mesh.rotation.y = 0.35;
  scene.add(mesh);
  const tan = Math.tan(THREE.MathUtils.degToRad(15));
  fur([1, 1, 1]).dispose();
  await Promise.all([furTex.ready, baseTex.ready]);
  return async (pose, rgb, glow, ids) => {
    mesh.geometry = geos[pose] || geos.idle;
    mesh.material.dispose();
    mesh.material = fur(rgb);
    mesh.clear();
    sit(mesh);
    await dress(mesh, pose, ids);
    rim.color.setRGB(...glow);
    const bb = mesh.geometry.boundingBox;
    const top = bb.max.y - bb.min.y;
    const halfW = Math.max(-bb.min.x, bb.max.x, 0.5) + 0.1;
    const dist = Math.max((top / 2 + 0.14) / tan, halfW / (tan * camera.aspect));
    camera.position.set(0, top / 2 + 0.2, dist);
    camera.lookAt(0, top / 2, 0);
    renderer.render(scene, camera);
    return canvas.toDataURL('image/webp', 0.9);
  };
}

let queue = Promise.resolve();

export function portrait(pose, rgb, glow, ids = []) {
  const key = `${pose}:${rgb.join(',')}:${ids.join('')}`;
  if (shots.has(key)) return shots.get(key);
  studioShot ||= portraitStage();
  queue = queue.then(async () => (await studioShot)(pose, rgb, glow, ids)).catch(() => '');
  shots.set(key, queue);
  return queue;
}
