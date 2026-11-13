import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { ErrorResponse } from "@/shared/types";
import type { Context } from "./context";
import { lucia } from "./lucia";
import { authRouter } from "./routes/auth";
//import { showRoutes } from "hono/dev";

const app = new Hono<Context>();

// ১. CORS — frontend (অন্য port) থেকে request আসতে দাও
app.use("*", cors());

// ২. Lucia middleware — প্রতি request-এ cookie পড়ে user বের করো
app.use("*", async (c, next) => {
  const sessionId = lucia.readSessionCookie(c.req.header("Cookie") ?? "");
  if (!sessionId) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  const { session, user } = await lucia.validateSession(sessionId);
  if (session && session.fresh) {
    c.header("Set-Cookie", lucia.createSessionCookie(session.id).serialize(), {
      append: true,
    });
  }
  if (!session) {
    c.header("Set-Cookie", lucia.createBlankSessionCookie().serialize(), {
      append: true,
    });
  }
  c.set("session", session);
  c.set("user", user);
  return next();
});

// ৩. Routes — সব /api দিয়ে শুরু
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = app.basePath("/api").route("/auth", authRouter);

app.onError((err, c) => {
  // ── ১. Expected error: আমি নিজে HTTPException throw করেছি
  if (err instanceof HTTPException) {
    const errResponse =
      err.res ??
      c.json<ErrorResponse>(
        {
          success: false,
          error: err.message,
          isFormError:
            typeof err.cause === "object" &&
            err.cause !== null &&
            "form" in err.cause
              ? err.cause.form === true
              : false,
        },
        err.status,
      );
    return errResponse;
  }

  // ── ২. Unexpected error: code-এ bug
  return c.json<ErrorResponse>(
    {
      success: false,
      error:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : (err.stack ?? err.message),
    },
    500,
  );
});


// export default app;-এর ঠিক আগে
// 
export default app;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ApiRoutes = typeof routes;
