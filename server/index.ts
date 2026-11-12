import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { ErrorResponse } from "@/shared/types";

const app = new Hono();

// test routes for error handling
app.get("/test-404", () => {
  throw new HTTPException(404, { message: "Post not found" });
});

app.get("/test-form", () => {
  throw new HTTPException(409, {
    message: "Username already used",
    cause: { form: true },
  });
});

app.get("/test-crash", () => {
  throw new Error("Something broke!");
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

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

export default app;
