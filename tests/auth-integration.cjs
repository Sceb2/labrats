'use strict';
// Real Supabase tests. Use only a disposable LOCAL stack, never a hosted student project.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createClient} = require('@supabase/supabase-js');
const {generateUsername, generatePassword, provisionStudent, resetStudent} = require('../scripts/account-service.cjs');
const {studentEmail} = require('../src/student-identity.cjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const url = process.env.SUPABASE_TEST_URL;
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Set SUPABASE_TEST_URL to a disposable local stack. Hosted tests are intentionally refused.');
const pub = process.env.SUPABASE_TEST_ANON_KEY, secret = process.env.SUPABASE_TEST_SERVICE_KEY;
if (!pub || !secret) throw new Error('Local test keys are required. Never print or commit them.');
const options = {auth: {persistSession: false, autoRefreshToken: false}};
const client = () => createClient(url, pub, options);
const admin = createClient(url, secret, options);
const ok = result => {assert.equal(result.error, null, result.error?.message); return result.data;};

test('real Auth, password lifecycle, account isolation and class access', async t => {
  const ids = [], classIds = [];
  const students = [0, 1].map(() => ({username: generateUsername(), password: generatePassword()}));
  const clients = [client(), client()];
  let teacher, outsider;
  try {
    for (let i = 0; i < 2; i++) {
      const cls = ok(await admin.from('school_classes').insert({label: `Fictional class ${i}`}).select('id').single());
      classIds.push(cls.id);
      ids.push(await provisionStudent(admin, {...students[i], classId: cls.id}));
    }
    await t.test('public signup is disabled', async () => {
      const result = await client().auth.signUp({email: studentEmail(generateUsername()), password: generatePassword()});
      assert.ok(result.error); assert.equal(result.data.user, null);
    });
    await t.test('anonymous access and password-reset RPC are denied', async () => {
      assert.ok((await client().from('account_profiles').select('*')).error);
      assert.ok((await client().rpc('prepare_student_password_reset', {target: ids[0]})).error);
    });
    await t.test('first login requires a new password and records latest login', async () => {
      for (let i = 0; i < 2; i++) ok(await clients[i].auth.signInWithPassword({email: studentEmail(students[i].username), password: students[i].password}));
      const profile = ok(await clients[0].from('account_profiles').select('*').single());
      assert.equal(profile.must_change_password, true); assert.ok(profile.last_login_at);
      assert.deepEqual(ok(await clients[0].from('school_classes').select('*')), []);
    });
    await t.test('students cannot see another profile or change their own permissions', async () => {
      assert.equal(ok(await clients[0].from('account_profiles').select('*')).length, 1);
      assert.deepEqual(ok(await clients[0].from('account_profiles').select('*').eq('user_id', ids[1])), []);
      assert.ok((await clients[0].from('account_profiles').update({role: 'admin', must_change_password: false}).eq('user_id', ids[0])).error);
      assert.ok((await clients[0].from('class_students').insert({class_id: classIds[1], student_id: ids[0]})).error);
      assert.ok((await clients[0].rpc('prepare_student_password_reset', {target: ids[1]})).error);
    });
    await t.test('Auth metadata cannot grant privileges or bypass password gate', async () => {
      ok(await clients[0].auth.updateUser({data: {role: 'admin', must_change_password: false}}));
      const p = ok(await clients[0].from('account_profiles').select('*').single());
      assert.equal(p.role, 'student'); assert.equal(p.must_change_password, true);
    });
    await t.test('real password change clears the gate; class access remains isolated', async () => {
      const tooShort = await clients[0].auth.updateUser({password: generatePassword().slice(0, 9)});
      assert.ok(tooShort.error);
      assert.equal(ok(await clients[0].from('account_profiles').select('*').single()).must_change_password, true);
      students[0].newPassword = generatePassword().slice(0, 10);
      ok(await clients[0].auth.updateUser({password: students[0].newPassword}));
      assert.equal(ok(await clients[0].from('account_profiles').select('*').single()).must_change_password, false);
      assert.deepEqual(ok(await clients[0].from('school_classes').select('id')).map(x => x.id), [classIds[0]]);
      assert.equal(ok(await clients[0].from('class_students').select('*')).length, 1);
    });
    await t.test('student identity cannot be changed to a real email address', async () => {
      assert.ok((await clients[0].auth.updateUser({email: 'fictional@school.example'})).error);
      assert.equal(ok(await clients[0].auth.getUser()).user.email, studentEmail(students[0].username));
    });
    await t.test('inactive students cannot access class records', async () => {
      ok(await admin.from('account_profiles').update({active: false}).eq('user_id', ids[0]));
      assert.deepEqual(ok(await clients[0].from('school_classes').select('*')), []);
      ok(await admin.from('account_profiles').update({active: true}).eq('user_id', ids[0]));
    });
    await t.test('assigned teachers see their students; unassigned teachers cannot', async () => {
      const makeTeacher = async () => {
        const password = generatePassword(), email = `${generateUsername()}@staff.invalid`;
        const {user} = ok(await admin.auth.admin.createUser({email, password, email_confirm: true})); ids.push(user.id);
        ok(await admin.from('account_profiles').insert({user_id: user.id, role: 'teacher', must_change_password: false}));
        const c = client(); ok(await c.auth.signInWithPassword({email, password})); return {c, id: user.id};
      };
      teacher = await makeTeacher(); outsider = await makeTeacher();
      ok(await admin.from('class_teachers').insert({class_id: classIds[0], teacher_id: teacher.id}));
      assert.equal(ok(await teacher.c.from('account_profiles').select('*').eq('role', 'student')).length, 1);
      assert.equal(ok(await outsider.c.from('account_profiles').select('*').eq('role', 'student')).length, 0);
      // One student can belong to multiple classes without exposing that other class to this teacher.
      ok(await admin.from('class_students').insert({class_id: classIds[1], student_id: ids[0]}));
      assert.equal(ok(await teacher.c.from('class_students').select('*')).length, 1);
    });
    await t.test('teacher-assisted reset revokes stale sessions and old passwords', async () => {
      const replacement = generatePassword();
      await resetStudent(admin, students[0].username, replacement);
      assert.deepEqual(ok(await clients[0].from('account_profiles').select('*')), []);
      assert.ok((await client().auth.signInWithPassword({email: studentEmail(students[0].username), password: students[0].newPassword})).error);
      const fresh = client(); ok(await fresh.auth.signInWithPassword({email: studentEmail(students[0].username), password: replacement}));
      assert.equal(ok(await fresh.from('account_profiles').select('*').single()).must_change_password, true);
      await fresh.auth.signOut();
    });
    await t.test('failed class assignment rolls back incomplete Auth accounts', async () => {
      const username = generateUsername();
      await assert.rejects(() => provisionStudent(admin, {username, password: generatePassword(), classId: '00000000-0000-0000-0000-000000000000'}));
      assert.equal(ok(await admin.from('account_profiles').select('*').eq('username', username)).length, 0);
      const {users} = ok(await admin.auth.admin.listUsers({page: 1, perPage: 1000}));
      assert.equal(users.some(user => user.email === studentEmail(username)), false);
    });
    await t.test('operator CLI provisions and resets private credentials without printing passwords', async () => {
      const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-operator-test-'));
      const invoke = args => spawnSync(process.execPath, ['scripts/student-accounts.cjs', ...args], {
        cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
        env: {...process.env, SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret}
      });
      const read = filename => fs.readFileSync(filename, 'utf8').trim().split('\n').slice(1).map(line => {
        const [username, password, state] = line.split(','); return {username, password, state};
      });
      let rows = [];
      try {
        const filename = path.join(folder, 'batch.csv');
        const result = invoke(['create-students', '--class', classIds[0], '--count', '2', '--out', filename]);
        assert.equal(result.status, 0, result.stderr); rows = read(filename);
        assert.equal(rows.length, 2); assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
        const profiles = ok(await admin.from('account_profiles').select('user_id').in('username', rows.map(row => row.username)));
        ids.push(...profiles.map(p => p.user_id));
        for (const row of rows) {
          assert.equal(row.state, 'ready'); assert.equal(result.stdout.includes(row.password), false);
          const c = client(); ok(await c.auth.signInWithPassword({email: studentEmail(row.username), password: row.password})); await c.auth.signOut();
        }
        const resetFile = path.join(folder, 'reset.csv');
        const reset = invoke(['reset-student', '--username', rows[0].username, '--out', resetFile]);
        assert.equal(reset.status, 0, reset.stderr);
        const replacement = read(resetFile)[0]; assert.equal(replacement.state, 'ready');
        assert.equal(reset.stdout.includes(replacement.password), false);
        assert.ok((await client().auth.signInWithPassword({email: studentEmail(rows[0].username), password: rows[0].password})).error);
        const c = client(); ok(await c.auth.signInWithPassword({email: studentEmail(replacement.username), password: replacement.password})); await c.auth.signOut();
      } finally {fs.rmSync(folder, {recursive: true, force: true});}
    });
  } finally {
    for (const c of [...clients, teacher?.c, outsider?.c].filter(Boolean)) await c.auth.signOut();
    for (const id of classIds) await admin.from('school_classes').delete().eq('id', id);
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
});
