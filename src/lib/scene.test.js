import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPoweringScene,
  darkenNonBloomed,
  enhanceMaterials,
  restoreMaterial,
} from './scene.js';

const sceneMocks = vi.hoisted(() => ({
  actions: [],
  audioLoad: vi.fn(),
  composers: [],
  modelLoad: vi.fn(),
  renderers: [],
  requestAnimationFrame: vi.fn(),
  sounds: [],
}));

vi.mock('three', () => {
  const position = () => ({ set: vi.fn() });

  class Scene {
    constructor() {
      this.children = [];
    }

    add(child) {
      this.children.push(child);
    }

    traverse(callback) {
      this.children.forEach((child) => {
        if (child.traverse) child.traverse(callback);
        else callback(child);
      });
    }
  }

  class PerspectiveCamera {
    constructor() {
      this.add = vi.fn();
      this.position = position();
      this.updateProjectionMatrix = vi.fn();
    }
  }

  class WebGLRenderer {
    constructor() {
      this.capabilities = { getMaxAnisotropy: vi.fn(() => 8) };
      this.domElement = document.createElement('canvas');
      this.setClearColor = vi.fn();
      this.setPixelRatio = vi.fn();
      this.setSize = vi.fn();
      this.shadowMap = {};
      sceneMocks.renderers.push(this);
    }
  }

  class DirectionalLight {
    constructor() {
      this.position = position();
      this.shadow = { camera: {}, mapSize: {} };
    }
  }

  class PointLight {
    constructor() {
      this.position = position();
    }
  }

  class Layers {
    constructor() {
      this.test = vi.fn(() => false);
    }

    set() {}
  }

  class Audio {
    constructor() {
      this.isPlaying = false;
      this.play = vi.fn(() => {
        this.isPlaying = true;
      });
      this.setBuffer = vi.fn();
      this.setLoop = vi.fn();
      this.setVolume = vi.fn();
      this.stop = vi.fn(() => {
        this.isPlaying = false;
      });
      sceneMocks.sounds.push(this);
    }
  }

  class AudioLoader {
    load(...args) {
      sceneMocks.audioLoad(...args);
    }
  }

  class AnimationMixer {
    constructor() {
      this.update = vi.fn();
    }

    clipAction(clip) {
      const action = {
        clampWhenFinished: false,
        getClip: vi.fn(() => clip),
        play: vi.fn(),
        reset: vi.fn(),
        setLoop: vi.fn(),
      };
      sceneMocks.actions.push(action);
      return action;
    }
  }

  return {
    ACESFilmicToneMapping: 'aces',
    AnimationMixer,
    Audio,
    AudioListener: class {},
    AudioLoader,
    Clock: class {
      getDelta() {
        return 0.016;
      }
    },
    DirectionalLight,
    Layers,
    LinearFilter: 1006,
    LinearMipmapLinearFilter: 1008,
    LoopOnce: 'loop-once',
    MeshBasicMaterial: class {
      constructor(options) {
        Object.assign(this, options);
      }
    },
    PCFSoftShadowMap: 'soft-shadow',
    PerspectiveCamera,
    PointLight,
    Scene,
    ShaderMaterial: class {
      constructor(options) {
        Object.assign(this, options);
      }
    },
    SRGBColorSpace: 'srgb',
    Vector2: class {
      constructor(x, y) {
        this.x = x;
        this.y = y;
      }
    },
    WebGLRenderer,
  };
});

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(...args) {
      sceneMocks.modelLoad(...args);
    }
  },
}));

vi.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: class {
    constructor() {
      this.addPass = vi.fn();
      this.render = vi.fn();
      this.renderTarget2 = { texture: 'bloom-texture' };
      this.setSize = vi.fn();
      sceneMocks.composers.push(this);
    }
  },
}));

vi.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({
  RenderPass: class {},
}));

vi.mock('three/examples/jsm/postprocessing/ShaderPass.js', () => ({
  ShaderPass: class {
    constructor(shader) {
      this.uniforms = shader.uniforms;
    }
  },
}));

vi.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: class {
    constructor(_resolution, strength) {
      this.setSize = vi.fn();
      this.strength = strength;
    }
  },
}));

