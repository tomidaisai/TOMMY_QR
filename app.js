const state = {
  artImage: null,
  objectUrl: null,
};

const els = {
  url: document.querySelector("#urlInput"),
  art: document.querySelector("#artInput"),
  size: document.querySelector("#sizeInput"),
  pixel: document.querySelector("#pixelInput"),
  logoSize: document.querySelector("#logoSizeInput"),
  padding: document.querySelector("#paddingInput"),
  frame: document.querySelector("#frameInput"),
  round: document.querySelector("#roundInput"),
  download: document.querySelector("#downloadButton"),
  reset: document.querySelector("#resetButton"),
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

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawPixelArt(image, x, y, size, blockSize, rounded) {
  const buffer = document.createElement("canvas");
  const bufferCtx = buffer.getContext("2d", { willReadFrequently: true });
  const sourceSize = Math.max(10, Math.round(size / blockSize));

  buffer.width = sourceSize;
  buffer.height = sourceSize;
  bufferCtx.imageSmoothingEnabled = true;

  const crop = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = (image.naturalWidth - crop) / 2;
  const sy = (image.naturalHeight - crop) / 2;
  bufferCtx.drawImage(image, sx, sy, crop, crop, 0, 0, sourceSize, sourceSize);

  ctx.save();
  if (rounded) {
    roundedRect(ctx, x, y, size, size, Math.max(8, size * 0.12));
    ctx.clip();
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buffer, x, y, size, size);
  ctx.restore();
}

function generateQrElement(text, size) {
  els.source.innerHTML = "";

  if (!window.QRCode) {
    throw new Error("QRコードライブラリを読み込めませんでした。ネットワーク接続を確認してください。");
  }

  new QRCode(els.source, {
    text,
    width: size,
    height: size,
    colorDark: "#111827",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  const qrCanvas = els.source.querySelector("canvas");
  const qrImage = els.source.querySelector("img");
  return qrCanvas || qrImage;
}

function render() {
  const text = els.url.value.trim();
  const size = Number(els.size.value);

  els.canvas.width = size;
  els.canvas.height = size;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  if (!text) {
    setStatus("リンクを入力してください。");
    return;
  }

  try {
    const qr = generateQrElement(text, size);
    ctx.drawImage(qr, 0, 0, size, size);

    if (state.artImage) {
      const logoRatio = Number(els.logoSize.value) / 100;
      const padding = Number(els.padding.value);
      const artSize = Math.round(size * logoRatio);
      const boxSize = artSize + padding * 2;
      const boxX = Math.round((size - boxSize) / 2);
      const boxY = Math.round((size - boxSize) / 2);
      const artX = boxX + padding;
      const artY = boxY + padding;
      const radius = els.round.checked ? Math.round(boxSize * 0.12) : 0;

      if (els.frame.checked) {
        ctx.save();
        ctx.fillStyle = "#ffffff";
        roundedRect(ctx, boxX, boxY, boxSize, boxSize, radius);
        ctx.fill();
        ctx.restore();
      }

      drawPixelArt(state.artImage, artX, artY, artSize, Number(els.pixel.value), els.round.checked);
      setStatus("高補正QRで生成しました。保存前にスマホで読み取り確認してください。");
    } else {
      setStatus("イラストを追加すると中央にピクセルアートとして配置されます。");
    }
  } catch (error) {
    setStatus(error.message);
  }
}

function handleArtUpload(event) {
  const file = event.target.files?.[0];

  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = null;
  }

  if (!file) {
    state.artImage = null;
    render();
    return;
  }

  const image = new Image();
  state.objectUrl = URL.createObjectURL(file);
  image.onload = () => {
    state.artImage = image;
    render();
  };
  image.onerror = () => {
    state.artImage = null;
    setStatus("画像を読み込めませんでした。別のファイルを試してください。");
  };
  image.src = state.objectUrl;
}

function downloadPng() {
  const link = document.createElement("a");
  link.download = "tommy-qr.png";
  link.href = els.canvas.toDataURL("image/png");
  link.click();
}

function resetForm() {
  els.url.value = "https://example.com";
  els.art.value = "";
  els.size.value = "640";
  els.pixel.value = "12";
  els.logoSize.value = "22";
  els.padding.value = "12";
  els.frame.checked = true;
  els.round.checked = false;
  state.artImage = null;
  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = null;
  }
  render();
}

const scheduleRender = debounce(render);

[els.url, els.size, els.pixel, els.logoSize, els.padding, els.frame, els.round].forEach((el) => {
  el.addEventListener("input", scheduleRender);
  el.addEventListener("change", scheduleRender);
});

els.art.addEventListener("change", handleArtUpload);
els.download.addEventListener("click", downloadPng);
els.reset.addEventListener("click", resetForm);

window.addEventListener("load", render);
