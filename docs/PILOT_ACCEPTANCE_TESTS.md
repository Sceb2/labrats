# LabRats: live-site pilot acceptance tests

Prepared 6 November 2026 for publication of development to main. Migration 016
has been confirmed installed by the school. Runtime code was tested at
`57c967e`; this checklist adds no application or database behaviour. The previous
main commit was `25f5857f80db1462d9d5a0940fbec5615f027276`.

Use the **published website**, not a downloaded preview, for these tests. Wait
for GitHub Pages to finish deploying main. Keep retention off until step 16.
Record pass/fail against each step; stop and investigate unexpected failures
before handing accounts to pupils. Never send passwords or secret keys in chat.

Use a normal browser window for the administrator and a private/incognito window
for the student. Use one new, temporary student throughout; keep its generated
username and changing passwords privately. Existing accounts
`fictional-chemistry` and `fictional-applied` remain available for comparison.
Do not rerun the old fictional-account rename/seed or earlier migrations.

## Numbered test script

1. **Public website.** Open the live subject-choice page on desktop and a phone.
   Open Chemistry and Applied Science topic selection. Follow the Privacy notice
   link from subject choice and Student Login. **Pass:** current styling loads,
   both subjects open, and the approved notice names Mr Wormstone and the school
   contact. No configuration or loading errors appear.

2. **Administrator and baseline.** In the normal window, open Staff dashboard
   and sign in as administrator. Confirm Overview, Students & classes, Class
   progress, Staff & access, Flashcard packs and Retention & health are available
   (some are under More on mobile). Open each subject's existing TEST CLASS.
   Record class size, topic averages and contributing-student counts before
   adding the new account. **Pass:** both test classes/reports load without a
   missing-migration error. Retention is still disabled.

3. **Create exactly one temporary student.** Students & classes → Chemistry →
   TEST CLASS — Chemistry → + Add students. Change the count from its default
   to **1**, then Generate student accounts. Keep the generated username and
   temporary password privately. **Pass:** exactly one new roster entry appears.
   Class size increases by one, but adding an unattempted student does not lower
   existing topic averages. The generator uses an ordinary adjective-animal
   username; note that this particular account is temporary and delete it at
   step 17.

   If this fails with an origin/preview-address error, check the hosted
   `staff-management` function's `STAFF_ALLOWED_ORIGINS` setting. It must include
   the live website's exact origin (scheme and hostname, no repository path).
   For an ordinary GitHub Pages site under `sceb2.github.io`, that origin is
   `https://sceb2.github.io`. Retain `null` only while downloaded connected
   previews are needed. Do not change the project's keys or enable public signup.

4. **New-account retention baseline — read only.** In Supabase SQL Editor, run
   the query below after replacing the username with the one just generated.
   Privately retain its `user_id` for step 18. **Pass:** `retention_managed` is
   true; `first_login_at` is null before anyone signs in.

   ```sql
   select user_id, username, created_at, first_login_at, retention_managed,
          first_login_at + interval '2 years' as normal_student_expiry
   from public.account_profiles
   where username = 'REPLACE-WITH-NEW-USERNAME';
   ```

5. **First login and password gate.** In the student private window, open Student
   Login and use the new temporary credentials. **Pass:** the student must choose
   their own password before account-tracked practice. A password shorter than
   10 characters is rejected; mismatched confirmation is rejected; a valid new
   password works. No email, real name, date of birth or phone number is requested.
   Guest practice can remain available; that is separate from the account gate.

6. **First-login clock.** Run step 4's same read-only query again. **Pass:** the
   first-login timestamp is now set, the account remains retention-managed and
   normal expiry is two calendar years later. Save that timestamp for comparison
   after the password reset. Sign out and sign back in with the chosen password;
   the temporary password must no longer work.

7. **Active Learning and unaided results.** Student → Chemistry → choose topics →
   Active Learning → Start practice. Use a normal session, not Question browser.
   Answer one question correctly without revealing, answer another incorrectly
   without revealing, then reveal another answer. Record their question codes
   and displayed marks. Retry the incorrect question if offered. **Pass:** marks
   and feedback match the answers; unattempted questions remain N; revealed-only
   questions have no unaided grade; retries do not turn an original failure into
   first-attempt success. A correct answer on one day can initially be C: A needs
   successful recall across several days. Finish the session and wait for saving.

8. **Individual and cohort reporting.** Administrator → Refresh → Students &
   classes → new username → View progress. Compare the question codes/marks
   with step 7. Then Class progress → Chemistry → TEST CLASS — Chemistry.
   **Pass:** the student's saved results appear; participating-student counts
   reflect only graded attempts; untouched questions are excluded from averages;
   the missed question appears in the revisit list unless displaced by the
   existing class's higher-priority questions (find it in Every question).
   Partial and zero marks are distinguished. Retries/reveals do not inflate
   unaided results. Small samples show Limited data where applicable.

9. **One account, two subjects.** Administrator → Students & classes → Applied
   Science → TEST CLASS — Applied Science → Class assignments. Select the same
   new student, choose Add to selected class and update. Do not generate another
   login. In the student window, Change subject → Applied Science, complete a
   short normal practice session and wait for saving. **Pass:** the same login
   works; its Chemistry history remains; its Applied Science progress is separate.
   Individual and cohort reports show the correct subject's results when the
   administrator switches subjects.

