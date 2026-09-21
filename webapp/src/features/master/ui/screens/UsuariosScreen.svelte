<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Card, Input } from '../../../../infrastructure/ui/shared';
  import type { MasterState, MasterStore } from '../stores/masterStore';

  export let store: MasterStore;

  let state: MasterState = store.getState();

  let username = '';
  let displayName = '';
  let password = '';
  let role = '';
  let formError = '';

  let editingId: string | null = null;
  let editRole = '';
  let editDisplayName = '';
  let editPassword = '';

  onMount(() => {
    const unsub = store.subscribe((s: MasterState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  $: if (!role && state.roles.length > 0) {
    role = state.roles[0];
  }

  function startEdit(id: string, currentRole: string, currentName: string) {
    editingId = id;
    editRole = currentRole;
    editDisplayName = currentName;
    editPassword = '';
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
    if (!username.trim() || !password) {
      formError = 'Usuario y contraseña son obligatorios';
      return;
    }
    try {
      await store.addUser({
        username: username.trim(),
        displayName: displayName.trim() || undefined,
        password,
        role,
      });
      username = '';
      displayName = '';
      password = '';
    } catch {
      /* error en el estado del store */
    }
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    try {
      await store.editUser({
        id: editingId,
        displayName: editDisplayName.trim() || undefined,
        role: editRole || undefined,
        password: editPassword || undefined,
      });
      cancelEdit();
    } catch {
      /* error en el estado del store */
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('¿Dar de baja este usuario?')) return;
    try {
      await store.removeUser(id);
    } catch {
      /* error en el estado del store */
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
              <td>{user.username}</td>
              <td>{user.displayName}</td>
              <td>{user.role}</td>
              <td>
                <Badge tone={user.active ? 'ok' : 'off'}>{user.active ? 'Activo' : 'Baja'}</Badge>
              </td>
              <td>
                <div class="btns">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={state.saving}
                    on:click={() => startEdit(user.id, user.role, user.displayName)}
                  >
                    Editar
                  </Button>
                  {#if user.active}
                    <Button variant="ghost" size="sm" disabled={state.saving} on:click={() => handleDeactivate(user.id)}>
                      Dar de baja
                    </Button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Card>

{#if editingId}
  <Card>
    <h2>Editar usuario</h2>
    <div class="grid">
      <Input id="edit-name" label="Nombre visible" bind:value={editDisplayName} placeholder="Nombre" />
      <div class="field">
        <label class="lbl" for="edit-role">Rol</label>
        <select id="edit-role" class="sel" bind:value={editRole}>
          {#each state.roles as roleOption (roleOption)}
            <option value={roleOption}>{roleOption}</option>
          {/each}
        </select>
      </div>
      <Input id="edit-pass" label="Nueva contraseña" type="password" bind:value={editPassword} placeholder="opcional" />
    </div>
    <div class="btns">
      <Button disabled={state.saving} on:click={handleSaveEdit}>Guardar cambios</Button>
      <Button variant="secondary" disabled={state.saving} on:click={cancelEdit}>Cancelar</Button>
    </div>
  </Card>
{/if}

<Card>
  <h2>Nuevo usuario</h2>
  <form on:submit={handleCreate}>
    <div class="grid">
      <Input id="user-name" label="Usuario" bind:value={username} placeholder="vendedor1" />
      <Input id="user-display" label="Nombre visible" bind:value={displayName} placeholder="Opcional" />
      <Input id="user-pass" label="Contraseña" type="password" bind:value={password} placeholder="mínimo 6" />
      <div class="field">
        <label class="lbl" for="user-role">Rol</label>
        <select id="user-role" class="sel" bind:value={role}>
          {#each state.roles as roleOption (roleOption)}
            <option value={roleOption}>{roleOption}</option>
          {/each}
        </select>
      </div>
    </div>

    {#if formError}
      <p class="err">{formError}</p>
    {/if}
    {#if state.error}
      <p class="err">{state.error}</p>
    {/if}
    {#if state.notice}
      <p class="ok">{state.notice}</p>
    {/if}

    <Button type="submit" disabled={state.saving}>
      {state.saving ? 'Guardando…' : 'Crear usuario'}
    </Button>
  </form>
</Card>

<style>
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  .muted {
    color: var(--ap-text-muted);
    font-size: 0.82rem;
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.82rem;
  }
  .ok {
    color: var(--ap-ok);
    font-size: 0.82rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0 0.8rem;
  }
  .field {
    min-width: 0;
  }
  .lbl {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ap-text-secondary);
    margin-bottom: 0.3rem;
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
</style>
