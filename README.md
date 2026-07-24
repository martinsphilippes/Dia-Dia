# 🎾 MatchPoint

**O "Tinder do tênis"** — encontre parceiros de tênis na sua cidade (ou onde você estiver viajando). Deslize cards, dê match com quem combina com o seu nível e combine a partida pelo chat.

> Muita gente viaja e não tem com quem jogar. Outros nem na própria cidade
> conseguem parceiro. O MatchPoint resolve isso conectando tenistas do mesmo
> nível, no mesmo lugar.

## ✨ Funcionalidades

- **Cadastro e login** por email/senha (Supabase Auth)
- **Perfil completo**: foto, cidade, nível (iniciante → competitivo), formato
  (simples/duplas), mão dominante, disponibilidade e bio
- **Descobrir (swipe)**: cards estilo Tinder, com arrastar (drag) e botões, só
  de tenistas da **mesma cidade** que ainda não foram avaliados
- **Match recíproco**: quando os dois se curtem, rola o match com animação
- **Matches e chat em tempo real** (Supabase Realtime), com contagem de não-lidas
- **Filtro por cidade** feito no banco via função RPC `SECURITY DEFINER`
- **Segurança**: Row Level Security em todas as tabelas + Storage com políticas
  por usuário

## 🏗️ Stack

| Camada        | Tecnologia                                        |
| ------------- | ------------------------------------------------- |
| Frontend      | Next.js 14 (App Router) + React 18 + TypeScript   |
| Estilo        | Tailwind CSS                                      |
| Animações     | Framer Motion (swipe)                             |
| Backend/DB    | Supabase (PostgreSQL, Auth, Realtime, Storage)    |
| Hospedagem    | Vercel                                            |

## 📁 Estrutura

```
app/
  (app)/                # rotas autenticadas (com navegação)
    discover/           # tela de swipe
    matches/            # lista de matches
    matches/[id]/       # chat em tempo real
    profile/            # edição de perfil
    layout.tsx          # layout com nav + guarda de sessão/onboarding
  login/                # cadastro e login
  onboarding/           # montagem do perfil no 1º acesso
  auth/signout/         # rota POST de logout
  page.tsx              # landing page
components/             # UI (swipe deck, chat, formulário de perfil, ícones)
lib/
  supabase/             # clients (browser, server, middleware) + config
  types.ts              # tipos de domínio e do banco
  utils.ts              # helpers (idade, tempo relativo, etc.)
middleware.ts           # refresh de sessão + proteção de rotas
supabase/schema.sql     # schema completo do banco (documentação/reprodução)
```

## 🚀 Rodando localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie o arquivo `.env.local` (baseado em `.env.example`) com as chaves
   **públicas** do seu projeto Supabase:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
   ```
3. Rode em desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse http://localhost:3000

## 🗄️ Banco de dados

O schema completo (tabelas, enums, RLS, triggers, funções RPC e o bucket de
avatares) está em [`supabase/schema.sql`](supabase/schema.sql). Ele já está
aplicado no projeto Supabase usado pelo app.

Principais objetos:

- **profiles** — perfil do tenista (criado automaticamente no cadastro)
- **swipes** — likes/passes (trigger cria o match quando é recíproco)
- **matches** — par único de tenistas que se curtiram
- **messages** — mensagens do chat (Realtime habilitado)
- **get_discovery_profiles()** / **get_my_matches()** — funções RPC do app

## 🔒 Segurança

- Todas as tabelas com **RLS** — cada usuário só enxerga o que é seu ou dos
  seus matches.
- As chaves usadas no frontend são **publishable/anon** (seguras para o
  cliente). Nenhuma chave secreta fica no repositório.

## 📦 Deploy na Vercel

O projeto é um app Next.js padrão. Basta importar o repositório na Vercel e
definir as variáveis de ambiente `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. O build roda `next build` automaticamente.
