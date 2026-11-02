import { z } from "zod";

const optNum = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "harus angka")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const stopInput = z.object({
  type: z.enum(["PICKUP", "DROP"]),
  locationId: z.uuid("Pilih lokasi"),
  cargo: z.string().trim().optional(),
  weightKg: optNum,
  cbm: optNum,
  pallets: z
    .string()
    .trim()
    .regex(/^\d+$/, "pallet harus bilangan bulat")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const orderInput = z
  .object({
    customerId: z.uuid("Pilih customer"),
    serviceType: z.enum(["FTL", "LTL", "MULTIDROP"]),
    requestedDate: z
      .union([z.literal("").transform(() => undefined), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")])
      .optional(),
    notes: z.string().trim().optional(),
    stops: z.array(stopInput).min(2, "Minimal 1 pickup dan 1 drop"),
  })
  .superRefine((v, ctx) => {
    const pickups = v.stops.filter((s) => s.type === "PICKUP").length;
    const drops = v.stops.length - pickups;
    if (pickups < 1 || drops < 1) {
      ctx.addIssue({ code: "custom", message: "Minimal 1 pickup dan 1 drop", path: ["stops"] });
    }
    if (v.serviceType === "FTL" && (pickups !== 1 || drops !== 1)) {
      ctx.addIssue({ code: "custom", message: "FTL harus tepat 1 pickup dan 1 drop", path: ["stops"] });
    }
    if (v.serviceType === "MULTIDROP" && pickups !== 1 && drops !== 1) {
      ctx.addIssue({ code: "custom", message: "Multi-drop: 1 pickup banyak drop (atau sebaliknya)", path: ["stops"] });
    }
  });

export type OrderInput = z.input<typeof orderInput>;
