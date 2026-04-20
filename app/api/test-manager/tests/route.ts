import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import {
  getTestManagerCatalogErrorMessage,
  getTestManagerCatalogErrorStatus,
  testManagerCatalogService,
} from "@/lib/services/testManagerCatalogService";
import type { TestManagerCatalogSearchScope, TestManagerCatalogSortOption } from "@/types/testManager";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);

    const data = await testManagerCatalogService.getPage(
      {
        query: searchParams.get("query") ?? "",
        searchScope: (searchParams.get("searchScope") ?? "testTitle") as TestManagerCatalogSearchScope,
        sort: (searchParams.get("sort") ?? "updated_desc") as TestManagerCatalogSortOption,
        offset: Number.isFinite(offset) ? offset : 0,
        limit: Number.isFinite(limit) ? limit : 20,
      },
      session,
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("GET /api/test-manager/tests error:", error);
    return NextResponse.json({ error: getTestManagerCatalogErrorMessage(error) }, { status: getTestManagerCatalogErrorStatus(error) });
  }
}
