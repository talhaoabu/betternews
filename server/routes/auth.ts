import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";

import { zValidator } from "@hono/zod-validator";
import { generateId } from "lucia";
import postgres from "postgres";

import { loginSchema, type SuccessResponse } from "@/shared/types";
import { db } from "@/adapter";
import type { Context } from "@/context";
import { userTable } from "@/db/schemas/auth";
import { lucia } from "@/lucia";
import { loggedIn } from "@/middleware/loggedIn";

export const authRouter = new Hono<Context>()
  // ── SIGNUP ──────────────────────────────
  .post("/signup", zValidator("form", loginSchema), async (c) => {
    const { username, password } = c.req.valid("form");
    const passwordHash = await Bun.password.hash(password);
    const userId = generateId(15);

    try {
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
    } catch (error) {
      if (error instanceof postgres.PostgresError && error.code === "23505") {
        throw new HTTPException(409, {
          message: "Username already used",
          cause: { form: true },
        });
      }
      throw new HTTPException(500, { message: "Failed to create user" });
    }
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

    return c.json<SuccessResponse>({ success: true, message: "Logged in" }, 200);
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