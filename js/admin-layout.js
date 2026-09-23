/* Navegação, tema e painéis de leitura exclusivos do admin. Sem alterar a API ou as ações de gestão. */
(function () {
    'use strict';

    function setAdminTheme(theme) {
        const next = theme === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-admin-theme', next);
        try { localStorage.setItem('cidadeLimpa_admin_theme', next); } catch (_) { /* modo privado */ }
        const icon = document.querySelector('#adminThemeToggle i');
        if (icon) icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        const button = document.getElementById('adminThemeToggle');
        if (button) button.setAttribute('aria-label', next === 'dark' ? 'Ativar tema claro do painel' : 'Ativar tema escuro do painel');
    }

    function toggleAdminTheme() {
        setAdminTheme(document.documentElement.getAttribute('data-admin-theme') === 'dark' ? 'light' : 'dark');
    }

    function fillCards(elementId, entries, valueLabel) {
        const container = document.getElementById(elementId);
        if (!container) return;
        container.replaceChildren();
        if (!entries.length) {
            const p = document.createElement('p');
            p.className = 'admin-cell-muted';
            p.textContent = 'Nenhuma denúncia encontrada.';
            container.append(p);
            return;
        }
        entries.forEach(([name, amount]) => {
            const card = document.createElement('div');
            card.className = 'admin-report-item';
            const heading = document.createElement('strong');
            const subtitle = document.createElement('span');
            heading.textContent = name;
            subtitle.textContent = amount + ' ' + (amount === 1 ? valueLabel[0] : valueLabel[1]);
            card.append(heading, subtitle);
            container.append(card);
        });
    }

    function updateAdminExtraPanels(denuncias) {
        const categories = new Map();
        const reporters = new Map();
        denuncias.forEach((item) => {
            const category = String(item.categoria || 'Sem categoria');
            categories.set(category, (categories.get(category) || 0) + 1);
            // O identificador é usado só para agrupar autores das denúncias, sem enumerar perfis do Auth.
            const name = String(item.userName || 'Usuário');
            const key = String(item.userId || item.userEmail || name);
            const reporter = reporters.get(key) || { name, total: 0 };
            reporter.total += 1;
            reporters.set(key, reporter);
        });
        fillCards('adminCategoriesSummary', [...categories].sort((a, b) => b[1] - a[1]), ['denúncia', 'denúncias']);
        fillCards('adminReportersSummary',
            [...reporters.values()].sort((a, b) => b.total - a.total).map((u) => [u.name, u.total]),
            ['denúncia', 'denúncias']);
    }

    function exportAdminCsv() {
        // Exporta somente dados já carregados após o controle de acesso existente.
        const source = typeof allDenuncias !== 'undefined' ? allDenuncias : [];
        if (!source.length) {
            if (typeof showToast === 'function') showToast('Não há denúncias para exportar.', 'warning');
            return;
        }
        const fields = ['titulo', 'categoria', 'endereco', 'userName', 'data', 'status'];
        const csvCell = (value) => {
            let text = String(value == null ? '' : value);
            // Evita que planilhas executem fórmulas ao abrir texto enviado pelo usuário.
            if (/^[\s\u0000-\u001f]*[=+@\-]/.test(text)) text = "'" + text;
            return '"' + text.replace(/"/g, '""') + '"';
        };
        const rows = [['Título','Categoria','Endereço','Cidadão','Data','Status'].map(csvCell).join(';')];
        source.forEach((item) => rows.push(fields.map((field) => csvCell(item[field])).join(';')));
        const blob = new Blob(['\uFEFF' + rows.join('\r\n')], {type: 'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'palmeirais-denuncias.csv';
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    window.updateAdminExtraPanels = updateAdminExtraPanels;

    document.addEventListener('DOMContentLoaded', function () {
        let preference = 'dark';
        try { preference = localStorage.getItem('cidadeLimpa_admin_theme') || 'dark'; } catch (_) { /* modo privado */ }
        setAdminTheme(preference);
        document.getElementById('adminThemeToggle')?.addEventListener('click', toggleAdminTheme);
        document.getElementById('adminThemeSetting')?.addEventListener('click', toggleAdminTheme);
        document.getElementById('adminFilterButton')?.addEventListener('click', () => {
            if (typeof handleAdminFilter === 'function') handleAdminFilter();
        });
        document.getElementById('adminExportCsv')?.addEventListener('click', exportAdminCsv);

        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        if (user?.isAdmin) {
            const label = document.getElementById('adminDisplayName');
            const avatar = document.getElementById('adminAvatar');
            if (label) label.textContent = user.nome || 'Administrador';
            if (avatar) {
                const letters = String(user.nome || 'Administrador').trim().split(/\s+/).slice(0, 2)
                    .map(word => word.charAt(0)).join('').toUpperCase();
                avatar.textContent = letters || 'AD';
            }
        }

        const sideLinks = Array.from(document.querySelectorAll('.admin-side-link'));
        const setActive = () => {
            const target = sideLinks.some(link => link.getAttribute('href') === location.hash)
                ? location.hash : '#dashboard';
            sideLinks.forEach((link) => {
                const active = link.getAttribute('href') === target;
                link.classList.toggle('active', active);
                if (active) link.setAttribute('aria-current', 'page');
                else link.removeAttribute('aria-current');
            });
        };
        window.addEventListener('hashchange', setActive);
        sideLinks.forEach((link) => link.addEventListener('click', () => {
            sideLinks.forEach((other) => {
                other.classList.remove('active');
                other.removeAttribute('aria-current');
            });
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }));
        setActive();
    });
})();
