import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

import { logger } from './logger.js';

export function darkenNonBloomed(object, { bloomLayer, darkMaterial, materials }) {
  if (object.isMesh && bloomLayer.test(object.layers) === false) {
    materials[object.uuid] = object.material;
    object.material = darkMaterial;
  }
}

export function restoreMaterial(object, materials) {
  if (materials[object.uuid]) {
    object.material = materials[object.uuid];
    delete materials[object.uuid];
  }
}

export function enhanceMaterials(
  object,
  {
    bloomScene,
    emissiveObjects,
    renderer,
    three = {
      LinearFilter: THREE.LinearFilter,
      LinearMipmapLinearFilter: THREE.LinearMipmapLinearFilter,
    },
  },
) {
  object.traverse((child) => {
    if (child.isMesh && child.material) {
      child.frustumCulled = false;
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];

      childMaterials.forEach((material) => {
        child.castShadow = true;
        child.receiveShadow = true;

        if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
          material.needsUpdate = true;

          if (material.normalMap) {
            material.normalScale.set(1, 1);
          }

          if (material.map) {
            material.map.generateMipmaps = true;
            material.map.minFilter = three.LinearMipmapLinearFilter;
            material.map.magFilter = three.LinearFilter;
            material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
          }

          if (material.emissive && material.emissive.getHex() > 0) {
            material.userData.originalEmissive = material.emissive.clone();
            material.userData.originalEmissiveIntensity = material.emissiveIntensity || 1.0;
            material.emissiveIntensity = (material.emissiveIntensity || 1.0) * 1.1;
            child.layers.enable(bloomScene);
            emissiveObjects.push(child);
          }
        }
      });
    }
  });
}

