<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Card, Input } from '../../../../infrastructure/ui/shared';
  import type { MasterState, MasterStore } from '../stores/masterStore';
  import {
    ASSIGNABLE_ROLES,
    isAssignableRole,
    normalizeRole,
    roleLabel,
  } from '../../domain/entities/roles';

  export let store: MasterStore;

  let state: MasterState = store.getState();

  let username = '';
  let displayName = '';
  let password = '';
  /** Rol seleccionado — siempre un código ValidRoles del backend. */
  let role: string = ASSIGNABLE_ROLES[0];
  let formError = '';
  let formOk = '';

  let editingId: string | null = null;
  let editRole = '';
  let editDisplayName = '';
  let editPassword = '';

  /**
   * Lista de roles para los selects.
   * Preferimos la del API; si viene vacía o incompleta, usamos el catálogo fijo
   * alineado con auth.ValidRoles() para no enviar rol vacío / inválido.
   */
  $: roleOptions = (() => {
    const fromApi = (state.roles || [])
      .map((r) => normalizeRole(r))
      .filter((r) => isAssignableRole(r));
    if (fromApi.length > 0) return fromApi;
    return [...ASSIGNABLE_ROLES];
  })();

  $: if (roleOptions.length && !roleOptions.includes(normalizeRole(role))) {
    role = roleOptions[0];
  }

  onMount(() => {
    const unsub = store.subscribe((s: MasterState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  function startEdit(id: string, currentRole: string, currentName: string) {
    editingId = id;
    editRole = normalizeRole(currentRole) || roleOptions[0] || ASSIGNABLE_ROLES[0];
    editDisplayName = currentName;
    editPassword = '';
    formError = '';
    formOk = '';
  }

  function cancelEdit() {
    editingId = null;
    editRole = '';
    editDisplayName = '';
    editPassword = '';
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';
    if (!username.trim() || !password) {
      formError = 'Usuario y contraseña son obligatorios';
      return;
    }
    const selectedRole = normalizeRole(role);
    if (!selectedRole || !isAssignableRole(selectedRole)) {
      formError = 'Seleccione un rol válido de la lista';
      return;
    }
    try {
      await store.addUser({
        username: username.trim(),
        displayName: displayName.trim() || undefined,
        password,
        role: selectedRole,
      });
      formOk = `Usuario creado con rol «${roleLabel(selectedRole)}»`;
      username = '';
      displayName = '';
      password = '';
      role = roleOptions[0] || ASSIGNABLE_ROLES[0];
    } catch (err) {
      formError =
        err instanceof Error
          ? err.message
          : state.error || 'No se pudo crear el usuario';
    }
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    formError = '';
    formOk = '';
    const selectedRole = normalizeRole(editRole);
    if (selectedRole && !isAssignableRole(selectedRole)) {
      formError = 'Rol de edición no válido';
      return;
    }
    try {
      await store.editUser({
        id: editingId,
        displayName: editDisplayName.trim() || undefined,
        role: selectedRole || undefined,
        password: editPassword || undefined,
      });
      formOk = selectedRole
        ? `Usuario actualizado · rol «${roleLabel(selectedRole)}»`
        : 'Usuario actualizado';
      cancelEdit();
    } catch (err) {
      formError =
        err instanceof Error
          ? err.message
          : state.error || 'No se pudo modificar el usuario';
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('¿Dar de baja este usuario?')) return;
    try {
      await store.removeUser(id);
    } catch (err) {
      formError =
        err instanceof Error
          ? err.message
          : state.error || 'No se pudo dar de baja';
    }
  }
</script>

<Card>
  <h2>Usuarios del negocio</h2>

  {#if state.status === 'loading'}
    <p class="muted">Cargando usuarios…</p>
  {:else if state.users.length === 0}
    <p class="muted">No hay usuarios listados.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each state.users as user (user.id)}
            <tr>
              <td class="mono">{user.username}</td>
              <td>{user.displayName || '—'}</td>
              <td>
                <Badge tone="default">{roleLabel(user.role)}</Badge>
                {#if !user.role}
                  <span class="warn">sin rol</span>
                {/if}
              </td>
              <td>
                <Badge tone={user.active ? 'ok' : 'off'}>
                  {user.active ? 'Activo' : 'Baja'}
                </Badge>
              </td>
              <td>
                <div class="btns">
                  {#if user.role !== 'master'}
                    <button
                      type="button"
                      class="link"
                      on:click={() => startEdit(user.id, user.role, user.displayName)}
                    >
                      Editar
                    </button>
                    {#if user.active}
                      <button
                        type="button"
                        class="link danger"
                        on:click={() => handleDeactivate(user.id)}
                      >
                        Baja
                      </button>
                    {/if}
                  {:else}
                    <span class="muted">protegido</span>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if editingId}
    <div class="edit-box">
      <h3>Editar usuario</h3>
      <label class="lbl" for="edit-name">Nombre visible</label>
      <Input id="edit-name" bind:value={editDisplayName} />
      <label class="lbl" for="edit-role">Rol</label>
      <select id="edit-role" class="sel" bind:value={editRole} required>
        {#each roleOptions as roleOption (roleOption)}
          <option value={roleOption}>{roleLabel(roleOption)}</option>
        {/each}
      </select>
      <label class="lbl" for="edit-pass">Nueva contraseña (opcional)</label>
      <Input id="edit-pass" type="password" bind:value={editPassword} autocomplete="new-password" />
      <div class="btns">
        <Button type="button" on:click={handleSaveEdit} disabled={state.saving}>Guardar</Button>
        <Button type="button" variant="secondary" on:click={cancelEdit}>Cancelar</Button>
      </div>
    </div>
  {/if}
</Card>

<Card>
  <h2>Nuevo usuario</h2>
  <p class="hint">
    El rol determina las vistas permitidas (ACL del sistema). Elija el rol antes de crear.
  </p>
  <form on:submit={handleCreate}>
    <label class="lbl" for="user-name">Usuario <span class="req">*</span></label>
    <Input id="user-name" bind:value={username} autocomplete="off" required disabled={state.saving} />

    <label class="lbl" for="user-display">Nombre visible</label>
    <Input id="user-display" bind:value={displayName} disabled={state.saving} />

    <label class="lbl" for="user-pass">Contraseña <span class="req">*</span></label>
    <Input
      id="user-pass"
      type="password"
      bind:value={password}
      autocomplete="new-password"
      required
      disabled={state.saving}
    />

    <label class="lbl" for="user-role">Rol <span class="req">*</span></label>
    <select id="user-role" class="sel" bind:value={role} required disabled={state.saving}>
      {#each roleOptions as roleOption (roleOption)}
        <option value={roleOption}>{roleLabel(roleOption)}</option>
      {/each}
    </select>

    {#if formError || state.error}
      <p class="err" role="alert">{formError || state.error}</p>
    {/if}
    {#if formOk || state.notice}
      <p class="ok">{formOk || state.notice}</p>
    {/if}

    <Button type="submit" disabled={state.saving}>
      {state.saving ? 'Guardando…' : 'Crear usuario'}
    </Button>
  </form>
</Card>

<style>
  .muted {
    color: var(--ap-text-secondary);
    font-size: 0.9rem;
  }
  .hint {
    color: var(--ap-text-secondary);
    font-size: 0.85rem;
    margin: 0 0 0.85rem;
  }
  .mono {
    font-family: ui-monospace, monospace;
    font-size: 0.85rem;
  }
  .lbl {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ap-text-secondary);
    margin-bottom: 0.3rem;
  }
  .req {
    color: var(--ap-danger, #e57373);
  }
  .sel {
    width: 100%;
    padding: 0.62rem 0.7rem;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated);
    color: var(--ap-text);
    font-family: inherit;
    font-size: 0.9rem;
    margin-bottom: 0.7rem;
  }
  .btns {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  th {
    text-align: left;
    font-size: 0.72rem;
    text-transform: uppercase;
    color: var(--ap-text-muted);
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid var(--ap-border);
    white-space: nowrap;
  }
  td {
    padding: 0.55rem 0.6rem;
    border-bottom: 1px solid var(--ap-border);
    color: var(--ap-text-secondary);
  }
  .link {
    background: none;
    border: none;
    color: var(--ap-primary, #61e6e1);
    cursor: pointer;
    font-size: 0.82rem;
    padding: 0;
  }
  .link.danger {
    color: var(--ap-danger, #e57373);
  }
  .err {
    color: var(--ap-danger, #e57373);
    font-size: 0.88rem;
  }
  .ok {
    color: var(--ap-success, #b7f56a);
    font-size: 0.88rem;
  }
  .warn {
    color: var(--ap-warning, #ffe35a);
    font-size: 0.75rem;
    margin-left: 0.35rem;
  }
  .edit-box {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--ap-border);
  }
  .edit-box h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
  }
</style>
