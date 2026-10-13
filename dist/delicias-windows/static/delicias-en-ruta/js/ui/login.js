export function renderLogin(root, { error, onSubmit }) {
  root.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <img src="./assets/logo.png" alt="" class="login-logo"/>
        <h1>Delicias en Ruta</h1>
        <p class="login-sub">Gestión offline · persistencia IPFS local</p>
        <form id="login-form" class="login-form">
          <label>Usuario</label>
          <input id="user" name="username" autocomplete="username" required placeholder="Usuario" value=""/>
          <label>Contraseña</label>
          <input id="pass" name="password" type="password" autocomplete="current-password" required placeholder="Contraseña" value=""/>
          ${error ? `<p class="login-err">${error}</p>` : ''}
          <button type="submit" class="btn login-btn">Entrar</button>
        </form>
      </div>
    </div>`;
  root.querySelector('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    await onSubmit(root.querySelector('#user').value.trim(), root.querySelector('#pass').value);
  };
}
