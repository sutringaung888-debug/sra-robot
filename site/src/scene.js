import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const COLOR = {
  bg: 0x090a0d,
  signal: 0xd6ff4a,
  ok: 0x9be7c4,
  copper: 0xe6a15b,
  violet: 0xc4b5fd,
  red: 0xff6b6b,
  white: 0xe7e5e4,
  yellow: 0xfbbf24,
  blue: 0x38bdf8,
  green: 0x34d399,
};

// Camera keyframes, one per stage: 0 hero, 1 hear, 2 think, 3 talk, 4 learn.
const STAGES = [
  { pos: [1.8, 7.0, 13.8], look: [0.3, 1.2, -0.4] },
  { pos: [-4.4, 3.4, 5.8], look: [-2.4, 0.6, 0] },
  { pos: [2.2, 4.6, 10.8], look: [0.4, 1.9, -0.4] },
  { pos: [6.6, 3.6, 5.8], look: [3.9, 0.5, -0.9] },
  { pos: [0.8, 8.6, 9.8], look: [0.6, 0.6, -0.8] },
];

const easeInOut = (t) => t * t * (3 - 2 * t);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function glowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.22, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function initScene({ canvas, story, steps, onFail }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: (window.devicePixelRatio || 1) < 2,
    powerPreference: "high-performance",
  });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(COLOR.bg, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COLOR.bg, 14, 32);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  camera.position.set(...STAGES[0].pos);
  const lookAt = new THREE.Vector3(...STAGES[0].look);

  scene.add(new THREE.HemisphereLight(0xbfc8ff, 0x0b0b10, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(4, 9, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(COLOR.copper, 0.9);
  rim.position.set(-7, 3, -6);
  scene.add(rim);
  const boardLight = new THREE.PointLight(COLOR.signal, 5, 7, 2);
  boardLight.position.set(0, 1.4, 0.8);
  scene.add(boardLight);

  const glow = glowTexture();
  const disposables = [envMap, glow];
  const track = (thing) => {
    disposables.push(thing);
    return thing;
  };

  const mat = {
    breadboard: track(new THREE.MeshStandardMaterial({ color: 0x1a1c25, roughness: 0.85 })),
    hole: track(new THREE.MeshStandardMaterial({ color: 0x06070a, roughness: 1 })),
    pcb: track(new THREE.MeshStandardMaterial({ color: 0x0e141c, roughness: 0.55, metalness: 0.2 })),
    metal: track(new THREE.MeshStandardMaterial({ color: 0xc9ccd3, roughness: 0.32, metalness: 1 })),
    gold: track(new THREE.MeshStandardMaterial({ color: 0xd8b25a, roughness: 0.35, metalness: 1 })),
    plastic: track(new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.7 })),
    chip: track(new THREE.MeshStandardMaterial({ color: 0x111216, roughness: 0.45 })),
    micBoard: track(new THREE.MeshStandardMaterial({ color: 0x2e2350, roughness: 0.55, metalness: 0.15 })),
    ampBoard: track(new THREE.MeshStandardMaterial({ color: 0x10382f, roughness: 0.55, metalness: 0.15 })),
    terminal: track(new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 })),
    speakerFrame: track(new THREE.MeshStandardMaterial({ color: 0x15171d, roughness: 0.5, metalness: 0.6 })),
    cone: track(new THREE.MeshStandardMaterial({ color: 0x1d1f26, roughness: 0.9, side: THREE.DoubleSide })),
    led: track(new THREE.MeshBasicMaterial({ color: COLOR.signal })),
    bar: track(new THREE.MeshStandardMaterial({ color: COLOR.signal, emissive: COLOR.signal, emissiveIntensity: 0.6, roughness: 0.4 })),
  };

  const rig = new THREE.Group();
  scene.add(rig);

  const edges = (geometry, color, opacity = 0.55) => {
    const line = new THREE.LineSegments(
      track(new THREE.EdgesGeometry(geometry)),
      track(new THREE.LineBasicMaterial({ color, transparent: true, opacity })),
    );
    return line;
  };

  const sprite = (color, scale, opacity = 1) => {
    const s = new THREE.Sprite(
      track(new THREE.SpriteMaterial({
        map: glow,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })),
    );
    s.scale.setScalar(scale);
    return s;
  };

  // Breadboard
  const breadboard = new THREE.Group();
  const bbBody = new THREE.Mesh(track(new RoundedBoxGeometry(7.4, 0.3, 3.9, 3, 0.08)), mat.breadboard);
  bbBody.position.y = 0.15;
  breadboard.add(bbBody);
  const channel = new THREE.Mesh(track(new THREE.BoxGeometry(7.1, 0.02, 0.2)), mat.hole);
  channel.position.y = 0.305;
  breadboard.add(channel);
  const holeRows = [];
  for (let r = 0; r < 5; r++) holeRows.push(-1.25 + r * 0.2, 0.45 + r * 0.2);
  holeRows.push(-1.62, -1.78, 1.62, 1.78);
  const cols = 34;
  const holes = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.06, 0.012, 0.06)), mat.hole, holeRows.length * cols);
  const m4 = new THREE.Matrix4();
  let hi = 0;
  for (const z of holeRows) {
    for (let c = 0; c < cols; c++) {
      m4.makeTranslation(-3.3 + c * 0.2, 0.305, z);
      holes.setMatrixAt(hi++, m4);
    }
  }
  breadboard.add(holes);
  for (const [z, color] of [[-1.47, COLOR.red], [-1.93, COLOR.blue], [1.47, COLOR.red], [1.93, COLOR.blue]]) {
    const strip = new THREE.Mesh(
      track(new THREE.BoxGeometry(7, 0.01, 0.025)),
      track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 })),
    );
    strip.position.set(0, 0.306, z);
    breadboard.add(strip);
  }
  rig.add(breadboard);

  // ESP32-S3 dev board
  const esp = new THREE.Group();
  const pcbGeo = track(new THREE.BoxGeometry(1.25, 0.1, 2.7));
  const pcb = new THREE.Mesh(pcbGeo, mat.pcb);
  pcb.position.y = 0.52;
  esp.add(pcb);
  const pcbEdges = edges(pcbGeo, COLOR.signal, 0.7);
  pcbEdges.position.copy(pcb.position);
  esp.add(pcbEdges);
  const pinGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 6));
  const pins = new THREE.InstancedMesh(pinGeo, mat.gold, 40);
  for (let i = 0; i < 20; i++) {
    const z = -1.2 + i * (2.4 / 19);
    m4.makeTranslation(-0.55, 0.4, z);
    pins.setMatrixAt(i, m4);
    m4.makeTranslation(0.55, 0.4, z);
    pins.setMatrixAt(20 + i, m4);
  }
  esp.add(pins);
  for (const x of [-0.55, 0.55]) {
    const header = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 0.1, 2.6)), mat.plastic);
    header.position.set(x, 0.42, 0);
    esp.add(header);
  }
  const shield = new THREE.Mesh(track(new RoundedBoxGeometry(0.86, 0.1, 1.02, 2, 0.02)), mat.metal);
  shield.position.set(0, 0.62, -0.5);
  esp.add(shield);
  const antennaPts = [];
  for (let i = 0; i <= 8; i++) antennaPts.push(new THREE.Vector3(-0.42 + i * 0.105, 0.575, i % 2 ? -1.12 : -1.26));
  const antenna = new THREE.Line(
    track(new THREE.BufferGeometry().setFromPoints(antennaPts)),
    track(new THREE.LineBasicMaterial({ color: COLOR.copper })),
  );
  esp.add(antenna);
  const mcu = new THREE.Mesh(track(new THREE.BoxGeometry(0.38, 0.06, 0.38)), mat.chip);
  mcu.position.set(0.18, 0.6, 0.4);
  esp.add(mcu);
  const usb = new THREE.Mesh(track(new RoundedBoxGeometry(0.38, 0.13, 0.2, 2, 0.04)), mat.metal);
  usb.position.set(0, 0.6, 1.3);
  esp.add(usb);
  for (const x of [-0.34, 0.34]) {
    const button = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 0.06, 0.1)), mat.plastic);
    button.position.set(x, 0.6, 1.02);
    esp.add(button);
  }
  const led = new THREE.Mesh(track(new THREE.SphereGeometry(0.045, 12, 8)), mat.led);
  led.position.set(0.42, 0.6, 0.75);
  esp.add(led);
  const ledGlow = sprite(COLOR.signal, 0.7, 0.8);
  ledGlow.position.copy(led.position);
  esp.add(ledGlow);
  rig.add(esp);

  // INMP441 microphone module
  const mic = new THREE.Group();
  mic.position.set(-2.4, 0, 0);
  const micGeo = track(new THREE.BoxGeometry(1.0, 0.08, 1.0));
  const micPcb = new THREE.Mesh(micGeo, mat.micBoard);
  micPcb.position.y = 0.52;
  mic.add(micPcb);
  const micEdges = edges(micGeo, COLOR.violet, 0.65);
  micEdges.position.copy(micPcb.position);
  mic.add(micEdges);
  const capsule = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 32)), mat.metal);
  capsule.position.set(0, 0.6, -0.12);
  mic.add(capsule);
  const port = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16)), mat.hole);
  port.position.set(0, 0.66, -0.12);
  mic.add(port);
  const micPins = new THREE.InstancedMesh(pinGeo, mat.gold, 6);
  for (let i = 0; i < 6; i++) {
    m4.makeTranslation(-0.38 + i * 0.152, 0.4, 0.4);
    micPins.setMatrixAt(i, m4);
  }
  mic.add(micPins);
  rig.add(mic);

  // MAX98357 amplifier
  const amp = new THREE.Group();
  amp.position.set(2.4, 0, 0);
  const ampGeo = track(new THREE.BoxGeometry(1.1, 0.08, 1.0));
  const ampPcb = new THREE.Mesh(ampGeo, mat.ampBoard);
  ampPcb.position.y = 0.52;
  amp.add(ampPcb);
  const ampEdges = edges(ampGeo, COLOR.ok, 0.65);
  ampEdges.position.copy(ampPcb.position);
  amp.add(ampEdges);
  const ampChip = new THREE.Mesh(track(new THREE.BoxGeometry(0.3, 0.05, 0.3)), mat.chip);
  ampChip.position.set(0.1, 0.59, 0.12);
  amp.add(ampChip);
  const terminal = new THREE.Mesh(track(new RoundedBoxGeometry(0.56, 0.26, 0.3, 2, 0.03)), mat.terminal);
  terminal.position.set(0, 0.7, -0.33);
  amp.add(terminal);
  for (const x of [-0.14, 0.14]) {
    const screw = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16)), mat.metal);
    screw.position.set(x, 0.845, -0.33);
    amp.add(screw);
  }
  const ampPins = new THREE.InstancedMesh(pinGeo, mat.gold, 7);
  for (let i = 0; i < 7; i++) {
    m4.makeTranslation(-0.45 + i * 0.15, 0.4, 0.4);
    ampPins.setMatrixAt(i, m4);
  }
  amp.add(ampPins);
  rig.add(amp);

  // Speaker, sitting beside the breadboard
  const speaker = new THREE.Group();
  speaker.position.set(4.75, 0, -1.3);
  const speakerBody = new THREE.Mesh(track(new THREE.CylinderGeometry(0.85, 0.9, 0.22, 48)), mat.speakerFrame);
  speakerBody.position.y = 0.11;
  speaker.add(speakerBody);
  const coneProfile = [
    new THREE.Vector2(0.2, 0.15),
    new THREE.Vector2(0.4, 0.2),
    new THREE.Vector2(0.62, 0.25),
    new THREE.Vector2(0.72, 0.27),
  ];
  const cone = new THREE.Mesh(track(new THREE.LatheGeometry(coneProfile, 48)), mat.cone);
  speaker.add(cone);
  const cap = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)),
    mat.speakerFrame,
  );
  cap.position.y = 0.14;
  cap.scale.y = 0.5;
  speaker.add(cap);
  const speakerRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.78, 0.025, 8, 64)),
    track(new THREE.MeshBasicMaterial({ color: COLOR.copper })),
  );
  speakerRing.rotation.x = -Math.PI / 2;
  speakerRing.position.y = 0.23;
  speaker.add(speakerRing);
  rig.add(speaker);

  // Jumper wires
  const wires = new THREE.Group();
  const wireMats = [];
  const wire = (from, to, color, lift = 0.35) => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().lerp(b, 0.5);
    mid.y += lift;
    const curve = new THREE.CatmullRomCurve3([a, a.clone().setY(a.y + lift * 0.6), mid, b.clone().setY(b.y + lift * 0.6), b]);
    const material = track(new THREE.MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: 0.12, transparent: true, opacity: 1 }));
    wireMats.push(material);
    wires.add(new THREE.Mesh(track(new THREE.TubeGeometry(curve, 40, 0.021, 6)), material));
    return curve;
  };
  const micColors = [COLOR.red, COLOR.white, COLOR.white, COLOR.blue, COLOR.yellow, COLOR.green];
  const micCurves = micColors.map((color, i) =>
    wire([-2.78 + i * 0.152, 0.32, 0.4], [-0.55, 0.32, -0.9 + i * 0.36], color, 0.28 + i * 0.035),
  );
  const ampColors = [COLOR.red, COLOR.white, COLOR.green, COLOR.yellow, COLOR.blue];
  const ampCurves = ampColors.map((color, i) =>
    wire([0.55, 0.32, -0.9 + i * 0.42], [1.95 + i * 0.15, 0.32, 0.4], color, 0.28 + i * 0.035),
  );
  wire([2.26, 0.86, -0.33], [4.05, 0.24, -1.1], COLOR.copper, 0.4);
  wire([2.54, 0.86, -0.33], [4.15, 0.24, -0.85], 0x9ca3af, 0.32);
  rig.add(wires);

  const micData = micCurves[5];
  const ampData = ampCurves[2];
  const pulses = [];
  for (let i = 0; i < 4; i++) {
    const p = sprite(COLOR.signal, 0.42, 0);
    rig.add(p);
    pulses.push({ sprite: p, curve: micData, phase: i / 4, kind: "hear" });
    const q = sprite(COLOR.ok, 0.42, 0);
    rig.add(q);
    pulses.push({ sprite: q, curve: ampData, phase: i / 4, kind: "talk" });
  }

  // Hermes brain orb
  const orb = new THREE.Group();
  orb.position.set(0, 3.4, -0.4);
  const shell = new THREE.LineSegments(
    track(new THREE.WireframeGeometry(track(new THREE.IcosahedronGeometry(0.9, 1)))),
    track(new THREE.LineBasicMaterial({ color: COLOR.signal, transparent: true, opacity: 0.55 })),
  );
  orb.add(shell);
  const coreMat = track(new THREE.MeshBasicMaterial({ color: COLOR.signal, transparent: true, opacity: 0.9 }));
  const core = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.3, 2)), coreMat);
  orb.add(core);
  const orbGlow = sprite(COLOR.signal, 3.2, 0.5);
  orb.add(orbGlow);
  const satellites = new THREE.Group();
  const satGeo = track(new THREE.SphereGeometry(0.05, 8, 6));
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(satGeo, coreMat);
    const a = (i / 7) * Math.PI * 2;
    s.position.set(Math.cos(a) * 1.35, Math.sin(a * 2) * 0.25, Math.sin(a) * 1.35);
    satellites.add(s);
  }
  orb.add(satellites);
  rig.add(orb);

  // Wi-Fi stream from the antenna to the brain
  const STREAM = 150;
  const streamGeo = track(new THREE.BufferGeometry());
  const streamPos = new Float32Array(STREAM * 3);
  const streamPhase = new Float32Array(STREAM);
  for (let i = 0; i < STREAM; i++) streamPhase[i] = Math.random();
  streamGeo.setAttribute("position", new THREE.BufferAttribute(streamPos, 3));
  const streamMat = track(new THREE.PointsMaterial({
    color: COLOR.signal,
    map: glow,
    size: 0.13,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const stream = new THREE.Points(streamGeo, streamMat);
  rig.add(stream);
  const antennaTip = new THREE.Vector3(0, 0.62, -1.2);

  // Sound rings
  const ringGeo = track(new THREE.RingGeometry(0.94, 1, 72));
  const makeRings = (color) =>
    Array.from({ length: 3 }, (_, i) => {
      const ring = new THREE.Mesh(
        ringGeo,
        track(new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })),
      );
      rig.add(ring);
      return { ring, phase: i / 3 };
    });
  const micRings = makeRings(COLOR.violet);
  const speakerRings = makeRings(COLOR.copper);
  speakerRings.forEach(({ ring }) => {
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(4.75, 0.3, -1.3);
  });
  const micRingCenter = new THREE.Vector3(-2.4, 0.95, -0.12);

  // Reward score bars
  const bars = [];
  const barValues = [0.45, 0.75, 1, 0.6, 0.88];
  const barGeo = track(new THREE.BoxGeometry(0.2, 1, 0.2));
  barGeo.translate(0, 0.5, 0);
  barValues.forEach((v, i) => {
    const bar = new THREE.Mesh(barGeo, mat.bar);
    bar.position.set(-0.7 + i * 0.35, 0, -2.6);
    bar.scale.y = 0.001;
    bar.visible = false;
    rig.add(bar);
    bars.push({ bar, v });
  });

  const SPARK = 120;
  const sparkPos = new Float32Array(SPARK * 3);
  for (let i = 0; i < SPARK; i++) {
    const r = 2.6 + Math.random() * 2;
    const a = Math.random() * Math.PI * 2;
    sparkPos[i * 3] = Math.cos(a) * r;
    sparkPos[i * 3 + 1] = 0.4 + Math.random() * 2.6;
    sparkPos[i * 3 + 2] = Math.sin(a) * r * 0.7;
  }
  const sparkGeo = track(new THREE.BufferGeometry());
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = track(new THREE.PointsMaterial({
    color: COLOR.ok,
    map: glow,
    size: 0.16,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  rig.add(sparks);

  // Floor and ambient dust
  const grid = new THREE.GridHelper(48, 48, 0x2a2e38, 0x1a1d24);
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  track(grid.geometry);
  track(grid.material);
  scene.add(grid);
  const floorGlow = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1, 1)),
    track(new THREE.MeshBasicMaterial({ map: glow, color: COLOR.signal, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false })),
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.scale.set(13, 8, 1);
  floorGlow.position.y = 0.01;
  scene.add(floorGlow);

  const DUST = 650;
  const dustPos = new Float32Array(DUST * 3);
  const dustColor = new Float32Array(DUST * 3);
  const lime = new THREE.Color(COLOR.signal);
  const pale = new THREE.Color(0xcfd2da);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 26;
    dustPos[i * 3 + 1] = Math.random() * 9 - 0.5;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2;
    const c = Math.random() < 0.18 ? lime : pale;
    dustColor[i * 3] = c.r;
    dustColor[i * 3 + 1] = c.g;
    dustColor[i * 3 + 2] = c.b;
  }
  const dustGeo = track(new THREE.BufferGeometry());
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("color", new THREE.BufferAttribute(dustColor, 3));
  const dust = new THREE.Points(dustGeo, track(new THREE.PointsMaterial({
    size: 0.06,
    map: glow,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })));
  scene.add(dust);

  // Intro: parts drop into place in build order
  const intro = [
    { obj: breadboard, delay: 0 },
    { obj: esp, delay: 0.18 },
    { obj: mic, delay: 0.34 },
    { obj: amp, delay: 0.46 },
    { obj: speaker, delay: 0.58 },
    { obj: orb, delay: 0.9 },
  ];
  intro.forEach((p) => (p.baseY = p.obj.position.y));
  wireMats.forEach((m) => (m.opacity = 0));

  // Scroll mapping: scrollY values at which each stage is centered
  let anchors = [0, 1, 2, 3, 4];
  let storyEnd = Infinity;
  const measure = () => {
    const vh = window.innerHeight;
    const y = window.scrollY;
    anchors = [0, ...steps.map((el) => {
      const r = el.getBoundingClientRect();
      return r.top + y + r.height / 2 - vh / 2;
    })];
    const sr = story.getBoundingClientRect();
    storyEnd = sr.bottom + y - vh * 0.35;
  };
  const stageAt = (y) => {
    if (y <= anchors[0]) return 0;
    for (let i = 1; i < anchors.length; i++) {
      if (y <= anchors[i]) {
        const span = Math.max(1, anchors[i] - anchors[i - 1]);
        return i - 1 + (y - anchors[i - 1]) / span;
      }
    }
    return anchors.length - 1;
  };

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  let width = 0;
  let height = 0;
  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const shift = width >= 1200 ? 0.17 : 0.13;
    camera.setViewOffset(width, height, -width * shift, 0, width, height);
    camera.updateProjectionMatrix();
    measure();
  };
  resize();
  window.addEventListener("resize", resize);
  const ro = new ResizeObserver(measure);
  ro.observe(document.body);

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const sampleStage = (s) => {
    const i = Math.min(STAGES.length - 2, Math.floor(s));
    const t = easeInOut(clamp01(s - i));
    tmpA.fromArray(STAGES[i].pos);
    tmpB.fromArray(STAGES[i + 1].pos);
    camPos.lerpVectors(tmpA, tmpB, t);
    tmpA.fromArray(STAGES[i].look);
    tmpB.fromArray(STAGES[i + 1].look);
    camLook.lerpVectors(tmpA, tmpB, t);
  };

  const clock = new THREE.Clock();
  let start = null;
  let running = false;
  let frame = 0;
  let slowFrames = 0;
  let raf = 0;
  let stage = 0;

  const weight = (k) => Math.max(0, 1 - Math.abs(stage - k));

  const tick = () => {
    raf = 0;
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    if (start === null) start = time;
    const introT = (time - start) / 1.9;

    if (dt > 0.026) slowFrames++;
    if (++frame % 90 === 0) {
      if (slowFrames > 45 && pixelRatio > 1) {
        pixelRatio = 1;
        renderer.setPixelRatio(pixelRatio);
        resize();
      } else if (slowFrames > 45) {
        dustGeo.setDrawRange(0, DUST / 2);
      }
      slowFrames = 0;
    }

    const target = stageAt(window.scrollY);
    stage += (target - stage) * (1 - Math.exp(-dt * 6));
    const hear = weight(1);
    const think = weight(2);
    const talk = weight(3);
    const learn = weight(4);
    const hero = weight(0);

    pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 4));
    pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 4));

    sampleStage(stage);
    camPos.x += pointer.x * 0.6;
    camPos.y -= pointer.y * 0.35;
    const k = 1 - Math.exp(-dt * 3.5);
    camera.position.lerp(camPos, k);
    lookAt.lerp(camLook, k);
    camera.lookAt(lookAt);

    rig.rotation.y += ((pointer.x * 0.22 + hero * Math.sin(time * 0.25) * 0.08) - rig.rotation.y) * k;
    rig.rotation.x += ((pointer.y * 0.05) - rig.rotation.x) * k;

    for (const p of intro) {
      const t = clamp01((introT - p.delay) / 0.9);
      p.obj.position.y = p.baseY + (1 - easeOutCubic(t)) * 3.2;
      p.obj.visible = t > 0;
    }
    const wireIn = clamp01((introT - 0.7) / 0.6);
    for (const m of wireMats) m.opacity = wireIn;
    wires.visible = wireIn > 0;

    const pulse = 0.5 + 0.5 * Math.sin(time * 3.2);
    led.material.color.setHex(learn > 0.5 ? COLOR.ok : COLOR.signal);
    ledGlow.material.color.copy(led.material.color);
    ledGlow.material.opacity = 0.45 + pulse * 0.5;
    boardLight.intensity = 3 + think * 5 + pulse;

    for (const p of pulses) {
      const strength = p.kind === "hear" ? 0.2 + hear * 0.8 : 0.2 + talk * 0.8;
      const u = (time * 0.45 + p.phase) % 1;
      p.curve.getPointAt(u, p.sprite.position);
      p.sprite.material.opacity = strength * Math.sin(u * Math.PI) * wireIn;
    }

    const orbIn = clamp01((introT - 0.9) / 0.9);
    const orbScale = (0.55 + think * 0.55) * orbIn;
    orb.scale.setScalar(Math.max(0.001, orbScale));
    orb.position.y = 3.4 + Math.sin(time * 0.9) * 0.08;
    shell.rotation.y = time * 0.25;
    shell.rotation.x = time * 0.11;
    satellites.rotation.y = -time * 0.5;
    orbGlow.material.opacity = 0.25 + think * 0.6;
    coreMat.opacity = 0.55 + think * 0.45;

    const orbWorld = orb.position;
    for (let i = 0; i < STREAM; i++) {
      const u = (streamPhase[i] + time * (0.28 + think * 0.25)) % 1;
      const a = u * Math.PI * 6 + i;
      const r = 0.12 + 0.18 * Math.sin(u * Math.PI);
      streamPos[i * 3] = antennaTip.x + (orbWorld.x - antennaTip.x) * u + Math.cos(a) * r;
      streamPos[i * 3 + 1] = antennaTip.y + (orbWorld.y - antennaTip.y) * u;
      streamPos[i * 3 + 2] = antennaTip.z + (orbWorld.z - antennaTip.z) * u + Math.sin(a) * r;
    }
    streamGeo.attributes.position.needsUpdate = true;
    streamMat.opacity = (0.12 + think * 0.85) * orbIn;

    for (const { ring, phase } of micRings) {
      const u = (time * 0.55 + phase) % 1;
      ring.position.copy(micRingCenter);
      ring.quaternion.copy(camera.quaternion);
      ring.scale.setScalar(1.6 - 1.35 * u);
      ring.material.opacity = hear * Math.sin(u * Math.PI) * 0.85;
    }
    for (const { ring, phase } of speakerRings) {
      const u = (time * 0.6 + phase) % 1;
      ring.scale.setScalar(0.5 + 2.6 * u);
      ring.material.opacity = talk * (1 - u) * 0.9;
    }
    cone.position.y = talk * Math.max(0, Math.sin(time * 18)) * 0.025;

    for (const { bar, v } of bars) {
      const h = Math.max(0.001, learn * v * 1.8);
      bar.scale.y += (h - bar.scale.y) * k;
      bar.visible = bar.scale.y > 0.02;
    }
    sparks.rotation.y = time * 0.15;
    sparkMat.opacity = learn * (0.55 + 0.35 * Math.sin(time * 2.4));

    const pos = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST; i++) {
      pos[i * 3 + 1] += dt * 0.12;
      if (pos[i * 3 + 1] > 8.5) pos[i * 3 + 1] = -0.5;
    }
    dustGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    schedule();
  };

  const schedule = () => {
    if (!raf && running) raf = requestAnimationFrame(tick);
  };

  const shouldRun = () =>
    !document.hidden && canvas.clientWidth > 0 && window.scrollY < storyEnd;

  const update = () => {
    const next = shouldRun();
    document.documentElement.classList.toggle("scene-idle", window.scrollY >= storyEnd);
    if (next && !running) {
      running = true;
      clock.getDelta();
      schedule();
    } else if (!next && running) {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  window.addEventListener("scroll", update, { passive: true });
  document.addEventListener("visibilitychange", update);
  window.addEventListener("resize", update);

  const onLost = (event) => {
    event.preventDefault();
    running = false;
    if (onFail) onFail();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  measure();
  stage = stageAt(window.scrollY);
  update();
  requestAnimationFrame(() => document.documentElement.classList.add("scene-ready"));

  return {
    dispose() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
      document.removeEventListener("visibilitychange", update);
      canvas.removeEventListener("webglcontextlost", onLost);
      ro.disconnect();
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
    },
  };
}
