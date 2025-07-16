<!-- <script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

  let statusText = "Powering on ...";
  let container;

  onMount(() => {
    const scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x202020);

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 1.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 6);
    scene.add(ambientLight);
    
    const centerLight = new THREE.DirectionalLight(0xffffff, 1.5);
    centerLight.position.set(0, -6, 0);

    scene.add(centerLight);
    
    const lightLeft = new THREE.DirectionalLight(0xffffff, 1);
    lightLeft.position.set(2, -1, 0); 

    scene.add(lightLeft);

    const lightRight = new THREE.DirectionalLight(0xffffff, 1)
    lightRight.position.set(-2, -1, 0);

    scene.add(lightRight);

    const directionalLightLeft = new THREE.DirectionalLight(0xffffff, 3);
    directionalLightLeft.position.set(3, 4, 3);
    scene.add(directionalLightLeft);

    const directionalLightRight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLightRight.position.set(-3, 4, 3);
    scene.add(directionalLightRight);

    const loader = new GLTFLoader();
    let mixer;

    const listener = new THREE.AudioListener();
    camera.add(listener);
    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();

    loader.load(
      '/models/pansophyBot.glb',
      (gltf) => {
        scene.add(gltf.scene);
        statusText = "Consciousness activated";

        setTimeout(() => {
          statusText = "Self-awareness detected";
        }, 2200);

        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(gltf.scene);
          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            action.play();
          });
        } else {
          console.warn('No animations found in GLB model.');
        }

        audioLoader.load(
          '/models/pansophyVoice.mp3',
          (buffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(false);
            sound.setVolume(0.5);
            sound.play();
          },
          undefined,
          (err) => {
            console.error('An error happened while loading the audio:', err);
          }
        );
      },
      undefined,
      (error) => {
        console.error('An error happened while loading the model', error);
      }
    );

    window.addEventListener('resize', onWindowResize, false);
    function onWindowResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }

    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);

      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      window.removeEventListener('resize', onWindowResize);
      container.removeChild(renderer.domElement);
    };
  });
</script>

<div class="flex flex-col items-center justify-center w-full">
    <div bind:this={container} class="w-full h-[400px] overflow-hidden bg-transparent"></div>
    <div class="w-full flex justify-center">
        <p class="text-white font-poppins text-[20px]">{statusText}</p>
    </div>
</div> -->














<!-- <script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { push } from 'svelte-spa-router';
  
  let statusText = "Powering on ...";
  let container;
  
  onMount(() => {
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 1.5);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 6);
    scene.add(ambientLight);
    
    const centerLight = new THREE.DirectionalLight(0xffffff, 1.5);
    centerLight.position.set(0, -6, 0);
    scene.add(centerLight);
    
    const lightLeft = new THREE.DirectionalLight(0xffffff, 1);
    lightLeft.position.set(2, -1, 0);
    scene.add(lightLeft);
    
    const lightRight = new THREE.DirectionalLight(0xffffff, 1);
    lightRight.position.set(-2, -1, 0);
    scene.add(lightRight);
    
    const directionalLightLeft = new THREE.DirectionalLight(0xffffff, 3);
    directionalLightLeft.position.set(3, 4, 3);
    scene.add(directionalLightLeft);
    
    const directionalLightRight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLightRight.position.set(-3, 4, 3);
    scene.add(directionalLightRight);
    
    const loader = new GLTFLoader();
    let mixer;
    let animationFinished = false;
    
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    
    // Function to navigate to EULA
    function navigateToEula() {
      setTimeout(() => {
        push('/eula');
      }, 1000); // Small delay for smooth transition
    }
    
    loader.load(
      '/models/pansophyBot.glb',
      (gltf) => {
        scene.add(gltf.scene);
        statusText = "Consciousness activated";
        
        setTimeout(() => {
          statusText = "Self-awareness detected";
        }, 2200);
        
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(gltf.scene);
          let completedAnimations = 0;
          const totalAnimations = gltf.animations.length;
          
          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce); // Play animation only once
            action.clampWhenFinished = true; // Keep final pose
            action.play();
            
            // Listen for animation completion
            mixer.addEventListener('finished', (event) => {
              completedAnimations++;
              if (completedAnimations >= totalAnimations && !animationFinished) {
                animationFinished = true;
                statusText = "Initialization complete";
                navigateToEula();
              }
            });
          });
        } else {
          console.warn('No animations found in GLB model.');
          // If no animations, navigate after a delay
          setTimeout(() => {
            statusText = "Initialization complete";
            navigateToEula();
          }, 4000);
        }
        
        audioLoader.load(
          '/models/pansophyVoice.mp3',
          (buffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(false);
            sound.setVolume(0.5);
            sound.play();
            
            // Also listen for audio completion
            sound.onEnded = () => {
              if (!animationFinished) {
                // If audio finishes before animation, wait a bit more
                setTimeout(() => {
                  if (!animationFinished) {
                    animationFinished = true;
                    statusText = "Initialization complete";
                    navigateToEula();
                  }
                }, 2000);
              }
            };
          },
          undefined,
          (err) => {
            console.error('An error happened while loading the audio:', err);
            // Navigate even if audio fails
            setTimeout(() => {
              if (!animationFinished) {
                animationFinished = true;
                statusText = "Initialization complete";
                navigateToEula();
              }
            }, 5000);
          }
        );
      },
      undefined,
      (error) => {
        console.error('An error happened while loading the model', error);
        // Navigate even if model fails to load
        setTimeout(() => {
          statusText = "Initialization complete";
          navigateToEula();
        }, 3000);
      }
    );
    
    window.addEventListener('resize', onWindowResize, false);
    function onWindowResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    const clock = new THREE.Clock();
    
    function animate() {
      requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      
      renderer.render(scene, camera);
    }
    animate();
    
    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  });
