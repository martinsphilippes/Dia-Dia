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
  var LETTER = "A-Za-zÀ-ÖØ-öø-ÿ";
  var NAME_LINE = new RegExp(
    "^[^" + LETTER + "]*([" + LETTER + "][" + LETTER + "'.]*(?:\\s+[" + LETTER + "][" + LETTER + "'.]*)*)\\s*[-–—]\\s*(.+)$"
  );

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

      var nameMatch = line.match(NAME_LINE);
      if (nameMatch) {
        rows.push({
          periodo: currentPeriod || "—",
          cotacao: nameMatch[1].trim(),
          bairro: nameMatch[2].trim(),
        });
        return;
      }

      skipped.push(raw);
    });

    return { rows: rows, skipped: skipped };
  }

  var lastRows = [];

  function renderPreview(rows) {
    lastRows = rows;
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

  function previewToText(rows) {
    var header = ["Manhã/Tarde", "Cotação", "Bairro"];
    var lines = [header.join("\t")].concat(
      rows.map(function (r) {
        return [r.periodo, r.cotacao, r.bairro].join("\t");
      })
    );
    return lines.join("\n");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function previewToHtml(rows) {
    var header = ["Manhã/Tarde", "Cotação", "Bairro"];
    var thead = "<tr>" + header.map(function (h) { return "<th>" + escapeHtml(h) + "</th>"; }).join("") + "</tr>";
    var tbody = rows
      .map(function (r) {
        return (
          "<tr>" +
          [r.periodo, r.cotacao, r.bairro].map(function (v) { return "<td>" + escapeHtml(v) + "</td>"; }).join("") +
          "</tr>"
        );
      })
      .join("");
    return "<table>" + thead + tbody + "</table>";
  }

  function fallbackExecCommandCopy(text, done) {
    var temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "");
    temp.style.position = "fixed";
    temp.style.top = "0";
    temp.style.left = "0";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    try {
      temp.setSelectionRange(0, text.length);
    } catch (e) {
      // some browsers don't support setSelectionRange on textarea in this context
    }
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(temp);
    done(ok);
  }

  function copyPreview() {
    if (!lastRows.length) return;
    var text = previewToText(lastRows);
    var html = previewToHtml(lastRows);
    var el = document.getElementById("copyStatus");

    function done(ok) {
      el.textContent = ok ? "Copiado!" : "Não foi possível copiar automaticamente. Selecione a tabela e copie manualmente.";
      el.className = "status" + (ok ? " ok" : " error");
      setTimeout(
        function () {
          el.textContent = "";
          el.className = "status";
        },
        ok ? 2000 : 5000
      );
    }

    function tryWriteText() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () {
            done(true);
          },
          function () {
            fallbackExecCommandCopy(text, done);
          }
        );
      } else {
        fallbackExecCommandCopy(text, done);
      }
    }

    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      try {
        var item = new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        });
        navigator.clipboard.write([item]).then(function () {
          done(true);
        }, tryWriteText);
        return;
      } catch (e) {
        // ClipboardItem construction failed (unsupported types); fall through
      }
    }

    tryWriteText();
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
  document.getElementById("copyBtn").addEventListener("click", copyPreview);

  // ---- Tabs ----
  function activateTab(name) {
    document.querySelectorAll(".tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.tab === name);
    });
    document.getElementById("panelText").classList.toggle("active", name === "text");
    document.getElementById("panelImage").classList.toggle("active", name === "image");
  }

  document.getElementById("tabTextBtn").addEventListener("click", function () {
    activateTab("text");
  });
  document.getElementById("tabImageBtn").addEventListener("click", function () {
    activateTab("image");
  });

  // ---- Image / file extraction ----
  var TESSERACT_BASE = "vendor/tesseract";
  var selectedFiles = [];

  function readTextFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result));
      };
      reader.onerror = function () {
        reject(reader.error);
      };
      reader.readAsText(file);
    });
  }

  function isImageFile(file) {
    return file.type.indexOf("image/") === 0;
  }

  function renderFileList() {
    var list = document.getElementById("fileList");
    list.innerHTML = "";
    selectedFiles.forEach(function (entry) {
      var row = document.createElement("div");
      row.className = "file-row";
      var name = document.createElement("span");
      name.className = "name";
      name.textContent = entry.file.name;
      var state = document.createElement("span");
      state.className = "state";
      state.textContent = entry.stateText || "Aguardando";
      entry.stateEl = state;
      row.appendChild(name);
      row.appendChild(state);
      list.appendChild(row);
    });
  }

  document.getElementById("fileInput").addEventListener("change", function (e) {
    selectedFiles = Array.prototype.slice.call(e.target.files).map(function (file) {
      return { file: file, stateText: "Aguardando" };
    });
    renderFileList();
    document.getElementById("extractStatus").textContent = "";
  });

  function setExtractStatus(message, type) {
    var el = document.getElementById("extractStatus");
    el.textContent = message;
    el.className = "status" + (type ? " " + type : "");
  }

  function updateFileState(entry, text, type) {
    entry.stateText = text;
    if (entry.stateEl) {
      entry.stateEl.textContent = text;
      entry.stateEl.className = "state" + (type ? " " + type : "");
    }
  }

  async function extractAll() {
    if (!selectedFiles.length) {
      setExtractStatus("Selecione ao menos uma imagem ou arquivo.", "error");
      return;
    }

    var extractBtn = document.getElementById("extractBtn");
    extractBtn.disabled = true;
    setExtractStatus("Processando...", "");

    var worker = null;
    var hasImages = selectedFiles.some(function (entry) {
      return isImageFile(entry.file);
    });

    try {
      if (hasImages) {
        setExtractStatus("Carregando reconhecimento de texto (primeira vez pode demorar um pouco)...", "");
        worker = await Tesseract.createWorker("por", 1, {
          workerPath: TESSERACT_BASE + "/worker.min.js",
          corePath: TESSERACT_BASE,
          langPath: TESSERACT_BASE,
          gzip: true,
        });
      }

      var texts = [];
      for (var i = 0; i < selectedFiles.length; i++) {
        var entry = selectedFiles[i];
        updateFileState(entry, "Processando...", "");
        setExtractStatus("Processando " + (i + 1) + " de " + selectedFiles.length + "...", "");
        try {
          if (isImageFile(entry.file)) {
            var result = await worker.recognize(entry.file);
            var text = result.data.text || "";
            texts.push(text);
            var lineCount = text.split(/\r?\n/).filter(function (l) {
              return l.trim();
            }).length;
            updateFileState(entry, "OK (" + lineCount + " linha" + (lineCount === 1 ? "" : "s") + ")", "ok");
          } else {
            var fileText = await readTextFile(entry.file);
            texts.push(fileText);
            updateFileState(entry, "OK", "ok");
          }
        } catch (fileErr) {
          updateFileState(entry, "Erro ao processar", "error");
        }
      }

      if (worker) {
        await worker.terminate();
      }

      var combined = texts.join("\n\n").trim();
      if (!combined) {
        setExtractStatus("Não foi possível extrair texto de nenhum arquivo.", "error");
        return;
      }

      var input = document.getElementById("input");
      input.value = combined;
      activateTab("text");
      setStatus("Texto extraído. Revise abaixo e clique em \"Converter e gerar Excel\".", "ok");
      setExtractStatus("", "");
    } catch (err) {
      setExtractStatus("Erro ao processar: " + (err && err.message ? err.message : err), "error");
    } finally {
      extractBtn.disabled = false;
    }
  }

  document.getElementById("extractBtn").addEventListener("click", extractAll);
})();
