import {createClient} from '@supabase/supabase-js';
import {makeStaffHandler} from './staff-service.mjs';
const origins = (Deno.env.get('STAFF_ALLOWED_ORIGINS') || 'null').split(',').map(value => value.trim()).filter(Boolean);
Deno.serve({hostname:Deno.env.get('STAFF_BIND_HOST')||'0.0.0.0',port:Number(Deno.env.get('STAFF_EDGE_PORT')||8000)},makeStaffHandler({createClient,
  supabaseUrl: Deno.env.get('SUPABASE_URL'), publishableKey: Deno.env.get('SUPABASE_ANON_KEY'),
  secretKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), allowedOrigins: origins}));
