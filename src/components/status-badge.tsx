import { Badge } from "@/components/ui/badge";

const tone: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline", CONFIRMED: "secondary", SCHEDULED: "secondary", ASSIGNED: "secondary",
  CANCELLED: "destructive", REJECTED: "destructive", APPROVED: "default", PENDING: "outline", ISSUED: "secondary", VOID: "destructive", INVOICED: "secondary", DELIVERED: "default", PAID: "default", SETTLED: "default",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={tone[status] ?? "outline"}>{status.replaceAll("_", " ")}</Badge>;
}
