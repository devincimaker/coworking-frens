# TODO

## To Do

- [ ] Build a native iPhone app
  - Create an iOS client for the coworking flow, including authentication, feed, hosting, invites, and attendance.
- [ ] Replace free-text amenities with preset options
  - Let hosts choose from a fixed set of amenities instead of typing arbitrary comma-separated text.
  - Store amenities as structured values so feed/day filters and place displays stay consistent.
- [ ] Add an in-app feedback system
  - Give users a simple way to send feedback, bug reports, or feature ideas from inside the app.
  - Store submitted feedback with user, page/context, message, and timestamp so it can be reviewed later.
- [ ] Add Terms of Service and Privacy Policy
  - Draft and publish ToS and privacy policy pages, then link them from the sign-in flow and app footer/navigation.
- [ ] Improve the home profile created during host setup
  - Make newly created homes feel more complete than a bare place record.
  - Prompt hosts for richer home details such as description, photos, amenities, arrival notes, capacity, and general vibe.
- [ ] Improve the landing page copy
  - Better sell the vision and the why behind Coworking Frens, so new visitors quickly understand the emotional and practical value.
  - Rework the headline, supporting copy, and key sections to make the product feel more compelling without becoming generic marketing.

## In Progress

_No tasks._

## Done

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
