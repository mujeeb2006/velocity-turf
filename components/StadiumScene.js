"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function addPitchMarkings(scene) {
  const lineMaterial = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9 });
  const drawLine = (points, loop = false) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, 0.045, z)));
    scene.add(loop ? new THREE.LineLoop(geometry, lineMaterial) : new THREE.Line(geometry, lineMaterial));
  };
  const rectangle = (left, top, right, bottom) => drawLine([[left, top], [right, top], [right, bottom], [left, bottom]], true);

  rectangle(-7, -12, 7, 12);
  drawLine([[-7, 0], [7, 0]]);
  const circle = Array.from({ length: 65 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    return [Math.cos(angle) * 2.1, Math.sin(angle) * 2.1];
  });
  drawLine(circle, true);
  rectangle(-3.6, -12, 3.6, -8.8);
  rectangle(-3.6, 8.8, 3.6, 12);
  rectangle(-1.75, -12, 1.75, -10.2);
  rectangle(-1.75, 10.2, 1.75, 12);
}

function addGoal(scene, z, direction) {
  const material = new THREE.MeshStandardMaterial({ color: "#FFFFFF", metalness: 0.42, roughness: 0.3 });
  const netMaterial = new THREE.LineBasicMaterial({ color: "#EAF7FF", transparent: true, opacity: 0.6 });
  const frame = new THREE.Group();
  const postGeometry = new THREE.CylinderGeometry(0.055, 0.055, 2.15, 8);
  [-1.7, 1.7].forEach(x => {
    const post = new THREE.Mesh(postGeometry, material);
    post.position.set(x, 1.08, 0);
    frame.add(post);
  });
  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.4, 8), material);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.y = 2.16;
  frame.add(crossbar);
  const netPoints = [];
  for (let index = 0; index <= 8; index += 1) {
    const x = -1.7 + index * 0.425;
    netPoints.push(new THREE.Vector3(x, 0, 0.65), new THREE.Vector3(x, 2.15, 0.65));
    if (index <= 4) {
      const y = index * 0.5375;
      netPoints.push(new THREE.Vector3(-1.7, y, 0.65), new THREE.Vector3(1.7, y, 0.65));
    }
  }
  const net = new THREE.BufferGeometry().setFromPoints(netPoints);
  frame.add(new THREE.LineSegments(net, netMaterial));
  frame.position.z = z;
  frame.rotation.y = direction < 0 ? Math.PI : 0;
  scene.add(frame);
}

