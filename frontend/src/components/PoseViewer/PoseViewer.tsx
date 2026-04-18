import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PoseData, PoseLandmark } from "../../types";
import styles from "./PoseViewer.module.scss";

// YOLOv8-Pose keypoint indices
// 0:nose 1:left_eye 2:right_eye 3:left_ear 4:right_ear
// 5:left_shoulder 6:right_shoulder 7:left_elbow 8:right_elbow
// 9:left_wrist 10:right_wrist 11:left_hip 12:right_hip
// 13:left_knee 14:right_knee 15:left_ankle 16:right_ankle

// Body limb segments: [startKeypoint, endKeypoint, thickness]
const LIMB_SEGMENTS: [number, number, number][] = [
  // Torso (thick)
  [5, 6, 0.04],    // shoulders
  [5, 11, 0.035],  // left torso
  [6, 12, 0.035],  // right torso
  [11, 12, 0.035], // hips
  // Left arm
  [5, 7, 0.022],   // upper arm
  [7, 9, 0.018],   // forearm
  // Right arm
  [6, 8, 0.022],
  [8, 10, 0.018],
  // Left leg
  [11, 13, 0.028], // thigh
  [13, 15, 0.022], // shin
  // Right leg
  [12, 14, 0.028],
  [14, 16, 0.022],
];

// Colors for different poses (lead vs follow)
const POSE_BODY_COLORS = [0x4f46e5, 0xdb2777];
const POSE_ACCENT_COLORS = [0x818cf8, 0xf472b6];

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];
const NUM_KEYPOINTS = 17;

interface PoseViewerProps {
  poseData: string;
}

function landmarkToVec3(lm: PoseLandmark, scale: number = 2): THREE.Vector3 {
  return new THREE.Vector3(
    (lm.x - 0.5) * scale,
    -(lm.y - 0.5) * scale,
    -lm.z * scale
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Create a capsule-shaped limb mesh between two points */
function createLimbMesh(material: THREE.Material): THREE.Mesh {
  // Use a cylinder, will be scaled/positioned per frame
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 8, 1, false);
  // Shift geometry so bottom is at origin (easier to orient)
  geometry.translate(0, 0.5, 0);
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

/** Position and orient a limb mesh between two 3D points */
function updateLimb(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3, radius: number) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();

  if (length < 0.001) {
    mesh.visible = false;
    return;
  }
  mesh.visible = true;

  mesh.position.copy(from);
  mesh.scale.set(radius, length, radius);

  // Orient cylinder along the direction vector
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, direction.normalize());
  mesh.quaternion.copy(quat);
}

interface MannequinParts {
  head: THREE.Mesh;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  leftHand: THREE.Mesh;
  rightHand: THREE.Mesh;
  leftFoot: THREE.Mesh;
  rightFoot: THREE.Mesh;
  limbs: THREE.Mesh[];
  joints: THREE.Mesh[];
}

