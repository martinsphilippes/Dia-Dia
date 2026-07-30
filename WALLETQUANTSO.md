# WalletQuantso

Sistema de controle financeiro pessoal (Next.js + Firebase), com foco em uma
migração segura, íntegra e auditável dos dados do **Meu Dinheiro Web**.

> Este app é independente do app estático `Dia-Dia` que também existe neste
> repositório (`index.html`, `app.js`, `vendor/`). Eles não se relacionam.

## O que já está pronto

- **Importação calibrada ao Meu Dinheiro** — lê CSV/XLS/XLSX, detecta as
  colunas do layout oficial automaticamente, entende datas e valores no padrão
  brasileiro, classifica receita/despesa/transferência e usa o `Cartão` como
  conta quando `Conta` está vazia.
- **Pipeline seguro** — leitura → mapeamento → pré-visualização → gravação, com
  deduplicação, relatório do que foi importado/ignorado/rejeitado e **desfazer**.
- **Reconciliação** de transferências (par saída+entrada) e parcelamentos.
- **Dashboard** com filtros e totais; **gestão manual** de lançamentos.
- **Contas e saldos** (saldo inicial + movimentações = saldo atual).
- **Categorias** (criar, renomear, tipo, subcategorias, mesclar).
- **Relatórios** por categoria e mês, com gráficos (donut e saldo acumulado).
- **Exportação** CSV e impressão/PDF.
- **Auditoria** append-only e **isolamento por usuário** via regras do Firestore.

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 74 testes unitários
npm run build      # build de produção
```

As chaves do Firebase ficam em `.env.local` (já preenchidas para o projeto
`walletquantso`). Veja `.env.example` para a lista de variáveis.

## Configuração do Firebase (passo obrigatório — feito por você)

Estas ações exigem login na sua conta Google e **não podem ser feitas por um
agente remoto**. No [Firebase Console](https://console.firebase.google.com),
projeto **walletquantso**:

1. **Authentication → Sign-in method**: habilite **E-mail/senha** e **Google**.
2. **Firestore Database → Criar banco de dados** (modo de produção).

Depois, na sua máquina, publique as regras e índices (já versionados neste
repositório em `firestore.rules` e `firestore.indexes.json`):

```bash
npm install -g firebase-tools   # se ainda não tiver
firebase login                  # abre o navegador para autenticar
npm run deploy:firestore        # publica regras + índices no projeto walletquantso
```

O arquivo `.firebaserc` já aponta o projeto padrão para `walletquantso`, então
não é preciso informar o project id.

## Fluxo de migração recomendado

1. Em **Contas**, confira/edite o saldo inicial de cada conta.
2. Em **Importar**, envie o arquivo exportado do Meu Dinheiro, revise o
   mapeamento e a pré-visualização, ajuste a reconciliação e confirme.
3. Em **Lançamentos** e **Relatórios**, confira os dados. Em **Histórico**, é
   possível desfazer qualquer importação.

## Estrutura

```
app/                     Rotas (App Router): /, /dashboard, /accounts,
                         /categories, /import, /history, /reports
src/lib/                 Lógica pura e testada (parsing BR, importação,
                         reconciliação, relatórios, exportação)
src/services/            Acesso ao Firebase (auth, firestore, import, etc.)
src/components/          Componentes de UI compartilhados
firestore.rules          Regras de segurança (isolamento por usuário)
firestore.indexes.json   Índices compostos das queries
```
