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

  const plantainTypes = [
    { code: "NENDRAN", nameEn: "Nendran" },
    { code: "ROBUSTA", nameEn: "Robusta" },
    { code: "POOVAN", nameEn: "Poovan" },
    { code: "RED_BANANA", nameEn: "Red Banana" },
  ];
  for (const pt of plantainTypes) {
    await prisma.plantainType.upsert({
      where: { code: pt.code },
      update: {},
      create: pt,
    });
  }

  const stockTypes = [
    { code: "BUNCH", nameEn: "Bunch" },
    { code: "HAND", nameEn: "Hand" },
    { code: "BOX", nameEn: "Box" },
  ];
  for (const st of stockTypes) {
    await prisma.stockType.upsert({
      where: { code: st.code },
      update: {},
      create: st,
    });
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
  // domain terms, not app navigation, so these seed EN-only. TA stays blank
  // until the admin fills it in from the Translations page; the UI falls
  // back to the EN string (or the key itself) when TA text is empty.
  const chromeLabels = [
    { key: "nav.appTitle", en: "ARK Plantain Mundy" },
    { key: "nav.auctionEntry", en: "Auction Entry" },
    { key: "nav.customerBill", en: "Customer Bill" },
    { key: "nav.salesBill", en: "Sales Bill" },
    { key: "nav.reports", en: "Reports" },
    { key: "nav.masters", en: "Masters" },
    { key: "nav.settings", en: "Settings" },
    { key: "nav.translations", en: "Translations" },
    { key: "nav.logout", en: "Logout" },
    { key: "nav.menu", en: "Menu" },
    { key: "nav.close", en: "Close" },
  ];

  for (const l of chromeLabels) {
    await prisma.labelI18n.upsert({
      where: { labelKey_lang: { labelKey: l.key, lang: "EN" } },
      update: {},
      create: { labelKey: l.key, lang: "EN", labelText: l.en },
    });
    await prisma.labelI18n.upsert({
      where: { labelKey_lang: { labelKey: l.key, lang: "TA" } },
      update: {},
      create: { labelKey: l.key, lang: "TA", labelText: "" },
    });
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
