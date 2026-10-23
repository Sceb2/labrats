# School revision tool: prototype review for the DPO

Status: fictional-data prototype on `feature/student-logins`. The live publishing
branch has not been updated. This describes the implementation at commit
`19b2832` and the development-project checks reported by the school during setup.
Production arrangements and school approval remain outstanding.

## Purpose and proposed use

The tool provides chemistry revision for one school. Students can practise
without an account, keeping progress in that browser. An account enables progress
to follow the student across devices and lets assigned teachers see revision
results and priorities. Adaptive practice varies question frequency using prior
unaided marks and elapsed time. Random practice remains available.

Teachers generate student accounts in batches. Students do not supply their real
name, email address, date of birth or telephone number. New usernames combine a
reviewed adjective and animal, for example `brave-otter`. There are 16,384 possible
pairs. Previously issued `student-…` identifiers continue to work.

This is **pseudonymous personal data**, not anonymous data. A teacher can associate
a username with a student, and account history can describe that student's
learning. Any school-held record linking usernames to students needs its own
access and retention arrangements.

## Data held and why

| Data | Location and purpose |
| --- | --- |
| Student account UUID, random username, role, active state, password-change requirement, creation time and most recent login | Supabase account profile; sign-in, access control and teacher support. |
| Generated identifier such as `brave-otter@students.invalid`, password hash and authentication/session records | Supabase Auth; supports username/password sign-in. The generated address is not a real student mailbox. |
| Class labels and teacher/student memberships | Supabase application tables; determines which teachers can access each student. One student account can belong to several classes with shared progress. |
| Question ID, question-bank/scoring versions, earned and maximum marks, reveal/retry flags, attempt and receipt times, session mode, and event/encounter IDs and sequence | Supabase learning history; progress, reliable syncing, first-attempt reporting and adaptive selection. |
| Staff email address, Auth credentials/session records, role and profile timestamps/state | Supabase Auth and profiles; administrator-invited staff sign-in and access management. |
| Privileged action metadata: staff actor, request ID, action, target identifier and timestamp | Supabase application audit table; duplicate-operation protection, rate limiting and operational review. No passwords, invitation codes or answer contents are included in this table. |
| Draft retention period and update time; temporary reset coordination identifiers/timestamps | Supabase application tables; proposed school policy and safe concurrent password resets. The retention value does not schedule deletion. |
| IP addresses, request/device information and security/operational records collected by providers | Provider-managed systems. Exact fields, retention, access and processing locations require confirmation with the hosting and Supabase arrangements. |

The signed-in learning API does not accept or retain students' selected answers
or free-text responses. Answer inputs exist in page memory while practising;
metadata records the resulting marks and whether help or retries were used.
Question content and the version catalogue are shared teaching material.

## Access and credentials

- Students can access their own account progress. Public student registration
  is disabled; teachers create accounts and distribute credentials privately.
- Teachers can see assigned students' results, topic coverage, revision
  priorities, A–E guidance, most recent login and unaided correct counts over
  1, 7 and 30 days. They can reset assigned students' passwords.
- School administrators invite teachers, assign accounts to classes, manage
  account activation, reset teacher passwords and delete student accounts.
- Database Row Level Security and server permission checks enforce scope.
  User-editable Auth metadata does not grant a role. The trusted account service
  uses a privileged runtime key; browser code contains only public configuration.
- Staff setup currently uses private one-use invitation codes. Automated
  invitation email and staff self-service email recovery are not implemented.
  Students ask a teacher for password recovery; no student mailbox is needed.
- The configured minimum password length is 10 characters. Initial and reset
  passwords require the recipient to choose a new password. Resets revoke prior
  sessions and preserve learning history.
- Temporary credentials are displayed to authorized staff and may be downloaded
  as a private CSV. They are not stored in application database tables. The
  school must control distribution and disposal of these exports and codes.

## Browser and network handling

Downloaded development previews embed the public app assets and connect to the
development Supabase project for authentication and account data. A future
hosted release also involves the static-site host and its request logs. The
production origin and hosting arrangements have not yet been finalized.

Signed-in sessions and metadata caches/queues use tab `sessionStorage`, with an
in-memory fallback. Staff reports and generated credentials stay in page memory.
Guest progress remains separately in browser storage and is not imported into
accounts automatically. The account learning API excludes raw answer contents;
guest storage is a separate, pre-existing browser-only mode.

