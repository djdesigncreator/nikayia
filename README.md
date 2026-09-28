# Nikayia — Rede Social Moçambicana

Monorepo do projeto Nikayia. Ver `ARCHITECTURE.md`, `DATABASE_SCHEMA.md` e `API_SPEC.md`
(na raiz do repositório principal) para a documentação completa.

## Stack

- **Backend:** Node.js + TypeScript + Express + Prisma (PostgreSQL)
- **Frontend:** Next.js + TypeScript
- **Auth:** Bubble.io (emite JWT) → validado pelo backend
- **Media:** Bunny.net (storage + CDN)
- **Live streaming:** Agora.io

## Estrutura

```
/social-app
  /frontend      → app Next.js (feed, reels, stories, lives, perfis)
  /backend       → servidor Express (entrypoint em backend/server.ts)
  /components    → componentes React partilhados
  /pages         → páginas Next.js
  /services      → BunnyService, AgoraService, outros serviços de integração
  /api           → rotas REST, uma pasta por domínio
  /database      → schema Prisma + migrations
  /hooks         → hooks React (useAuth, useFeed, useInfiniteScroll...)
  /utils         → utilitários partilhados (jwt, pagination, validation)
  /types         → tipos TypeScript partilhados entre frontend e backend
  /config        → carregamento e validação de variáveis de ambiente
  /assets        → imagens/ícones estáticos do frontend
  /tests         → testes automatizados
```

## Como começar (local)

1. Copiar `.env.example` para `.env` e preencher (Bubble, Bunny.net, Agora.io, base de dados).
2. `npm install` (na raiz — um só `package.json` serve o frontend e o backend).
3. `npm run db:push` (cria as tabelas na base de dados PostgreSQL a partir de `database/prisma/schema.prisma`).
4. `npm run dev:backend` → API em http://localhost:4000 (teste: /health).
5. Noutro terminal, `npm run dev` → site em http://localhost:3000.

## Online (sem computador próprio)

- **Base de dados:** PostgreSQL gerido (ex.: Neon, Supabase ou Render Postgres).
- **Backend:** serviço Node (ex.: Render). Build: `npm install && npm run build:backend`. Start: `npm run db:push && npm run start:backend`.
- **Frontend:** Next.js (ex.: Vercel), com `NEXT_PUBLIC_API_BASE_URL` a apontar para o backend.
- O GitHub Pages **não** serve: só hospeda ficheiros estáticos, e aqui há um servidor Node e páginas dinâmicas.

## Segurança

- **Nunca** commitar o ficheiro `.env`.
- Todas as chamadas a serviços externos (Bunny, Agora) passam pelo backend —
  o frontend nunca tem acesso direto às credenciais.
