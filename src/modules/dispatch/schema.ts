import { z } from "zod";

const blankToUndef = <T extends z.ZodType>(s: T) => z.union([z.literal("").transform(() => undefined), s]).optional();

export const tripInput = z
  .object({
    orderIds: z.array(z.uuid()).min(1, "Pilih minimal 1 order"),
    fulfillment: z.enum(["OWN", "VENDOR"]),
    vehicleId: blankToUndef(z.uuid()),
    driverId: blankToUndef(z.uuid()),
    vendorId: blankToUndef(z.uuid()),
    vendorPlate: z.string().trim().optional(),
    vendorDriverName: z.string().trim().optional(),
    vendorDriverPhone: z.string().trim().optional(),
    vendorCost: blankToUndef(z.string().trim().regex(/^\d+(\.\d+)?$/, "Biaya vendor harus angka")),
    plannedStart: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "OWN") {
      if (!v.vehicleId) ctx.addIssue({ code: "custom", message: "Pilih kendaraan", path: ["vehicleId"] });
      if (!v.driverId) ctx.addIssue({ code: "custom", message: "Pilih driver", path: ["driverId"] });
    } else {
      if (!v.vendorId) ctx.addIssue({ code: "custom", message: "Pilih vendor", path: ["vendorId"] });
      if (!v.vendorPlate) ctx.addIssue({ code: "custom", message: "Plat truk vendor wajib diisi", path: ["vendorPlate"] });
    }
  });

export type TripInput = z.input<typeof tripInput>;