function addStands(scene) {
  const tierColors = ["#1769E8", "#18A8E0", "#48D6E8", "#0E46A3"];
  const tierMaterials = tierColors.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.08 }));
  const tierCount = 6;
  const stands = new THREE.Group();

  for (let row = 0; row < tierCount; row += 1) {
    const height = 0.2 + row * 0.34;
    const sideTier = new THREE.BoxGeometry(0.76, 0.3, 29.5);
    const sideLeft = new THREE.Mesh(sideTier, tierMaterials[row % tierMaterials.length]);
    sideLeft.position.set(-8.15 - row * 0.75, height, 0);
    const sideRight = sideLeft.clone();
    sideRight.position.x *= -1;
    stands.add(sideLeft, sideRight);

    const endTier = new THREE.BoxGeometry(17.5, 0.3, 0.76);
    const endNear = new THREE.Mesh(endTier, tierMaterials[row % tierMaterials.length]);
    endNear.position.set(0, height, 12.55 + row * 0.75);
    const endFar = endNear.clone();
    endFar.position.z *= -1;
    stands.add(endNear, endFar);
  }
  scene.add(stands);

  const crowdGeometry = new THREE.SphereGeometry(0.085, 7, 6);
  const crowdMaterial = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.04, vertexColors: true, emissive: "#1769E8", emissiveIntensity: 0.15 });
  const crowdCapacity = tierCount * (76 * 2 + 44 * 2);
  const crowd = new THREE.InstancedMesh(crowdGeometry, crowdMaterial, crowdCapacity);
  const colorsForCrowd = ["#C8F542", "#18A8E0", "#1769E8", "#48D6E8", "#FFFFFF", "#F1EEFF"];
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  let index = 0;
  for (let row = 0; row < tierCount; row += 1) {
    for (let seat = 0; seat < 76; seat += 1) {
      const z = -13.8 + seat * 0.37;
      for (const side of [-1, 1]) {
        const seatOffset = ((seat * 13 + row * 7) % 9) * 0.045;
        dummy.position.set(side * (8.15 + row * 0.75 + seatOffset), 0.48 + row * 0.34 + seatOffset, z);
        dummy.scale.set(0.9, 1.35, 0.9);
        dummy.updateMatrix();
        crowd.setMatrixAt(index, dummy.matrix);
        tint.set(colorsForCrowd[(seat * 7 + row * 3) % colorsForCrowd.length]);
        crowd.setColorAt(index, tint);
        index += 1;
      }
    }
    for (let seat = 0; seat < 44; seat += 1) {
      const x = -8.3 + seat * 0.385;
      for (const side of [-1, 1]) {
        const seatOffset = ((seat * 11 + row * 5) % 9) * 0.04;
        dummy.position.set(x, 0.48 + row * 0.34 + seatOffset, side * (12.55 + row * 0.75 + seatOffset));
        dummy.scale.set(0.9, 1.35, 0.9);
        dummy.updateMatrix();
        crowd.setMatrixAt(index, dummy.matrix);
        tint.set(colorsForCrowd[(seat * 5 + row * 2 + 1) % colorsForCrowd.length]);
        crowd.setColorAt(index, tint);
        index += 1;
      }
    }
  }
  crowd.count = index;
  scene.add(crowd);
}

function addRoofAndLights(scene) {
  const roofMaterial = new THREE.MeshStandardMaterial({ color: "#172B4D", roughness: 0.48, metalness: 0.38 });
  const beamMaterial = new THREE.MeshStandardMaterial({ color: "#718096", roughness: 0.52, metalness: 0.62 });
  const supportGeometry = new THREE.CylinderGeometry(0.12, 0.2, 8.6, 8);

  for (const side of [-1, 1]) {
    if (side < 0) {
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.38, 32), roofMaterial);
      canopy.position.set(side * 12.75, 11.8, 0);
      canopy.rotation.z = -side * 0.06;
      scene.add(canopy);
    }

    for (const z of [-14, -7, 0, 7, 14]) {
      const support = new THREE.Mesh(supportGeometry, beamMaterial);
      support.position.set(side * 14.2, 4.25, z);
      scene.add(support);
    }

    const fascia = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.72, 32),
      new THREE.MeshStandardMaterial({ color: "#1769E8", emissive: "#18A8E0", emissiveIntensity: 0.55, roughness: 0.38 })
    );
    fascia.position.set(side * 14.45, 7.9, 0);
    scene.add(fascia);

    if (side < 0) {
      for (const z of [-12, -6, 0, 6, 12]) {
        const truss = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 0.16), beamMaterial);
        truss.position.set(side * 12.75, 11.52, z);
        truss.rotation.z = -side * 0.06;
        scene.add(truss);
      }
    }
  }

  {
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(19, 0.38, 3.2), roofMaterial);
    canopy.position.set(0, 11.3, -17);
    scene.add(canopy);
  }

  const poleMaterial = new THREE.MeshStandardMaterial({ color: "#718096", roughness: 0.42, metalness: 0.68 });
  const bankMaterial = new THREE.MeshStandardMaterial({
    color: "#EAF7FF",
    emissive: "#C8F542",
    emissiveIntensity: 3.5,
    roughness: 0.25,
  });
  for (const x of [-14.5, 14.5]) {
    for (const z of [-15.5, 15.5]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 10.8, 8), poleMaterial);
      mast.position.set(x, 5.4, z);
      scene.add(mast);
      const flood = new THREE.PointLight(0x48D6E8, 380, 42, 2);
      flood.position.set(x * 0.94, 10.4, z * 0.94);
      scene.add(flood);

      const bank = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.16), bankMaterial);
      bank.position.set(x * 0.94, 10.8, z * 0.94);
      scene.add(bank);

      const lensMaterial = new THREE.MeshBasicMaterial({ color: "#C8F542" });
      const lenses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), lensMaterial, 8);
      const lens = new THREE.Object3D();
      for (let i = 0; i < 8; i += 1) {
        lens.position.set(x * 0.94 - 0.58 + i * 0.165, 10.8, z * 0.94 + 0.09);
        lens.updateMatrix();
        lenses.setMatrixAt(i, lens.matrix);
      }
      scene.add(lenses);
    }
  }

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 1.65, 0.36),
    new THREE.MeshStandardMaterial({ color: "#172B4D", roughness: 0.35, metalness: 0.18, emissive: "#0E46A3", emissiveIntensity: 0.6 })
  );
  board.position.set(0, 6.25, -15.1);
  scene.add(board);
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(5.65, 1.12),
    new THREE.MeshBasicMaterial({ color: "#C8F542" })
  );
  display.position.set(0, 6.25, -14.91);
  scene.add(display);
  const displayStripeMaterial = new THREE.MeshBasicMaterial({ color: "#1769E8" });
  for (let i = 0; i < 9; i += 1) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(i % 3 === 0 ? 0.58 : 0.23, 0.045, 0.02), displayStripeMaterial);
    stripe.position.set(-2.35 + i * 0.58, 6.25 + (i % 2 ? 0.23 : -0.23), -14.89);
    scene.add(stripe);
  }
}

