# School staff and adaptive-practice prototype

This is a fictional-data development prototype on `feature/student-logins`.
Neither pushing this branch nor downloading a preview updates the live site.
The user has reported successful hosted development-project checks for migrations
001–005, account creation, sign-in, reporting, teacher assignment and resets,
legacy usernames, and exclusion of an unassigned class/student. See the
[DPO prototype review](DPO_PROTOTYPE_REVIEW.md) for evidence, data handling and
remaining school decisions. Production hosting/origin validation remains separate.

## What works

- Administrators invite teachers; public registration remains disabled.
- Staff sign in with email/password, choose their own initial password, create
  classes, and generate batches of 1–100 random student usernames/passwords.
  New usernames use the reviewed `adjective-animal` vocabulary, for example
  `brave-otter`; previously issued `student-…` usernames continue to work.
- Students supply no real name, email, phone, birthday or selected answers.
  Synthetic `@students.invalid` Auth identifiers are generated internally.
- Administrators assign teachers and existing students to classes, allowing one
  student account and shared progress across classes. Teachers cannot claim an
  arbitrary existing student by guessing a username.
- Teachers see only assigned students: last sign-in, 1/7/30-day unaided correct
  counts, topic coverage/marks, every question's results and A–E revision guidance.
- Teacher-managed student resets and administrator-managed teacher resets revoke
  sessions and require a new password. Disabled staff cannot continue reading.
- Administrators can disable/enable accounts and explicitly delete a student
  account, its memberships and its results after exact username confirmation.
- Retention has a nullable, administrator-only **draft** setting. It does not run
  automatic deletion. Leave it blank until agreed with the school/DPO.

Email/password sign-in is the school's selected staff method. It still collects
staff email addresses and provider operational metadata; it does not establish
that this method always collects less information than configured school SSO.

## Apply the new migration

In the development Supabase project, SQL Editor → **New query**, copy the entire
`supabase/migrations/202610230004_staff_prototype.sql` file, including `begin;`
and `commit;`, and Run. Do not rerun migrations 001–003. Migration 004 also closes
the staff password gate for existing staff permissions; a trusted operator must
ensure a staff account's own initial password change has completed.

## Update an existing prototype to friendly usernames

If migrations 001–004 and the staff service are already installed:

1. SQL Editor → **New query**. Paste the entire
   `supabase/migrations/202610230005_friendly_student_usernames.sql`, from
   `begin;` through `commit;`, and Run. Do not append it to an old query or rerun
   migrations 001–004. This broadens the username constraint without changing
   existing accounts, results or permissions.
2. Edge Functions → **staff-management** → code editor. Replace the contents of
   its existing **index.ts** with the updated generated
   `supabase/functions/staff-management/index.ts` and deploy the update. Keep the
   function name and Verify JWT setting described below. No new file or function
   is required.
3. Download fresh copies of `student-site-preview.html` and `staff-preview.html`.
   Previously downloaded student previews only recognise the old username format.
4. Generate two fictional students in a test class. Confirm the names look like
   `adjective-animal`, then sign in through the refreshed student preview, choose
   a password, submit an answer, and check the teacher's report/reset workflow.
   Also sign in once using an existing `student-…` account.

See [the reviewed vocabulary](USERNAME_WORDLIST_DRAFT.md) for the 16,384 possible
pairs and collision handling. Existing accounts are not renamed or recreated.
For a fresh project, apply all six migrations in filename order.

## Apply the review fixes (migration 006)

After migrations 001–005, use SQL Editor → **New query** and run the entire
`supabase/migrations/202610230006_shared_password_reset_leases.sql`, including
`begin;` and `commit;`. Do not rerun the earlier migrations. Existing account
identifiers, passwords, class memberships and learning history are preserved.
Existing pending reset leases are preserved; interrupted resets can be retried
after their two-minute lease expires. The updated operator tool must be used
with this migration; old unleased reset calls fail clearly.

