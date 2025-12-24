import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * ✅ 이번 완성본 변경사항
 * 1) 소셜 디스턴싱 AI(밀집 회피)
 *    - 이동 중: 주변 NPC가 가까우면 separation(분리) 힘 적용
 *    - 타겟 선택 시: 후보 지점의 "근처 밀집도"를 점수화해서 덜 붐비는 곳을 선택
 *    - 스턱 감지(뭉쳐 멈춤) 시 강제 재타겟
 *
 * 2) 울타리/플레이 공간 확대
 *    - PLAY_AREA_R 증가
 *    - ground/plaza/path 크기 확대
 *    - fence ring 반경 확대
 *    - 집/숲 배치 반경도 함께 확대
 *
 * 3) CS 퀴즈 5문제 = 5명에게서 1문제씩 + 5문제 중복 없음(셔플 후 5개)
 *
 * ⚠️ HTML에 아래 요소가 있어야 함
 * - <div id="app"></div>
 * - <button id="bgmBtn">...</button>
 * - <div id="msg"></div>
 */

// -----------------------------------------------------
// DOM
// -----------------------------------------------------
const container = document.getElementById("app");
const bgmBtn = document.getElementById("bgmBtn");
const msgEl = document.getElementById("msg");

// -----------------------------------------------------
// NEXT 버튼(다음곡)
// -----------------------------------------------------
const nextBgmBtn = document.createElement("button");
nextBgmBtn.id = "nextBgmBtn";
nextBgmBtn.textContent = "⏭️ NEXT";
nextBgmBtn.style.cssText = `
  position: fixed;
  right: 16px;
  bottom: 74px;
  z-index: 9999;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(0,0,0,0.45);
  color: rgba(255,255,255,0.92);
  font: 600 14px ui-sans-serif, system-ui, -apple-system;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  user-select: none;
`;
document.body.appendChild(nextBgmBtn);

// -----------------------------------------------------
// ✅ HUD (Xmas Missions) : 채팅창 위로 살짝 올려 배치
// -----------------------------------------------------
const hud = document.createElement("div");
hud.id = "hud";
hud.style.cssText = `
  position: fixed;
  left: 14px;
  bottom: 250px;
  z-index: 9999;
  padding: 12px 12px 10px;
  width: min(420px, calc(100vw - 28px));
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.40);
  color: rgba(255,255,255,0.92);
  font: 600 13px ui-sans-serif, system-ui, -apple-system;
  line-height: 1.25;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  user-select: none;
`;
document.body.appendChild(hud);

// -----------------------------------------------------
// Chat (CS 퀴즈 답 입력)
// -----------------------------------------------------
const chatWrap = document.createElement("div");
chatWrap.id = "chatWrap";
chatWrap.style.cssText = `
  position: fixed;
  left: 14px;
  bottom: 14px;
  z-index: 9999;
  width: min(420px, calc(100vw - 28px));
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.40);
  color: rgba(255,255,255,0.92);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  overflow: hidden;
  user-select: none;
  font-family: ui-sans-serif, system-ui, -apple-system;
`;
chatWrap.innerHTML = `
  <div id="chatLog" style="max-height: 140px; overflow:auto; padding: 10px 10px 8px; font-size: 12.5px; line-height:1.35;"></div>
  <div style="display:flex; gap:8px; padding: 8px 10px 10px; border-top: 1px solid rgba(255,255,255,0.10);">
    <input id="chatInput" placeholder="(CS 퀴즈 답) 입력 후 Enter" style="
      flex: 1;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(0,0,0,0.35);
      color: rgba(255,255,255,0.92);
      padding: 10px 10px;
      outline: none;
      font-weight: 700;
      font-size: 13px;
    " />
    <button id="chatSend" style="
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(0,0,0,0.35);
      color: rgba(255,255,255,0.92);
      font-weight: 900;
      cursor: pointer;
    ">SEND</button>
  </div>
`;
document.body.appendChild(chatWrap);

const chatLog = chatWrap.querySelector("#chatLog");
const chatInput = chatWrap.querySelector("#chatInput");
const chatSend = chatWrap.querySelector("#chatSend");

// -----------------------------------------------------
// 올클리어 오버레이
// -----------------------------------------------------
const clearOverlay = document.createElement("div");
clearOverlay.id = "clearOverlay";
clearOverlay.style.cssText = `
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
`;
clearOverlay.innerHTML = `
  <div style="
    width: min(740px, calc(100vw - 32px));
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(0,0,0,0.55);
    color: rgba(255,255,255,0.95);
    padding: 18px 16px 16px;
    box-shadow: 0 12px 60px rgba(0,0,0,0.35);
    font-family: ui-sans-serif, system-ui, -apple-system;
  ">
    <div style="font-size: 28px; font-weight: 900; letter-spacing: -0.02em;">🎉 ALL CLEAR!</div>
    <div style="margin-top: 8px; font-size: 15px; opacity: 0.92;">
      <b>눈사람 모자 퀘스트</b> + <b>CS 퀴즈(5명에게서 1문제씩)</b> 완료!<br/>
      아래 <b>인증코드</b>가 보이게 스크린샷을 찍어서 <b>공지방 이벤트 글에 댓글</b>로 달아줘 🔥
    </div>
    <div id="proofCodeBox" style="
      margin-top: 14px;
      padding: 14px 14px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.18);
      background: rgba(255,255,255,0.07);
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-align: center;
    ">CODE</div>
    <div style="margin-top: 12px; display:flex; gap:10px; flex-wrap: wrap;">
      <button id="closeClearOverlay" style="
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(0,0,0,0.35);
        color: rgba(255,255,255,0.92);
        font-weight: 800;
        cursor: pointer;
      ">닫기</button>
      <div style="font-size: 13px; opacity: 0.9; align-self:center;">
        팁: 해당 화면을 스크린샷 찍어서 공지방 이벤트 글에 댓글로 달아주세요.
      </div>
    </div>
  </div>
`;
document.body.appendChild(clearOverlay);

const proofCodeBox = clearOverlay.querySelector("#proofCodeBox");
clearOverlay.querySelector("#closeClearOverlay").addEventListener("click", () => {
    clearOverlay.style.display = "none";
});

// -----------------------------------------------------
// Utils
// -----------------------------------------------------
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

function setMsg(text, ms = 5000) {
    msgEl.textContent = text;
    clearTimeout(setMsg._t);
    setMsg._t = setTimeout(() => (msgEl.textContent = ""), ms);
}
function chatPush(who, text) {
    const line = document.createElement("div");
    line.style.marginBottom = "6px";
    line.innerHTML = `<span style="opacity:.85; font-weight:900;">${who}:</span> <span style="opacity:.95;">${text}</span>`;
    chatLog.appendChild(line);
    chatLog.scrollTop = chatLog.scrollHeight;
}
function keepInsideCircle(pos, radius, boundR) {
    const d = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    const maxD = boundR - radius;
    if (d > maxD && d > 0.0001) {
        pos.x = (pos.x / d) * maxD;
        pos.z = (pos.z / d) * maxD;
    }
}
function applyCircleCollision(pos, radius, center, otherRadius) {
    const dx = pos.x - center.x;
    const dz = pos.z - center.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minD = radius + otherRadius;
    if (dist < minD && dist > 0.0001) {
        const push = minD - dist;
        pos.x += (dx / dist) * push;
        pos.z += (dz / dist) * push;
    } else if (dist <= 0.0001) {
        pos.x += minD;
    }
}
function distXZ(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
}
function randInt(n) {
    return (Math.random() * n) | 0;
}
function makeProofCode() {
    const s = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `XMAS-${s}`;
}
function normalizeAnswer(s) {
    return String(s ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[.,!?]/g, "");
}
function oneOfNormalized(user, accepts) {
    const u = normalizeAnswer(user);
    for (const a of accepts) {
        if (u === normalizeAnswer(a)) return true;
    }
    return false;
}
function pickUnique(arr, k) {
    const idx = Array.from({ length: arr.length }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, k).map((i) => arr[i]);
}

