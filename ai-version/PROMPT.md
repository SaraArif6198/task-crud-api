# Stage 7 — The prompt I gave the AI (from memory, not copied from the PDF)

> Build a small REST API in Node.js with Express for a to-do list.
> Requirements:
> - Five endpoints: `GET /tasks`, `GET /tasks/:id`, `POST /tasks`,
>   `PUT /tasks/:id`, `DELETE /tasks/:id`.
> - Store tasks in memory only — no database, no files. A task is
>   `{ id, title, done }`.
> - Correct status codes: 200 for reads, 201 for create, 204 for delete,
>   400 for an invalid body, 404 for an unknown id. Every error response is
>   JSON like `{ "error": "..." }`.
> - POST and PUT must validate the body: a missing or empty `title` is a 400.
> - Serve Swagger UI at `/docs` documenting all the endpoints.
> - Seed a few example tasks on startup.
> Keep it simple and runnable with `node index.js`.

The output of that single prompt is in `index.js` (unedited). The comparison
against my hand-built `src/` version — what the AI did better, what it got
wrong, and what my prompt failed to pin down — is written up in the root
`README.md` under "AI vs me".
