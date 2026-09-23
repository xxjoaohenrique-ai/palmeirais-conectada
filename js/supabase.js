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

        if (!error && data?.session && data?.user) {
            try {
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: data.user.id,
                    nome: nome || '',
                    email: email,
                    is_admin: false,
                    created_at: new Date().toISOString()
                }, { onConflict: 'id', ignoreDuplicates: true });
                if (profileError) console.warn('Não foi possível sincronizar o perfil:', profileError.message);
            } catch (profileError) {
                console.warn('Não foi possível sincronizar profile do usuário:', profileError);
            }
        }

        return { data, error };
    }

    async function signIn({ email, password }) {
        const supabase = getSupabaseClient();
        if (!supabase) return { data: null, error: new Error('Supabase não configurado.') };
        const result = await supabase.auth.signInWithPassword({ email, password });
        // Contas com confirmação de e-mail só podem criar o perfil após autenticar.
        // ignoreDuplicates preserva o perfil e as permissões já definidos pelo servidor.
        if (!result.error && result.data?.session && result.data?.user) {
            const user = result.data.user;
            try {
                const { error } = await supabase.from('profiles').upsert({
                    id: user.id,
                    nome: user.user_metadata?.nome || '',
                    email: user.email,
                    is_admin: false
                }, { onConflict: 'id', ignoreDuplicates: true });
                if (error) console.warn('Não foi possível sincronizar o perfil:', error.message);
            } catch (error) {
                console.warn('Não foi possível sincronizar o perfil:', error);
            }
        }
        return result;
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

    async function getServerAdminStatus(supabase, userId) {
        const { data, error } = await supabase.from('profiles')
            .select('is_admin').eq('id', userId).maybeSingle();
        if (error) {
            console.warn('Não foi possível verificar autorização administrativa:', error.message);
            return false;
        }
        return data?.is_admin === true;
    }

    async function getSessionUser() {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) return null;
        const session = { user: data.user };

        return {
            id: session.user.id,
            nome: session.user.user_metadata?.nome || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email,
            isAdmin: await getServerAdminStatus(supabase, session.user.id)
        };
    }

    async function getComplaints() {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        const { data, error } = await supabase.from('denuncias').select('*').order('created_at', { ascending: false });
        if (error) {
            console.warn('Não foi possível consultar denúncias no Supabase:', error.message);
            throw error;
        }

        return data || [];
    }

    async function createComplaint(complaint) {
        const supabase = getSupabaseClient();
        if (!supabase) return { data: null, error: new Error('Supabase não configurado.') };

        const normalizedComplaint = {
            id: complaint?.id || (window.crypto?.randomUUID?.() || generateId()),
            titulo: complaint?.titulo || complaint?.title || '',
            categoria: complaint?.categoria || complaint?.category || '',
            endereco: complaint?.endereco || complaint?.address || '',
            descricao: complaint?.descricao || complaint?.description || '',
            foto: complaint?.foto || complaint?.imagem || complaint?.image_url || '',
            status: complaint?.status || 'pendente',
            user_id: complaint?.userId || complaint?.user_id || complaint?.userID || null,
            user_name: complaint?.userName || complaint?.user_name || null,
            user_email: complaint?.userEmail || complaint?.user_email || null,
            created_at: complaint?.created_at || complaint?.data || new Date().toISOString()
        };

        return supabase.from('denuncias').insert([normalizedComplaint]);
    }

    async function updateComplaintStatus(id, status) {
        const supabase = getSupabaseClient();
        if (!supabase) return { data: null, error: new Error('Supabase não configurado.') };
        if (!['pendente', 'em-analise', 'resolvido'].includes(status)) {
            return { data: null, error: new Error('Status inválido.') };
        }
        const { data, error } = await supabase.from('denuncias')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id).select('id, status').maybeSingle();
        if (!error && !data) return { data: null, error: new Error('Denúncia não encontrada ou acesso negado.') };
        return { data, error };
    }

    async function deleteComplaint(id) {
        const supabase = getSupabaseClient();
        if (!supabase) return { data: null, error: new Error('Supabase não configurado.') };
        const { data, error } = await supabase.from('denuncias')
            .delete().eq('id', id).select('id').maybeSingle();
        if (!error && !data) return { data: null, error: new Error('Denúncia não encontrada ou acesso negado.') };
        return { data, error };
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
    window.supabaseUpdateComplaintStatus = updateComplaintStatus;
    window.supabaseDeleteComplaint = deleteComplaint;
    window.supabaseGetProfiles = getProfiles;
    window.supabaseSubscribeToComplaints = subscribeToComplaints;
})();
