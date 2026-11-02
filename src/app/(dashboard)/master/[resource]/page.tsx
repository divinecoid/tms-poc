import { notFound } from "next/navigation";
import { Suspense } from "react";
import { desc, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { can } from "@/lib/auth/permissions";
import { requireCan } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateForm } from "@/modules/master/create-form";
import { DeleteButton } from "@/modules/master/delete-button";
import { getResource } from "@/modules/master/resources";

async function Content({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const res = getResource(resource);
  if (!res) notFound();
  const user = await requireCan("read", res.permission);
  const writable = can(user.role, "write", res.permission);
  const cols = getTableColumns(res.table) as Record<string, never>;
  const rows = (await db.select().from(res.table).orderBy(desc(cols.createdAt)).limit(200)) as Record<string, unknown>[];
  const listFields = res.fields.filter((f) => f.list);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{res.label}</h1>
      {writable && (
        <Card>
          <CardHeader><CardTitle>Tambah {res.label}</CardTitle></CardHeader>
          <CardContent><CreateForm resourceKey={res.key} fields={res.fields} /></CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                {listFields.map((f) => <TableHead key={f.name}>{f.label}</TableHead>)}
                {writable && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={listFields.length + 1} className="text-muted-foreground text-center">
                    Belum ada data
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={String(r.id)}>
                  {listFields.map((f) => <TableCell key={f.name}>{String(r[f.name] ?? "—")}</TableCell>)}
                  {writable && <TableCell><DeleteButton resourceKey={res.key} id={String(r.id)} /></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page(props: PageProps<"/master/[resource]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}>
      <Content params={props.params} />
    </Suspense>
  );
}
