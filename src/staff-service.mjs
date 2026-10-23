// Shared by the Supabase Edge Function and the disposable local integration server.
// This module is server-only. Never import it into a browser bundle.
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
function randomText(length, chars = alphabet) {
  let text = '';
  while (text.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    for (const byte of bytes) if (byte < 256 - (256 % chars.length) && text.length < length) text += chars[byte % chars.length];
  }
  return text;
}
const password = () => randomText(24, 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789-_');
function check(result) {if (result.error) throw result.error; return result.data;}
export function makeStaffHandler({createClient, supabaseUrl, publishableKey, secretKey, allowedOrigins = ['null']}) {
  if (!supabaseUrl || !publishableKey || !secretKey) throw new Error('Server configuration missing.');
  const options = {auth: {persistSession: false, autoRefreshToken: false},
    global: {fetch: (input, init) => fetch(input, {...init, signal: init?.signal || AbortSignal.timeout(20000)})}};
  const admin = createClient(supabaseUrl, secretKey, options);
  return async request => {
    const origin = request.headers.get('origin');
    const permitted = origin && allowedOrigins.includes(origin);
    const headers = {'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Pragma': 'no-cache',
      'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff'};
    if (permitted) Object.assign(headers, {'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'});
    const respond = (status, body) => new Response(JSON.stringify(body), {status, headers});
    if (origin && !permitted) return respond(403, {error: 'This preview address is not enabled.'});
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers});
    if (request.method !== 'POST') return respond(405, {error: 'POST required.'});
    if (!/^Bearer \S+$/.test(request.headers.get('authorization') || '')) return respond(401, {error: 'Sign in to a staff account.'});
    let step = 'authentication';
    try {
      const authorization = request.headers.get('authorization');
      const caller = createClient(supabaseUrl, publishableKey, {...options,
        global: {...options.global, headers: {Authorization: authorization}}});
      const {user} = check(await caller.auth.getUser(authorization.slice(7)));
      const context = check(await caller.rpc('staff_context'));
      if (!user || context.user_id !== user.id) throw {code: '42501'};
      step = 'validation';
      const reader=request.body?.getReader(),chunks=[];let size=0;
      if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;
        if(size>4096){await reader.cancel();return respond(400,{error:'Request too large.'});}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      const text=new TextDecoder().decode(bytes);
      const input = JSON.parse(text);
      const allowed = {
        invite_teacher: ['action','request_id','email'], create_students: ['action','request_id','class_id','count'],
        reset_student: ['action','request_id','user_id'], reset_staff: ['action','request_id','user_id'],
        delete_student: ['action','request_id','user_id','confirm_username']
      };
      if (!input || typeof input !== 'object' || !allowed[input.action] || !uuid.test(input.request_id)
        || Object.keys(input).length !== allowed[input.action].length || Object.keys(input).some(name => !allowed[input.action].includes(name))) {
        return respond(400, {error: 'Invalid staff operation.'});
      }
      if (input.action === 'invite_teacher') {
        if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return respond(400, {error: 'Enter a staff email address.'});
      } else if (input.action === 'create_students') {
        if (!uuid.test(input.class_id) || !Number.isInteger(input.count) || input.count < 1 || input.count > 100) return respond(400, {error: 'Choose a class and 1–100 students.'});
      } else if (!uuid.test(input.user_id)) return respond(400, {error: 'Choose an account.'});
      const scope = {actor: context.user_id, session: context.session_id};
      const target = input.class_id || input.user_id || null;
      check(await admin.rpc('staff_start_action', {...scope, action: input.action, request_id: input.request_id, target}));
      step = 'operation';
      if (input.action === 'invite_teacher') {
        // Atomic Auth creation rejects existing addresses. Never attach a staff
        // role to an existing user or delete a user created by another request.
        const {user: invited} = check(await admin.auth.admin.createUser({email: input.email.trim().toLowerCase(),
          password: password(), email_confirm: true}));
        try {
          check(await admin.rpc('staff_provision_teacher', {...scope, teacher: invited.id}));
          // A private one-use recovery token supplies account setup without SMTP.
          // Staff permissions stay blocked until the teacher chooses a password.
          const invite = check(await admin.auth.admin.generateLink({type: 'recovery', email: invited.email}));
          return respond(200, {email: invited.email, invitation_code: invite.properties.hashed_token});
        } catch (error) {await admin.auth.admin.deleteUser(invited.id); throw error;}
      }
      if (input.action === 'create_students') {
        const credentials = [];
        for (let index = 0; index < input.count; index++) {
          try {
            check(await admin.rpc('staff_authorize', {...scope, action: 'create_students', target}));
            const username = 'student-' + randomText(12), temporary_password = password();
            const {user: student} = check(await admin.auth.admin.createUser({email: username + '@students.invalid', password: temporary_password, email_confirm: true}));
            try {check(await admin.rpc('staff_provision_student', {...scope, target_class: target, student: student.id, username}));}
            catch (error) {await admin.auth.admin.deleteUser(student.id); throw error;}
            credentials.push({username, temporary_password});
          } catch {
            return respond(200, {credentials, complete: false,
              warning: 'Creation stopped. Keep the credentials shown. Check the class list before creating more accounts.'});
          }
        }
        return respond(200, {credentials, complete: true});
      }
      if (input.action === 'delete_student') {
        const profile = check(await admin.from('account_profiles').select('username').eq('user_id', target).eq('role','student').single());
        if (typeof input.confirm_username !== 'string' || profile.username !== input.confirm_username) return respond(400, {error: 'Type the exact student username to confirm deletion.'});
        check(await admin.rpc('staff_authorize', {...scope, action: 'delete_student', target}));
        check(await admin.auth.admin.deleteUser(target));
        return respond(200, {deleted: true});
      }
      const staff = input.action === 'reset_staff';
      const username = check(await admin.rpc('staff_prepare_reset', {...scope, target, staff, operation:input.request_id}));
      const temporary_password = password();
      check(await admin.auth.admin.updateUserById(target, {password: temporary_password}));
      check(await admin.rpc('staff_finish_reset', {...scope, target, staff, operation:input.request_id}));
      return respond(200, {username, temporary_password});
    } catch (error) {
      if (error?.code === '54000') return respond(429, {error: 'Please wait a minute before managing more accounts.'});
      if (error?.code === '55006') return respond(409, {error: 'Another password reset is in progress. Wait two minutes before trying again.'});
      if (['email_exists','user_already_exists'].includes(error?.code)) return respond(409,{error:'That email already has an account. Use its existing sign-in or an administrator reset.'});
      if (error?.code === '23505') return respond(409, {error: 'This operation was already attempted. Check the class or account before trying again.'});
      if (step === 'authentication' || error?.code === '42501') return respond(403, {error: 'This action is not available to your current staff session.'});
      if (step === 'validation') return respond(400, {error: 'Check the form fields and try again.'});
      // Do not log requests, invitation tokens, passwords, Auth errors or emails.
      return respond(503, {error: 'The operation did not finish. Check the class/account before retrying. A reset account may remain disabled until a successful reset.'});
    }
  };
}
