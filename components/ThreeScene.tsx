import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Gate {
  group: THREE.Group;
  z: number;
  x: number;
  cleared: boolean;
}

interface Bouquet {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
}

const TRACK_LENGTH = 600;
const TARGET_DURATION_SECONDS = 288; // ~ duration of "Kiss from a Rose"
const FORWARD_SPEED = TRACK_LENGTH / TARGET_DURATION_SECONDS;
const STRAFE_SPEED = 8;
const GATE_COUNT = 30;
const GATE_SPACING = TRACK_LENGTH / GATE_COUNT;
const LANE_WIDTH = 20;
const GATE_WIDTH = 6;

function createRoseTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#00000000';
  ctx.fillRect(0, 0, size, size);

  // Draw a pixelated bouquet (simple roses + stems)
  const drawPixel = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * 4, y * 4, 4, 4);
  };

  const roses = [
    { x: 6, y: 5 },
    { x: 9, y: 5 },
    { x: 7.5, y: 7 },
  ];

  roses.forEach(({ x, y }) => {
    drawPixel(x, y, '#c2185b');
    drawPixel(x + 1, y, '#e91e63');
    drawPixel(x, y + 1, '#d81b60');
    drawPixel(x + 1, y + 1, '#ad1457');
  });

  for (let i = 0; i < 4; i += 1) {
    drawPixel(7 + i * 0.5, 9 + i, '#2e7d32');
    drawPixel(8 + i * 0.5, 10 + i, '#43a047');
  }

  drawPixel(8, 13, '#1b5e20');
  drawPixel(9, 13, '#1b5e20');
  drawPixel(8, 14, '#33691e');
  drawPixel(9, 14, '#33691e');

  return new THREE.CanvasTexture(canvas);
}

function createGate(x: number, z: number): Gate {
  const group = new THREE.Group();

  const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 5, 8);
  const redMaterial = new THREE.MeshStandardMaterial({ color: '#d32f2f' });
  const blueMaterial = new THREE.MeshStandardMaterial({ color: '#1976d2' });
  const bannerMaterial = new THREE.MeshStandardMaterial({ color: '#fafafa', transparent: true, opacity: 0.65 });
  const bannerGeometry = new THREE.PlaneGeometry(GATE_WIDTH, 1.2);

  const leftPole = new THREE.Mesh(poleGeometry, redMaterial);
  leftPole.position.set(x - GATE_WIDTH / 2, 2.5, z);
  const rightPole = new THREE.Mesh(poleGeometry, blueMaterial);
  rightPole.position.set(x + GATE_WIDTH / 2, 2.5, z);

  const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
  banner.rotation.y = Math.PI;
  banner.position.set(x, 3.8, z);

  group.add(leftPole, rightPole, banner);

  return { group, z, x, cleared: false };
}

