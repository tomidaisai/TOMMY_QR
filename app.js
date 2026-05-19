const CENTER_ART_MAX_SIZE = 240;
const QUIET_ZONE_MODULES = 4;
const QR_MODULE_SIZE = 24;
const MAX_OUTPUT_SIZE = 1280;
const ART_SRC = "assets/tommy04_monochrome.png";
const QR_DARK_COLOR = "#000000";

const state = {
  centerArt: new Image(),
  artReady: false,
  mode: "url",
};

const els = {
  urlMode: document.querySelector("#urlModeButton"),
  wifiMode: document.querySelector("#wifiModeButton"),
  urlFields: document.querySelector("#urlFields"),
  wifiFields: document.querySelector("#wifiFields"),
  url: document.querySelector("#urlInput"),
  ssid: document.querySelector("#ssidInput"),
  password: document.querySelector("#passwordInput"),
  security: document.querySelector("#securityInput"),
  hidden: document.querySelector("#hiddenInput"),
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

function escapeWifiValue(value) {
  return value.replace(/([\\;,":])/g, "\\$1");
}

function getQrText() {
  if (state.mode === "url") {
    return {
      text: els.url.value.trim(),
      emptyMessage: "URLを入力してください。",
      saveMessage: "URLを入力してから保存してください。",
    };
  }

  const ssid = els.ssid.value.trim();
  const security = els.security.value;
  const password = els.password.value;
  const hidden = els.hidden.checked ? "true" : "false";
  const passwordPart = security === "nopass" ? "" : `P:${escapeWifiValue(password)};`;

  return {
    text: ssid ? `WIFI:T:${security};S:${escapeWifiValue(ssid)};${passwordPart}H:${hidden};;` : "",
    emptyMessage: "SSIDを入力してください。",
    saveMessage: "SSIDを入力してから保存してください。",
  };
}

function setMode(mode) {
  state.mode = mode;
  const isWifi = mode === "wifi";

  els.urlFields.classList.toggle("hidden", isWifi);
  els.wifiFields.classList.toggle("hidden", !isWifi);
  els.urlMode.classList.toggle("active", !isWifi);
  els.wifiMode.classList.toggle("active", isWifi);
  els.urlMode.setAttribute("aria-pressed", String(!isWifi));
  els.wifiMode.setAttribute("aria-pressed", String(isWifi));
  render();
}

function getQrModel(text) {
  els.source.innerHTML = "";

  if (!window.QRCode) {
    throw new Error("QRコードライブラリを読み込めませんでした。ネットワーク接続を確認してください。");
  }

  const qr = new QRCode(els.source, {
    text,
    width: 1,
    height: 1,
    colorDark: QR_DARK_COLOR,
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  if (!qr._oQRCode) {
    throw new Error("QRコードのデータ取得に失敗しました。");
  }

  return qr._oQRCode;
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
    CENTER_ART_MAX_SIZE / state.centerArt.naturalWidth,
    CENTER_ART_MAX_SIZE / state.centerArt.naturalHeight,
    1,
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
    const artStatus = artSize ? `${artSize.width}x${artSize.height}px` : "読み込み中";
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
  setStatus("中央画像を読み込めませんでした。assets/tommy04_monochrome.png を確認してください。");
};

state.centerArt.src = ART_SRC;

els.url.addEventListener("input", debounce(render));
[els.ssid, els.password, els.security, els.hidden].forEach((el) => {
  el.addEventListener("input", debounce(render));
  el.addEventListener("change", render);
});
els.urlMode.addEventListener("click", () => setMode("url"));
els.wifiMode.addEventListener("click", () => setMode("wifi"));
els.download.addEventListener("click", downloadPng);
window.addEventListener("load", render);
