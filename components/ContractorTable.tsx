import { ContractorTableClient } from "@/components/ContractorTableClient";
import type { ContractorWithGradings } from "@/types";

type ContractorTableProps = {
  contractors: ContractorWithGradings[];
};

export function ContractorTable({ contractors }: ContractorTableProps) {
  return <ContractorTableClient contractors={contractors} />;
}
