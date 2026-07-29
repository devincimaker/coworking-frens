# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile-first: most sessions are on a phone, and the app already ships a bottom nav for
small screens and a sidebar from `md` up. A native iPhone client is listed in TODO.md but
is explicitly **parked** — do not design for it, and do not treat native patterns as a
constraint on web decisions.

## Users

**Any group of friends who work remotely and would rather not work alone.** The product
started with one circle in Argentina, but the concept is not Argentine — a friend group
anywhere is a legitimate user. Growth is by invitation only: people arrive through a
friend's link, never through search or a public directory.

Every user plays both roles, usually on different days:

- **The one who opens the house (`anfitrión`).** Has a place worth sharing — a patio, a
  quiet room, a long table. Decides the day, the hours, how many chairs exist, and which
  friends can see it. Wants control without having to negotiate or explain a cancellation.
- **The one who shows up.** Has a work week to get through and doesn't want to spend it
  alone at the same desk. Decides where to go by reading *who else is going* and what the
  house is like that day — silence, music, mate, a dog.

The job in one line: **turn "we should work together sometime" into a standing plan that
nobody has to organize.**

## Product Purpose

Friends open their homes to each other as places to work. The app makes the offer
visible, the attendance list legible, and the claim on a chair instant — so a recurring
get-together survives without anyone chasing a group chat.

Success is a week where several houses are open, people join without discussion, and no
one had to coordinate. Failure is a beautifully built calendar nobody opens.

## Positioning

The attendee list is the product. Cafés and paid coworks sell a desk; Frens shows you
which of your friends will be in a specific living room on Thursday morning, and that is
the thing being chosen.

Mechanisms a neighboring product could not truthfully copy:

- **The venue is someone's home, and that someone is in the room.** There is no operator,
  no staff, no neutral space. The host is a participant.
- **Each house keeps its own tone, and the tone is the differentiator.** One is silent
  until 13:00, one has loud music and cooking at midday, one has a dog. The product never
  averages houses into a single standardized experience — choosing between tones on a
  given day *is* the value.
- **Audience is drawn from a real friendship graph, plus private circles.** Circles are
  audience selectors visible only to their owner, so a host can open a day to a subset
  without anyone learning they were sorted.
- **Chairs are finite and first-come-first-served.** Capacity is a real constraint of a
  real living room, not a scarcity mechanic.

## Operating Context

- **The remote work week.** People are already working; the app changes *where* and *with
  whom*, not what they do. Sessions are typically a workday block (e.g. 9:00–14:00), not
  an event.
- **The alternatives it displaces:** working at home alone, a café where you buy something
  hourly to justify the table, and a paid coworking space with an office's hours and rules.
- **The coordination it replaces:** a group chat thread where someone proposes a day, three
  people react, and it dies.
- **Recurrence is the norm.** Hosts set weekly availability rules; a daily cron materializes
  concrete days three weeks ahead so the plan exists without anyone re-creating it.
- **Entry is passwordless.** Email magic link (Resend), then a first-run flow: accept the
  Terms, then set username, display name, optional photo, and a short bio.
- **Email carries the product outside the app.** Day opened, join, leave, cancellation, and
  a day-before reminder.
- **Address is privileged information.** The street address is shown only to people who
  have actually joined that day; house photos only to users allowed to see that home.

## Capabilities and Constraints

Confirmed and built:

- Mutual friendship via personal invite links, plus friend requests — sendable globally
  and from a shared day's attendee list (pending / accepted / declined / already friends).
