import { createApp } from "./app/app.js";
import { close } from "./data/store.js";

const PORT = Number(process.env.PORT) || 3000;

const app = createApp();

const server = app.listen(PORT, () => {
  const authStatus = process.env.SUPABASE_URL && process.env.SUPABASE_KEY
    ? "Supabase Auth configured"
    : "Supabase Auth needs SUPABASE_URL and SUPABASE_KEY";
  console.log(`Task API listening on http://localhost:${PORT} · ${authStatus}`);
});

async function shutdown(): Promise<void> {
  server.close(async () => {
    await close();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
