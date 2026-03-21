import { createClient } from '@supabase/supabaseClient-js';

const SUPABASE_URL = 'https://kafvgcpxlubtpavrrtrs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MJ2DG16KmyLO2gbpY5mxeQ_nr85IUA9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
