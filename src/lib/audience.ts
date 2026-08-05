// Who a day (or rule) is open to when no circle is chosen. Kept out of
// days.ts/friends.ts so either can import it without a cycle.
export const AUDIENCE_FRIENDS = "friends";
export const AUDIENCE_FRIENDS_OF_FRIENDS = "friends_of_friends";

/**
 * One place for the precedence (a circle always beats the kind) and the
 * friends-of-friends phrase; only the all-friends wording varies by surface
 * ("todos tus amigos" / "todos mis amigos" / "todos"), so the caller says it.
 */
export function audienceLabel(
  audienceKind: string,
  circleName: string | null | undefined,
  allFriendsLabel: string
) {
  if (circleName) return `“${circleName}”`;
  return audienceKind === AUDIENCE_FRIENDS_OF_FRIENDS ? "amigos de amigos" : allFriendsLabel;
}
