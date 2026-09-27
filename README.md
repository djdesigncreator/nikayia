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

## Como começar

1. Copiar `.env.example` para `.env` e preencher com as credenciais reais
   (já criadas no Bubble.io, Bunny.net e Agora.io).
2. `cd backend && npm install`
3. `npx prisma migrate dev` (cria as tabelas na base de dados a partir de `database/prisma/schema.prisma`)
4. `npm run dev` (arranca o servidor Express em modo desenvolvimento)
5. Em paralelo, `cd frontend && npm install && npm run dev` para o Next.js.

## Segurança

- **Nunca** commitar o ficheiro `.env`.
- Todas as chamadas a serviços externos (Bunny, Agora) passam pelo backend —
  o frontend nunca tem acesso direto às credenciais.