function addBall(scene) {
  const ball = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.47, 32, 24),
    new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.4, metalness: 0.02 })
  );
  ball.add(shell);
  const patchGeometry = new THREE.CircleGeometry(0.105, 5);
  const patchMaterial = new THREE.MeshStandardMaterial({ color: "#172B4D", roughness: 0.58, side: THREE.DoubleSide });
  const golden = (1 + Math.sqrt(5)) / 2;
  const directions = [
    [0, 1, golden], [0, 1, -golden], [0, -1, golden], [0, -1, -golden],
    [1, golden, 0], [1, -golden, 0], [-1, golden, 0], [-1, -golden, 0],
    [golden, 0, 1], [golden, 0, -1], [-golden, 0, 1], [-golden, 0, -1],
  ];
  directions.forEach((direction) => {
    const normal = new THREE.Vector3(...direction).normalize();
    const patch = new THREE.Mesh(patchGeometry, patchMaterial);
    patch.position.copy(normal.clone().multiplyScalar(0.462));
    patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    ball.add(patch);
  });
  ball.position.set(-1.1, 0.5, 2.8);
  scene.add(ball);
  return ball;
}

function addPitchDetails(scene) {
  const boardMaterial = new THREE.MeshStandardMaterial({ color: "#EAF7FF", roughness: 0.52, metalness: 0.18, emissive: "#1769E8", emissiveIntensity: 0.16 });
  const touchline = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 24.5), boardMaterial);
  touchline.position.set(-7.22, 0.28, 0);
  const oppositeTouchline = touchline.clone();
  oppositeTouchline.position.x *= -1;
  scene.add(touchline, oppositeTouchline);

  for (const z of [-12.15, 12.15]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.58, 0.16), boardMaterial);
    board.position.set(0, 0.28, Math.sign(z) * 12.85);
    scene.add(board);
  }

  const flagMaterial = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.3, metalness: 0.35 });
  const flagGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.74, 6);
  const flagMaterialCloth = new THREE.MeshBasicMaterial({ color: "#C8F542", side: THREE.DoubleSide });
  for (const x of [-7, 7]) {
    for (const z of [-12, 12]) {
      const pole = new THREE.Mesh(flagGeometry, flagMaterial);
      pole.position.set(x, 0.37, z);
      scene.add(pole);
      const pennant = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.1, 0),
        new THREE.Vector3(x < 0 ? 0.32 : -0.32, -0.02, 0),
        new THREE.Vector3(0, -0.2, 0),
      ]), flagMaterialCloth);
      pennant.position.set(x, 0.69, z);
      scene.add(pennant);
    }
  }

  const playerPositions = [
    [-4.8, -5.8], [-2.2, -8.1], [1.6, -6.4], [4.5, -3.2],
    [-5.3, 1.8], [-2.8, 4.8], [2.2, 2.3], [5.1, 7.2],
    [-0.5, -1.9], [0.9, 8.6], [-3.7, 9.3], [3.6, -9.1],
  ];
  const playerColors = ["#1769E8", "#C8F542", "#FFFFFF", "#18A8E0"];
  const playerGeometry = new THREE.CapsuleGeometry(0.09, 0.3, 3, 6);
  const headGeometry = new THREE.SphereGeometry(0.075, 8, 6);
  const playerMaterials = playerColors.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.48, emissive: color, emissiveIntensity: 0.1 }));
  playerPositions.forEach(([x, z], index) => {
    const player = new THREE.Group();
    const torso = new THREE.Mesh(playerGeometry, playerMaterials[index % playerMaterials.length]);
    torso.position.y = 0.28;
    const head = new THREE.Mesh(headGeometry, new THREE.MeshStandardMaterial({ color: "#b77b56", roughness: 0.72 }));
    head.position.y = 0.55;
    player.add(torso, head);
    player.position.set(x, 0.06, z);
    player.rotation.y = (index * 1.7) % (Math.PI * 2);
    scene.add(player);
  });
}

