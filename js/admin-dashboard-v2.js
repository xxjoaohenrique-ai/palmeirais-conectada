(function(){
  'use strict';

  function formatCurrentDate(){
    const el=document.getElementById('adminCurrentDate');
    if(!el) return;
    try{
      const text=new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date());
      el.textContent=text.charAt(0).toUpperCase()+text.slice(1);
    }catch(_){ el.textContent='Hoje'; }
  }

  function syncTopSearch(){
    const top=document.getElementById('adminTopSearch');
    const main=document.getElementById('searchInput');
    if(!top||!main) return;
    const run=()=>{
      main.value=top.value;
      if(typeof handleAdminSearch==='function') handleAdminSearch();
    };
    top.addEventListener('input',run);
    document.addEventListener('keydown',(event)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();
        top.focus();
      }
    });
  }

  function setupSidebar(){
    const button=document.getElementById('adminSidebarToggle');
    if(!button) return;
    button.addEventListener('click',()=>{
      document.body.classList.toggle('admin-sidebar-collapsed');
      const collapsed=document.body.classList.contains('admin-sidebar-collapsed');
      button.setAttribute('aria-label',collapsed?'Expandir menu lateral':'Recolher menu lateral');
    });
  }

  function setupQuickActions(){
    const quick=document.getElementById('adminQuickExport');
    const exportButton=document.getElementById('adminExportCsv');
    if(quick&&exportButton) quick.addEventListener('click',()=>exportButton.click());
  }

  function refreshCategorySummary(){
    const source=document.getElementById('adminCategoriesSummary');
    const target=document.getElementById('adminCategoryQuickList');
    const totalEl=document.getElementById('adminDonutTotal');
    if(!source||!target||!totalEl) return;

    const rows=Array.from(source.querySelectorAll('.admin-report-item')).map(item=>{
      const name=item.querySelector('strong')?.textContent?.trim()||'Categoria';
      const raw=item.querySelector('span')?.textContent||'0';
      const amount=parseInt(raw,10)||0;
      return {name,amount};
    }).sort((a,b)=>b.amount-a.amount);

    const total=rows.reduce((sum,row)=>sum+row.amount,0);
    totalEl.innerHTML=String(total)+'<small>Total</small>';
    target.replaceChildren();

    const fallback=['Iluminação Pública','Limpeza Urbana','Infraestrutura','Meio Ambiente','Outros'];
    const top=rows.length?rows.slice(0,5):fallback.map(name=>({name,amount:0}));
    top.forEach((row)=>{
      const percent=total?Math.round((row.amount/total)*100):0;
      const div=document.createElement('div');
      const dot=document.createElement('i');
      const label=document.createElement('span');
      const value=document.createElement('b');
      label.textContent=row.name;
      value.textContent=row.amount+' · '+percent+'%';
      div.append(dot,label,value);
      target.append(div);
    });
  }

  function observeCategories(){
    const source=document.getElementById('adminCategoriesSummary');
    if(!source) return;
    refreshCategorySummary();
    const observer=new MutationObserver(refreshCategorySummary);
    observer.observe(source,{childList:true,subtree:true,characterData:true});
  }

  document.addEventListener('DOMContentLoaded',()=>{
    formatCurrentDate();
    syncTopSearch();
    setupSidebar();
    setupQuickActions();
    observeCategories();
  });
})();