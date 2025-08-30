import { Place } from '@/lib/firestore';

export default function PlaceCard({ place }: { place: Place }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-base">{place.name}</div>
          <div className="text-sm text-zinc-500">{place.city}</div>
        </div>
      </div>
      {place.mapsUrl && (
        <a
          href={place.mapsUrl}
          target="_blank"
          className="mt-3 inline-block text-sm text-blue-600 underline"
        >
          Otwórz w mapach
        </a>
      )}
    </div>
  );
}
