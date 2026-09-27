import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) {
  document.body.innerHTML =
    '<pre style="color:#f66;padding:1rem;font-family:monospace">#app no encontrado en index.html</pre>';
} else {
  try {
    mount(App, { target });
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err);
    target.innerHTML = `<pre style="color:#f66;padding:1rem;white-space:pre-wrap;font-family:monospace;background:#111">Error al montar App:\n\n${msg}</pre>`;
    console.error(err);
  }
}
