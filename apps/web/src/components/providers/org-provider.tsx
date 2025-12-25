"use client";

import { OrganizationContext } from "./org-context";

export function OrganizationProvider({
  organization,
  children,
}: {
  organization: any;
  children: React.ReactNode;
}) {
  return (
    <OrganizationContext.Provider value={organization}>
      {children}
    </OrganizationContext.Provider>
  );
}
