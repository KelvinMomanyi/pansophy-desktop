<script>
  import { faSearch, faPlus } from '@fortawesome/free-solid-svg-icons';
  import { faEllipsisH, faCheckCircle, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
  import { faTimes} from '@fortawesome/free-solid-svg-icons';
  import { invoke } from "@tauri-apps/api/core";
  import Fa from 'svelte-fa';
  import logo from '../assets/Logo.png';
  import watch from '../assets/watch.png';
  import bot from '../assets/BotIt.png';
  import { theme } from '../lib/themeStore.js';
  import { onMount } from 'svelte';
  import { open } from '@tauri-apps/plugin-dialog';
  import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
 
  let morecompanies = [
    { name: 'Existing Project', pages: ['ISO Certified Companies', 'ISO Certified Companies'] },
    { name: 'Existing Project', pages: ['ISO Certified Companies', 'ISO Certified Companies', 'ISO Certified Companies'] },
    { name: 'Existing Project', pages: [] }
  ];

  let activeIndex = null;
  let expandedIndex = null;
  let editIndex = null;
  let userInput = '';
  let messages = [];
  let isThinking = false;
  let aiResponses = [];
  
  function toggleTheme() {
    isOn = !isOn;
    theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
  }


  // const sendMessage = async () => {
  //   if (userInput.trim() === '') return;
    
  //   const message = userInput;
  //   messages = [...messages, message];
  //   userInput = '';
    
  //   // Start thinking animation
  //   isThinking = true;
    
  //   try {
  //     // Call Ollama API
  //     const response = await fetch('http://localhost:11434/api/chat', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         model: 'mistral:7b', // Change this to your preferred model
  //         prompt: message,
  //         stream: false
  //       })
  //     });
      
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
      
  //     const data = await response.json();
  //     console.log(data, 'data')
  //     // Add AI response to the responses array
  //     aiResponses = [...aiResponses, {
  //       query: message,
  //       response: data.response,
  //       timestamp: new Date().toISOString()
  //     }];
      
  //   } catch (error) {
  //     console.error('Error calling Ollama:', error);
  //     // Add error response
  //     aiResponses = [...aiResponses, {
  //       query: message,
  //       response: 'Sorry, I encountered an error while processing your request. Please make sure Ollama is running locally on port 11434.',
  //       timestamp: new Date().toISOString(),
  //       isError: true
  //     }];
  //   } finally {
  //     // Stop thinking animation
  //     isThinking = false;
  //   }
    
  //   // Auto-scroll to bottom
  //   setTimeout(() => {
  //     if (chatContainer) {
  //       chatContainer.scrollTop = chatContainer.scrollHeight;
  //     }
  //   }, 100);
  // };


  // Reactive variables (equivalent to useState)
  let loading = false;
  let newContent = "";
  let appStatus = {};
  let deepThinking = false;
  let thinking = false;
  let isDownloadModalOpen = false;
  let modelDownloadStatus = "";
  let modelData = {
    size: 0,
    completed: 0,
  };
  let answers = [];
  let webAnswers = [];
  let prompt = "";

  // You'll need to define this somewhere in your app
  const deepThinkModel = "deepseek-r1:7b"; // Replace with your actual model name

  const sendPrompt = async (allowDeepThink = false) => {
    if (loading) return;
    const apiUrl = "http://localhost:11500/api/chat";

    const chatRequest = {
      model: allowDeepThink ? deepThinkModel : "mistral:7b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: true,
      think: allowDeepThink,
    };

    try {
      loading = true;
      answers = [...answers, { role: "user", content: prompt }];
      prompt = "";
      newContent = "";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chatRequest),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      const readStream = async () => {
        const { done, value } = await reader.read();
        if (done) {
          answers = [...answers, { role: "system", content: newContent }];
          loading = false;
          return;
        }

        const chunk = decoder.decode(value);
        try {
          const jsonChunk = JSON.parse(chunk);
          if (jsonChunk.message) {
            newContent = newContent + jsonChunk.message.content;
          }
          await readStream();
        } catch (error) {
          console.error("Error parsing JSON:", error);
          await readStream();
        }
      };

      readStream();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const sendSimplePrompt = () => {
    sendPrompt();
  };

  const sendDeepThinkPrompt = async () => {
    // if (Reflect.has(appStatus, deepThinkModel)) {
      deepThinking = true;
      //sendPrompt(true).finally(() => deepThinking = false);
    // } else {
    //   isDownloadModalOpen = true;
    // }
  };

  const downloadDeepthinkModel = async () => {
    const url = `http://localhost:11500/api/pull`;
    const payload = {
      model: deepThinkModel,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      const readStream = async () => {
        const { done, value } = await reader.read();
        if (done) {
          modelData = { completed: 0, size: 0 };
          isDownloadModalOpen = false;
          let permissionGranted = await isPermissionGranted();
          if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === "granted";
          }

          // Once permission has been granted we can send the notification
          if (permissionGranted) {
            sendNotification({
              title: "Deepthinking setup complete",
              body: "Your deepthinking model download is complete!",
            });
          }

          invoke("health_check")
            .then((res) => {
              console.log("Result", res);
              appStatus = res;
            })
            .catch((err) => console.log("Err", err))
            .finally(() => loading = false);

          return;
        }

        const chunk = decoder.decode(value);
        try {
          const jsonChunk = JSON.parse(chunk);
          if (jsonChunk.total && jsonChunk.complete)
            modelData = {
              size: jsonChunk.total,
              completed: jsonChunk.completed,
            };
          if (jsonChunk.status) modelDownloadStatus = jsonChunk.status;
          await readStream();
        } catch (error) {
          console.error("Error parsing JSON:", error);
          await readStream();
        }
      };

      readStream();

      console.log("Model pull completed");
    } catch (error) {
      console.error("Error pulling model:", error);
    }
  };

//   const addFile = async () => {
//   try {
//     const imgPath = await open({
//       multiple: false,
//       extensions: ["png", "jpeg"],
//     });

//     // Change imgPath to img_path to match Rust function parameter
//     const res = await invoke("img_to_text", { img_path: imgPath });
//     console.log(res);
//   } catch (error) {
//     console.log(error);
//   }
// };


let currentFile = null;
  let extractedText = '';
  let isProcessing = false;
  let error = null;
  let showResults = false;
  
  // File selection handler
  // const addFile = async () => {
  //   try {
  //     const imgPath = await open({
  //       multiple: false,
  //       filters: [
  //         {
  //           name: 'Images and PDFs',
  //           extensions: ['png', 'jpeg', 'jpg', 'pdf', 'webp']
  //         }
  //       ]
  //     });
  //     isProcessing = true;
  //     error = null;
      
  //     // Call your Rust backend function
  //     const result = await invoke("img_to_text", { imgPath});
      
  //     extractedText = result;
  //     showResults = true;
  //     currentFile.size = 'Processed';
  //     // if (imgPath) {
  //     //   currentFile = {
  //     //     path: imgPath,
  //     //     name: imgPath.split('/').pop() || imgPath.split('\\').pop() || imgPath,
  //     //     size: 'Processing...'
  //     //   };
  //     //   error = null;
  //     //   showResults = false;
  //     //   await processFile(imgPath);
  //     // }
  //   } catch (err) {
  //     console.error('Error selecting file:', err);
  //     error = 'Failed to select file';
  //   }finally {
  //     isProcessing = false;
  //   }
  // };
  
  const addFile = async () => {
  try {
    const imgPath = await open({
      multiple: false,
      filters: [
        {
          name: 'Images and PDFs',
          extensions: ['png', 'jpeg', 'jpg', 'pdf', 'webp']
        }
      ]
    });

    // Check if a file was actually selected (user didn't cancel)
    if (imgPath) {
      // Update reactive state
      currentFile = {
        path: imgPath,
        name: imgPath.split('/').pop() || imgPath.split('\\').pop() || imgPath,
        size: 'Processing...'
      };
      
      isProcessing = true;
      error = null;
      showResults = false;
      
      console.log('Processing file:', imgPath);
      
      // Call your Rust backend function with correct parameter name
      const result = await invoke("img_to_text", { 
         imgPath  // Must match your Rust function parameter
      });
      
      // Update reactive state
      extractedText = result;
      showResults = true;
      currentFile.size = 'Processed';
      
    }
    // If imgPath is null/undefined, user cancelled - no error needed
    
  } catch (err) {
    console.error('Error processing file:', err);
    error = `Processing failed: ${err}`;
    showResults = false;
  } finally {
    isProcessing = false;
  }
};
  // Process file with Tauri backend
  const processFile = async (filePath) => {
    try {
      isProcessing = true;
      error = null;
      
      // Call your Rust backend function
      const result = await invoke("img_to_text", { imgPath:filePath});
      
      extractedText = result;
      showResults = true;
      currentFile.size = 'Processed';
      
    } catch (err) {
      console.error('Error processing file:', err);
      error = `Processing failed: ${ err}`;
      showResults = false;
    } finally {
      isProcessing = false;
    }
  };

  // Remove file handler
  const removeFile = () => {
    currentFile = null;
    extractedText = '';
    isProcessing = false;
    error = null;
    showResults = false;
  };

  // Copy text to clipboard
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      // You could add a toast notification here
      console.log('Text copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };


  // const webSearch = async () => {
  //   if (loading) return;
  //   loading = true;
  //   try {
  //     const res = await invoke("web_search", { search: prompt });

  //         answers = [
  //      ...answers,
  //      { role: "user", content: `Search: ${prompt}` },
  //      { role: "system", content: res }
  //    ];
  //    prompt = "";
  //     console.log("Web search result:", res);
  //   } catch (error) {
  //     console.log("Err", error);
  //   } finally {
  //     loading = false;
  //   }
  // };



//   let searchResults = [];
//   const webSearch = async () => {
//   if (loading) return;
//   loading = true;
  
//   try {
//     const res = await invoke("web_search", { search: prompt });
    
//     // Parse the search results
//     let searchResults = [];
//     let formattedContent = "";
    
//     if (Array.isArray(res) && res.length > 0) {
//       searchResults = res;
      
//       // Format the results for display
//       formattedContent = `Search Results for "${prompt}":\n\n`;
      
//       searchResults.forEach((result, index) => {
//         formattedContent += `${index + 1}. **${result.title}**\n`;
//         formattedContent += `   ${result.description}\n`;
//         formattedContent += `   🔗 ${result.link}\n`;
//         formattedContent += `   📍 ${result.domain}\n\n`;
//       });
//     } else {
//       formattedContent = `No search results found for "${prompt}"`;
//     }
    
//     answers = [
//       ...answers,
//       { role: "user", content: `Search: ${prompt}` },
//       { 
//         role: "system", 
//         content: formattedContent,
//         searchResults: searchResults // Store raw results for further processing
//       }
//     ];
    
//     prompt = "";
//     console.log("Web search result:", res);
//     console.log("Formatted results:", searchResults);
    
//   } catch (error) {
//     console.log("Error during web search:", error);
    
//     // Add error message to answers
//     answers = [
//       ...answers,
//       { role: "user", content: `Search: ${prompt}` },
//       { role: "system", content: `Search failed: ${error.message || error}` }
//     ];
    
//     prompt = "";
//   } finally {
//     loading = false;
//   }
// };
const webSearch = async () => {
  // if (loading) return;
  // loading = true;
  
  // try {
  //   const res = await invoke("web_search", { search: prompt });
    
  //   // Parse and structure the search results
  //   let searchResults = [];
    
  //   if (Array.isArray(res) && res.length > 0) {
  //     // Map each result to individual message objects
  //     searchResults = res.map(result => ({
  //       role: "system",
  //       type: "search_result",
  //       title: result.title || "",
  //       description: result.description || "",
  //       link: result.link || "",
  //       link_text: result.link_text || "",
  //       domain: result.domain || ""
  //     }));
  //   } else {
  //     // If no results found
  //     searchResults = [{
  //       role: "system",
  //       type: "search_result",
  //       title: "No Results Found",
  //       description: `No search results found for "${prompt}"`,
  //       link: "",
  //       domain: ""
  //     }];
  //   }
    
  //   // Add user query and all search results to answers
  //   webAnswers = [
  //     ...webAnswers,
  //     { role: "user", content: `Search: ${prompt}` },
  //     ...searchResults // Spread individual results as separate messages
  //   ];
    
  //   prompt = "";
  //   console.log("Web search result:", res);
  //   console.log("Individual search results:", searchResults);
    
  // } catch (error) {
  //   console.log("Error during web search:", error);
    
  //   // Add error message to answers
  //   webAnswers = [
  //     ...webAnswers,
  //     { role: "user", content: `Search: ${prompt}` },
  //     { 
  //       role: "system", 
  //       type: "search_result",
  //       title: "Search Error",
  //       description: `Failed to search for "${prompt}": ${error.message || error}`,
  //       link: "",
  //       domain: ""
  //     }
  //   ];
    
  //   prompt = "";
  // } finally {
  //   loading = false;
  // }
  if (loading) return;
  loading = true;
  
  try {
    const res = await invoke("web_search", { search: prompt });
    const searchQuery = prompt;
    
    // Parse and structure the search results
    let searchResults = [];
    
    if (Array.isArray(res) && res.length > 0) {
      // Map each result to individual message objects
      searchResults = res.map(result => ({
        role: "system",
        type: "search_result",
        title: result.title || "",
        description: result.description || "",
        link: result.link || "",
        link_text: result.link_text || "",
        domain: result.domain || ""
      }));
    } else {
      // If no results found
      searchResults = [{
        role: "system",
        type: "search_result",
        title: "No Results Found",
        description: `No search results found for "${prompt}"`,
        link: "",
        domain: ""
      }];
    }
    
    // Add user query and all search results to answers
    webAnswers = [
      ...webAnswers,
      { role: "user", content: `Search: ${prompt}` },
      ...searchResults // Spread individual results as separate messages
    ];
    
    console.log("Web search result:", res);
    console.log("Individual search results:", searchResults);
    
    // Auto-generate summary if we have results
    if (searchResults.length > 0 && searchResults[0].title !== "No Results Found") {
      try {
        // Create summary prompt
        const resultsText = searchResults.map((result, index) => {
          return `${index + 1}. ${result.title}: ${result.description}`;
        }).join('\n');
        
        const summaryPrompt = `Summarize "${searchQuery}":\n\n${resultsText}\n\nProvide a concise summary highlighting the key information.`;
        
        // Generate summary using LLM 
        
        const summary = await generateStreamingSummaryWithUpdates(summaryPrompt);
        
        // Add summary to results
        webAnswers = [
          ...webAnswers,
          {
            role: "assistant",
            type: "search_summary",
            title: prompt,
            description: summary,
            link: "",
            domain: "AI Generated",
            content: summary
          }
        ];
        
      } catch (summaryError) {
        console.log("Error generating auto-summary:", summaryError);
      }
    }
    
    prompt = "";
    
  } catch (error) {
    console.log("Error during web search:", error);
    
    // Add error message to answers
    webAnswers = [
      ...webAnswers,
      { role: "user", content: `Search: ${prompt}` },
      { 
        role: "system", 
        type: "search_result",
        title: "Search Error",
        description: `Failed to search for "${prompt}": ${error.message || error}`,
        link: "",
        domain: ""
      }
    ];
    
    prompt = "";
  } finally {
    loading = false;
  }
};

// Example of how to access the data after search:
// After running webSearch(), you can access individual results like this:
const searchResults = answers.filter(msg => msg.type === 'search_result');
searchResults.forEach((result, index) => {
  console.log(`Result ${index + 1}:`);
  console.log(`Title: ${result.title}`);
  console.log(`Description: ${result.description}`);
  console.log(`Link: ${result.link}`);
  console.log(`Domain: ${result.domain}`);
});
// Optional: Helper function to extract specific information
const extractSearchInfo = (searchResults, type = 'all') => {
  if (!Array.isArray(searchResults)) return [];
  
  switch (type) {
    case 'titles':
      return searchResults.map(result => result.title);
    case 'links':
      return searchResults.map(result => result.link);
    case 'domains':
      return searchResults.map(result => result.domain);
    case 'descriptions':
      return searchResults.map(result => result.description);
    default:
      return searchResults;
  }
};

// Optional: Function to find results from specific domains
const filterByDomain = (searchResults, domain) => {
  return searchResults.filter(result => 
    result.domain.toLowerCase().includes(domain.toLowerCase())
  );
};

const generateStreamingSummaryWithUpdates  = async (summaryPrompt) => {
  const apiUrl = "http://localhost:11500/api/chat";
  
  const chatRequest = {
    model: "mistral:7b",
    messages: [
      {
        role: "user",
        content: summaryPrompt,
      },
    ],
    stream: true,
    think: false,
  };
  
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chatRequest),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let summaryContent = "";
    
    const readStream = async () => {
      const { done, value } = await reader.read();
      if (done) {
        return summaryContent;
      }
      
      const chunk = decoder.decode(value);
      try {
        const jsonChunk = JSON.parse(chunk);
        if (jsonChunk.message) {
          summaryContent = summaryContent + jsonChunk.message.content;
        }
        return await readStream();
      } catch (error) {
        console.error("Error parsing JSON:", error);
        return await readStream();
      }
    };
    
    return await readStream();
    
  } catch (err) {
    console.error("Error generating summary:", err);
    throw err;
  }
};


