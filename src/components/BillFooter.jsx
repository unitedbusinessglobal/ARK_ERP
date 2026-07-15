// Shared footer for Customer Bill / Sales Bill print views (AE-12): terms
// note + signature blocks. companyLabel/partyLabel are passed in already
// translated by the caller.
import { useLanguage } from "../lib/i18n.jsx";

export default function BillFooter({ settings, companyLabel = "For the Firm", partyLabel = "Party Signature" }) {
  const { t } = useLanguage();
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
      {/* AE-14: stack signature blocks on narrow screens instead of a fixed
          160px-wide flex row, which overflowed the viewport on mobile. */}
      <div className="flex flex-col sm:flex-row justify-between gap-6 sm:gap-0 text-sm pt-8">
        <div className="text-center sm:text-center">
          <div className="border-t border-gray-500 w-full sm:w-40 pt-1 mx-auto">{partyLabel}</div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-500 w-full sm:w-40 pt-1 mx-auto">
            {companyLabel}
            <br />
            {t("bill.authorizedSignatory", "Authorized Signatory")}
          </div>
        </div>
      </div>
    </div>
  );
}
