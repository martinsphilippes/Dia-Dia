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

  var PERIOD_WORD = /(manh[aã]|tarde|noite|madrugada)/i;
  var HEADER_LINE = /^\*+\s*(.+?)\s*\*+$/;
  var LETTER = "A-Za-zÀ-ÖØ-öø-ÿ";
  // Tolerates a short OCR-noise token (misread icon/checkmark) before the digits, e.g. "D 2665- Candeal".
  var DATA_LINE = /^(?:\S{1,3}\s+)?(\d{2,6})\s*[-–—]\s*(.+)$/;
  var NAME_LINE = new RegExp(
    "^[^" + LETTER + "]*([" + LETTER + "][" + LETTER + "'.]*(?:\\s+[" + LETTER + "][" + LETTER + "'.]*)*)\\s*[-–—]\\s*(.+)$"
  );
  var SEM_NOTA_LINE = /^(?:\S{1,3}\s+)?(?:pedido\s+)?sem\s+notar?\s*[:\-]\s*(.+)$/i;
  var PHONE_PATTERN = /\+?\d[\d\s-]{8,14}\d/;
  var NAME_ONLY_LINE = new RegExp("^[A-ZÀ-Ö][a-zà-öø-ÿ'.]*(?:\\s+[A-ZÀ-Ö][a-zà-öø-ÿ'.]*){1,4}$");
  var TRAILING_NOISE = /\s*[\[\]()]*\s*\d{1,2}[:.]\d{2}\s*[»>]?\s*[A-Za-z]?\s*$/;

  var WEEKDAY_MAP = {
    domingo: 0,
    segunda: 1,
    "segunda-feira": 1,
    "segunda feira": 1,
    terca: 2,
    "terca-feira": 2,
    "terca feira": 2,
    quarta: 3,
    "quarta-feira": 3,
    "quarta feira": 3,
    quinta: 4,
    "quinta-feira": 4,
    "quinta feira": 4,
    sexta: 5,
    "sexta-feira": 5,
    "sexta feira": 5,
    sabado: 6,
  };

  function toTitleCase(str) {
    return str
      .toLowerCase()
      .split(/\s+/)
      .map(function (w) {
        return w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w;
      })
      .join(" ");
  }

  function normalizeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatDateBR(d) {
    return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + "/" + d.getFullYear();
  }

  function mostRecentPastWeekday(targetDow, today) {
    var d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var diff = (d.getDay() - targetDow + 7) % 7;
    if (diff === 0) diff = 7;
    d.setDate(d.getDate() - diff);
    return d;
  }

  var WEEKDAY_KEYS = Object.keys(WEEKDAY_MAP).sort(function (a, b) {
    return b.length - a.length;
  });

  function findDateInLine(line, today) {
    var normalized = normalizeAccents(line.toLowerCase());
    for (var i = 0; i < WEEKDAY_KEYS.length; i++) {
      var key = WEEKDAY_KEYS[i];
      var re = new RegExp("\\b" + key.replace(/\s+/g, "\\s+") + "\\b");
      if (re.test(normalized)) {
        return formatDateBR(mostRecentPastWeekday(WEEKDAY_MAP[key], today));
      }
    }
    if (/\bontem\b/.test(normalized)) {
      var y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      return formatDateBR(y);
    }
    if (/\bhoje\b/.test(normalized)) {
      return formatDateBR(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    }
    return null;
  }

  function findPeriodInLine(line) {
    var m = line.match(PERIOD_WORD);
    return m ? toTitleCase(m[1]) : null;
  }

  // Detects marker lines that name a day and/or a period (e.g. "sábado",
  // "NOITE", or a combined "Sábado noite"), updating whichever parts are
  // present. Returns true if the line was consumed as a marker.
  function applyDayAndPeriod(line, today, setDate, setPeriod) {
    var date = findDateInLine(line, today);
    var period = findPeriodInLine(line);
    if (date) setDate(date);
    if (period) setPeriod(period);
    return Boolean(date || period);
  }

  // True only when the whole line is made up of day-of-week/period words
  // (and separators like "-"/spaces) and nothing else -- e.g. "Segunda
  // feira", "Segunda-feira", "sábado", "NOITE", "Sábado noite". This lets
  // us treat those safely as markers *before* the Nome/Bairro parser runs,
  // without risking swallowing a real "Nome - Bairro" line that merely
  // contains a period word inside the bairro text.
  function isPureDayPeriodLine(line) {
    var remaining = normalizeAccents(line.toLowerCase());
    for (var i = 0; i < WEEKDAY_KEYS.length; i++) {
      var key = WEEKDAY_KEYS[i];
      var re = new RegExp("\\b" + key.replace(/\s+/g, "\\s+") + "\\b");
      if (re.test(remaining)) {
        remaining = remaining.replace(re, " ");
        break;
      }
    }
    remaining = remaining.replace(/\bontem\b/, " ").replace(/\bhoje\b/, " ");
    remaining = remaining.replace(PERIOD_WORD, " ");
    remaining = remaining.replace(/[-–—\s]+/g, "");
    return remaining.length === 0;
  }

  function stripTrailingNoise(bairro) {
    return bairro.replace(TRAILING_NOISE, "").trim();
  }

  function normalizePhone(raw) {
    var digits = raw.replace(/\D/g, "");
    if (/^55\d{10,11}$/.test(digits)) {
      var rest = digits.slice(2);
      var area = rest.slice(0, 2);
      var number = rest.slice(2);
      if (number.length === 9) {
        return "+55 " + area + " " + number.slice(0, 5) + "-" + number.slice(5);
      }
      if (number.length === 8) {
        return "+55 " + area + " " + number.slice(0, 4) + "-" + number.slice(4);
      }
    }
    if (digits.length >= 9) {
      return "+" + digits;
    }
    return "";
  }

  function matchSenderLine(line) {
    var stripped = line.replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ+0-9]+/, "").trim();
    if (!stripped) return null;
    var phoneMatch = stripped.match(PHONE_PATTERN);
    if (phoneMatch) {
      var phone = normalizePhone(phoneMatch[0]);
      if (phone) return { phone: phone };
    }
    if (NAME_ONLY_LINE.test(stripped)) {
      return { phone: "" };
    }
    return null;
  }

  function parseConversation(text, today) {
    today = today || new Date();
    var lines = text.split(/\r?\n/);
    var currentPeriod = "";
    var currentDate = "";
    var currentPhone = "";
    var rows = [];
    var skipped = [];

    function pushRow(cotacao, bairro) {
      rows.push({
        periodo: currentPeriod || "—",
        cotacao: cotacao,
        bairro: stripTrailingNoise(bairro),
        telefone: currentPhone,
        dia: currentDate,
      });
    }

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;

      var headerMatch = line.match(HEADER_LINE);
      if (headerMatch) {
        var inner = headerMatch[1];
        var consumedHeader = applyDayAndPeriod(
          inner,
          today,
          function (d) {
            currentDate = d;
          },
          function (p) {
            currentPeriod = p;
          }
        );
        if (!consumedHeader) {
          currentPeriod = toTitleCase(inner);
        }
        return;
      }

      var semNotaMatch = line.match(SEM_NOTA_LINE);
      if (semNotaMatch) {
        pushRow("Sem nota", semNotaMatch[1]);
        return;
      }

      var dataMatch = line.match(DATA_LINE);
      if (dataMatch) {
        pushRow(dataMatch[1], dataMatch[2]);
        return;
      }

      // Checked before Nome/Bairro so a hyphenated weekday like
      // "Segunda-feira" isn't split into a fake "Segunda" / "feira" row.
      if (isPureDayPeriodLine(line)) {
        applyDayAndPeriod(
          line,
          today,
          function (d) {
            currentDate = d;
          },
          function (p) {
            currentPeriod = p;
          }
        );
        return;
      }

      var nameMatch = line.match(NAME_LINE);
      if (nameMatch) {
        pushRow(nameMatch[1].trim(), nameMatch[2]);
        return;
      }

      var senderMatch = matchSenderLine(line);
      if (senderMatch) {
        currentPhone = senderMatch.phone;
        return;
      }

      skipped.push(raw);
    });

    return { rows: rows, skipped: skipped };
  }

  var lastRows = [];

  var COLUMNS = ["Manhã/Tarde", "Cotação", "Bairro", "Telefone", "Dia"];

  function rowValues(r) {
    return [r.periodo, r.cotacao, r.bairro, r.telefone, r.dia];
  }

  function renderPreview(rows) {
    lastRows = rows;
    var body = document.getElementById("previewBody");
    var summary = document.getElementById("previewSummary");
    body.innerHTML = "";
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      rowValues(r).forEach(function (val) {
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
    var lines = [COLUMNS.join("\t")].concat(
      rows.map(function (r) {
        return rowValues(r).join("\t");
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
    var thead = "<tr>" + COLUMNS.map(function (h) { return "<th>" + escapeHtml(h) + "</th>"; }).join("") + "</tr>";
    var tbody = rows
      .map(function (r) {
        return (
          "<tr>" +
          rowValues(r).map(function (v) { return "<td>" + escapeHtml(v) + "</td>"; }).join("") +
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
    var data = [COLUMNS].concat(rows.map(rowValues));
    var ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 18 }, { wch: 12 }];
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
