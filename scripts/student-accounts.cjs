#!/usr/bin/env node
'use strict';
// Trusted operator tool. Never run on GitHub Pages or put its secret key in auth-config.json.
const fs = require('node:fs');
const path = require('node:path');
const {createClient} = require('@supabase/supabase-js');
const {generateUsername, generatePassword, provisionStudent, resetStudent} = require('./account-service.cjs');
const {normalizeUsername, studentEmail} = require('../src/student-identity.cjs');
const root = path.resolve(__dirname, '..');
const commands = `Usage:
  npm run accounts -- create-class --label "Year 12 chemistry"
  npm run accounts -- create-students --class CLASS_UUID --count 5 --out /private/path/students.csv
  npm run accounts -- reset-student --username student-xxxxxxxxxxxx --out /private/path/reset.csv
Requires SUPABASE_URL and SUPABASE_SECRET_KEY in the process environment.
Credential output must be outside this checkout and any other served/public folder.
Teacher-facing account management will be implemented separately.`;
function args(argv) {
  const [command, ...rest] = argv;
  const allowed = {'create-class': ['label'], 'create-students': ['class', 'count', 'out'], 'reset-student': ['username', 'out']};
  if (!allowed[command]) throw new Error(commands);
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i]?.slice(2), value = rest[i + 1];
    if (!rest[i]?.startsWith('--') || !allowed[command].includes(key) || !value || options[key]) throw new Error(commands);
    options[key] = value;
  }
  if (allowed[command].some(key => !options[key])) throw new Error(commands);
  if (command === 'create-class' && (!options.label.trim() || options.label.length > 100)) throw new Error('Class label must be 1–100 characters.');
  if (command === 'create-students') {
    if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(options.class)) throw new Error('Use the class UUID.');
    if (!/^\d+$/.test(options.count) || +options.count < 1 || +options.count > 100) throw new Error('Batch size must be 1–100.');
  }
  if (command === 'reset-student') { options.username = normalizeUsername(options.username); studentEmail(options.username); }
  return {command, options};
}
function privateOutput(filename) {
  const absolute = path.resolve(filename);
  const directory = fs.realpathSync(path.dirname(absolute));
  const target = path.join(directory, path.basename(absolute));
  const relative = path.relative(root, target);
  if (!relative.startsWith('..' + path.sep) && relative !== '..') throw new Error('Credential output must be outside the repository.');
  // O_EXCL also rejects existing symlinks/files. Limit access from creation, not after writing.
  return {fd: fs.openSync(target, 'wx', 0o600), target};
}
function adminClient() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY securely; do not paste secrets into chat.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(parsed.hostname))) throw new Error('Use HTTPS outside local testing.');
  let legacyServiceRole = false;
  try { legacyServiceRole = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'service_role'; } catch {}
  if (!key.startsWith('sb_secret_') && !legacyServiceRole) throw new Error('This operator tool requires a secret/service_role key, never a publishable key.');
  return createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false},
    global: {fetch: (input, init) => fetch(input, {...init, signal: AbortSignal.timeout(20000)})}});
}
async function main(argv) {
  const {command, options} = args(argv);
  const admin = adminClient();
  if (command === 'create-class') {
    const {data, error} = await admin.from('school_classes').insert({label: options.label.trim()}).select('id').single();
    if (error) throw new Error('Could not create class. Check the migration and operator credentials.');
    console.log(`Class created: ${data.id}`); return;
  }
  if (command === 'create-students') {
    const {error} = await admin.from('school_classes').select('id').eq('id', options.class).single();
    if (error) throw new Error('Class does not exist or is inaccessible.');
  }
  const output = privateOutput(options.out);
  const rows = Array.from({length: command === 'create-students' ? +options.count : 1}, () => ({
    username: command === 'reset-student' ? options.username : generateUsername(),
    password: generatePassword(), state: 'pending'
  }));
  function save() {
    const text = 'username,temporary_password,status\n' + rows.map(r => `${r.username},${r.password},${r.state}`).join('\n') + '\n';
    fs.ftruncateSync(output.fd); fs.writeSync(output.fd, text, 0, 'utf8'); fs.fsyncSync(output.fd);
  }
  let succeeded = 0;
  try {
    // Save credentials before creating any accounts, so interruption cannot lose them.
    save();
    for (const row of rows) {
      try {
        if (command === 'create-students') await provisionStudent(admin, {...row, classId: options.class});
        else await resetStudent(admin, row.username, row.password);
        row.state = 'ready'; succeeded++;
      } catch (error) { row.state = 'failed'; console.error(error.message); }
      save();
    }
  } finally { fs.closeSync(output.fd); }
  console.log(`${succeeded}/${rows.length} accounts ready. Private credential file: ${output.target}`);
  console.log('Distribute privately, then delete the file. Never upload it to GitHub or a website.');
  if (succeeded !== rows.length) process.exitCode = 1;
}
if (require.main === module) main(process.argv.slice(2)).catch(error => {console.error(error.message); process.exitCode = 1;});
module.exports = {args, privateOutput};