export default function ThreeScene(): JSX.Element {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [score, setScore] = useState(0);
  const [gatesCleared, setGatesCleared] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return () => undefined;

    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#c6e2ff');

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight('#f1f8e9', '#90a4ae', 1.1);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 0.8);
    dirLight.position.set(-10, 20, 10);
    scene.add(dirLight);

    const snowGeometry = new THREE.PlaneGeometry(200, TRACK_LENGTH + 50, 50, 200);
    const snowMaterial = new THREE.MeshStandardMaterial({ color: '#f5f5f5' });
    const snow = new THREE.Mesh(snowGeometry, snowMaterial);
    snow.rotation.x = -Math.PI / 2;
    snow.position.z = -TRACK_LENGTH / 2;
    scene.add(snow);

    const gridHelper = new THREE.GridHelper(200, 80, '#cfd8dc', '#eceff1');
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    const trees: THREE.Mesh[] = [];
    const treeGeometry = new THREE.ConeGeometry(0.8, 3, 6);
    const trunkGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 6);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: '#2e7d32' });
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#6d4c41' });

    for (let i = 0; i < 120; i += 1) {
      const tree = new THREE.Mesh(treeGeometry, foliageMaterial);
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      tree.position.set((Math.random() - 0.5) * 180, 1.6, -Math.random() * TRACK_LENGTH);
      trunk.position.copy(tree.position.clone().setY(0.4));
      scene.add(tree, trunk);
      trees.push(tree, trunk);
    }

    const gates: Gate[] = [];
    for (let i = 0; i < GATE_COUNT; i += 1) {
      const z = -(i + 1) * GATE_SPACING;
      const x = (Math.random() - 0.5) * LANE_WIDTH;
      const gate = createGate(x, z);
      gates.push(gate);
      scene.add(gate.group);
    }

    const finishBannerGeometry = new THREE.BoxGeometry(GATE_WIDTH + 4, 0.6, 0.5);
    const finishMaterial = new THREE.MeshStandardMaterial({ color: '#ffeb3b' });
    const finish = new THREE.Mesh(finishBannerGeometry, finishMaterial);
    finish.position.set(0, 3.5, -TRACK_LENGTH - 5);
    scene.add(finish);

    const roseTexture = createRoseTexture();
    const bouquets: Bouquet[] = [];

    const spawnBouquet = (x: number, z: number) => {
      const material = new THREE.SpriteMaterial({ map: roseTexture.clone(), transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(x, 2.5, z);
      sprite.scale.set(1.8, 1.8, 1.8);
      scene.add(sprite);
      const velocity = new THREE.Vector3((Math.random() - 0.5) * 1.5, 2 + Math.random() * 0.5, (Math.random() - 0.5) * 1.5);
      bouquets.push({ sprite, velocity, life: 1.2 });
    };

    const pressed: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      pressed[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressed[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let animationId = 0;
    const clock = new THREE.Clock();
    const playerPosition = new THREE.Vector3(0, 1.6, 5);
    let elapsedRef = 0;
    let elapsedDisplay = 0;
    let finishedRef = false;
    let scoreRef = 0;
    let clearedRef = 0;

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      if (!finishedRef) {
        elapsedRef += delta;
        const wholeSeconds = Math.floor(elapsedRef);
        if (wholeSeconds !== elapsedDisplay) {
          elapsedDisplay = wholeSeconds;
          setElapsed(wholeSeconds);
        }
      }

      const moveLeft = pressed['a'] || pressed['arrowleft'];
      const moveRight = pressed['d'] || pressed['arrowright'];
      const lateral = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
      playerPosition.x += lateral * STRAFE_SPEED * delta;
      playerPosition.x = THREE.MathUtils.clamp(playerPosition.x, -LANE_WIDTH, LANE_WIDTH);

      if (!finishedRef) {
        playerPosition.z -= FORWARD_SPEED * delta;
      }

      camera.position.copy(playerPosition);
      camera.lookAt(playerPosition.clone().add(new THREE.Vector3(0, -0.05, -1)));

      gates.forEach((gate) => {
        if (gate.cleared || finishedRef) return;
        if (playerPosition.z <= gate.z) {
          const withinGate = Math.abs(playerPosition.x - gate.x) <= GATE_WIDTH / 2;
          gate.cleared = true;
          clearedRef += 1;
          setGatesCleared(clearedRef);
          if (withinGate) {
            scoreRef += 100;
            setScore(scoreRef);
            spawnBouquet(gate.x, gate.z);
          }
        }
      });

      for (let i = bouquets.length - 1; i >= 0; i -= 1) {
        const bouquet = bouquets[i];
        bouquet.life -= delta;
        bouquet.sprite.position.addScaledVector(bouquet.velocity, delta);
        bouquet.velocity.y -= 1.5 * delta;
        const opacity = Math.max(0, bouquet.life);
        (bouquet.sprite.material as THREE.SpriteMaterial).opacity = opacity;
        if (bouquet.life <= 0) {
          scene.remove(bouquet.sprite);
          bouquets.splice(i, 1);
        }
      }

      if (!finishedRef && playerPosition.z <= -TRACK_LENGTH) {
        finishedRef = true;
        setFinished(true);
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      roseTexture.dispose();
      gates.forEach((gate) => gate.group.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        if ((obj as THREE.Mesh).material && 'dispose' in (obj as THREE.Mesh).material) {
          ((obj as THREE.Mesh).material as THREE.Material).dispose();
        }
      }));
      bouquets.forEach((bouquet) => bouquet.sprite.material.dispose());
      try {
        container.removeChild(renderer.domElement);
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <div
        ref={mountRef}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          padding: '12px 16px',
          background: 'rgba(0,0,0,0.45)',
          color: '#f5f5f5',
          borderRadius: 8,
          maxWidth: 360,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        <h1 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>First-Person Slalom</h1>
        <p style={{ margin: '4px 0' }}>Time: {elapsed}s · Score: {score} · Gates: {gatesCleared}/{GATE_COUNT}</p>
        <p style={{ margin: '4px 0' }}>A/D or ←/→ to carve. Ski until the finish — about as long as "Kiss from a Rose".</p>
        {finished && (
          <p style={{ margin: '8px 0 0', color: '#ffeb3b' }}>
            Finished! Your bouquet count awaits at the end of the run.
          </p>
        )}
      </div>
    </div>
  );
}
