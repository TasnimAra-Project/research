import type { OfficialGuide } from "@/lib/safety/guides";

export function UnverifiedNote({ guides }: { guides: OfficialGuide[] }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-white px-3 py-3 text-base">
      <p className="font-semibold">Not on the verified list</p>
      <p className="mt-2">Check the official page for this food.</p>
      <ul className="mt-2 space-y-1">
        {guides.map((guide) => (
          <li key={guide.id}>
            <a className="underline" href={guide.url}>
              {guide.source}: {guide.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