// -----------------------------------------------------
// ✅ CS 문제은행
// -----------------------------------------------------
// ✅ Java 문제은행 20개 (단답/키워드형)
const CS_BANK = [
    { q: "Java에서 객체를 생성할 때 사용하는 키워드는?", accepts: ["new"] },
    { q: "Java에서 상속을 나타내는 키워드는?", accepts: ["extends"] },
    { q: "Java에서 인터페이스 구현을 나타내는 키워드는?", accepts: ["implements"] },
    { q: "Java에서 현재 객체 자신을 가리키는 키워드는?", accepts: ["this"] },
    { q: "부모 클래스(상위 클래스)를 가리키는 키워드는?", accepts: ["super"] },

    { q: "접근제어자 중 같은 패키지 + 상속 관계에서 접근 가능한 것은? (키워드)", accepts: ["protected"] },
    { q: "접근제어자 중 클래스 내부에서만 접근 가능한 것은? (키워드)", accepts: ["private"] },
    { q: "접근제어자 중 어디서든 접근 가능한 것은? (키워드)", accepts: ["public"] },

    { q: "클래스 멤버(정적 멤버)를 선언할 때 사용하는 키워드는?", accepts: ["static"] },
    { q: "상수를 선언할 때(변경 불가) 사용하는 키워드는?", accepts: ["final"] },

    { q: "예외 처리에서 '예외가 발생할 수 있는 코드'를 감싸는 블록 키워드는?", accepts: ["try"] },
    { q: "예외를 잡아서 처리하는 블록 키워드는?", accepts: ["catch"] },
    { q: "예외 발생 여부와 관계없이 항상 실행되는 블록 키워드는?", accepts: ["finally"] },
    { q: "예외를 직접 발생시키는 키워드는?", accepts: ["throw"] },
    { q: "메서드 시그니처에서 예외를 던질 수 있음을 선언하는 키워드는?", accepts: ["throws"] },

    { q: "문자열이 불변(Immutable)인 대표 클래스는?", accepts: ["string"] },
    { q: "가변 문자열 조작에 자주 쓰는 클래스는? (둘 중 하나)", accepts: ["stringbuilder", "string builder", "stringbuffer", "string buffer"] },

    { q: "컬렉션 순서가 유지되고 중복 허용되는 대표 인터페이스는? (List/Set/Map 중)", accepts: ["list"] },
    { q: "중복을 허용하지 않는 대표 인터페이스는? (List/Set/Map 중)", accepts: ["set"] },
    { q: "key-value(키-값)로 저장하는 대표 인터페이스는? (List/Set/Map 중)", accepts: ["map"] },
];

// -----------------------------------------------------
// Scene / Camera / Renderer
// -----------------------------------------------------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x04060c, 22, 120);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 12, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 12;
controls.maxDistance = 36;
controls.maxPolarAngle = Math.PI * 0.48;
controls.rotateSpeed = 0.7;

// -----------------------------------------------------
// Procedural Textures
// -----------------------------------------------------
function makeSnowTexture(size = 1024) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#eaf3ff";
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < size * 1.2; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 8 + Math.random() * 26;
        const a = 0.03 + Math.random() * 0.06;
        ctx.fillStyle = `rgba(180,205,235,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let i = 0; i < size * 2.0; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.12})`;
        ctx.fillRect(x, y, 1, 1);
    }

    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#ffffff";
    for (let i = 0; i < 36; i++) {
        ctx.lineWidth = 2 + Math.random() * 3;
        ctx.beginPath();
        const yy = Math.random() * size;
        ctx.moveTo(-50, yy);
        ctx.bezierCurveTo(size * 0.25, yy - 20, size * 0.65, yy + 15, size + 50, yy + 5);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    return tex;
}

function makeGlowSpriteTexture(size = 256) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.2, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

const snowTex = makeSnowTexture();
const glowTex = makeGlowSpriteTexture();

// -----------------------------------------------------
// Lights
// -----------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.26));
scene.add(new THREE.HemisphereLight(0x8bb7ff, 0x0b1225, 0.58));

const moon = new THREE.DirectionalLight(0xdbe8ff, 0.92);
moon.position.set(18, 22, 12);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.near = 1;
moon.shadow.camera.far = 110;
moon.shadow.camera.left = -38;
moon.shadow.camera.right = 38;
moon.shadow.camera.top = 38;
moon.shadow.camera.bottom = -38;
scene.add(moon);

const rim = new THREE.DirectionalLight(0x66ccff, 0.35);
rim.position.set(-22, 10, -26);
scene.add(rim);

