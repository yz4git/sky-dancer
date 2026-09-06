/**
 * Product-level progression ownership for Sky Dancer modes that reuse Turbo Hunt combat.
 * Legacy cart milestone/domino directors may still exist for regression coverage, but they
 * must not mutate progression while the Sky Dancer stage/act directors are authoritative.
 */
export function cartTurboHuntProductProgressionOwned(mode: string | null | undefined): boolean {
  return mode === "turbo-hunt" || mode === "sky-raid";
}

export function cartTurboHuntCurrentProductMode(): string | null {
  if (typeof document === "undefined") return null;
  return document.documentElement.dataset.skyDancerMode ?? null;
}
