export const roles = ["owner", "admin", "dispatcher", "finance", "fleet", "driver"] as const;
export type Role = (typeof roles)[number];

export type Resource =
  | "customers" | "locations" | "vehicles" | "drivers" | "vendors"
  | "orders" | "dispatch" | "expenses" | "invoices" | "payables" | "reports" | "fuel";
export type Action = "read" | "write";

const RW: Action[] = ["read", "write"];
const R: Action[] = ["read"];

const matrix: Record<Role, Partial<Record<Resource, Action[]>>> = {
  owner: {
    customers: RW, locations: RW, vehicles: RW, drivers: RW, vendors: RW,
    orders: RW, dispatch: RW, expenses: RW, invoices: RW, payables: RW, reports: RW, fuel: RW,
  },
  admin: {
    customers: RW, locations: RW, vehicles: R, drivers: R, vendors: RW,
    orders: RW, dispatch: R, invoices: R, payables: R, reports: R, fuel: R,
  },
  dispatcher: {
    customers: R, locations: R, vehicles: R, drivers: R, vendors: R,
    orders: RW, dispatch: RW,
  },
  finance: {
    customers: R, vendors: R, orders: R, dispatch: R, expenses: RW, invoices: RW, payables: RW, reports: RW, fuel: RW,
  },
  fleet: { vehicles: RW, drivers: RW, fuel: RW },
  driver: {},
};

export function can(role: Role | undefined, action: Action, resource: Resource) {
  if (!role) return false;
  return matrix[role][resource]?.includes(action) ?? false;
}
