import { differenceInMonths } from "date-fns";

import { cn, formatDate } from "@/lib/utils";

type ExpiryCountdownProps = {
  expiry_date: string | null;
  status: string;
};

export function ExpiryCountdown({ expiry_date, status }: ExpiryCountdownProps) {
  if (!expiry_date) {
    return <p className="text-sm text-muted-foreground">Expiry date unavailable</p>;
  }

  const now = new Date();
  const expiry = new Date(expiry_date);
  const months = Math.abs(differenceInMonths(expiry, now));

  if (status === "Suspended") {
    return <p className="text-sm font-medium text-amber-900">Suspended - Expiry: {formatDate(expiry_date)}</p>;
  }

  if (status === "Expired" || expiry < now) {
    const label =
      months >= 12
        ? `${Math.floor(months / 12)} year${Math.floor(months / 12) === 1 ? "" : "s"}`
        : `${months} month${months === 1 ? "" : "s"}`;

    return <p className="text-sm font-medium text-rose-700">Expired {label} ago</p>;
  }

  return (
    <p className={cn("text-sm font-medium", months <= 6 ? "text-amber-900" : "text-emerald-700")}>
      Expires in {months} month{months === 1 ? "" : "s"}
    </p>
  );
}
