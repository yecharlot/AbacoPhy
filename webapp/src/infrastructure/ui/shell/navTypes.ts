/** Nav items filtered by views (ACL). No feature imports. */

export type NavItem = {
  id: string;
  label: string;
  /** View key required (from session.views). Empty = always visible when authenticated. */
  view?: string;
};

export function filterNavByViews(items: NavItem[], views: string[] | null | undefined): NavItem[] {
  if (!views || views.length === 0) {
    return items.filter((i) => !i.view);
  }
  const set = new Set(views);
  return items.filter((i) => !i.view || set.has(i.view));
}

/** Placeholder nav for phase 0 shell smoke (real items come with features later). */
export const PLACEHOLDER_NAV: NavItem[] = [
  { id: 'home', label: 'Inicio', view: 'dashboard' },
  { id: 'demo-a', label: 'Pantalla A' },
  { id: 'demo-b', label: 'Pantalla B' },
];
