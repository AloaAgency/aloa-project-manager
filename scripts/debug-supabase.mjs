import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('missing env');
  process.exit(1);
}
const supabase = createClient(url, key);
const { data, error } = await supabase
  .from('aloa_applets')
  .select('id, project_id, projectlet_id, name, form_id')
  .eq('project_id', '511306f6-0316-4a60-a318-1509d643238a')
  .limit(20);
console.log(JSON.stringify({ error, data }, null, 2));
