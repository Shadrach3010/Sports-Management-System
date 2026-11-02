import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { Pool } from "pg";

const cookieName = "csmis_session";
const lifetimeSeconds = 60 * 60 * 8;

const globalForPool = globalThis as typeof globalThis & { csmisPool?: Pool };

function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return (globalForPool.csmisPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 8000,
  }));
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function signingSecret() {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("SUPABASE_JWT_SECRET is required");
  return secret;
}

export async function signIn(
  email: string,
  password: string,
): Promise<boolean> {
  const result = await database().query<{ id: string }>(
    `select id from public.users
     where lower(email) = $1 and is_active and password_hash is not null
       and password_hash = extensions.crypt($2, password_hash)
       and exists (select 1 from public.profiles p where p.id = users.id and p.is_active)
       and exists (select 1 from public.user_roles r where r.user_id = users.id
         and (r.expires_at is null or r.expires_at > now()))`,
    [email, password],
  );
  if (result.rowCount !== 1) return false;
  const token = randomBytes(32).toString("base64url");
  await database().query(
    `insert into private.staff_sessions(token_hash,user_id,expires_at)
     values($1,$2,now() + interval '8 hours')`,
    [tokenHash(token), result.rows[0].id],
  );
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: lifetimeSeconds,
  });
  return true;
}

export async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const result = await database().query<{ user_id: string }>(
    `select s.user_id from private.staff_sessions s
     join public.users u on u.id=s.user_id
     join public.profiles p on p.id=s.user_id
     where s.token_hash=$1 and s.revoked_at is null and s.expires_at > now()
       and u.is_active and p.is_active`,
    [tokenHash(token)],
  );
  return result.rows[0]?.user_id ?? null;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) {
    await database().query(
      "update private.staff_sessions set revoked_at=now() where token_hash=$1",
      [tokenHash(token)],
    );
  }
  jar.delete(cookieName);
}

export function rlsToken(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, role: "authenticated", aud: "authenticated", iat: now, exp: now + 60 })}`;
  return `${body}.${createHmac("sha256", signingSecret()).update(body).digest("base64url")}`;
}
