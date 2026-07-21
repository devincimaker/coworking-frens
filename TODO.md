# TODO

## To Do

- [ ] Deploy the app
  - Configure production environment variables, run a production build, and publish the first deployment.
- [ ] Point a custom domain to it
  - Add the domain to the hosting provider, update DNS records, and verify HTTPS.
- [ ] Add a simple landing page
  - Create a public page that explains Coworking Frens, shows the basic flow, and links clearly into sign-in.
- [ ] Build a native iPhone app
  - Create an iOS client for the coworking flow, including authentication, feed, hosting, invites, and attendance.
- [ ] Add a photo and description to hosted places
  - Let hosts add a place image (upload or URL) and a short description; surface both on the day cards in the feed and on the day detail page.
- [ ] Add Terms of Service and Privacy Policy
  - Draft and publish ToS and privacy policy pages, then link them from the sign-in flow and app footer/navigation.

## In Progress

_No tasks._

## Done

- [x] Add first-run onboarding
  - After first sign-in, ask for username/display name, profile photo, and a short bio before dropping the user into the app.
- [x] Make authentication provider-agnostic
  - Update auth so sign-in is not limited to Google; support a more general provider strategy such as email magic links and configurable OAuth providers.
- [x] Let people customize their profile
  - Add profile settings where users can update their display name and profile image URL.
