<script lang="ts">
  interface Props {
    amount: number;
    currency?: string;
    large?: boolean;
  }
  let { amount, currency = '', large = false }: Props = $props();
  const formatted = $derived(
    new Intl.NumberFormat('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount),
  );
</script>

<span class="money" class:large>{formatted}{currency ? ` ${currency}` : ''}</span>

<style>
  .money {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: var(--accent-cyan, var(--ap-primary));
  }
  .large {
    font-size: clamp(1.75rem, 4vw, 2.35rem);
    letter-spacing: -0.03em;
    color: inherit;
  }
</style>
