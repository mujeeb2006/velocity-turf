"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function addPitchMarkings(scene) {
  const lineMaterial = new THREE.LineBasicMaterial({ color: "#e3f5df", transparent: true, opacity: 0.8 });
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
  const material = new THREE.MeshStandardMaterial({ color: "#d8e2d8", metalness: 0.35, roughness: 0.42 });
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
  frame.position.z = z;
  frame.rotation.y = direction < 0 ? Math.PI : 0;
  scene.add(frame);
}

function addStands(scene) {
  const colors = ["#153c31", "#194638", "#205340", "#163b30"];
  const material = colors.map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.92 }));
  for (let row = 0; row < 5; row += 1) {
    const tier = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.24, 26.8), material[row % material.length]);
    tier.position.set(8.1 + row * 0.65, 0.13 + row * 0.25, 0);
    scene.add(tier);
    const oppositeTier = tier.clone();
    oppositeTier.position.x *= -1;
    scene.add(oppositeTier);
  }

  const crowdGeometry = new THREE.SphereGeometry(0.075, 7, 6);
  const crowdMaterial = new THREE.MeshStandardMaterial({ roughness: 0.8, vertexColors: true });
  const crowd = new THREE.InstancedMesh(crowdGeometry, crowdMaterial, 760);
  const colorsForCrowd = ["#d4ff4f", "#dce5de", "#70b899", "#f0a56b", "#7392a0"];
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  let index = 0;
  for (let row = 0; row < 5; row += 1) {
    for (let seat = 0; seat < 76; seat += 1) {
      const z = -12.8 + seat * 0.34;
      for (const side of [-1, 1]) {
        dummy.position.set(side * (8.25 + row * 0.65), 0.39 + row * 0.25, z);
        dummy.scale.set(1, 1.2, 0.8);
        dummy.updateMatrix();
        crowd.setMatrixAt(index, dummy.matrix);
        tint.set(colorsForCrowd[(seat * 7 + row * 3) % colorsForCrowd.length]);
        crowd.setColorAt(index, tint);
        index += 1;
      }
    }
  }
  crowd.count = index;
  scene.add(crowd);
}

function addBall(scene) {
  const ball = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.47, 32, 24),
    new THREE.MeshStandardMaterial({ color: "#f5f5e9", roughness: 0.4, metalness: 0.02 })
  );
  ball.add(shell);
  const patches = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.29, 0),
    new THREE.MeshStandardMaterial({ color: "#163027", roughness: 0.56, flatShading: true })
  );
  patches.scale.set(1, 0.08, 1);
  patches.position.y = 0.2;
  ball.add(patches);
  ball.position.set(-1.1, 0.5, 2.8);
  scene.add(ball);
  return ball;
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
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(18, 17, 24);
    camera.lookAt(0, 0.5, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xc5f4db, 0x07150e, 2.2));
    const keyLight = new THREE.DirectionalLight(0xd4ff4f, 3.5);
    keyLight.position.set(-9, 16, -7);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x71b8ff, 2.2);
    fillLight.position.set(10, 12, 9);
    scene.add(fillLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(19, 31),
      new THREE.MeshStandardMaterial({ color: "#0b1710", roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.16;
    scene.add(ground);

    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 24),
      new THREE.MeshStandardMaterial({ color: "#176342", roughness: 0.94 })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.y = 0;
    scene.add(pitch);

    const stripeMaterial = new THREE.MeshStandardMaterial({ color: "#1b704a", roughness: 0.96 });
    for (let stripe = 0; stripe < 8; stripe += 1) {
      if (stripe % 2 === 0) continue;
      const grassStripe = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), stripeMaterial);
      grassStripe.rotation.x = -Math.PI / 2;
      grassStripe.position.set(0, 0.012, -10.5 + stripe * 3);
      scene.add(grassStripe);
    }

    addPitchMarkings(scene);
    addGoal(scene, -12.1, -1);
    addGoal(scene, 12.1, 1);
    addStands(scene);
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
    let frame = 0;
    let animationId;
    const animate = () => {
      ball.rotation.y += 0.002;
      frame += 1;
      if (frame % 2 === 0) renderer.render(scene, camera);
      animationId = window.requestAnimationFrame(animate);
    };
    if (!reducedMotion) animationId = window.requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      if (animationId) window.cancelAnimationFrame(animationId);
      scene.traverse(object => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach(item => item.dispose());
        else object.material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className={`vt-stadium-scene ${className}`} aria-hidden="true" />;
}
