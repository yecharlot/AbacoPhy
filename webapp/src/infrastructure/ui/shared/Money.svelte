<script lang="ts">
  interface Props {
    amount: number;
    currency?: string;
  }

  let { amount, currency = '' }: Props = $props();

  const formatted = $derived(
    new Intl.NumberFormat('es-CU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount),
  );
</script>

<span class="money">{formatted}{currency ? ` ${currency}` : ''}</span>

<style>
  .money {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--ap-primary);
  }
</style>
