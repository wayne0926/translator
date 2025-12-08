<script>
  import { onMount } from 'svelte';
  import { ArrowRightLeft, Copy, Mic, X, ChevronDown, Check, Volume2 } from 'lucide-svelte';

  // Available languages definition moved up to be available for initialization
  let availableLanguages = [
    { code: 'auto', name: 'Auto Detect' },
    { code: 'en', name: 'English' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ru', name: 'Russian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'it', name: 'Italian' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
  ];

  // Initialize state directly from localStorage to prevent overwriting
  let sourceText = '';
  let targetText = '';
  
  const savedSource = localStorage.getItem('translate-source-lang');
  const savedTarget = localStorage.getItem('translate-target-lang');

  let sourceLang = (savedSource && availableLanguages.some(l => l.code === savedSource)) ? savedSource : 'auto'; 
  let targetLang = (savedTarget && availableLanguages.some(l => l.code === savedTarget)) ? savedTarget : 'en'; 

  let isLoading = false;
  let showLanguageModal = false;
  let currentLangSelectionTarget = null; // 'source' or 'target'
  let showCopySuccessSource = false;
  let showCopySuccessTarget = false;
  let isSpeaking = false;

  function getLangName(code) {
    const lang = availableLanguages.find(l => l.code === code);
    return lang ? lang.name : code;
  }

  function openModal(type) {
    currentLangSelectionTarget = type;
    showLanguageModal = true;
  }

  function selectLanguage(code) {
    if (currentLangSelectionTarget === 'source') {
      sourceLang = code;
    } else if (currentLangSelectionTarget === 'target') {
      targetLang = code;
    }
    showLanguageModal = false;
    if (sourceText.trim()) translateText();
  }

  function swapLanguages() {
    if (sourceLang === 'auto') return;
    const tempLang = sourceLang;
    sourceLang = targetLang;
    targetLang = tempLang;
    
    const tempText = sourceText;
    sourceText = targetText;
    targetText = tempText;

    if (sourceText.trim()) translateText();
    else targetText = '';
  }

  // --- Speech Recognition ---
  let recognition;
  let isListening = false;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => { isListening = true; };
    recognition.onresult = (event) => {
      sourceText = event.results[0][0].transcript;
      translateText();
    };
    recognition.onend = () => { isListening = false; };
    recognition.onerror = () => { isListening = false; };
  }

  function toggleSpeechRecognition() {
    if (!recognition) return alert('Browser not supported.');
    if (isListening) recognition.stop();
    else {
      let langCode = sourceLang === 'auto' ? (navigator.language || 'en-US') : sourceLang;
      if (langCode.startsWith('zh')) langCode = 'zh-CN'; 
      recognition.lang = langCode;
      recognition.start();
    }
  }

  // --- Text to Speech ---
  function speakText() {
    if (!targetText || isSpeaking) return;
    
    const utterance = new SpeechSynthesisUtterance(targetText);
    
    // Map our language codes to BCP 47 tags expected by SpeechSynthesis
    let langCode = targetLang;
    if (langCode === 'zh') langCode = 'zh-CN';
    // Add other specific mappings if needed, but most 2-letter codes work
    
    utterance.lang = langCode;
    utterance.onstart = () => isSpeaking = true;
    utterance.onend = () => isSpeaking = false;
    utterance.onerror = () => isSpeaking = false;
    
    window.speechSynthesis.speak(utterance);
  }

  // Debounce
  let debounceTimeout;
  function handleSourceTextInput() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => translateText(), 500);
  }

  async function translateText() {
    const text = sourceText.trim();
    if (!text) { targetText = ''; return; }
    isLoading = true;
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source_lang: sourceLang, target_lang: targetLang })
      });
      const data = await res.json();
      targetText = res.ok ? data.translation : `Error: ${data.error}`;
    } catch (e) {
      targetText = 'Connection Error';
    } finally {
      isLoading = false;
    }
  }

  async function copyToClipboard(text, type) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'source') {
        showCopySuccessSource = true;
        setTimeout(() => showCopySuccessSource = false, 1500);
      } else {
        showCopySuccessTarget = true;
        setTimeout(() => showCopySuccessTarget = false, 1500);
      }
    } catch (e) { console.error(e); }
  }

  // Reactive statements to save to localStorage whenever languages change
  // Since we initialize from localStorage now, this won't overwrite with defaults on load
  $: if (sourceLang) localStorage.setItem('translate-source-lang', sourceLang);
  $: if (targetLang) localStorage.setItem('translate-target-lang', targetLang);
