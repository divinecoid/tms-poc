import type { PgTable } from "drizzle-orm/pg-core";
import { customers, drivers, locations, vehicles, vendors } from "@/db/schema";
import type { Resource } from "@/lib/auth/permissions";

export type FieldType = "text" | "int" | "decimal" | "date" | "select";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  list?: boolean;
};

export type MasterResource = {
  key: string;
  label: string;
  permission: Resource;
  table: PgTable;
  fields: Field[];
};

const vehicleTypes = ["CDE", "CDD", "Fuso", "Tronton", "Wingbox", "Trailer"];

export const masterResources: MasterResource[] = [
  {
    key: "customers",
    label: "Customer",
    permission: "customers",
    table: customers,
    fields: [
      { name: "name", label: "Nama", type: "text", required: true, list: true },
      { name: "npwp", label: "NPWP", type: "text", list: true },
      { name: "paymentTermDays", label: "Term bayar (hari)", type: "int", list: true },
      { name: "creditLimit", label: "Limit kredit (Rp)", type: "decimal" },
    ],
  },
  {
    key: "locations",
    label: "Lokasi",
    permission: "locations",
    table: locations,
    fields: [
      { name: "name", label: "Nama lokasi", type: "text", required: true, list: true },
      { name: "address", label: "Alamat", type: "text", required: true, list: true },
      { name: "lat", label: "Latitude", type: "decimal" },
      { name: "lng", label: "Longitude", type: "decimal" },
      { name: "geofenceRadiusM", label: "Radius geofence (m)", type: "int" },
    ],
  },
  {
    key: "vehicles",
    label: "Kendaraan",
    permission: "vehicles",
    table: vehicles,
    fields: [
      { name: "plateNo", label: "Plat nomor", type: "text", required: true, list: true },
      { name: "type", label: "Tipe", type: "select", required: true, options: vehicleTypes, list: true },
      { name: "capacityKg", label: "Kapasitas (kg)", type: "int", list: true },
      { name: "capacityCbm", label: "Kapasitas (CBM)", type: "decimal" },
      { name: "gpsDeviceId", label: "ID GPS device", type: "text" },
    ],
  },
  {
    key: "drivers",
    label: "Driver",
    permission: "drivers",
    table: drivers,
    fields: [
      { name: "name", label: "Nama", type: "text", required: true, list: true },
      { name: "phone", label: "No. HP", type: "text", list: true },
      { name: "simType", label: "Jenis SIM", type: "select", options: ["B1", "B2", "B2 Umum"], list: true },
      { name: "simExpiredAt", label: "SIM kadaluarsa", type: "date", list: true },
    ],
  },
  {
    key: "vendors",
    label: "Vendor / Subcon",
    permission: "vendors",
    table: vendors,
    fields: [
      { name: "name", label: "Nama", type: "text", required: true, list: true },
      { name: "pic", label: "PIC", type: "text", list: true },
      { name: "phone", label: "No. HP", type: "text", list: true },
      { name: "npwp", label: "NPWP", type: "text" },
      { name: "bankAccount", label: "Rekening", type: "text" },
      { name: "paymentTermDays", label: "Term bayar (hari)", type: "int", list: true },
    ],
  },
];

export const getResource = (key: string) => masterResources.find((r) => r.key === key);
