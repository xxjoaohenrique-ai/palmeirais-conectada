const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function storage() {
    const values = new Map();
    return { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,String(v)), removeItem: k => values.delete(k) };
}
function runtime(files = ['js/main.js']) {
    const elements = new Map();
    const context = vm.createContext({
        console: { warn() {}, error() {}, info() {} }, URLSearchParams,
        crypto: require('node:crypto').webcrypto, TextEncoder,
        setTimeout() {}, setInterval() {}, clearInterval() {},
        localStorage: storage(), sessionStorage: storage(),
        document: { addEventListener() {}, getElementById: id => elements.get(id) || null },
        location: { search: '', hash: '', pathname: '/login.html', origin: 'http://localhost' }
    });
    context.window = context;
    for (const file of files) vm.runInContext(read(file), context, { filename: file });
    context.showToast = () => {};
    return { context, elements };
}
function form(elements, values) {
    const button = { disabled: false, innerHTML: 'Enviar', dataset: {} };
    for (const [id,value] of Object.entries(values)) elements.set(id,{ value, style: {}, innerHTML: '', scrollIntoView() {} });
    return { button, event: { preventDefault() {}, currentTarget: { querySelector: () => button } } };
}
test('all browser scripts and inline scripts parse', () => {
    for (const file of fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js'))) new vm.Script(read('js/'+file));
    for (const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))) {
        for (const match of read(file).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(match[1],{filename:file});
    }
});
test('local scripts and styles referenced by HTML exist', () => {
    for (const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))) {
        for (const [,url] of read(file).matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))"/g)) {
            if (!url.startsWith('http')) assert.ok(fs.existsSync(path.join(root,url)),`${file}: ${url}`);
        }
    }
});
test('server creation preserves the complaint ID', async () => {
    const { context:c } = runtime();
    let payload;
    c.isSupabaseConfigured=()=>true;
    c.supabaseCreateComplaint=async p => { payload=p; return { error:null }; };
    await c.syncComplaintToSupabase({id:'known-id',titulo:'Buraco na rua'});
    assert.equal(payload.id,'known-id');
});
test('remote deletions and an empty database replace stale local records', async () => {
    const { context:c } = runtime();
    c.saveDenuncias([{id:'deleted'}]);
    c.isSupabaseConfigured=()=>true;
    c.supabaseGetComplaints=async()=>[{id:'current',status:'resolvido'}];
    assert.equal((await c.getMergedComplaints()).length,1);
    assert.equal(c.getDenuncias()[0].id,'current');
    c.supabaseGetComplaints=async()=>[];
    assert.equal((await c.getMergedComplaints()).length,0);
    assert.equal(c.getDenuncias().length,0);
});
test('a failed server query is not presented as authoritative cached data', async () => {
    const { context:c } = runtime();
    c.saveDenuncias([{id:'stale'}]); c.isSupabaseConfigured=()=>true;
    c.supabaseGetComplaints=async()=>{ throw Error('network'); };
    await assert.rejects(c.getMergedComplaints(),/network/);
});
test('malformed storage and cache quota do not crash rendering', () => {
    const { context:c } = runtime();
    c.localStorage.setItem('cidadeLimpa_denuncias','broken JSON');
    assert.equal(c.getDenuncias().length,0);
    c.localStorage.setItem=()=>{ throw Error('QuotaExceededError'); };
    c.saveDenuncias([{id:'saved-remotely'}]);
    assert.equal(c.getDenuncias()[0].id,'saved-remotely');
});
test('normalization handles server update timestamps and rejects HTML status values', () => {
    const { context:c } = runtime();
    const row=c.normalizeComplaint({updated_at:'2026-09-23T12:00:00Z',status:'" onclick="alert(1)'});
    assert.equal(row.dataAtualizacao,'2026-09-23T12:00:00Z');
    assert.equal(row.status,'pendente');
});
test('server session overrides forged local administrative access and clears expired sessions', async () => {
    const { context:c } = runtime();
    c.sessionStorage.setItem('cidadeLimpa_currentUser',JSON.stringify({id:'forged',isAdmin:true}));
    c.supabaseGetSessionUser=async()=>({id:'real',isAdmin:false});
    assert.equal((await c.restoreSupabaseSession()).isAdmin,false);
    assert.equal(c.getCurrentUser().id,'real');
    c.supabaseGetSessionUser=async()=>null;
    await c.restoreSupabaseSession();
    assert.equal(c.getCurrentUser(),null);
});
test('unavailable authentication never creates a local account and unlocks the form', async () => {
    const { context:c,elements } = runtime(['js/main.js','js/auth.js']);
    const {event,button}=form(elements,{email:'user@example.test',senha:'password',loginError:''});
    c.isSupabaseConfigured=()=>false;
    await c.handleLogin(event);
    assert.equal(button.disabled,false);
    assert.match(elements.get('loginError').innerHTML,/indisponível/);
    assert.equal(c.getCurrentUser(),null);
});
test('failed login releases the button for retry', async () => {
    const { context:c,elements } = runtime(['js/main.js','js/auth.js']);
    const {event,button}=form(elements,{email:'user@example.test',senha:'password',loginError:''});
    c.isSupabaseConfigured=()=>true;
    c.supabaseSignIn=async()=>({error:{message:'Invalid login credentials'}});
    await c.handleLogin(event);
    assert.equal(button.disabled,false);
    assert.equal(button.innerHTML,'Enviar');
});
test('email confirmation is shown as a successful signup without attempting password login', async () => {
    const { context:c,elements } = runtime(['js/main.js','js/auth.js']);
    const {event,button}=form(elements,{nome:'Teste',email:'user@example.test',senha:'password',confirmarSenha:'password',cadastroError:''});
    c.isSupabaseConfigured=()=>true;
    c.supabaseSignUp=async()=>({data:{session:null},error:null});
    c.supabaseSignIn=()=>{ throw Error('must not sign in'); };
    await c.handleCadastro(event);
    assert.match(elements.get('cadastroError').innerHTML,/alert-success/);
    assert.equal(button.disabled,false);
});
test('recovery links are detected even with an existing cached login', () => {
    const { context:c,elements } = runtime(['js/main.js','js/auth.js']);
    form(elements,{loginForm:'',forgotPasswordPanel:'',resetPasswordPanel:''});
    c.location.search='?reset=1';
    assert.equal(c.initializePasswordRecovery(),true);
    assert.equal(elements.get('resetPasswordPanel').style.display,'block');
    c.location.search='?reset=10';
    assert.equal(c.initializePasswordRecovery(),false);
});
test('error messages escape markup', () => {
    const { context:c } = runtime(['js/main.js','js/auth.js']);
    const el={style:{}}; c.showError(el,'<img src=x onerror=alert(1)>');
    assert.ok(!el.innerHTML.includes('<img'));
    assert.ok(el.innerHTML.includes('&lt;img'));
});
test('rapid repeated submissions create one complaint', async () => {
    const { context:c,elements } = runtime(['js/main.js','js/denuncia.js']);
    const {event,button}=form(elements,{titulo:'Buraco na rua principal',categoria:'Buracos nas Ruas',endereco:'Rua principal',descricao:'Existe um buraco grande na rua principal.',denunciaError:''});
    c.getCurrentUser=()=>({id:'user',nome:'Teste',email:'test@example.test'});
    c.isSupabaseConfigured=()=>true;
    let finish, calls=0;
    c.syncComplaintToSupabase=()=>{ calls++; return new Promise(resolve=>{finish=resolve;}); };
    elements.set('denunciaForm',{reset(){}}); c.removeImage=()=>{};
    const first=c.handleDenuncia(event);
    await c.handleDenuncia(event);
    assert.equal(calls,1); assert.equal(button.disabled,true);
    finish(); await first;
    assert.equal(button.disabled,false);
    assert.equal(c.getDenuncias().length,1);
});

