# Nikayia — Arquitetura da Aplicação

## 1. Visão Geral

Nikayia é uma rede social mobile-first construída sobre uma **arquitetura híbrida**:
cada camada faz apenas aquilo em que é boa, e nenhuma delas carrega responsabilidades
que não lhe pertencem.

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTE (Web/Mobile)                    │
│         Frontend principal (React/Next.js recomendado)           │
└───────────────┬───────────────────────────────────┬─────────────┘
                │                                   │
        (1) Auth/Sessão                     (2) Dados sociais
                │                                   │
                ▼                                   ▼
┌───────────────────────────┐        ┌───────────────────────────────┐
│         BUBBLE.IO          │        │        BACKEND (GitHub)        │
│  - Registo / Login          │        │  - API REST (/api/*)            │
│  - Recuperação de password  │        │  - Feed, posts, stories, reels  │
│  - Gestão básica de conta    │───────▶│  - Comentários, likes, mensagens │
│  - Emite token/sessão        │ token  │  - Notificações, pesquisa       │
│                              │        │  - Moderação, admin             │
└───────────────────────────┘        └───────┬─────────────┬─────────┘
                                              │             │
                                    (3) Media │             │ (4) Live
                                              ▼             ▼
                                  ┌────────────────┐  ┌────────────────┐
                                  │   BUNNY.NET     │  │    AGORA.IO     │
                                  │  Storage + CDN  │  │  Vídeo/áudio    │
                                  │  Vídeos/Imagens │  │  em tempo real  │
                                  └────────────────┘  └────────────────┘
```

## 2. Responsabilidades por Camada

### 2.1 Bubble.io — apenas Identidade
- Criar conta, login, logout, recuperação/alteração de password.
- Gestão básica de dados de utilizador (username, email, estado da conta).
- Após autenticar, gera um **token de sessão assinado** (JWT) que o frontend
  passa a usar em todos os pedidos ao backend.
- Bubble **nunca** processa feed, stories, reels, lives ou qualquer lógica pesada.
- Bubble pode ser usado como orquestrador de integrações externas administrativas
  (ex.: disparar um plugin), mas nunca como motor da experiência social.

### 2.2 Backend / GitHub — o cérebro da aplicação
Estrutura de pastas (conforme definido):
```
/social-app
  /frontend
  /backend
  /components
  /pages
  /services
  /api
  /database
  /hooks
  /utils
  /types
  /config
  /assets
  /tests
  README.md
  .env.example
```
- `/backend/services/BunnyService` — upload, delete, metadata, URLs de CDN.
- `/backend/services/AgoraService` — criação de canais, geração de tokens, eventos.
- `/backend/api` — todas as rotas REST (ver `API_SPEC.md`).
- `/backend/database` — modelos, migrations, schema (ver `DATABASE_SCHEMA.md`).
- Todo o código deve ser modular, tipado (TypeScript recomendado), testado e documentado.

### 2.3 Bunny.net — Media e entrega
- Armazenamento de vídeos e imagens (Storage Zone).
- CDN para entrega rápida (Pull Zone).
- Streaming adaptativo para Reels, vídeos de feed e Stories em vídeo.
- Upload feito **via backend** (URLs assinadas), nunca diretamente do frontend com
  credenciais expostas.
- Vídeos de Lives gravadas (quando aplicável) são movidos para Bunny após o
  encerramento da transmissão.

### 2.4 Agora.io — Tempo real
- Canais de live (host, co-host, viewer).
- Geração de tokens de canal **sempre no backend** (nunca expor App Certificate).
- Chat da live pode correr em Agora RTM ou num serviço de mensagens em tempo real
  próprio (ex.: WebSocket no backend), a decidir na fase de implementação.
- Arquitetura preparada para evoluir para chamadas 1:1 e chamadas em grupo.

## 3. Fluxo de Autenticação

1. Utilizador faz login/registo no Bubble.
2. Bubble valida credenciais e emite um JWT assinado (contendo `user_id`, `role`, `exp`).
3. Frontend guarda o token (memória / secure storage) e anexa-o em `Authorization: Bearer <token>` em todos os pedidos ao backend.
4. Backend valida o JWT (mesma chave secreta partilhada com o Bubble, ou JWKS se o Bubble expuser um endpoint de verificação) antes de processar qualquer pedido.
5. Nenhuma credencial (secrets do Bubble, do Bunny ou do Agora) é exposta ao frontend — tudo fica em variáveis de ambiente do backend (`.env`, nunca commitado).

## 4. Roles e Permissões

```
USER          — utilizador comum
CREATOR       — pode iniciar lives, tem métricas de criador
MODERATOR     — pode rever denúncias, remover conteúdo
ADMIN         — gestão geral, suspensão de contas
SUPER_ADMIN   — acesso total, incluindo configuração do sistema
```
Cada rota da API declara os roles permitidos via middleware de autorização.

## 5. Segurança (resumo)

- JWT/sessão validada em todos os pedidos autenticados.
- Rate limiting por utilizador/IP nas rotas sensíveis (login, criação de conteúdo, comentários).
- Validação e sanitização de todo o input (nomes, bios, comentários, uploads).
- URLs de upload para o Bunny assinadas com expiração curta.
- Tokens Agora gerados com escopo e validade limitados por canal.
- Secrets apenas no backend (`.env`, nunca no frontend nem no repositório).

## 6. Onde inserir credenciais

| Serviço   | Variável (.env do backend)              | Nota |
|-----------|------------------------------------------|------|
| Bubble    | `BUBBLE_JWT_SECRET` ou `BUBBLE_JWKS_URL`  | Para validar tokens emitidos pelo Bubble |
| Bunny.net | `BUNNY_STORAGE_ZONE`, `BUNNY_API_KEY`, `BUNNY_CDN_HOSTNAME` | Nunca expor no frontend |
| Agora.io  | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`   | Certificate nunca sai do backend |

Estas chaves já estão criadas nas três plataformas — inserir os valores reais
diretamente no `.env` do backend (nunca no `.env.example`, que deve conter apenas
os nomes das variáveis).
