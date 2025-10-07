import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const accessToken = process.argv[2];
const refreshToken = process.argv[3] || null;

const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
console.log({ data, error });
