import { Suspense } from "react";
import { requireCan } from "@/lib/auth/session";
import { InvoiceForm } from "@/modules/invoices/invoice-form";
import { listBillableOrders } from "@/modules/invoices/queries";

async function Content() {
  await requireCan("write", "invoices");
  const billable = await listBillableOrders();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Invoice baru</h1>
      <InvoiceForm billable={billable} />
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}><Content /></Suspense>;
}
