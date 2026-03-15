import type { Metadata } from "next";

import AboutPage from "@/app/about/page";
import { absoluteUrl, buildAboutHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About GradeCheck",
  description:
    "Learn how GradeCheck structures CIDB contractor data for verification and discovery.",
  alternates: {
    canonical: absoluteUrl(buildAboutHref()),
  },
};

export default AboutPage;
