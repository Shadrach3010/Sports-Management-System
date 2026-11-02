import { NextResponse } from "next/server";

// Protected pages and actions check the database-backed session on the server.
export function proxy() {
  return NextResponse.next();
}
