# Conversa WhatsApp → Excel

Ferramenta web (100% no navegador, sem servidor) que converte o texto de uma
conversa de WhatsApp em uma planilha Excel.

## Como usar

Abra `index.html` no navegador (duplo clique no arquivo ou hospede a pasta
em qualquer servidor estático). Há duas abas:

- **Colar texto** — cole o texto da conversa e clique em "Converter e gerar
  Excel" — o arquivo `.xlsx` é baixado automaticamente.
- **Enviar imagens/arquivos** — envie fotos, prints de tela ou um arquivo
  `.txt` exportado do WhatsApp. O texto é extraído por reconhecimento óptico
  (OCR, rodando localmente no navegador — nada é enviado para servidor
  nenhum) e colocado na aba "Colar texto" para revisão antes de converter.

## Formato de entrada esperado

```
*MANHÃ*

7143- Caminho das Árvores
2294- Pituaçu
0574- Pituba

*NOITE*

1436- Pituba
7862- Pituba
```

- Linhas entre asteriscos (`*MANHÃ*`, `*NOITE*`, `*TARDE*`, ...) marcam o
  período e valem para todas as linhas seguintes até o próximo cabeçalho.
- Linhas no formato `NÚMERO- BAIRRO` viram uma linha da planilha.

Também é aceito um formato alternativo sem números, com o nome do
cliente no lugar da cotação:

```
Isabela - Ondina
Elaine - Ondina
Ney - Barra
Maurício - Graça
```

- Linhas no formato `NOME - BAIRRO` viram uma linha da planilha, com o
  nome do cliente na coluna Cotação.
- Qualquer caractere antes do nome (`*`, `-`, `•`, etc.) é ignorado.
- Se não houver cabeçalho de período (`*MANHÃ*`/`*NOITE*`) nesse formato,
  a coluna Manhã/Tarde fica com `—`.

## Planilha gerada

| Manhã/Tarde | Cotação | Bairro |
|---|---|---|
| Manhã | 7143 | Caminho das Árvores |
| Manhã | 2294 | Pituaçu |
| Manhã | 0574 | Pituba |
| Noite | 1436 | Pituba |
| Noite | 7862 | Pituba |

Os números da cotação são mantidos como texto para preservar zeros à
esquerda (ex.: `0574`).

## Arquivos

- `index.html` — interface
- `app.js` — parsing do texto, OCR de imagens e geração do Excel
- `vendor/xlsx.full.min.js` — biblioteca SheetJS vendorizada (funciona offline)
- `vendor/tesseract/` — Tesseract.js e dados de idioma (português) vendorizados
  para OCR funcionar offline, sem depender de nenhum CDN
