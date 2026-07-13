// Shared letterhead for Customer Bill / Sales Bill print views (AE-12),
// standard Coimbatore commission-agent (aaratdar) format. Details come from
// admin-editable OrganizationSettings rather than being hardcoded.
export default function BillHeader({ settings, title, billNo, date }) {
  const addressParts = [
    settings?.addressLine1,
    settings?.addressLine2,
    [settings?.city, settings?.state, settings?.pincode].filter(Boolean).join(", "),
  ].filter(Boolean);

  return (
    <div className="border-b-2 border-black pb-3 mb-4">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold uppercase tracking-wide">
          {settings?.companyName || "ARK Plantain Mundy"}
        </h1>
        <p className="text-xs text-gray-700">Commission Agent — Plantain & Fruits</p>
        {addressParts.map((line) => (
          <p key={line} className="text-xs text-gray-700">
            {line}
          </p>
        ))}
        <p className="text-xs text-gray-700">
          {[settings?.phone && `Ph: ${settings.phone}`, settings?.email].filter(Boolean).join(" · ")}
        </p>
        <p className="text-xs text-gray-700">
          {[
            settings?.gstin && `GSTIN: ${settings.gstin}`,
            settings?.apmcLicenseNo && `APMC Licence: ${settings.apmcLicenseNo}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="flex justify-between items-end mt-3 pt-2 border-t">
        <h2 className="font-bold uppercase text-sm">{title}</h2>
        <div className="text-right text-sm">
          <div>
            Bill No: <span className="font-semibold">{billNo}</span>
          </div>
          <div>Date: {date}</div>
        </div>
      </div>
    </div>
  );
}
