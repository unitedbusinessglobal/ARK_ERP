// Shared footer for Customer Bill / Sales Bill print views (AE-12): terms
// note + signature blocks.
export default function BillFooter({ settings, companyLabel = "For the Firm", partyLabel = "Party Signature" }) {
  return (
    <div className="mt-10">
      {settings?.footerNote && (
        <p className="text-xs text-gray-600 border-t pt-2 mb-8 whitespace-pre-line">
          {settings.footerNote}
        </p>
      )}
      {settings?.bankName && (
        <p className="text-xs text-gray-600 mb-8">
          Bank: {settings.bankName}
          {settings.bankAccountNo && ` · A/C: ${settings.bankAccountNo}`}
          {settings.bankIfsc && ` · IFSC: ${settings.bankIfsc}`}
        </p>
      )}
      <div className="flex justify-between text-sm pt-8">
        <div className="text-center">
          <div className="border-t border-gray-500 w-40 pt-1">{partyLabel}</div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-500 w-40 pt-1">
            {companyLabel}
            <br />
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
}