describe('scene material helpers', () => {
  it('darkens only non-bloomed meshes and remembers their material', () => {
    const originalMaterial = { name: 'original' };
    const darkMaterial = { name: 'dark' };
    const object = { isMesh: true, layers: {}, material: originalMaterial, uuid: 'mesh-1' };
    const materials = {};
    const bloomLayer = { test: vi.fn().mockReturnValue(false) };

    darkenNonBloomed(object, { bloomLayer, darkMaterial, materials });

    expect(materials).toEqual({ 'mesh-1': originalMaterial });
    expect(object.material).toBe(darkMaterial);

    const bloomed = { isMesh: true, layers: {}, material: originalMaterial, uuid: 'mesh-2' };
    bloomLayer.test.mockReturnValue(true);
    darkenNonBloomed(bloomed, { bloomLayer, darkMaterial, materials });
    expect(bloomed.material).toBe(originalMaterial);
    expect(materials).not.toHaveProperty('mesh-2');
  });

  it('restores remembered materials and removes the temporary entry', () => {
    const originalMaterial = { name: 'original' };
    const object = { material: { name: 'dark' }, uuid: 'mesh-1' };
    const materials = { 'mesh-1': originalMaterial };

    restoreMaterial(object, materials);

    expect(object.material).toBe(originalMaterial);
    expect(materials).not.toHaveProperty('mesh-1');

    const untouched = { material: originalMaterial, uuid: 'unknown' };
    restoreMaterial(untouched, materials);
    expect(untouched.material).toBe(originalMaterial);
  });

  it('enhances supported mesh materials and marks emissive meshes for bloom', () => {
    const normalScale = { set: vi.fn() };
    const texture = {};
    const clonedEmissive = { value: 0xff00ff };
    const standardMaterial = {
      emissive: { clone: vi.fn(() => clonedEmissive), getHex: vi.fn(() => 0xff00ff) },
      emissiveIntensity: 2,
      isMeshStandardMaterial: true,
      map: texture,
      normalMap: {},
      normalScale,
      userData: {},
    };
    const physicalMaterial = {
      emissive: { getHex: vi.fn(() => 0) },
      isMeshPhysicalMaterial: true,
      userData: {},
    };
    const unsupportedMaterial = { userData: {} };
    const layers = { enable: vi.fn() };
    const mesh = {
      isMesh: true,
      layers,
      material: [standardMaterial, physicalMaterial, unsupportedMaterial],
    };
    const singleMaterialMesh = {
      isMesh: true,
      layers: { enable: vi.fn() },
      material: physicalMaterial,
    };
    const object = {
      traverse: (callback) => [mesh, singleMaterialMesh, { isMesh: false }].forEach(callback),
    };
    const emissiveObjects = [];
    const renderer = { capabilities: { getMaxAnisotropy: vi.fn(() => 16) } };
    /** @type {{ LinearFilter: 1006, LinearMipmapLinearFilter: 1008 }} */
    const three = {
      LinearFilter: 1006,
      LinearMipmapLinearFilter: 1008,
    };

    enhanceMaterials(object, { bloomScene: 1, emissiveObjects, renderer, three });

    expect(mesh).toMatchObject({ castShadow: true, frustumCulled: false, receiveShadow: true });
    expect(standardMaterial.needsUpdate).toBe(true);
    expect(normalScale.set).toHaveBeenCalledWith(1, 1);
    expect(texture).toEqual({
      anisotropy: 16,
      generateMipmaps: true,
      magFilter: 1006,
      minFilter: 1008,
    });
    expect(standardMaterial.userData).toEqual({
      originalEmissive: clonedEmissive,
      originalEmissiveIntensity: 2,
    });
    expect(standardMaterial.emissiveIntensity).toBeCloseTo(2.2);
    expect(layers.enable).toHaveBeenCalledWith(1);
    expect(emissiveObjects).toEqual([mesh]);
    expect(physicalMaterial.needsUpdate).toBe(true);
    expect(unsupportedMaterial).not.toHaveProperty('needsUpdate');
  });
});
describe('createPoweringScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', sceneMocks.requestAnimationFrame);
    sceneMocks.actions.length = 0;
    sceneMocks.composers.length = 0;
    sceneMocks.renderers.length = 0;
    sceneMocks.sounds.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('runs the synchronized startup sequence and disposes browser resources', () => {
    const container = document.createElement('div');
    Object.defineProperties(container, {
      clientHeight: { configurable: true, value: 480 },
      clientWidth: { configurable: true, value: 640 },
    });
    const onComplete = vi.fn();
    const onStatus = vi.fn();
    const dispose = createPoweringScene(container, { onComplete, onStatus });

    expect(sceneMocks.audioLoad).toHaveBeenCalledWith(
      '/models/pansophyVoice.mp3',
      expect.any(Function),
      undefined,
      expect.any(Function),
    );
    expect(sceneMocks.modelLoad).toHaveBeenCalledWith(
      '/models/pansophyBot2.glb',
      expect.any(Function),
      undefined,
      expect.any(Function),
    );
    expect(container.querySelector('canvas')).not.toBeNull();

    const material = {
      emissive: { clone: vi.fn(() => ({ hex: 0xffffff })), getHex: vi.fn(() => 0xffffff) },
      emissiveIntensity: 1,
      isMeshStandardMaterial: true,
      userData: {},
    };
    const mesh = {
      isMesh: true,
      layers: { enable: vi.fn() },
      material,
      uuid: 'animated-mesh',
    };
    const modelScene = { traverse: (callback) => callback(mesh) };

    sceneMocks.audioLoad.mock.calls[0][1]({ duration: 0.5 });
    sceneMocks.modelLoad.mock.calls[0][1]({
      animations: [{ duration: 3 }],
      scene: modelScene,
    });

    expect(sceneMocks.actions[0].setLoop).toHaveBeenCalledWith('loop-once');
    expect(sceneMocks.actions[0].reset).toHaveBeenCalledOnce();
    expect(sceneMocks.actions[0].play).toHaveBeenCalledOnce();

    sceneMocks.requestAnimationFrame.mock.calls[0][0]();
    window.dispatchEvent(new Event('resize'));
    vi.runAllTimers();

    expect(onStatus.mock.calls.map(([status]) => status)).toEqual([
      'Powering ...',
      'Self-awareness detected',
      'Initialization complete',
    ]);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(sceneMocks.sounds[0].play).toHaveBeenCalledOnce();
    expect(sceneMocks.composers.every((composer) => composer.setSize.mock.calls.length > 0)).toBe(
      true,
    );

    dispose();
    expect(sceneMocks.sounds[0].stop).toHaveBeenCalledOnce();
    expect(container.querySelector('canvas')).toBeNull();
  });
});
