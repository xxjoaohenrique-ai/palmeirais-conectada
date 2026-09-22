/* Search controls only the category cards in #categorias. */
(function () {
  'use strict';
  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLocaleLowerCase('pt-BR').trim();
  }
  function initCategorySearch() {
    const section = document.getElementById('categorias');
    if (!section) return;
    const form = section.querySelector('#categorySearch');
    const input = section.querySelector('#categorySearchInput');
    const empty = section.querySelector('#categoryEmpty');
    const cards = Array.from(section.querySelectorAll('.category-card'));
    if (!form || !input || !empty) return;
    function apply() {
      const search = normalize(input.value);
      let visible = 0;
      for (const card of cards) {
        const match = normalize(card.textContent).includes(search);
        card.hidden = !match;
        if (match) visible++;
      }
      empty.hidden = visible !== 0;
    }
    form.addEventListener('submit', function (event) { event.preventDefault(); apply(); });
    input.addEventListener('input', apply);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCategorySearch);
  else initCategorySearch();
})();