test('detail pages load from the server with an empty browser cache and escape report text', async () => {
    const { context:c,elements } = runtime();
    for (const match of read('detalhes.html').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
        if (match[1].includes('function loadDenunciaDetails')) vm.runInContext(match[1],c);
    }
    c.location.search='?id=remote-id';
    const container={innerHTML:''}; elements.set('detailsContainer',container);
    c.isSupabaseConfigured=()=>true;
    c.supabaseGetComplaints=async()=>[{id:'remote-id',titulo:'<img src=x onerror=alert(1)>',descricao:'<script>alert(1)</script>',updated_at:'2026-09-23T12:00:00Z'}];
    await c.loadDenunciaDetails();
    assert.match(container.innerHTML,/&lt;img/);
    assert.match(container.innerHTML,/&lt;script/);
    assert.ok(!container.innerHTML.includes('<script>'));
    assert.ok(!container.innerHTML.includes('Denúncia não encontrada'));
});

test('administrative table renders user content as text and keeps filters after a refresh', async () => {
    const { context:c,elements } = runtime(['js/main.js','js/admin.js']);
    form(elements,{searchInput:'',categoryFilter:'todas',statusFilter:'pendente',denunciasTableBody:'',countLabel:''});
    c.isSupabaseConfigured=()=>true;
    c.supabaseGetComplaints=async()=>[
        {id:"x');alert(1);//",titulo:'<img src=x onerror=alert(1)>',status:'pendente'},
        {id:'resolved',titulo:'Resolvida',status:'resolvido'}
    ];
    await c.loadAdminDashboard();
    const html=elements.get('denunciasTableBody').innerHTML;
    assert.match(html,/&lt;img/);
    assert.ok(!html.includes('Resolvida'));
    assert.ok(!html.includes("openDeleteModal('x"));
    assert.equal(elements.get('countLabel').textContent,'1 denúncia(s)');
});

test('first confirmed sign-in creates only a missing profile, preserving existing administrators', async () => {
    const { context:c }=runtime([]);
    let options,payload;
    c.SUPABASE_URL='https://example.supabase.co'; c.SUPABASE_ANON_KEY='public-test-key';
    c.supabase={createClient:()=>({
        auth:{signInWithPassword:async()=>({data:{session:{},user:{id:'user',email:'user@example.test',user_metadata:{nome:'Teste',is_admin:true}}},error:null})},
        from:()=>({upsert:async(p,o)=>{payload=p;options=o;return{error:null};}})
    })};
    vm.runInContext(read('js/supabase.js'),c);
    await c.supabaseSignIn({email:'user@example.test',password:'test'});
    assert.equal(payload.is_admin,false);
    assert.equal(options.ignoreDuplicates,true);
});