</script>

<div class="flex flex-col items-center justify-center w-full">
  <div bind:this={container} class="w-full h-[400px] overflow-hidden bg-transparent"></div>
  <div class="w-full flex justify-center">
    <p class="text-white font-poppins text-[20px]">{statusText}</p>
  </div>
</div> -->

<!-- OLD -->

 <!-- <script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import { push } from 'svelte-spa-router';
  
  let statusText = "Powering on ...";
  let container;
  
  onMount(() => {
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better tone mapping
  renderer.toneMappingExposure = 0.5;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.physicallyBasedRendering = true;
    container.appendChild(renderer.domElement);
    
    // Post-processing setup
   const composer = new EffectComposer(renderer);

   // Render pass - renders the scene normally
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  // Bloom pass - subtle bloom effect
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    0.5,  // strength - reduced for subtle bloom
    0.3,  // radius - smaller radius
    0.9   // threshold - higher threshold for less bloom
  );
  composer.addPass(bloomPass);
  
  // Lighting setup (enhanced for bloom)
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(5, 10, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 500;
  scene.add(keyLight);
  
  // Fill light - softer illumination from opposite side
  const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
  fillLight.position.set(-5, 8, 3);
  scene.add(fillLight);
  
  // Rim light - for edge definition
  const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
  rimLight.position.set(0, 2, -5);
  scene.add(rimLight);
  
  // Additional soft lights for even illumination
  const softLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  softLight1.position.set(3, -2, 2);
  scene.add(softLight1);
  
  const softLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
  softLight2.position.set(-3, -2, 2);
  scene.add(softLight2);
  
  // Point lights for additional detail
  const pointLight1 = new THREE.PointLight(0xffffff, 1, 10);
  pointLight1.position.set(2, 3, 2);
  scene.add(pointLight1);
  
  const pointLight2 = new THREE.PointLight(0xffffff, 1, 10);
  pointLight2.position.set(-2, 3, 2);
  scene.add(pointLight2);
  
  // Additional lights for better metallic reflections
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
    
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    
    // Store both audio and model loading promises
    let audioBuffer = null;
    let modelLoaded = false;


    // Create environment map for metallic reflections
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
  const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
  scene.add(cubeCamera);
  
  // Function to enhance materials for better quality
  function enhanceMaterials(object) {
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach(material => {
          // Enable shadow casting and receiving
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Enhance material properties for better quality
          if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            // Improve material rendering
            material.needsUpdate = true;
            
            // Enhance existing emissive properties
            if (material.emissive && material.emissive.getHex() > 0) {
              material.userData.originalEmissive = material.emissive.clone();
              material.userData.originalEmissiveIntensity = material.emissiveIntensity || 1.0;
              material.emissiveIntensity = (material.emissiveIntensity || 1.0) * 1.3;
            }
            
            // Detect and enhance metallic materials
            const isMetallic = material.metalness > 0.5 || 
                              (material.name && material.name.toLowerCase().includes('metal')) ||
                              (material.color && material.color.getHSL({}).s < 0.3); // Low saturation often indicates metal
            
            if (isMetallic) {
              // Make it more metallic
              material.metalness = Math.min(1.0, material.metalness * 1.2 + 0.2);
              
              // Reduce roughness for shinier appearance
              material.roughness = Math.max(0.05, material.roughness * 0.3);
              
              // Add environment map for reflections
              material.envMap = cubeRenderTarget.texture;
              material.envMapIntensity = 1.5;
              
              // Enhance color contrast for metallic look
              if (material.color) {
                const hsl = {};
                material.color.getHSL(hsl);
                // Reduce saturation and adjust lightness for metallic appearance
                material.color.setHSL(hsl.h, Math.max(0.1, hsl.s * 0.5), Math.min(0.9, hsl.l * 1.1));
              }
              
              console.log(`Enhanced metallic material: ${material.name || 'unnamed'}`);
            } else {
              // Non-metallic materials - slight roughness adjustment
              if (material.roughness !== undefined) {
                material.roughness = Math.max(0.1, material.roughness * 0.8);
              }
              
              // Keep low metalness for non-metallic parts
              if (material.metalness !== undefined) {
                material.metalness = Math.min(0.1, material.metalness);
              }
            }
          }
        });
      }
    });
  }


  function enhanceEmissiveMaterials(object) {
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach(material => {
          // Only enhance materials that already have emissive properties
          if (material.emissive && material.emissive.getHex() > 0) {
            // Store original emissive values
            material.userData.originalEmissive = material.emissive.clone();
            material.userData.originalEmissiveIntensity = material.emissiveIntensity || 1.0;
            
            // Enhance the existing emissive properties subtly
            material.emissiveIntensity = (material.emissiveIntensity || 1.0) * 1.2;
          }
        });
      }
    });
  }






    
    function startSynchronizedSequence() {
      if (!audioBuffer || !modelLoaded) return;
      
      // Subtle bloom enhancement during activation
      bloomPass.strength = 5;
      bloomPass.threshold = 5;

      // Start audio
      sound.setBuffer(audioBuffer);
      sound.setLoop(false);
      sound.setVolume(0.5);
      sound.play();
      
      // Start animations at the same time
      animationActions.forEach(action => {
        action.reset();
        action.play();
      });
      
      statusText = "Consciousness activated";
      const bloomAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 3000, 1); // 3 second animation
      
      // Gentle pulse effect for bloom
      const pulse = Math.sin(elapsed * 0.006) * 0.3 + 0.7; // Subtle pulse
      bloomPass.strength = 0.4 + pulse * 0.3; // Much more subtle range
      
      // Animate emissive intensity of existing emissive materials
      if (loadedModel) {
        loadedModel.traverse((child) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            
            materials.forEach(material => {
              if (material.userData.originalEmissive) {
                const pulseFactor = 1.0 + pulse * 0.3; // Gentle pulse
                material.emissiveIntensity = material.userData.originalEmissiveIntensity * pulseFactor;
              }
            });
          }
        });
      }
      
      if (progress < 1) {
        requestAnimationFrame(bloomAnimation);
      } else {
        // Reset to minimal bloom settings
        bloomPass.strength = 0.3;
        bloomPass.threshold = 0.9; // Very high threshold for minimal bloom
        
        // Reset emissive intensities
        if (loadedModel) {
          loadedModel.traverse((child) => {
            if (child.isMesh && child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              
              materials.forEach(material => {
                if (material.userData.originalEmissive) {
                  material.emissiveIntensity = material.userData.originalEmissiveIntensity;
                }
              });
            }
          });
        }
      }
    };
    bloomAnimation();
      

      setTimeout(() => {
        statusText = "Self-awareness detected";
      }, 2200);
      
      // Get the longest animation duration
      const longestDuration = Math.max(...animationActions.map(action => action.getClip().duration));
      
      // Navigate when both audio and animation complete
      const audioDuration = audioBuffer.duration * 1000; // Convert to milliseconds
      const maxDuration = Math.max(longestDuration * 1000, audioDuration);
      
      setTimeout(() => {
        if (!isSequenceComplete) {
          isSequenceComplete = true;
          statusText = "Initialization complete";
          setTimeout(() => {
            //push('/eula');
          }, 1000);
        }
      }, maxDuration + 500); // Small buffer
    }
    
    // Load audio
    audioLoader.load(
      '/models/pansophyVoice.mp3',
      (buffer) => {
        audioBuffer = buffer;
        console.log(`Audio duration: ${buffer.duration} seconds`);
        startSynchronizedSequence();
      },
      undefined,
      (err) => {
        console.error('An error happened while loading the audio:', err);
        // Continue without audio
        audioBuffer = { duration: 0 };
        startSynchronizedSequence();
      }
    );
    
    // Load model
    loader.load(
      '/models/pansophyBot1.glb',
      (gltf) => {
        scene.add(gltf.scene);
        
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(gltf.scene);
          
          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            animationActions.push(action);
            console.log(`Animation "${clip.name}" duration: ${clip.duration} seconds`);
          });
        }
        
        modelLoaded = true;
        startSynchronizedSequence();
      },
      undefined,
      (error) => {
        console.error('An error happened while loading the model', error);
        // Fallback navigation
        setTimeout(() => {
          statusText = "Initialization complete";
         // push('/eula');
        }, 5000);
      }
    );
    
    window.addEventListener('resize', onWindowResize, false);
    function onWindowResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    const clock = new THREE.Clock();
    
    function animate() {
      requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      
      renderer.render(scene, camera);
    }
    animate();
    
    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (sound.isPlaying) sound.stop();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  });
