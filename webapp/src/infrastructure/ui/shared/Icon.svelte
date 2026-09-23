<script lang="ts">
  import {
    Activity,
    ArrowLeftRight,
    BarChart3,
    Building2,
    Calculator,
    ChartNoAxesCombined,
    DatabaseBackup,
    FileText,
    HelpCircle,
    Landmark,
    LayoutDashboard,
    LifeBuoy,
    Moon,
    Package,
    PackagePlus,
    PackageSearch,
    ReceiptText,
    Settings,
    Shield,
    ShoppingBag,
    ShoppingCart,
    Sun,
    Tags,
    TrendingDown,
    TrendingUp,
    UserCog,
    Users,
    WalletCards,
    Warehouse,
  } from '@lucide/svelte';

  type IconName =
    | 'dashboard' | 'income' | 'expense' | 'invoice' | 'employees'
    | 'payroll' | 'catalog' | 'accounts' | 'reports' | 'business'
    | 'warehouse' | 'receiving' | 'transfers' | 'pos' | 'cost-sheet'
    | 'price-sheet' | 'orders' | 'trace' | 'backups' | 'users'
    | 'master' | 'support' | 'settings' | 'sun' | 'moon' | 'help';

  interface Props {
    name: IconName;
    size?: number;
    strokeWidth?: number;
    class?: string;
  }

  let { name, size = 18, strokeWidth = 1.8, class: className = '' }: Props = $props();

  const icons = {
    dashboard: LayoutDashboard,
    income: TrendingUp,
    expense: TrendingDown,
    invoice: ReceiptText,
    employees: Users,
    payroll: WalletCards,
    catalog: PackageSearch,
    accounts: Landmark,
    reports: ChartNoAxesCombined,
    business: Building2,
    warehouse: Warehouse,
    receiving: PackagePlus,
    transfers: ArrowLeftRight,
    pos: ShoppingCart,
    'cost-sheet': Calculator,
    'price-sheet': Tags,
    orders: ShoppingBag,
    trace: Activity,
    backups: DatabaseBackup,
    users: UserCog,
    master: Shield,
    support: LifeBuoy,
    settings: Settings,
    sun: Sun,
    moon: Moon,
    help: HelpCircle,
  } as const;

  let IconComponent = $derived(icons[name]);
</script>

<svelte:component this={IconComponent} {size} {strokeWidth} class={className} aria-hidden="true" />