Offline attempts queue until connection returns, with a visible waiting-to-save
message. Keep the tab open until syncing completes: closing it or losing browser
storage can lose unsaved work. Sign-out clears that account's local session and
caches and warns before discarding waiting attempts. Browser restoration or tab
duplication can preserve tab storage, so closing a tab is not a substitute for
signing out on a shared device. An offline page cannot immediately receive a
remote revocation; server permission checks apply when requests resume.

The project dashboard identifies the **primary database as Ireland**. This does
not establish that all Auth, Edge Function, logging, backup, support or other
processing occurs in Ireland or the EU. Confirm those processing locations and
any transfer arrangements before making a residency commitment to the school.

## Adaptive practice and educational interpretation

A–E icons are revision guidance, not exam grades or a validated mastery measure.
First unaided answers supply proportional marks; reveals and retries are
recorded separately and do not improve that unaided score. Repeated practice on
one day cannot alone produce an A: the prototype caps evidence from one UTC date
at C and two dates at B. New questions are explicitly labelled `E · new`, without
recording a failed answer. Ratings can fall as evidence gets older.

The same algorithm supplies student and teacher displays. Ratings are derived
from the attempt history rather than stored in another grade table. The app
changes practice suggestions; it does not automatically set school grades or
disciplinary outcomes. Marks and attempt times are client-reported revision
records, not tamper-proof assessment evidence. Teachers should review the
educational interpretation and the school should explain adaptive processing
in its privacy information. See [the algorithm](ADAPTIVE_PRACTICE.md).

## Retention and deletion

The administrator can record a proposed retention period, but **automatic
retention/deletion is not implemented**. No school retention period has been
established by this document. The school needs to decide the period, its starting
point and what should happen when a student leaves or becomes inactive.

Administrator deletion currently removes the student's Auth account, profile,
class memberships and associated learning-attempt rows from the active system.
This does not establish immediate removal from provider logs, backups, existing
exports or every audit reference. A complete policy must cover those records,
staff accounts, browser data and any school-held username mapping, including
how deletion applies after restoring a backup.

## Evidence completed

Automated local checks passed against disposable PostgreSQL, Supabase Auth and
PostgREST, including the generated Edge Function running in Deno. They cover
account isolation, RLS, password/session gates, offline syncing, duplicate events,
teacher scope, private invitations, concurrent creation/reset behavior, deletion,
and the administrator–teacher–student browser workflow. All 244 existing software
checks and 16 auth/progress/adaptive unit tests also passed. These checks are not
an independent penetration test or an assessment of chemistry accuracy.

The school user reported successful development-project checks for migrations
001–005 and the updated account service, new adjective–animal accounts, existing
usernames, student sign-in and password choice, saved practice and staff reports,
teacher class assignment, password reset with preserved progress, and exclusion
of an unassigned class and its student. Offline syncing was reported successful
in the earlier account-progress pilot. These are user-reported hosted checks,
separate from the automated local evidence.

## Decisions before a real-student pilot

1. Confirm the school's controller/processor responsibilities, purpose and lawful
   basis, student/parent/staff privacy information and whether a DPIA is required.
2. Review processor terms, subprocessors, hosting, processing regions and any
   international transfer arrangements; database region alone is insufficient.
3. Agree retention and implement the corresponding deletion process, including
   Auth, audit/operational data, backups, exports and the school's username mapping.
4. Set production hosting/origins and test the deployed site on school devices
   and a classroom's shared network. Configure the staff function's allowed
   origins for the actual host; its current `null` origin supports downloaded
   development previews. Review Auth rate limits under classroom use.
5. Agree staff invitation/recovery, staff MFA, administrator access, credential
   distribution and lost-device/shared-browser procedures.
6. Assign ownership for support, incident response, data-access/correction/deletion
   requests and verifying that disabled/leaving staff lose access.
7. Review question scoring and adaptive guidance with teachers, and agree how to
   explain new-question labels, confidence caps and client-reported results.

## Suggested fictional-data demonstration

Show a teacher generating an adjective–animal student account, then a student
signing in without providing an email address, choosing a password and submitting
an answer in Adaptive practice. Show the waiting-to-save indicator offline and
successful syncing after reconnecting. Open the teacher's report, demonstrate
that an unassigned class is absent, and show a teacher-managed reset preserving
progress. Finish by showing that the retention field is a draft setting and
discussing the decisions above rather than presenting it as automatic deletion.

Implementation/setup: [staff prototype](STAFF_PROTOTYPE.md),
[progress storage and syncing](PROGRESS_SYNC.md),
[reviewed username vocabulary](USERNAME_WORDLIST_DRAFT.md).
