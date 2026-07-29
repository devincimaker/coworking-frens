"use client";

import { useState } from "react";
import { AmenityIcon } from "@/components/amenity-icon";
import { ChevronIcon } from "@/components/host/icons";
import { AMENITIES, AMENITY_GROUPS, amenitiesFor } from "@/lib/amenities";

/**
 * "El setup", picked instead of typed. Free tags let every host invent their own
 * spelling for the same thing, so the list is closed and tapping is the whole
 * interaction — there is no free-text escape hatch by design.
 *
 * Twenty chips laid flat is thirteen rows on a phone, so the groups arrive folded:
 * four rows, each carrying its own count. What is picked shows inside its group
 * and nowhere else — a chip repeated in a summary above reads as a second, different
 * thing rather than the same one twice.
 *
 * Every checkbox stays mounted even while its group is shut, because a hidden input
 * still submits. The form posts one `amenityKeys` field whatever is open on screen.
 */
export function AmenitiesField({ selected }: { selected: readonly string[] }) {
  // Seeded through the catalogue so a key it no longer knows drops here, not later.
  const [chosen, setChosen] = useState(
    () => new Set(amenitiesFor(selected).map((amenity) => amenity.key))
  );
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  function toggleAmenity(key: string) {
    setChosen((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  function toggleGroup(key: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="label">
          El setup · {chosen.size} de {AMENITIES.length}
        </p>
        <p className="mb-1.5 font-mono text-[11px] text-faded">
          se ve en tu casa y en cada juntada
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-paper">
        {AMENITY_GROUPS.map((group, index) => {
          const items = AMENITIES.filter((amenity) => amenity.group === group.key);
          const count = items.filter((amenity) => chosen.has(amenity.key)).length;
          const expanded = open.has(group.key);

          return (
            <div key={group.key} className={index > 0 ? "border-t border-line" : ""}>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={expanded}
                aria-controls={`amenity-group-${group.key}`}
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-amenity"
              >
                <span className="text-[15px] font-semibold text-ink">{group.title}</span>
                <span className="flex shrink-0 items-center gap-2 text-faded">
                  <span
                    className={`font-mono text-[13px] ${count > 0 ? "text-clay-deep" : "text-faded"}`}
                  >
                    {count}/{items.length}
                  </span>
                  <span className={`flex transition-transform ${expanded ? "rotate-180" : ""}`}>
                    <ChevronIcon size={15} />
                  </span>
                </span>
              </button>

              <div
                id={`amenity-group-${group.key}`}
                // Inset on all four sides, not just three: without a top inset the only
                // gap above the chips belongs to the header, so hovering the header tints
                // it and the chips end up glued to the edge of the band.
                className={expanded ? "flex flex-wrap gap-2 p-3.5" : "hidden"}
              >
                {items.map((amenity) => (
                  <label key={amenity.key} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="amenityKeys"
                      value={amenity.key}
                      checked={chosen.has(amenity.key)}
                      onChange={() => toggleAmenity(amenity.key)}
                      className="peer sr-only"
                    />
                    {/* The `peer-checked:hover:` pair is not redundant: a bare `hover:`
                        outranks `peer-checked:`, so without it a chosen chip turns grey
                        under the cursor — the one state where it most needs to read as chosen. */}
                    <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-[9px] text-sm font-medium text-faded transition-colors hover:border-rule-strong hover:text-ink peer-checked:border-clay peer-checked:bg-clay-tint peer-checked:font-semibold peer-checked:text-clay-deep peer-checked:hover:border-clay peer-checked:hover:text-clay-deep peer-focus-visible:ring-2 peer-focus-visible:ring-clay/60">
                      <AmenityIcon amenityKey={amenity.key} size={16} />
                      {amenity.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