//   const addFile = async () => {
//   try {
//     const imgPath = await open({
//       multiple: false,
//       extensions: ["png", "jpeg", "jpg"], // Added "jpg"
//     });

//     if (imgPath) { // Check if user didn't cancel the dialog
//       loading = true;
//       const res = await invoke("img_to_text", { imgPath });
//       console.log(res);
      
//       // Add the extracted text to your conversation/answers array
//       answers = [
//         ...answers,
//         { role: "user", content: `Uploaded image: ${imgPath.split('/').pop()}` },
//         { role: "system", content: `Extracted text: ${res}` }
//       ];
//     }
//   } catch (error) {
//     console.log(error);
//     // Show error to user
//     answers = [
//       ...answers,
//       { role: "system", content: "Error processing image. Please try again." }
//     ];
//   } finally {
//     loading = false;
//   }
// };


// const webSearch = async () => {
//   if (loading) return;
//   loading = true;
//   try {
//     const res = await invoke("web_search", { search: prompt });
//     console.log("Web search result:", res);
    
//     // Add search results to conversation
//     answers = [
//       ...answers,
//       { role: "user", content: `Search: ${prompt}` },
//       { role: "system", content: res }
//     ];
//     prompt = ""; // Clear the input after search
//   } catch (error) {
//     console.log("Err", error);
//     // Show error to user
//     answers = [
//       ...answers,
//       { role: "system", content: "Error performing web search. Please try again." }
//     ];
//   } finally {
//     loading = false;
//   }
// };

  // Equivalent to useEffect with empty dependency array
  onMount(() => {
    invoke("health_check")
      .then((res) => {
        console.log("Result", res);
        appStatus = res;
      })
      .catch((err) => console.log("Err", err))
      .finally(() => loading = false);
  });









  

  
  function handleSave(index, e) {
    morecompanies[index].name = e.target.value.trim();
    editIndex = null;
  }

  function toggleExpand(index) {
    expandedIndex = expandedIndex === index ? null : index;
  }

  let companies = [
    "ISO Certified Companies",
    "ISO Certified Companies",
    "ISO Certified Companies",
    "ISO Certified Companies",
    "ISO Certified Companies",
    "ISO Certified Companies",
    "ISO Certified Companies",
    "ISO Certified Companies",
    "ISO Certified Companies",
    "ISO Certified Companies",
    "ISO Certified Companies",
  ];

  let activeIndexC = 1;
  let editIndexC = -1;

  function handleSaveC(index, event) {
    companies[index] = event.target.value.trim() || companies[index];
    editIndexC = -1;
  }

  export let isOn = false;
  export let isOpen = false;
  export let isTab = true;
  export let isSettings = false;
  export let visible = true;

  function toggle() {
    isOn = !isOn;
    console.log('on-off')
  }

  const toggleSidebar = () => {
    isOpen = !isOpen;
  };

  const toggleTabbar = () => {
    isTab = !isTab;
  }

  const toggleIsSettings = () => {
    isSettings = !isSettings;
  }

  let chatContainer;
  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // function sendMessage() {
  //   if (userInput.trim() !== '') {
  //     messages = [...messages, userInput.trim()];
  //     userInput = '';
  //     scrollToBottom();
  //   }
  // }

  export let onClose = () => {
    visible = !visible
  };

</script>

