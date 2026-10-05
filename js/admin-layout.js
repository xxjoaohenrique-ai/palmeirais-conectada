/* Navegação e consultas da área administrativa. Dados privados permanecem em memória. */
(function () {
    'use strict';
    const categories = ['Lixo Acumulado', 'Entulho', 'Esgoto Vazando', 'Iluminação Pública', 'Buracos nas Ruas', 'Terrenos Abandonados'];
    const pages = {
        dashboard: ['Dashboard', 'Acompanhe e gerencie as denúncias da sua cidade em tempo real.'],
        denuncias: ['Denúncias', 'Consulte, filtre e atualize os registros recebidos.'],
        relatorios: ['Relatórios', 'Consulte os dados por período e exporte os resultados.'],
        usuarios: ['Usuários', 'Contas cadastradas e suas denúncias.'],
        mapa: ['Mapa da Cidade', 'Consulte o mapa de Palmeirais e os endereços informados.'],
        categorias: ['Categorias', 'Acompanhe as ocorrências de cada categoria.'],
        configuracoes: ['Configurações', 'Personalize a visualização do painel.']
    };
    let complaints = [];
    let profiles = null;
    let profilesFailed = false;

    function dateKey(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(date);
        const get = (type) => parts.find((part) => part.type === type).value;
        return get('year') + '-' + get('month') + '-' + get('day');
    }

    function periodStart(days) {
        const today = dateKey(new Date());
        const date = new Date(today + 'T00:00:00Z');
        date.setUTCDate(date.getUTCDate() - (days - 1));
        return date.toISOString().slice(0, 10);
    }

    function inPeriod(item, days) {
        if (!days) return true;
        const key = dateKey(item.data);
        return key && key >= periodStart(days) && key <= dateKey(new Date());
    }

    function setAdminTheme(theme) {
        const next = theme === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-admin-theme', next);
        try { localStorage.setItem('cidadeLimpa_admin_theme', next); } catch (_) {}
        const icon = document.querySelector('#adminThemeToggle i');
        if (icon) icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        document.getElementById('adminThemeToggle')?.setAttribute('aria-label', next === 'dark' ? 'Ativar tema claro do painel' : 'Ativar tema escuro do painel');
        const label = document.getElementById('adminThemeLabel');
        if (label) label.textContent = next === 'dark' ? 'Escuro' : 'Claro';
    }

    function toggleAdminTheme() {
        setAdminTheme(document.documentElement.getAttribute('data-admin-theme') === 'dark' ? 'light' : 'dark');
    }

    function showView() {
        const requested = location.hash.slice(1);
        const view = Object.hasOwn(pages, requested) ? requested : 'dashboard';
        document.querySelectorAll('.admin-content [data-admin-view]').forEach((element) => {
            element.hidden = element.dataset.adminView !== view;
        });
        document.querySelectorAll('.admin-side-link').forEach((link) => {
            const active = link.getAttribute('href') === '#' + view;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
            link.setAttribute('aria-label', link.querySelector('span')?.textContent || pages[view][0]);
        });
        const user = getCurrentUser();
        const heading = document.getElementById('adminViewTitle');
        if (heading) heading.textContent = view === 'dashboard' ? 'Olá, ' + (user?.nome || 'Administrador') + '! 👋' : pages[view][0];
        const description = document.getElementById('adminViewDescription');
        if (description) description.textContent = pages[view][1];
        document.body.dataset.adminView = view;
        if (view === 'usuarios' && profiles === null && !profilesFailed && typeof window.loadAdminProfiles === 'function') window.loadAdminProfiles();
        window.closeAdminMenus?.();
        window.scrollTo({top: 0, behavior: 'instant'});
    }

    function openComplaints(filters = {}) {
        const search = document.getElementById('searchInput');
        const topSearch = document.getElementById('adminTopSearch');
        const category = document.getElementById('categoryFilter');
        const status = document.getElementById('statusFilter');
        if (search) search.value = filters.query || '';
        if (topSearch) topSearch.value = filters.query || '';
        if (category) category.value = filters.category || 'todas';
        if (status) status.value = filters.status || 'todos';
        window.__adminReporterFilter = filters.userId || null;
        window.__adminRangeDays = filters.days || null;
        const label = document.getElementById('adminActiveFilterLabel');
        const labels = [];
        if (filters.userName) labels.push('Denúncias de ' + filters.userName);
        if (filters.days) labels.push('Últimos ' + filters.days + ' dias');
        if (label) { label.textContent = labels.join(' · '); label.hidden = !labels.length; }
        if (typeof handleAdminFilter === 'function') handleAdminFilter();
        if (location.hash !== '#denuncias') location.hash = 'denuncias';
        else showView();
    }

    function tableEmpty(body, columns, message) {
        if (!body) return;
        body.replaceChildren();
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = columns;
        cell.className = 'admin-empty-state';
        cell.textContent = message;
        row.append(cell);
        body.append(row);
    }

    function addRow(body, values) {
        const row = document.createElement('tr');
        values.forEach((value) => {
            const cell = document.createElement('td');
            cell.textContent = String(value == null ? '' : value);
            row.append(cell);
        });
        body.append(row);
        return row;
    }

    function categoryCards(elementId, source, includeEmpty, days) {
        const container = document.getElementById(elementId);
        if (!container) return;
        container.replaceChildren();
        const counts = new Map(includeEmpty ? categories.map((category) => [category, 0]) : []);
        source.forEach((item) => counts.set(item.categoria, (counts.get(item.categoria) || 0) + 1));
        if (!counts.size) {
            const empty = document.createElement('p');
            empty.className = 'admin-cell-muted';
            empty.textContent = 'Nenhuma denúncia neste período.';
            container.append(empty);
        }
        Array.from(counts).sort((a, b) => b[1] - a[1]).forEach(([category, count]) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'admin-report-item admin-category-button';
            const title = document.createElement('strong');
            const amount = document.createElement('span');
            title.textContent = category;
            amount.textContent = count + (count === 1 ? ' denúncia' : ' denúncias');
            card.append(title, amount);
            card.addEventListener('click', () => openComplaints({category, days}));
            container.append(card);
        });
    }

    function reportSource() {
        const value = document.getElementById('adminReportPeriod')?.value || 'all';
        return complaints.filter((item) => inPeriod(item, value === 'all' ? 0 : Number(value)));
    }

    function renderReports() {
        const source = reportSource();
        const period = document.getElementById('adminReportPeriod')?.value || 'all';
        const label = document.getElementById('adminReportTotal');
        if (label) label.textContent = source.length + (source.length === 1 ? ' denúncia' : ' denúncias') + (period === 'all' ? ' em todo o período.' : ' nos últimos ' + period + ' dias.');
        categoryCards('adminCategoriesSummary', source, false, period === 'all' ? null : Number(period));
        const body = document.getElementById('adminReportTable');
        if (!body) return;
        body.replaceChildren();
        if (!source.length) return tableEmpty(body, 5, 'Nenhuma denúncia neste período.');
        source.forEach((item) => addRow(body, [item.titulo, item.categoria, item.endereco, formatDate(item.data), capitalizeFirst(item.status.replace('-', ' '))]));
    }

    function renderUsers() {
        const body = document.getElementById('adminUsersTable');
        const count = document.getElementById('adminUsersCount');
        if (!body || !count) return;
        if (profilesFailed) {
            count.textContent = 'Não foi possível consultar as contas. Tente atualizar o painel.';
            return tableEmpty(body, 5, 'A consulta de usuários está indisponível.');
        }
        if (profiles === null) return tableEmpty(body, 5, 'Carregando contas...');
        const query = (document.getElementById('adminUserSearch')?.value || '').trim().toLocaleLowerCase('pt-BR');
        const users = profiles.filter((item) => (String(item.nome || '') + ' ' + String(item.email || '')).toLocaleLowerCase('pt-BR').includes(query));
        count.textContent = users.length + ' de ' + profiles.length + ' contas';
        body.replaceChildren();
        if (!users.length) return tableEmpty(body, 5, 'Nenhum usuário encontrado.');
        users.forEach((user) => {
            const total = complaints.filter((item) => item.userId === user.id).length;
            const row = addRow(body, [user.nome || 'Usuário', user.email, user.is_admin ? 'Administrador' : 'Cidadão', total]);
            const actions = document.createElement('td');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'admin-secondary-button';
            button.textContent = 'Ver denúncias';
            button.addEventListener('click', () => openComplaints({userId: user.id, userName: user.nome || 'Usuário'}));
            actions.append(button);
            row.append(actions);
        });
    }

    function renderMapAddresses() {
        const target = document.getElementById('adminMapAddresses');
        if (!target) return;
        target.replaceChildren();
        const query = (document.getElementById('adminMapSearch')?.value || '').trim().toLocaleLowerCase('pt-BR');
        const source = complaints.filter((item) => (item.endereco + ' ' + item.titulo).toLocaleLowerCase('pt-BR').includes(query));
        if (!source.length) {
            const empty = document.createElement('p');
            empty.textContent = 'Nenhum endereço encontrado.';
            target.append(empty);
            return;
        }
        source.forEach((item) => {
            const card = document.createElement('article');
            card.className = 'admin-report-item';
            const title = document.createElement('strong');
            const address = document.createElement('p');
            const mapsLink = document.createElement('a');
            const details = document.createElement('a');
            title.textContent = item.titulo;
            address.textContent = item.endereco;
            mapsLink.textContent = 'Buscar endereço no mapa ↗';
            mapsLink.href = 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(item.endereco + ', Palmeirais, Piauí, Brasil');
            mapsLink.target = '_blank';
            mapsLink.rel = 'noopener noreferrer';
            details.textContent = 'Ver denúncia';
            details.href = 'detalhes.html?id=' + encodeURIComponent(item.id);
            card.append(title, address, mapsLink, details);
            target.append(card);
        });
    }

    function updateAdminExtraPanels(source) {
        complaints = Array.isArray(source) ? source : [];
        renderReports();
        categoryCards('adminAllCategories', complaints, true, null);
        renderUsers();
        renderMapAddresses();
        window.dispatchEvent(new CustomEvent('admin:complaints-updated', {detail: {complaints}}));
    }

    function updateAdminProfiles(source, failed = false) {
        profiles = Array.isArray(source) ? source : null;
        profilesFailed = failed;
        renderUsers();
    }

    function exportAdminCsv() {
        const source = reportSource();
        if (!source.length) { showToast('Não há denúncias neste período para exportar.', 'warning'); return; }
        const fields = ['titulo', 'categoria', 'endereco', 'userName', 'data', 'status'];
        const csvCell = (value) => {
            let text = String(value == null ? '' : value);
            if (/^[\s\u0000-\u001f]*[=+@\-]/.test(text)) text = "'" + text;
            return '"' + text.replace(/"/g, '""') + '"';
        };
        const rows = [['Título', 'Categoria', 'Endereço', 'Cidadão', 'Data', 'Status'].map(csvCell).join(';')];
        source.forEach((item) => rows.push(fields.map((field) => csvCell(item[field])).join(';')));
        const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.join('\r\n')], {type: 'text/csv;charset=utf-8;'}));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'palmeirais-denuncias-' + dateKey(new Date()) + '.csv';
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function refreshPanel() {
        const button = document.getElementById('adminRefreshData');
        if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
        try { await Promise.all([window.loadAdminDashboard(), window.loadAdminProfiles()]); }
        finally { if (button) { button.disabled = false; button.removeAttribute('aria-busy'); } }
    }

    window.adminDateKey = dateKey;
    window.adminPeriodStart = periodStart;
    window.adminInPeriod = inPeriod;
    window.adminOpenComplaints = openComplaints;
    window.updateAdminExtraPanels = updateAdminExtraPanels;
    window.updateAdminProfiles = updateAdminProfiles;

    document.addEventListener('DOMContentLoaded', async function () {
        let preference = 'dark';
        try { preference = localStorage.getItem('cidadeLimpa_admin_theme') || 'dark'; } catch (_) {}
        setAdminTheme(preference);
        document.getElementById('adminThemeToggle')?.addEventListener('click', toggleAdminTheme);
        document.getElementById('adminThemeSetting')?.addEventListener('click', toggleAdminTheme);
        document.getElementById('adminFilterButton')?.addEventListener('click', () => handleAdminFilter());
        document.getElementById('adminClearFilters')?.addEventListener('click', () => openComplaints());
        document.getElementById('adminExportCsv')?.addEventListener('click', exportAdminCsv);
        document.getElementById('adminPrintReport')?.addEventListener('click', () => window.print());
        document.getElementById('adminReportPeriod')?.addEventListener('change', renderReports);
        document.getElementById('adminUserSearch')?.addEventListener('input', renderUsers);
        document.getElementById('adminMapSearch')?.addEventListener('input', renderMapAddresses);
        document.getElementById('adminPageSize')?.addEventListener('change', (event) => window.setAdminPageSize(event.target.value));
        document.getElementById('adminRefreshData')?.addEventListener('click', refreshPanel);
        document.getElementById('adminRetryLoad')?.addEventListener('click', refreshPanel);
        window.addEventListener('hashchange', showView);
        await restoreSupabaseSession();
        const user = getCurrentUser();
        if (!user?.isAdmin) return;
        const letters = String(user.nome || 'Administrador').trim().split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join('').toUpperCase();
        document.querySelectorAll('.admin-avatar').forEach((avatar) => { avatar.textContent = letters || 'AD'; });
        ['adminDisplayName', 'adminProfileName'].forEach((id) => {
            const element = document.getElementById(id);
            if (element) element.textContent = user.nome || 'Administrador';
        });
        const footer = document.querySelector('.admin-user-card strong');
        if (footer) footer.textContent = user.nome || 'Administrador';
        const email = document.getElementById('adminProfileEmail');
        if (email) email.textContent = user.email || '';
        showView();
    });
})();
