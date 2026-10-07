import { NextResponse } from "next/server";
import { requireAdmin, loadAdminUsers } from "@/lib/admin/server";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const users = await loadAdminUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("GET /api/admin/users failed", error);
    return NextResponse.json({ error: "Could not load users." }, { status: 500 });
  }
}
