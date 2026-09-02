<script>
  import Router from 'svelte-spa-router';

  import NotFound from './routes/NotFound.svelte';
  import Eula from './routes/Eula.svelte';
  import Powering from './routes/Powering.svelte';
  import Chat from './routes/Chat.svelte';
  import WindowControls from './components/windowControls.svelte';
  const routes = {
    '/': Powering,

    '/eula': Eula,
    '/chat': Chat,
    '*': NotFound,
  };
</script>

<div
  class=" glass flex items-center rounded-2xl justify-center
       w-screen h-screen
       bg-gradient-to-br from-black/60 to-black/40
     bg-clip-padding backdrop-filter backdrop-blur-lg bg-opacity-20 border
     bg-white/10
shadow-[inset_0_0_60px_0_rgba(255,255,255,0.1)]
         "
>
  <WindowControls />
  <Router {routes} />
</div>