<style>
   .preserve-whitespace {
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .preserve-whitespace {
    white-space: pre-wrap;

  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-in-out forwards;
  }

  .animate-type-in {
    animation: typeIn 0.2s ease-out forwards;
    opacity: 0;
  }

  .animate-fade-in-up {
    animation: fadeInUp 0.4s ease-out forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes typeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

<div class="flex w-full h-screen rounded-2xl border-1 border-white/60 ">
  <div
    class="px-4 py-4 text-white h-full flex flex-col items-center gap-2"
    style="
      width: {isTab ? '27%' : '6%'};
      background-color: {isTab ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0);'};
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      overflow-x: hidden;
    "
  >

  <button on:click={toggleTabbar} class={` ${isTab ? 'flex justify-end px-3 w-full mt-6' : 'mt-6'} pb-2`}>
    <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.1546 1H6.84536C3.61706 1 1 3.61706 1 6.84536V16.1546C1 19.3829 3.61706 22 6.84536 22H16.1546C19.3829 22 22 19.3829 22 16.1546V6.84536C22 3.61706 19.3829 1 16.1546 1Z" stroke="white" stroke-width="2"/>
      <path d="M7.71143 1.21649V21.7835" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </button>

  {#if !isTab && !isSettings}
    <div class="p-1.5 items-center justify-center  bg-white/24 rounded-full w-min">
      <Fa icon={faPlus} class="text-lg" />
    </div>
  {/if}

  {#if !isTab && !isSettings}
    <Fa class="mt-2 text-xl" icon={faSearch} />
  {/if}

  {#if isTab && !isSettings}
    <div class="flex flex-col gap-3 w-full px-3">
      <div class="px-3 py-1 max-h-12 border border-white/20 flex items-center gap-2 bg-white/20 rounded-lg">
        <div class="p-1 items-center justify-center bg-white/24 rounded-full w-min">
          <Fa icon={faPlus} class="text-lg" />
        </div>
        <input class="font-poppins font-light text-[14px] appearance-none border-0 outline-none bg-transparent" placeholder="New Chat">
      </div>

      <div class="px-3 py-2 max-h-12 border border-white/20 flex items-center justify-between gap-4 bg-black/40 rounded-lg">
        <input class="font-poppins font-light text-[14px] text-white appearance-none border-0 outline-none bg-transparent placeholder-gray-100" placeholder="Search the chats">
        <Fa icon={faSearch} />
      </div>

      <div class="border-b border-white/20"></div>
    </div>
    <div class="max-h-[72.5%]">
      <div class="flex flex-col gap-2 overflow-auto max-h-7/8">
        <div class="py-1 max-h-12  flex items-center gap-2">
          <div class="p-1 items-center justify-center bg-white/24 rounded-full w-min">
            <Fa icon={faPlus} class="text-lg" />
          </div>
          <input class="font-poppins font-light text-[14px] appearance-none border-0 outline-none bg-transparent" placeholder="New Project">
        </div>
        {#each morecompanies as company, index}
       
      <div
        class={`group flex items-center justify-between gap-4 rounded-lg transition-colors duration-200 cursor-pointer mr-2 
          ${activeIndex === index ? 'bg-white/10 border border-white/70' : 'hover:bg-black/40'}`}
        on:click={() => {
          activeIndex = index;
          toggleExpand(index);
        }}
      >
      <div class="pl-3 flex items-center gap-1">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 3.57143H10.72L10.4 2.57143C10.1926 1.98466 9.80775 1.47694 9.2989 1.11859C8.79005 0.760252 8.18236 0.569034 7.56 0.571433H3C2.20435 0.571433 1.44129 0.887504 0.87868 1.45011C0.316071 2.01272 0 2.77578 0 3.57143V16.5714C0 17.3671 0.316071 18.1301 0.87868 18.6928C1.44129 19.2554 2.20435 19.5714 3 19.5714H17C17.7956 19.5714 18.5587 19.2554 19.1213 18.6928C19.6839 18.1301 20 17.3671 20 16.5714V6.57143C20 5.77578 19.6839 5.01272 19.1213 4.45011C18.5587 3.8875 17.7956 3.57143 17 3.57143ZM18 16.5714C18 16.8367 17.8946 17.091 17.7071 17.2785C17.5196 17.4661 17.2652 17.5714 17 17.5714H3C2.73478 17.5714 2.48043 17.4661 2.29289 17.2785C2.10536 17.091 2 16.8367 2 16.5714V3.57143C2 3.30622 2.10536 3.05186 2.29289 2.86433C2.48043 2.67679 2.73478 2.57143 3 2.57143H7.56C7.76964 2.57089 7.97416 2.63625 8.14463 2.75828C8.3151 2.8803 8.44291 3.05281 8.51 3.25143L9.05 4.89143C9.11709 5.09005 9.2449 5.26257 9.41537 5.38459C9.58584 5.50661 9.79036 5.57197 10 5.57143H17C17.2652 5.57143 17.5196 5.67679 17.7071 5.86433C17.8946 6.05186 18 6.30622 18 6.57143V16.5714Z" fill="white"/>
      </svg>

        {#if editIndex === index}
          <input
            class="w-full py-2 font-poppins font-light text-[14px] text-white bg-transparent appearance-none border-0 outline-none"
            type="text"
            bind:value={morecompanies[index].name}
            on:blur={(e) => handleSave(index, e)}
            on:keydown={(e) => {
              if (e.key === 'Enter') handleSave(index, e);
            }}
            autofocus
          />
        {:else}
          <p
            class="px-3 py-2 font-poppins font-light text-[14px] text-white"
            on:dblclick={() => editIndex = index}
          >
            {company.name}
          </p>
        {/if}
    </div>
        <div class="flex items-center gap-2 mr-4 text-white text-xl">
          {#if activeIndex === index}
            <Fa icon={faCheckCircle} />
          {:else}
            <Fa icon={faEllipsisH} class="group-hover:opacity-100 opacity-100" />
          {/if}
        </div>
      </div>

  {#if expandedIndex === index}
    <div class="border-l border-white/60 pl-4 mt-1 space-y-1">
      {#if company.pages.length > 0}
        {#each company.pages as page}
          <div class="flex items-center justify-between mr-4"><p class="font-poppins font-light py-2 text-[14px]">{page}
          </p><Fa icon={faEllipsisH} class=" opacity-100" /></div>
            
        {/each}
      {:else}
         <p class="font-poppins font-light text-[14px]">
            No pages
          </p>
      {/if}
    </div>
  {/if}
        {/each}
      <p class="text-white px-3 pb-4 w-full font-poppins font-light text-[14px]">See All</p>
        <div class="border-b border-white/20 mr-2"></div>
      <p class="text-white/40 px-3 py-2 w-full font-poppins font-light text-[13px]">Chats</p>
      {#each companies as name, index}
        <div
          class={`group flex items-center justify-between gap-4 rounded-lg transition-colors duration-200 cursor-pointer mr-2 
            ${activeIndexC === index ? 'bg-white/10 border border-white/70' : 'hover:bg-black/40'}`}
          on:click={() => activeIndexC = index}
        >
          {#if editIndexC === index}
            <input
              class="w-full px-3 py-2 font-poppins font-light text-[14px] text-white bg-transparent appearance-none border-0 outline-none"
              type="text"
              bind:value={companies[index]}
              on:blur={(e) => handleSave(index, e)}
              on:keydown={(e) => {
                if (e.key === 'Enter') handleSave(index, e);
              }}
              autofocus
            />
          {:else}
            <p
              class="px-3 py-2 font-poppins font-light text-[14px] text-white"
              on:dblclick={() => editIndexC = index}
            >
              {name}
            </p>
          {/if}

          <div class="mr-4 transition-opacity duration-300 text-white text-2xl">
            {#if activeIndexC === index}
              <Fa icon={faCheckCircle} />
            {:else}
              <Fa icon={faEllipsisH} class="group-hover:opacity-100 opacity-100" />
            {/if}
          </div>
        </div>
      {/each}
      </div>
    </div>
  {/if}
  
  {#if isTab && isSettings}
  <div class="w-full h-full flex flex-col items-center justify-center px-3 gap-2">
    <div class="w-full flex items-center justify-between">
      <p class="font-poppins font-semibold text-[22px]">
        Settings
      </p>
      <button  on:click={toggleIsSettings} class="p-2 items-center justify-center bg-white/24 rounded-full w-min">
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.34305 4.4999L8.08512 2.75783C8.29353 2.54741 8.41045 2.26322 8.41045 1.96706C8.41045 1.6709 8.29353 1.38671 8.08512 1.17629L7.82351 0.914681C7.61309 0.706271 7.32891 0.589355 7.03274 0.589355C6.73658 0.589355 6.45239 0.706271 6.24197 0.914681L4.4999 2.65675L2.75783 0.914681C2.54741 0.706271 2.26322 0.589355 1.96706 0.589355C1.6709 0.589355 1.38671 0.706271 1.17629 0.914681L0.914681 1.17629C0.706271 1.38671 0.589355 1.6709 0.589355 1.96706C0.589355 2.26322 0.706271 2.54741 0.914681 2.75783L2.65675 4.4999L0.914681 6.24197C0.706271 6.45239 0.589355 6.73658 0.589355 7.03274C0.589355 7.32891 0.706271 7.61309 0.914681 7.82351L1.17629 8.08512C1.38671 8.29353 1.6709 8.41045 1.96706 8.41045C2.26322 8.41045 2.54741 8.29353 2.75783 8.08512L4.4999 6.34305L6.24197 8.08512C6.45239 8.29353 6.73658 8.41045 7.03274 8.41045C7.32891 8.41045 7.61309 8.29353 7.82351 8.08512L8.08512 7.82351C8.29353 7.61309 8.41045 7.32891 8.41045 7.03274C8.41045 6.73658 8.29353 6.45239 8.08512 6.24197L6.34305 4.4999Z" fill="white"/>
        </svg>
      </button>
    </div>
    <input class="w-full bg-black/60 py-3 px-[14px] rounded-[12px] font-poppins font-light text-[15px]" type="text" placeholder="Licence key"/>
    <div class="flex w-full justify-end">
      <p class="font-poppins font-light text-[14px]">
        Edit
      </p>
    </div>
    <div class="flex justify-between items-center w-full bg-white/50 dark:bg-black/60  py-3 px-[14px] rounded-[12px] font-poppins font-light text-[15px">
      <div class="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.8833 12.8834C13.8472 11.9178 14.417 10.6279 14.4818 9.26511C14.5466 7.9023 14.1018 6.56417 13.2339 5.51145C12.366 4.45874 11.1373 3.76683 9.78711 3.57056C8.43695 3.37428 7.06208 3.68769 5.93038 4.44973C4.79868 5.21176 3.99121 6.36783 3.66531 7.69268C3.33941 9.01754 3.51842 10.4163 4.16746 11.6164C4.8165 12.8164 5.88908 13.7319 7.17621 14.1844C8.46335 14.6368 9.87283 14.5939 11.13 14.0639C11.785 13.7869 12.3803 13.3861 12.8833 12.8834ZM8.98495 4.39846C10.2014 4.38514 11.3733 4.85559 12.2429 5.70632C13.1124 6.55705 13.6084 7.71837 13.6218 8.93481C13.6351 10.1512 13.1646 11.3232 12.3139 12.1927C11.4632 13.0623 10.3019 13.5583 9.08542 13.5716L8.98495 13.5716L8.98495 4.39846Z" fill="white"/>
          <path d="M8.99498 0.500001C10.6765 0.499008 12.3206 0.996807 13.7192 1.93042C15.1178 2.86403 16.208 4.19149 16.852 5.74487C17.496 7.29825 17.6647 9.00773 17.3369 10.657C17.0091 12.3063 16.1995 13.8214 15.0104 15.0104C13.8214 16.1995 12.3063 17.0091 10.657 17.3369C9.00773 17.6647 7.29825 17.496 5.74487 16.852C4.1915 16.208 2.86403 15.1178 1.93042 13.7192C0.996808 12.3206 0.499009 10.6765 0.500003 8.99498C0.503985 6.74319 1.40027 4.58478 2.99253 2.99252C4.58478 1.40027 6.7432 0.503984 8.99498 0.500001ZM8.99498 16.1386C10.4079 16.1386 11.789 15.7196 12.9638 14.9347C14.1385 14.1497 15.0541 13.034 15.5948 11.7287C16.1355 10.4234 16.277 8.98705 16.0013 7.60133C15.7257 6.2156 15.0453 4.94273 14.0463 3.94368C13.0472 2.94463 11.7744 2.26426 10.3886 1.98862C9.0029 1.71299 7.56656 1.85445 6.26123 2.39514C4.95591 2.93582 3.84023 3.85143 3.05528 5.0262C2.27033 6.20096 1.85136 7.5821 1.85136 8.99498C1.85402 10.8888 2.6075 12.7042 3.94661 14.0433C5.28573 15.3825 7.10119 16.1359 8.99498 16.1386Z" fill="white"/>
        </svg>

        <p class="font-poppins font-light text-[15px]">
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
  </div>
  {/if}
  
  {#if isTab}
    <button  on:click={toggleIsSettings} class="flex w-full gap-2 px-3 items-center">
      <svg width="31" height="31" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.4999 18.591C17.2069 18.591 18.5908 17.2071 18.5908 15.5C18.5908 13.793 17.2069 12.4091 15.4999 12.4091C13.7928 12.4091 12.4089 13.793 12.4089 15.5C12.4089 17.2071 13.7928 18.591 15.4999 18.591Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M23.1241 18.5909C22.987 18.9017 22.9461 19.2464 23.0067 19.5806C23.0673 19.9148 23.2266 20.2233 23.4641 20.4661L23.526 20.5279C23.9126 20.9146 24.1298 21.439 24.1298 21.9858C24.1298 22.5326 23.9126 23.057 23.526 23.4437C23.1393 23.8303 22.6149 24.0475 22.0681 24.0475C21.5213 24.0475 20.9969 23.8303 20.6102 23.4437L20.5484 23.3818C20.3056 23.1443 19.9971 22.985 19.6629 22.9244C19.3287 22.8638 18.984 22.9047 18.6732 23.0418C18.3685 23.1724 18.1086 23.3893 17.9255 23.6657C17.7425 23.9422 17.6442 24.2661 17.6429 24.5976V24.7728C17.6429 25.3193 17.4258 25.8434 17.0394 26.2298C16.6529 26.6163 16.1288 26.8334 15.5823 26.8334C15.0358 26.8334 14.5117 26.6163 14.1252 26.2298C13.7388 25.8434 13.5217 25.3193 13.5217 24.7728V24.68C13.5137 24.339 13.4033 24.0083 13.2049 23.7308C13.0064 23.4534 12.7291 23.242 12.409 23.1243C12.0982 22.9871 11.7535 22.9462 11.4193 23.0068C11.085 23.0674 10.7766 23.2267 10.5338 23.4643L10.472 23.5261C10.0853 23.9127 9.56091 24.13 9.0141 24.13C8.46728 24.13 7.94287 23.9127 7.55621 23.5261C7.16956 23.1394 6.95234 22.615 6.95234 22.0682C6.95234 21.5214 7.16956 20.997 7.55621 20.6103L7.61803 20.5485C7.85555 20.3057 8.01489 19.9973 8.07549 19.663C8.13609 19.3288 8.09518 18.9841 7.95803 18.6733C7.82743 18.3686 7.61057 18.1087 7.33415 17.9257C7.05773 17.7426 6.73381 17.6444 6.40227 17.643H6.22712C5.68061 17.643 5.15648 17.4259 4.77004 17.0395C4.3836 16.6531 4.1665 16.1289 4.1665 15.5824C4.1665 15.0359 4.3836 14.5118 4.77004 14.1254C5.15648 13.7389 5.68061 13.5218 6.22712 13.5218H6.31984C6.66087 13.5138 6.99161 13.4034 7.26907 13.205C7.54652 13.0066 7.75786 12.7292 7.87561 12.4091C8.01276 12.0983 8.05367 11.7536 7.99307 11.4194C7.93247 11.0852 7.77313 10.7767 7.53561 10.5339L7.47379 10.4721C7.08713 10.0854 6.86991 9.56103 6.86991 9.01422C6.86991 8.46741 7.08713 7.94299 7.47379 7.55633C7.86044 7.16968 8.38486 6.95246 8.93167 6.95246C9.47848 6.95246 10.0029 7.16968 10.3896 7.55633L10.4514 7.61815C10.6942 7.85568 11.0026 8.01501 11.3368 8.07561C11.6711 8.13622 12.0158 8.0953 12.3265 7.95815H12.409C12.7137 7.82755 12.9736 7.61069 13.1566 7.33427C13.3397 7.05785 13.4379 6.73393 13.4393 6.40239V6.22724C13.4393 5.68073 13.6564 5.15661 14.0428 4.77017C14.4292 4.38373 14.9534 4.16663 15.4999 4.16663C16.0464 4.16663 16.5705 4.38373 16.957 4.77017C17.3434 5.15661 17.5605 5.68073 17.5605 6.22724V6.31997C17.5618 6.65151 17.6601 6.97542 17.8431 7.25184C18.0262 7.52827 18.2861 7.74513 18.5908 7.87573C18.9016 8.01288 19.2463 8.05379 19.5805 7.99319C19.9147 7.93259 20.2231 7.77325 20.466 7.53573L20.5278 7.47391C20.9144 7.08726 21.4388 6.87004 21.9857 6.87004C22.5325 6.87004 23.0569 7.08726 23.4435 7.47391C23.8302 7.86057 24.0474 8.38498 24.0474 8.93179C24.0474 9.47861 23.8302 10.003 23.4435 10.3897L23.3817 10.4515C23.1442 10.6943 22.9849 11.0027 22.9243 11.337C22.8637 11.6712 22.9046 12.0159 23.0417 12.3267V12.4091C23.3096 13.0314 23.9195 13.4363 24.5975 13.4394H24.7726C25.3191 13.4394 25.8433 13.6565 26.2297 14.0429C26.6162 14.4294 26.8333 14.9535 26.8333 15.5C26.8333 16.0465 26.6162 16.5706 26.2297 16.9571C25.8433 17.3435 25.3191 17.5606 24.7726 17.5606H24.6799C24.3484 17.5619 24.0245 17.6602 23.748 17.8432C23.4716 18.0263 23.2548 18.2862 23.1241 18.5909Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p class="font-poppins font-light text-[15px]">Settings</p>
    </button>
  {/if}
  </div>
  
  {#if deepThinking}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="shadow-lg p-[24px] bg-black rounded-[20px] min-w-md flex flex-col gap-[15px] max-w-md relative">
      
      <slot>
      <div class="text-white flex flex-col gap-4 justify-center items-center w-full h-full">
        <div
          class="h-[115px] w-[115px] rounded-full overflow-hidden bg-black cursor-pointer flex items-center justify-center"
          on:click={sendMessage}
        >
          <img src={bot} alt="Logo" />
        </div>
        <p class="font-poppins font-light text-[14px]">
          Do you want to expand my mind and capabilities?
        </p>
        <div class="flex items-center gap-4">
          <button on:click={downloadDeepthinkModel} class="bg-white/24 backdrop-filter backdrop-blur-xl py-[4px] px-[14px] rounded-full">
              <p class="font-poppins font-light text-[14px]">Yes</p>
          </button>
          <div on:click={onClose} class="bg-white/24 backdrop-filter backdrop-blur-xl py-[4px] px-[14px] rounded-full">
              <button class="font-poppins font-light text-[14px]">No</button>
          </div>
        </div>
      </div>
      </slot>
    </div>
  </div>
  {/if}

  <div class="flex-1 flex flex-col items-center justify-end h-full text-white pb-8 px-6">
  <div class={`flex-1 flex flex-col items-center justify-end max-w-6/8 pt-8 gap-[33px]`}>

    <!-- Chat history -->
    <div
      bind:this={chatContainer}
      class="flex flex-col gap-[10px]  w-full max-h-[60vh] px-4  no-scrollbar"
    > 
    

     <!-- LLM SEARCH -->
      {#if !loading && answers.length > 0}
      <div class="p-[24px] bg-black/40  rounded-[20px] flex flex-col gap-[15px]">
        {#each answers as answer}
        <p class="font-poppins font-normal text-[15px]">
          {answer.content}
        </p>
        {/each}
        <div class="flex">
          <p class="font-poppins font-light text-[14px] tracking-tighter whitespace-pre-wrap">
            {#each newContent as message, index}
              <span class="animate-type-in" style="">{message}</span>
              {#if index < newContent.length - 1}<span> </span>{/if}
            {/each}
            <!-- <span class="animate-pulse">|</span> -->
          </p>
        </div>
       
        <div class="flex items-center gap-[16px]">
              <svg
                width="17"
                height="18"
                viewBox="0 0 17 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 4.90335H2.66667C1.74619 4.90335 1 5.64954 1 6.57002V14.9034C1 15.8239 1.74619 16.57 2.66667 16.57H11C11.9205 16.57 12.6667 15.8239 12.6667 14.9034V6.57002C12.6667 5.64954 11.9205 4.90335 11 4.90335Z"
                  stroke="white"
                  stroke-width="2"
                />
                <path
                  d="M4.33331 4.07001V3.65335C4.33331 3.26584 4.33331 3.07251 4.36498 2.91168C4.42923 2.58821 4.588 2.29108 4.8212 2.05789C5.05439 1.8247 5.35152 1.66593 5.67498 1.60167C5.83582 1.57001 6.02915 1.57001 6.41665 1.57001H12.6667C14.2383 1.57001 15.0233 1.57001 15.5117 2.05834C16 2.54668 16 3.33168 16 4.90335V11.57C16 13.1417 16 13.9267 15.5117 14.415C15.0233 14.9034 14.2383 14.9034 12.6667 14.9034H11.8333"
                  stroke="white"
                  stroke-width="2"
                />
              </svg>
              <svg
                width="17"
                height="17"
                viewBox="0 0 17 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.8549 7.20778C15.6241 6.93065 15.3352 6.70756 15.0088 6.55425C14.6823 6.40095 14.3261 6.32118 13.9655 6.32056H10.2194L10.6795 5.14582C10.8708 4.63147 10.9346 4.07837 10.8652 3.53397C10.7958 2.98958 10.5954 2.47014 10.2812 2.02021C9.96698 1.57027 9.5483 1.20328 9.06108 0.95071C8.57386 0.698138 8.03264 0.567525 7.48385 0.570074C7.32582 0.570404 7.17125 0.616304 7.03865 0.702272C6.90606 0.78824 6.80107 0.910626 6.73629 1.05476L4.39502 6.32056H2.46449C1.81087 6.32056 1.18402 6.58021 0.721834 7.0424C0.259651 7.50458 0 8.13143 0 8.78506V14.5355C0 15.1892 0.259651 15.816 0.721834 16.2782C1.18402 16.7404 1.81087 17 2.46449 17H12.9222C13.4987 16.9998 14.0569 16.7975 14.4997 16.4283C14.9425 16.0591 15.2418 15.5463 15.3456 14.9792L16.3889 9.22867C16.4534 8.87327 16.439 8.50803 16.3468 8.15881C16.2545 7.80959 16.0866 7.48492 15.8549 7.20778ZM4.10749 15.357H2.46449C2.24662 15.357 2.03767 15.2705 1.88361 15.1164C1.72955 14.9624 1.643 14.7534 1.643 14.5355V8.78506C1.643 8.56718 1.72955 8.35823 1.88361 8.20417C2.03767 8.05011 2.24662 7.96356 2.46449 7.96356H4.10749V15.357ZM14.787 8.93293L13.7437 14.6834C13.7087 14.8748 13.6069 15.0475 13.4565 15.1709C13.306 15.2942 13.1167 15.3602 12.9222 15.357H5.75049V7.31458L7.98496 2.28701C8.21497 2.35406 8.42858 2.46807 8.61231 2.62183C8.79603 2.7756 8.94589 2.96578 9.05242 3.18038C9.15894 3.39498 9.21982 3.62933 9.23122 3.86864C9.24262 4.10795 9.20428 4.34702 9.11863 4.57077L8.68324 5.74551C8.59046 5.99382 8.55914 6.26088 8.59195 6.52391C8.62475 6.78694 8.72071 7.03813 8.87163 7.25603C9.02255 7.47394 9.22396 7.6521 9.45865 7.7753C9.69335 7.89851 9.95437 7.9631 10.2194 7.96356H13.9655C14.0862 7.96336 14.2054 7.98976 14.3147 8.04087C14.4241 8.09199 14.5208 8.16656 14.598 8.2593C14.6772 8.35075 14.7351 8.45855 14.7678 8.57499C14.8005 8.69144 14.807 8.81366 14.787 8.93293Z"
                  fill="white"
                />
              </svg>
              <svg
                width="17"
                height="17"
                viewBox="0 0 17 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1.00214 10.3622C1.23297 10.6394 1.52182 10.8625 1.84829 11.0158C2.17477 11.1691 2.53091 11.2488 2.89159 11.2494H6.63762L6.17758 12.4242C5.98623 12.9385 5.9225 13.4916 5.99187 14.036C6.06124 14.5804 6.26163 15.0999 6.57585 15.5498C6.89008 15.9997 7.30876 16.3667 7.79598 16.6193C8.2832 16.8719 8.82442 17.0025 9.37321 16.9999C9.53123 16.9996 9.68581 16.9537 9.8184 16.8677C9.951 16.7818 10.056 16.6594 10.1208 16.5152L12.462 11.2494H14.3926C15.0462 11.2494 15.673 10.9898 16.1352 10.5276C16.5974 10.0654 16.8571 9.43858 16.8571 8.78495V3.03446C16.8571 2.38084 16.5974 1.75399 16.1352 1.2918C15.673 0.82962 15.0462 0.569969 14.3926 0.569969H3.93489C3.35835 0.570162 2.80013 0.772476 2.35735 1.14171C1.91456 1.51095 1.61524 2.02374 1.51147 2.59085L0.468166 8.34134C0.403637 8.69674 0.418018 9.06198 0.510292 9.4112C0.602568 9.76042 0.770479 10.0851 1.00214 10.3622ZM12.7496 2.21297H14.3926C14.6104 2.21297 14.8194 2.29952 14.9734 2.45358C15.1275 2.60764 15.2141 2.81659 15.2141 3.03446V8.78495C15.2141 9.00283 15.1275 9.21178 14.9734 9.36584C14.8194 9.5199 14.6104 9.60645 14.3926 9.60645H12.7496V2.21297ZM2.07009 8.63708L3.11339 2.88659C3.14838 2.69522 3.25016 2.52247 3.4006 2.39912C3.55103 2.27576 3.74037 2.20979 3.93489 2.21297H11.1066V10.2554L8.87209 15.283C8.64209 15.2159 8.42848 15.1019 8.24475 14.9482C8.06102 14.7944 7.91117 14.6042 7.80464 14.3896C7.69811 14.175 7.63723 13.9407 7.62583 13.7014C7.61444 13.4621 7.65277 13.223 7.73843 12.9992L8.17382 11.8245C8.26659 11.5762 8.29791 11.3091 8.26511 11.0461C8.2323 10.7831 8.13634 10.5319 7.98542 10.314C7.8345 10.0961 7.6331 9.91791 7.3984 9.7947C7.16371 9.6715 6.90269 9.60691 6.63762 9.60645H2.89159C2.7709 9.60664 2.65165 9.58025 2.54232 9.52913C2.43299 9.47802 2.33627 9.40344 2.25903 9.31071C2.17989 9.21926 2.12193 9.11146 2.08926 8.99502C2.0566 8.87857 2.05006 8.75635 2.07009 8.63708Z"
                  fill="white"
                />
              </svg>
        </div>

        <div class="w-min bg-white/24 backdrop-filter backdrop-blur-xl py-[5px] px-[14px] rounded-full">
          <button on:click={toggleSidebar} class="font-poppins font-light text-[14px]">Sources</button>
        </div>
      </div>
      {/if}

      
     <!-- WEB SEARCH  -->
     {#if !loading && webAnswers.length > 0}
     <div class="p-[24px] bg-black/40  rounded-[20px] flex flex-col gap-[15px]">
      {#each webAnswers as message}
       {#if message.type === 'search_summary'}
       <p class="font-poppins font-normal text-[20px] leading-[25px]">
        {message.title}
      </p>
       <p class="font-poppins font-normal text-[15px]">
         {message.content}
       </p>
       {/if}
       {/each}
       
      
       <div class="flex items-center gap-[16px]">
             <svg
               width="17"
               height="18"
               viewBox="0 0 17 18"
               fill="none"
               xmlns="http://www.w3.org/2000/svg"
             >
               <path
                 d="M11 4.90335H2.66667C1.74619 4.90335 1 5.64954 1 6.57002V14.9034C1 15.8239 1.74619 16.57 2.66667 16.57H11C11.9205 16.57 12.6667 15.8239 12.6667 14.9034V6.57002C12.6667 5.64954 11.9205 4.90335 11 4.90335Z"
                 stroke="white"
                 stroke-width="2"
               />
               <path
                 d="M4.33331 4.07001V3.65335C4.33331 3.26584 4.33331 3.07251 4.36498 2.91168C4.42923 2.58821 4.588 2.29108 4.8212 2.05789C5.05439 1.8247 5.35152 1.66593 5.67498 1.60167C5.83582 1.57001 6.02915 1.57001 6.41665 1.57001H12.6667C14.2383 1.57001 15.0233 1.57001 15.5117 2.05834C16 2.54668 16 3.33168 16 4.90335V11.57C16 13.1417 16 13.9267 15.5117 14.415C15.0233 14.9034 14.2383 14.9034 12.6667 14.9034H11.8333"
                 stroke="white"
                 stroke-width="2"
               />
             </svg>
             <svg
               width="17"
               height="17"
               viewBox="0 0 17 17"
               fill="none"
               xmlns="http://www.w3.org/2000/svg"
             >
               <path
                 d="M15.8549 7.20778C15.6241 6.93065 15.3352 6.70756 15.0088 6.55425C14.6823 6.40095 14.3261 6.32118 13.9655 6.32056H10.2194L10.6795 5.14582C10.8708 4.63147 10.9346 4.07837 10.8652 3.53397C10.7958 2.98958 10.5954 2.47014 10.2812 2.02021C9.96698 1.57027 9.5483 1.20328 9.06108 0.95071C8.57386 0.698138 8.03264 0.567525 7.48385 0.570074C7.32582 0.570404 7.17125 0.616304 7.03865 0.702272C6.90606 0.78824 6.80107 0.910626 6.73629 1.05476L4.39502 6.32056H2.46449C1.81087 6.32056 1.18402 6.58021 0.721834 7.0424C0.259651 7.50458 0 8.13143 0 8.78506V14.5355C0 15.1892 0.259651 15.816 0.721834 16.2782C1.18402 16.7404 1.81087 17 2.46449 17H12.9222C13.4987 16.9998 14.0569 16.7975 14.4997 16.4283C14.9425 16.0591 15.2418 15.5463 15.3456 14.9792L16.3889 9.22867C16.4534 8.87327 16.439 8.50803 16.3468 8.15881C16.2545 7.80959 16.0866 7.48492 15.8549 7.20778ZM4.10749 15.357H2.46449C2.24662 15.357 2.03767 15.2705 1.88361 15.1164C1.72955 14.9624 1.643 14.7534 1.643 14.5355V8.78506C1.643 8.56718 1.72955 8.35823 1.88361 8.20417C2.03767 8.05011 2.24662 7.96356 2.46449 7.96356H4.10749V15.357ZM14.787 8.93293L13.7437 14.6834C13.7087 14.8748 13.6069 15.0475 13.4565 15.1709C13.306 15.2942 13.1167 15.3602 12.9222 15.357H5.75049V7.31458L7.98496 2.28701C8.21497 2.35406 8.42858 2.46807 8.61231 2.62183C8.79603 2.7756 8.94589 2.96578 9.05242 3.18038C9.15894 3.39498 9.21982 3.62933 9.23122 3.86864C9.24262 4.10795 9.20428 4.34702 9.11863 4.57077L8.68324 5.74551C8.59046 5.99382 8.55914 6.26088 8.59195 6.52391C8.62475 6.78694 8.72071 7.03813 8.87163 7.25603C9.02255 7.47394 9.22396 7.6521 9.45865 7.7753C9.69335 7.89851 9.95437 7.9631 10.2194 7.96356H13.9655C14.0862 7.96336 14.2054 7.98976 14.3147 8.04087C14.4241 8.09199 14.5208 8.16656 14.598 8.2593C14.6772 8.35075 14.7351 8.45855 14.7678 8.57499C14.8005 8.69144 14.807 8.81366 14.787 8.93293Z"
                 fill="white"
               />
             </svg>
             <svg
               width="17"
               height="17"
               viewBox="0 0 17 17"
               fill="none"
               xmlns="http://www.w3.org/2000/svg"
             >
               <path
                 d="M1.00214 10.3622C1.23297 10.6394 1.52182 10.8625 1.84829 11.0158C2.17477 11.1691 2.53091 11.2488 2.89159 11.2494H6.63762L6.17758 12.4242C5.98623 12.9385 5.9225 13.4916 5.99187 14.036C6.06124 14.5804 6.26163 15.0999 6.57585 15.5498C6.89008 15.9997 7.30876 16.3667 7.79598 16.6193C8.2832 16.8719 8.82442 17.0025 9.37321 16.9999C9.53123 16.9996 9.68581 16.9537 9.8184 16.8677C9.951 16.7818 10.056 16.6594 10.1208 16.5152L12.462 11.2494H14.3926C15.0462 11.2494 15.673 10.9898 16.1352 10.5276C16.5974 10.0654 16.8571 9.43858 16.8571 8.78495V3.03446C16.8571 2.38084 16.5974 1.75399 16.1352 1.2918C15.673 0.82962 15.0462 0.569969 14.3926 0.569969H3.93489C3.35835 0.570162 2.80013 0.772476 2.35735 1.14171C1.91456 1.51095 1.61524 2.02374 1.51147 2.59085L0.468166 8.34134C0.403637 8.69674 0.418018 9.06198 0.510292 9.4112C0.602568 9.76042 0.770479 10.0851 1.00214 10.3622ZM12.7496 2.21297H14.3926C14.6104 2.21297 14.8194 2.29952 14.9734 2.45358C15.1275 2.60764 15.2141 2.81659 15.2141 3.03446V8.78495C15.2141 9.00283 15.1275 9.21178 14.9734 9.36584C14.8194 9.5199 14.6104 9.60645 14.3926 9.60645H12.7496V2.21297ZM2.07009 8.63708L3.11339 2.88659C3.14838 2.69522 3.25016 2.52247 3.4006 2.39912C3.55103 2.27576 3.74037 2.20979 3.93489 2.21297H11.1066V10.2554L8.87209 15.283C8.64209 15.2159 8.42848 15.1019 8.24475 14.9482C8.06102 14.7944 7.91117 14.6042 7.80464 14.3896C7.69811 14.175 7.63723 13.9407 7.62583 13.7014C7.61444 13.4621 7.65277 13.223 7.73843 12.9992L8.17382 11.8245C8.26659 11.5762 8.29791 11.3091 8.26511 11.0461C8.2323 10.7831 8.13634 10.5319 7.98542 10.314C7.8345 10.0961 7.6331 9.91791 7.3984 9.7947C7.16371 9.6715 6.90269 9.60691 6.63762 9.60645H2.89159C2.7709 9.60664 2.65165 9.58025 2.54232 9.52913C2.43299 9.47802 2.33627 9.40344 2.25903 9.31071C2.17989 9.21926 2.12193 9.11146 2.08926 8.99502C2.0566 8.87857 2.05006 8.75635 2.07009 8.63708Z"
                 fill="white"
               />
             </svg>
       </div>

       <div class="w-min bg-white/24 backdrop-filter backdrop-blur-xl py-[5px] px-[14px] rounded-full">
         <button on:click={toggleSidebar} class="font-poppins font-light text-[14px]">Sources</button>
       </div>
     </div>
     {/if}





      {#if loading}
      <div class="p-[24px] bg-black/40 rounded-[20px] flex items-center gap-[15px]">
        <div
            class="h-[42px] w-[42px] rounded-full overflow-hidden bg-black cursor-pointer flex items-center justify-center"
            on:click={sendMessage}
          >
            <img src={logo} alt="Logo" />
          </div>
        
        <p class="font-poppins font-light text-[15px]">
          Searching the web...
        </p>
      </div>
      {/if}
      <!-- <div class="p-[24px] bg-black/40 rounded-[20px] flex items-center gap-[15px]">
        <div
            class="h-[42px] w-[42px] rounded-full overflow-hidden bg-black cursor-pointer flex items-center justify-center"
            on:click={sendMessage}
          >
            <img src={logo} alt="Logo" />
          </div>
        
        <p class="font-poppins font-light text-[15px]">
          Searching the web...
        </p>
      </div> -->
      {#if deepThinking}
      <div class="p-[24px] bg-black/40 rounded-[20px] flex items-center gap-[15px]">
        <div
            class="h-[42px] w-[42px] rounded-full overflow-hidden bg-black cursor-pointer flex items-center justify-center"
            on:click={sendMessage}
          >
            <img src={logo} alt="Logo" />
          </div>
        
        <p class="font-poppins font-light text-[15px]">
          Deep thinking...
        </p>
      </div>
      {/if}

      <!-- {#if error}
       <div class="p-[24px] bg-black/40 rounded-[20px] flex items-center gap-[15px]">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.6666 0C5.67465 0 0 5.67465 0 12.6666C0 19.6586 5.67465 25.3333 12.6666 25.3333C19.6586 25.3333 25.3333 19.6586 25.3333 12.6666C25.3333 5.67465 19.6586 0 12.6666 0ZM12.6666 13.9333C11.97 13.9333 11.4 13.3633 11.4 12.6666V7.59998C11.4 6.90331 11.97 6.33331 12.6666 6.33331C13.3633 6.33331 13.9333 6.90331 13.9333 7.59998V12.6666C13.9333 13.3633 13.3633 13.9333 12.6666 13.9333ZM13.9333 18.9999H11.4V16.4666H13.9333V18.9999Z" fill="#FF6060"/>
        </svg>

        <p class="font-poppins text-[15px] text-[#FF6060]">
          Error - lorem ipsum
        </p>
      </div>
      {/if} -->


      <!-- FILE UPLOAD -->
       <!-- <div class="flex flex-col items-end justify-end gap-2 w-full">
          <div class="p-[14px] bg-[#2563EB99]/60 rounded-[20px]">
            <p class="font-poppins font-light max-w-[365px] text-[14px]">
              ISO Certified Companies Cutting Tools Materials Made of Steel Near Me
            </p>
            <div class="rounded-2xl flex items-center gap-2 py-1 px-2 bg-white/20 mt-4 w-26">
              <svg width="19" height="24" viewBox="0 0 19 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.9794 7.1296C18.9625 6.95596 18.8884 6.79309 18.7688 6.6672L12.4355 0.2672C12.4149 0.248 12.3833 0.248 12.3611 0.2288C12.2135 0.0825637 12.0152 0.000448652 11.8085 0H3.17142C2.33056 0.000847165 1.52439 0.338767 0.929812 0.9396C0.335238 1.54043 0.00083834 2.35509 0 3.2048V20.7952C0 22.5632 1.42183 24 3.17142 24H15.8286C16.6694 23.9992 17.4756 23.6612 18.0702 23.0604C18.6648 22.4596 18.9992 21.6449 19 20.7952V7.2336C19 7.1984 18.9842 7.1648 18.9794 7.1296ZM14.231 6.4336C13.8161 6.43275 13.4185 6.26571 13.1252 5.96909C12.832 5.67247 12.6671 5.27047 12.6667 4.8512V2.7904L16.2925 6.4352L14.231 6.4336Z" fill="white"/>
              </svg>
              <div>
                <p class="font-poppins font-light max-w-[365px] text-[14px]">
                  File Name
                </p>
                <p class="font-poppins font-light max-w-[365px] text-[10px]">
                  File Name
                </p>
              </div>
            </div>
            <div class="rounded-2xl flex items-center gap-2 py-3 px-3 bg-red-500/20 mt-4">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.6666 0C5.67465 0 0 5.67465 0 12.6666C0 19.6586 5.67465 25.3333 12.6666 25.3333C19.6586 25.3333 25.3333 19.6586 25.3333 12.6666C25.3333 5.67465 19.6586 0 12.6666 0ZM12.6666 13.9333C11.97 13.9333 11.4 13.3633 11.4 12.6666V7.59998C11.4 6.90331 11.97 6.33331 12.6666 6.33331C13.3633 6.33331 13.9333 6.90331 13.9333 7.59998V12.6666C13.9333 13.3633 13.3633 13.9333 12.6666 13.9333ZM13.9333 18.9999H11.4V16.4666H13.9333V18.9999Z" fill="#FF6060"/>
              </svg>
              <p class="font-poppins max-w-[365px] text-[14px]">
                Error - lorem ipsum
              </p>
            </div>
          </div>
          <svg width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4.6665H2.66667C1.74619 4.6665 1 5.4127 1 6.33317V14.6665C1 15.587 1.74619 16.3332 2.66667 16.3332H11C11.9205 16.3332 12.6667 15.587 12.6667 14.6665V6.33317C12.6667 5.4127 11.9205 4.6665 11 4.6665Z" stroke="white" stroke-width="2"/>
            <path d="M4.3335 3.83326V3.41659C4.3335 3.02909 4.3335 2.83576 4.36516 2.67492C4.42942 2.35146 4.58819 2.05433 4.82138 1.82114C5.05457 1.58794 5.3517 1.42917 5.67517 1.36492C5.836 1.33325 6.02933 1.33325 6.41683 1.33325H12.6669C14.2385 1.33325 15.0235 1.33325 15.5119 1.82159C16.0002 2.30992 16.0002 3.09492 16.0002 4.66659V11.3333C16.0002 12.9049 16.0002 13.6899 15.5119 14.1783C15.0235 14.6666 14.2385 14.6666 12.6669 14.6666H11.8335" stroke="white" stroke-width="2"/>
          </svg>
      </div>  


      
       <!-- Processing Status -->
   {#if isProcessing}
  <div class="mb-6">
    <div class="flex items-center gap-2 p-4 bg-blue-600/20 rounded-lg">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
      <span>Processing file...</span>
    </div>
  </div>
{/if} 

<!-- Error Display -->
 {#if error}
  <div class="mb-6">
    <div class="rounded-2xl flex items-center gap-2 py-3 px-3 bg-red-500/20">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.6666 0C5.67465 0 0 5.67465 0 12.6666C0 19.6586 5.67465 25.3333 12.6666 25.3333C19.6586 25.3333 25.3333 19.6586 25.3333 12.6666C25.3333 5.67465 19.6586 0 12.6666 0ZM12.6666 13.9333C11.97 13.9333 11.4 13.3633 11.4 12.6666V7.59998C11.4 6.90331 11.97 6.33331 12.6666 6.33331C13.3633 6.33331 13.9333 6.90331 13.9333 7.59998V12.6666C13.9333 13.3633 13.3633 13.9333 12.6666 13.9333ZM13.9333 18.9999H11.4V16.4666H13.9333V18.9999Z" fill="#FF6060"/>
      </svg>
      <p class="font-poppins max-w-[365px] text-[14px]">
        {error}
      </p>
    </div>
  </div>
{/if}


      {#if showResults && extractedText}
      <div class="flex flex-col items-end justify-end gap-2 w-full">
        <div class="p-[14px] bg-[#2563EB99]/60 rounded-[20px] w-full">
          <p class="font-poppins font-light max-w-[365px] text-[14px] mb-4">
        
          </p>
          <div class="bg-white/10 p-3 rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
            {extractedText}
          </div>
          <div class="rounded-2xl flex items-center gap-2 py-1 px-2 bg-white/20 mt-4 w-fit">
            <svg width="19" height="24" viewBox="0 0 19 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.9794 7.1296C18.9625 6.95596 18.8884 6.79309 18.7688 6.6672L12.4355 0.2672C12.4149 0.248 12.3833 0.248 12.3611 0.2288C12.2135 0.0825637 12.0152 0.000448652 11.8085 0H3.17142C2.33056 0.000847165 1.52439 0.338767 0.929812 0.9396C0.335238 1.54043 0.00083834 2.35509 0 3.2048V20.7952C0 22.5632 1.42183 24 3.17142 24H15.8286C16.6694 23.9992 17.4756 23.6612 18.0702 23.0604C18.6648 22.4596 18.9992 21.6449 19 20.7952V7.2336C19 7.1984 18.9842 7.1648 18.9794 7.1296ZM14.231 6.4336C13.8161 6.43275 13.4185 6.26571 13.1252 5.96909C12.832 5.67247 12.6671 5.27047 12.6667 4.8512V2.7904L16.2925 6.4352L14.231 6.4336Z" fill="white"/>
            </svg>
            <div>
              <p class="font-poppins font-light max-w-[365px] text-[14px]">
                {currentFile?.name || 'File'}
              </p>
              <p class="font-poppins font-light max-w-[365px] text-[10px]">
                Processed
              </p>
            </div>
          </div>
        </div>
        <button 
          on:click={copyText}
          class="hover:bg-white/10 rounded p-2 transition-colors" 
          title="Copy extracted text"
        >
          <svg width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4.6665H2.66667C1.74619 4.6665 1 5.4127 1 6.33317V14.6665C1 15.587 1.74619 16.3332 2.66667 16.3332H11C11.9205 16.3332 12.6667 15.587 12.6667 14.6665V6.33317C12.6667 5.4127 11.9205 4.6665 11 4.6665Z" stroke="white" stroke-width="2"/>
            <path d="M4.3335 3.83326V3.41659C4.3335 3.02909 4.3335 2.83576 4.36516 2.67492C4.42942 2.35146 4.58819 2.05433 4.82138 1.82114C5.05457 1.58794 5.3517 1.42917 5.67517 1.36492C5.836 1.33325 6.02933 1.33325 6.41683 1.33325H12.6669C14.2385 1.33325 15.0235 1.33325 15.5119 1.82159C16.0002 2.30992 16.0002 3.09492 16.0002 4.66659V11.3333C16.0002 12.9049 16.0002 13.6899 15.5119 14.1783C15.0235 14.6666 14.2385 14.6666 12.6669 14.6666H11.8335" stroke="white" stroke-width="2"/>
          </svg>
        </button>
      </div>
    {/if}



      {#each answers as message (message.id)}
      <div class="flex justify-end w-full">
        <div class="p-[14px] bg-[#2563EB99]/60 rounded-[20px]">
          <p class="font-poppins font-light max-w-[365px] text-[14px]">{message.content}</p>
        </div>
      </div>
    {/each}
      
    </div>

    <!-- Input box -->
    <!-- <div class="w-full min-h-[120px] pt-[4px] pr-[10px] pb-[23px] pl-[10px]">
      <div class="flex flex-col w-full min-h-[114px] rounded-[26px] p-[6px] gap-[14px] bg-black/40">
        <div class="flex gap-4">
          <div class="rounded-2xl flex items-center gap-2 py-1 px-2 bg-white/5 ml-[12px] w-32">
            <svg width="19" height="24" viewBox="0 0 19 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.9794 7.1296C18.9625 6.95596 18.8884 6.79309 18.7688 6.6672L12.4355 0.2672C12.4149 0.248 12.3833 0.248 12.3611 0.2288C12.2135 0.0825637 12.0152 0.000448652 11.8085 0H3.17142C2.33056 0.000847165 1.52439 0.338767 0.929812 0.9396C0.335238 1.54043 0.00083834 2.35509 0 3.2048V20.7952C0 22.5632 1.42183 24 3.17142 24H15.8286C16.6694 23.9992 17.4756 23.6612 18.0702 23.0604C18.6648 22.4596 18.9992 21.6449 19 20.7952V7.2336C19 7.1984 18.9842 7.1648 18.9794 7.1296ZM14.231 6.4336C13.8161 6.43275 13.4185 6.26571 13.1252 5.96909C12.832 5.67247 12.6671 5.27047 12.6667 4.8512V2.7904L16.2925 6.4352L14.231 6.4336Z" fill="#2563EB"/>
            </svg>
            <div>
              <p class="font-poppins font-light max-w-[365px] text-[14px] text-white">
                File Name
              </p>
              <p class="font-poppins font-light max-w-[365px] text-[10px] text-white/60">
                File Name
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 1.92525C9.20148 1.92525 10.376 2.28153 11.375 2.94903C12.3739 3.61654 13.1526 4.56528 13.6123 5.6753C14.0721 6.78531 14.1924 8.00674 13.958 9.18512C13.7236 10.3635 13.1451 11.4459 12.2955 12.2955C11.4459 13.1451 10.3635 13.7236 9.18513 13.958C8.00674 14.1924 6.78531 14.0721 5.6753 13.6123C4.56528 13.1525 3.61654 12.3739 2.94904 11.3749C2.28154 10.376 1.92526 9.20147 1.92526 8C1.92646 6.38925 2.56686 4.84481 3.70584 3.70583C4.84481 2.56686 6.38925 1.92645 8 1.92525ZM8 0C6.41775 0 4.87104 0.469192 3.55544 1.34824C2.23985 2.22729 1.21447 3.47672 0.608967 4.93853C0.00346631 6.40034 -0.15496 8.00887 0.153721 9.56072C0.462403 11.1126 1.22433 12.538 2.34315 13.6569C3.46197 14.7757 4.88743 15.5376 6.43928 15.8463C7.99113 16.155 9.59966 15.9965 11.0615 15.391C12.5233 14.7855 13.7727 13.7602 14.6518 12.4446C15.5308 11.129 16 9.58225 16 8C16 5.87827 15.1571 3.84344 13.6569 2.34315C12.1566 0.842855 10.1217 0 8 0Z" fill="white" fill-opacity="0.2"/>
              <path d="M8 1.92525C9.20148 1.92525 10.376 2.28153 11.375 2.94903C12.3739 3.61654 13.1526 4.56528 13.6123 5.6753C14.0721 6.78531 14.1924 8.00674 13.958 9.18512C13.7236 10.3635 13.1451 11.4459 12.2955 12.2955C11.4459 13.1451 10.3635 13.7236 9.18513 13.958C8.00674 14.1924 6.78531 14.0721 5.6753 13.6123C4.56528 13.1525 3.61654 12.3739 2.94904 11.3749C2.28154 10.376 1.92526 9.20147 1.92526 8C1.92646 6.38925 2.56686 4.84481 3.70584 3.70583C4.84481 2.56686 6.38925 1.92645 8 1.92525Z" fill="white" fill-opacity="0.2"/>
              <path d="M9.40428 7.99997L10.7316 6.67268C10.8904 6.51236 10.9794 6.29583 10.9794 6.07019C10.9794 5.84454 10.8904 5.62802 10.7316 5.4677L10.5322 5.26837C10.3719 5.10959 10.1554 5.02051 9.92976 5.02051C9.70411 5.02051 9.48759 5.10959 9.32726 5.26837L7.99997 6.59567L6.67268 5.26837C6.51236 5.10959 6.29583 5.02051 6.07019 5.02051C5.84454 5.02051 5.62802 5.10959 5.4677 5.26837L5.26837 5.4677C5.10959 5.62802 5.02051 5.84454 5.02051 6.07019C5.02051 6.29583 5.10959 6.51236 5.26837 6.67268L6.59567 7.99997L5.26837 9.32726C5.10959 9.48759 5.02051 9.70411 5.02051 9.92976C5.02051 10.1554 5.10959 10.3719 5.26837 10.5322L5.4677 10.7316C5.62802 10.8904 5.84454 10.9794 6.07019 10.9794C6.29583 10.9794 6.51236 10.8904 6.67268 10.7316L7.99997 9.40428L9.32726 10.7316C9.48759 10.8904 9.70411 10.9794 9.92976 10.9794C10.1554 10.9794 10.3719 10.8904 10.5322 10.7316L10.7316 10.5322C10.8904 10.3719 10.9794 10.1554 10.9794 9.92976C10.9794 9.70411 10.8904 9.48759 10.7316 9.32726L9.40428 7.99997Z" fill="white"/>
            </svg>
          </div>
          <img src={watch} alt="watch" />
        </div>
        
        <div class="w-full h-[41px] px-[12px] py-[10px]">
          <textarea
            bind:value={prompt}
            class="w-full max-h-[100px] font-poppins font-light text-[14px] text-white/60 appearance-none border-0 outline-none bg-transparent overflow-y-auto no-scrollbar resize-none"
            placeholder="Ask me anything"
            on:keydown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendPrompt();
              }
            }}
          ></textarea>
        </div>
        
        <div class="flex w-full justify-between gap-[9px]">
          <div class="flex items-center gap-[10px]">
            <div class="flex items-center text-center p-4 cursor-pointer" on:click={addFile}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <button 
              class="bg-white/24 backdrop-filter backdrop-blur-xl py-[8px] px-[14px] rounded-full cursor-pointer"
              class:opacity-50={loading || deepThinking}
              disabled={loading || deepThinking}
              on:click={sendDeepThinkPrompt}
            >
              <p class="font-poppins font-light text-[14px] text-white">
                {deepThinking ? 'Deep Thinking...' : 'Deep Thinking'}
              </p>
            </button>
            <button 
              class="bg-white/24 backdrop-filter backdrop-blur-xl py-[8px] px-[14px] rounded-full cursor-pointer"
              class:opacity-50={loading}
              disabled={loading}
              on:click={webSearch}
            >
              <p class="font-poppins font-light text-[14px] text-white">Search the web</p>
            </button>
          </div>
          <div
            class="h-[42px] w-[42px] rounded-full overflow-hidden bg-[#2563EB] cursor-pointer flex items-center justify-center"
            class:opacity-50={loading}
            on:click={sendSimplePrompt}
          >
            <img src={logo} alt="Logo" />
          </div>
        </div>
      </div>
    </div>  -->
    <div class="w-[500px]  min-h-[120px] pt-[4px] pr-[3px] pb-[23px] pl-[3px]">
      <div class="flex flex-col w-full min-h-[114px] rounded-[26px] p-[6px] gap-[14px] bg-black/40">
         <!-- <div class="flex gap-4">
          <div class="rounded-2xl flex items-center gap-2 py-1 px-2 bg-white/5 ml-[12px] w-32">
                <svg width="19" height="24" viewBox="0 0 19 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.9794 7.1296C18.9625 6.95596 18.8884 6.79309 18.7688 6.6672L12.4355 0.2672C12.4149 0.248 12.3833 0.248 12.3611 0.2288C12.2135 0.0825637 12.0152 0.000448652 11.8085 0H3.17142C2.33056 0.000847165 1.52439 0.338767 0.929812 0.9396C0.335238 1.54043 0.00083834 2.35509 0 3.2048V20.7952C0 22.5632 1.42183 24 3.17142 24H15.8286C16.6694 23.9992 17.4756 23.6612 18.0702 23.0604C18.6648 22.4596 18.9992 21.6449 19 20.7952V7.2336C19 7.1984 18.9842 7.1648 18.9794 7.1296ZM14.231 6.4336C13.8161 6.43275 13.4185 6.26571 13.1252 5.96909C12.832 5.67247 12.6671 5.27047 12.6667 4.8512V2.7904L16.2925 6.4352L14.231 6.4336Z" fill="#2563EB"/>
                </svg>
                <div>
                  <p class="font-poppins font-light max-w-[365px] text-[14px]">
                    File Name
                  </p>
                  <p class="font-poppins font-light max-w-[365px] text-[10px]">
                    File Name
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 1.92525C9.20148 1.92525 10.376 2.28153 11.375 2.94903C12.3739 3.61654 13.1526 4.56528 13.6123 5.6753C14.0721 6.78531 14.1924 8.00674 13.958 9.18512C13.7236 10.3635 13.1451 11.4459 12.2955 12.2955C11.4459 13.1451 10.3635 13.7236 9.18513 13.958C8.00674 14.1924 6.78531 14.0721 5.6753 13.6123C4.56528 13.1525 3.61654 12.3739 2.94904 11.3749C2.28154 10.376 1.92526 9.20147 1.92526 8C1.92646 6.38925 2.56686 4.84481 3.70584 3.70583C4.84481 2.56686 6.38925 1.92645 8 1.92525ZM8 0C6.41775 0 4.87104 0.469192 3.55544 1.34824C2.23985 2.22729 1.21447 3.47672 0.608967 4.93853C0.00346631 6.40034 -0.15496 8.00887 0.153721 9.56072C0.462403 11.1126 1.22433 12.538 2.34315 13.6569C3.46197 14.7757 4.88743 15.5376 6.43928 15.8463C7.99113 16.155 9.59966 15.9965 11.0615 15.391C12.5233 14.7855 13.7727 13.7602 14.6518 12.4446C15.5308 11.129 16 9.58225 16 8C16 5.87827 15.1571 3.84344 13.6569 2.34315C12.1566 0.842855 10.1217 0 8 0Z" fill="white" fill-opacity="0.2"/>
                  <path d="M8 1.92525C9.20148 1.92525 10.376 2.28153 11.375 2.94903C12.3739 3.61654 13.1526 4.56528 13.6123 5.6753C14.0721 6.78531 14.1924 8.00674 13.958 9.18512C13.7236 10.3635 13.1451 11.4459 12.2955 12.2955C11.4459 13.1451 10.3635 13.7236 9.18513 13.958C8.00674 14.1924 6.78531 14.0721 5.6753 13.6123C4.56528 13.1525 3.61654 12.3739 2.94904 11.3749C2.28154 10.376 1.92526 9.20147 1.92526 8C1.92646 6.38925 2.56686 4.84481 3.70584 3.70583C4.84481 2.56686 6.38925 1.92645 8 1.92525Z" fill="white" fill-opacity="0.2"/>
                  <path d="M9.40428 7.99997L10.7316 6.67268C10.8904 6.51236 10.9794 6.29583 10.9794 6.07019C10.9794 5.84454 10.8904 5.62802 10.7316 5.4677L10.5322 5.26837C10.3719 5.10959 10.1554 5.02051 9.92976 5.02051C9.70411 5.02051 9.48759 5.10959 9.32726 5.26837L7.99997 6.59567L6.67268 5.26837C6.51236 5.10959 6.29583 5.02051 6.07019 5.02051C5.84454 5.02051 5.62802 5.10959 5.4677 5.26837L5.26837 5.4677C5.10959 5.62802 5.02051 5.84454 5.02051 6.07019C5.02051 6.29583 5.10959 6.51236 5.26837 6.67268L6.59567 7.99997L5.26837 9.32726C5.10959 9.48759 5.02051 9.70411 5.02051 9.92976C5.02051 10.1554 5.10959 10.3719 5.26837 10.5322L5.4677 10.7316C5.62802 10.8904 5.84454 10.9794 6.07019 10.9794C6.29583 10.9794 6.51236 10.8904 6.67268 10.7316L7.99997 9.40428L9.32726 10.7316C9.48759 10.8904 9.70411 10.9794 9.92976 10.9794C10.1554 10.9794 10.3719 10.8904 10.5322 10.7316L10.7316 10.5322C10.8904 10.3719 10.9794 10.1554 10.9794 9.92976C10.9794 9.70411 10.8904 9.48759 10.7316 9.32726L9.40428 7.99997Z" fill="white"/>
                </svg>
          </div>
          <img src={watch} alt="">
        </div>   -->
        <div class="w-full h-[41px] px-[12px] py-[10px]">
          <textarea
            bind:value={prompt}
            class="w-full max-h-[100px] font-poppins font-light text-[14px] text-white/60 appearance-none border-0 outline-none bg-transparent overflow-y-auto no-scrollbar"
            placeholder="Ask me anything"
          ></textarea>
        </div>
        <div class="flex w-full max-w-[780px] justify-between gap-[9px]">
          <div class="flex items-center gap-[10px]">
            <div on:click={addFile} class="flex items-center text-center p-4">
              <Fa icon={faPlus} class="text-2xl"  />
            </div>
            <div 
             on:click={sendDeepThinkPrompt}
             class="bg-white/24 backdrop-filter backdrop-blur-xl py-[8px] px-[14px] rounded-full cursor-pointer">
              <p class="font-poppins font-light text-[14px]">Deep Thinking</p>
            </div>
            <div
             on:click={webSearch}
            class="bg-white/24 backdrop-filter backdrop-blur-xl py-[8px] px-[14px] rounded-full cursor-pointer">
              <p class="font-poppins font-light text-[14px]">Search the web</p>
            </div>
          </div>
          <div
            class="h-[42px] w-[42px] rounded-full overflow-hidden bg-[#2563EB] cursor-pointer flex items-center justify-center"
            on:click={sendSimplePrompt}
          >
            <img src={logo} alt="Logo" />
          </div>
        </div>
      </div>
    </div>

  </div>
</div>
  <div
    class=" text-white transition-all duration-300 ease-in-out"
    style="
      width: {isOpen ? '27%' : '0'};
      background-color: {isOpen ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0);'};
      border-left: 1px solid {isOpen ? 'rgba(255, 255, 255, 0.1);' : 'rgba(255, 255, 255, 0);'};
      overflow-x: hidden;
    "
  >
    {#if isOpen}
    <div class="flex flex-col gap-6 justify-center px-4 h-full w-full">
        <div class="w-full flex flex-col gap-2 ">
            <div class="w-full flex items-center justify-between">
                <p class="font-poppins font-semibold text-[22px]">
                    Sources
                </p>
                <button  on:click={toggleSidebar} class="p-2 items-center justify-center bg-white/24 rounded-full w-min">
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.34305 4.4999L8.08512 2.75783C8.29353 2.54741 8.41045 2.26322 8.41045 1.96706C8.41045 1.6709 8.29353 1.38671 8.08512 1.17629L7.82351 0.914681C7.61309 0.706271 7.32891 0.589355 7.03274 0.589355C6.73658 0.589355 6.45239 0.706271 6.24197 0.914681L4.4999 2.65675L2.75783 0.914681C2.54741 0.706271 2.26322 0.589355 1.96706 0.589355C1.6709 0.589355 1.38671 0.706271 1.17629 0.914681L0.914681 1.17629C0.706271 1.38671 0.589355 1.6709 0.589355 1.96706C0.589355 2.26322 0.706271 2.54741 0.914681 2.75783L2.65675 4.4999L0.914681 6.24197C0.706271 6.45239 0.589355 6.73658 0.589355 7.03274C0.589355 7.32891 0.706271 7.61309 0.914681 7.82351L1.17629 8.08512C1.38671 8.29353 1.6709 8.41045 1.96706 8.41045C2.26322 8.41045 2.54741 8.29353 2.75783 8.08512L4.4999 6.34305L6.24197 8.08512C6.45239 8.29353 6.73658 8.41045 7.03274 8.41045C7.32891 8.41045 7.61309 8.29353 7.82351 8.08512L8.08512 7.82351C8.29353 7.61309 8.41045 7.32891 8.41045 7.03274C8.41045 6.73658 8.29353 6.45239 8.08512 6.24197L6.34305 4.4999Z" fill="white"/>
                  </svg>
                </button>
            </div>
        </div>
        <div class=" flex flex-col gap-4 h-6/8 w-full overflow-auto">
          {#each webAnswers as message }

              <div class="w-full flex flex-col gap-1 pr-2">
                <div class=" w-full flex gap-2 items-center">
                  <div class="h-8 w-8 bg-white/50 rounded-full" style="width: 32px; height: 32px; background-color: rgba(255, 255, 255, 0.5); border-radius: 50%;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
                  <div>
                    <p class="font-poppins font-normal text-[14px]">{message.domain}</p>
                    <p class="font-poppins font-light text-[14px]">{message.link}</p>
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <p class="font-poppins font-semibold text-[15px]">{message.title}</p>
                  <p class="font-poppins font-light text-[14px]">{message.description}</p>
                </div>
              </div>

          {/each}
            <!-- <div class="w-full flex flex-col gap-1 pr-2">
                <div class=" w-full flex gap-2 items-center">
                    <div class="h-8 w-8 bg-white/50 rounded-full"></div>
                    <div>
                        <p class="font-poppins font-normal text-[15px]">
                            Website
                        </p>
                        <p class="font-poppins font-light text-[14px]">
                            https://website.com
                        </p>
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <p class="font-poppins font-semibold text-[15px]">
                            10 companies were found with ISO 
                        </p>
                        <p class="font-poppins font-light text-[14px]">
                            10 companies were found with ISO certification for cutting tools materials made of steel in Texas. 
                        </p>
                </div>
            </div><div class="w-full flex flex-col gap-1 pr-2">
                <div class=" w-full flex gap-2 items-center">
                    <div class="h-8 w-8 bg-white/50 rounded-full"></div>
                    <div>
                        <p class="font-poppins font-normal text-[15px]">
                            Website
                        </p>
                        <p class="font-poppins font-light text-[14px]">
                            https://website.com
                        </p>
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <p class="font-poppins font-semibold text-[15px]">
                            10 companies were found with ISO 
                        </p>
                        <p class="font-poppins font-light text-[14px]">
                            10 companies were found with ISO certification for cutting tools materials made of steel in Texas. 
                        </p>
                </div>
            </div><div class="w-full flex flex-col gap-1 pr-2">
                <div class=" w-full flex gap-2 items-center">
                    <div class="h-8 w-8 bg-white/50 rounded-full"></div>
                    <div>
                        <p class="font-poppins font-normal text-[15px]">
                            Website
                        </p>
                        <p class="font-poppins font-light text-[14px]">
                            https://website.com
                        </p>
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <p class="font-poppins font-semibold text-[14px]">
                            10 companies were found with ISO 
                        </p>
                        <p class="font-poppins font-light text-[14px]">
                            10 companies were found with ISO certification for cutting tools materials made of steel in Texas. 
                        </p>
                </div>
            </div><div class="w-full flex flex-col gap-1 pr-2">
                <div class=" w-full flex gap-2 items-center">
                    <div class="h-8 w-8 bg-white/50 rounded-full"></div>
                    <div>
                        <p class="font-poppins font-normal text-[14px]">
                            Website
                        </p>
                        <p class="font-poppins font-light text-[14px]">
                            https://website.com
                        </p>
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <p class="font-poppins font-semibold text-[14px]">
                            10 companies were found with ISO 
                        </p>
                        <p class="font-poppins font-light text-[14px]">
                            10 companies were found with ISO certification for cutting tools materials made of steel in Texas. 
                        </p>
                </div>
            </div><div class="w-full flex flex-col gap-1 pr-2">
                <div class=" w-full flex gap-2 items-center">
                    <div class="h-8 w-8 bg-white/50 rounded-full"></div>
                    <div>
                        <p class="font-poppins font-normal text-[14px]">
                            Website
                        </p>
                        <p class="font-poppins font-light text-[14px]">
                            https://website.com
                        </p>
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <p class="font-poppins font-semibold text-[14px]">
                            10 companies were found with ISO 
                        </p>
                        <p class="font-poppins font-light text-[14px]">
                            10 companies were found with ISO certification for cutting tools materials made of steel in Texas. 
                        </p>
                </div>
            </div> -->
        </div>
    </div>
    {/if}
  </div>
</div>

<!-- <div>
    <p>Chats Page</p>
    <a href="#/">Go to Eula</a>
</div> -->