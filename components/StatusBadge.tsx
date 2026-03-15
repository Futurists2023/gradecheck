import type { RegistrationStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status: RegistrationStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const className =
    status === "Active"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Suspended"
        ? "bg-amber-100 text-amber-900"
        : status === "DeRegistered"
          ? "bg-slate-200 text-slate-900"
          : "bg-rose-100 text-rose-800";

  return <Badge className={className}>{status}</Badge>;
}
