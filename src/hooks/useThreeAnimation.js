import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const useThreeAnimation = (containerRef) => {
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    camera.position.set(0, 30, 100);
    camera.lookAt(0, 0, 0);

    // Create Numus logo sphere
    const numusLogoTexture = new THREE.TextureLoader().load('/logo.svg');
    const numusSphereGeometry = new THREE.SphereGeometry(10, 64, 64);
    const numusSphereMaterial = new THREE.MeshPhongMaterial({ 
      map: numusLogoTexture,
      emissive: 0x0099FF,
      emissiveIntensity: 0.5,
      specular: 0xFFFFFF,
      shininess: 100
    });
    const numusSphere = new THREE.Mesh(numusSphereGeometry, numusSphereMaterial);
    scene.add(numusSphere);

    // Create orbiting chains
    const chainGroup = new THREE.Group();
    const chainColors = [0x4DBFFF, 0x1AACFF, 0x007ACC, 0x005C99, 0x003D66];
    const orbitRadii = [25, 35, 45, 55, 65];

    orbitRadii.forEach((radius, index) => {
      const chainGeometry = new THREE.TorusGeometry(radius, 0.5, 16, 100);
      const chainMaterial = new THREE.MeshPhongMaterial({ 
        color: chainColors[index],
        specular: 0xFFFFFF,
        shininess: 50,
        transparent: true,
        opacity: 0.7
      });
      const chain = new THREE.Mesh(chainGeometry, chainMaterial);
      chain.rotation.x = Math.random() * Math.PI;
      chain.rotation.y = Math.random() * Math.PI;
      chainGroup.add(chain);

      // Add nodes to each chain
      const nodeCount = 5 + index * 2;
      for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * Math.PI * 2;
        const nodeGeometry = new THREE.IcosahedronGeometry(1, 0);
        const nodeMaterial = new THREE.MeshPhongMaterial({ 
          color: chainColors[index],
          specular: 0xFFFFFF,
          shininess: 100,
          transparent: true,
          opacity: 0.9
        });
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
        node.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0
        );
        chain.add(node);
      }
    });

    scene.add(chainGroup);

    // Create connection lines
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0xB3E5FF,
      transparent: true, 
      opacity: 0.3 
    });
    const connectionLines = new THREE.Group();
    chainGroup.children.forEach(chain => {
      chain.children.forEach(node => {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          node.position,
          new THREE.Vector3(0, 0, 0)
        ]);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        connectionLines.add(line);
      });
    });
    scene.add(connectionLines);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xE6F7FF, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x0099FF, 1);
    pointLight.position.set(50, 50, 50);
    scene.add(pointLight);

    // Add subtle glow effect
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        viewVector: { type: "v3", value: camera.position }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          vec3 actual_normal = vec3(modelMatrix * vec4(normal, 0.0));
          intensity = pow( dot(normalize(viewVector), actual_normal), 6.0 );
        }
      `,
      fragmentShader: `
        varying float intensity;
        void main() {
          vec3 glow = vec3(0.0, 0.6, 1.0) * intensity;
          gl_FragColor = vec4( glow, 1.0 );
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const glowSphere = new THREE.Mesh(new THREE.SphereGeometry(11, 32, 32), glowMaterial);
    scene.add(glowSphere);

    const animate = () => {
      if (!rendererRef.current) return;
      requestAnimationFrame(animate);

      numusSphere.rotation.y += 0.005;
      chainGroup.rotation.y += 0.001;
      chainGroup.rotation.x += 0.0005;

      connectionLines.children.forEach(line => {
        line.geometry.setFromPoints([
          line.geometry.attributes.position.array.slice(3, 6),
          new THREE.Vector3(0, 0, 0)
        ]);
        line.geometry.attributes.position.needsUpdate = true;
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!rendererRef.current) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          object.material.dispose();
        }
      });
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      rendererRef.current = null;
    };

  }, [containerRef]);
};
