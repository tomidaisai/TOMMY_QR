const CENTER_ART_DEFAULT_SIZE = 240;
const QUIET_ZONE_MODULES = 4;
const QR_MODULE_SIZE = 16;
const MAX_OUTPUT_SIZE = 1280;
const QR_DARK_COLOR = "#000000";
const QR_ERROR_CORRECTION_LEVEL = "H";
const CENTER_ART_PATTERNS = [
  { id: "pattern1", label: "パターン1", src: "assets/tommy04_monochrome.png" },
  // 画像を追加するときは、ここにsrcを設定してHTML側のdisabledを外す。
  { id: "pattern2", label: "パターン2", src: "assets/pixil-frame-0 (3).png" },
  { id: "pattern3", label: "パターン3", src: null },
  { id: "pattern4", label: "パターン4", src: null },
];

const state = {
  centerArt: new Image(),
  artReady: false,
  artPatternId: CENTER_ART_PATTERNS[0].id,
  centerArtSize: CENTER_ART_DEFAULT_SIZE,
  mode: "url",
};

const els = {
  urlMode: document.querySelector("#urlModeButton"),
  textMode: document.querySelector("#textModeButton"),
  urlFields: document.querySelector("#urlFields"),
  textFields: document.querySelector("#textFields"),
  url: document.querySelector("#urlInput"),
  text: document.querySelector("#textInput"),
  artPattern: document.querySelector("#artPatternInput"),
  artSize: document.querySelector("#artSizeInput"),
  artSizeValue: document.querySelector("#artSizeValue"),
  download: document.querySelector("#downloadButton"),
  canvas: document.querySelector("#qrCanvas"),
  source: document.querySelector("#qrSource"),
  status: document.querySelector("#statusText"),
};

const ctx = els.canvas.getContext("2d");

function debounce(fn, delay = 120) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function setStatus(message) {
  els.status.textContent = message;
}

function getArtPattern() {
  return CENTER_ART_PATTERNS.find(({ id }) => id === state.artPatternId) ?? CENTER_ART_PATTERNS[0];
}

function setArtPattern(patternId) {
  const pattern = CENTER_ART_PATTERNS.find(({ id }) => id === patternId);

  if (!pattern) {
    return;
  }

  state.artPatternId = pattern.id;
  state.artReady = false;

  if (!pattern.src) {
    render();
    setStatus(`${pattern.label}の画像はまだ登録されていません。`);
    return;
  }

  state.centerArt.src = pattern.src;
}

function getQrText() {
  if (state.mode === "url") {
    return {
      text: els.url.value.trim(),
      emptyMessage: "URLを入力してください。",
      saveMessage: "URLを入力してから保存してください。",
    };
  }

  return {
    text: els.text.value,
    emptyMessage: "文字列を入力してください。",
    saveMessage: "文字列を入力してから保存してください。",
  };
}

function setMode(mode) {
  state.mode = mode;
  const isText = mode === "text";

  els.urlFields.classList.toggle("hidden", isText);
  els.textFields.classList.toggle("hidden", !isText);
  els.urlMode.classList.toggle("active", !isText);
  els.textMode.classList.toggle("active", isText);
  els.urlMode.setAttribute("aria-pressed", String(!isText));
  els.textMode.setAttribute("aria-pressed", String(isText));
  render();
}

function getQrModel(text) {
  if (!window.QRCode) {
    throw new Error("QRコードライブラリを読み込めませんでした。ネットワーク接続を確認してください。");
  }

  for (let typeNumber = 1; typeNumber <= 40; typeNumber += 1) {
    els.source.innerHTML = "";

    try {
      const qr = new QRCode(els.source, {
        text,
        typeNumber,
        width: 1,
        height: 1,
        colorDark: QR_DARK_COLOR,
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel[QR_ERROR_CORRECTION_LEVEL],
      });

      if (!qr._oQRCode) {
        throw new Error("QRコードのデータ取得に失敗しました。");
      }

      return qr._oQRCode;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.startsWith("code length overflow")) {
        throw error;
      }
    }
  }

  throw new Error("文字列が長すぎます。短くしてからもう一度お試しください。");
}

function getCanvasSize(moduleCount) {
  const totalModules = moduleCount + QUIET_ZONE_MODULES * 2;
  const scale = Math.max(1, Math.floor(Math.min(QR_MODULE_SIZE, MAX_OUTPUT_SIZE / totalModules)));
  const size = totalModules * scale;

  return {
    scale,
    size,
    totalModules,
  };
}

function fillModule(x, y, scale) {
  ctx.fillRect(
    (x + QUIET_ZONE_MODULES) * scale,
    (y + QUIET_ZONE_MODULES) * scale,
    scale,
    scale,
  );
}

function drawQrModules(qrModel, scale, size) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = QR_DARK_COLOR;

  for (let row = 0; row < qrModel.moduleCount; row += 1) {
    for (let col = 0; col < qrModel.moduleCount; col += 1) {
      if (qrModel.isDark(row, col)) {
        fillModule(col, row, scale);
      }
    }
  }
}

function drawCenterArt(size) {
  if (!state.artReady) {
    return;
  }

  const ratio = Math.min(
    state.centerArtSize / state.centerArt.naturalWidth,
    state.centerArtSize / state.centerArt.naturalHeight,
  );
  const artWidth = Math.round(state.centerArt.naturalWidth * ratio);
  const artHeight = Math.round(state.centerArt.naturalHeight * ratio);
  const x = Math.floor((size - artWidth) / 2);
  const y = Math.floor((size - artHeight) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(state.centerArt, x, y, artWidth, artHeight);

  return {
    width: artWidth,
    height: artHeight,
  };
}

function render() {
  const qrInput = getQrText();

  if (!qrInput.text) {
    ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, els.canvas.width, els.canvas.height);
    setStatus(qrInput.emptyMessage);
    return;
  }

  try {
    const qrModel = getQrModel(qrInput.text);
    const { scale, size } = getCanvasSize(qrModel.moduleCount);

    els.canvas.width = size;
    els.canvas.height = size;
    drawQrModules(qrModel, scale, size);
    const artSize = drawCenterArt(size);
    const artStatus = artSize ? `${getArtPattern().label} ${artSize.width}x${artSize.height}px` : "読み込み中";
    setStatus(`出力 ${size}x${size}px / QR 1マス ${scale}px / 中央画像 ${artStatus}`);
  } catch (error) {
    setStatus(error.message);
  }
}

function downloadPng() {
  const qrInput = getQrText();

  if (!qrInput.text) {
    setStatus(qrInput.saveMessage);
    return;
  }

  render();

  const link = document.createElement("a");
  link.download = "tommy-qr.png";
  link.href = els.canvas.toDataURL("image/png");
  link.click();
}

state.centerArt.onload = () => {
  state.artReady = true;
  render();
};

state.centerArt.onerror = () => {
  state.artReady = false;
  setStatus(`${getArtPattern().label}の中央画像を読み込めませんでした。`);
};

state.centerArt.src = getArtPattern().src;

els.url.addEventListener("input", debounce(render));
els.text.addEventListener("input", debounce(render));
els.artPattern.addEventListener("change", (event) => setArtPattern(event.target.value));
els.artSize.addEventListener("input", (event) => {
  state.centerArtSize = Number(event.target.value);
  els.artSizeValue.value = `${state.centerArtSize}px`;
  els.artSizeValue.textContent = `${state.centerArtSize}px`;
  render();
});
els.urlMode.addEventListener("click", () => setMode("url"));
els.textMode.addEventListener("click", () => setMode("text"));
els.download.addEventListener("click", downloadPng);
window.addEventListener("load", render);
