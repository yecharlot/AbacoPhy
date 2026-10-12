export function renderLogin(root, { error, onSubmit }) {
  root.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <img src="./assets/logo.png" alt="" class="login-logo"/>
        <h1>Delicias en Ruta</h1>
        <p class="login-sub">Gestión offline · persistencia IPFS local</p>
        <form id="login-form" class="login-form">
          <label>Usuario</label>
          <input id="user" name="username" autocomplete="username" required placeholder="admin" value="admin"/>
          <label>Contraseña</label>
          <input id="pass" name="password" type="password" autocomplete="current-password" required/>
          ${error ? `<p class="login-err">${error}</p>` : ''}
          <button type="submit" class="btn login-btn">Entrar</button>
        </form>
        <p class="login-hint muted">admin / admin123 · caja / caja123 · master / AbacoPhy#Master1</p>
      </div>
    </div>`;
  root.querySelector('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    await onSubmit(root.querySelector('#user').value.trim(), root.querySelector('#pass').value);
  };
}