- Mutual friends (the intersection only, never anyone's full list) on the `u/[id]` profile
  and on incoming friend requests. Not yet on Gente or day attendee lists.
- Private circles (owner-only visibility) used as the audience for a day or a recurring rule.
- One `Place` per user: nickname, Google Places–backed address, arrival notes, amenities
  picked from a closed catalogue (20 items in four groups, icon + label, keys stored in
  `amenityKeys`), default capacity, and an ordered photo gallery (Vercel Blob). There is
  no free-text amenity field: the catalogue is the whole vocabulary, deliberately.
- One-off days and weekly recurring rules; day date, hours, capacity, and description are
  editable by the host; days can be cancelled.
- Audience is **snapshotted at day creation** — later friendship changes do not retroactively
  alter who can see an existing day.
- First-come-first-served attendance against a capacity; attendees see each other.
- Terms acceptance is versioned; bumping the version re-gates every user until they accept.
- In-app feedback widget with an admin review surface gated by `ADMIN_EMAILS`.

Current state that is **not** a commitment — the user has explicitly said any of these may
change if the product needs it:

- **Free, with hosts prohibited from charging** (enforced in the Terms today). Payments are
  not ruled out for the future.
- **Argentina-local time for everyone.** No per-user timezones; dates are stored as local
  date strings. An MVP assumption, not a product truth.
- **Invite-only with no public discovery.** True today; not a permanent commitment.
- **Spanish-only interface.** See Brand Commitments — the voice is deliberate, the
  single-locale implementation is not a vow.

Known gaps (do not present these as working):

- **Friends-of-friends audiences are not built yet.** `resolveAudience` expands direct
  friends or a circle only. The landing page already describes the feature; this lead is
  deliberate and short — the feature is imminent. Do not "fix" the page by removing the
  claim.
- Nothing filters on amenities yet. `amenityKeys` is structured for it, but no feed or day
  filter reads it, and no surface promises one.
- The user's own profile has no read-only mode; it always renders as an edit form.
- There is no confirmation step before removing a friend, and no way to cancel an outgoing
  friend request.

## Brand Commitments

- **Name:** Frens (full form "Coworking Frens"). Attributed to **humano.inc**; contact
  `devinci.maker@gmail.com`.
- **Voice: rioplatense Spanish is part of the product, not a localization detail.** `vos`,
  `laburar`, `juntada`, `anfitrión`, mate. Other friend groups are expected to adopt it in
  Spanish. **Do not neutralize the copy to make it travel**, and do not design for text
  expansion or translation until the user asks for it.
- Tone: plain, warm, a little dry. It names the unglamorous truth ("comprando algo cada hora
  para justificar la mesa") rather than selling an aspiration.
- **Product vocabulary — use these exact words:** `juntada` (a cowork day), `anfitrión`
  (host), `casa` (the venue), `amigos`, `círculos`, `Gente` (people search), `silla` (a
  claimed spot).
- **No logo exists yet.** The wordmark is a coral rounded square with an "F", and the
  favicon is still Next.js boilerplate. Creating real brand assets and Open Graph imagery
  is open work, not a solved problem.

## Evidence on Hand

- **Real users.** The app is deployed and a real group is using it. It is true to say
  people use this; it is not established how many, so **never state a user count.**
- **Real houses exist, and are deliberately kept off public surfaces.** They are the user's
  friends' private homes, with addresses. Publishing their names, interiors, or locations to
  market a product whose entire premise is privacy among friends would betray the thing
  being sold. The material could be cleared; the standing decision is not to. This may
  change later, and only the user changes it.
- **Public-surface house content is illustrative on purpose.** "Lo de Meli", "El patio de
  Luján", "El Nido", their quotes, and the images at `public/hero-casa.jpg` and
  `public/casas/*.jpg` are placeholders standing in for a real pattern. Keep them
  believable and generic. **Do not upgrade them to real friends' homes, and do not treat
  their placeholder status as a gap to close.**
- **Nothing else may be fabricated:** no testimonials, no press, no partner logos, no
  benchmarks, no pricing, no "trusted by" claims, no user counts.

## Product Principles

1. **The list of who's going is the product.** Any surface that shows a juntada without
   showing who will be there has buried the reason to come.
2. **Every house keeps its own tone.** Host-set character — silence, music, a dog, a
   midday meal — is content to be surfaced, never normalized away for visual consistency.
3. **Each addition must remove a message, not add a decision.** The product exists to kill
   coordination overhead; a feature that creates a new thing to agree on works against it.
4. **The host is never put on the spot.** Opening, limiting, and cancelling are all
   one-sided actions that require no explanation to anyone.
5. **Private things stay private by default** — addresses, circle membership, and homes are
   revealed by the act of joining or being invited, never by browsing. This holds on public
   surfaces too: marketing shows the pattern with placeholders, never a real friend's house.
6. **It began in one city; it is not about that city.** Keep the rioplatense voice, treat
   the single-timezone, single-locale, free-of-charge implementation as current state that
   may change.
