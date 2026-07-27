# TODO

## To Do

- [ ] Build a native iPhone app
  - Create an iOS client for the coworking flow, including authentication, feed, hosting, invites, and attendance.
- [ ] Replace free-text amenities with preset options
  - Let hosts choose from a fixed set of amenities instead of typing arbitrary comma-separated text.
  - Store amenities as structured values so feed/day filters and place displays stay consistent.
- [ ] Let hosts open coworking days to friends of friends
  - Add an audience option for coworking days that includes direct friends plus friends-of-friends.
  - Support circle-scoped expansion, where a host can invite a chosen circle and those members' friends.
  - Keep visibility, attendance, notifications, and friend-request context clear for people who are not direct friends of the host.
- [ ] Let hosts kick someone from a specific juntada
  - Allow a host to remove an attendee from one coworking day when they do not want that person attending.
  - Prevent the kicked attendee from rejoining that same day, even if they are still in the audience.
  - Notify the kicked attendee clearly and keep the host-side attendance controls explicit.
- [ ] Show my profile in read-only mode by default
  - Make the current user's profile look like a polished profile view instead of always showing edit fields.
  - Add a clear Edit action that switches the profile into editing mode.
  - Keep save/cancel behavior explicit so users can leave edit mode without accidental changes.
- [ ] Ask for confirmation before removing a friend
  - Show a confirmation step before `Quitar amigo` actually removes the relationship.
  - Make the consequence clear, including that both users may lose access to each other's friend-only juntadas.
  - Cover the confirmation flow with tests so accidental one-click removal cannot regress.
- [ ] Let users cancel outgoing friend requests
  - Add a clear action for canceling a pending friend request the current user sent.
  - Remove or mark the pending request so the recipient no longer sees it as actionable.
  - Update Friends, Gente, and profile surfaces to reflect the canceled state.
- [ ] Add Terms of Service and Privacy Policy
  - Draft and publish ToS and privacy policy pages, then link them from the sign-in flow and app footer/navigation.
- [ ] Improve the home profile created during host setup
  - Make newly created homes feel more complete than a bare place record.
  - Prompt hosts for richer home details such as description, photos, amenities, arrival notes, capacity, and general vibe.
- [ ] Improve the landing page copy
  - Better sell the vision and the why behind Coworking Frens, so new visitors quickly understand the emotional and practical value.
  - Rework the headline, supporting copy, and key sections to make the product feel more compelling without becoming generic marketing.
- [ ] Improve link sharing metadata and brand assets
  - Add proper Open Graph/Twitter metadata so shared links show a compelling title, description, and preview image.
  - Create and use an actual Frens logo/favicon instead of the default Next.js triangle-style asset.
- [ ] Let attendees add photos to a juntada's album
  - Give each coworking day a shared album that everyone who claimed a silla can upload to, so the photos of a
    juntada belong to the people who were actually there rather than to the anfitrión alone.
  - Gate both uploading and viewing on attendance, not on audience: being allowed to *see* a day is not the same
    as having been in the room, and these are photos of someone's home and someone's friends.
  - Decide who can delete what — at minimum the uploader, plus the anfitrión for anything taken in their casa.
  - Reuse the existing Vercel Blob upload path and the ordered-gallery shape already used for `PlacePhoto`.
  - **Prerequisite: past juntadas have nowhere to live today.** Every day query filters `date >= todayBA()`
    (`queries.ts`, `days.ts`), so a finished juntada disappears from every surface even though the row and its
    `Attendance` records persist. An album needs a page that survives the date passing.
  - Open question: whether past juntadas get their own surface (a history tab, a per-casa archive, a profile
    section) or whether the existing day detail page simply stays reachable and changes shape once it is over.
    The second is far less work and may be enough.
  - Watch the recurring-day case: rules materialize a new `CoworkDay` per date, so "the album for Thursdays at
    Meli's" is many albums, not one. Decide whether that is fine or whether albums should ever roll up.
- [ ] Extend mutual friends to Gente and day attendee lists
  - `mutualFriends()` is already batched for it; both surfaces resolve many people at once.
  - Decide the density first: the attendee row is the tightest surface in the app, and the friend-request
    controls there are gated on `!isHost && isAttending` — mutuals may or may not want that same gate.
  - Once friends-of-friends audiences land, this is what explains to an attendee why a stranger is in the room.
