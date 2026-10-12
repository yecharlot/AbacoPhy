export function showSplash(root) {
  return new Promise((resolve) => {
    root.innerHTML = `
      <div class="splash-screen" id="splash">
        <div class="splash-inner">
          <img src="./assets/logo.png" alt="Delicias en Ruta" class="splash-logo"/>
          <h1>Delicias en Ruta</h1>
          <p>Gastronomía · Calidad · Sostenibilidad</p>
          <div class="splash-bar"><span></span></div>
        </div>
      </div>`;
    setTimeout(() => {
      const el = document.getElementById('splash');
      if (el) el.classList.add('fade-out');
      setTimeout(resolve, 420);
    }, 1600);
  });
}
