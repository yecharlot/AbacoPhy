/** Catálogo de módulos activables por negocio. */
export type ModuleMeta = {
  id: string;
  name: string;
  description: string;
  core: boolean;
  group: string;
};

export type ModulesSnapshot = {
  enabled: Record<string, boolean>;
  catalog: ModuleMeta[];
  role: string;
};
