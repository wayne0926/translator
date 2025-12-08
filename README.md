# LLM Translator

A simple translation web app powered by LLMs (OpenRouter), built with Svelte + Vite (frontend) and Node.js/Express (backend).

## Features

PWA ready, Dark Mode, TTS support, auto-saves preferences.

## Quick Start

1.  **Clone & Install**:
    ```bash
    git clone https://github.com/wayne0926/translator.git
    cd translator && npm install
    ```

2.  **Configure**:
    Add `.env` in the root:
    ```env
    OPENROUTER_API_KEY=your_key_here
    ```

3.  **Run (Production)**:
    Installs deps, builds frontend, and starts server in one go:
    ```bash
    npm install && (cd frontend && npm install && npm run build) && npm start
    ```

## Dev

-   **Backend**: `node server.js` (port 3000)
-   **Frontend**: `cd frontend && npm run dev` (port 5173)
