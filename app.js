(function () {
  "use strict";

  var EXAMPLE = [
    "*MANHÃ*",
    "",
    "7143- Caminho das Árvores ",
    "2294- Pituaçu ",
    "0574- Pituba ",
    "5281- Candeal ",
    "8810- Pituba ",
    "8448- Garcia ",
    "",
    "*NOITE*",
    "",
    "1436- Pituba ",
    "7862- Pituba",
    "0292- Pituba",
  ].join("\n");

  var PERIOD_KEYWORDS = /^(manh[aã]|tarde|noite|madrugada)$/i;
  var HEADER_LINE = /^\*+\s*(.+?)\s*\*+$/;
  var DATA_LINE = /^(\d+)\s*[-–—]\s*(.+)$/;

  function toTitleCase(str) {
    return str
      .toLowerCase()
      .split(/\s+/)
      .map(function (w) {
        return w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w;
      })
      .join(" ");
  }

  function parseConversation(text) {
    var lines = text.split(/\r?\n/);
    var currentPeriod = "";
    var rows = [];
    var skipped = [];

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;

      var headerMatch = line.match(HEADER_LINE);
      if (headerMatch) {
        currentPeriod = toTitleCase(headerMatch[1]);
        return;
      }

      var dataMatch = line.match(DATA_LINE);
      if (dataMatch) {
        rows.push({
          periodo: currentPeriod || "—",
          cotacao: dataMatch[1],
          bairro: dataMatch[2].trim(),
        });
        return;
      }

      if (PERIOD_KEYWORDS.test(line)) {
        currentPeriod = toTitleCase(line);
        return;
      }

      skipped.push(raw);
    });

    return { rows: rows, skipped: skipped };
  }

  function renderPreview(rows) {
    var body = document.getElementById("previewBody");
    var summary = document.getElementById("previewSummary");
    body.innerHTML = "";
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      [r.periodo, r.cotacao, r.bairro].forEach(function (val) {
        var td = document.createElement("td");
        td.textContent = val;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    summary.textContent = "Pré-visualização (" + rows.length + " linha" + (rows.length === 1 ? "" : "s") + ")";
    document.getElementById("previewCard").style.display = rows.length ? "block" : "none";
  }

  function buildWorkbook(rows) {
    var header = ["Manhã/Tarde", "Cotação", "Bairro"];
    var data = [header].concat(
      rows.map(function (r) {
        return [r.periodo, r.cotacao, r.bairro];
      })
    );
    var ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 26 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cotações");
    return wb;
  }

  function setStatus(message, type) {
    var el = document.getElementById("status");
    el.textContent = message;
    el.className = "status" + (type ? " " + type : "");
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function convert() {
    var text = document.getElementById("input").value;
    if (!text.trim()) {
      setStatus("Cole o texto da conversa antes de converter.", "error");
      return;
    }

    var result = parseConversation(text);
    if (!result.rows.length) {
      setStatus("Nenhuma linha no formato \"0000- Bairro\" foi encontrada.", "error");
      document.getElementById("previewCard").style.display = "none";
      return;
    }

    renderPreview(result.rows);

    var wb = buildWorkbook(result.rows);
    var now = new Date();
    var filename =
      "cotacoes_" +
      now.getFullYear() +
      "-" +
      pad(now.getMonth() + 1) +
      "-" +
      pad(now.getDate()) +
      "_" +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      ".xlsx";
    XLSX.writeFile(wb, filename);

    var msg = result.rows.length + " linha(s) convertida(s) e planilha baixada (" + filename + ").";
    if (result.skipped.length) {
      msg += " " + result.skipped.length + " linha(s) ignorada(s) por não seguir o formato esperado.";
    }
    setStatus(msg, "ok");
  }

  document.getElementById("convertBtn").addEventListener("click", convert);
  document.getElementById("exampleBtn").addEventListener("click", function () {
    document.getElementById("input").value = EXAMPLE;
    setStatus("", "");
  });
})();
