# Conversa WhatsApp → Excel

Ferramenta web (100% no navegador, sem servidor) que converte o texto de uma
conversa de WhatsApp em uma planilha Excel.

## Como usar

Abra `index.html` no navegador (duplo clique no arquivo ou hospede a pasta
em qualquer servidor estático). Cole o texto da conversa e clique em
"Converter e gerar Excel" — o arquivo `.xlsx` é baixado automaticamente.

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
- `app.js` — parsing do texto e geração do Excel (usa a biblioteca SheetJS)
- `vendor/xlsx.full.min.js` — biblioteca SheetJS vendorizada (funciona offline)