- [ ] Add WhatsApp notifications as an opt-in extra, for whoever adds a phone number
  - Everything the product says outside the app goes by email today: a día abierto, a date or time change, a
    cancellation, someone claiming a silla, someone dropping out, friend requests and acceptances, and the
    day-before reminder the cron sends. WhatsApp is where this group already talks, so a message there is far
    likelier to actually be read than one more email.
  - **Email stays the floor and nothing about it changes.** Adding a phone is optional; a user who never adds
    one sees no difference at all. That also keeps sign-in out of scope — `auth.ts` sends magic links through
    the same helper, and those stay on email regardless.
  - The plumbing is favourable: all of it funnels through a single `sendEmail(to[], subject, text)` in
    `email.ts`, called from 16 places, all plain text. A `notify()` layer can fan out per user's channels
    without rewriting a single call site.
  - **Schema work needed:** `User` has no phone number, and an unverified one means messaging whoever happens to
    own that line. A verified phone is the prerequisite, and verification is its own flow. The field belongs in
    profile settings, alongside the read-only-profile work above.
  - **The real cost is Meta's, not ours.** Business-initiated messages outside a 24-hour reply window need
    pre-approved templates and are billed per conversation, and every notification listed above is
    business-initiated. Each one needs its own approved template, and templates live in Meta's console, approved
    per language — which pulls the rioplatense copy out of the repo and away from review. That runs against the
    voice being a product commitment, not a localization detail. Opt-in at least bounds the bill to the people
    who asked for it.
  - Consent is a WhatsApp requirement, not just good manners. Adding the number *is* the opt-in, so the consent
    lives in that form rather than in a `termsVersion` bump that would re-gate everyone for a feature most
    people have not asked for.
  - Feedback notifications go to `ADMIN_EMAILS`, not to users — those stay email regardless.
  - Open question: for someone who opted in, does an event send on both channels or only WhatsApp? Both is the
    simpler build and the noisier inbox; per-event choice is probably over-engineering it for now.

## In Progress

_No tasks._

## Done

- [x] Show mutual friends with someone
  - Added `mutualFriends()` beside `friendConnectionStates()`: batched, and it returns only the intersection of
    the viewer's friends with each person's — never anyone's full friend list.
  - `u/[id]` profile shows faces plus names ("Meli, Luján y 18 más"), expanding in place to the full list once
    there are more than three. Shown for existing friends too, never for your own profile.
  - Incoming friend requests on `/friends` carry faces and a count, since that is the moment you decide whether
    you know the person.
- [x] Let users send friend requests from shared coworking days
  - When users see other attendees on a coworking day who are not already their friends, let them send a friend request from that context.
  - Support the request lifecycle clearly, including pending, accepted, declined, and already-friends states.
- [x] Add an in-app feedback system
  - Give users a simple way to send feedback, bug reports, or feature ideas from inside the app.
  - Store submitted feedback with user, page/context, message, and timestamp so it can be reviewed later.
- [x] Let hosts edit a coworking day
  - Allow hosts to update a juntada's date, time, and description after creating it.
  - Keep attendance and visibility behavior clear when an existing juntada changes.
- [x] Add a simple landing page
  - Create a public page that explains Coworking Frens, shows the basic flow, and links clearly into sign-in.
- [x] Deploy the app
  - Configure production environment variables, run a production build, and publish the first deployment.
- [x] Point a custom domain to it
  - Add the domain to the hosting provider, update DNS records, and verify HTTPS.
- [x] Add first-run onboarding
  - After first sign-in, ask for username/display name, profile photo, and a short bio before dropping the user into the app.
- [x] Make profile photos optional during profile creation
  - Let users complete first-run onboarding without uploading a profile photo.
  - Keep a clear optional photo upload path so people can add or change their photo later.
- [x] Make authentication provider-agnostic
  - Update auth so sign-in is not limited to Google; support a more general provider strategy such as email magic links and configurable OAuth providers.
- [x] Let people customize their profile
  - Add profile settings where users can update their display name and profile image URL.
- [x] Add photos to people's homes
  - Let hosts upload and manage a gallery of home photos during host setup, reusing the existing profile-photo upload flow where possible.
  - Surface home photos anywhere users see hosted places, including feed/day cards, day detail pages, host/profile displays, and invite/attendance views where relevant.
  - Only show home photos to users who are allowed to see that home.
- [x] Add descriptions to coworking days
  - Let hosts add an optional description when creating a new juntada or a recurrent juntada.
  - Surface the description in day cards, day detail pages, and host upcoming-day lists where it helps people decide whether to join.
- [x] Replace the address text field with a maps-backed address picker
  - Integrated Google Maps Places Autocomplete so hosts can enter accurate, normalized addresses.
  - Stored Google place ID, coordinates, and parsed address fields for consistent display and future map-based features.