</script>  -->


<!-- NEW -->

<!-- <script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
  import { push } from 'svelte-spa-router';
  
  let statusText = "Powering on ...";
  let container;
  
  onMount(() => {
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.physicallyBasedRendering = true;
    renderer.setClearColor(0x000000, 0); // Set clear color to transparent
    container.appendChild(renderer.domElement);
    
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
      0.6,  // strength - much more subtle
      0.3,  // radius - smaller
      0.85  // threshold - higher to only affect bright emissive parts
    );
    
    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);
    
    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture }
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
        defines: {}
      }),
      "baseTexture"
    );
    finalPass.needsSwap = true;
    
    const finalComposer = new EffectComposer(renderer);
    finalComposer.addPass(renderScene);
    finalComposer.addPass(finalPass);
    
    // Lighting setup
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.5);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 500;
    scene.add(keyLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 2.5);
    fillLight.position.set(-5, 8, 3);
    scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xffffff, 2.2);
    rimLight.position.set(0, 2, -5);
    scene.add(rimLight);
    
    const softLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    softLight1.position.set(3, -2, 2);
    scene.add(softLight1);
    
    const softLight2 = new THREE.DirectionalLight(0xffffff, 1.8);
    softLight2.position.set(-3, -2, 2);
    scene.add(softLight2);
    
    const pointLight1 = new THREE.PointLight(0xffffff, 1, 15);
    pointLight1.position.set(2, 3, 2);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xffffff, 1, 15);
    pointLight2.position.set(-2, 3, 2);
    scene.add(pointLight2);
    
    const reflectionLight1 = new THREE.PointLight(0xffffff, 0.8, 10);
    reflectionLight1.position.set(0, 5, 0);
    scene.add(reflectionLight1);
    
    const reflectionLight2 = new THREE.PointLight(0xffffff, 0.6, 10);
    reflectionLight2.position.set(4, 2, -2);
    scene.add(reflectionLight2);
    
    const reflectionLight3 = new THREE.PointLight(0xffffff, 0.6, 10);
    reflectionLight3.position.set(-4, 2, -2);
    scene.add(reflectionLight3);
    
    const loader = new GLTFLoader();
    let mixer;
    let animationActions = [];
    let isSequenceComplete = false;
    let loadedModel = null;
    let emissiveObjects = [];
    
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    
    let audioBuffer = null;
    let modelLoaded = false;
    
    // Remove the environment map and cube camera setup since we want to preserve original materials
    // const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
    // const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
    // scene.add(cubeCamera);
    
    // Function to darken non-emissive materials for bloom pass
    function darkenNonBloomed(obj) {
      if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
        materials[obj.uuid] = obj.material;
        obj.material = darkMaterial;
      }
    }
    
    // Function to restore original materials
    function restoreMaterial(obj) {
      if (materials[obj.uuid]) {
        obj.material = materials[obj.uuid];
        delete materials[obj.uuid];
      }
    }
    
    // Function to enhance materials and setup selective bloom - PRESERVE ORIGINAL APPEARANCE
    function enhanceMaterials(object) {
      object.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          
          materials.forEach(material => {
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
              // Only check for emissive properties - DON'T modify other material properties
              if (material.emissive && material.emissive.getHex() > 0) {
                // Store original values
                material.userData.originalEmissive = material.emissive.clone();
                material.userData.originalEmissiveIntensity = material.emissiveIntensity || 1.0;
                
                // Only slightly enhance emissive for bloom detection
                material.emissiveIntensity = (material.emissiveIntensity || 1.0) * 1.1;
                
                // Add to bloom layer
                child.layers.enable(BLOOM_SCENE);
                emissiveObjects.push(child);
                
                console.log(`Added emissive object to bloom layer: ${material.name || 'unnamed'}`);
              }
              
              // DON'T modify metalness, roughness, colors, or other properties
              // This preserves the original model appearance
            }
          });
        }
      });
    }
    
    function startSynchronizedSequence() {
      if (!audioBuffer || !modelLoaded) return;
      
      // Start audio
      sound.setBuffer(audioBuffer);
      sound.setLoop(false);
      sound.setVolume(0.5);
      sound.play();
      
      // Start animations
      animationActions.forEach(action => {
        action.reset();
        action.play();
      });
      
      statusText = "Consciousness activated";
      
      const startTime = Date.now();
      const bloomAnimation = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / 3000, 1);
        
        // Very subtle pulse effect for bloom
        const pulse = Math.sin(elapsed * 0.004) * 0.2 + 0.8; // Gentler pulse
        bloomPass.strength = 0.4 + pulse * 0.2; // Much more subtle range (0.4-0.6)
        
        // Animate emissive intensity of emissive materials only - more subtle
        emissiveObjects.forEach(obj => {
          if (obj.material) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            
            materials.forEach(material => {
              if (material.userData.originalEmissive) {
                const pulseFactor = 1.0 + pulse * 0.15; // Much gentler pulse
                material.emissiveIntensity = material.userData.originalEmissiveIntensity * pulseFactor;
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
          emissiveObjects.forEach(obj => {
            if (obj.material) {
              const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
              
              materials.forEach(material => {
                if (material.userData.originalEmissive) {
                  material.emissiveIntensity = material.userData.originalEmissiveIntensity * 1.1; // Just slightly enhanced
                }
              });
            }
          });
        }
      };
      bloomAnimation();
      
      setTimeout(() => {
        statusText = "Self-awareness detected";
      }, 2200);
      
      const longestDuration = Math.max(...animationActions.map(action => action.getClip().duration));
      const audioDuration = audioBuffer.duration * 1000;
      const maxDuration = Math.max(longestDuration * 1000, audioDuration);
      
      setTimeout(() => {
        if (!isSequenceComplete) {
          isSequenceComplete = true;
          statusText = "Initialization complete";
          setTimeout(() => {
            //push('/eula');
          }, 1000);
        }
      }, maxDuration + 500);
    }
    
    // Load audio
    audioLoader.load(
      '/models/pansophyVoice.mp3',
      (buffer) => {
        audioBuffer = buffer;
        console.log(`Audio duration: ${buffer.duration} seconds`);
        startSynchronizedSequence();
      },
      undefined,
      (err) => {
        console.error('An error happened while loading the audio:', err);
        audioBuffer = { duration: 0 };
        startSynchronizedSequence();
      }
    );
    
    // Load model
    loader.load(
      '/models/pansophyBot1.glb',
      (gltf) => {
        loadedModel = gltf.scene;
        scene.add(gltf.scene);
        
        // Enhance materials and setup selective bloom
        enhanceMaterials(gltf.scene);
        
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(gltf.scene);
          
          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            animationActions.push(action);
            console.log(`Animation "${clip.name}" duration: ${clip.duration} seconds`);
          });
        }
        
        modelLoaded = true;
        console.log(`Found ${emissiveObjects.length} emissive objects for selective bloom`);
        startSynchronizedSequence();
      },
      undefined,
      (error) => {
        console.error('An error happened while loading the model', error);
        setTimeout(() => {
          statusText = "Initialization complete";
          // push('/eula');
        }, 5000);
      }
    );
    
    window.addEventListener('resize', onWindowResize, false);
    function onWindowResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      bloomComposer.setSize(container.clientWidth, container.clientHeight);
      finalComposer.setSize(container.clientWidth, container.clientHeight);
    }
    
    const clock = new THREE.Clock();
    
    function animate() {
      requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      
      // Render scene for bloom
      scene.traverse(darkenNonBloomed);
      bloomComposer.render();
      scene.traverse(restoreMaterial);
      
      // Render final scene
      finalPass.uniforms.bloomTexture.value = bloomComposer.renderTarget2.texture;
      finalComposer.render();
    }
    animate();
    
    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (sound.isPlaying) sound.stop();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  });
