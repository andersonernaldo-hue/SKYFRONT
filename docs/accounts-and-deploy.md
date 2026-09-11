# Accounts, Local Saves and Deployment

## How sign-in works (optional, never forced)

The game starts **directly as guest** — there is no login screen on launch, and
progress saves locally from the first second. Signing in is entirely the player's
choice, at any moment:

1. Tap the **account chip** (top-left of the main menu).
2. Choose **Sign in with Google** in the account panel.
3. A dismissible dialog opens with Google's official button; **Cancel** closes it
   with no effect on the session.

Signing in labels a **separate save slot** with the Google name/photo. Signing out
returns to the guest profile and its own progress. If Google is unavailable, the
dialog says so and the game continues unaffected as guest.

### Important limitation

There is **no backend**, so this is not cloud saving:

- Progress is stored in this browser's `localStorage`, on this PC or phone.
- Signing in **does not sync progress between devices**. The same Google account on a
  phone and a laptop has two independent saves.
- The Google ID token is **not verified on a server**. Claims only label the profile
  and choose a save slot; they are not a security boundary, and a user can edit their
  own local save regardless.
- Clearing browser data, or private browsing, erases progress.

Real cross-device sync would require a server (or a service such as Firebase) to
verify the token and store saves. That is a separate feature, not included here.

## Save slots

| Profile | Storage key |
| --- | --- |
| Guest | `skyfront_ace_save_v2` |
| Google | `skyfront_ace_save_v2::g_<google-sub>` |

Guest deliberately reuses the original key, so **progress created before accounts
existed is preserved** and simply becomes the guest profile.

When you sign in with Google for the first time on a device that already has guest
progress, the game offers to **copy that progress** into the account, or start fresh.
Copying leaves the guest profile untouched.

## Resetting progress

Available from the account panel (top-left chip) and from Settings. Selecting it
shows a warning that names the profile and states the action cannot be undone; a
second, explicitly labelled button performs the deletion. **Only the active profile
is cleared** — resetting a Google profile never touches guest progress, and vice
versa. The chosen language is kept.

## Google Cloud setup

1. Google Cloud Console → **APIs & Services → OAuth consent screen**. Choose
   *External*, fill in app name and support email, and add yourself as a test user
   while the app is unpublished.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type
   **Web application**.
3. Under **Authorized JavaScript origins**, add the exact origins that will serve
   the game:
   - `https://<your-site>.netlify.app`
   - your custom domain, if any
   - `http://localhost:5173` for local development

   Google Identity Services uses these origins. A redirect URI is not required for
   the rendered button. Origins must not include a path or trailing slash.
4. Copy the **Client ID** (`...apps.googleusercontent.com`).

## Netlify

1. Connect the repository. `netlify.toml` already sets the build command
   (`npm run build`), the publish directory (`dist`) and Node 20.
2. **Site configuration → Environment variables**, add:

   ```
   VITE_GOOGLE_CLIENT_ID = <your-client-id>.apps.googleusercontent.com
   ```

3. Redeploy. Vite inlines the value at build time, so the variable must exist
   **before** the build; changing it later requires a new deploy.
4. Add the final Netlify URL to the authorized origins in step 3 above.

If the variable is missing, the sign-in screen says Google is not configured and
offers a field to paste a Client ID for local testing only; that value is stored in
the browser, not in the build.

## Verification

`node scripts/verify.mjs` covers save-slot isolation, guest key preservation,
per-profile reset, account record validation, ID-token claim checks (wrong audience,
wrong issuer, expired, missing subject, non-ASCII names) and rendering of all three
account screens in Spanish, English and Portuguese.

Not covered automatically, worth checking in a browser after deploying: the real
Google popup, the account chip on a small screen, and behaviour when third-party
cookies are blocked (the guest path must remain usable).
