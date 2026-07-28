"use client";

import { useState, type KeyboardEvent } from "react";
import { amenityList } from "@/lib/place";

const MAX_AMENITIES = 12;
const MAX_AMENITY_LENGTH = 40;

/**
 * "El setup" is stored as one comma-separated column, but typing commas into a
 * text box is a guessing game. Chips make the list visible: enter adds, × removes,
 * backspace on an empty box takes the last one back.
 */
export function AmenitiesField({ defaultValue }: { defaultValue: string }) {
  const [tags, setTags] = useState(() => amenityList(defaultValue).slice(0, MAX_AMENITIES));
  const [draft, setDraft] = useState("");
  const atLimit = tags.length >= MAX_AMENITIES;

  function commit(raw: string) {
    const value = raw.trim().replace(/,+$/, "").slice(0, MAX_AMENITY_LENGTH).trim();
    setDraft("");
    if (!value || atLimit) return;
    setTags((current) =>
      current.some((tag) => tag.toLowerCase() === value.toLowerCase()) ? current : [...current, value]
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === "Backspace" && draft === "") {
      setTags((current) => current.slice(0, -1));
    }
  }

  return (
    <div>
      <input type="hidden" name="amenities" value={tags.join(", ")} />
      <label htmlFor="place-amenity-draft" className="label">
        El setup
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-paper p-2 focus-within:border-clay">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1.5 rounded-full bg-amenity py-1.5 pr-1.5 pl-2.5 font-mono text-[11px] text-amenity-ink"
          >
            {tag}
            <button
              type="button"
              aria-label={`Sacar ${tag}`}
              className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-[13px] leading-none transition-colors hover:bg-ink/10 hover:text-ink"
              onClick={() => setTags((current) => current.filter((item) => item !== tag))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="place-amenity-draft"
          value={draft}
          maxLength={MAX_AMENITY_LENGTH}
          disabled={atLimit}
          placeholder={
            atLimit
              ? `Ya son ${MAX_AMENITIES}`
              : tags.length === 0
                ? "wifi rápido, 2 monitores, café…"
                : "sumá otra y dale enter…"
          }
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
          className="min-w-[10rem] flex-1 bg-transparent px-1 py-1 text-sm text-ink outline-none placeholder:text-ink-300"
        />
      </div>
    </div>
  );
}