export default function StadiumScene({ className = "" }) {
  const host = useRef(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power", preserveDrawingBuffer: true });
    } catch {
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 140);
    camera.position.set(21, 22, 31);
    camera.lookAt(0, 1.8, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.appendChild(renderer.domElement);

    scene.background = new THREE.Color("#EAF7FF");
    scene.fog = new THREE.FogExp2("#EAF7FF", 0.018);
    scene.add(new THREE.HemisphereLight(0x18A8E0, 0xEAF7FF, 1.2));
    const keyLight = new THREE.DirectionalLight(0x18A8E0, 2.6);
    keyLight.position.set(-14, 24, -12);
    scene.add(keyLight);
    const voltLight = new THREE.DirectionalLight(0xC8F542, 2.0);
    voltLight.position.set(16, 24, 16);
    scene.add(voltLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(38, 46),
      new THREE.MeshStandardMaterial({ color: "#D0E8F8", roughness: 0.92, metalness: 0.06 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.16;
    scene.add(ground);

    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 24),
      new THREE.MeshStandardMaterial({ color: "#1CA95E", roughness: 0.88, metalness: 0.04 })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.y = 0;
    scene.add(pitch);

    const stripeMaterial = new THREE.MeshStandardMaterial({ color: "#22B768", roughness: 0.90 });
    for (let stripe = 0; stripe < 8; stripe += 1) {
      if (stripe % 2 === 0) continue;
      const grassStripe = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), stripeMaterial);
      grassStripe.rotation.x = -Math.PI / 2;
      grassStripe.position.set(0, 0.012, -10.5 + stripe * 3);
      scene.add(grassStripe);
    }

    addPitchMarkings(scene);
    addPitchDetails(scene);
    addGoal(scene, -12.1, -1);
    addGoal(scene, 12.1, 1);
    addStands(scene);
    addRoofAndLights(scene);
    const ball = addBall(scene);

    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element);
    resize();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = new THREE.Timer();
    timer.connect(document);
    const ballStart = ball.position.clone();

    let frameId;
    const animate = () => {
      timer.update();
      const elapsed = timer.getElapsed();
      if (!reducedMotion) {
        camera.position.x = 21 + Math.sin(elapsed * 0.22) * 2.2;
        camera.position.z = 31 + Math.cos(elapsed * 0.18) * 2.6;
        camera.lookAt(0, 1.8, 0);
        ball.position.y = ballStart.y + Math.abs(Math.sin(elapsed * 2.6)) * 0.22;
        ball.rotation.y = elapsed * 1.8;
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.dispose();
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    };
  }, []);

  return <div ref={host} className={className} style={{ width: "100%", height: "100%", overflow: "hidden" }} />;
}
