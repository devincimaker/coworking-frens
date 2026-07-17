# Coworking Frens — Product Spec (v1)

A private webapp for friends to open their homes as cowork spots and join each other's cowork days. No strangers, no payments — the attendee list is the product.

## Core loop
1. A host opens their place for a day (one-off, or automatically via a recurring rule).
2. Friends in the right circles see it in their feed and claim a spot (first come, first served).
3. Everyone sees who's coming — you join because *those* people are going.

## Decisions (settled 2026-07-17)
- **Friend model:** each user has a **global friends list** (always mutual). Friendships form via personal invite links: you send your link, they accept, you're friends. On top of that, each user can organize their friends into **circles** — private, personal subsets ("climbing friends", "ex-coworkers"), like multiple Close Friends lists. Circles are audience selectors, not shared groups: nobody else sees your circles or their names.
- **Publish targets:** a cowork day (or rule) is aimed at "all my friends" (**strong default**) or exactly **one** of the host's circles — never multiple circles, to keep audiences simple to reason about. The audience is **snapshotted at creation time** — friends added later don't retroactively see old events. Attendees from different circles seeing each other on the list is a feature, not a leak.
- **No negative space:** the app never reveals that content exists outside your audience — no "hidden events" hints, no counts, no leaks via mutual friends. If you can't see it, it doesn't exist. (Limited audiences are socially awkward only when the app rubs them in.)
- **Join flow:** instant claim up to capacity, no host approval. Host can remove someone in edge cases and gets an email on each join.
- **Recurrence:** hosts can create **one-off days** and **recurring rules** (e.g. Tue/Thu 9–17, capacity 3, circles X+Y). Rules auto-materialize instances 3 weeks ahead, immediately joinable; the host can cancel any single instance with one tap (attendees get notified).
- **Auth:** Google sign-in via NextAuth. Entry to the app is via a friend's personal invite link (accepting it creates the friendship).
- **Notifications:** transactional email only for MVP: join/leave on your day, day opened in your audience, day cancelled, and a **day-before reminder** to host + attendees ("Tomorrow at Fabri's, 9–17 — Marco and Lea are coming"). Provider: Resend or similar.
- **Timezone:** all friends assumed to be in Argentina (America/Argentina/Buenos_Aires) for MVP — all times stored and displayed in that zone, no per-user timezone handling.
- **Stack:** Next.js (App Router) + Prisma + SQLite to start (Postgres when deployed if needed).

## Data model
- **User** — id, name, email, avatar (from Google).
- **Place** — one per host: nickname, address, arrival notes, amenities (wifi, monitors, coffee, pets…), default capacity.
- **Friendship** — pair of users, always mutual; created when a personal invite link is accepted.
- **Circle** — owner, name (private to owner); **CircleMember** (circle, friend of owner).
- **AvailabilityRule** — host, weekdays, start/end time, capacity, audience (all friends or one circle id), active flag.
- **CoworkDay** — host, place, date, start/end, capacity, status (open/cancelled), optional source rule; **audience snapshot** (expanded list of user ids at creation). One-off days are just CoworkDays with no rule.
- **Attendance** — cowork day, user, joined_at.

## Screens
- **Home feed** — upcoming cowork days you're in the audience for, each card showing host, place nickname, date/hours, spots left, attendee avatars. Tap to join/leave inline.
- **Day detail** — full attendee list, house info & arrival notes, join/leave, (host: cancel day, remove attendee).
- **Host panel** — my place (edit details), my recurring rules, my upcoming days (cancel/adjust capacity), create one-off day.
- **Friends** — my friends list, my personal invite link, organize friends into circles (create/edit circles, drag friends in/out).

## MVP explicitly excludes
Chat/comments per event, calendar sync (.ics), web push, per-event approval mode, reviews/ratings, payments, multi-place hosts, "ask to join" via share link.
