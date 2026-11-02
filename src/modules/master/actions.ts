"use server";

import { eq, getTableColumns } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { requireCan } from "@/lib/auth/session";
import { getResource, type Field } from "./resources";

export type ActionState = { error?: string; ok?: boolean };

function parse(field: Field, raw: FormDataEntryValue | null) {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) {
    if (field.required) throw new Error(`${field.label} wajib diisi`);
    return null;
  }
  if (field.type === "int") {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) throw new Error(`${field.label} harus bilangan bulat ≥ 0`);
    return n;
  }
  if (field.type === "decimal") {
    if (!/^-?\d+(\.\d+)?$/.test(v)) throw new Error(`${field.label} harus angka`);
    return v;
  }
  if (field.type === "select" && field.options && !field.options.includes(v)) {
    throw new Error(`${field.label} tidak valid`);
  }
  return v;
}

export async function createRecord(key: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const res = getResource(key);
  if (!res) return { error: "Resource tidak dikenal" };
  await requireCan("write", res.permission);
  try {
    const values: Record<string, unknown> = {};
    for (const f of res.fields) {
      const v = parse(f, formData.get(f.name));
      if (v !== null) values[f.name] = v;
    }
    await db.insert(res.table).values(values as never);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menyimpan";
    return { error: /unique/i.test(msg) ? "Data sudah ada (duplikat)" : msg };
  }
  revalidatePath(`/master/${key}`);
  return { ok: true };
}

export async function deleteRecord(key: string, id: string) {
  const res = getResource(key);
  if (!res) return;
  await requireCan("write", res.permission);
  const cols = getTableColumns(res.table) as Record<string, never>;
  await db.delete(res.table).where(eq(cols.id, id));
  revalidatePath(`/master/${key}`);
}
