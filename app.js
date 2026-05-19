const CENTER_ART_SIZE = 180;
const QUIET_ZONE_MODULES = 4;
const OUTPUT_SIZE = 512;
const MAX_OUTPUT_SIZE = 960;
const ART_SRC = "assets/pixel_tommy01.png";

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
    colorDark: "#111827",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  if (!qr._oQRCode) {
    throw new Error("QRコードのデータ取得に失敗しました。");
  }

  return qr._oQRCode;
}

function getCanvasSize(moduleCount, requestedSize) {
  const totalModules = moduleCount + QUIET_ZONE_MODULES * 2;
  const size = Math.min(requestedSize, MAX_OUTPUT_SIZE);
  const scale = size / totalModules;

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
  ctx.fillStyle = "#111827";

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

  const x = Math.floor((size - CENTER_ART_SIZE) / 2);
  const y = Math.floor((size - CENTER_ART_SIZE) / 2);
  const crop = Math.min(state.centerArt.naturalWidth, state.centerArt.naturalHeight);
  const sx = Math.floor((state.centerArt.naturalWidth - crop) / 2);
  const sy = Math.floor((state.centerArt.naturalHeight - crop) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(state.centerArt, sx, sy, crop, crop, x, y, CENTER_ART_SIZE, CENTER_ART_SIZE);
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
    const { scale, size } = getCanvasSize(qrModel.moduleCount, OUTPUT_SIZE);

    els.canvas.width = size;
    els.canvas.height = size;
    drawQrModules(qrModel, scale, size);
    drawCenterArt(size);
    setStatus(`出力 ${size}x${size}px / QR 1マス ${scale.toFixed(2)}px / 中央画像 ${CENTER_ART_SIZE}x${CENTER_ART_SIZE}px`);
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
  setStatus("中央画像を読み込めませんでした。assets/pixel_tommy01.png を確認してください。");
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
