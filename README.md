# TMS — Transportation Management System

Aplikasi internal untuk perusahaan trucking: order (FTL/LTL/multi-drop), dispatch armada sendiri & vendor,
aplikasi driver (PWA: status, e-POD, pengeluaran, GPS), invoice, settlement uang jalan, hutang vendor,
laporan margin & aging.

Stack: Next.js 16 (App Router), TypeScript, Tailwind + shadcn/ui, Drizzle ORM, PostgreSQL, Better Auth.
Dokumentasi bisnis & teknis lengkap ada di vault Obsidian `../docs` (mulai dari `00-Overview/Home.md`).

## Development

```bash
cp .env.example .env.local          # sesuaikan bila perlu
docker compose -f docker-compose.dev.yml up -d db
npm install
npm run db:migrate
npm run db:seed                     # buat owner dev: owner@tms.local (lihat scripts/seed.ts)
npm run dev
```

| Perintah | Fungsi |
|---|---|
| `npm test` | tes unit (alokasi biaya, aging, CSV, env) |
| `npm run lint` / `npm run typecheck` | kualitas kode |
| `npm run db:generate` | buat migrasi dari perubahan `src/db/schema.ts` |
| `npm run user:create -- <email> <password> <role> <nama> [driverId]` | buat pengguna |

## Deploy

Lihat `../docs/02-Technical/Panduan Deploy Dokploy.md`. Ringkas: image dibangun dari `Dockerfile`, migrasi
database berjalan otomatis saat container start, file upload disimpan di volume `/app/uploads`.
