<script>
    import { theme } from './stores/theme.js'; // Adjust path as needed
    import { onMount } from 'svelte';
  
    let isOn = false;
  
    // Subscribe to theme changes
    $: isOn = $theme === 'dark';
  
    // Initialize theme on component mount
    onMount(() => {
      theme.init();
    });
  
    // Toggle theme function
    async function toggleTheme() {
      await theme.toggle();
    }
  </script>
  
  <div class="flex justify-between items-center w-full bg-white/50 dark:bg-black/60 py-3 px-[14px] rounded-[12px] font-poppins font-light text-[15px]">
    <div class="flex items-center gap-2">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.8833 12.8834C13.8472 11.9178 14.417 10.6279 14.4818 9.26511C14.5466 7.9023 14.1018 6.56417 13.2339 5.51145C12.366 4.45874 11.1373 3.76683 9.78711 3.57056C8.43695 3.37428 7.06208 3.68769 5.93038 4.44973C4.79868 5.21176 3.99121 6.36783 3.66531 7.69268C3.33941 9.01754 3.51842 10.4163 4.16746 11.6164C4.8165 12.8164 5.88908 13.7319 7.17621 14.1844C8.46335 14.6368 9.87283 14.5939 11.13 14.0639C11.785 13.7869 12.3803 13.3861 12.8833 12.8834ZM8.98495 4.39846C10.2014 4.38514 11.3733 4.85559 12.2429 5.70632C13.1124 6.55705 13.6084 7.71837 13.6218 8.93481C13.6351 10.1512 13.1646 11.3232 12.3139 12.1927C11.4632 13.0623 10.3019 13.5583 9.08542 13.5716L8.98495 13.5716L8.98495 4.39846Z" fill="currentColor"/>
        <path d="M8.99498 0.500001C10.6765 0.499008 12.3206 0.996807 13.7192 1.93042C15.1178 2.86403 16.208 4.19149 16.852 5.74487C17.496 7.29825 17.6647 9.00773 17.3369 10.657C17.0091 12.3063 16.1995 13.8214 15.0104 15.0104C13.8214 16.1995 12.3063 17.0091 10.657 17.3369C9.00773 17.6647 7.29825 17.496 5.74487 16.852C4.1915 16.208 2.86403 15.1178 1.93042 13.7192C0.996808 12.3206 0.499009 10.6765 0.500003 8.99498C0.503985 6.74319 1.40027 4.58478 2.99253 2.99252C4.58478 1.40027 6.7432 0.503984 8.99498 0.500001ZM8.99498 16.1386C10.4079 16.1386 11.789 15.7196 12.9638 14.9347C14.1385 14.1497 15.0541 13.034 15.5948 11.7287C16.1355 10.4234 16.277 8.98705 16.0013 7.60133C15.7257 6.2156 15.0453 4.94273 14.0463 3.94368C13.0472 2.94463 11.7744 2.26426 10.3886 1.98862C9.0029 1.71299 7.56656 1.85445 6.26123 2.39514C4.95591 2.93582 3.84023 3.85143 3.05528 5.0262C2.27033 6.20096 1.85136 7.5821 1.85136 8.99498C1.85402 10.8888 2.6075 12.7042 3.94661 14.0433C5.28573 15.3825 7.10119 16.1359 8.99498 16.1386Z" fill="currentColor"/>
      </svg>
  
      <p class="font-poppins font-light text-[15px] text-gray-800 dark:text-white">
        Dark Mode
      </p>
    </div>
    
    <button
      on:click={toggleTheme}
      class={`relative w-8 h-4 rounded-full transition-colors duration-300
              ${isOn ? 'bg-blue-500' : 'bg-gray-400'}`}
    >
      <span
        class={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-300
                ${isOn ? 'translate-x-4' : 'translate-x-0'}`}
      ></span>
    </button>
  </div>