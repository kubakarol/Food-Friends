import Link from 'next/link';
import { Place } from '@/lib/firestore';
import { MapPin, Navigation } from 'lucide-react';

export type PlaceCardProps = { place: Place };

export default function PlaceCard({ place }: PlaceCardProps) {
  return (
    <div className="ff-card ff-card-press">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/place/${place.id}`} className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-emerald-950">{place.name}</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-emerald-700">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{place.city}</span>
          </div>
        </Link>

        {place.mapsUrl ? (
          <a
            href={place.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Otwórz ${place.name} w mapach`}
            title="Otwórz w mapach"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100 active:scale-95"
            onClick={(e) => e.stopPropagation()}
          >
            <Navigation className="h-4 w-4" />
          </a>
        ) : (
          <Link
            href={`/place/${place.id}`}
            aria-label={`Otwórz szczegóły miejsca ${place.name}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100 transition hover:bg-emerald-100 active:scale-95"
          >
            <Navigation className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