// -----------------------------------------------------
// Sky (Aurora Shader)
// -----------------------------------------------------
const skyGeo = new THREE.SphereGeometry(190, 72, 72);
const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
        uTime: { value: 0 },
        uTop: { value: new THREE.Color(0x070a1e) },
        uBottom: { value: new THREE.Color(0x020308) },
    },
    vertexShader: `
    varying vec3 vPos;
    void main(){
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    varying vec3 vPos;
    uniform float uTime;
    uniform vec3 uTop;
    uniform vec3 uBottom;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0,0.0));
      float c = hash(i + vec2(0.0,1.0));
      float d = hash(i + vec2(1.0,1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }

    float fbm(vec2 p){
      float v = 0.0;
      float a = 0.55;
      for(int i=0;i<5;i++){
        v += a * noise(p);
        p *= 2.02;
        a *= 0.55;
      }
      return v;
    }

    void main(){
      vec3 nrm = normalize(vPos);
      float h = nrm.y * 0.5 + 0.5;
      vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, h));

      vec2 p = nrm.xz;
      float t = uTime * 0.045;
      float n = fbm(p*3.2 + vec2(t, -t));
      float band = smoothstep(0.18, 0.72, h) * smoothstep(0.98, 0.55, h);

      float waves = sin((p.x*7.0 + p.y*4.0) + uTime*0.35 + n*2.6);
      float aur = smoothstep(0.15, 0.85, waves*0.5 + 0.5) * band;

      vec3 aurA = vec3(0.10, 0.95, 0.70);
      vec3 aurB = vec3(0.35, 0.55, 1.00);
      vec3 aurC = vec3(0.90, 0.35, 0.95);
      vec3 aurCol = mix(aurA, aurB, n);
      aurCol = mix(aurCol, aurC, smoothstep(0.55, 0.95, n) * 0.35);

      col += aurCol * aur * 0.75;

      vec2 sp = p * 52.0;
      float st = step(0.9965, noise(sp + uTime*0.0006));
      col += vec3(1.0) * st * 0.95 * smoothstep(0.18, 0.95, h);

      float v = smoothstep(1.15, 0.55, length(nrm.xz));
      col *= (0.92 + v*0.08);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

// -----------------------------------------------------
// ✅ World scale params (확장)
// -----------------------------------------------------
const PLAY_AREA_R = 12.8;      // ✅ 돌아다닐 수 있는 원형 공간 반경 증가
const TREE_COLLIDER_R = 1.85;  // 트리 충돌
const FENCE_R = 13.6;          // ✅ 울타리 반경 증가 (플레이영역보다 살짝 큼)
const GROUND_R = 38;           // ✅ 바닥 확대
const PLAZA_R = 10.4;          // ✅ 광장 확대

// -----------------------------------------------------
// Ground / Plaza / Paths / Snow Banks / Mountains
// -----------------------------------------------------
const ground = new THREE.Mesh(
    new THREE.CircleGeometry(GROUND_R, 256),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: snowTex, roughness: 0.98 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
ground.receiveShadow = true;
scene.add(ground);

const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(PLAZA_R, 200),
    new THREE.MeshStandardMaterial({ color: 0xd6e7ff, roughness: 0.95 })
);
plaza.rotation.x = -Math.PI / 2;
plaza.position.y = 0.001;
plaza.receiveShadow = true;
scene.add(plaza);

function addPath(w, h, y, color) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    m.receiveShadow = true;
    scene.add(m);
}
addPath(3.4, 34, 0.002, 0xcfe0ff);
addPath(34, 3.4, 0.002, 0xcfe0ff);

(function addSnowBanks() {
    const bankMat = new THREE.MeshStandardMaterial({ color: 0xeaf3ff, roughness: 0.98 });
    const count = 110;
    const r = 30.5;
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const x = Math.cos(a) * r + (Math.random() - 0.5) * 1.5;
        const z = Math.sin(a) * r + (Math.random() - 0.5) * 1.5;

        const sx = 0.55 + Math.random() * 1.45;
        const sz = 0.55 + Math.random() * 1.45;
        const sy = 0.14 + Math.random() * 0.32;

        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 14), bankMat);
        m.scale.set(sx, sy, sz);
        m.position.set(x, sy * 0.55, z);
        m.receiveShadow = true;
        scene.add(m);
    }
})();

const mountains = new THREE.Mesh(
    new THREE.CylinderGeometry(66, 66, 10, 140, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x060a18, roughness: 1, side: THREE.DoubleSide })
);
mountains.position.y = 3.2;
scene.add(mountains);

// -----------------------------------------------------
// Tree
// -----------------------------------------------------
const tree = new THREE.Group();
scene.add(tree);

function addCone(radius, height, y, color) {
    const geo = new THREE.ConeGeometry(radius, height, 56, 1, true);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tree.add(mesh);

    const cap = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 1.01, height * 0.18, 56, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xeef6ff, roughness: 0.98, side: THREE.DoubleSide })
    );
    cap.position.y = y + height * 0.32;
    cap.receiveShadow = true;
    cap.rotation.y = Math.random() * Math.PI;
    tree.add(cap);
}
addCone(2.35, 3.35, 1.55, 0x0d5b2a);
addCone(1.95, 3.05, 2.25, 0x0f6a31);
addCone(1.50, 2.65, 2.95, 0x11783a);

const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 1.35, 26),
    new THREE.MeshStandardMaterial({ color: 0x5a3b1f, roughness: 1 })
);
trunk.position.y = 0.52;
trunk.castShadow = true;
trunk.receiveShadow = true;
tree.add(trunk);

// Star
function makeStarPoints(R = 0.42, r = 0.18, n = 5) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2;
        const rad = i % 2 === 0 ? R : r;
        pts.push(new THREE.Vector2(Math.cos(a) * rad, Math.sin(a) * rad));
    }
    return pts;
}
const starGeo = new THREE.ExtrudeGeometry(new THREE.Shape(makeStarPoints()), {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.025,
    bevelSegments: 2,
});
const starMat = new THREE.MeshStandardMaterial({
    color: 0xffd25a,
    emissive: 0xffc23a,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.4,
});
const star = new THREE.Mesh(starGeo, starMat);
star.position.set(0, 4.35, 0);
star.castShadow = true;
tree.add(star);

const starGlow = new THREE.PointLight(0xffd76a, 1.1, 16, 2);
starGlow.position.set(0, 4.45, 0.25);
tree.add(starGlow);

const starSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffe8a8,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    })
);
starSprite.scale.set(2.0, 2.0, 1);
starSprite.position.set(0, 4.45, 0.2);
tree.add(starSprite);

// Bulbs
const bulbColors = [0xff3355, 0x55ddff, 0x66ff66, 0xffcc33, 0xbb77ff];
const bulbs = [];
const bulbGeo = new THREE.SphereGeometry(0.078, 16, 16);
function approxRadius(y) {
    const top = 4.2;
    const bottom = 1.0;
    const k = clamp((top - y) / (top - bottom), 0, 1);
    return 0.28 + k * 2.25;
}
function randomOnCone(radiusAtY, y) {
    const tt = Math.random() * Math.PI * 2;
    const rr = Math.pow(Math.random(), 0.62) * radiusAtY;
    return { x: Math.cos(tt) * rr, y, z: Math.sin(tt) * rr };
}
for (let i = 0; i < 120; i++) {
    const y = 1.05 + Math.random() * 3.2;
    const pos = randomOnCone(approxRadius(y), y);
    const c = bulbColors[randInt(bulbColors.length)];

    const mat = new THREE.MeshStandardMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: 1.0,
        roughness: 0.25,
        metalness: 0.1,
    });

    const m = new THREE.Mesh(bulbGeo, mat);
    m.position.set(pos.x, pos.y, pos.z);
    const v = new THREE.Vector3(pos.x, 0, pos.z).normalize().multiplyScalar(0.14);
    m.position.x += v.x;
    m.position.z += v.z;
    m.castShadow = true;

    const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map: glowTex,
            color: c,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.55,
        })
    );
    spr.scale.set(0.55, 0.55, 1);
    spr.position.copy(m.position);
    tree.add(spr);

    tree.add(m);
    bulbs.push({ mesh: m, glow: spr, phase: Math.random() * Math.PI * 2 });
}

// Garland
(function addGarland() {
    const points = [];
    const turns = 8.2;
    for (let i = 0; i <= 240; i++) {
        const tt = i / 240;
        const y = 1.05 + tt * 3.25;
        const r = 0.35 + (1 - tt) * 2.25;
        const a = tt * Math.PI * 2 * turns;
        points.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 420, 0.040, 12, false);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xff4d76,
        roughness: 0.55,
        metalness: 0.15,
        emissive: 0x26000b,
        emissiveIntensity: 0.35,
    });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    tree.add(m);

    const geo2 = new THREE.TubeGeometry(curve, 420, 0.014, 10, false);
    const mat2 = new THREE.MeshStandardMaterial({
        color: 0xffd56e,
        roughness: 0.25,
        metalness: 0.65,
        emissive: 0x2a1600,
        emissiveIntensity: 0.25,
    });
    const m2 = new THREE.Mesh(geo2, mat2);
    m2.castShadow = true;
    tree.add(m2);
})();

// -----------------------------------------------------
// Village (houses, lamps, fence, forest)
// -----------------------------------------------------
const houses = [];
function makeHouse() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.78, 1.15),
        new THREE.MeshStandardMaterial({ color: 0x1a2340, roughness: 0.95 })
    );
    body.position.y = 0.39;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.94, 0.72, 4),
        new THREE.MeshStandardMaterial({ color: 0x2e3656, roughness: 0.9 })
    );
    roof.position.y = 1.14;
    roof.rotation.y = Math.PI * 0.25;
    roof.castShadow = true;
    g.add(roof);

    const roofSnow = new THREE.Mesh(
        new THREE.ConeGeometry(0.96, 0.28, 4),
        new THREE.MeshStandardMaterial({ color: 0xe7f1ff, roughness: 0.98 })
    );
    roofSnow.position.y = 1.32;
    roofSnow.rotation.y = roof.rotation.y;
    roofSnow.receiveShadow = true;
    g.add(roofSnow);

    const winMat = new THREE.MeshStandardMaterial({
        color: 0xffcc66,
        emissive: 0xffb84a,
        emissiveIntensity: 1.2,
        roughness: 0.45,
    });

    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.30), winMat);
    w1.position.set(0.0, 0.48, 0.59);
    g.add(w1);

    const w2 = w1.clone();
    w2.position.set(-0.30, 0.48, 0.59);
    g.add(w2);

    return { group: g, winMat };
}

const village = new THREE.Group();
scene.add(village);

const houseCount = 16;
for (let i = 0; i < houseCount; i++) {
    const { group, winMat } = makeHouse();
    const a = (i / houseCount) * Math.PI * 2;
    const r = 16.0 + Math.random() * 4.6;
    group.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    group.rotation.y = -a + (Math.random() - 0.5) * 0.55;
    group.scale.setScalar(0.85 + Math.random() * 1.05);
    village.add(group);
    houses.push({ group, winMat, phase: Math.random() * Math.PI * 2 });
}

const lamps = [];
function addLamp(x, z) {
    const g = new THREE.Group();

    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.065, 1.45, 12),
        new THREE.MeshStandardMaterial({ color: 0x1a1d2b, roughness: 0.9 })
    );
    pole.position.y = 0.72;
    pole.castShadow = true;
    g.add(pole);

    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 18, 18),
        new THREE.MeshStandardMaterial({
            color: 0xffd7a3,
            emissive: 0xffc67a,
            emissiveIntensity: 1.1,
            roughness: 0.45,
        })
    );
    cap.position.y = 1.50;
    cap.castShadow = true;
    g.add(cap);

    const light = new THREE.PointLight(0xffc67a, 0.78, 8.0, 2);
    light.position.y = 1.50;
    g.add(light);

    const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map: glowTex,
            color: 0xffd3a0,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.45,
        })
    );
    glow.scale.set(1.3, 1.3, 1);
    glow.position.y = 1.50;
    g.add(glow);

    g.position.set(x, 0, z);
    scene.add(g);
    return { g, light, glow, phase: Math.random() * Math.PI * 2 };
}
lamps.push(addLamp(7.2, 7.2));
lamps.push(addLamp(-7.2, 7.2));
lamps.push(addLamp(7.2, -7.2));
lamps.push(addLamp(-7.2, -7.2));

// ✅ 울타리 반경 확대
(function addFenceRing() {
    const decor = new THREE.Group();
    scene.add(decor);

    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x2a2f44, roughness: 0.95 });
    const postGeo = new THREE.CylinderGeometry(0.06, 0.065, 0.66, 10);
    const railGeo = new THREE.BoxGeometry(0.78, 0.07, 0.07);

    const count = 44;
    const r = FENCE_R;
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;

        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set(x, 0.33, z);
        post.castShadow = true;
        decor.add(post);

        const a2 = ((i + 1) / count) * Math.PI * 2;
        const x2 = Math.cos(a2) * r;
        const z2 = Math.sin(a2) * r;

        const rail = new THREE.Mesh(railGeo, fenceMat);
        rail.position.set((x + x2) / 2, 0.52, (z + z2) / 2);
        rail.lookAt(x2, 0.52, z2);
        rail.castShadow = true;
        decor.add(rail);
    }
})();

// 숲도 반경 조금 늘림
(function addPineForest() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x0d5b2a, roughness: 0.92 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xeef6ff, roughness: 0.98 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b2f18, roughness: 1 });

    function pine(x, z, s) {
        const g = new THREE.Group();
        const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.55 * s, 1.3 * s, 18), mat);
        c1.position.y = 0.95 * s;
        c1.castShadow = true;
        g.add(c1);

        const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.42 * s, 1.1 * s, 18), mat);
        c2.position.y = 1.35 * s;
        c2.castShadow = true;
        g.add(c2);

        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.58 * s, 0.20 * s, 18), snowMat);
        cap.position.y = 1.45 * s;
        cap.receiveShadow = true;
        g.add(cap);

        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.10 * s, 0.35 * s, 10), trunkMat);
        t.position.y = 0.18 * s;
        t.castShadow = true;
        g.add(t);

        g.position.set(x, 0, z);
        scene.add(g);
    }

    const count = 120;
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 22.0 + Math.random() * 12.0;
        const x = Math.cos(a) * r + (Math.random() - 0.5) * 2.4;
        const z = Math.sin(a) * r + (Math.random() - 0.5) * 2.4;
        const s = 0.9 + Math.random() * 1.7;
        pine(x, z, s);
    }
})();

// -----------------------------------------------------
// Name Sprite
// -----------------------------------------------------
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
function makeNameSprite(text) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 640;
    canvas.height = 160;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    roundRect(ctx, 24, 26, 592, 108, 30);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 5;
    roundRect(ctx, 24, 26, 592, 108, 30);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 60px ui-sans-serif, system-ui, -apple-system";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 6);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(1.85, 0.46, 1);
    return spr;
}

// -----------------------------------------------------
// Chibi Character
// -----------------------------------------------------
function makeChibiCharacter({ bodyColor = 0x8bb7ff, hairColor = 0x2a2a2a, isPlayer = false }) {
    const g = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe2c8, roughness: 0.9 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.85 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.34), bodyMat);
    body.position.y = 0.46;
    body.castShadow = true;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), skinMat);
    head.position.y = 0.86;
    head.castShadow = true;
    g.add(head);

    const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.245, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.58),
        hairMat
    );
    hair.position.y = 0.92;
    hair.castShadow = true;
    g.add(hair);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), darkMat);
    const eyeR = eyeL.clone();
    eyeL.position.set(-0.08, 0.88, 0.18);
    eyeR.position.set(0.08, 0.88, 0.18);
    g.add(eyeL, eyeR);

    const blushMat = new THREE.MeshStandardMaterial({
        color: 0xff9fb2,
        emissive: 0xff5b7f,
        emissiveIntensity: 0.25,
        roughness: 0.7,
    });
    const blushL = new THREE.Mesh(new THREE.CircleGeometry(0.032, 16), blushMat);
    blushL.position.set(-0.13, 0.84, 0.195);
    blushL.rotation.y = Math.PI;
    g.add(blushL);

    const blushR = blushL.clone();
    blushR.position.set(0.13, 0.84, 0.195);
    g.add(blushR);

    const armGeo = new THREE.BoxGeometry(0.10, 0.32, 0.10);
    const legGeo = new THREE.BoxGeometry(0.12, 0.28, 0.12);

    const armL = new THREE.Mesh(armGeo, bodyMat);
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.30, 0.52, 0);
    armR.position.set(0.30, 0.52, 0);
    armL.castShadow = armR.castShadow = true;
    g.add(armL, armR);

    const legL = new THREE.Mesh(legGeo, darkMat);
    const legR = new THREE.Mesh(legGeo, darkMat);
    legL.position.set(-0.12, 0.14, 0);
    legR.position.set(0.12, 0.14, 0);
    legL.castShadow = legR.castShadow = true;
    g.add(legL, legR);

    if (isPlayer) {
        const scarf = new THREE.Mesh(
            new THREE.TorusGeometry(0.16, 0.04, 10, 24),
            new THREE.MeshStandardMaterial({ color: 0xff3355, roughness: 0.8 })
        );
        scarf.position.y = 0.70;
        scarf.rotation.x = Math.PI / 2;
        scarf.castShadow = true;
        g.add(scarf);
    }

    g.userData.parts = { armL, armR, legL, legR };
    return g;
}

// -----------------------------------------------------
// Residents (NPCs)
// -----------------------------------------------------
const RESIDENT_NAMES = [
    "최원빈","김지원","조하정","배주희","현석훈","박성규","김선용",
    "유지현","배주원","김영재","정인호","방효경","정은식","이재환","이현석","서하나","이승용",
    "전민우","조현희","김규범","이준서","장지혁","이준석","윤민기","김세현","김대훈","김동진",
    "김재진","김수민","이한비","강동혁","이준연","조성진","곽현민","함형우","나은총"
];

const npcTalkLines = [
    "메리 크리스마스! 🎄",
    "이브인데 강의는… 잠깐 잊고 미션 수행하자!",
    "오로라 너무 예쁘다…",
    "트리 장식 완전 감성이다!",
    "오늘만큼은 디버그 금지!",
];

const residents = [];

// -----------------------------------------------------
// Player
// -----------------------------------------------------
const player = {
    obj: makeChibiCharacter({ bodyColor: 0x3be3ff, hairColor: 0x2a2a2a, isPlayer: true }),
    radius: 0.42,
    speed: 3.2,
    runMul: 1.48,
};

// -----------------------------------------------------
// ✅ 소셜 디스턴싱 파라미터
// -----------------------------------------------------
const SOCIAL = {
    personalSpace: 1.25,     // NPC끼리 이 거리 안이면 회피
    neighborRange: 2.6,      // 밀집도 계산 반경
    sepStrength: 1.55,       // 이동 중 separation 힘
    densityWeight: 1.1,      // 타겟 점수에서 밀집도 페널티 가중치
};

// -----------------------------------------------------
// NPC 타겟 선택 (밀집 회피 + 분산)
// -----------------------------------------------------
function estimateDensityAt(point, self) {
    // 주변 NPC 수/거리로 밀집도를 대략 계산 (가까울수록 페널티 큼)
    let d = 0;
    for (const o of residents) {
        if (o === self) continue;
        const dist = distXZ(point, o.obj.position);
        if (dist < SOCIAL.neighborRange) {
            const w = 1 - dist / SOCIAL.neighborRange; // 가까울수록 1에 가까움
            d += w * w;
        }
    }
    return d;
}

function pickNpcTarget(n) {
    // 내부 원에서 샘플링하되, "밀집도가 낮은" 후보를 선택
    const MIN_R = 3.0;                 // 트리/중앙 너무 근접 금지
    const MAX_R = Math.max(PLAY_AREA_R - 0.9, MIN_R + 0.5);
    const AVOID_PLAYER = 1.8;
    const AVOID_TREE = 2.2;
    const AVOID_HARD = 1.05;           // 후보 자체가 다른 NPC에게 너무 붙으면 제외

    let best = null;
    let bestScore = -Infinity;

    for (let k = 0; k < 24; k++) {
        const a = Math.random() * Math.PI * 2;
        const r = MIN_R + Math.random() * (MAX_R - MIN_R);
        const x = Math.cos(a) * r + (Math.random() - 0.5) * 1.0;
        const z = Math.sin(a) * r + (Math.random() - 0.5) * 1.0;

        const cand = new THREE.Vector3(x, 0, z);

        if (distXZ(cand, player.obj.position) < AVOID_PLAYER) continue;
        if (distXZ(cand, new THREE.Vector3(0, 0, 0)) < AVOID_TREE) continue;

        let minToOthers = 999;
        for (const o of residents) {
            if (o === n) continue;
            const d0 = distXZ(cand, o.obj.position);
            if (d0 < AVOID_HARD) {
                minToOthers = d0;
                break;
            }
            minToOthers = Math.min(minToOthers, d0);
        }
        if (minToOthers < AVOID_HARD) continue;

        const density = estimateDensityAt(cand, n); // ✅ 밀집도(높을수록 나쁨)
        const edgePenalty = Math.abs(r - (PLAY_AREA_R * 0.65)) * 0.10;

        // ✅ 점수: 다른 NPC와 멀수록 좋고, 밀집도 낮을수록 좋음
        const score = (minToOthers * 0.9) - (density * SOCIAL.densityWeight) - edgePenalty + Math.random() * 0.05;

        if (score > bestScore) {
            bestScore = score;
            best = cand;
        }
    }

    if (!best) {
        const rr = PLAY_AREA_R * 0.82;
        let x = (Math.random() - 0.5) * rr * 2;
        let z = (Math.random() - 0.5) * rr * 2;
        const v = new THREE.Vector2(x, z);
        if (v.length() < 2.8) v.setLength(2.8);
        best = new THREE.Vector3(v.x, 0, v.y);
    }

    n.target.copy(best);
    n.wait = 0.12 + Math.random() * 0.55; // 쉬는 시간 ↓ : 더 자주 돌아다님
}

function createResident(name, idx) {
    const shirtColors = [0x8bb7ff, 0xff99bb, 0xa6ffb8, 0xffd27a, 0xc9a6ff, 0x9ff3ff, 0xff8b6b];
    const hairColors = [0x2a2a2a, 0x3a2d1f, 0x1d1d1d, 0x5a3b1f, 0x2a1f3a];

    const chibi = makeChibiCharacter({
        bodyColor: shirtColors[idx % shirtColors.length],
        hairColor: hairColors[idx % hairColors.length],
        isPlayer: false,
    });

    const tag = makeNameSprite(name);
    tag.position.set(0, 1.38, 0);
    chibi.add(tag);

    // ✅ 더 넓게 퍼져서 시작
    const a = (idx / RESIDENT_NAMES.length) * Math.PI * 2;
    const r = 5.6 + Math.random() * 4.8;
    chibi.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    chibi.rotation.y = -a;

    const state = {
        name,
        obj: chibi,
        tag,
        speed: 0.62 + Math.random() * 0.40,
        target: new THREE.Vector3(),
        wait: Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        radius: 0.38,
        lastSpokeAt: -999,
        lastClickedAt: -999,
        walkPhase: Math.random() * Math.PI * 2,

        // ✅ 뭉침/스턱 감지
        lastPos: new THREE.Vector3(),
        stuckTime: 0,
        repickCooldown: 0,
    };

    state.lastPos.copy(chibi.position);
    chibi.userData.resident = state;

    pickNpcTarget(state);
    scene.add(chibi);
    residents.push(state);
}

for (let i = 0; i < RESIDENT_NAMES.length; i++) createResident(RESIDENT_NAMES[i], i);

// -----------------------------------------------------
// Player init
// -----------------------------------------------------
(function initPlayer() {
    const tag = makeNameSprite("ME");
    tag.position.set(0, 1.40, 0);
    player.obj.add(tag);

    player.obj.position.set(0, 0, 8.2);
    scene.add(player.obj);

    setMsg("🎯 미션: 모자 퀘스트 + CS 퀴즈(5명에게서 1문제씩)! (채팅창 사용)", 6200);
    chatPush("SYSTEM", "미션: (1) 모자 줍고 눈사람에게 전달 (2) 랜덤 주민 5명에게서 CS 1문제씩 풀기");
})();

// -----------------------------------------------------
// Input
// -----------------------------------------------------
const keys = new Set();
function normalizeKey(e) {
    const k = e.key;
    if (k === "ArrowUp") return "w";
    if (k === "ArrowDown") return "s";
    if (k === "ArrowLeft") return "a";
    if (k === "ArrowRight") return "d";
    return k.toLowerCase();
}
window.addEventListener(
    "keydown",
    (e) => {
        keys.add(normalizeKey(e));
        if (e.key.startsWith("Arrow")) e.preventDefault();
    },
    { passive: false }
);
window.addEventListener(
    "keyup",
    (e) => {
        keys.delete(normalizeKey(e));
        if (e.key.startsWith("Arrow")) e.preventDefault();
    },
    { passive: false }
);

// -----------------------------------------------------
// ✅ Mission State
// -----------------------------------------------------
const proofCode = makeProofCode();

const mission = {
    proofCode,

    // hat quest
    hatFound: false,
    hatDelivered: false,
    playerHasHat: false,

    // ✅ CS quiz: 5명 * 1문제 (문제 중복 없음)
    quizNPCs: [],
    quizByNpc: new Map(),
    activeQuizNpc: null,
    activeQuizAsked: false,

    quizSolvedCount: 0,
    quizSolved: false,

    allClear: false,
};

proofCodeBox.textContent = `인증코드: ${mission.proofCode}`;

function updateHUD() {
    const hatLine = `🎩 모자 퀘스트: ${
        mission.hatDelivered ? "완료" : mission.playerHasHat ? "모자 들고 있음 → 눈사람에게!" : mission.hatFound ? "모자 찾음" : "진행 중"
    }`;

    const list = mission.quizNPCs
        .map((n) => {
            const st = mission.quizByNpc.get(n.name);
            const ok = st?.solved ? "✅" : "🎄";
            return `${ok}${n.name}`;
        })
        .join(" · ");

    const quizLine = `🧠 CS 퀴즈: ${mission.quizSolved ? "완료" : `진행: ${mission.quizSolvedCount}/5`}`;

    const hintLine = mission.allClear
        ? `✅ ALL CLEAR! 인증코드 보이게 스샷 → 공지방 이벤트 글 댓글!`
        : `힌트: 대상 5명에게 각각 1문제 / 모자: 오른쪽, 눈사람: 왼쪽`;

    hud.innerHTML = `
    <div style="font-size: 14px; font-weight: 900; margin-bottom: 6px;">🎄 Xmas Missions</div>
    <div>${hatLine}</div>
    <div style="margin-top: 2px;">${quizLine}</div>
    <div style="margin-top: 6px; font-size: 12px; opacity: 0.95; font-weight: 800;">대상 5명: ${list || "(선정 중)"}</div>
    <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">${hintLine}</div>
    <div style="margin-top: 8px; font-size: 11px; opacity: 0.75;">CODE: <b>${mission.proofCode}</b></div>
  `;
}

function tryCompleteAllClear() {
    if (mission.allClear) return;
    if (mission.hatDelivered && mission.quizSolved) {
        mission.allClear = true;
        updateHUD();

        starGlow.intensity = 1.7;
        starMat.emissiveIntensity = 1.2;

        clearOverlay.style.display = "flex";
        setMsg("🎉 ALL CLEAR! 인증코드 보이게 스샷 → 공지방 이벤트 글 댓글!", 9000);
        chatPush("SYSTEM", `ALL CLEAR! 인증코드: ${mission.proofCode}`);
    }
}

function isQuizNpc(resident) {
    return mission.quizByNpc.has(resident.name);
}
function quizStateFor(resident) {
    return mission.quizByNpc.get(resident.name);
}

// ✅ 퀴즈 5명 선정 + 문제 5개를 "중복 없이" 뽑아 배정
(function initQuizMission() {
    mission.quizNPCs = pickUnique(residents, 5);

    // 문제은행 셔플 후 5개
    const bankIdx = Array.from({ length: CS_BANK.length }, (_, i) => i);
    for (let i = bankIdx.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        [bankIdx[i], bankIdx[j]] = [bankIdx[j], bankIdx[i]];
    }
    const pickedQuestions = bankIdx.slice(0, 5).map((i) => CS_BANK[i]); // ✅ 중복 0

    mission.quizByNpc = new Map();
    mission.activeQuizNpc = null;
    mission.activeQuizAsked = false;
    mission.quizSolvedCount = 0;
    mission.quizSolved = false;

    for (let i = 0; i < mission.quizNPCs.length; i++) {
        const npc = mission.quizNPCs[i];
        mission.quizByNpc.set(npc.name, { q: pickedQuestions[i], solved: false });
    }

    updateHUD();

    const names = mission.quizNPCs.map((n) => n.name).join(", ");
    chatPush("SYSTEM", `CS 퀴즈 대상 5명: ${names}`);
    chatPush("SYSTEM", "각 주민에게 가까이 가거나 클릭해서 말 걸면 '그 주민의 1문제'가 출제됨. 정답은 채팅창에 입력!");
})();

// -----------------------------------------------------
// Talk (proximity + click)
// -----------------------------------------------------
const TALK_RADIUS = 1.28;
const TALK_COOLDOWN = 4.2;
const CLICK_COOLDOWN = 1.1;
let lastProxAt = -999;

function randomLine() {
    return npcTalkLines[randInt(npcTalkLines.length)];
}

function showNpcQuizQuestion(resident) {
    if (mission.quizSolved) return;
    if (!isQuizNpc(resident)) return;

    const st = quizStateFor(resident);
    if (!st || st.solved) {
        setMsg(`${resident.name}: 나는 이미 문제 해결됨! 다른 대상에게 가봐!`, 4200);
        return;
    }

    mission.activeQuizNpc = resident;
    mission.activeQuizAsked = true;

    const idx = mission.quizSolvedCount + 1;
    setMsg(`${resident.name}: (${idx}/5) ${st.q.q}`, 7200);
    chatPush(resident.name, `(${idx}/5) ${st.q.q}`);
    chatPush("SYSTEM", `답을 채팅창에 입력하고 Enter!`);
}

function solveNpcQuizCorrect(resident) {
    const st = quizStateFor(resident);
    if (!st || st.solved) return;

    st.solved = true;
    mission.quizSolvedCount += 1;

    mission.activeQuizAsked = false;
    mission.activeQuizNpc = null;

    if (mission.quizSolvedCount >= 5) {
        mission.quizSolved = true;
        updateHUD();
        setMsg("✅ CS 퀴즈 5/5 완료!", 5200);
        chatPush("SYSTEM", "CS 퀴즈 완료! 이제 모자 퀘스트(미완료 시)만 남았다.");
        tryCompleteAllClear();
        return;
    }

    updateHUD();
    setMsg(`✅ 정답! (${mission.quizSolvedCount}/5) 다음 대상에게 가자!`, 4200);
    chatPush("SYSTEM", `정답! (${mission.quizSolvedCount}/5) 다음 대상에게 가자!`);
}

function speakResident(resident, t, mode = "prox") {
    if (!resident) return;

    if (mode === "prox") {
        const canNpc = t - resident.lastSpokeAt >= TALK_COOLDOWN;
        const canGlobal = t - lastProxAt >= 1.2;
        if (!canNpc || !canGlobal) return;

        resident.lastSpokeAt = t;
        lastProxAt = t;

        if (isQuizNpc(resident) && !mission.quizSolved) {
            const st = quizStateFor(resident);
            if (st && !st.solved) {
                if (!mission.activeQuizAsked || mission.activeQuizNpc !== resident) showNpcQuizQuestion(resident);
                else setMsg(`${resident.name}: 답은 채팅창에!`, 3500);
                return;
            }
        }

        setMsg(`${resident.name}: ${randomLine()}`, 4500);
        return;
    }

    if (t - resident.lastClickedAt < CLICK_COOLDOWN) return;
    resident.lastClickedAt = t;

    if (isQuizNpc(resident) && !mission.quizSolved) {
        const st = quizStateFor(resident);
        if (st && !st.solved) {
            showNpcQuizQuestion(resident);
            return;
        }
    }

    setMsg(`${resident.name}: ${randomLine()}`, 4500);
}

// Click talk
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

function findResidentFromObject(obj) {
    let cur = obj;
    while (cur) {
        if (cur.userData && cur.userData.resident) return cur.userData.resident;
        cur = cur.parent;
    }
    return null;
}

renderer.domElement.addEventListener(
    "pointerdown",
    (e) => {
        if (e.button !== 0) return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));
        raycaster.setFromCamera(pointerNdc, camera);

        const targets = residents.map((r) => r.obj);
        const hits = raycaster.intersectObjects(targets, true);
        if (hits.length > 0) {
            const r = findResidentFromObject(hits[0].object);
            if (r) speakResident(r, clock.elapsedTime, "click");
        }
    },
    { passive: true }
);

// -----------------------------------------------------
// Chat submit (CS 답안 제출)
// -----------------------------------------------------
function submitChat() {
    const raw = (chatInput.value || "").trim();
    if (!raw) return;
    chatInput.value = "";
    chatPush("ME", raw);

    if (mission.quizSolved) {
        chatPush("SYSTEM", "이미 CS 퀴즈는 완료!");
        return;
    }

    if (!mission.activeQuizAsked || !mission.activeQuizNpc) {
        chatPush("SYSTEM", "아직 문제가 출제되지 않았어. 대상 주민에게 말 걸어줘!");
        return;
    }

    const resident = mission.activeQuizNpc;
    const st = quizStateFor(resident);
    if (!st || st.solved) {
        chatPush("SYSTEM", "이 주민의 문제는 이미 해결됨! 다른 대상에게 가봐!");
        mission.activeQuizAsked = false;
        mission.activeQuizNpc = null;
        return;
    }

    const ok = oneOfNormalized(raw, st.q.accepts);
    if (ok) {
        chatPush("SYSTEM", "정답! ✅");
        solveNpcQuizCorrect(resident);
    } else {
        chatPush("SYSTEM", "오답! ❌ 다시 입력!");
        setMsg("❌ 오답! 다시 입력해봐!", 3200);
    }
}
chatSend.addEventListener("click", submitChat);
chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitChat();
});

// -----------------------------------------------------
// Movement / Collision
// -----------------------------------------------------
function animateWalkParts(parts, walking, t) {
    if (!parts) return;
    const s = walking ? 1 : 0;
    const a = Math.sin(t * 10.0) * 0.55 * s;
    const b = Math.sin(t * 10.0 + Math.PI) * 0.55 * s;
    parts.legL.rotation.x = a;
    parts.legR.rotation.x = b;
    parts.armL.rotation.x = b * 0.7;
    parts.armR.rotation.x = a * 0.7;
}

function updatePlayer(dt, t) {
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();

    const forward = camDir;
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let move = new THREE.Vector3();
    if (keys.has("w")) move.add(forward);
    if (keys.has("s")) move.sub(forward);
    if (keys.has("d")) move.add(right);
    if (keys.has("a")) move.sub(right);

    const isRunning = keys.has("shift");
    const spd = player.speed * (isRunning ? player.runMul : 1.0);

    const walking = move.lengthSq() > 0;
    if (walking) {
        move.normalize().multiplyScalar(spd * dt);
        player.obj.position.add(move);
        const yaw = Math.atan2(move.x, move.z);
        player.obj.rotation.y = lerp(player.obj.rotation.y, yaw, 0.22);
    }

    animateWalkParts(player.obj.userData.parts, walking, t);

    keepInsideCircle(player.obj.position, player.radius, PLAY_AREA_R);
    applyCircleCollision(player.obj.position, player.radius, new THREE.Vector3(0, 0, 0), TREE_COLLIDER_R);
    for (const n of residents) applyCircleCollision(player.obj.position, player.radius, n.obj.position, n.radius + 0.02);
}

// ✅ 소셜 디스턴싱 separation 벡터 계산(이동 중 NPC가 서로 비비지 않게)
function computeSeparation(n) {
    const sep = new THREE.Vector3(0, 0, 0);
    let count = 0;

    for (const o of residents) {
        if (o === n) continue;
        const dx = n.obj.position.x - o.obj.position.x;
        const dz = n.obj.position.z - o.obj.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.0001 && dist < SOCIAL.personalSpace) {
            const w = 1 - dist / SOCIAL.personalSpace; // 가까울수록 큼
            sep.x += (dx / dist) * (w * w);
            sep.z += (dz / dist) * (w * w);
            count++;
        }
    }

    // 플레이어도 약하게 회피(밀집 방지)
    {
        const dx = n.obj.position.x - player.obj.position.x;
        const dz = n.obj.position.z - player.obj.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const R = 1.25;
        if (dist > 0.0001 && dist < R) {
            const w = 1 - dist / R;
            sep.x += (dx / dist) * (w * 0.65);
            sep.z += (dz / dist) * (w * 0.65);
            count++;
        }
    }

    if (count > 0) {
        sep.x /= count;
        sep.z /= count;
    }
    return sep;
}

function updateResidents(dt, t) {
    for (const n of residents) {
        n.tag.position.y = 1.38 + Math.sin(t * 2.6 + n.phase) * 0.03;

        n.repickCooldown = Math.max(0, (n.repickCooldown || 0) - dt);

        const pos = n.obj.position;
        const to = n.target.clone().sub(pos);
        const dist = to.length();

        // 스턱 감지
        const moved = distXZ(pos, n.lastPos || pos);
        n.lastPos = n.lastPos || new THREE.Vector3();
        n.lastPos.copy(pos);

        if (moved < 0.003) n.stuckTime = (n.stuckTime || 0) + dt;
        else n.stuckTime = 0;

        if (n.stuckTime > 1.8 && n.repickCooldown <= 0) {
            pickNpcTarget(n);
            n.stuckTime = 0;
            n.repickCooldown = 0.9;
        }

        const walking = dist >= 0.16;

        if (!walking) {
            n.wait -= dt;
            animateWalkParts(n.obj.userData.parts, false, t);

            // 주변이 붐비면 빠르게 이동 재개
            let crowded = false;
            if (distXZ(pos, player.obj.position) < 1.3) crowded = true;
            for (const o of residents) {
                if (o === n) continue;
                if (distXZ(pos, o.obj.position) < 1.05) {
                    crowded = true;
                    break;
                }
            }

            if (n.wait <= 0 || (crowded && n.repickCooldown <= 0)) {
                pickNpcTarget(n);
                n.repickCooldown = 0.55;
            }
        } else {
            // ✅ 기본 이동 방향
            const dirv = to.normalize();

            // ✅ 소셜 디스턴싱: separation을 더해 방향을 부드럽게 꺾음
            const sep = computeSeparation(n);
            if (sep.lengthSq() > 0.00001) {
                sep.normalize().multiplyScalar(SOCIAL.sepStrength * 0.75);
                dirv.add(sep).normalize();
            }

            pos.addScaledVector(dirv, n.speed * dt);

            keepInsideCircle(pos, n.radius, PLAY_AREA_R);
            applyCircleCollision(pos, n.radius, new THREE.Vector3(0, 0, 0), TREE_COLLIDER_R);
            applyCircleCollision(pos, n.radius, player.obj.position, player.radius + 0.08);

            // NPC끼리 충돌(물리)
            for (const o of residents) {
                if (o === n) continue;
                applyCircleCollision(pos, n.radius, o.obj.position, o.radius + 0.07);
            }

            const yaw = Math.atan2(dirv.x, dirv.z);
            n.obj.rotation.y = lerp(n.obj.rotation.y, yaw, 0.12);

            animateWalkParts(n.obj.userData.parts, true, t + n.walkPhase);
        }
    }
}

// -----------------------------------------------------
// ✅ Hat Quest
// -----------------------------------------------------
const missionGroup = new THREE.Group();
scene.add(missionGroup);

let snowmanTarget = null;
let hatObj = null;

(function createSnowmanAndHatQuest() {
    // ✅ 공간 확장에 맞춰 위치도 조금 더 바깥으로
    const targetPos = new THREE.Vector3(-10.2, 0, 2.2);

    const g = new THREE.Group();
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf4fbff, roughness: 0.98 });
    const coalMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });

    const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.30, 18, 18), snowMat);
    b1.position.y = 0.30; b1.castShadow = true;
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), snowMat);
    b2.position.y = 0.64; b2.castShadow = true;
    const b3 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 18), snowMat);
    b3.position.y = 0.92; b3.castShadow = true;

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), coalMat);
    const eyeR = eyeL.clone();
    eyeL.position.set(-0.06, 0.94, 0.13);
    eyeR.position.set(0.06, 0.94, 0.13);

    const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.02, 0.12, 10),
        new THREE.MeshStandardMaterial({ color: 0xff7a2f, roughness: 0.8 })
    );
    nose.position.set(0, 0.90, 0.19);
    nose.rotation.x = Math.PI / 2;

    const hatSlot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 0.06, 18),
        new THREE.MeshStandardMaterial({ color: 0x1a1d2b, roughness: 0.9, emissive: 0x05060a, emissiveIntensity: 0.25 })
    );
    hatSlot.position.y = 1.08;

    const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map: glowTex,
            color: 0x55ddff,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.25,
        })
    );
    glow.scale.set(1.1, 1.1, 1);
    glow.position.set(0, 1.08, 0);

    g.add(b1, b2, b3, eyeL, eyeR, nose, hatSlot, glow);
    g.position.copy(targetPos);
    g.userData = { type: "snowmanTarget", radius: 0.65 };

    missionGroup.add(g);
    snowmanTarget = g;

    const hatPos = new THREE.Vector3(10.6, 0, -2.6);

    const hatG = new THREE.Group();
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a1d2b, roughness: 0.9 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 18), hatMat);
    brim.position.y = 0.06;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 18), hatMat);
    top.position.y = 0.15;

    const hatGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map: glowTex,
            color: 0xffcc33,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.22,
        })
    );
    hatGlow.scale.set(0.9, 0.9, 1);
    hatGlow.position.set(0, 0.16, 0);

    hatG.add(brim, top, hatGlow);
    hatG.position.set(hatPos.x, 0.02, hatPos.z);
    hatG.userData = { type: "hat", picked: false, radius: 0.38 };
    missionGroup.add(hatG);
    hatObj = hatG;
})();

function checkHatQuest() {
    if (!mission.playerHasHat && hatObj && !hatObj.userData.picked) {
        if (distXZ(hatObj.position, player.obj.position) <= 0.75) {
            hatObj.userData.picked = true;
            hatObj.visible = false;

            mission.hatFound = true;
            mission.playerHasHat = true;

            setMsg("🎩 모자를 주웠다! 이제 눈사람에게 가져다줘!", 5200);
            chatPush("SYSTEM", "모자 획득! 눈사람(왼쪽 바깥쪽)에게 가져가면 완료.");
            updateHUD();
        }
    }

    if (mission.playerHasHat && !mission.hatDelivered && snowmanTarget) {
        if (distXZ(snowmanTarget.position, player.obj.position) <= 1.10) {
            mission.playerHasHat = false;
            mission.hatDelivered = true;

            const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a1d2b, roughness: 0.9 });
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 18), hatMat);
            brim.position.set(0, 1.12, 0);
            const top = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 18), hatMat);
            top.position.set(0, 1.20, 0);
            brim.castShadow = top.castShadow = true;
            snowmanTarget.add(brim, top);

            setMsg("🎩 전달 완료! 눈사람이 매우 행복해함 ☃️", 5200);
            chatPush("SYSTEM", "모자 퀘스트 완료! 이제 CS 퀴즈(5명에게서 1문제씩)만 남았다.");
            updateHUD();
            tryCompleteAllClear();
        }
    }
}

// -----------------------------------------------------
// Snow particles
// -----------------------------------------------------
const snowCount = 1800;
const snowGeo = new THREE.BufferGeometry();
const snowPos = new Float32Array(snowCount * 3);
const snowVel = new Float32Array(snowCount);
const snowDrift = new Float32Array(snowCount);

for (let i = 0; i < snowCount; i++) {
    const i3 = i * 3;
    snowPos[i3 + 0] = (Math.random() - 0.5) * 86;
    snowPos[i3 + 1] = Math.random() * 26 + 1;
    snowPos[i3 + 2] = (Math.random() - 0.5) * 86;
    snowVel[i] = 0.55 + Math.random() * 1.9;
    snowDrift[i] = (Math.random() - 0.5) * 0.9;
}
snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
const snowMat = new THREE.PointsMaterial({
    color: 0xf2f8ff,
    size: 0.032,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
});
const snow = new THREE.Points(snowGeo, snowMat);
scene.add(snow);

// -----------------------------------------------------
// BGM Playlist
// -----------------------------------------------------
const PLAYLIST = [
    "Silent Night.mp3",
    "Oh Little Town of Bethlehem.mp3",
    "Joy To The World.mp3",
    "Jingle Bell.mp3",
    "The First Noel.mp3",
    "Angels We Have Heard On High.mp3",
    "O Holy Night.mp3",
    "We Wish You A Merry Christmas.mp3",
];

let bgmAudio = null;
let isBgmOn = false;
let trackIndex = 0;

function currentTrackName() {
    return PLAYLIST[trackIndex] ?? "";
}
function trackUrl(fileName) {
    return "./" + encodeURIComponent(fileName).replace(/%2F/g, "/");
}
function ensureBgm() {
    if (bgmAudio) return;
    bgmAudio = new Audio();
    bgmAudio.preload = "auto";
    bgmAudio.loop = false;
    bgmAudio.volume = 0.55;
    bgmAudio.addEventListener("ended", () => nextTrack(true));
    bgmAudio.addEventListener("error", () => setMsg(`BGM 로드 실패: ${currentTrackName()}`, 6000));
}
function showNowPlaying(prefix = "🎶 재생") {
    setMsg(`${prefix}: ${currentTrackName()}`, 4500);
}
function loadTrack(i) {
    ensureBgm();
    trackIndex = (i + PLAYLIST.length) % PLAYLIST.length;
    bgmAudio.src = trackUrl(currentTrackName());
    bgmAudio.currentTime = 0;
}
async function playCurrent() {
    ensureBgm();
    if (!bgmAudio.src) loadTrack(trackIndex);
    try {
        await bgmAudio.play();
        isBgmOn = true;
        bgmBtn.textContent = "🔊 BGM ON";
        showNowPlaying("🎶 재생");
    } catch {
        setMsg("브라우저에서 오디오 재생이 차단됨 (버튼 클릭 필요)", 6000);
    }
}
function pauseBgm() {
    if (!bgmAudio) return;
    bgmAudio.pause();
    isBgmOn = false;
    bgmBtn.textContent = "🔇 BGM OFF";
    setMsg("BGM OFF", 2500);
}
async function nextTrack(auto = false) {
    loadTrack(trackIndex + 1);
    if (isBgmOn || auto) await playCurrent();
    else showNowPlaying("선택됨");
}
bgmBtn.addEventListener("click", async () => {
    ensureBgm();
    if (!bgmAudio.src) loadTrack(trackIndex);
    if (!isBgmOn) await playCurrent();
    else pauseBgm();
});
nextBgmBtn.addEventListener("click", async () => {
    ensureBgm();
    if (!bgmAudio.src) loadTrack(trackIndex);
    isBgmOn = true;
    await nextTrack(false);
});
setTimeout(() => setMsg(`BGM 준비됨: ${currentTrackName()} (BGM ON / NEXT로 곡 변경)`, 5200), 300);

// -----------------------------------------------------
// Proximity talk + HUD init
// -----------------------------------------------------
updateHUD();
setTimeout(() => {
    setMsg(`🎯 이벤트: 두 미션 완료 후 인증코드 보이게 스샷 → 공지방 이벤트 글 댓글! (CODE: ${mission.proofCode})`, 8500);
    chatPush("SYSTEM", `인증코드: ${mission.proofCode}`);
    chatPush("SYSTEM", `CS 퀴즈: HUD에 표시된 대상 5명에게 각각 1문제!`);
    chatPush("SYSTEM", "모자 위치 힌트: 오른쪽 바깥쪽 / 눈사람 위치 힌트: 왼쪽 바깥쪽");
}, 900);

// -----------------------------------------------------
// Talk proximity handler
// -----------------------------------------------------
function handleProximityTalk(t) {
    let closest = null;
    let bestD = 999;
    for (const n of residents) {
        const d = distXZ(n.obj.position, player.obj.position);
        if (d < bestD) {
            bestD = d;
            closest = n;
        }
    }
    if (closest && bestD <= TALK_RADIUS) speakResident(closest, t, "prox");
}

// -----------------------------------------------------
// Animate
// -----------------------------------------------------
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.033);
    const t = clock.elapsedTime;

    skyMat.uniforms.uTime.value = t;

    // bulbs twinkle
    for (const b of bulbs) {
        const tw = 0.55 + 0.45 * Math.sin(t * 2.3 + b.phase);
        b.mesh.material.emissiveIntensity = 0.65 + tw * 1.1;
        b.glow.material.opacity = 0.28 + tw * 0.40;
        const sc = 0.85 + tw * 0.22;
        b.glow.scale.set(sc * 0.55, sc * 0.55, 1);
    }

    // star rotate + pulse
    star.rotation.y = t * 0.9;
    starMat.emissiveIntensity = mission.allClear ? 1.2 : 0.8 + 0.25 * Math.sin(t * 2.0);
    starSprite.material.opacity = 0.22 + 0.10 * (0.5 + 0.5 * Math.sin(t * 2.0));

    // windows
    for (const h of houses) {
        const tw = 0.6 + 0.4 * Math.sin(t * 1.3 + h.phase);
        h.winMat.emissiveIntensity = 0.85 + tw * 0.75;
    }

    // lamps flicker
    for (const l of lamps) {
        const tw = 0.6 + 0.4 * Math.sin(t * 2.0 + l.phase);
        l.light.intensity = 0.55 + tw * 0.30;
        l.glow.material.opacity = 0.22 + tw * 0.20;
    }

    // movement + talk
    updatePlayer(dt, t);
    updateResidents(dt, t);
    handleProximityTalk(t);

    // hat quest
    checkHatQuest();

    // camera follow
    const target = new THREE.Vector3(player.obj.position.x, 1.20, player.obj.position.z);
    controls.target.lerp(target, 0.16);
    controls.update();

    // snow update
    const p = snow.geometry.attributes.position.array;
    for (let i = 0; i < snowCount; i++) {
        const i3 = i * 3;
        p[i3 + 1] -= snowVel[i] * 0.03;
        p[i3 + 0] += snowDrift[i] * 0.006 + Math.sin(t * 0.25 + i) * 0.0012;
        p[i3 + 2] += Math.cos(t * 0.18 + i) * 0.0008;

        if (p[i3 + 1] < 0) {
            p[i3 + 1] = Math.random() * 26 + 12;
            p[i3 + 0] = (Math.random() - 0.5) * 86;
            p[i3 + 2] = (Math.random() - 0.5) * 86;
        }
    }
    snow.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
}
animate();

// -----------------------------------------------------
// Resize
// -----------------------------------------------------
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
