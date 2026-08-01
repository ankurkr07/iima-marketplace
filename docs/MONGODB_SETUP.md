# Database setup (MongoDB) — for Agile CCC

The IIMA Marketplace backend uses **Prisma + MongoDB**.

## ⚠️ There are no migration files — this is correct, not a bug

Prisma's `migrate` command (and its `prisma/migrations/` SQL files) works **only for
SQL databases** (PostgreSQL / MySQL / SQLite). MongoDB is not supported by it:

```
$ npx prisma migrate dev
Error: The "mongodb" provider is not supported with this command.
```

If you ran `prisma migrate` and got that error — that's expected. **Do not use
`migrate` for this project.** MongoDB is schemaless, so Prisma applies the schema
directly with **`db push`**, which creates every collection and index from
`backend/prisma/schema.prisma`. The schema file *is* the migration — it's committed
to git, so the setup is fully reproducible and portable (cloud → local) with no
manual clicking in Atlas.

## One-time setup

From the `backend/` folder:

```bash
# 1. Set the connection string (MongoDB Atlas or self-hosted).
#    Put this in backend/.env as DATABASE_URL. Must be a REPLICA SET
#    (Atlas is one by default; a standalone mongod will NOT work).
#    Example: mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/iima_marketplace

# 2. Install deps
npm install

# 3. Create the Prisma client, all collections + indexes, and seed data:
npm run setup
#   ↳ equivalent to: prisma generate && prisma db push && prisma db seed
```

That's it. `db push` creates the 6 collections (`User`, `Category`, `Product`,
`WishlistItem`, `Conversation`, `Message`) with all their indexes; the seed fills
the 18 categories and demo/admin users.

### Useful scripts
| Command | What it does |
|---|---|
| `npm run setup` | generate client + `db push` + seed (first-time setup) |
| `npm run db:push` | sync schema → DB (creates/updates collections & indexes) |
| `npm run db:seed` | (re)insert categories + demo users |
| `npm run db:reset` | **wipe** the DB, re-push, re-seed (`db push --force-reset`) |

## Two gotchas that cause connection failures

1. **Replica set required.** Prisma's Mongo connector needs a replica set for
   transactions. Atlas clusters are replica sets out of the box. A plain local
   `mongod` must be started with `--replSet` and initiated (`rs.initiate()`), or
   writes that use transactions will fail.

2. **Atlas Network Access / IP allowlist.** If you see
   `Server selection timeout` or `received fatal alert: InternalError`, the
   connecting machine's IP is not allowlisted. In Atlas → **Network Access**, add
   the deploy server's IP (or `0.0.0.0/0` for open dev access), then retry.

## Moving cloud → local later

Nothing to migrate. Point `DATABASE_URL` at the local MongoDB (replica-set) instance
and run `npm run setup` again. Same schema file, same result.
