// Conexão com Supabase
// Substitua os valores abaixo pelos dados do seu projeto Supabase.
const SUPABASE_URL = 'https://danfamfyuyckkwpcwtef.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ITNFClIh2W40_Dc4Lf-Ypg_YSLNcJvm';

if (typeof supabase === 'undefined') {
    throw new Error('Supabase JS não encontrado. Adicione o script CDN do Supabase antes de supabase.js.');
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getSupabaseClient() {
    return supabaseClient;
}

window.supabaseClient = supabaseClient;
window.getSupabaseClient = getSupabaseClient;
