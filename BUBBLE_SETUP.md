# Configurar o Bubble para emitir o token de sessão

O frontend (`pages/login.tsx`) redireciona o utilizador para o Bubble.
Depois de um login ou registo bem-sucedido, **o Bubble tem de devolver um
token JWT assinado** para `https://<seu-frontend>/auth/callback?token=<jwt>`.

## Passo a passo no editor do Bubble

1. **Instalar o plugin "JSON Web Token (JWT)"** (Plugins → Add plugins → procurar "JWT").
2. Na página de Login/Registo do Bubble, no workflow que corre **depois** de
   "Log the user in" (ou "Sign the user up") ter sucesso, adicionar uma ação
   nova: **JWT Sign**.
   - **Secret**: o mesmo valor que vai colocar em `BUBBLE_JWT_SECRET` no
     `.env` do backend (escolha uma string longa e aleatória, guarde-a em
     ambos os sítios).
   - **Payload**: um JSON com `{"user_id": "<Current User's unique id>", "role": "USER"}`
     (ajustar o campo `role` se tiver uma forma de distinguir CREATOR/ADMIN
     no Bubble).
   - **Algorithm**: HS256.
3. Adicionar a seguir uma ação **"Navigate to external website"** (ou
   "Go to page URL" com um link externo):
   - URL: `https://<seu-frontend>/auth/callback?token=` seguido do resultado
     da ação JWT Sign (`Result of step X's Token`).
   - O `redirect_url` que o frontend já envia como query param
     (`?redirect_url=...`) pode ser lido no Bubble com "Get data from page URL"
     e usado aqui em vez de fixar o domínio, para funcionar tanto em
     desenvolvimento como em produção.

## Resultado esperado

Depois de o utilizador fazer login no Bubble:
```
Bubble → gera JWT → redireciona para
https://nikayia.app/auth/callback?token=eyJhbGciOi...
```
O ficheiro `pages/auth/callback.tsx` já criado apanha esse `token`, guarda-o
e leva o utilizador para o feed (`/`).

## Testar sem esperar pelo Bubble

Para testar o frontend já hoje, sem mexer no Bubble:
1. Gere um token de teste manualmente (ex.: em jwt.io, com o mesmo secret do `.env`,
   payload `{"user_id": "algum-uuid-de-teste", "role": "USER"}`).
2. Abra diretamente `http://localhost:3000/auth/callback?token=<esse-token>`.
3. Deve ser redirecionado para o feed.
