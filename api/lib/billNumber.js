// Bill numbering: daily-reset sequence, e.g. CB-20260708-0001 (architecture §4/§10).
// BILL_NUMBERING_MODE=continuous switches to a non-resetting global counter if the
// business later decides against daily reset — only this file changes.

function formatDate(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export async function nextBillNumber(prisma, { prefix, date, model }) {
  const mode = process.env.BILL_NUMBERING_MODE || "daily-reset";
  const dateStr = formatDate(date);
  const searchPrefix = mode === "daily-reset" ? `${prefix}-${dateStr}-` : `${prefix}-`;

  const last = await model.findFirst({
    where: { billNo: { startsWith: searchPrefix } },
    orderBy: { billNo: "desc" },
  });

  let nextSeq = 1;
  if (last) {
    const parts = last.billNo.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  const seqStr = String(nextSeq).padStart(4, "0");
  return mode === "daily-reset" ? `${prefix}-${dateStr}-${seqStr}` : `${prefix}-${seqStr}`;
}
