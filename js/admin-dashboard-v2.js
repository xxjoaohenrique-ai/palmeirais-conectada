/* Indicadores e ações do dashboard ligados aos registros carregados. */
(function () {
    'use strict';
    const categories = ['Lixo Acumulado', 'Entulho', 'Esgoto Vazando', 'Iluminação Pública', 'Buracos nas Ruas', 'Terrenos Abandonados'];
    const colors = ['#21bdff', '#ffbe2a', '#ff6635', '#19d59a', '#8a50ff', '#f472b6'];
    let complaints = [];
    let dataState = 'loading';

    function formatCurrentDate() {
        const element = document.getElementById('adminCurrentDate');
        if (!element) return;
        const text = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        }).format(new Date());
        element.textContent = text.charAt(0).toUpperCase() + text.slice(1);
    }

    function renderChart() {
        const select = document.getElementById('adminChartPeriod');
        const line = document.getElementById('adminChartLine');
        if (!line || !window.adminDateKey) return;
        const selected = Number(select?.value || 30);
        const days = [7, 30, 90].includes(selected) ? selected : 30;
        const start = window.adminPeriodStart(days);
        const bins = new Map();
        const cursor = new Date(start + 'T00:00:00Z');
        for (let i = 0; i < days; i++) {
            bins.set(cursor.toISOString().slice(0, 10), 0);
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        complaints.forEach((item) => {
            const key = window.adminDateKey(item.data);
            if (bins.has(key)) bins.set(key, bins.get(key) + 1);
        });
        const values = Array.from(bins.values());
        const total = values.reduce((sum, count) => sum + count, 0);
        const peak = Math.max(0, ...values);
        const points = values.map((count, i) => ((i / (days - 1)) * 700).toFixed(2) + ',' + (160 - (count / Math.max(1, peak)) * 144).toFixed(2));
        line.setAttribute('points', points.join(' '));
        const title = document.getElementById('adminChartTitle');
        if (title) title.textContent = 'Denúncias nos últimos ' + days + ' dias';
        const count = document.getElementById('adminChartCount');
        if (count) count.textContent = dataState === 'loading' && !complaints.length ? 'Carregando registros...' : total + (total === 1 ? ' denúncia no período' : ' denúncias no período');
        const peakLabel = document.getElementById('adminChartMax');
        if (peakLabel) { peakLabel.textContent = String(peak); peakLabel.hidden = peak === 0; }
        const labelDate = (key) => new Date(key + 'T12:00:00Z').toLocaleDateString('pt-BR', {timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit'});
        const first = document.getElementById('adminChartStart');
        const last = document.getElementById('adminChartEnd');
        if (first) first.textContent = labelDate(start);
        if (last) last.textContent = labelDate(window.adminDateKey(new Date()));
        document.getElementById('adminLineChart')?.setAttribute('aria-label', total + ' denúncias nos últimos ' + days + ' dias; pico de ' + peak + ' por dia.');
    }

    function renderCategories() {
        const target = document.getElementById('adminCategoryQuickList');
        const totalElement = document.getElementById('adminDonutTotal');
        const donut = document.getElementById('adminDonut');
        if (!target || !totalElement || !donut) return;
        const counts = new Map();
        complaints.forEach((item) => counts.set(item.categoria, (counts.get(item.categoria) || 0) + 1));
        const rows = Array.from(counts).sort((a, b) => b[1] - a[1]);
        const total = complaints.length;
        totalElement.replaceChildren(document.createTextNode(String(total)));
        const label = document.createElement('small');
        label.textContent = 'Total';
        totalElement.append(label);
        target.replaceChildren();
        let cumulative = 0;
        const segments = [];
        rows.forEach(([name, amount]) => {
            const color = colors[Math.max(0, categories.indexOf(name))];
            const next = cumulative + (amount / total) * 100;
            segments.push(color + ' ' + cumulative + '% ' + next + '%');
            cumulative = next;
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'admin-legend-row';
            const dot = document.createElement('i');
            const text = document.createElement('span');
            const value = document.createElement('b');
            dot.style.background = color;
            text.textContent = name;
            value.textContent = amount + ' · ' + Math.round(amount / total * 100) + '%';
            row.append(dot, text, value);
            row.addEventListener('click', () => window.adminOpenComplaints({category: name}));
            target.append(row);
        });
        donut.style.background = segments.length ? 'conic-gradient(' + segments.join(',') + ')' : 'var(--admin-border)';
        if (!total) {
            const empty = document.createElement('p');
            empty.className = 'admin-cell-muted';
            empty.textContent = 'Nenhuma denúncia registrada.';
            target.append(empty);
        }
    }

    function renderPending() {
        const pending = complaints.filter((item) => item.status === 'pendente').sort((a, b) => new Date(b.data) - new Date(a.data));
        const badge = document.getElementById('adminPendingBadge');
        if (badge) { badge.textContent = String(pending.length); badge.hidden = pending.length === 0; }
        const button = document.getElementById('adminNotificationsButton');
        button?.setAttribute('aria-label', 'Ver ' + pending.length + ' denúncias pendentes');
        const list = document.getElementById('adminPendingList');
        if (list) {
            list.replaceChildren();
            if (!pending.length) {
                const text = document.createElement('p');
                text.textContent = dataState === 'loading' ? 'Carregando denúncias...' : 'Nenhuma denúncia pendente.';
                list.append(text);
            }
            pending.slice(0, 5).forEach((item) => {
                const link = document.createElement('a');
                link.href = 'detalhes.html?id=' + encodeURIComponent(item.id);
                const title = document.createElement('strong');
                const subtitle = document.createElement('span');
                title.textContent = item.titulo;
                subtitle.textContent = item.categoria + ' · ' + formatDate(item.data);
                link.append(title, subtitle);
                list.append(link);
            });
        }
        const today = window.adminDateKey(new Date());
        document.querySelectorAll('[data-today-status]').forEach((element) => {
            const status = element.dataset.todayStatus;
            const count = complaints.filter((item) => window.adminDateKey(item.data) === today && (status === 'todos' || item.status === status)).length;
            element.textContent = count + ' hoje';
        });
    }

    function setDataState(state) {
        dataState = state;
        const label = document.getElementById('adminDatabaseStatus');
        if (label) {
            label.textContent = state === 'loaded' ? 'Atualizado' : state === 'error' ? 'Falha' : 'Consultando';
            label.dataset.state = state;
        }
        const error = document.getElementById('adminDataError');
        if (error) error.hidden = state !== 'error';
        if (state === 'loaded') {
            const last = document.getElementById('adminLastRefresh');
            if (last) last.textContent = new Date().toLocaleTimeString('pt-BR', {timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit'});
        }
        renderChart();
        renderPending();
    }

    function setSyncStatus(status) {
        const label = document.getElementById('adminSyncStatus');
        if (!label) return;
        label.textContent = status === 'SUBSCRIBED' ? 'Tempo real' : 'A cada 30s';
        label.dataset.state = status === 'SUBSCRIBED' ? 'loaded' : 'waiting';
    }

    function networkStatus() {
        const label = document.getElementById('adminNetworkStatus');
        if (!label) return;
        label.textContent = navigator.onLine ? 'Online' : 'Sem conexão';
        label.dataset.state = navigator.onLine ? 'loaded' : 'error';
    }

    function closeMenus() {
        [['adminNotificationsButton', 'adminNotificationsPanel'], ['adminProfileMenu', 'adminProfileDropdown']].forEach(([button, panel]) => {
            const element = document.getElementById(panel);
            if (element) element.hidden = true;
            document.getElementById(button)?.setAttribute('aria-expanded', 'false');
        });
    }

    function setupMenu(buttonId, panelId) {
        const button = document.getElementById(buttonId);
        const panel = document.getElementById(panelId);
        if (!button || !panel) return;
        button.addEventListener('click', () => {
            const open = panel.hidden;
            closeMenus();
            panel.hidden = !open;
            button.setAttribute('aria-expanded', String(open));
        });
    }

    window.setAdminDataState = setDataState;
    window.setAdminSyncStatus = setSyncStatus;
    window.closeAdminMenus = closeMenus;

    window.addEventListener('admin:complaints-updated', (event) => {
        complaints = event.detail.complaints || [];
        renderChart();
        renderCategories();
        renderPending();
    });

    document.addEventListener('DOMContentLoaded', () => {
        formatCurrentDate();
        networkStatus();
        renderChart();
        renderCategories();
        renderPending();
        document.getElementById('adminChartPeriod')?.addEventListener('change', renderChart);
        document.getElementById('adminQuickExport')?.addEventListener('click', () => { location.hash = 'relatorios'; });
        document.getElementById('adminViewPending')?.addEventListener('click', () => {
            closeMenus();
            window.adminOpenComplaints({status: 'pendente'});
        });
        setupMenu('adminNotificationsButton', 'adminNotificationsPanel');
        setupMenu('adminProfileMenu', 'adminProfileDropdown');
        document.addEventListener('click', (event) => { if (!event.target.closest('.admin-menu-anchor')) closeMenus(); });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeMenus();
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                const top = document.getElementById('adminTopSearch');
                if (top?.getClientRects().length) top.focus();
                else { window.adminOpenComplaints(); document.getElementById('searchInput')?.focus(); }
            }
        });
        const top = document.getElementById('adminTopSearch');
        const main = document.getElementById('searchInput');
        top?.addEventListener('input', () => window.adminOpenComplaints({query: top.value}));
        main?.addEventListener('input', () => { if (top) top.value = main.value; });
        document.getElementById('adminSidebarToggle')?.addEventListener('click', (event) => {
            const narrow = window.matchMedia('(min-width: 821px) and (max-width: 1060px)').matches;
            const expanded = narrow ? document.body.classList.toggle('admin-sidebar-expanded') : !document.body.classList.toggle('admin-sidebar-collapsed');
            const button = event.currentTarget;
            button.setAttribute('aria-expanded', String(expanded));
            button.setAttribute('aria-label', expanded ? 'Recolher menu lateral' : 'Expandir menu lateral');
        });
        window.addEventListener('online', networkStatus);
        window.addEventListener('offline', networkStatus);
    });
})();
