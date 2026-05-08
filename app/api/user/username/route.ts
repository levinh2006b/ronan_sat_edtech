import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  USERNAME_REQUIREMENTS,
  isValidUsername,
  normalizeUsername,
} from "@/lib/userProfile";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const username = normalizeUsername(searchParams.get("value") ?? "");

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { isAvailable: false, error: USERNAME_REQUIREMENTS },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  return NextResponse.json(
    { isAvailable: !existingUser || existingUser.id === session.user.id, username },
    { status: 200 }
  );
}
