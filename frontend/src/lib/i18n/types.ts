export type Translation = {
  common: {
    appName: string;
    tagline: string;
    loading: string;
    noData: string;
    optional: string;
    required: string;
    encrypted: string;
    all: string;
    page: string;
    of: string;
    showing: string;
    updatedAt: string;
  };
  status: Record<string, string>;
  event: {
    native: string;
    external: string;
    externalHint: string;
    featured: string;
  };
  nav: Record<string, string>;
  actions: Record<string, string>;
  fields: Record<string, string>;
  filter: Record<string, string>;
  home: Record<string, string>;
  events: Record<string, string>;
  detail: Record<string, string>;
  auth: Record<string, string>;
  account: Record<string, string>;
  flow: Record<string, string>;
  organizer: Record<string, string>;
  admin: Record<string, string>;
  empty: Record<string, string>;
  footer: Record<string, string>;
  theme: Record<string, string>;
  language: Record<string, string>;
  roles: Record<string, string>;
};

