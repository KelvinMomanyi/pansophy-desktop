<script>
  import Router from 'svelte-spa-router';

  import NotFound from './routes/NotFound.svelte';
  import Eula from './routes/Eula.svelte';
  import Powering from './routes/Powering.svelte';
  import Chat from './routes/Chat.svelte';

  const routes = {
    '/':Powering,
    '/chat': Chat,
    '/eula': Eula,
    '*': NotFound
  };
</script>

<div
  class="flex items-center justify-center
         w-screen h-screen
         bg-gradient-to-br from-black/80 to-black/10
         border border-white/30
         shadow-[inset_4px_4px_20px_0_rgba(255,255,255,0.32)]"
>
  <Router {routes} />
</div>
