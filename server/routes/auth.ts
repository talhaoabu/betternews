import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";

import { db } from "@/adapter";
import type { Context } from "@/context";
import { userTable } from "@/db/schemas/auth";
import { lucia } from "@/lucia";
import { loggedIn } from "@/middleware/loggedIn";
import { zValidator } from "@hono/zod-validator";
import { generateId } from "lucia";

import { loginSchema, type SuccessResponse } from "@/shared/types";

export const authRouter = new Hono<Context>()
  // ── SIGNUP ──────────────────────────────
  .post("/signup", zValidator("form", loginSchema), async (c) => {
    const { username, password } = c.req.valid("form");
    const passwordHash = await Bun.password.hash(password);
    const userId = generateId(15);

    const [existingUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.username, username))
      .limit(1);

    if (existingUser) {
      throw new HTTPException(409, {
        message: "Username already used",
        cause: { form: true },
      });
    }
    await db.insert(userTable).values({
      id: userId,
      username,
      password_hash: passwordHash,
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id).serialize();
    c.header("Set-Cookie", sessionCookie, { append: true });

    return c.json<SuccessResponse>(
      { success: true, message: "User created" },
      201,
    );
  })

  // ── LOGIN ───────────────────────────────
  .post("/login", zValidator("form", loginSchema), async (c) => {
    const { username, password } = c.req.valid("form");

    const [existingUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.username, username))
      .limit(1);

    if (!existingUser) {
      throw new HTTPException(401, {
        message: "Incorrect username",
        cause: { form: true },
      });
    }

    const validPassword = await Bun.password.verify(
      password,
      existingUser.password_hash,
    );

    if (!validPassword) {
      throw new HTTPException(401, {
        message: "Incorrect password",
        cause: { form: true },
      });
    }

    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id).serialize();
    c.header("Set-Cookie", sessionCookie, { append: true });

    return c.json<SuccessResponse>(
      { success: true, message: "Logged in" },
      200,
    );
  })

  // ── LOGOUT ──────────────────────────────
  .get("/logout", async (c) => {
    const session = c.get("session");
    if (!session) {
      return c.redirect("/");
    }
    await lucia.invalidateSession(session.id);
    c.header("Set-Cookie", lucia.createBlankSessionCookie().serialize());
    return c.redirect("/");
  })

  // ── GET USER ────────────────────────────
  .get("/user", loggedIn, async (c) => {
    const user = c.get("user")!;
    return c.json<SuccessResponse<{ username: string }>>({
      success: true,
      message: "User fetched",
      data: { username: user.username },
    });
  });
