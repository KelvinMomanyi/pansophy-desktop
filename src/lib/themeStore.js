// stores/theme.js - Recommended for Tauri Svelte
import { writable } from 'svelte/store';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Tauri imports with error handling
// let appWindow;
// if (browser && window.__TAURI__) {
//   import('@tauri-apps/api/window').then(module => {
//     appWindow = module.appWindow;
//   }).catch(() => {
//     console.log('Tauri API not available - using fallback theme handling');
//   });
// }
const appWindow = getCurrentWindow();

function createThemeStore() {
  const { subscribe, set, update } = writable('light');

  return {
    subscribe,
    
    async toggle() {
      const newTheme = await new Promise((resolve) => {
        update(async (currentTheme) => {
          const theme = currentTheme === 'light' ? 'dark' : 'light';
          
          // if (browser) {
          //   // 1. Update localStorage first (fastest)
          //   localStorage.setItem('theme', theme);
            
          //   // 2. Update DOM for immediate visual feedback
          //   if (theme === 'dark') {
          //     document.documentElement.classList.add('dark');
          //   } else {
          //     document.documentElement.classList.remove('dark');
          //   }
            
            // 3. Update Tauri window theme (native integration)
            if (appWindow) {
              try {
                await appWindow.setTheme(theme);
              } catch (error) {
                console.warn('Tauri theme update failed:', error);
              }
            }
          // }
          
          resolve(theme);
          return theme;
        });
      });
      
      return newTheme;
    },
    
    async init() {
      // if (browser) {
        // Get saved preference first
        const saved = localStorage.getItem('theme');
        let systemTheme = 'light';
        
        // Try Tauri system theme detection (most accurate for desktop)
        if (appWindow) {
          try {
            systemTheme = await appWindow.theme() || 'light';
          } catch (error) {
            // Fallback to media query
            systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
        } else {
          // Web fallback
          systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        const theme = saved || systemTheme;
        
        // Apply theme to DOM
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        // Sync with Tauri window
        if (appWindow) {
          try {
            await appWindow.setTheme(theme);
          } catch (error) {
            console.warn('Initial Tauri theme sync failed:', error);
          }
        // }
        
        set(theme);
        
        // Listen for system changes only if user hasn't set preference
        if (!saved) {
          if (appWindow) {
            try {
              // Use Tauri's native system theme listener
              const unlisten = await appWindow.onThemeChanged(({ payload: newTheme }) => {
                if (newTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                set(newTheme);
              });
              
              // Return cleanup function
              return unlisten;
            } catch (error) {
              console.warn('Tauri theme listener failed:', error);
            }
          }
          
          // Fallback listener for web or if Tauri fails
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          mediaQuery.addEventListener('change', (e) => {
            const systemTheme = e.matches ? 'dark' : 'light';
            
            if (systemTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
            
            set(systemTheme);
          });
        }
      }
    },
    
    // Reset to system preference
    async resetToSystem() {
      // if (browser) {
        localStorage.removeItem('theme');
        
        let systemTheme = 'light';
        if (appWindow) {
          try {
            systemTheme = await appWindow.theme() || 'light';
          } catch (error) {
            systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
        } else {
          systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        if (systemTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        if (appWindow) {
          try {
            await appWindow.setTheme(systemTheme);
          } catch (error) {
            console.warn('System theme reset failed:', error);
          }
        }
        
        set(systemTheme);
      }
    }
  };
// }

export const theme = createThemeStore();