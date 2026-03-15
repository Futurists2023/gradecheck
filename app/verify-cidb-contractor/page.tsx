import type { Metadata } from "next";

import VerifyPage from "@/app/verify/page";
import { absoluteUrl, buildVerifyHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Verify a CIDB contractor",
  description:
    "Search by contractor name or CRS number, then compare source links and captured timestamps.",
  alternates: {
    canonical: absoluteUrl(buildVerifyHref()),
  },
};

export default VerifyPage;