</script> -->




<!-- <script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
  import { push } from 'svelte-spa-router';
  
  let statusText = "Powering on ...";
  let container;
  
  onMount(() => {
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3);
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
      logarithmicDepthBuffer: true,
      samples: 8
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // High DPI support
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.physicallyBasedRendering = true;
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
      0.6,  // strength - much more subtle
      0.3,  // radius - smaller
      0.85  // threshold - higher to only affect bright emissive parts
    );
    
    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);
    
    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture }
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
        defines: {}
      }),
      "baseTexture"
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
    let loadedModel = null;
    let emissiveObjects = [];
    
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    
    let audioBuffer = null;
    let modelLoaded = false;
    
    // Remove the environment map and cube camera setup since we want to preserve original materials
    // const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
    // const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
    // scene.add(cubeCamera);
    
    // Function to darken non-emissive materials for bloom pass
    function darkenNonBloomed(obj) {
      if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
        materials[obj.uuid] = obj.material;
        obj.material = darkMaterial;
      }
    }
    
    // Function to restore original materials
    function restoreMaterial(obj) {
      if (materials[obj.uuid]) {
        obj.material = materials[obj.uuid];
        delete materials[obj.uuid];
      }
    }
    
    // Function to enhance materials and setup selective bloom - PRESERVE ORIGINAL APPEARANCE
    function enhanceMaterials(object) {
      object.traverse((child) => {
        if (child.isMesh && child.material) {
          // Enable high-quality rendering
          child.frustumCulled = false; // Prevent culling issues
          
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          
          materials.forEach(material => {
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
              // Improve material quality without changing appearance
              material.needsUpdate = true;
              
              // Enable proper normal mapping if available
              if (material.normalMap) {
                material.normalScale.set(1, 1);
              }
              
              // Ensure proper texture filtering
              if (material.map) {
                material.map.generateMipmaps = true;
                material.map.minFilter = THREE.LinearMipmapLinearFilter;
                material.map.magFilter = THREE.LinearFilter;
                material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
              }
              
              // Only check for emissive properties - DON'T modify other material properties
              if (material.emissive && material.emissive.getHex() > 0) {
                // Store original values
                material.userData.originalEmissive = material.emissive.clone();
                material.userData.originalEmissiveIntensity = material.emissiveIntensity || 1.0;
                
                // Only slightly enhance emissive for bloom detection
                material.emissiveIntensity = (material.emissiveIntensity || 1.0) * 1.1;
                
                // Add to bloom layer
                child.layers.enable(BLOOM_SCENE);
                emissiveObjects.push(child);
                
                console.log(`Added emissive object to bloom layer: ${material.name || 'unnamed'}`);
              }
              
              // DON'T modify metalness, roughness, colors, or other properties
              // This preserves the original model appearance
            }
          });
        }
      });
    }
    
    function startSynchronizedSequence() {
      if (!audioBuffer || !modelLoaded) return;
      
      // Start audio
      sound.setBuffer(audioBuffer);
      sound.setLoop(false);
      sound.setVolume(0.5);
      sound.play();
      
      // Start animations
      animationActions.forEach(action => {
        action.reset();
        action.play();
      });
      
      statusText = "Consciousness activated";
      
      const startTime = Date.now();
      const bloomAnimation = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / 3000, 1);
        
        // Very subtle pulse effect for bloom
        const pulse = Math.sin(elapsed * 0.004) * 0.2 + 0.8; // Gentler pulse
        bloomPass.strength = 0.4 + pulse * 0.2; // Much more subtle range (0.4-0.6)
        
        // Animate emissive intensity of emissive materials only - more subtle
        emissiveObjects.forEach(obj => {
          if (obj.material) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            
            materials.forEach(material => {
              if (material.userData.originalEmissive) {
                const pulseFactor = 1.0 + pulse * 0.15; // Much gentler pulse
                material.emissiveIntensity = material.userData.originalEmissiveIntensity * pulseFactor;
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
          emissiveObjects.forEach(obj => {
            if (obj.material) {
              const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
              
              materials.forEach(material => {
                if (material.userData.originalEmissive) {
                  material.emissiveIntensity = material.userData.originalEmissiveIntensity * 1.1; // Just slightly enhanced
                }
              });
            }
          });
        }
      };
      bloomAnimation();
      
      setTimeout(() => {
        statusText = "Self-awareness detected";
      }, 2200);
      
      const longestDuration = Math.max(...animationActions.map(action => action.getClip().duration));
      const audioDuration = audioBuffer.duration * 1000;
      const maxDuration = Math.max(longestDuration * 1000, audioDuration);
      
      setTimeout(() => {
        if (!isSequenceComplete) {
          isSequenceComplete = true;
          statusText = "Initialization complete";
          setTimeout(() => {
            //push('/eula');
          }, 1000);
        }
      }, maxDuration + 500);
    }
    
    // Load audio
    audioLoader.load(
      '/models/pansophyVoice.mp3',
      (buffer) => {
        audioBuffer = buffer;
        console.log(`Audio duration: ${buffer.duration} seconds`);
        startSynchronizedSequence();
      },
      undefined,
      (err) => {
        console.error('An error happened while loading the audio:', err);
        audioBuffer = { duration: 0 };
        startSynchronizedSequence();
      }
    );
    
    // Load model
    loader.load(
      '/models/pansophyBot1.glb',
      (gltf) => {
        loadedModel = gltf.scene;
        scene.add(gltf.scene);
        
        // Enhance materials and setup selective bloom
        enhanceMaterials(gltf.scene);
        
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(gltf.scene);
          
          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            animationActions.push(action);
            console.log(`Animation "${clip.name}" duration: ${clip.duration} seconds`);
          });
        }
        
        modelLoaded = true;
        console.log(`Found ${emissiveObjects.length} emissive objects for selective bloom`);
        startSynchronizedSequence();
      },
      undefined,
      (error) => {
        console.error('An error happened while loading the model', error);
        setTimeout(() => {
          statusText = "Initialization complete";
          // push('/eula');
        }, 5000);
      }
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
      scene.traverse(darkenNonBloomed);
      bloomComposer.render();
      scene.traverse(restoreMaterial);
      
      // Render final scene
      finalPass.uniforms.bloomTexture.value = bloomComposer.renderTarget2.texture;
      finalComposer.render();
    }
    animate();
    
    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (sound.isPlaying) sound.stop();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  });
