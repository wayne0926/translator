import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