</script>

<div class="min-h-screen bg-[#F9FAFB] dark:bg-gray-950 text-[#111827] dark:text-gray-100 flex flex-col items-center justify-center p-0 md:p-4 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
  
  <!-- Main Container -->
  <main class="w-full max-w-5xl flex flex-col h-[100dvh] md:h-[70vh] bg-white dark:bg-gray-900 md:rounded-3xl shadow-sm border-x-0 md:border border-gray-100 dark:border-gray-700 overflow-hidden">
    
    <!-- Header / Language Controls -->
    <header class="shrink-0 h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
      <div class="flex items-center flex-1">
        <button 
          class="flex items-center space-x-1.5 px-2 py-1.5 -ml-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-800 md:hover:bg-gray-50 dark:md:hover:bg-gray-800 transition-colors text-sm font-medium group"
          on:click={() => openModal('source')}
        >
          <span class="text-gray-700 dark:text-gray-300 truncate max-w-[100px] md:max-w-none">{getLangName(sourceLang)}</span>
          <ChevronDown class="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </button>
      </div>

      <button 
        class="p-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 md:hover:bg-gray-50 dark:md:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        on:click={swapLanguages}
        disabled={sourceLang === 'auto'}
        title="Swap Languages"
      >
        <ArrowRightLeft class="w-5 h-5" />
      </button>

      <div class="flex items-center flex-1 justify-end">
        <button 
          class="flex items-center space-x-1.5 px-2 py-1.5 -mr-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-800 md:hover:bg-gray-50 dark:md:hover:bg-gray-800 transition-colors text-sm font-medium group"
          on:click={() => openModal('target')}
        >
          <span class="text-gray-700 dark:text-gray-300 truncate max-w-[100px] md:max-w-none">{getLangName(targetLang)}</span>
          <ChevronDown class="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </button>
      </div>
    </header>

    <!-- Content Area -->
    <div class="flex-1 flex flex-col md:flex-row relative overflow-hidden">
      
      <!-- Source Panel -->
      <div class="flex-1 relative group border-b dark:border-gray-700 md:border-b-0 md:border-r dark:md:border-gray-700 border-gray-100 flex flex-col">
        <textarea
          lang={sourceLang === 'auto' ? undefined : (sourceLang === 'zh' ? 'zh-CN' : sourceLang)}
          bind:value={sourceText}
          on:input={handleSourceTextInput}
          class="flex-1 w-full p-5 md:p-8 text-xl md:text-3xl bg-transparent resize-none focus:outline-none placeholder-gray-300 dark:placeholder-gray-600 leading-relaxed"
          placeholder="Type to translate..."
          spellcheck={sourceLang !== 'auto'}
        ></textarea>

        <!-- Source Controls -->
        <div class="shrink-0 p-4 md:p-6 flex justify-between items-center bg-white dark:bg-gray-900">
           <div class="flex items-center space-x-2">
             <button 
                class="p-2.5 md:p-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 md:hover:bg-gray-100 dark:md:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors {isListening ? 'text-red-500 bg-red-50 dark:bg-red-900 dark:hover:bg-red-800 hover:bg-red-100' : ''}"
                on:click={toggleSpeechRecognition}
                title="Dictate"
             >
                <Mic class="w-5 h-5 {isListening ? 'animate-pulse' : ''}" />
             </button>
           </div>
           
           <div class="flex items-center space-x-1">
              {#if sourceText}
                <button 
                  class="p-2.5 md:p-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 md:hover:bg-gray-100 dark:md:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                  on:click={() => sourceText = ''}
                  title="Clear"
                >
                  <X class="w-5 h-5" />
                </button>
                <button 
                  class="p-2.5 md:p-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 md:hover:bg-gray-100 dark:md:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                  on:click={() => copyToClipboard(sourceText, 'source')}
                  title="Copy"
                >
                  {#if showCopySuccessSource}
                    <Check class="w-5 h-5 text-green-500" />
                  {:else}
                    <Copy class="w-5 h-5" />
                  {/if}
                </button>
              {/if}
           </div>
        </div>
      </div>

      <!-- Target Panel -->
      <div class="flex-1 relative group bg-[#FAFAFA] dark:bg-gray-800 md:bg-gray-50/50 dark:md:bg-gray-800/50 flex flex-col">
        {#if isLoading}
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
             <div class="w-6 h-6 border-2 border-gray-200 dark:border-gray-600 border-t-black dark:border-t-white rounded-full animate-spin"></div>
          </div>
        {/if}
        
        <textarea
          bind:value={targetText}
          class="flex-1 w-full p-5 md:p-8 text-xl md:text-3xl bg-transparent resize-none focus:outline-none text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 leading-relaxed"
          placeholder="Translation"
          readonly
        ></textarea>

        <!-- Target Controls -->
        <div class="shrink-0 p-4 md:p-6 flex justify-end items-center space-x-1">
           {#if targetText}
            <button 
              class="p-2.5 md:p-2 rounded-full active:bg-gray-200 dark:active:bg-gray-800 md:hover:bg-gray-200 dark:md:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors {isSpeaking ? 'text-blue-600 bg-blue-50 dark:bg-blue-900' : ''}"
              on:click={speakText}
              title="Listen"
            >
              <Volume2 class="w-5 h-5 {isSpeaking ? 'animate-pulse' : ''}" />
            </button>
            <button 
              class="p-2.5 md:p-2 rounded-full active:bg-gray-200 dark:active:bg-gray-800 md:hover:bg-gray-200 dark:md:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              on:click={() => copyToClipboard(targetText, 'target')}
              title="Copy"
            >
              {#if showCopySuccessTarget}
                <Check class="w-5 h-5 text-green-500" />
              {:else}
                <Copy class="w-5 h-5" />
              {/if}
            </button>
           {/if}
        </div>
      </div>

    </div>
  </main>

  <!-- Language Modal -->
  {#if showLanguageModal}
    <div 
      class="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4 bg-black/20 backdrop-blur-sm"
      on:click|self={() => showLanguageModal = false}
    >
      <div class="bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-sm max-h-[80vh] overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col animate-in slide-in-from-bottom-10 md:fade-in md:zoom-in-95 duration-200">
        <div class="p-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between shrink-0">
           <h3 class="font-medium text-gray-900 dark:text-gray-100">Select Language</h3>
           <button on:click={() => showLanguageModal = false} class="p-2 -mr-2 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white">
             <X class="w-5 h-5" />
           </button>
        </div>
        <div class="overflow-y-auto p-2 pb-safe">
          {#each availableLanguages as lang}
            <button 
              class="w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between
              {((currentLangSelectionTarget === 'source' && lang.code === sourceLang) || (currentLangSelectionTarget === 'target' && lang.code === targetLang)) 
                ? 'bg-black text-white dark:bg-white dark:text-black' 
                : 'text-gray-600 dark:text-gray-400 active:bg-gray-50 dark:active:bg-gray-800 md:hover:bg-gray-50 dark:md:hover:bg-gray-800 hover:text-black dark:hover:text-white'}"
              on:click={() => selectLanguage(lang.code)}
            >
              {lang.name}
              {#if (currentLangSelectionTarget === 'source' && lang.code === sourceLang) || (currentLangSelectionTarget === 'target' && lang.code === targetLang)}
                <Check class="w-4 h-4" />
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

</div>

<style>
  /* Inter Font */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  
  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
</style>