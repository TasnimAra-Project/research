import { NUTRIENT_TARGETS, targetStageFor, type NutrientId } from "@/data/nutrient-targets";

export function NutrientTable({
  lifeStage,
  totals,
  calculated,
}: {
  lifeStage: string | null;
  totals: Record<NutrientId, number> | null;
  calculated: boolean;
}) {
  const stage = targetStageFor(lifeStage);
  return (
    <section className="mt-8" aria-label="Nutrient coverage">
      <h2 className="font-display text-2xl font-bold">Nutrients for this week</h2>
      <p className="mt-2 max-w-3xl text-base">
        Targets are for ages 19 to 50. NIH lists one pregnancy target, not a separate number for each trimester.
      </p>
      <div className="mt-4 overflow-x-auto rounded-[20px] border-2 border-rose bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left text-base">
          <thead className="bg-blush-deep">
            <tr>
              <th className="px-3 py-3 font-semibold">Nutrient</th>
              <th className="px-3 py-3 font-semibold">This week</th>
              <th className="px-3 py-3 font-semibold">Each day</th>
              <th className="px-3 py-3 font-semibold">Source</th>
            </tr>
          </thead>
          <tbody>
            {NUTRIENT_TARGETS.map((nutrient) => {
              const daily = nutrient.daily[stage];
              const amount = totals?.[nutrient.id];
              return (
                <tr key={nutrient.id} className="border-t border-rose">
                  <th className="px-3 py-3 font-semibold" scope="row">
                    {nutrient.name}
                    <span className="mt-1 block text-sm font-normal">{nutrient.note}</span>
                  </th>
                  <td className="px-3 py-3">
                    {calculated && typeof amount === "number" ? `${amount} ${nutrient.unit}` : "Not calculated yet"}
                  </td>
                  <td className="px-3 py-3">{daily ? `${daily} ${nutrient.unit}` : "No NIH target is stored"}</td>
                  <td className="px-3 py-3">
                    <a className="underline" href={nutrient.sourceUrl}>
                      {nutrient.sourceName}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
