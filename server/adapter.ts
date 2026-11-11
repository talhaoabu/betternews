import { drizzle } from "drizzle-orm/postgres-js";

import postgres from "postgres";
import { z } from "zod";

// ১. .env-এ যা থাকা দরকার তার নিয়ম
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
});

// ২. যাচাই করো — না থাকলে বা ভুল হলে এখানেই পরিষ্কার error
const processEnv = EnvSchema.parse(process.env);

// ৩. driver দিয়ে আসল connection
const queryClient = postgres(processEnv.DATABASE_URL);

// ৪. সেই connection-এর উপরে Drizzle বসানো — এটাই সব জায়গায় import হবে
export const db = drizzle(queryClient);

// ৫. TEST — কাজ করলে মুছে দেবে
//const result = await db.execute("select 1");
//console.log(result);
