import { createApp } from "./app/app.js";

const PORT = Number(process.env.PORT) || 3000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Task API listening on http://localhost:${PORT}`);
});
