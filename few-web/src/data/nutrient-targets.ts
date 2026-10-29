export type NutrientId = "folate" | "iron" | "choline" | "iodine" | "calcium" | "dha" | "protein";
export type TargetStage = "pregnancy" | "breastfeeding" | "family";

export type NutrientTarget = {
  id: NutrientId;
  name: string;
  unit: string;
  kind: "RDA" | "AI" | "none";
  /** Daily amount for ages 19 to 50. Null when NIH has not published a target. */
  daily: Record<TargetStage, number | null>;
  /** NIH lists one pregnancy figure, not a separate figure for each trimester. */
  trimesterSplit: false;
  sourceName: string;
  sourceUrl: string;
  note: string;
};

export const NUTRIENT_TARGETS: NutrientTarget[] = [
  {
    id: "folate",
    name: "Folate",
    unit: "mcg DFE",
    kind: "RDA",
    daily: { pregnancy: 600, breastfeeding: 500, family: 400 },
    trimesterSplit: false,
    sourceName: "NIH ODS Folate fact sheet",
    sourceUrl: "https://ods.od.nih.gov/factsheets/Folate-Consumer/",
    note: "Recommended amount for pregnant teens and women, breastfeeding teens and women, and adults 19+.",
  },
  {
    id: "iron",
    name: "Iron",
    unit: "mg",
    kind: "RDA",
    daily: { pregnancy: 27, breastfeeding: 9, family: 18 },
    trimesterSplit: false,
    sourceName: "NIH ODS Iron fact sheet",
    sourceUrl: "https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/",
    note: "Ages 19 to 50. Lactation in that table is 9 mg.",
  },
  {
    id: "choline",
    name: "Choline",
    unit: "mg",
    kind: "AI",
    daily: { pregnancy: 450, breastfeeding: 550, family: 425 },
    trimesterSplit: false,
    sourceName: "NIH ODS Choline fact sheet",
    sourceUrl: "https://ods.od.nih.gov/factsheets/Choline-HealthProfessional/",
    note: "Adequate Intake for ages 19+. Pregnancy is 450 mg, lactation is 550 mg, women are 425 mg.",
  },
  {
    id: "iodine",
    name: "Iodine",
    unit: "mcg",
    kind: "RDA",
    daily: { pregnancy: 220, breastfeeding: 290, family: 150 },
    trimesterSplit: false,
    sourceName: "NIH ODS Iodine fact sheet",
    sourceUrl: "https://ods.od.nih.gov/factsheets/Iodine-HealthProfessional/",
    note: "Ages 19+. Pregnancy is 220 mcg, lactation is 290 mcg, women are 150 mcg.",
  },
  {
    id: "calcium",
    name: "Calcium",
    unit: "mg",
    kind: "RDA",
    daily: { pregnancy: 1000, breastfeeding: 1000, family: 1000 },
    trimesterSplit: false,
    sourceName: "NIH ODS Calcium fact sheet",
    sourceUrl: "https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/",
    note: "Ages 19 to 50. The same 1,000 mg applies to women, pregnancy, and lactation.",
  },
  {
    id: "dha",
    name: "DHA",
    unit: "mg",
    kind: "none",
    daily: { pregnancy: null, breastfeeding: null, family: null },
    trimesterSplit: false,
    sourceName: "NIH ODS Pregnancy fact sheet",
    sourceUrl: "https://ods.od.nih.gov/factsheets/Pregnancy-HealthProfessional/",
    note: "NIH says intake recommendations for DHA have not been established. This view does not invent a target.",
  },
  {
    id: "protein",
    name: "Protein",
    unit: "g",
    kind: "none",
    daily: { pregnancy: null, breastfeeding: null, family: null },
    trimesterSplit: false,
    sourceName: "NIH ODS nutrient recommendations",
    sourceUrl: "https://ods.od.nih.gov/HealthInformation/nutrientrecommendations.aspx",
    note: "NIH ODS does not publish a protein fact sheet, so no protein number is stored.",
  },
];

export function targetStageFor(lifeStage: string | null | undefined): TargetStage {
  if (lifeStage === "breastfeeding") return "breastfeeding";
  if (lifeStage === "family") return "family";
  return "pregnancy";
}
