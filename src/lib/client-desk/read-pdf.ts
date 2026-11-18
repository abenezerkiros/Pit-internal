import { parseManifests, type PdfPage } from "./manifest";
export async function readBookingPdf(file: File) {
  if (!/\.pdf$/i.test(file.name)) throw Error("Choose a PDF file.");
  if (file.size > 20 * 1024 * 1024)
    throw Error("Choose a PDF smaller than 20 MB.");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100)
      throw Error("Please export a report of 100 pages or fewer.");
    const pages: PdfPage[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      pages.push(
        content.items.flatMap((item) =>
          "str" in item
            ? [{ str: item.str, x: item.transform[4], y: item.transform[5] }]
            : [],
        ),
      );
    }
    return parseManifests(pages);
  } finally {
    await task.destroy();
  }
}