Download fresh `staff-preview.html` and `student-site-preview.html` files. No
Edge Function redeployment is required for these review fixes: the existing
staff RPC signatures are preserved and its generated server bundle is unchanged.
The refreshed frontend and SQL provide the changes.

Hosted checks: remove an assigned class while its teacher has a report open,
then focus the teacher window; the report and roster must clear. Reassign the
class and confirm reports return. Test a normal student reset, new password
choice and preserved marks. Reveal a previously unattempted question, then in a
new session submit it without help; its first unaided mark should appear in the
teacher report. A displayed rejected attempt must not block other valid saves.
Automated local checks cover these cases; the hosted update remains to be run.

## Deploy the staff service

Account creation/reset/deletion needs a trusted server. Browser code contains
only public settings. The generated single-file Edge Function is
`supabase/functions/staff-management/index.ts`; its private keys come from
Supabase's built-in runtime environment, never from the download or GitHub.

Using Supabase Dashboard → **Edge Functions**, create a function named exactly
`staff-management`. Use the code editor, replace its starter `index.ts` with the
complete generated file, and deploy. The deployment must use **Verify JWT = off**
(sometimes labelled legacy JWT verification). Authentication is enforced in the
handler using Auth `getUser` plus PostgreSQL's active/live staff-session check.
This supports current Auth signing keys without relying on the legacy gateway
JWT verifier. Never remove those checks or expose the service-role key.

Alternatively, from an authorized private Supabase CLI session:

```sh
supabase functions deploy staff-management --project-ref PROJECT_REF --no-verify-jwt
```

