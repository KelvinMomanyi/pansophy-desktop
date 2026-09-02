<script>
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';

  import { createPoweringScene } from '../lib/scene.js';

  let container;
  let statusText = '';

  onMount(() =>
    createPoweringScene(container, {
      onStatus: (status) => (statusText = status),
      onComplete: () => push('/eula'),
    }),
  );
</script>

<div class="flex flex-col items-center justify-center w-full">
  <div bind:this={container} class="w-full h-[400px] overflow-hidden bg-transparent"></div>
  <div class="w-full absolute top-[440px] flex justify-center">
    <p class="text-white font-poppins text-[16px] scroll-pb-12">{statusText}</p>
  </div>
</div>