10. **Flashcards.** Use an existing published pack; if none is available, import,
    preview, save and publish the approved sample through Flashcard packs, without
    replacing someone else's pack. Student → choose its Chemistry topic →
    Flashcards → Start flashcards. Flip a card; flip it back; choose Got it. Mark
    another Not yet and continue far enough to check a permitted retry. Finish
    the session. **Pass:** assessment is disabled before revealing; the flip
    works; missed cards return after other cards where possible, at most once;
    retries do not improve the original rating. Flashcard reports update in their
    own tab without changing Active Learning marks. Repeat the flip on a phone.

11. **Offline saving and another device.** Open an Active Learning question online
    as the new student, then disconnect that device (airplane mode with Wi-Fi off,
    or desktop browser Network → Offline). Submit an answer. **Pass:** practice
    continues on the loaded page and a waiting-to-save indicator appears. Keep
    the tab open, restore the connection and wait for All progress saved. Refresh
    the administrator's report and sign into the same student account on a second
    online browser/device. **Pass:** the attempt is present once, without losing
    previous results. Do not close the offline tab while results are pending.

12. **Shared-device isolation.** Wait until everything is saved, then sign out the
    new student. In that same private tab, sign in as an existing fictional student.
    **Pass:** the displayed identity and history belong to that other account;
    the new student's cached results are not attached to it. Open the staff URL
    in this student context: no administrator/class results should be shown.

13. **Guest-mode preservation.** With that fictional student's session still
    present, go to Student Login → Continue browser-only practice. Note its
    account-report totals first. Practise as a guest and switch Active Learning →
    Flashcards → Active Learning, then change subject. Return deliberately to
    signed-in practice. **Pass:** guest work is not added to either account's
    results. Guest question history is browser-local; guest flashcard results are
    not retained across reload. Choosing guest does not secretly resume tracking.

14. **Teacher permissions.** Use an invited teacher account in a separate browser
    profile. If it has not been assigned yet, administrator → Staff & access →
    grant Chemistry subject access; Students & classes → TEST CLASS — Chemistry
    → Class assignments → add that teacher. **Pass:** it can see individual and
    class progress for its assigned class/subject. Unassigned classes/subjects and
    administrator-only staff, retention and permanent-deletion controls are absent.
    Compare access with that teacher's actual grants; do not remove legitimate
    access merely to manufacture a test. If there is no teacher account yet,
    complete its invitation/setup and this check before giving teachers access
    to pilot data.

15. **Password reset and disabling.** Sign into the new student again and keep its
    tab open. Administrator → that student's Actions → Reset password. **Pass:**
    the old password stops working and old sessions lose account access on their
    next check/refresh; the replacement temporary password requires a new personal
    password. Existing history survives. Repeat step 4's query: the first-login
    timestamp must be unchanged. Administrator → new student's View progress →
    Student account controls → Disable. **Pass:** account access stops. Re-enable
    it and sign in again with the latest chosen password; progress is preserved.

16. **Enable retention only after the live checks above pass.** Administrator →
    Retention & health. Review any accounts shown as due, tick the policy/schedule
    confirmation and enable the policy if it is still disabled. This enables real
    deletion under the agreed policy. In Supabase SQL Editor run:

    ```sql
    select public.run_retention_cleanup();
    ```

    **Pass:** status is success and failures is zero. Refresh Retention & health:
    the completed run appears and its deletion counts are understandable. The
    already-confirmed Sunday 03:00 UTC schedule remains active. Email alerts stay
    off; arrange an administrator check after each Sunday run. A successful run
    with zero due accounts checks execution, not an actual expiry deletion.

17. **Delete only the new temporary student.** Administrator → its View progress
    → Student account controls → Permanently delete account and results. Type
    its exact generated username and confirm. **Pass:** it disappears from both
    class rosters, individual reports and cohort totals; it can no longer sign
    in. The two original fictional students remain. Keep useful published sample
    packs; do not delete teaching content merely to clear this account.

18. **Verify complete account deletion — read only.** In SQL Editor replace the
    UUID below with the `user_id` privately recorded at step 4, then run the whole
    query. **Pass:** all five counts are zero.

    ```sql
    with target as (select 'REPLACE-WITH-TEMPORARY-USER-ID'::uuid as id)
    select
      (select count(*) from auth.users u where u.id=t.id) as auth_accounts,
      (select count(*) from public.account_profiles p where p.user_id=t.id) as profiles,
      (select count(*) from public.class_students s where s.student_id=t.id) as memberships,
      (select count(*) from public.learning_attempts a where a.student_id=t.id) as question_events,
      (select count(*) from public.flashcard_attempts a where a.student_id=t.id) as flashcard_events
    from target t;
    ```

## After passing

Create one separate normal account per real pilot student and assign the intended
classes/subjects. Distribute temporary credentials privately; do not share the
fictional logins or reuse this deleted temporary account. Give students the live
URL and point out the privacy notice and in-person recovery through Mr Wormstone.
Even a small pilot produces real pupil data. Keep any school-held username mapping
in the school's agreed restricted location; discard unnecessary credential exports.

The school has confirmed migration 016, fictional account cleanup, both original
logins and the active Cron schedule. The hosted acceptance tests above remain
operator actions: preparing or publishing this checklist does not mark them passed.
Local automated coverage at runtime commit `57c967e` passed: build, 308 software
checks, 59 unit tests, full disposable account integration, and mobile/desktop
staff layout tests. No hosted credentials or pupil records were used for those.
