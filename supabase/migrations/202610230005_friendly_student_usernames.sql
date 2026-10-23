-- Accept the reviewed adjective-animal format alongside all issued legacy names.
-- No accounts, Auth identifiers, passwords, progress or permissions are changed.
begin;

alter table public.account_profiles drop constraint student_username;
alter table public.account_profiles add constraint student_username check (
  (role = 'student' and username is not null and (
    username ~ '^student-[a-z2-9]{12}$' or
    username ~ '^[a-z]{2,20}-[a-z]{2,20}$'
  )) or
  (role <> 'student' and username is null)
);

commit;
