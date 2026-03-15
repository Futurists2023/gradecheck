import { NextResponse } from "next/server";

import { searchContractors } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters long." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const contractors = await searchContractors(query);
  return NextResponse.json(contractors.slice(0, 20), {
    headers: { "Cache-Control": "no-store" },
  });
}
