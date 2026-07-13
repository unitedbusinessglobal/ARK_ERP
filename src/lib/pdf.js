// Client-side "Download PDF" for bill print views (AE-14). Renders the same
// DOM the browser already shows (letterhead, itemized table, signatures)
// to a canvas, then paginates it into a multi-page A4 PDF. Both libraries
// are dynamically imported so they never bloat the main app bundle -- only
// loaded the first time someone actually clicks Download.
export async function downloadElementAsPdf(element, filename) {
  if (!element) return;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
