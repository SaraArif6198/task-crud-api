CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks (done);
CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks (title);

INSERT INTO tasks (title, done)
SELECT seed.title, seed.done
FROM (
  VALUES
    ('Learn what an API is', TRUE),
    ('Build a CRUD endpoint', FALSE),
    ('Write the README', FALSE)
) AS seed(title, done)
WHERE NOT EXISTS (SELECT 1 FROM tasks);
