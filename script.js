document.addEventListener('DOMContentLoaded', () => {
    // Selectors for new and existing elements
    const sourceLangSelect = document.getElementById('source-lang');
    const targetLangSelect = document.getElementById('target-lang');
    const sourceLangBtn = document.getElementById('source-lang-btn');
    const targetLangBtn = document.getElementById('target-lang-btn');
    const sourceTextArea = document.getElementById('source-text');
    const targetTextArea = document.getElementById('target-text');
    const swapButton = document.getElementById('swap-languages');
    const loadingIndicator = document.getElementById('loading-indicator');
    const clearTextBtn = document.getElementById('clear-text');
    const micBtn = document.getElementById('mic-btn');
    const languageModal = document.getElementById('language-modal');
    const languageList = document.getElementById('language-list');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalTitle = document.getElementById('modal-title');
    const copySourceBtn = document.getElementById('copy-source-btn');
    const copyTargetBtn = document.getElementById('copy-target-btn');

    let debounceTimer;
    let currentLangSelectionTarget = null; // 'source' or 'target'

    // --- Speech Recognition Setup ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Stop after first utterance
        recognition.interimResults = false;
        recognition.lang = sourceLangSelect.value; // Initial language

        recognition.onstart = () => {
            console.log('Speech recognition started...');
            micBtn.classList.add('listening'); // Add visual feedback
            sourceTextArea.placeholder = 'Listening...';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Transcript:', transcript);
            sourceTextArea.value = transcript;
            clearTextBtn.style.display = 'block'; // Show clear button
            translateText(); // Trigger translation
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errorMsg = event.error;
            if (event.error === 'no-speech') {
                 errorMsg = "Didn't hear anything. Try again.";
            } else if (event.error === 'audio-capture') {
                 errorMsg = "Microphone problem. Check permissions.";
            } else if (event.error === 'not-allowed') {
                 errorMsg = "Permission denied. Allow microphone access.";
            }
            sourceTextArea.placeholder = `Error: ${errorMsg}`;
            // Maybe show a temporary error message instead of placeholder
        };

        recognition.onend = () => {
            console.log('Speech recognition ended.');
            micBtn.classList.remove('listening'); // Remove visual feedback
            // Restore original placeholder if textarea is empty
            if (!sourceTextArea.value) {
                 sourceTextArea.placeholder = '输入文字'; 
            } else {
                 sourceTextArea.placeholder = '输入文字'; // Or keep the existing text
            }
        };

    } else {
        console.warn('Speech Recognition API not supported in this browser.');
        // Optionally disable the mic button or show a message
        micBtn.disabled = true;
        micBtn.title = "Speech recognition not supported by your browser";
    }

    // --- Helper Functions ---
    function updateLanguageButtons() {
        const sourceOpt = sourceLangSelect.options[sourceLangSelect.selectedIndex];
        const targetOpt = targetLangSelect.options[targetLangSelect.selectedIndex];
        // Display only the language name (e.g., "English", "Chinese") 
        // Assumes the <option> text has the format "Language Name (...)" or just "Language Name"
        sourceLangBtn.textContent = sourceOpt.text.split(' (')[0];
        targetLangBtn.textContent = targetOpt.text.split(' (')[0];

        // Update input field language to trigger keyboard switch on mobile
        if (sourceLangSelect.value !== 'auto') {
            sourceTextArea.setAttribute('lang', sourceLangSelect.value);
        } else {
            sourceTextArea.removeAttribute('lang');
        }

        // Update speech recognition language if API is available
        if (recognition) {
            // Map select value to BCP 47 tag if needed (simple example)
            let speechLang = sourceLangSelect.value === 'auto' ? 'en-US' : sourceLangSelect.value; // Default to English for auto-detect speech?
            if (speechLang === 'zh') speechLang = 'zh-CN';
            else if (speechLang === 'en') speechLang = 'en-US';
            else if (speechLang === 'es') speechLang = 'es-ES';
            // Add more specific mappings if needed based on supported BCP 47 tags
            else speechLang = speechLang + '-' + speechLang.toUpperCase(); // Basic guess e.g., fr -> fr-FR

            recognition.lang = speechLang;
            console.log(`Speech recognition language set to: ${recognition.lang}`);
        }
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingIndicator.style.display = 'block'; // Show loading
        } else {
            loadingIndicator.style.display = 'none'; // Hide loading
        }
    }

    function openLanguageModal(type) { // type is 'source' or 'target'
        currentLangSelectionTarget = type;
        const selectElement = (type === 'source') ? sourceLangSelect : targetLangSelect;
        modalTitle.textContent = `Select ${type} language`;
        languageList.innerHTML = ''; // Clear previous list

        for (let option of selectElement.options) {
            const li = document.createElement('li');
            li.textContent = option.text; // Display full text e.g., "Chinese (Simplified)"
            li.dataset.value = option.value;
            li.addEventListener('click', () => {
                selectElement.value = option.value;
                updateLanguageButtons();
                translateText();
                closeModal();
            });
            languageList.appendChild(li);
        }
        languageModal.classList.add('visible');
    }

    function closeModal() {
        languageModal.classList.remove('visible');
        currentLangSelectionTarget = null;
    }

    // --- Initial Setup ---
    // Load saved languages
    const savedSourceLang = localStorage.getItem('translate-source-lang');
    const savedTargetLang = localStorage.getItem('translate-target-lang');
    if (savedSourceLang) {
        // Verify the value exists in options to avoid invalid selection
        if ([...sourceLangSelect.options].some(o => o.value === savedSourceLang)) {
             sourceLangSelect.value = savedSourceLang;
        }
    }
    if (savedTargetLang) {
        if ([...targetLangSelect.options].some(o => o.value === savedTargetLang)) {
            targetLangSelect.value = savedTargetLang;
        }
    }

    updateLanguageButtons(); // Set initial button text
    clearTextBtn.style.display = sourceTextArea.value ? 'block' : 'none'; // Show clear button if text exists initially
    copySourceBtn.style.display = sourceTextArea.value ? 'block' : 'none'; // Show copy button if text exists initially
    copyTargetBtn.style.display = targetTextArea.value ? 'block' : 'none'; // Show copy button if translation exists initially


    // --- Event Listeners ---
    sourceTextArea.addEventListener('input', () => {
        // Show/hide clear button
        clearTextBtn.style.display = sourceTextArea.value ? 'block' : 'none';
        // Show/hide copy source button
        copySourceBtn.style.display = sourceTextArea.value ? 'block' : 'none';
        // Hide copy target button while typing in source
        copyTargetBtn.style.display = 'none';

        // Debounce the translation trigger
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            translateText();
        }, 500); // Adjust delay as needed
    });

    // Trigger translation when language changes (via hidden selects)
    sourceLangSelect.addEventListener('change', () => {
        localStorage.setItem('translate-source-lang', sourceLangSelect.value);
        updateLanguageButtons();
        translateText();
    });
    targetLangSelect.addEventListener('change', () => {
        localStorage.setItem('translate-target-lang', targetLangSelect.value);
        updateLanguageButtons();
        translateText();
    });

    // Open modal when language buttons are clicked
    sourceLangBtn.addEventListener('click', () => {
        openLanguageModal('source');
    });
    targetLangBtn.addEventListener('click', () => {
        openLanguageModal('target');
    });

    // Close modal button
    closeModalBtn.addEventListener('click', closeModal);
    // Close modal if clicking outside the content
    languageModal.addEventListener('click', (event) => {
        if (event.target === languageModal) { // Check if click was on the overlay itself
            closeModal();
        }
    });

    swapButton.addEventListener('click', () => {
        const sourceVal = sourceLangSelect.value;
        const targetVal = targetLangSelect.value;
        const sourceTextVal = sourceTextArea.value;
        const targetTextVal = targetTextArea.value;

        // Swap languages in selects, but don't swap if source is 'auto'
        if (sourceVal !== 'auto') {
            sourceLangSelect.value = targetVal;
            targetLangSelect.value = sourceVal;

            localStorage.setItem('translate-source-lang', sourceLangSelect.value);
            localStorage.setItem('translate-target-lang', targetLangSelect.value);

            updateLanguageButtons(); // Update button text

            // Swap text content
            sourceTextArea.value = targetTextVal;
            targetTextArea.value = sourceTextVal; // Put original source text in target temporarily

            // Show/hide clear button based on new source text
            clearTextBtn.style.display = sourceTextArea.value ? 'block' : 'none';
            copySourceBtn.style.display = sourceTextArea.value ? 'block' : 'none';
            copyTargetBtn.style.display = targetTextArea.value ? 'block' : 'none';

            // Trigger translation if the new source text is not empty
            if (targetTextVal) {
                translateText();
            } else {
                targetTextArea.value = ''; // Clear target if new source is empty
                copyTargetBtn.style.display = 'none';
            }
        }
    });

    clearTextBtn.addEventListener('click', () => {
        sourceTextArea.value = '';
        targetTextArea.value = '';
        clearTextBtn.style.display = 'none'; // Hide button
        sourceTextArea.focus(); // Focus input after clearing
        copySourceBtn.style.display = 'none'; // Hide copy button
        copyTargetBtn.style.display = 'none'; // Hide copy button
    });

    // Mic Button Listener
    micBtn.addEventListener('click', () => {
        if (!recognition) {
            console.error("Speech Recognition not available.");
            return;
        }
        try {
            recognition.start();
        } catch (error) {
            // Handle cases where recognition might already be running (though continuous is false)
            console.error("Error starting speech recognition:", error);
             micBtn.classList.remove('listening'); // Ensure feedback is reset
             sourceTextArea.placeholder = 'Error starting mic.';
        }
    });

    // --- Translation Logic ---
    async function translateText() {
        const sourceText = sourceTextArea.value.trim();
        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;

        if (!sourceText) {
            targetTextArea.value = ''; // Clear translation if source is empty
            copyTargetBtn.style.display = 'none'; // Hide copy target button
            showLoading(false);
            return;
        }

        showLoading(true);
        targetTextArea.value = ''; // Clear previous translation

        console.log(`Translating from ${sourceLang} to ${targetLang}: ${sourceText.substring(0, 50)}...`); // Log snippet

        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    text: sourceText, 
                    source_lang: sourceLang, 
                    target_lang: targetLang 
                }),
            });

            const result = await response.json();

            if (response.ok) {
                targetTextArea.value = result.translation;
                copyTargetBtn.style.display = targetTextArea.value ? 'block' : 'none'; // Show copy button if translation is successful
            } else {
                targetTextArea.value = `Error: ${result.error || 'Translation failed'}`;
                copyTargetBtn.style.display = 'none'; // Hide on error
            }
        } catch (error) {
            console.error('Translation API call failed:', error);
            targetTextArea.value = 'Error: Could not connect to translation service.';
            copyTargetBtn.style.display = 'none'; // Hide on network error
        } finally {
            showLoading(false); // Hide loading indicator
        }
    }

    // --- Copy Button Logic ---
    const originalCopySVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                         </svg>`;
    const successSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16">
                        <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
                      </svg>`;
    const errorSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
                      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>`;

    async function copyToClipboard(text, button) {
        if (!text || !navigator.clipboard) {
             console.warn("Clipboard API not available or text is empty.");
             // Optionally provide visual feedback for API unavailability
             return;
        }
        try {
             await navigator.clipboard.writeText(text);
             // Visual feedback: Change SVG to checkmark
             button.innerHTML = successSVG;
             button.disabled = true; // Temporarily disable button
             setTimeout(() => {
                 button.innerHTML = originalCopySVG;
                 button.disabled = false; // Re-enable button
                 button.blur(); // Remove focus
             }, 1500); // Revert after 1.5 seconds
        } catch (err) {
             console.error('Failed to copy text: ', err);
             // Visual feedback: Change SVG to cross mark
             button.innerHTML = errorSVG;
             button.disabled = true; // Temporarily disable button
             setTimeout(() => {
                 button.innerHTML = originalCopySVG;
                 button.disabled = false; // Re-enable button
             }, 1500);
        }
    }

    copySourceBtn.addEventListener('click', () => {
        copyToClipboard(sourceTextArea.value, copySourceBtn);
    });

    copyTargetBtn.addEventListener('click', () => {
        copyToClipboard(targetTextArea.value, copyTargetBtn);
    });

    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
}); 