function createMannequin(scene: THREE.Scene, bodyColor: number, accentColor: number): { parts: MannequinParts; geometries: THREE.BufferGeometry[]; materials: THREE.Material[] } {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6, metalness: 0.1 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4, metalness: 0.2 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.5 });
  materials.push(bodyMat, accentMat, darkMat);

  // Head — slightly oval sphere
  const headGeo = new THREE.SphereGeometry(0.045, 12, 10);
  headGeo.scale(1, 1.15, 1);
  geometries.push(headGeo);
  const head = new THREE.Mesh(headGeo, bodyMat);
  scene.add(head);

  // Eyes — tiny dark spheres
  const eyeGeo = new THREE.SphereGeometry(0.008, 6, 6);
  geometries.push(eyeGeo);
  const leftEye = new THREE.Mesh(eyeGeo, darkMat);
  const rightEye = new THREE.Mesh(eyeGeo, darkMat);
  scene.add(leftEye);
  scene.add(rightEye);

  // Hands — small spheres
  const handGeo = new THREE.SphereGeometry(0.018, 8, 8);
  geometries.push(handGeo);
  const leftHand = new THREE.Mesh(handGeo, accentMat);
  const rightHand = new THREE.Mesh(handGeo, accentMat);
  scene.add(leftHand);
  scene.add(rightHand);

  // Feet — flattened boxes
  const footGeo = new THREE.BoxGeometry(0.03, 0.015, 0.05);
  geometries.push(footGeo);
  const leftFoot = new THREE.Mesh(footGeo, darkMat);
  const rightFoot = new THREE.Mesh(footGeo, darkMat);
  scene.add(leftFoot);
  scene.add(rightFoot);

  // Joint spheres at key connection points (shoulders, elbows, hips, knees)
  const jointGeo = new THREE.SphereGeometry(0.02, 8, 8);
  geometries.push(jointGeo);
  const jointIndices = [5, 6, 7, 8, 11, 12, 13, 14]; // shoulders, elbows, hips, knees
  const joints: THREE.Mesh[] = [];
  for (const _ of jointIndices) {
    const joint = new THREE.Mesh(jointGeo, accentMat);
    scene.add(joint);
    joints.push(joint);
  }

  // Limb cylinders
  const limbs: THREE.Mesh[] = [];
  for (const _ of LIMB_SEGMENTS) {
    const limb = createLimbMesh(bodyMat);
    scene.add(limb);
    limbs.push(limb);
  }
  // Store the cylinder geometry for cleanup
  if (limbs.length > 0) {
    geometries.push(limbs[0].geometry as THREE.BufferGeometry);
  }

  return {
    parts: { head, leftEye, rightEye, leftHand, rightHand, leftFoot, rightFoot, limbs, joints },
    geometries,
    materials,
  };
}

function updateMannequin(parts: MannequinParts, poseData: PoseLandmark[]) {
  if (!poseData || poseData.length < NUM_KEYPOINTS) return;

  const positions = poseData.map((lm) => landmarkToVec3(lm));

  // Head — midpoint between eyes, slightly above nose
  const nose = positions[0];
  const lEye = positions[1];
  const rEye = positions[2];
  const headCenter = new THREE.Vector3().addVectors(lEye, rEye).multiplyScalar(0.5);
  headCenter.y += 0.025; // slightly above eye line
  parts.head.position.copy(headCenter);

  // Eyes
  parts.leftEye.position.copy(lEye);
  parts.leftEye.position.z = nose.z + 0.02; // slightly forward
  parts.rightEye.position.copy(rEye);
  parts.rightEye.position.z = nose.z + 0.02;

  // Hands
  parts.leftHand.position.copy(positions[9]);
  parts.rightHand.position.copy(positions[10]);

  // Feet
  parts.leftFoot.position.copy(positions[15]);
  parts.leftFoot.position.y -= 0.008; // slightly below ankle
  parts.rightFoot.position.copy(positions[16]);
  parts.rightFoot.position.y -= 0.008;

  // Joint spheres
  const jointIndices = [5, 6, 7, 8, 11, 12, 13, 14];
  for (let i = 0; i < jointIndices.length; i++) {
    parts.joints[i].position.copy(positions[jointIndices[i]]);
  }

  // Limbs
  for (let i = 0; i < LIMB_SEGMENTS.length; i++) {
    const [a, b, thickness] = LIMB_SEGMENTS[i];
    updateLimb(parts.limbs[i], positions[a], positions[b], thickness);
  }
}

function setMannequinVisible(parts: MannequinParts, visible: boolean) {
  parts.head.visible = visible;
  parts.leftEye.visible = visible;
  parts.rightEye.visible = visible;
  parts.leftHand.visible = visible;
  parts.rightHand.visible = visible;
  parts.leftFoot.visible = visible;
  parts.rightFoot.visible = visible;
  parts.limbs.forEach((l) => (l.visible = visible));
  parts.joints.forEach((j) => (j.visible = visible));
}

