import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { Pool } from "pg";
import type { ApplicationRole } from "@/lib/auth/roles";

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
       and deleted_at is null
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
       and u.is_active and u.deleted_at is null and p.is_active`,
    [tokenHash(token)],
  );
  return result.rows[0]?.user_id ?? null;
}

export async function databaseNow(): Promise<number> {
  const result = await database().query<{ now: Date }>("select now() as now");
  return result.rows[0].now.getTime();
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

export async function createStaffAccount(input: {
  actorId: string;
  email: string;
  displayName: string;
  password: string;
  role: ApplicationRole;
  houseId: string | null;
  eventId: string | null;
  expiresAt: string | null;
}) {
  const client = await database().connect();
  try {
    await client.query("begin");
    const actor = await client.query(
      `select 1 from public.users u join public.profiles p on p.id=u.id
       join public.user_roles r on r.user_id=u.id
       where u.id=$1 and u.is_active and p.is_active
         and r.role='system_administrator'
         and (r.expires_at is null or r.expires_at>now()) for update of u`,
      [input.actorId],
    );
    if (actor.rowCount !== 1)
      throw new Error("Administrator access is required.");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
      input.actorId,
    ]);
    const created = await client.query<{ id: string }>(
      `insert into public.users(email,display_name,password_hash)
       values($1,$2,extensions.crypt($3,extensions.gen_salt('bf',12))) returning id`,
      [input.email, input.displayName, input.password],
    );
    const userId = created.rows[0].id;
    await client.query(
      "insert into public.profiles(id,display_name) values($1,$2)",
      [userId, input.displayName],
    );
    await client.query(
      `insert into public.user_roles(user_id,role,house_id,event_id,granted_by,expires_at)
       values($1,$2,$3,$4,$5,$6)`,
      [
        userId,
        input.role,
        input.houseId,
        input.eventId,
        input.actorId,
        input.expiresAt,
      ],
    );
    await client.query("commit");
    return userId;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function manageStaffAccount(input: {
  actorId: string;
  targetId: string;
  operation: "edit" | "activate" | "deactivate" | "archive";
  email?: string;
  displayName?: string;
  role?: ApplicationRole;
  houseId?: string | null;
  eventId?: string | null;
}) {
  const client = await database().connect();
  try {
    await client.query("begin");
    const actor = await client.query(
      `select 1 from public.users u join public.profiles p on p.id=u.id
       join public.user_roles r on r.user_id=u.id
       where u.id=$1 and u.is_active and u.deleted_at is null and p.is_active
       and r.role='system_administrator' and (r.expires_at is null or r.expires_at>now()) for update of u`,
      [input.actorId],
    );
    if (actor.rowCount !== 1)
      throw new Error("Administrator access is required.");
    const target = await client.query<{ id: string; deleted_at: Date | null }>(
      "select id,deleted_at from public.users where id=$1 for update",
      [input.targetId],
    );
    if (!target.rowCount || target.rows[0].deleted_at)
      throw new Error("Account is unavailable.");
    const roles = await client.query<{ id: string; role: string }>(
      "select id,role from public.user_roles where user_id=$1 for update",
      [input.targetId],
    );
    const currentAdmin = roles.rows.some(
      (row) => row.role === "system_administrator",
    );
    const removesAdmin =
      input.operation === "archive" ||
      input.operation === "deactivate" ||
      (input.operation === "edit" && input.role !== "system_administrator");
    if (input.actorId === input.targetId && removesAdmin)
      throw new Error("You cannot remove your own administrator access.");
    if (currentAdmin && removesAdmin) {
      const count = await client.query<{ count: string }>(
        `select count(distinct u.id) from public.users u join public.profiles p on p.id=u.id
         join public.user_roles r on r.user_id=u.id where u.is_active and u.deleted_at is null
         and p.is_active and r.role='system_administrator'
         and (r.expires_at is null or r.expires_at>now())`,
      );
      if (Number(count.rows[0].count) < 2)
        throw new Error("The last active administrator cannot be removed.");
    }
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
      input.actorId,
    ]);
    if (input.operation === "edit") {
      if (
        roles.rowCount !== 1 ||
        !input.role ||
        !input.email ||
        !input.displayName
      )
        throw new Error(
          "This account needs a single role and complete profile details.",
        );
      await client.query(
        "update public.users set email=$2,updated_at=now() where id=$1",
        [input.targetId, input.email],
      );
      await client.query(
        "update public.profiles set display_name=$2 where id=$1",
        [input.targetId, input.displayName],
      );
      await client.query(
        "update public.user_roles set role=$2,house_id=$3,event_id=$4,granted_by=$5,granted_at=now() where id=$1",
        [
          roles.rows[0].id,
          input.role,
          input.houseId ?? null,
          input.eventId ?? null,
          input.actorId,
        ],
      );
    } else if (input.operation === "activate") {
      await client.query(
        "update public.profiles set is_active=true where id=$1",
        [input.targetId],
      );
    } else {
      await client.query(
        "update public.profiles set is_active=false where id=$1",
        [input.targetId],
      );
      await client.query(
        "update private.staff_sessions set revoked_at=now() where user_id=$1 and revoked_at is null",
        [input.targetId],
      );
      if (input.operation === "archive")
        await client.query(
          "update public.users set deleted_at=now(),updated_at=now() where id=$1",
          [input.targetId],
        );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export function rlsToken(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, role: "authenticated", aud: "authenticated", iat: now, exp: now + 60 })}`;
  return `${body}.${createHmac("sha256", signingSecret()).update(body).digest("base64url")}`;
}
