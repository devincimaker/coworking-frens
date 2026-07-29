import { AmenityIcon } from "@/components/amenity-icon";
import { amenitiesFor } from "@/lib/amenities";

/**
 * The setup, as read everywhere it is read: the feed card, the folded house strip,
 * the day page. One component so a house looks the same in all three, and so the
 * cramped surfaces can say `limit` instead of quietly dropping the rest.
 */
export function AmenityChips({
  keys,
  limit,
  className = "",
}: {
  keys: readonly string[];
  limit?: number;
  className?: string;
}) {
  const amenities = amenitiesFor(keys);
  if (amenities.length === 0) return null;

  const shown = limit ? amenities.slice(0, limit) : amenities;
  const hidden = amenities.length - shown.length;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {shown.map((amenity) => (
        <span key={amenity.key} className="amenity inline-flex items-center gap-1.5 pl-2">
          <AmenityIcon amenityKey={amenity.key} />
          {amenity.label}
        </span>
      ))}
      {hidden > 0 && <span className="amenity">+{hidden}</span>}
    </div>
  );
}
