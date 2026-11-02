import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatusBadge } from "@/components/status-badge";
import { can } from "@/lib/auth/permissions";
import { requireCan } from "@/lib/auth/session";
import { company } from "@/lib/company";
import { rupiah } from "@/lib/money";
import { InvoiceActions } from "@/modules/invoices/invoice-actions";
import { getInvoice } from "@/modules/invoices/queries";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCan("read", "invoices");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getInvoice(id);
  if (!data) notFound();
  const { invoice: inv, lines } = data;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-2xl font-semibold">{inv.invoiceNo}</h1>
        <div className="flex items-center gap-3">
          <StatusBadge status={inv.status} />
          <InvoiceActions id={inv.id} status={inv.status} canWrite={can(user.role, "write", "invoices")} />
        </div>
      </div>

      <article className="bg-background space-y-6 rounded-lg border p-8 print:border-0 print:p-0">
        <header className="flex justify-between gap-6">
          <div>
            <p className="text-lg font-semibold">{company.name}</p>
            <p className="text-muted-foreground text-sm whitespace-pre-line">{company.address}</p>
            {company.npwp && <p className="text-muted-foreground text-sm">NPWP {company.npwp}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tracking-wide">INVOICE</p>
            <p className="text-sm">{inv.invoiceNo}</p>
            {inv.status === "VOID" && <p className="text-destructive font-semibold">VOID</p>}
            {inv.status === "PAID" && <p className="font-semibold text-green-700">LUNAS {inv.paidAt}</p>}
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Ditagihkan kepada</p>
            <p className="font-medium">{inv.customer}</p>
            {inv.npwp && <p>NPWP {inv.npwp}</p>}
          </div>
          <div className="text-right">
            <p>Tanggal: {inv.issuedAt}</p>
            <p>Jatuh tempo: {inv.dueAt}</p>
          </div>
        </section>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left"><th className="py-2">Deskripsi</th><th className="py-2 text-right">Jumlah</th></tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b"><td className="py-2">{l.description}</td><td className="py-2 text-right">{rupiah(l.amount)}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <p className="flex justify-between"><span>Subtotal</span><span>{rupiah(inv.subtotal)}</span></p>
          <p className="flex justify-between"><span>PPN 11%</span><span>{rupiah(inv.ppn)}</span></p>
          {Number(inv.pph23) > 0 && (
            <p className="flex justify-between"><span>PPh 23 (dipotong customer)</span><span>− {rupiah(inv.pph23)}</span></p>
          )}
          <p className="flex justify-between border-t pt-1 text-base font-semibold"><span>Total</span><span>{rupiah(inv.total)}</span></p>
        </div>

        {company.bank && <p className="text-muted-foreground text-sm">Pembayaran ke: {company.bank}</p>}
      </article>
    </div>
  );
}

export default function Page(props: PageProps<"/invoices/[id]">) {
  return <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}><Content params={props.params} /></Suspense>;
}
