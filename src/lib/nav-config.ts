export const navItems = [
  { label: "Spreadsheet", path: "/" },
  { label: "People", path: "/people" },
  { label: "Companies", path: "/companies" },
] as const;

export type NavItem = (typeof navItems)[number];
