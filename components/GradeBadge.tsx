import { Badge } from "@/components/ui/badge";
import { CLASS_CODE_LABELS, GRADE_THRESHOLDS } from "@/lib/constants";

type GradeBadgeProps = {
  grade_level: number;
  class_code: string;
};

export function GradeBadge({ grade_level, class_code }: GradeBadgeProps) {
  const label = CLASS_CODE_LABELS[class_code] ?? class_code;

  return (
    <div className="rounded-2xl border border-border bg-secondary/60 p-4">
      <Badge className="mb-3 bg-primary/10 text-primary">{`Grade ${grade_level} - ${label}`}</Badge>
      <p className="text-sm font-medium text-foreground">{class_code}</p>
      <p className="mt-1 text-sm text-muted-foreground">{GRADE_THRESHOLDS[grade_level]}</p>
    </div>
  );
}
