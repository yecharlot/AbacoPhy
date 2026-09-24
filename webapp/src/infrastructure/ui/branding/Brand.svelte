<script lang="ts">
  interface Props {
    compact?: boolean;
    href?: string;
  }

  let { compact = false, href = '/' }: Props = $props();
</script>

<a class:compact class="brand" {href} aria-label="ÁbacoPhy">
  <img src="/abacus_color_icon.svg" alt="" width={compact ? 30 : 34} height={compact ? 30 : 34} />
  {#if !compact}
    <span class="brand-copy">
      <strong>ÁbacoPhy</strong>
      <small>Gestión empresarial</small>
    </span>
  {/if}
</a>

<style>
  .brand {
    display: inline-flex;
    align-items: center;
    gap: .72rem;
    color: var(--text-primary);
    text-decoration: none;
    min-height: 40px;
  }
  .brand img {
    display: block;
    flex: 0 0 auto;
  }
  .brand-copy {
    display: grid;
    line-height: 1.05;
  }
  .brand-copy strong {
    font-size: 1rem;
    letter-spacing: -.025em;
  }
  .brand-copy small {
    margin-top: .28rem;
    color: var(--text-muted);
    font-size: .68rem;
  }
  .brand:hover { opacity: .92; }
</style>
