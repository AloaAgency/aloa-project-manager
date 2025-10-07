import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const pendingEmail = 'cybeross@me.com';
const currentToken = 'pkce_c7519aced9d49b4f1b91157e505132275eb526b8a36fa3e9ea548156';

const { data, error } = await supabase.auth.verifyOtp({
  type: 'magiclink',
  token_hash: currentToken,
});

console.log({ data, error });
