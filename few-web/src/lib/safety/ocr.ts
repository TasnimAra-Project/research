export async function readPictureText(image: File | string) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/tesseract-core-lstm.wasm.js",
    langPath: "/tesseract",
    gzip: true,
    workerBlobURL: false,
  });
  try {
    const result = await worker.recognize(image);
    return result.data.text.trim();
  } finally {
    const closing = worker;
    setTimeout(() => {
      void closing.terminate();
    }, 0);
  }
}