export const PoseViewer: React.FC<PoseViewerProps> = ({ poseData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number>(0);
  const mixerStateRef = useRef({
    currentFrame: 0,
    elapsed: 0,
    isPlaying: true,
    speed: 1,
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [webGLSupported, setWebGLSupported] = useState(true);

  const parsed: PoseData | null = React.useMemo(() => {
    try {
      return JSON.parse(poseData);
    } catch {
      return null;
    }
  }, [poseData]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      mixerStateRef.current.isPlaying = !prev;
      return !prev;
    });
  }, []);

  const changeSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    mixerStateRef.current.speed = newSpeed;
  }, []);

  const seekTo = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!parsed) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const totalDuration = parsed.frames.length / parsed.fps;
      const targetFrame = Math.floor(ratio * (parsed.frames.length - 1));
      mixerStateRef.current.currentFrame = targetFrame;
      mixerStateRef.current.elapsed = targetFrame / parsed.fps;
      setCurrentTime(ratio * totalDuration);
    },
    [parsed]
  );

  useEffect(() => {
    if (!parsed || !containerRef.current) return;
    if (parsed.frames.length === 0) return;

    const container = containerRef.current;
    const totalDuration = parsed.frames.length / parsed.fps;
    setDuration(totalDuration);

    const numPoses = parsed.num_poses || parsed.frames[0]?.length || 1;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 2.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setWebGLSupported(false);
      return;
    }
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls — limit rotation to avoid exposing 2D flatness
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 0, 0);
    controls.minAzimuthAngle = -Math.PI / 4;
    controls.maxAzimuthAngle = Math.PI / 4;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI * 5 / 6;

    // Grid
    const grid = new THREE.GridHelper(4, 20, 0x444466, 0x333355);
    grid.position.y = -1;
    scene.add(grid);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 3, 2);
    scene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0x6366f1, 0.3);
    backLight.position.set(-2, 1, -2);
    scene.add(backLight);

    // Create mannequins
    const allMannequins: MannequinParts[] = [];
    const allGeometries: THREE.BufferGeometry[] = [];
    const allMaterials: THREE.Material[] = [];

    for (let p = 0; p < numPoses; p++) {
      const bodyColor = POSE_BODY_COLORS[p % POSE_BODY_COLORS.length];
      const accentColor = POSE_ACCENT_COLORS[p % POSE_ACCENT_COLORS.length];
      const { parts, geometries, materials: mats } = createMannequin(scene, bodyColor, accentColor);
      allMannequins.push(parts);
      allGeometries.push(...geometries);
      allMaterials.push(...mats);
    }

    // Update all mannequins for a given frame
    function updateFrame(frameData: PoseLandmark[][]) {
      for (let p = 0; p < numPoses; p++) {
        const pose = frameData[p];
        if (!pose) {
          setMannequinVisible(allMannequins[p], false);
          continue;
        }
        setMannequinVisible(allMannequins[p], true);
        updateMannequin(allMannequins[p], pose);
      }
    }

    // Set initial frame
    updateFrame(parsed.frames[0]);

    // Animation loop
    const clock = new THREE.Clock();
    let lastTimeUpdate = 0;

    function animate() {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      controls.update();

      const state = mixerStateRef.current;
      if (state.isPlaying) {
        state.elapsed += delta * state.speed;
        const frameIndex = Math.floor(state.elapsed * parsed!.fps);

        if (frameIndex >= parsed!.frames.length) {
          state.elapsed = 0;
          state.currentFrame = 0;
        } else {
          state.currentFrame = frameIndex;
        }

        updateFrame(parsed!.frames[state.currentFrame]);

        lastTimeUpdate += delta;
        if (lastTimeUpdate > 0.1) {
          setCurrentTime(state.elapsed);
          lastTimeUpdate = 0;
        }
      }

      renderer.render(scene, camera);
    }

    animate();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      allGeometries.forEach((g) => g.dispose());
      allMaterials.forEach((m) => m.dispose());
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
    };
  }, [parsed]);

  if (!parsed) {
    return <div className={styles.noWebGL}>Invalid pose data</div>;
  }

  if (!webGLSupported) {
    return <div className={styles.noWebGL}>WebGL is not supported in your browser</div>;
  }

  return (
    <div className={styles.viewerContainer}>
      <div ref={containerRef} className={styles.canvas} />
      <div className={styles.controls}>
        <button className={styles.playButton} onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? "II" : "\u25B6"}
        </button>

        <div className={styles.progressContainer}>
          <span className={styles.timeDisplay}>{formatTime(currentTime)}</span>
          <div className={styles.progressBar} onClick={seekTo}>
            <div
              className={styles.progressFill}
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <span className={styles.timeDisplay}>{formatTime(duration)}</span>
        </div>

        <div className={styles.speedControls}>
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              className={`${styles.speedButton} ${speed === s ? styles.active : ""}`}
              onClick={() => changeSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