export function createPoweringScene(container, { onStatus, onComplete }) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 1, 3);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
    logarithmicDepthBuffer: true,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // High DPI support
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0); // Set clear color to transparent
  container.appendChild(renderer.domElement);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.5, 3)); // Super sampling

  // Layer setup for selective bloom
  const BLOOM_SCENE = 1;
  const bloomLayer = new THREE.Layers();
  bloomLayer.set(BLOOM_SCENE);

  // Create materials for bloom rendering
  const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' });
  const materials = {};

  // Post-processing setup with selective bloom
  const renderScene = new RenderPass(scene, camera);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    0.6, // strength - much more subtle
    0.3, // radius - smaller
    0.85, // threshold - higher to only affect bright emissive parts
  );

  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(renderScene);
  bloomComposer.addPass(bloomPass);

  const finalPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
      },
      vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
      fragmentShader: `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            vec4 base = texture2D(baseTexture, vUv);
            vec4 bloom = texture2D(bloomTexture, vUv);
            
            // Combine base and bloom, preserving alpha
            gl_FragColor = vec4(base.rgb + bloom.rgb, base.a);
          }
        `,
      transparent: true,
      defines: {},
    }),
    'baseTexture',
  );
  finalPass.needsSwap = true;

  const finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(renderScene);
  finalComposer.addPass(finalPass);

  // Lighting setup
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(5, 10, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 500;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 2.3);
  fillLight.position.set(-5, 8, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 2.0);
  rimLight.position.set(0, 2, -5);
  scene.add(rimLight);

  const softLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
  softLight1.position.set(3, -2, 2);
  scene.add(softLight1);

  const softLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
  softLight2.position.set(-3, -2, 2);
  scene.add(softLight2);

  const pointLight1 = new THREE.PointLight(0xffffff, 1, 10);
  pointLight1.position.set(2, 3, 2);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xffffff, 1, 10);
  pointLight2.position.set(-2, 3, 2);
  scene.add(pointLight2);

  const reflectionLight1 = new THREE.PointLight(0xffffff, 0.8, 8);
  reflectionLight1.position.set(0, 5, 0);
  scene.add(reflectionLight1);

  const reflectionLight2 = new THREE.PointLight(0xffffff, 0.6, 6);
  reflectionLight2.position.set(4, 2, -2);
  scene.add(reflectionLight2);

  const reflectionLight3 = new THREE.PointLight(0xffffff, 0.6, 6);
  reflectionLight3.position.set(-4, 2, -2);
  scene.add(reflectionLight3);

  const loader = new GLTFLoader();
  let mixer;
  let animationActions = [];
  let isSequenceComplete = false;
  let emissiveObjects = [];
  let poseDuration = 2000; // 2 seconds in milliseconds

  const listener = new THREE.AudioListener();
  camera.add(listener);
  const sound = new THREE.Audio(listener);
  const audioLoader = new THREE.AudioLoader();

  let audioBuffer = null;
  let modelLoaded = false;

  const darkenSceneObject = (object) =>
    darkenNonBloomed(object, { bloomLayer, darkMaterial, materials });
  const restoreSceneMaterial = (object) => restoreMaterial(object, materials);

  function startSynchronizedSequence() {
    if (!audioBuffer || !modelLoaded) return;

    // Record the start time for animation tracking

    // Start audio immediately (it will sync with the animation which includes pose)
    setTimeout(() => {}, poseDuration);

    // Start animations (which now include the 2-second pose at the beginning)
    animationActions.forEach((action) => {
      action.reset();
      action.play();
    });

    //Keep "Powering on..." text during pose mode (first 2 seconds)
    // The status text will change when the actual animation movement starts

    // Schedule status text changes based on animation timeline
    setTimeout(() => {
      onStatus('Powering ...');

      // Start bloom animation when actual movement begins (after pose)
      const bloomStartTime = Date.now();
      const bloomAnimation = () => {
        const elapsed = Date.now() - bloomStartTime;
        const progress = Math.min(elapsed / 3000, 1);

        // Very subtle pulse effect for bloom
        const pulse = Math.sin(elapsed * 0.004) * 0.2 + 0.8; // Gentler pulse
        bloomPass.strength = 0.4 + pulse * 0.2; // Much more subtle range (0.4-0.6)

        // Animate emissive intensity of emissive materials only - more subtle
        emissiveObjects.forEach((obj) => {
          if (obj.material) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

            materials.forEach((material) => {
              if (material.userData.originalEmissive) {
                const pulseFactor = 1.0 + pulse * 0.15; // Much gentler pulse
                material.emissiveIntensity =
                  material.userData.originalEmissiveIntensity * pulseFactor;
              }
            });
          }
        });

        if (progress < 1) {
          requestAnimationFrame(bloomAnimation);
        } else {
          // Reset to subtle bloom settings
          bloomPass.strength = 0.5; // Subtle final bloom

          // Reset emissive intensities to just slightly enhanced
          emissiveObjects.forEach((obj) => {
            if (obj.material) {
              const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

              materials.forEach((material) => {
                if (material.userData.originalEmissive) {
                  material.emissiveIntensity = material.userData.originalEmissiveIntensity * 1.1; // Just slightly enhanced
                }
              });
            }
          });
        }
      };
      bloomAnimation();
    }, 0); // Wait for pose duration before changing text and starting bloom

    // Schedule second status text change
    setTimeout(() => {
      onStatus('Self-awareness detected');

      sound.setBuffer(audioBuffer);
      sound.setLoop(false);
      sound.setVolume(0.5);
      sound.play();
    }, poseDuration + 200); // 200ms after animation movement starts

    // Calculate total sequence duration
    const longestDuration = Math.max(
      ...animationActions.map((action) => action.getClip().duration),
    );
    const audioDuration = audioBuffer.duration * 1000;
    const maxDuration = Math.max(longestDuration * 1000, audioDuration);

    // Schedule completion
    setTimeout(() => {
      if (!isSequenceComplete) {
        isSequenceComplete = true;
        onStatus('Initialization complete');
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    }, maxDuration + 500);
  }

  // Load audio
  audioLoader.load(
    '/models/pansophyVoice.mp3',
    (buffer) => {
      audioBuffer = buffer;
      startSynchronizedSequence();
    },
    undefined,
    (err) => {
      logger.error('powering.audio_load_failed', {}, err);
      audioBuffer = { duration: 0 };
      startSynchronizedSequence();
    },
  );

  // Load model
  loader.load(
    '/models/pansophyBot2.glb',
    (gltf) => {
      scene.add(gltf.scene);

      // Enhance materials and setup selective bloom
      enhanceMaterials(gltf.scene, {
        bloomScene: BLOOM_SCENE,
        emissiveObjects,
        renderer,
      });

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(gltf.scene);

        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce);
          action.clampWhenFinished = true;
          animationActions.push(action);
        });
      }

      modelLoaded = true;
      startSynchronizedSequence();
    },
    undefined,
    (error) => {
      logger.error('powering.model_load_failed', {}, error);
      setTimeout(() => {
        onStatus('Initialization complete');
        onComplete();
      }, 5000);
    },
  );

  window.addEventListener('resize', onWindowResize, false);
  function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    bloomComposer.setSize(container.clientWidth, container.clientHeight);
    finalComposer.setSize(container.clientWidth, container.clientHeight);

    // Update bloom pass resolution
    bloomPass.setSize(container.clientWidth, container.clientHeight);
  }

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    // Render scene for bloom
    scene.traverse(darkenSceneObject);
    bloomComposer.render(0);
    scene.traverse(restoreSceneMaterial);

    // Render final scene
    finalPass.uniforms.bloomTexture.value = bloomComposer.renderTarget2.texture;
    finalComposer.render(0);
  }
  animate();

  return () => {
    window.removeEventListener('resize', onWindowResize);
    if (sound.isPlaying) sound.stop();
    if (container && renderer.domElement) {
      container.removeChild(renderer.domElement);
    }
  };
}
