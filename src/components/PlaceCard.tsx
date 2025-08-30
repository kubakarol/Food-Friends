import Link from 'next/link';
import { Place } from '@/lib/firestore';

export type PlaceCardProps = { place: Place };

export default function PlaceCard({ place }: PlaceCardProps) {
  return (
    <Link href={`/place/${place.id}`} className="block">
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm hover:shadow-md transition">
        <div className="font-semibold text-base text-emerald-900">{place.name}</div>
        <div className="text-sm text-emerald-600">{place.city}</div>
        {place.mapsUrl && (
          <span className="mt-3 inline-block text-sm text-sky-600 underline">Mapa</span>
        )}
      </div>
    </Link>
  );
}
