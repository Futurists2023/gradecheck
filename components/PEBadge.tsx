import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PEBadgeProps = {
  pe_flag: boolean;
};

export function PEBadge({ pe_flag }: PEBadgeProps) {
  if (!pe_flag) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <div className="relative inline-flex">
          <TooltipTrigger asChild>
            <div>
              <Badge className="bg-sky-100 text-sky-900">PE Contractor</Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Potentially Emerging Enterprise - qualifies for preferential procurement.
          </TooltipContent>
        </div>
      </Tooltip>
    </TooltipProvider>
  );
}
