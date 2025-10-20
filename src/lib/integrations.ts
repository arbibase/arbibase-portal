export async function postToGHL(type: "owner" | "operator" | "coach" | "request", payload: any) {
  const url =
    type === "owner"
      ? process.env.GHL_WEBHOOK_OWNER
      : type === "operator"
      ? process.env.GHL_WEBHOOK_OPERATOR
      : type === "coach"
      ? process.env.GHL_WEBHOOK_COACH
      : process.env.GHL_WEBHOOK_REQUEST;

  if (!url) throw new Error(`Missing webhook for type ${type}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL error ${res.status}: ${text}`);
  }
  return true;
}

export async function postToSheetBest(payload: any) {
  const sheetUrl = process.env.SHEETBEST_URL!;
  if (!sheetUrl) throw new Error("Missing SHEETBEST_URL");
  const res = await fetch(sheetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SheetBest error ${res.status}: ${text}`);
  }
  return true;
}
