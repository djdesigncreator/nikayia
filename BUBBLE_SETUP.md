# Configurar o Bubble — só Backend Workflows (sem páginas visuais)

O Bubble aqui funciona só como "motor de utilizadores": guarda os dados,
faz login/registo, e devolve um token assinado. **Não precisa de nenhuma
página visual no Bubble** — todo o formulário e o visual estão no Next.js
(GitHub). O nosso backend (`api/auth/auth.routes.ts`) é que chama o Bubble
por trás, servidor-a-servidor.

## Passo 1 — Ativar Backend Workflows

1. No editor do Bubble, vá a **Settings → API**.
2. Marque a opção **"Enable Workflow API and backend workflows"**.
3. Isto faz aparecer uma nova secção **"Backend Workflows"** no separador Workflow (barra lateral esquerda, normalmente por baixo dos workflows normais de página).

## Passo 2 — Instalar o plugin JWT

1. **Plugins → Add plugins** → procure **"JSON Web Token (JWT)"** → **Install**.

## Passo 3 — Criar o workflow `signup`

1. Em **Backend Workflows**, clique em **"Create a new API Workflow"**. Nome: `signup`.
2. Marque **"This workflow can be run without authentication"** (é preciso, porque quem se regista ainda não tem sessão).
3. Adicione dois **parameters** ao workflow: `email` (text) e `password` (text) — botão "Add a parameter" no topo do editor do workflow.
4. Adicione a ação **"Sign the user up"**: Email = `email` (parâmetro), Password = `password` (parâmetro).
5. Adicione a ação **JWT Sign**:
   - **Secret**: uma senha longa e aleatória (guarde-a — vai para `BUBBLE_JWT_SECRET` no `.env` do backend).
   - **Payload**: `{"user_id": "Current User's unique id", "role": "USER"}`
   - **Algorithm**: HS256
6. Adicione a ação **"Return data from API"**:
   - `token` = resultado do passo JWT Sign (o campo "Token")
   - `user_id` = Current User's unique id

## Passo 4 — Criar o workflow `login`

Igual ao `signup`, mas:
- Nome: `login`
- Ação principal: **"Log the user in"** (em vez de Sign the user up), com Email/Password vindos dos parâmetros
- Os mesmos passos de JWT Sign e Return data from API a seguir

## Passo 5 — Obter o endereço base

O endereço dos seus workflows é:
```
https://SEU-APP.bubbleapps.io/version-test/api/1.1/wf     ← versão de desenvolvimento
https://SEU-APP.bubbleapps.io/api/1.1/wf                  ← versão live (depois de publicar)
```
Isto (sem `/signup` ou `/login` no fim) é o valor a colocar em `BUBBLE_API_BASE_URL`
no `.env` do backend. O backend já sabe adicionar `/signup` e `/login` sozinho.

## Resultado esperado

```
Next.js (pages/login.tsx)
   → POST /api/auth/signup  (nosso backend)
        → POST https://SEU-APP.bubbleapps.io/.../wf/signup  (Bubble)
        ← { token, user_id }
   ← { token }
→ frontend guarda o token e mostra o feed
```

## Testar

1. Depois de criar o workflow `signup` no Bubble, no próprio editor do Bubble
   existe um botão para testar o Backend Workflow diretamente (ícone de "play"
   junto ao nome do workflow) — usa isso primeiro, sem precisar do frontend,
   para confirmar que devolve `{ "response": { "token": "...", "user_id": "..." } }`.
2. Só depois de confirmar isso, preencha `BUBBLE_API_BASE_URL` no `.env` do
   backend e teste pelo formulário em `pages/login.tsx`.