</script> -->



<script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
  import { push } from 'svelte-spa-router';
  
  let statusText = "";
  let container;
  
  onMount(() => {
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3);
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
      logarithmicDepthBuffer: true,
      samples: 8
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // High DPI support
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.physicallyBasedRendering = true;
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
      0.6,  // strength - much more subtle
      0.3,  // radius - smaller
      0.85  // threshold - higher to only affect bright emissive parts
    );
    
    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);
    
    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture }
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
        defines: {}
      }),
      "baseTexture"
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
    let loadedModel = null;
    let emissiveObjects = [];
    let animationStartTime = null;
    let poseDuration = 2000; // 2 seconds in milliseconds
    
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    
    let audioBuffer = null;
    let modelLoaded = false;
    
    // Function to darken non-emissive materials for bloom pass
    function darkenNonBloomed(obj) {
      if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
        materials[obj.uuid] = obj.material;
        obj.material = darkMaterial;
      }
    }
    
    // Function to restore original materials
    function restoreMaterial(obj) {
      if (materials[obj.uuid]) {
        obj.material = materials[obj.uuid];
        delete materials[obj.uuid];
      }
    }
    
    // Function to enhance materials and setup selective bloom - PRESERVE ORIGINAL APPEARANCE
    function enhanceMaterials(object) {
      object.traverse((child) => {
        if (child.isMesh && child.material) {
          // Enable high-quality rendering
          child.frustumCulled = false; // Prevent culling issues
          
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          
          materials.forEach(material => {
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
              // Improve material quality without changing appearance
              material.needsUpdate = true;
              
              // Enable proper normal mapping if available
              if (material.normalMap) {
                material.normalScale.set(1, 1);
              }
              
              // Ensure proper texture filtering
              if (material.map) {
                material.map.generateMipmaps = true;
                material.map.minFilter = THREE.LinearMipmapLinearFilter;
                material.map.magFilter = THREE.LinearFilter;
                material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
              }
              
              // Only check for emissive properties - DON'T modify other material properties
              if (material.emissive && material.emissive.getHex() > 0) {
                // Store original values
                material.userData.originalEmissive = material.emissive.clone();
                material.userData.originalEmissiveIntensity = material.emissiveIntensity || 1.0;
                
                // Only slightly enhance emissive for bloom detection
                material.emissiveIntensity = (material.emissiveIntensity || 1.0) * 1.1;
                
                // Add to bloom layer
                child.layers.enable(BLOOM_SCENE);
                emissiveObjects.push(child);
                
                console.log(`Added emissive object to bloom layer: ${material.name || 'unnamed'}`);
              }
              
              // DON'T modify metalness, roughness, colors, or other properties
              // This preserves the original model appearance
            }
          });
        }
      });
    }
    
    function startSynchronizedSequence() {
      if (!audioBuffer || !modelLoaded) return;
      
      // Record the start time for animation tracking
      animationStartTime = Date.now();
      
      // Start audio immediately (it will sync with the animation which includes pose)
      setTimeout(() => {
       
      
        
      }, poseDuration);
   
      
      // Start animations (which now include the 2-second pose at the beginning)
      animationActions.forEach(action => {
        action.reset();
        action.play();
      });
      
      //Keep "Powering on..." text during pose mode (first 2 seconds)
      // The status text will change when the actual animation movement starts
      
      // Schedule status text changes based on animation timeline
      setTimeout(() => {
        statusText = "Powering ...";
        
        // Start bloom animation when actual movement begins (after pose)
        const bloomStartTime = Date.now();
        const bloomAnimation = () => {
          const elapsed = Date.now() - bloomStartTime;
          const progress = Math.min(elapsed / 3000, 1);
          
          // Very subtle pulse effect for bloom
          const pulse = Math.sin(elapsed * 0.004) * 0.2 + 0.8; // Gentler pulse
          bloomPass.strength = 0.4 + pulse * 0.2; // Much more subtle range (0.4-0.6)
          
          // Animate emissive intensity of emissive materials only - more subtle
          emissiveObjects.forEach(obj => {
            if (obj.material) {
              const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
              
              materials.forEach(material => {
                if (material.userData.originalEmissive) {
                  const pulseFactor = 1.0 + pulse * 0.15; // Much gentler pulse
                  material.emissiveIntensity = material.userData.originalEmissiveIntensity * pulseFactor;
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
            emissiveObjects.forEach(obj => {
              if (obj.material) {
                const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                
                materials.forEach(material => {
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
        statusText = "Self-awareness detected";
       
        sound.setBuffer(audioBuffer);
      sound.setLoop(false);
      sound.setVolume(0.5);
      sound.play();
      }, poseDuration + 200); // 200ms after animation movement starts
      
      // Calculate total sequence duration
      const longestDuration = Math.max(...animationActions.map(action => action.getClip().duration));
      const audioDuration = audioBuffer.duration * 1000;
      const maxDuration = Math.max(longestDuration * 1000, audioDuration);
      
      // Schedule completion
      setTimeout(() => {
        if (!isSequenceComplete) {
          isSequenceComplete = true;
          statusText = "Initialization complete";
          setTimeout(() => {
            push('/eula');
          }, 1000);
        }
      }, maxDuration + 500);
    }
    
    // Load audio
    audioLoader.load(
      '/models/pansophyVoice.mp3',
      (buffer) => {
        audioBuffer = buffer;
        console.log(`Audio duration: ${buffer.duration} seconds`);
        startSynchronizedSequence();
      },
      undefined,
      (err) => {
        console.error('An error happened while loading the audio:', err);
        audioBuffer = { duration: 0 };
        startSynchronizedSequence();
      }
    );
    
    // Load model
    loader.load(
      '/models/pansophyBot2.glb',
      (gltf) => {
        loadedModel = gltf.scene;
        scene.add(gltf.scene);
        
        // Enhance materials and setup selective bloom
        enhanceMaterials(gltf.scene);
        
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(gltf.scene);
          
          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            animationActions.push(action);
            console.log(`Animation "${clip.name}" duration: ${clip.duration} seconds`);
          });
        }
        
        modelLoaded = true;
        console.log(`Found ${emissiveObjects.length} emissive objects for selective bloom`);
        startSynchronizedSequence();
      },
      undefined,
      (error) => {
        console.error('An error happened while loading the model', error);
        setTimeout(() => {
          statusText = "Initialization complete";
          push('/eula');
        }, 5000);
      }
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
      scene.traverse(darkenNonBloomed);
      bloomComposer.render();
      scene.traverse(restoreMaterial);
      
      // Render final scene
      finalPass.uniforms.bloomTexture.value = bloomComposer.renderTarget2.texture;
      finalComposer.render();
    }
    animate();
    
    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (sound.isPlaying) sound.stop();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  });
</script>







<div class="flex flex-col items-center justify-center w-full">
  <div bind:this={container} class="w-full h-[400px] overflow-hidden bg-transparent"></div>
  <div class="w-full absolute top-[440px] flex justify-center">
    <p class="text-white font-poppins text-[16px] scroll-pb-12">{statusText}</p>
  </div>
</div>