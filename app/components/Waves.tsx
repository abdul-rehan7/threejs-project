"use client";
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Noise from '../lib/noice'; // Ensure the correct import path

const Waves = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Listen for scroll events
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollPos / maxScroll, 1); // Clamp between 0 and 1
      setScrollProgress(progress);
      console.log('Scroll Progress:', progress); // Debugging
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Camera Position
    camera.position.x = 0;
    camera.position.y = 10;
    camera.position.z = 20;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Animation Parameters
    const rows = 100;
    const cols = 200;
    const separationX = 1;
    const separationZ = 1;
    const perlinScale = 0.02;
    const waveSpeed = 0.1;
    const waveHeight = 12;
    const FPS = 45;
    const startTime = new Date().getTime();

    // Seed the noise
    Noise.seed(Math.random());

    // Create Geometry
    const createGeometry = () => {
      const numParticles = cols * rows;
      const positions = new Float32Array(numParticles * 3);
      let i = 0;

      for (let ix = 0; ix < cols; ix++) {
        for (let iy = 0; iy < rows; iy++) {
          positions[i] = ix * separationX - (cols * separationX) / 2; // x
          positions[i + 1] = 0; // y
          positions[i + 2] = iy * separationZ - (rows * separationZ) / 2; // z
          i += 3;
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return geometry;
    };

    const geo = createGeometry();

    // Material (Red Color)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(0xff0000) }, // Red color
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec4 pos;

        void main() {
          vUv = uv;
          gl_PointSize = 2.5; // Adjust this value to change the dot size
          pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = pos;
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        varying vec2 vUv;
        varying vec4 pos;

        void main() {
          if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;
          gl_FragColor = vec4(color1, 1.0); // Use red color for all waves
        }
      `,
    });

    // Particles
    const particles = new THREE.Points(geo, material);
    scene.add(particles);

    // Animation Function: Perlin Noise Animation (Wave)
    const perlinAnimate = () => {
      const curTime = new Date().getTime();
      const positions = particles.geometry.attributes.position.array;
      let i = 0;

      for (let ix = 0; ix < cols; ix++) {
        for (let iy = 0; iy < rows; iy++) {
          const pX = ix * perlinScale + ((curTime - startTime) / 1000) * waveSpeed;
          const pZ = iy * perlinScale + ((curTime - startTime) / 1000) * waveSpeed;
          positions[i + 1] = Noise.simplex2(pX, pZ) * waveHeight;
          i += 3;
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
    };

    // Function to update particle positions to form a globe
    const updateGlobeEffect = () => {
      const positions = particles.geometry.attributes.position.array;
      let i = 0;

      // Spherical coordinates interpolation
      const radius = 10; // Radius of the sphere
      const thetaStep = (Math.PI * 2) / cols; // Angle step for X axis
      const phiStep = Math.PI / rows; // Angle step for Z axis

      for (let ix = 0; ix < cols; ix++) {
        for (let iy = 0; iy < rows; iy++) {
          const theta = ix * thetaStep;
          const phi = iy * phiStep;

          // Interpolate between wave grid and spherical coordinates
          const factor = scrollProgress; // Use scroll progress to interpolate
          const r = radius * (1 - factor); // Shrink radius with scroll
          positions[i] = r * Math.sin(phi) * Math.cos(theta);
          positions[i + 1] = r * Math.cos(phi); // Y position is the height
          positions[i + 2] = r * Math.sin(phi) * Math.sin(theta);

          i += 3;
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
    };

    // Render Function
    const render = () => {
      renderer.render(scene, camera);
    };

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Transition based on scroll progress
      if (scrollProgress < 0.2) {
        // Display waves while scrolling to the top
        perlinAnimate();
      } else if (scrollProgress < 1) {
        // As you scroll further, transition into the globe effect
        updateGlobeEffect();
      } else {
        // Fully form the globe
        updateGlobeEffect();
      }

      // Adjust the globe's position on Y-axis
      const centerY = Math.max(0, 10 - scrollProgress * 20); // Move it down as you scroll
      camera.position.y = centerY;

      render();
    };

    // Handle Window Resize
    const refreshCanvasState = () => {
      const wWidth = window.innerWidth;
      const wHeight = window.innerHeight;
      camera.aspect = wWidth / wHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(wWidth, wHeight);
    };

    window.addEventListener('resize', refreshCanvasState);
    animate();
    refreshCanvasState();

    // Cleanup
    return () => {
      window.removeEventListener('resize', refreshCanvasState);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [scrollProgress]);

  return <div ref={mountRef} />;
};

export default Waves;