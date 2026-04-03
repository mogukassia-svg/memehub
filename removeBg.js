/**
 * 浏览器端抠图：动态加载 @imgly/background-removal（ONNX，首次需从 CDN 下载模型）。
 * 需在可访问 cdn.jsdelivr.net 的网络环境下使用。
 */
const IMGLY_VER = "1.5.7";
const PUBLIC_PATH = `https://cdn.jsdelivr.net/npm/@imgly/background-removal@${IMGLY_VER}/dist/`;

/**
 * @param {HTMLImageElement} imageElement
 * @param {(key: string, current: number, total: number) => void} [onProgress]
 * @returns {Promise<Blob>}
 */
export async function removeSubjectBackground(imageElement, onProgress) {
  const { removeBackground } = await import(
    `https://cdn.jsdelivr.net/npm/@imgly/background-removal@${IMGLY_VER}/+esm`,
  );
  return removeBackground(imageElement, {
    publicPath: PUBLIC_PATH,
    model: "isnet_quint8",
    output: { format: "image/png" },
    progress: onProgress
      ? (key, current, total) => {
          onProgress(key, current, total);
        }
      : undefined,
  });
}