Do not paste access tokens, service keys, passwords or database credentials into
chat, HTML or repository files. No additional secret is required in browser
configuration. Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` to the hosted function.

The function defaults to CORS origin `null` so downloaded fictional-data previews
work. For a hosted staff site, set the function secret `STAFF_ALLOWED_ORIGINS` to
its exact origin (and `null` only while downloaded previews are needed), comma
separated if multiple. Origin checks supplement bearer/session authorization;
they are not the authorization boundary. No third-party email is sent by this
prototype. Administrators copy one-time invitation codes for private delivery.

## One-time administrator setup

1. Authentication → Users → Add user → **Create new user**. Use the intended
   administrator's school email and a private temporary password of 10+ characters;
   auto-confirm the email. Do not choose “send invitation” for this prototype.
2. In a new SQL query, replace the placeholder below with that exact email:

   ```sql
   insert into public.account_profiles(user_id,role,username,must_change_password)
   select id,'admin',null,true from auth.users
   where lower(email)=lower('REPLACE_WITH_YOUR_SCHOOL_EMAIL')
   returning user_id,role;
   ```

   Exactly one row should return. Do not rerun it to promote additional users
   casually; existing profiles are intentionally not overwritten.
3. Download `staff-preview.html` using GitHub's **Download raw file** arrow. Open
   it in Chrome/Edge, sign in and choose a new private password. This is separate
   from the Supabase dashboard account; no Supabase administrator keys are entered.

## Fictional-data demonstration

1. As administrator, create a class, invite a fictional teacher account and copy
   the private code. A real mailbox is not needed for local tests. In the hosted
   pilot, use a school-controlled test mailbox/address approved for this test.
2. In a separate browser session, open the same staff preview → Accept a staff
   invitation → enter the code → choose a password. The teacher initially sees
   no administrator-created classes until assigned.
3. As administrator, assign the teacher to the class. The teacher can generate
   fictional students, then download their private credential CSV if needed.
4. In `student-site-preview.html`, sign in as a fictional student, choose the
   required initial password, select topics and start Adaptive practice. Submit
   some correct/partial/incorrect answers and try a reveal/retry. Check offline
   waiting and reconnect before closing the tab.
5. Back in the teacher preview, refresh and View progress. Verify marks, ratings,
   topic coverage, priorities, last login and recent correct counts. A reveal or
   retry never awards an unaided correct count.
6. Test a student reset: old sessions should lose access; the private replacement
   password should require another own-password choice. Original progress stays.
7. Give the same account a second class through the administrator. Progress is
   shared; a teacher with neither class has no access. Disable the test teacher
   and verify their report data clears when the session is checked again.
8. Dismiss or sign out to clear displayed credentials. Delete downloaded CSVs
   after private distribution. Delete fictional accounts through the admin UI
   when the demonstration is finished.

## Invitations, resets and failure handling

The administrator creates a fresh Auth user with an unknown random password,
then receives a one-use Supabase recovery token for setup. Teachers enter it as
their invitation code and must choose a password before gaining staff access.
This is an administrator invitation workflow, not public registration. The code
is a secret: share privately, keep it out of chat/GitHub, and respect the project's
Auth token expiry. Existing addresses are rejected rather than reused/promoted.
Expired/lost codes can be replaced with the administrator's teacher-reset action.
Automated invitation email delivery and staff self-service email recovery are
deferred until a school-approved SMTP sender/hosting URL is configured.

Each privileged HTTP mutation has a unique actor-owned request ID. Replaying it
does not rerun account creation. Up to ten privileged operations per staff user
per minute are allowed; a batch counts as one operation. Credentials are returned
once and never stored in public tables, localStorage or application logs.
Partial batches return the completed credentials and a warning. If a network
failure loses the response, refresh the class before retrying; reset accounts
whose temporary credentials were lost. An unexpected worker termination between
Auth creation and profile creation can leave an unusable Auth-only account for
a private operator to remove. There is no background orphan cleanup yet.

Resets use a two-minute database lease and an operation ID. Concurrent resets
cannot overlap or complete someone else's operation. The target remains disabled
and its password-change flag remains set during the Auth password replacement;
sessions are deleted both before and after. Failure leaves it disabled. Retry a
failed reset after two minutes with an authorized staff account. A teacher reset
affects that student's one account across all of their classes.

Online staff verification now refreshes class/student scope every 30 seconds and
on focus/reconnection. Scope changes clear the current report and private details;
account revocation clears the staff page. Checks pause during an active staff
action. Offline pages and already exported/copied data cannot be recalled.

Staff reads use the caller's RLS permissions; service-role operations recheck live
staff sessions and scope at each privileged step. User-editable Auth metadata does
not grant roles. Staff and student browser sessions use separate tab-storage keys.
The staff page stores only its own Auth/session/profile data; reports, class lists,
passwords and codes stay in memory. Sign-out clears the page's staff data. Staff
tools require a connection; student practice has the offline queue. The existing
public `teacher.html` bank editor is a separate tool and has no private reports.

## Validation and remaining launch work

```sh
npm ci
npm run build
npm test
npm run test:auth-local
```

If a trusted Deno 2 executable is available, set `OCR_DENO_EXECUTABLE` to its
absolute path when running the local suite. The runner also starts the exact
generated Edge Function with loopback-only networking and disposable local
credentials; staff API integration checks then use that native Deno bundle.
The runtime is optional for the standard Node/browser suite, not a repository
dependency. Both paths must continue to test real Auth/database permissions.

The disposable real PostgreSQL/GoTrue/PostgREST stack tests Auth, staff API, RLS,
live sessions, one-use setup, scope, batches, duplicate requests, reset races,
retention permissions and deletion. Browser tests cover the complete administrator
→ teacher → student → report/reset flow using exact generated previews, mobile
staff layout, and student adaptive practice. Managed cloud Chromium blocks `file:`;
automated preview checks serve the same HTML over HTTP. Direct file opening and
the hosted Edge Function must still be verified manually in the development
project. Local success does not certify the hosted deployment.

Before real-student rollout: complete hosted/hosting-origin validation; agree and
implement retention/deletion for application data, Auth accounts, audit records,
logs, backups and exports; review staff invitation delivery/recovery, staff MFA,
support/incident arrangements and processor terms; review chemistry and scheduling
with teachers. The policy field alone does not implement retention. Keep the
publishing branch unchanged until a deliberate release decision.
