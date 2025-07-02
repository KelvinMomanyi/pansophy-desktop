<script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 5, 5);
    scene.add(directionalLight);

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

        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(gltf.scene);
          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            action.loop = THREE.LoopRepeat;
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
        <a class="text-white font-poppins text-[20px]" href="#/eula">Powering</a>
    </div>
</div>