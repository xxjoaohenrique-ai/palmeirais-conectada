(function () {
    const config = {
        url: window.SUPABASE_URL || '',
        anonKey: window.SUPABASE_ANON_KEY || ''
    };

    function getSupabaseClient() {
        if (!window.supabase) {
            return null;
        }

        if (!config.url || !config.anonKey || config.url.includes('SEU_PROJETO')) {
            return null;
        }

        if (!window.supabaseClient) {
            window.supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });
        }

        return window.supabaseClient;
    }

    async function signUp({ email, password, nome }) {
        const supabase = getSupabaseClient();
        if (!supabase) return { data: null, error: new Error('Supabase não configurado.') };

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nome: nome || ''
                }
            }
        });

        if (!error && data?.user) {
            try {
                await supabase.from('profiles').upsert({
                    id: data.user.id,
                    nome: nome || '',
                    email: email,
                    is_admin: false,
                    created_at: new Date().toISOString()
                }, { onConflict: 'id' });
            } catch (profileError) {
                console.warn('Não foi possível sincronizar profile do usuário:', profileError);
            }
        }

        return { data, error };
    }

    async function signIn({ email, password }) {
        const supabase = getSupabaseClient();
        if (!supabase) return { data: null, error: new Error('Supabase não configurado.') };
        return supabase.auth.signInWithPassword({ email, password });
    }

    async function sendPasswordReset(email, redirectTo) {
        const supabase = getSupabaseClient();
        if (!supabase) return { data: null, error: new Error('Supabase não configurado.') };

        return supabase.auth.resetPasswordForEmail(email, { redirectTo });
    }

    async function updatePassword(password) {
        const supabase = getSupabaseClient();
        if (!supabase) return { data: null, error: new Error('Supabase não configurado.') };

        return supabase.auth.updateUser({ password });
    }

    async function signOut() {
        const supabase = getSupabaseClient();
        if (!supabase) return { error: null };

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { error: null };

        return supabase.auth.signOut();
    }

    async function getSessionUser() {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) return null;

        return {
            id: session.user.id,
            nome: session.user.user_metadata?.nome || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email,
            isAdmin: Boolean(session.user.user_metadata?.is_admin)
                || session.user.email === 'admin@palmeirais.pi.gov.br'
        };
    }

    async function getComplaints() {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        const { data, error } = await supabase.from('denuncias').select('*').order('created_at', { ascending: false });
        if (error) {
            console.warn('Não foi possível consultar denúncias no Supabase:', error.message);
            return [];
        }

        return data || [];
    }

    async function createComplaint(complaint) {
        const supabase = getSupabaseClient();
        if (!supabase) return { data: null, error: new Error('Supabase não configurado.') };

        const { id, ...complaintWithoutId } = complaint || {};
        return supabase.from('denuncias').insert([{
            ...complaintWithoutId,
            created_at: new Date().toISOString()
        }]);
    }

    async function getComplaintsByUser(userId) {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        const { data, error } = await supabase.from('denuncias').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) {
            console.warn('Não foi possível consultar denúncias do usuário:', error.message);
            return [];
        }

        return data || [];
    }

    async function getProfiles() {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        const { data, error } = await supabase.from('profiles').select('*');
        if (error) {
            console.warn('Não foi possível consultar perfis no Supabase:', error.message);
            return [];
        }

        return data || [];
    }

    function subscribeToComplaints(callback, onStatusChange) {
        const supabase = getSupabaseClient();
        if (!supabase || typeof callback !== 'function') return null;

        const channel = supabase.channel('complaints-live-updates');
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'denuncias' },
            (payload) => callback(payload)
        );

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.info('Assinatura de denúncias ativa no Supabase.');
            } else {
                console.warn(`Status do Realtime de denúncias: ${status}`);
            }

            if (typeof onStatusChange === 'function') {
                onStatusChange(status);
            }
        });

        return channel;
    }

    window.supabaseConfig = config;
    window.isSupabaseConfigured = function () {
        return !!getSupabaseClient();
    };
    window.getSupabaseClient = getSupabaseClient;
    window.supabaseSignUp = signUp;
    window.supabaseSignIn = signIn;
    window.supabaseSendPasswordReset = sendPasswordReset;
    window.supabaseUpdatePassword = updatePassword;
    window.supabaseSignOut = signOut;
    window.supabaseGetSessionUser = getSessionUser;
    window.supabaseGetComplaints = getComplaints;
    window.supabaseCreateComplaint = createComplaint;
    window.supabaseGetComplaintsByUser = getComplaintsByUser;
    window.supabaseGetProfiles = getProfiles;
    window.supabaseSubscribeToComplaints = subscribeToComplaints;
})();
