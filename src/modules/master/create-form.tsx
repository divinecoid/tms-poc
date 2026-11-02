"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRecord, type ActionState } from "./actions";
import type { Field } from "./resources";

export function CreateForm({ resourceKey, fields }: { resourceKey: string; fields: Field[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createRecord.bind(null, resourceKey),
    {},
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      toast.success("Tersimpan");
    }
  }, [state]);

  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <Label htmlFor={f.name}>
            {f.label}
            {f.required && <span className="text-destructive"> *</span>}
          </Label>
          {f.type === "select" ? (
            <select
              id={f.name}
              name={f.name}
              required={f.required}
              defaultValue=""
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">— pilih —</option>
              {f.options?.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <Input
              id={f.name}
              name={f.name}
              required={f.required}
              type={f.type === "date" ? "date" : "text"}
              inputMode={f.type === "int" || f.type === "decimal" ? "decimal" : undefined}
            />
          )}
        </div>
      ))}
      <div className="flex items-end sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Tambah"}</Button>
        {state.error && <p className="text-destructive ml-4 text-sm">{state.error}</p>}
      </div>
    </form>
  );
}
