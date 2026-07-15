// Minimal seed data to make Phase 1 usable out of the box.
// Run with: npm run prisma:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("changeme123", 10);

  await prisma.user.upsert({
    where: { email: "admin@arkplantainmundy.local" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@arkplantainmundy.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  // AE-24: Tamil names for the seeded plantain/stock types. Nendran and
  // Poovan are Tamil-origin variety names already in common market use;
  // Robusta is transliterated (no distinct Tamil name); Red Banana uses
  // the market term "Sevvazhai" rather than a literal translation.
  // Fill-if-blank only -- never overwrites a nameTa an admin has already
  // set via the Masters page.
  const plantainTypes = [
    { code: "NENDRAN", nameEn: "Nendran", nameTa: "நேந்திரன்" },
    { code: "ROBUSTA", nameEn: "Robusta", nameTa: "ரோபஸ்தா" },
    { code: "POOVAN", nameEn: "Poovan", nameTa: "பூவன்" },
    { code: "RED_BANANA", nameEn: "Red Banana", nameTa: "செவ்வாழை" },
  ];
  for (const pt of plantainTypes) {
    const existing = await prisma.plantainType.findUnique({ where: { code: pt.code } });
    if (!existing) {
      await prisma.plantainType.create({ data: { code: pt.code, nameEn: pt.nameEn, nameTa: pt.nameTa } });
    } else if (!existing.nameTa) {
      await prisma.plantainType.update({ where: { code: pt.code }, data: { nameTa: pt.nameTa } });
    }
  }

  const stockTypes = [
    { code: "BUNCH", nameEn: "Bunch", nameTa: "குலை" },
    { code: "HAND", nameEn: "Hand", nameTa: "சீப்பு" },
    { code: "BOX", nameEn: "Box", nameTa: "பெட்டி" },
  ];
  for (const st of stockTypes) {
    const existing = await prisma.stockType.findUnique({ where: { code: st.code } });
    if (!existing) {
      await prisma.stockType.create({ data: { code: st.code, nameEn: st.nameEn, nameTa: st.nameTa } });
    } else if (!existing.nameTa) {
      await prisma.stockType.update({ where: { code: st.code }, data: { nameTa: st.nameTa } });
    }
  }

  // Starter customers and farmers/agents (AE-11) -- without these the
  // Auction Entry dropdowns are empty on first run and submitting the form
  // fails validation with no clue why. `initials` is unique on Customer so
  // it upserts cleanly; FarmerAgent has no unique field, so guard with a
  // findFirst check to stay idempotent on repeat seed runs.
  const customers = [
    { name: "Sample Traders", initials: "ST" },
    { name: "City Wholesale", initials: "CW" },
  ];
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { initials: c.initials },
      update: {},
      create: c,
    });
  }

  const farmersAgents = [{ name: "Sample Farmer", phone: null }];
  for (const fa of farmersAgents) {
    const existing = await prisma.farmerAgent.findFirst({ where: { name: fa.name } });
    if (!existing) {
      await prisma.farmerAgent.create({ data: fa });
    }
  }

  // Bilingual Label Dictionary (AE-19/AE-20) -- seeded directly from the
  // real BRD "ARK_Plantain_Mundy_Billing_Application_BRD_Bilingual_Tamil_English.docx"
  // §12 (Bilingual Label Dictionary) and §13 (Updated Bilingual Templates),
  // per the user's explicit instruction: "use it as a base initial txt and
  // the user can change it later". These EN/TA pairs are a starting point,
  // not a hardcoded bundle -- ADMIN can edit any of them from the
  // Translations settings page (labels.js PUT), and the change takes effect
  // immediately without a deploy.
  //
  // Bill/report domain labels: BRD gives both EN and TA text, so seed both.
  const brdLabels = [
    // §12 core dictionary
    { key: "label.customerBill", en: "Customer Bill", ta: "வாடிக்கையாளர் ரசீது" },
    { key: "label.salesBill", en: "Farmer / Agent Sales Bill", ta: "விவசாயி / முகவர் விற்பனை ரசீது" },
    { key: "label.dayWiseReport", en: "Day-wise Customer Report", ta: "நாள் வாரியான வாடிக்கையாளர் அறிக்கை" },
    { key: "label.date", en: "Date", ta: "தேதி" },
    { key: "label.customerName", en: "Customer Name", ta: "வாடிக்கையாளர் பெயர்" },
    { key: "label.customerInitials", en: "Customer Initials", ta: "வாடிக்கையாளர் குறியீடு" },
    { key: "label.farmerAgentName", en: "Farmer / Agent Name", ta: "விவசாயி / முகவர் பெயர்" },
    { key: "label.vehicleReference", en: "Vehicle Reference", ta: "வாகன குறிப்பு" },
    { key: "label.plantainType", en: "Plantain Type", ta: "வாழைக்காய் வகை" },
    { key: "label.quantity", en: "Quantity", ta: "அளவு" },
    { key: "label.rate", en: "Rate", ta: "விலை" },
    { key: "label.amount", en: "Amount", ta: "தொகை" },
    { key: "label.commission", en: "Commission", ta: "கமிஷன்" },
    { key: "label.vehicleFare", en: "Vehicle Fare", ta: "வாகன வாடகை" },
    { key: "label.totalQuantity", en: "Total Quantity", ta: "மொத்த அளவு" },
    { key: "label.totalAmount", en: "Total Amount", ta: "மொத்த தொகை" },
    { key: "label.netPayableAmount", en: "Net Payable Amount", ta: "வழங்க வேண்டிய தொகை" },
    // §13 template-only labels not repeated in §12
    { key: "label.billNo", en: "Bill No.", ta: "ரசீது எண்" },
    { key: "label.subtotal", en: "Subtotal", ta: "துணை மொத்தம்" },
    { key: "label.grandTotal", en: "Grand Total", ta: "மொத்த தொகை" },
    { key: "label.salesBillNo", en: "Sales Bill No.", ta: "விற்பனை ரசீது எண்" },
    { key: "label.vehicleArrivalDate", en: "Vehicle Arrival Date", ta: "வாகன வருகை தேதி" },
    { key: "label.salePeriod", en: "Sale Period", ta: "விற்பனை காலம்" },
    { key: "label.auctionDate", en: "Auction Date", ta: "ஏலம் தேதி" },
    { key: "label.grossSalesAmount", en: "Gross Sales Amount", ta: "மொத்த விற்பனை தொகை" },
    { key: "label.lessCommission", en: "Less: Commission", ta: "கழிக்க: கமிஷன்" },
    { key: "label.lessVehicleFare", en: "Less: Vehicle Fare", ta: "கழிக்க: வாகன வாடகை" },
    { key: "label.reportDate", en: "Report Date", ta: "அறிக்கை தேதி" },
    { key: "label.generatedOn", en: "Generated On", ta: "உருவாக்கிய தேதி" },
    { key: "label.generatedBy", en: "Generated By", ta: "உருவாக்கியவர்" },
    { key: "label.language", en: "Language", ta: "மொழி" },
  ];

  for (const l of brdLabels) {
    await prisma.labelI18n.upsert({
      where: { labelKey_lang: { labelKey: l.key, lang: "EN" } },
      update: {},
      create: { labelKey: l.key, lang: "EN", labelText: l.en },
    });
    await prisma.labelI18n.upsert({
      where: { labelKey_lang: { labelKey: l.key, lang: "TA" } },
      update: {},
      create: { labelKey: l.key, lang: "TA", labelText: l.ta },
    });
  }

  // UI chrome (nav/actions) -- the BRD's dictionary only covers bill/report
  // domain terms, not app navigation. First pass seeded these TA-blank
  // (falls back to English); draft Tamil added here as a starting point --
  // NOT sourced from the BRD, so treat it as a placeholder the business
  // should review/correct from the Translations page, not final wording.
  const chromeLabels = [
    { key: "nav.appTitle", en: "ARK Plantain Mundy", ta: "ARK பிளாண்டைன் மண்டி" },
    { key: "nav.auctionEntry", en: "Auction Entry", ta: "ஏலப் பதிவு" },
    { key: "nav.customerBill", en: "Customer Bill", ta: "வாடிக்கையாளர் ரசீது" },
    { key: "nav.salesBill", en: "Sales Bill", ta: "விற்பனை ரசீது" },
    { key: "nav.reports", en: "Reports", ta: "அறிக்கைகள்" },
    { key: "nav.masters", en: "Masters", ta: "மாஸ்டர் தரவு" },
    { key: "nav.settings", en: "Settings", ta: "அமைப்புகள்" },
    { key: "nav.translations", en: "Translations", ta: "மொழிபெயர்ப்புகள்" },
    { key: "nav.logout", en: "Logout", ta: "வெளியேறு" },
    { key: "nav.menu", en: "Menu", ta: "மெனு" },
    { key: "nav.close", en: "Close", ta: "மூடு" },
  ];

  for (const l of chromeLabels) {
    await prisma.labelI18n.upsert({
      where: { labelKey_lang: { labelKey: l.key, lang: "EN" } },
      update: {},
      create: { labelKey: l.key, lang: "EN", labelText: l.en },
    });
    // Only fill TA in if it's missing or still blank -- never overwrite
    // wording the admin has already edited via the Translations page.
    const existingTa = await prisma.labelI18n.findUnique({
      where: { labelKey_lang: { labelKey: l.key, lang: "TA" } },
    });
    if (!existingTa) {
      await prisma.labelI18n.create({
        data: { labelKey: l.key, lang: "TA", labelText: l.ta },
      });
    } else if (existingTa.labelText === "") {
      await prisma.labelI18n.update({
        where: { labelKey_lang: { labelKey: l.key, lang: "TA" } },
        data: { labelText: l.ta },
      });
    }
  }

  // Individual-screen bilingual labels (AE-23) -- follow-on to AE-19/AE-20
  // once the business found only the nav bar was actually reading from the
  // toggle. Same rule as chromeLabels: not BRD-sourced, draft Tamil for
  // review via the Translations page, only fills in if EN row is new or TA
  // is currently blank (never overwrites an admin edit).
  const appLabels = [
    // Actions / buttons (shared across screens)
    { key: "action.print", en: "Print", ta: "அச்சிடு" },
    { key: "action.downloadPdf", en: "Download PDF", ta: "PDF பதிவிறக்கம்" },
    { key: "action.cancel", en: "Cancel", ta: "ரத்து செய்" },
    { key: "action.save", en: "Save", ta: "சேமி" },
    { key: "action.add", en: "Add", ta: "சேர்" },
    { key: "action.addVehicle", en: "Add Vehicle", ta: "வாகனம் சேர்" },
    { key: "action.generateBill", en: "Generate Bill", ta: "ரசீது உருவாக்கு" },
    { key: "action.generateSalesBill", en: "Generate Sales Bill", ta: "விற்பனை ரசீது உருவாக்கு" },
    { key: "action.saveAuctionEntry", en: "Save Auction Entry", ta: "ஏலப் பதிவை சேமி" },
    { key: "action.saveSettings", en: "Save Settings", ta: "அமைப்புகளை சேமி" },
    { key: "action.backToHistory", en: "Back to Generate / History", ta: "உருவாக்கம் / வரலாற்றுக்கு திரும்பு" },
    { key: "action.view", en: "View", ta: "காண்க" },
    { key: "action.addSaleLine", en: "+ Add sale line", ta: "+ விற்பனை வரி சேர்" },
    { key: "action.addFarmerAgent", en: "+ Add new Farmer/Agent…", ta: "+ புதிய விவசாயி/முகவரைச் சேர்…" },
    { key: "action.addPlantainType", en: "+ Add new Plantain Type…", ta: "+ புதிய வாழைக்காய் வகையைச் சேர்…" },
    { key: "action.addStockType", en: "+ Add new Stock Type…", ta: "+ புதிய சரக்கு வகையைச் சேர்…" },
    { key: "action.addCustomer", en: "+ Add new Customer…", ta: "+ புதிய வாடிக்கையாளரைச் சேர்…" },

    // Form fields / placeholders
    { key: "form.vehicle", en: "Vehicle", ta: "வாகனம்" },
    { key: "form.farmerAgent", en: "Farmer/Agent", ta: "விவசாயி/முகவர்" },
    { key: "form.stockType", en: "Stock Type", ta: "சரக்கு வகை" },
    { key: "form.customer", en: "Customer", ta: "வாடிக்கையாளர்" },
    { key: "form.qty", en: "Qty", ta: "அளவு" },
    { key: "form.selectCustomer", en: "Select customer", ta: "வாடிக்கையாளரைத் தேர்ந்தெடு" },
    { key: "form.selectVehicle", en: "Select vehicle", ta: "வாகனத்தைத் தேர்ந்தெடு" },
    { key: "form.farmerAgentName", en: "Farmer/Agent name", ta: "விவசாயி/முகவர் பெயர்" },
    { key: "form.phoneOptional", en: "Phone (optional)", ta: "தொலைபேசி (விருப்பம்)" },
    { key: "form.customerName", en: "Customer name", ta: "வாடிக்கையாளர் பெயர்" },
    { key: "form.name", en: "Name", ta: "பெயர்" },
    { key: "form.phone", en: "Phone", ta: "தொலைபேசி" },
    { key: "form.code", en: "Code", ta: "குறியீடு" },
    { key: "form.displayName", en: "Display name", ta: "காட்சிப் பெயர்" },
    { key: "form.initials", en: "Initials", ta: "குறியீடு" },
    { key: "form.tamilName", en: "Tamil Name", ta: "தமிழ் பெயர்" },
    { key: "form.commissionOverride", en: "Commission (override, ₹)", ta: "கமிஷன் (மேலெழுதல், ₹)" },
    { key: "form.vehicleFareOverride", en: "Vehicle Fare (₹)", ta: "வாகன வாடகை (₹)" },
    { key: "form.weighingCharges", en: "Weighing Charges (₹)", ta: "எடைபோடும் கட்டணம் (₹)" },
    { key: "form.coolieCharges", en: "Coolie / Labor Charges (₹)", ta: "கூலி / வேலைக் கட்டணம் (₹)" },
    { key: "form.marketFee", en: "Market Fee (₹)", ta: "சந்தை கட்டணம் (₹)" },

    // Page headings / static sections
    { key: "page.addVehicleArrival", en: "Add a new vehicle/arrival", ta: "புதிய வாகன வருகையைச் சேர்" },
    { key: "page.saleLines", en: "Sale lines", ta: "விற்பனை வரிகள்" },
    { key: "page.total", en: "Total", ta: "மொத்தம்" },
    { key: "page.billHistory", en: "Bill History", ta: "ரசீது வரலாறு" },
    { key: "page.billingSettings", en: "Billing Settings", ta: "பில்லிங் அமைப்புகள்" },
    {
      key: "page.billingSettingsNote",
      en: "This letterhead and footer text appears on every printed Customer Bill and Sales Bill.",
      ta: "இந்த letterhead மற்றும் அடிக்குறிப்பு உரை ஒவ்வொரு அச்சிடப்பட்ட வாடிக்கையாளர் ரசீது மற்றும் விற்பனை ரசீதிலும் தோன்றும்.",
    },
    {
      key: "page.deductionsOptional",
      en: "Deductions (optional overrides — leave blank to use defaults)",
      ta: "கழிவுகள் (விருப்ப மேலெழுதல் — இயல்புநிலைக்கு காலியாக விடவும்)",
    },
    {
      key: "page.footerNoteLabel",
      en: "Footer Note / Terms (printed at the bottom of every bill)",
      ta: "அடிக்குறிப்பு / விதிமுறைகள் (ஒவ்வொரு ரசீதின் கீழும் அச்சிடப்படும்)",
    },
    {
      key: "page.translationsIntro",
      en: "English text is the reference (seeded from the BRD's bilingual label dictionary) and can't be changed here. Edit the Tamil column and save -- the change applies everywhere immediately, no deploy needed.",
      ta: "ஆங்கில உரை குறிப்புத் தரவாக உள்ளது (BRD-இன் இருமொழி லேபிள் அகராதியிலிருந்து சேமிக்கப்பட்டது) மற்றும் இங்கே மாற்ற முடியாது. தமிழ் நெடுவரிசையைத் திருத்தி சேமிக்கவும் — மாற்றம் உடனடியாக அனைத்திடமும் பொருந்தும், deploy தேவையில்லை.",
    },
    { key: "page.searchPlaceholder", en: "Search by key or English text…", ta: "விசை அல்லது ஆங்கில உரையால் தேடு…" },
    { key: "page.noLabelsMatch", en: "No labels match", ta: "பொருத்தமான லேபிள்கள் இல்லை" },
    { key: "page.keyColumn", en: "Key", ta: "விசை" },
    { key: "page.englishColumn", en: "English", ta: "ஆங்கிலம்" },
    { key: "page.tamilColumn", en: "Tamil", ta: "தமிழ்" },
    { key: "page.loading", en: "Loading…", ta: "ஏற்றுகிறது…" },

    // Table column headers
    { key: "col.plantain", en: "Plantain", ta: "வாழைக்காய்" },
    { key: "col.stock", en: "Stock", ta: "சரக்கு" },
    { key: "col.buyer", en: "Buyer", ta: "வாங்குபவர்" },
    { key: "col.period", en: "Period", ta: "காலம்" },
    { key: "col.netPayable", en: "Net Payable", ta: "நிகர செலுத்த வேண்டியது" },

    // Messages
    {
      key: "msg.noUnbilledLines",
      en: "No unbilled sale lines for this customer/date.",
      ta: "இந்த வாடிக்கையாளர்/தேதிக்கு பில் செய்யப்படாத விற்பனை வரிகள் இல்லை.",
    },
    { key: "msg.noCustomerBillsYet", en: "No customer bills generated yet.", ta: "இதுவரை வாடிக்கையாளர் ரசீதுகள் உருவாக்கப்படவில்லை." },
    { key: "msg.noSalesBillsYet", en: "No sales bills generated yet.", ta: "இதுவரை விற்பனை ரசீதுகள் உருவாக்கப்படவில்லை." },
    {
      key: "msg.billAlreadyExistsCustomer",
      en: "One or more of these sale lines are already on a bill — see Bill History below to view it.",
      ta: "இந்த விற்பனை வரிகளில் ஒன்று அல்லது அதற்கு மேற்பட்டவை ஏற்கனவே ஒரு ரசீதில் உள்ளன — கீழே உள்ள ரசீது வரலாற்றில் காணவும்.",
    },
    {
      key: "msg.billAlreadyExistsSales",
      en: "This vehicle's sale lines for this date are already on a sales bill — see Bill History below to view it.",
      ta: "இந்த வாகனத்தின் இந்த தேதிக்கான விற்பனை வரிகள் ஏற்கனவே ஒரு விற்பனை ரசீதில் உள்ளன — கீழே உள்ள ரசீது வரலாற்றில் காணவும்.",
    },
    { key: "msg.auctionEntrySaved", en: "Auction entry saved.", ta: "ஏலப் பதிவு சேமிக்கப்பட்டது." },
    { key: "msg.billingSettingsSaved", en: "Billing settings saved.", ta: "பில்லிங் அமைப்புகள் சேமிக்கப்பட்டன." },
    { key: "msg.onlyAdminBilling", en: "Only Admin users can edit billing settings.", ta: "நிர்வாகிகள் மட்டுமே பில்லிங் அமைப்புகளைத் திருத்த முடியும்." },
    { key: "msg.onlyAdminTranslations", en: "Only Admin users can edit translations.", ta: "நிர்வாகிகள் மட்டுமே மொழிபெயர்ப்புகளைத் திருத்த முடியும்." },
    { key: "msg.pickFarmerAgentFirst", en: "Pick or add a Farmer/Agent first.", ta: "முதலில் ஒரு விவசாயி/முகவரைத் தேர்ந்தெடுக்கவும் அல்லது சேர்க்கவும்." },
    { key: "msg.nothingToSave", en: "Nothing to save.", ta: "சேமிக்க எதுவும் இல்லை." },

    // Bill/letterhead-specific (shared BillHeader/BillFooter components)
    { key: "bill.tagline", en: "Commission Agent — Plantain & Fruits", ta: "கமிஷன் முகவர் — வாழைப்பழம் & பழங்கள்" },
    { key: "bill.forTheFirm", en: "For the Firm", ta: "நிறுவனத்திற்காக" },
    { key: "bill.authorizedSignatory", en: "Authorized Signatory", ta: "அங்கீகரிக்கப்பட்ட கையொப்பமிடுபவர்" },
    { key: "bill.buyerSignature", en: "Buyer Signature", ta: "வாங்குபவர் கையொப்பம்" },
    { key: "bill.farmerAgentSignature", en: "Farmer / Agent Signature", ta: "விவசாயி / முகவர் கையொப்பம்" },
    { key: "bill.buyerLabel", en: "Buyer", ta: "வாங்குபவர்" },
    { key: "bill.farmerAgentLabel", en: "Farmer / Agent", ta: "விவசாயி / முகவர்" },
    { key: "bill.vehicleLabel", en: "Vehicle", ta: "வாகனம்" },
    { key: "bill.lessWeighingCharges", en: "Less: Weighing Charges", ta: "கழிக்க: எடைபோடும் கட்டணம்" },
    { key: "bill.lessCoolieCharges", en: "Less: Coolie Charges", ta: "கழிக்க: கூலிக் கட்டணம்" },
    { key: "bill.lessMarketFee", en: "Less: Market Fee", ta: "கழிக்க: சந்தை கட்டணம்" },

    // Masters tabs
    { key: "masters.tabCustomers", en: "Customers", ta: "வாடிக்கையாளர்கள்" },
    { key: "masters.tabFarmersAgents", en: "Farmers / Agents", ta: "விவசாயிகள் / முகவர்கள்" },
    { key: "masters.tabPlantainTypes", en: "Plantain Types", ta: "வாழைக்காய் வகைகள்" },
    { key: "masters.tabStockTypes", en: "Stock Types", ta: "சரக்கு வகைகள்" },

    // Billing Settings field labels
    { key: "settings.firmName", en: "Firm Name", ta: "நிறுவனப் பெயர்" },
    { key: "settings.addressLine1", en: "Address Line 1", ta: "முகவரி வரி 1" },
    { key: "settings.addressLine2", en: "Address Line 2", ta: "முகவரி வரி 2" },
    { key: "settings.city", en: "City", ta: "நகரம்" },
    { key: "settings.state", en: "State", ta: "மாநிலம்" },
    { key: "settings.pincode", en: "Pincode", ta: "அஞ்சல் குறியீடு" },
    { key: "settings.email", en: "Email", ta: "மின்னஞ்சல்" },
    { key: "settings.gstin", en: "GSTIN", ta: "GSTIN" },
    { key: "settings.apmcLicenseNo", en: "APMC / Market Licence No.", ta: "APMC / சந்தை உரிம எண்" },
    { key: "settings.bankName", en: "Bank Name", ta: "வங்கியின் பெயர்" },
    { key: "settings.bankAccountNo", en: "Bank Account No.", ta: "வங்கி கணக்கு எண்" },
    { key: "settings.bankIfsc", en: "Bank IFSC", ta: "வங்கி IFSC" },
  ];

  for (const l of appLabels) {
    await prisma.labelI18n.upsert({
      where: { labelKey_lang: { labelKey: l.key, lang: "EN" } },
      update: {},
      create: { labelKey: l.key, lang: "EN", labelText: l.en },
    });
    const existingTa = await prisma.labelI18n.findUnique({
      where: { labelKey_lang: { labelKey: l.key, lang: "TA" } },
    });
    if (!existingTa) {
      await prisma.labelI18n.create({
        data: { labelKey: l.key, lang: "TA", labelText: l.ta },
      });
    } else if (existingTa.labelText === "") {
      await prisma.labelI18n.update({
        where: { labelKey_lang: { labelKey: l.key, lang: "TA" } },
        data: { labelText: l.ta },
      });
    }
  }

  console.log("Seed complete. Admin login: admin@arkplantainmundy.local / changeme123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
