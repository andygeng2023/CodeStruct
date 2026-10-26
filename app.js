(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const $$$ = $$;
  const canvas = $('#siteCanvas'), frame = $('#canvasFrame'), left = $('#leftPanel');
  if (!canvas) { console.error('CodeStruct editor canvas is missing.'); return; }
  let selected = null, zoom = 100, category = 'All', history = [], historyAt = -1, toastTimer;
  const names = {nav:'Navigation',hero:'Hero section',work:'Selected work',footer:'Footer',section:'Section',container:'Container',columns:'Columns',heading:'Heading',paragraph:'Paragraph',button:'Button',link:'Link',image:'Image',video:'Video',divider:'Divider',quote:'Quote',form:'Form'};
  const items = [
    ['Section','Layout','▱','<section class="new-section canvas-node" data-node="section" tabindex="0"><h2 contenteditable="true">A new section</h2><p contenteditable="true">Add your content here.</p></section>'],
    ['Container','Layout','▭','<div class="new-container canvas-node" data-node="container" tabindex="0"><strong contenteditable="true">Container</strong><p contenteditable="true">Group and align elements.</p></div>'],
    ['Columns','Layout','▥','<div class="new-columns canvas-node" data-node="columns" tabindex="0"><div contenteditable="true">Column one</div><div contenteditable="true">Column two</div></div>'],
    ['Heading','Basic','T','<section class="new-section canvas-node" data-node="heading" tabindex="0"><h2 contenteditable="true">A heading that stands out.</h2></section>'],
    ['Paragraph','Basic','≡','<section class="new-section canvas-node" data-node="paragraph" tabindex="0"><p contenteditable="true">Write something meaningful. Select this text to edit it.</p></section>'],
    ['Button','Interactive','▰','<section class="new-section canvas-node" data-node="button" tabindex="0"><button class="dark-cta" type="button" contenteditable="true">Get started ↗</button></section>'],
    ['Link','Interactive','↗','<section class="new-section canvas-node" data-node="link" tabindex="0"><a href="#" contenteditable="true">Explore more ↗</a></section>'],
    ['Image','Media','▧','<section class="new-section canvas-node" data-node="image" tabindex="0"><div class="image-placeholder"><span>▧</span><strong>Image placeholder</strong><small>Replace with your own image</small></div></section>'],
    ['Video','Media','▷','<section class="new-section canvas-node" data-node="video" tabindex="0"><div class="image-placeholder"><span>▷</span><strong>Video placeholder</strong><small>Add a video embed in settings</small></div></section>'],
    ['Divider','Basic','—','<section class="new-section canvas-node" data-node="divider" tabindex="0"><hr></section>'],
    ['Quote','Basic','❝','<section class="new-section canvas-node" data-node="quote" tabindex="0"><blockquote contenteditable="true">“Great design makes the complex feel simple.”</blockquote></section>'],
    ['Form','Interactive','▤','<section class="new-section canvas-node" data-node="form" tabindex="0"><form class="demo-form"><label>Name<input placeholder="Your name"></label><label>Email<input type="email" placeholder="you@example.com"></label><button type="button" class="dark-cta">Send message ↗</button></form></section>']
  ];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function notice(s) { const el=$('#toast'); if(!el){console.info(s);return;} el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200); }
  function dirty(){if($('#saveStatus')){$('#saveStatus').innerHTML='<i></i> Unsaved changes';$('#saveStatus').style.color='#d9c58b';}}
  function snapshot(){const s=canvas.innerHTML;if(history[historyAt]===s)return;history=history.slice(0,historyAt+1);history.push(s);if(history.length>40)history.shift();historyAt=history.length-1;dirty();}
  function restore(s){canvas.innerHTML=s;selected=null;bindNodes();inspector();snapshotStatus();}
  function snapshotStatus(){const label=$('#selectionLabel');if(label)label.textContent='No element selected';if($('#saveStatus')){$('#saveStatus').innerHTML='<i></i> All changes saved';$('#saveStatus').style.color='#8d919b';}}
  function undo(){if(historyAt<1)return notice('Nothing more to undo');historyAt--;restore(history[historyAt]);notice('Change undone');}
  function redo(){if(historyAt>=history.length-1)return notice('Nothing more to redo');historyAt++;restore(history[historyAt]);notice('Change restored');}
  function renderItems(){const host=$('#elementGrid');if(!host)return;const q=($('#elementSearch')?.value||'').trim().toLowerCase();host.innerHTML=items.filter(x=>(category==='All'||x[1]===category)&&x[0].toLowerCase().includes(q)).map(x=>'<button class="element-card" data-add="'+esc(x[0])+'"><span class="element-icon">'+x[2]+'</span><span class="element-name">'+x[0]+'</span><span class="element-category">'+x[1]+'</span></button>').join('');$$('[data-add]',host).forEach(b=>b.onclick=()=>addItem(b.dataset.add));}
  function bindNodes(){$$('.canvas-node',canvas).forEach(n=>{n.tabIndex=0;n.onclick=e=>{if(e.target.closest('[contenteditable="true"]')){e.stopPropagation();select(n);return;}if(e.target.closest('a'))e.preventDefault();e.stopPropagation();select(n);};n.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target===n){e.preventDefault();select(n);}};n.querySelectorAll('[contenteditable="true"]').forEach(t=>{t.oninput=dirty;t.onblur=snapshot;});});}
  function addItem(name){const item=items.find(x=>x[0]===name);if(!item)return;const temp=document.createElement('template');temp.innerHTML=item[3].trim();const node=temp.content.firstElementChild;canvas.insertBefore(node,selected?.parentElement===canvas?selected.nextSibling:null);bindNodes();select(node);snapshot();notice(name+' added');node.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});}
  function select(n){selected?.classList.remove('selected');selected=n;if(n)n.classList.add('selected');inspector();const label=$('#selectionLabel');if(label)label.textContent=n?(names[n.dataset.node]||n.dataset.node||'Element')+' selected':'No element selected';}
  function rgbHex(v){if(!v)return '#171815';if(v.startsWith('#'))return v;const m=v.match(/\d+/g);return m&&m.length>=3?'#'+m.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join(''):'#171815';}
  function inspector(){if(!$('#emptySelection'))return;const empty=!selected;$('#emptySelection').hidden=!empty;$('#styleControls').hidden=empty;if($('#settingsControls'))$('#settingsControls').hidden=empty||$('#settingsControls').dataset.active!=='true';if(empty)return;const key=selected.dataset.node||selected.tagName.toLowerCase();$('#selectedName').textContent=names[key]||key;$('#selectedTag').textContent='<'+selected.tagName.toLowerCase()+'>';const target=selected.querySelector('h1,h2,h3,p,blockquote,a,button,strong')||selected;const content=$('#contentControls');content.innerHTML='<label class="field-label">Text content</label><textarea id="nodeText" class="full-input" rows="3" style="height:65px;padding:8px;resize:vertical;font-family:inherit">'+esc(target.innerText.trim())+'</textarea>';$('#nodeText').oninput=e=>{if(target.matches('h1,h2,h3,p,blockquote,a,button,strong'))target.textContent=e.target.value;else{const p=target.querySelector('p');if(p)p.textContent=e.target.value;}dirty();};$('#nodeText').onchange=snapshot;
    const vals={width:selected.style.width||'100%',height:selected.style.minHeight||'auto',padding:selected.style.padding||'32px',gap:selected.style.gap||'16px',fontSize:selected.style.fontSize||'16px',fontWeight:selected.style.fontWeight||'400',radius:selected.style.borderRadius||'0px'};
    Object.entries(vals).forEach(([k,v])=>{const el=$('#'+({fontSize:'fontSizeInput',fontWeight:'fontWeightInput',height:'heightInput',width:'widthInput',padding:'paddingInput',gap:'gapInput',radius:'radiusInput'}[k]));if(el)el.value=v;});
    const color=rgbHex(getComputedStyle(selected).color),bg=rgbHex(getComputedStyle(selected).backgroundColor);$('#textColorInput').value=color;$('#textColorHex').value=color;$('#bgColorInput').value=bg;$('#bgColorHex').value=bg;$('#opacityInput').value=Math.round((Number(selected.style.opacity)||1)*100);$('#opacityValue').textContent=$('#opacityInput').value+'%';$('#nodeIdInput').value=selected.id||'';
    $$('.segmented button').forEach(b=>b.classList.toggle('active',b.dataset.display===(selected.style.display||'block')));$$('.align-controls button').forEach(b=>b.classList.toggle('active',b.dataset.align===selected.style.justifyContent));
  }
  function style(prop,value){if(!selected)return;selected.style[prop]=value;dirty();}
  function bindColor(colorId,hexId,prop){const c=$('#'+colorId),h=$('#'+hexId);c.oninput=()=>{h.value=c.value;style(prop,c.value);};h.onchange=()=>{if(/^#[\da-f]{6}$/i.test(h.value)){c.value=h.value;style(prop,h.value);}else{notice('Enter a valid six-digit hex color');h.value=c.value;}};}
  bindColor('textColorInput','textColorHex','color');bindColor('bgColorInput','bgColorHex','backgroundColor');
  [['widthInput','width'],['heightInput','minHeight'],['paddingInput','padding'],['gapInput','gap'],['fontSizeInput','fontSize'],['fontWeightInput','fontWeight'],['radiusInput','borderRadius']].forEach(([id,prop])=>{const el=$('#'+id);if(el)el.onchange=()=>{if(!selected)return;const v=el.value.trim();if(v&&(/^[\w.%() ,/-]+$/.test(v))){style(prop,v);snapshot();}else notice('Enter a valid CSS value');};});
  $('#opacityInput')?.addEventListener('input',e=>{if(selected){$('#opacityValue').textContent=e.target.value+'%';style('opacity',Number(e.target.value)/100);}});$('#opacityInput')?.addEventListener('change',snapshot);
  $$('.segmented button').forEach(b=>b.onclick=()=>{if(!selected)return notice('Select an element first');style('display',b.dataset.display);if(b.dataset.display==='grid')selected.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';$$('.segmented button').forEach(x=>x.classList.toggle('active',x===b));snapshot();});
  $$('.align-controls button').forEach(b=>b.onclick=()=>{if(!selected)return;selected.style.display='flex';style('justifyContent',b.dataset.align);$$('.align-controls button').forEach(x=>x.classList.toggle('active',x===b));snapshot();});
  $('#nodeIdInput')?.addEventListener('change',e=>{if(!selected)return;const v=e.target.value.trim();if(v&&!/^[A-Za-z][\w:.-]*$/.test(v)){notice('ID must start with a letter and contain no spaces');e.target.value=selected.id;return;}if(v&&$$('[id]',canvas).some(n=>n!==selected&&n.id===v)){notice('That ID is already in use');e.target.value=selected.id;return;}selected.id=v;snapshot();});
  $('#deleteNode')?.addEventListener('click',()=>{if(!selected)return;selected.remove();select(null);snapshot();notice('Element deleted');});
  $('#renameNode')?.addEventListener('click',()=>{if(!selected)return;const v=prompt('Element label:',names[selected.dataset.node]||selected.dataset.node);if(v?.trim()){selected.dataset.node=v.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-');inspector();snapshot();}});
  $$('.section-toggle').forEach(b=>b.onclick=()=>{const body=b.nextElementSibling;body.hidden=!body.hidden;b.querySelector('span').textContent=body.hidden?'▸':'▾';});
  $$('.inspector-tab').forEach(b=>b.onclick=()=>{const settings=b.dataset.inspector==='settings';$$('.inspector-tab').forEach(x=>x.classList.toggle('active',x===b));$('#settingsControls').dataset.active=String(settings);$('#styleControls').hidden=!selected||settings;$('#emptySelection').hidden=!!selected||settings;$('#settingsControls').hidden=!selected||!settings;});
  $$('.category').forEach(b=>b.onclick=()=>{category=b.dataset.category;$$('.category').forEach(x=>x.classList.toggle('active',x===b));renderItems();});$('#elementSearch')?.addEventListener('input',renderItems);
  $$('.rail-tool').forEach(b=>b.onclick=()=>{const panel=b.dataset.panel;$$('.rail-tool').forEach(x=>x.classList.toggle('selected',x===b));if(panel==='add'){left.classList.remove('collapsed');$('#panelTitle').textContent='Add elements';$('#panelSubtitle').textContent='Build your page from blocks';$('#panelContent').hidden=false;renderItems();return;}if(panel==='layers'){left.classList.remove('collapsed');$('#panelTitle').textContent='Navigator';$('#panelSubtitle').textContent='Select an element on the page';$('#panelContent').innerHTML=$$('.canvas-node',canvas).map(n=>'<button class="layer-item" data-layer="'+esc(n.dataset.node)+'">▱　'+esc(names[n.dataset.node]||n.dataset.node)+'</button>').join('');$$('[data-layer]').forEach(x=>x.onclick=()=>{const n=$$('.canvas-node',canvas).find(n=>n.dataset.node===x.dataset.layer);if(n)select(n);});return;}const labels={pages:['Pages','Manage site pages'],assets:['Assets','Images and media'],settings:['Project settings','Site configuration']};const [title,sub]=labels[panel]||labels.pages;$('#panelTitle').textContent=title;$('#panelSubtitle').textContent=sub;$('#panelContent').innerHTML=panel==='pages'?'<div class="page-list"><button class="page-item active">▤　Home</button><button class="page-item" id="newPage">＋　New page</button></div>':panel==='assets'?'<div class="asset-empty"><strong>Assets</strong><p>Use Image elements to add placeholders. Asset uploads are not connected yet.</p></div>':'<div class="page-list"><p class="hint">Changes currently exist in this browser session only.</p><button class="button secondary full-button" id="exportSettings">Export HTML</button></div>';$('#newPage')?.addEventListener('click',()=>notice('Multiple-page routing is not implemented yet'));$('#exportSettings')?.addEventListener('click',exportHtml);left.classList.remove('collapsed');});
  $('#collapseLeft')?.addEventListener('click',()=>left.classList.toggle('collapsed'));
  function setZoom(v){zoom=Math.max(50,Math.min(125,v));$('#zoomValue').textContent=zoom+'%';frame.style.transform='scale('+zoom/100+')';frame.style.width=(100/(zoom/100))+'%';frame.style.marginBottom=(frame.offsetHeight*(zoom/100-1))+'px';}
  $('#zoomIn')?.addEventListener('click',()=>setZoom(zoom+10));$('#zoomOut')?.addEventListener('click',()=>setZoom(zoom-10));
  $$('.viewport-button').forEach(b=>b.onclick=()=>{$$('.viewport-button').forEach(x=>x.classList.toggle('active',x===b));const v=b.dataset.viewport;frame.style.width=v==='desktop'?'100%':v==='tablet'?'768px':'390px';frame.style.maxWidth='100%';frame.style.transform='none';$('#zoomValue').textContent='100%';zoom=100;$('#viewportLabel').textContent=v==='desktop'?'Desktop · 1440px':v==='tablet'?'Tablet · 768px':'Mobile · 390px';$('#canvasScroll').scrollLeft=0;});
  function exportHtml(){const clone=canvas.cloneNode(true);clone.querySelectorAll('.selected').forEach(n=>n.classList.remove('selected'));clone.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));clone.querySelectorAll('.canvas-node').forEach(n=>n.removeAttribute('tabindex'));const html='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CodeStruct export</title><link rel="stylesheet" href="styles.css"></head><body>'+clone.outerHTML+'</body></html>';$('#exportCode').value=html;$('#codeDialog').showModal();}
  $$('.top-tab').forEach(b=>b.onclick=()=>{const mode=b.dataset.mode;$$('.top-tab').forEach(x=>x.classList.toggle('active',x===b));document.body.classList.toggle('preview-mode',mode==='preview');document.body.classList.toggle('code-mode',mode==='code');if(mode==='code')exportHtml();if(mode==='preview')notice('Preview mode. Choose Designer to continue editing.');});
  $('#previewBtn')?.addEventListener('click',()=> $('[data-mode="preview"]')?.click());$('#undoBtn')?.addEventListener('click',undo);$('#redoBtn')?.addEventListener('click',redo);
  $('#publishBtn')?.addEventListener('click',()=>$('#publishDialog').showModal());$('#confirmPublish')?.addEventListener('click',e=>{e.preventDefault();$('#publishDialog').close();downloadCurrentPage();});
  $('#copyUrl')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText('https://'+$('#siteSlug').value);notice('URL copied');}catch{ $('#siteSlug').select();notice('Select and copy the URL manually');}});
  $('#copyCode')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#exportCode').value);notice('HTML copied');}catch{$('#exportCode').select();notice('Select and copy the HTML manually');}});
  $('#projectName')?.addEventListener('click',()=>{const name=prompt('Website name:', $('#projectName').childNodes[0].textContent.trim());if(name?.trim()){$('#projectName').childNodes[0].textContent=name.trim()+' ';notice('Project name updated');}});
  canvas.addEventListener('click',e=>{if(e.target===canvas)select(null);});
  document.addEventListener('keydown',e=>{const editing=e.target.matches('input,textarea,select,[contenteditable="true"]');if(e.key==='Escape'&&selected&&!editing){select(null);return;}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!editing){e.preventDefault();e.shiftKey?redo():undo();}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='y'&&!editing){e.preventDefault();redo();}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();snapshot();if($('#saveStatus')){$('#saveStatus').innerHTML='<i></i> Snapshot saved';$('#saveStatus').style.color='#8d919b';}}if(e.key==='Delete'&&selected&&!editing){e.preventDefault();$('#deleteNode')?.click();}});
  const styleTag=document.createElement('style');styleTag.textContent='.new-section{padding:38px 7%;min-height:90px;background:#f5f3ee;color:#171815}.new-section h2{font-size:clamp(28px,4vw,48px);letter-spacing:-.06em;margin:0 0 12px}.new-section p{line-height:1.7;color:#686a61}.new-container{margin:24px auto;padding:28px;border:1px dashed #aaa;background:#f8f7f2;max-width:85%}.new-columns{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:30px 7%;background:#f5f3ee}.new-columns>div{min-height:90px;padding:25px;background:#eae9e2}.image-placeholder{min-height:180px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:9px;border:1px dashed #a4a69a;background:#eae9e2;color:#65675e}.image-placeholder>span{font-size:28px}.demo-form{max-width:380px;display:grid;gap:14px}.demo-form label{display:grid;gap:6px}.demo-form input{padding:12px;border:1px solid #cecec4;background:#fff}.new-section blockquote{font:italic 24px Georgia,serif;margin:15px 0}.new-section a{color:#243820}.layer-list,.page-list{padding:12px;display:grid;gap:5px}.layer-item,.page-item{padding:10px;text-align:left;border:1px solid #343740;background:#202229;color:#ddd;border-radius:5px}.layer-item:hover,.page-item:hover{border-color:#a6f28b}.asset-empty{padding:20px;color:#bfc1c8}.asset-empty p{line-height:1.6;color:#888}.preview-mode .tool-rail,.preview-mode .left-panel,.preview-mode .right-panel,.preview-mode .canvas-toolbar{display:none}.preview-mode .canvas-scroll{padding:0;background:#fff}.preview-mode .canvas-frame{max-width:none;box-shadow:none;width:100%!important;transform:none!important}.preview-mode .bottom-bar{display:none}.preview-mode .editor-area{background:#fff}.code-mode .site-canvas:before{content:"HTML export preview";display:block;padding:12px;background:#191b21;color:#b8efaa;font:11px monospace}@media(max-width:650px){.right-panel{width:0;overflow:hidden}.left-panel{position:absolute;z-index:6;left:43px;top:0;bottom:0;box-shadow:10px 0 35px #0005}.canvas-scroll{padding:12px 8px}}';document.head.appendChild(styleTag);


  // Persistence, multi-page editing, assets and safer exports.
  const PROJECT_KEY = 'codestruct.project.v2';
  const LEGACY_PROJECT_KEY = 'codestruct.project.v1';
  const project = { name: 'Untitled website', activePage: 'Home', pages: {}, assets: [] };
  let persistTimer = null;
  function capturePage() {
    if (project.activePage) project.pages[project.activePage] = canvas.innerHTML;
  }
  function saveProject() {
    capturePage();
    project.name = ($('#projectName')?.childNodes[0]?.textContent || 'Untitled website').trim();
    try {
      localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
      if ($('#saveStatus')) {
        $('#saveStatus').innerHTML = '<i></i> All changes saved';
        $('#saveStatus').style.color = '#8d919b';
      }
    } catch (err) {
      notice('Browser storage is full. Export your project to keep a backup.');
      console.warn('CodeStruct local save failed', err);
    }
  }
  function scheduleSave() {
    originalDirty();
    clearTimeout(persistTimer);
    if ($('#saveStatus')) {
      $('#saveStatus').innerHTML = '<i></i> Saving…';
      $('#saveStatus').style.color = '#d9c58b';
    }
    persistTimer = setTimeout(saveProject, 300);
  }
  function loadProject() {
    try {
      const raw = localStorage.getItem(PROJECT_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object' || !saved.pages || typeof saved.pages !== 'object') return false;
      Object.assign(project, saved);
      const page = project.pages[project.activePage] || Object.values(project.pages)[0];
      if (typeof page === 'string') canvas.innerHTML = page;
      if ($('#projectName') && project.name) $('#projectName').childNodes[0].textContent = project.name + ' ';
      bindNodes();
      return true;
    } catch (err) {
      console.warn('Could not restore CodeStruct project', err);
      return false;
    }
  }
  function pageNames() { return Object.keys(project.pages); }
  function renderPagesPanel() {
    $('#panelTitle').textContent = 'Pages';
    $('#panelSubtitle').textContent = 'Manage your site pages';
    $('#panelContent').innerHTML = '<div class="page-list">' +
      pageNames().map(p => '<button class="page-item ' + (p === project.activePage ? 'active' : '') + '" data-open-page="' + esc(p) + '">▤　' + esc(p) + '</button>').join('') +
      '<button class="page-item" id="newPage">＋　New page</button>' +
      '<button class="page-item" id="renamePage">✎　Rename current page</button>' +
      '<button class="page-item" id="duplicatePage">▣　Duplicate current page</button>' +
      (pageNames().length > 1 ? '<button class="page-item" id="deletePage">−　Delete current page</button>' : '') +
      '</div>';
    $$('[data-open-page]').forEach(b => b.onclick = () => {
      capturePage();
      project.activePage = b.dataset.openPage;
      canvas.innerHTML = project.pages[project.activePage] || '';
      selected = null; bindNodes(); inspector(); snapshot(); renderPagesPanel(); updatePageLabel(); scheduleSave();
    });
    $('#newPage')?.addEventListener('click', () => {
      const name = prompt('New page name:', 'New page');
      if (!name?.trim()) return;
      const clean = name.trim().slice(0, 60);
      if (project.pages[clean]) return notice('A page with that name already exists');
      capturePage(); project.pages[clean] = '<section class="new-section canvas-node" data-node="section" tabindex="0"><h1 contenteditable="true">' + esc(clean) + '</h1><p contenteditable="true">Start building this page.</p></section>';
      project.activePage = clean; canvas.innerHTML = project.pages[clean]; selected = null; bindNodes(); inspector(); snapshot(); renderPagesPanel(); updatePageLabel(); scheduleSave(); notice('Page created');
    });
    $('#renamePage')?.addEventListener('click', () => {
      const name = prompt('Rename page:', project.activePage);
      if (!name?.trim()) return;
      const clean = name.trim().slice(0, 60);
      if (clean !== project.activePage && project.pages[clean]) return notice('A page with that name already exists');
      capturePage(); const html = project.pages[project.activePage]; delete project.pages[project.activePage]; project.pages[clean] = html; project.activePage = clean; updatePageLabel(); renderPagesPanel(); scheduleSave();
    });
    $('#duplicatePage')?.addEventListener('click', () => {
      const name = prompt('Name for the duplicate page:', project.activePage + ' copy');
      if (!name?.trim()) return;
      const clean = name.trim().slice(0, 60);
      if (project.pages[clean]) return notice('A page with that name already exists');
      capturePage(); project.pages[clean] = project.pages[project.activePage]; project.activePage = clean; canvas.innerHTML = project.pages[clean]; bindNodes(); selected = null; inspector(); snapshot(); renderPagesPanel(); updatePageLabel(); scheduleSave(); notice('Page duplicated');
    });
    $('#deletePage')?.addEventListener('click', () => {
      if (pageNames().length < 2 || !confirm('Delete page "' + project.activePage + '"?')) return;
      delete project.pages[project.activePage]; project.activePage = pageNames()[0]; canvas.innerHTML = project.pages[project.activePage]; selected = null; bindNodes(); inspector(); snapshot(); renderPagesPanel(); updatePageLabel(); scheduleSave(); notice('Page deleted');
    });
  }
  function updatePageLabel() {
    const strong = $('.breadcrumb strong');
    if (strong) strong.textContent = project.activePage;
    const title = document.querySelector('.canvas-toolbar .status-pill');
    if (title) title.textContent = 'Local draft';
  }
  function renderAssetsPanel() {
    $('#panelTitle').textContent = 'Assets';
    $('#panelSubtitle').textContent = 'Upload and reuse media';
    $('#panelContent').innerHTML = '<div class="page-list"><label class="button secondary full-button" for="assetUpload">＋ Upload images</label><input id="assetUpload" type="file" accept="image/*" multiple hidden><p class="hint">Images are stored in this browser project. Large uploads may exceed browser storage limits.</p><div class="asset-grid">' +
      project.assets.map((a,i) => '<button class="asset-card" data-asset="' + i + '" title="Insert ' + esc(a.name) + '"><img alt="" src="' + a.data + '"><span>' + esc(a.name) + '</span></button>').join('') +
      '</div></div>';
    $('#assetUpload')?.addEventListener('change', async e => {
      const files = [...(e.target.files || [])].filter(f => f.type.startsWith('image/'));
      for (const file of files) {
        if (file.size > 3 * 1024 * 1024) { notice(file.name + ' is over 3 MB; skipped'); continue; }
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
        }).catch(() => null);
        if (data) project.assets.push({ name: file.name.slice(0, 100), data });
      }
      renderAssetsPanel(); scheduleSave(); notice('Assets updated');
    });
    $$('[data-asset]').forEach(b => b.onclick = () => {
      const asset = project.assets[Number(b.dataset.asset)];
      if (!asset) return;
      const node = document.createElement('section'); node.className = 'new-section canvas-node'; node.dataset.node = 'image'; node.tabIndex = 0;
      const img = document.createElement('img'); img.src = asset.data; img.alt = asset.name; img.style.cssText = 'display:block;max-width:100%;height:auto;border-radius:4px';
      node.append(img); canvas.insertBefore(node, selected?.parentElement === canvas ? selected.nextSibling : null); bindNodes(); select(node); snapshot(); scheduleSave(); notice('Image added to canvas');
    });
  }
  function duplicateSelected() {
    if (!selected) return notice('Select an element to duplicate');
    const copy = selected.cloneNode(true); copy.removeAttribute('id'); copy.classList.remove('selected');
    copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    selected.after(copy); bindNodes(); select(copy); snapshot(); scheduleSave(); notice('Element duplicated');
  }
  // Override the starter export with a self-contained HTML document, including same-origin CSS.
  function exportHtml() {
    const clone = canvas.cloneNode(true);
    clone.querySelectorAll('.selected').forEach(n => n.classList.remove('selected'));
    clone.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
    clone.querySelectorAll('.canvas-node').forEach(n => n.removeAttribute('tabindex'));
    let css = '';
    for (const sheet of [...document.styleSheets]) {
      try { css += [...sheet.cssRules].map(rule => rule.cssText).join('\n') + '\n'; }
      catch (err) { console.warn('Skipping stylesheet that cannot be exported', err); }
    }
    const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
      esc(project.activePage || 'CodeStruct export') + '</title><meta name="description" content="' + description + '"><meta name="robots" content="' + robots + '">' + (canonical ? '<link rel="canonical" href="' + canonical + '">' : '') + (socialImage ? '<meta property="og:image" content="' + socialImage + '">' : '') + '<style>' + css.replace(/<\/style/gi, '<\\/style') +
      '</style></head><body>' + clone.outerHTML + '</body></html>';
    $('#exportCode').value = html;
    $('#codeDialog').showModal();
  }

  function getExportHTML() {
    const clone = canvas.cloneNode(true);
    clone.querySelectorAll('.selected').forEach(n => n.classList.remove('selected'));
    clone.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
    clone.querySelectorAll('.canvas-node').forEach(n => n.removeAttribute('tabindex'));
    clone.querySelectorAll('[draggable]').forEach(n => n.removeAttribute('draggable'));
    clone.querySelectorAll('.drop-target,.is-dragging').forEach(n => n.classList.remove('drop-target','is-dragging'));
    let css = '';
    for (const sheet of [...document.styleSheets]) {
      try { css += [...sheet.cssRules].map(rule => rule.cssText).join('\\n') + '\\n'; } catch {}
    }
    css += '\\n@keyframes csFade{from{opacity:0}to{opacity:1}}@keyframes csRise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}@keyframes csSlide{from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:translateX(0)}}@keyframes csScale{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}[data-anim-preset]{animation-duration:var(--cs-anim-duration,600ms);animation-delay:var(--cs-anim-delay,0ms);animation-fill-mode:both;animation-timing-function:cubic-bezier(.2,.7,.2,1)}[data-anim-preset="fade"]{animation-name:csFade}[data-anim-preset="rise"]{animation-name:csRise}[data-anim-preset="slide"]{animation-name:csSlide}[data-anim-preset="scale"]{animation-name:csScale}';\n    css += '\\n' + Object.entries(project.classes || {}).map(([name,props]) => {
      const declarations = Object.entries(props || {}).filter(([k,v]) => ['color','backgroundColor','padding','fontSize','borderRadius'].includes(k) && typeof v === 'string' && /^[#a-zA-Z0-9.%() ,/-]+$/.test(v)).map(([k,v]) => k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+v).join(';');
      return /^[a-zA-Z_][\\w-]*$/.test(name) && declarations ? '.'+CSS.escape(name)+'{'+declarations+'}' : '';
    }).join('\\n') + '\\n' + Object.entries(project.responsiveStyles || {}).map(([key,entry]) => {
      const decl = values => Object.entries(values || {}).filter(([prop,value]) => typeof value === 'string' && /^[#a-zA-Z0-9.%() ,/-]+$/.test(value)).map(([prop,value]) => prop.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+value).join(';');
      const selector = '[data-editor-key="' + key.replace(/[^a-zA-Z0-9_-]/g,'') + '"]';
      return (decl(entry.base) ? selector+'{'+decl(entry.base)+'}' : '') + (decl(entry.tablet) ? '@media(max-width:991px){'+selector+'{'+decl(entry.tablet)+'}}' : '') + (decl(entry.mobile) ? '@media(max-width:767px){'+selector+'{'+decl(entry.mobile)+'}}' : '');
    }).join('\\n') + '\\n' + (project.customCode?.css || '');
    const title = esc(project.seo?.title || project.activePage || 'Website');
    const description = esc(project.seo?.description || '');
    const canonical = /^https?:\/\//i.test(project.seo?.canonical || '') ? esc(project.seo.canonical) : '';
    const socialImage = /^https:\/\//i.test(project.seo?.socialImage || '') ? esc(project.seo.socialImage) : '';
    const robots = project.seo?.indexable === false ? 'noindex,nofollow' : 'index,follow';
    return '<!doctype html>\\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><meta name="description" content="' + description + '"><meta name="robots" content="' + robots + '">' + (canonical ? '<link rel="canonical" href="' + canonical + '">' : '') + (socialImage ? '<meta property="og:image" content="' + socialImage + '">' : '') + '<style>' + css.split('</style').join('<\\/style') + '</style></head><body>' + clone.outerHTML + '</body></html>';
  }
  function downloadCurrentPage() {
    const html = getExportHTML();
    const blob = new Blob([html], {type:'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = (project.activePage || 'website').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'website';
    a.href = url; a.download = filename + '.html'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice('Downloaded a self-contained HTML file for this page.');
  }

  // Drag-and-drop reordering and basic container nesting.
  let draggedNode = null;
  const dragObserver = new MutationObserver(() => {
    $$('.canvas-node', canvas).forEach(n => { n.draggable = true; });
  });
  dragObserver.observe(canvas, {childList:true, subtree:true});
  $$('.canvas-node', canvas).forEach(n => { n.draggable = true; });
  canvas.addEventListener('dragstart', e => {
    const node = e.target.closest('.canvas-node');
    if (!node || !canvas.contains(node)) return;
    draggedNode = node;
    e.dataTransfer?.setData('text/plain', 'codestruct-node');
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    node.classList.add('is-dragging');
  });
  canvas.addEventListener('dragend', () => {
    draggedNode?.classList.remove('is-dragging');
    draggedNode = null;
    $$('.drop-target', canvas).forEach(n => n.classList.remove('drop-target'));
  });
  canvas.addEventListener('dragover', e => {
    if (!draggedNode) return;
    const target = e.target.closest('.canvas-node');
    if (target && target !== draggedNode && !draggedNode.contains(target)) {
      e.preventDefault();
      $$('.drop-target', canvas).forEach(n => n.classList.remove('drop-target'));
      target.classList.add('drop-target');
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }
  });
  canvas.addEventListener('drop', e => {
    if (!draggedNode) return;
    const target = e.target.closest('.canvas-node');
    if (!target || target === draggedNode || draggedNode.contains(target)) return;
    e.preventDefault();
    const canContain = ['container','columns','section'].includes(target.dataset.node);
    if (canContain && (e.altKey || target.dataset.node === 'container' || target.dataset.node === 'columns')) {
      target.appendChild(draggedNode);
    } else {
      target.parentNode.insertBefore(draggedNode, target);
    }
    $$('.drop-target', canvas).forEach(n => n.classList.remove('drop-target'));
    draggedNode.classList.remove('is-dragging');
    select(draggedNode); snapshot(); scheduleSave(); notice('Element moved');
  });

  // Persist edits and snapshots, without requiring a backend or exposing project data remotely.
  const originalDirty = dirty;
  dirty = function () { originalDirty(); scheduleSave(); };
  const originalSnapshot = snapshot;
  snapshot = function () { originalSnapshot(); scheduleSave(); };
  canvas.addEventListener('input', e => { if (e.target.matches('[contenteditable="true"]')) scheduleSave(); });
  canvas.addEventListener('blur', e => { if (e.target.matches('[contenteditable="true"]')) { originalSnapshot(); scheduleSave(); } }, true);
  // Keep panel navigation functional rather than showing placeholder messages.
  $$('.rail-tool').forEach(b => {
    if (b.dataset.panel === 'pages') b.onclick = () => { $$('.rail-tool').forEach(x => x.classList.toggle('selected', x === b)); left.classList.remove('collapsed'); renderPagesPanel(); };
    if (b.dataset.panel === 'assets') b.onclick = () => { $$('.rail-tool').forEach(x => x.classList.toggle('selected', x === b)); left.classList.remove('collapsed'); renderAssetsPanel(); };
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('input,textarea,select,[contenteditable="true"]');
    if (!editing && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); }
  });
  // Restore the last saved project after all functions and event handlers are installed.
  const restored = loadProject();
  if (!restored) {
    project.pages.Home = canvas.innerHTML;
    project.activePage = 'Home';
    project.name = 'Untitled website';
  }
  updatePageLabel();
  renderItems();
  saveProject();



  // Independent inline style overrides for desktop, tablet and mobile.
  let activeBreakpoint = 'desktop';
  project.responsiveStyles = project.responsiveStyles || {};
  function ensureNodeKeys() {
    $('.canvas-node', canvas).forEach(n => { if (!n.dataset.editorKey) n.dataset.editorKey = 'node-' + Math.random().toString(36).slice(2,11); });
  }
  function responsiveEntry(node) {
    const key = node.dataset.editorKey;
    project.responsiveStyles[key] = project.responsiveStyles[key] || {base:{},tablet:{},mobile:{}};
    return project.responsiveStyles[key];
  }
  function applyResponsiveBreakpoint(bp) {
    activeBreakpoint = bp;
    ensureNodeKeys();
    $('.canvas-node', canvas).forEach(node => {
      const entry = responsiveEntry(node);
      const props = new Set([...Object.keys(entry.base || {}), ...Object.keys(entry.tablet || {}), ...Object.keys(entry.mobile || {})]);
      props.forEach(prop => {
        const value = bp === 'desktop' ? entry.base[prop] : ((entry[bp] || {})[prop] ?? entry.base[prop]);
        if (value == null || value === '') node.style[prop] = '';
        else node.style[prop] = value;
      });
    });
  }
  const originalStyle = style;
  style = function(prop, value) {
    if (!selected) return;
    ensureNodeKeys();
    const entry = responsiveEntry(selected);
    if (activeBreakpoint === 'desktop') entry.base[prop] = value;
    else entry[activeBreakpoint][prop] = value;
    selected.style[prop] = value;
    dirty();
  };
  // Reapply viewport-specific styles after selecting or restoring nodes.
  const responsiveBaseBindNodes = bindNodes;
  bindNodes = function() { responsiveBaseBindNodes(); ensureNodeKeys(); applyResponsiveBreakpoint(activeBreakpoint); };
  const originalViewportHandlers = $('.viewport-button');
  originalViewportHandlers.forEach(b => {
    const oldHandler = b.onclick;
    b.onclick = function() {
      if (activeBreakpoint === 'desktop') {
        ensureNodeKeys();
        $('.canvas-node', canvas).forEach(node => {
          const entry = responsiveEntry(node);
          Array.from(node.style).forEach(prop => {
            const value = node.style[prop];
            if (value) entry.base[prop] = value;
          });
        });
      }
      if (oldHandler) oldHandler.call(this);
      applyResponsiveBreakpoint(b.dataset.viewport);
      scheduleSave();
    };
  });


  project.components = project.components || {};
  function renderComponentsPanel() {
    const rows = Object.entries(project.components);
    panelShell('Components', 'Linked components update every instance',
      '<div class="page-list"><label class="field-label">Component name</label><input id="componentName" class="full-input" placeholder="Hero, testimonial, CTA"><button id="saveComponent" class="button primary full-button">Link selected element</button><div class="panel-divider"></div>' +
      rows.map(([name,component]) => '<section class="cms-collection"><strong>' + esc(name) + '</strong><span class="hint">' + (component.instances || []).length + ' linked instance(s)</span><button data-refresh-component="' + esc(name) + '" class="button secondary full-button">Update all instances from selected</button><button data-insert-component="' + esc(name) + '" class="button secondary full-button">Insert linked instance</button><button data-delete-component="' + esc(name) + '" class="button secondary full-button">Unlink component</button></section>').join('') +
      '<p class="hint">Select a linked instance and update it to propagate its markup to all linked copies. Component links are project-wide across pages.</p></div>');
    $('#saveComponent')?.addEventListener('click', () => {
      if (!selected) return notice('Select an element first');
      const name = ($('#componentName').value || '').trim().slice(0,80);
      if (!name) return notice('Enter a component name');
      const id = project.components[name]?.id || 'component-' + Math.random().toString(36).slice(2,11);
      selected.dataset.componentId = id;
      project.components[name] = { id, html: selected.outerHTML, instances: [] };
      capturePage();
      for (const pageName of pageNames()) {
        const template = document.createElement('template'); template.innerHTML = project.pages[pageName] || '';
        template.content.querySelectorAll('[data-component-id="' + CSS.escape(id) + '"]').forEach(node => {
          if (node !== selected) node.dataset.componentId = id;
        });
        project.pages[pageName] = template.innerHTML;
      }
      scheduleSave(); renderComponentsPanel(); notice('Linked component created');
    });
    $$('[data-refresh-component]').forEach(button => button.onclick = () => {
      const name = button.dataset.refreshComponent, component = project.components[name];
      if (!selected || !component) return notice('Select the updated component instance first');
      if (selected.dataset.componentId !== component.id) return notice('Select an instance of this component');
      const source = selected.cloneNode(true);
      source.dataset.componentId = component.id;
      component.html = source.outerHTML;
      for (const pageName of pageNames()) {
        const template = document.createElement('template'); template.innerHTML = project.pages[pageName] || '';
        template.content.querySelectorAll('[data-component-id="' + CSS.escape(component.id) + '"]').forEach(node => {
          if (node === selected && pageName === project.activePage) return;
          const replacement = document.createElement('template'); replacement.innerHTML = component.html;
          const fresh = replacement.content.firstElementChild;
          if (fresh) node.replaceWith(fresh);
        });
        project.pages[pageName] = template.innerHTML;
      }
      capturePage(); bindNodes(); select(selected); snapshot(); scheduleSave(); renderComponentsPanel(); notice('Linked instances updated');
    });
    $$('[data-insert-component]').forEach(button => button.onclick = () => {
      const component = project.components[button.dataset.insertComponent];
      if (!component) return;
      const template = document.createElement('template'); template.innerHTML = component.html || '';
      const node = template.content.firstElementChild;
      if (!node) return notice('Component template is empty');
      node.dataset.componentId = component.id;
      node.classList.remove('selected'); node.querySelectorAll('[id]').forEach(n => n.removeAttribute('id')); node.removeAttribute('id');
      canvas.insertBefore(node, selected?.parentElement === canvas ? selected.nextSibling : null);
      bindNodes(); select(node); snapshot(); scheduleSave(); renderComponentsPanel();
    });
    $$('[data-delete-component]').forEach(button => button.onclick = () => {
      const component = project.components[button.dataset.deleteComponent];
      if (!component) return;
      if (!confirm('Unlink this component? Existing instances will remain as ordinary elements.')) return;
      for (const pageName of pageNames()) {
        const template = document.createElement('template'); template.innerHTML = project.pages[pageName] || '';
        template.content.querySelectorAll('[data-component-id="' + CSS.escape(component.id) + '"]').forEach(node => delete node.dataset.componentId);
        project.pages[pageName] = template.innerHTML;
      }
      delete project.components[button.dataset.deleteComponent];
      canvas.innerHTML = project.pages[project.activePage] || ''; bindNodes(); snapshot(); scheduleSave(); renderComponentsPanel();
    });
  }
  $('.rail-tool').forEach(b => {
    if (b.dataset.panel === 'components') b.onclick = () => {
      $('.rail-tool').forEach(x => x.classList.toggle('selected', x === b));
      left.classList.remove('collapsed'); renderComponentsPanel();
    };
  });

  // Local class library, CMS collections, interaction rules and custom-code workspace.
  project.classes = project.classes || {};
  project.collections = project.collections || {};
  project.interactions = project.interactions || [];
  project.customCode = project.customCode || { css: '', js: '' };
  function panelShell(title, subtitle, body) {
    $('#panelTitle').textContent = title;
    $('#panelSubtitle').textContent = subtitle;
    $('#panelContent').hidden = false;
    $('#panelContent').innerHTML = body;
  }

  function applyClassRules() {
    let styleTag = document.getElementById('classLibraryStyles');
    if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = 'classLibraryStyles'; document.head.appendChild(styleTag); }
    styleTag.textContent = Object.entries(project.classes || {}).map(([name, props]) => {
      if (!/^[a-zA-Z_][\\w-]*$/.test(name) || !props || typeof props !== 'object') return '';
      const declarations = Object.entries(props).filter(([prop,value]) =>
        ['color','backgroundColor','padding','fontSize','borderRadius'].includes(prop) &&
        typeof value === 'string' && value.length < 100 && /^[#a-zA-Z0-9.%() ,/-]+$/.test(value)
      ).map(([prop,value]) => prop.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + ':' + value).join(';');
      return declarations ? '.' + CSS.escape(name) + '{' + declarations + '}' : '';
    }).join('\\n');
  }

  function renderClassesPanel() {
    panelShell('Style classes', 'Reusable CSS class names',
      '<div class="page-list"><label class="field-label">Class name</label><input id="classNameInput" class="full-input" placeholder="e.g. hero-title"><button id="applyClass" class="button primary full-button">Apply to selected element</button><div class="panel-divider"></div><strong class="panel-small-heading">Shared class styles</strong><label class="field-label">Text color</label><input id="classTextColor" type="color" value="#171815"><label class="field-label">Background</label><input id="classBgColor" type="color" value="#ffffff"><label class="field-label">Padding</label><input id="classPadding" class="full-input" value="16px"><label class="field-label">Font size</label><input id="classFontSize" class="full-input" value="16px"><label class="field-label">Border radius</label><input id="classRadius" class="full-input" value="0px"><button id="saveClassStyles" class="button secondary full-button">Save shared styles</button><div class="panel-divider"></div><strong class="panel-small-heading">Saved classes</strong>' +
      Object.keys(project.classes).map(c => '<div class="class-row"><button data-use-class="' + esc(c) + '">.' + esc(c) + '</button><button data-delete-class="' + esc(c) + '" aria-label="Delete class">×</button></div>').join('') +
      '<p class="hint">Classes are saved in this browser project. Shared class rules are applied to elements with that class.</p></div>');
    $('#applyClass')?.addEventListener('click', () => {
      if (!selected) return notice('Select an element first');
      const name = ($('#classNameInput').value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+/, '');
      if (!name) return notice('Enter a class name');
      selected.classList.add(name);
      project.classes[name] = project.classes[name] || {};
      applyClassRules(); bindNodes(); snapshot(); scheduleSave(); renderClassesPanel(); notice('Class applied');
    });
    $$('[data-use-class]').forEach(b => b.onclick = () => {
      if (!selected) return notice('Select an element first');
      selected.classList.add(b.dataset.useClass); snapshot(); scheduleSave(); notice('Class applied');
    });
    $('#saveClassStyles')?.addEventListener('click', () => {
      const name = ($('#classNameInput').value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+/, '');
      if (!name) return notice('Enter a class name');
      const padding = $('#classPadding').value.trim(), fontSize = $('#classFontSize').value.trim(), radius = $('#classRadius').value.trim();
      const safeCss = v => /^[\\w.%() ,/-]+$/.test(v);
      if (!safeCss(padding) || !safeCss(fontSize) || !safeCss(radius)) return notice('Use valid CSS lengths for spacing and type');
      project.classes[name] = {color:$('#classTextColor').value,backgroundColor:$('#classBgColor').value,padding,fontSize,borderRadius:radius};
      applyClassRules(); scheduleSave(); renderClassesPanel(); notice('Shared class styles saved');
    });
    $('[data-delete-class]').forEach(b => b.onclick = () => {
      const name = b.dataset.deleteClass;
      if (!confirm('Remove class "' + name + '" from this project?')) return;
      $$('.' + CSS.escape(name), canvas).forEach(n => n.classList.remove(name));
      delete project.classes[name]; applyClassRules(); snapshot(); scheduleSave(); renderClassesPanel();
    });
  }
  function renderCmsPanel() {
    panelShell('CMS collections', 'Local structured content',
      '<div class="page-list"><label class="field-label">Collection name</label><input id="collectionName" class="full-input" placeholder="Blog posts"><button id="createCollection" class="button primary full-button">Create collection</button><button id="syncCmsCloud" class="button secondary full-button">Sync CMS to cloud</button><label class="field-label">Bind selected container to collection</label><select id="bindCmsCollection" class="full-input"><option value="">Choose collection</option>' + Object.keys(project.collections).map(name => '<option value="' + esc(name) + '">' + esc(name) + '</option>').join('') + '</select><button id="bindCmsList" class="button secondary full-button">Render dynamic collection list here</button><p class="hint">Cloud CMS data is published dynamically. Bind a container to a collection to render published items on your site.</p><div class="panel-divider"></div>' +
      Object.entries(project.collections).map(([name, rows]) => '<section class="cms-collection"><strong>' + esc(name) + '</strong><span class="hint">' + rows.length + ' items</span><button data-add-cms-item="' + esc(name) + '" class="button secondary full-button">＋ Add item</button>' + rows.map((row,i) => '<button class="cms-row" data-edit-cms="' + esc(name) + '" data-row="' + i + '">' + esc(row.title || row.name || ('Item ' + (i+1))) + '</button>').join('') + '</section>').join('') +
      '<p class="hint">CMS data is local to this browser. It is not a cloud database and is not available to other visitors.</p></div>');
    $('#bindCmsList')?.addEventListener('click', () => {
      if (!selected) return notice('Select a container element first');
      const collection = $('#bindCmsCollection').value;
      if (!collection) return notice('Choose a collection');
      selected.dataset.cmsList = collection;
      selected.innerHTML = '<div class="cms-live-placeholder">Dynamic collection: ' + esc(collection) + '</div>';
      scheduleSave(); snapshot(); notice('Dynamic collection binding added');
    });
    $('#createCollection')?.addEventListener('click', () => {
      const name = ($('#collectionName').value || '').trim().slice(0, 60);
      if (!name) return notice('Enter a collection name');
      if (project.collections[name]) return notice('That collection already exists');
      project.collections[name] = []; scheduleSave(); renderCmsPanel(); notice('Collection created');
    });
    $$('[data-add-cms-item]').forEach(b => b.onclick = () => {
      const name = b.dataset.addCmsItem;
      const title = prompt('Item title:');
      if (!title?.trim()) return;
      const body = prompt('Item content (optional):', '') || '';
      project.collections[name].push({title:title.trim().slice(0,160),body:body.slice(0,10000)});
      scheduleSave(); renderCmsPanel(); notice('CMS item added');
    });
    $$('[data-edit-cms]').forEach(b => b.onclick = () => {
      const row = project.collections[b.dataset.editCms][Number(b.dataset.row)];
      if (!row) return;
      const title = prompt('Item title:', row.title || '');
      if (!title?.trim()) return;
      row.title = title.trim().slice(0,160);
      row.body = (prompt('Item content:', row.body || '') || '').slice(0,10000);
      scheduleSave(); renderCmsPanel();
    });
  }
  function renderInteractionsPanel() {
    panelShell('Interactions', 'Configure basic click and hover actions',
      '<div class="page-list"><p class="hint">Choose an element on the canvas first, then add a simple event rule.</p><label class="field-label">Event</label><select id="interactionEvent" class="full-input"><option value="click">Click</option><option value="mouseenter">Mouse enter</option><option value="mouseleave">Mouse leave</option></select><label class="field-label">Action</label><select id="interactionAction" class="full-input"><option value="navigate">Navigate to URL</option><option value="toggle-class">Toggle CSS class</option><option value="show-message">Show message</option></select><label class="field-label">Value (URL, class name, or message)</label><input id="interactionValue" class="full-input" placeholder="https://example.com"><button id="addInteraction" class="button primary full-button">Add interaction</button><div class="panel-divider"></div>' +
      project.interactions.map((it,i) => '<div class="interaction-row"><span>' + esc(it.event) + ' → ' + esc(it.action) + '</span><small>' + esc(it.value) + '</small><button data-remove-interaction="' + i + '">×</button></div>').join('') +
      '<p class="hint">Rules are bound to an element ID. Only safe navigation URLs are allowed; custom JavaScript is not executed in the editor.</p></div>');
    $('#addInteraction')?.addEventListener('click', () => {
      if (!selected) return notice('Select an element first');
      if (!selected.id) selected.id = 'cs-' + Math.random().toString(36).slice(2,9);
      const event = $('#interactionEvent').value, action = $('#interactionAction').value, value = $('#interactionValue').value.trim();
      if (!value) return notice('Enter an action value');
      if (action === 'navigate' && !/^(https?:\/\/|\/|#|mailto:)/i.test(value)) return notice('Use an http(s), relative, anchor, or mailto URL');
      project.interactions.push({id:selected.id,event,action,value:value.slice(0,500)});
      scheduleSave(); snapshot(); renderInteractionsPanel(); notice('Interaction added');
    });
    $$('[data-remove-interaction]').forEach(b => b.onclick = () => { project.interactions.splice(Number(b.dataset.removeInteraction),1); scheduleSave(); renderInteractionsPanel(); });
  }
  function renderCodePanel() {
    panelShell('Custom code', 'CSS and JavaScript export snippets',
      '<div class="page-list"><label class="field-label">Custom CSS</label><textarea id="customCss" class="code-editor" spellcheck="false" placeholder=".my-class { color: rebeccapurple; }">' + esc(project.customCode.css || '') + '</textarea><label class="field-label">Custom JavaScript</label><textarea id="customJs" class="code-editor" spellcheck="false" placeholder="/* Exported with your site; not run in the editor */">' + esc(project.customCode.js || '') + '</textarea><button id="saveCustomCode" class="button primary full-button">Save code</button><p class="hint">Custom JavaScript is not executed inside the editor. Review and test exported code before publishing.</p></div>');
    $('#saveCustomCode')?.addEventListener('click', () => {
      project.customCode = {css:$('#customCss').value.slice(0,50000),js:$('#customJs').value.slice(0,50000)};
      scheduleSave(); notice('Custom code saved');
    });
  }
  function applyInteractionRules() {
    project.interactions.forEach(rule => {
      const node = document.getElementById(rule.id);
      if (!node || node.dataset['interactionBound' + rule.event + rule.action]) return;
      node.dataset['interactionBound' + rule.event + rule.action] = 'true';
      node.addEventListener(rule.event, e => {
        if (rule.action === 'navigate') {
          if (/^(https?:\/\/|\/|#|mailto:)/i.test(rule.value)) window.location.href = rule.value;
        } else if (rule.action === 'toggle-class') {
          if (/^[a-zA-Z_][\w-]*$/.test(rule.value)) node.classList.toggle(rule.value);
        } else if (rule.action === 'show-message') notice(rule.value);
      });
    });
  }
  function applyAnimationStyles() {
    let styleNode = document.getElementById('cs-animation-styles');
    if (!styleNode) { styleNode = document.createElement('style'); styleNode.id = 'cs-animation-styles'; document.head.appendChild(styleNode); }
    styleNode.textContent = '@keyframes csFade{from{opacity:0}to{opacity:1}}@keyframes csRise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}@keyframes csSlide{from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:translateX(0)}}@keyframes csScale{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}' +
      '[data-anim-preset]{animation-duration:var(--cs-anim-duration,600ms);animation-delay:var(--cs-anim-delay,0ms);animation-fill-mode:both;animation-timing-function:cubic-bezier(.2,.7,.2,1)}' +
      '[data-anim-preset="fade"]{animation-name:csFade}[data-anim-preset="rise"]{animation-name:csRise}[data-anim-preset="slide"]{animation-name:csSlide}[data-anim-preset="scale"]{animation-name:csScale}';
    $('.canvas-node',canvas).forEach(node => {
      node.style.setProperty('--cs-anim-duration',(Number(node.dataset.animDuration)||600)+'ms');
      node.style.setProperty('--cs-anim-delay',(Number(node.dataset.animDelay)||0)+'ms');
    });
  }
  const baseBindNodes = bindNodes;
  bindNodes = function() { baseBindNodes(); applyInteractionRules(); applyAnimationStyles(); };
  function renderSiteSettingsPanel() {
    project.seo = project.seo || {};
    const seo = project.seo;
    panelShell('Site settings & SEO', 'Page metadata and a basic accessibility audit',
      '<div class="page-list"><label class="field-label">Browser title</label><input id="seoTitle" class="full-input" maxlength="120" value="' + esc(seo.title || project.activePage || 'Website') + '">' +
      '<label class="field-label">Meta description</label><textarea id="seoDescription" class="full-input" rows="3" maxlength="300">' + esc(seo.description || '') + '</textarea>' +
      '<label class="field-label">Canonical URL (optional)</label><input id="seoCanonical" class="full-input" type="url" placeholder="https://example.com/page" value="' + esc(seo.canonical || '') + '">' +
      '<label class="field-label">Social preview image (HTTPS)</label><input id="seoSocialImage" class="full-input" type="url" placeholder="https://example.com/preview.png" value="' + esc(seo.socialImage || '') + '">' +
      '<label><input id="seoIndexable" type="checkbox" ' + (seo.indexable === false ? '' : 'checked') + '> Allow search indexing</label>' +
      '<button id="saveSiteSeo" class="button primary full-button">Save SEO settings</button><div class="panel-divider"></div><strong class="panel-small-heading">Animation timeline</strong><p class="hint">Select an element, set its entrance preset and timing, then add it to the timeline.</p><label class="field-label">Preset</label><select id="animPreset" class="full-input"><option value="">None</option><option value="fade">Fade in</option><option value="rise">Rise</option><option value="slide">Slide in</option><option value="scale">Scale in</option></select><label class="field-label">Start delay (ms)</label><input id="animDelay" class="full-input" type="number" min="0" max="10000" value="0"><label class="field-label">Duration (ms)</label><input id="animDuration" class="full-input" type="number" min="100" max="10000" value="600"><button id="applyAnim" class="button secondary full-button">Apply animation to selected</button><div id="animTimeline" class="page-list">' + $('.canvas-node',canvas).filter(n=>n.dataset.animPreset).map(n=>'<div class="interaction-row"><span>' + esc(n.dataset.node || n.tagName.toLowerCase()) + '</span><small>' + esc(n.dataset.animPreset) + ' · ' + esc(n.dataset.animDelay || '0') + 'ms</small><button data-remove-anim="' + esc(n.dataset.editorKey || '') + '">×</button></div>').join('') + '</div><div class="panel-divider"></div><button id="runAccessibilityAudit" class="button secondary full-button">Run accessibility audit</button><div id="accessibilityResults" class="hint" role="status"></div></div>');
    $('#saveSiteSeo')?.addEventListener('click', () => {
      const canonical = $('#seoCanonical').value.trim(), socialImage = $('#seoSocialImage').value.trim();
      if (canonical && !/^https?:\/\//i.test(canonical)) return notice('Canonical URL must use HTTP or HTTPS.');
      if (socialImage && !/^https:\/\//i.test(socialImage)) return notice('Social preview image must use HTTPS.');
      project.seo = {title:$('#seoTitle').value.trim().slice(0,120),description:$('#seoDescription').value.trim().slice(0,300),canonical,socialImage,indexable:$('#seoIndexable').checked};
      scheduleSave(); notice('SEO settings saved');
    });
    $('#applyAnim')?.addEventListener('click', () => {
      if (!selected) return notice('Select an element on the canvas first');
      ensureNodeKeys();
      const preset = $('#animPreset').value;
      if (!preset) { delete selected.dataset.animPreset; delete selected.dataset.animDelay; delete selected.dataset.animDuration; }
      else {
        selected.dataset.animPreset = preset;
        selected.dataset.animDelay = String(Math.max(0,Math.min(10000,Number($('#animDelay').value)||0)));
        selected.dataset.animDuration = String(Math.max(100,Math.min(10000,Number($('#animDuration').value)||600)));
      }
      scheduleSave(); snapshot(); applyAnimationStyles(); renderSiteSettingsPanel(); notice('Animation timeline updated');
    });
    $('[data-remove-anim]').forEach(button => button.onclick = () => {
      const node = $('.canvas-node',canvas).find(n => n.dataset.editorKey === button.dataset.removeAnim);
      if (node) { delete node.dataset.animPreset; delete node.dataset.animDelay; delete node.dataset.animDuration; applyAnimationStyles(); scheduleSave(); renderSiteSettingsPanel(); }
    });
    $('#runAccessibilityAudit')?.addEventListener('click', () => {
      const issues = [];
      canvas.querySelectorAll('img').forEach((img,i) => { if (!img.hasAttribute('alt')) issues.push('Image ' + (i+1) + ' is missing alt text.'); });
      canvas.querySelectorAll('a').forEach((link,i) => { if (!link.getAttribute('href')) issues.push('Link ' + (i+1) + ' has no destination.'); if (!link.textContent.trim() && !link.querySelector('img[alt]')) issues.push('Link ' + (i+1) + ' has no accessible name.'); });
      canvas.querySelectorAll('button').forEach((button,i) => { if (!button.textContent.trim() && !button.getAttribute('aria-label')) issues.push('Button ' + (i+1) + ' has no accessible name.'); });
      const headings = [...canvas.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => Number(h.tagName.slice(1)));
      for (let i=1;i<headings.length;i++) if (headings[i] > headings[i-1] + 1) { issues.push('Heading hierarchy skips a level.'); break; }
      const host = $('#accessibilityResults');
      if (host) host.textContent = issues.length ? issues.slice(0,12).join(' ') : 'No issues found by this basic check. This is not a full WCAG audit.';
    });
  }

  // New workspace tools. The CMS is explicitly local until a server backend is configured.
  $$('.rail-tool').forEach(b => {
    if (b.dataset.panel === 'classes') b.onclick = () => { $$('.rail-tool').forEach(x=>x.classList.toggle('selected',x===b)); left.classList.remove('collapsed'); renderClassesPanel(); };
    if (b.dataset.panel === 'cms') b.onclick = () => { $$('.rail-tool').forEach(x=>x.classList.toggle('selected',x===b)); left.classList.remove('collapsed'); renderCmsPanel(); };
    if (b.dataset.panel === 'interactions') b.onclick = () => { $$('.rail-tool').forEach(x=>x.classList.toggle('selected',x===b)); left.classList.remove('collapsed'); renderInteractionsPanel(); };
    if (b.dataset.panel === 'code') b.onclick = () => { $('.rail-tool').forEach(x=>x.classList.toggle('selected',x===b)); left.classList.remove('collapsed'); renderCodePanel(); };
    if (b.dataset.panel === 'settings') b.onclick = () => { $$('.rail-tool').forEach(x=>x.classList.toggle('selected',x===b)); left.classList.remove('collapsed'); renderSiteSettingsPanel(); };
  });
  const baseDownloadCurrentPage = downloadCurrentPage;
  downloadCurrentPage = function() {
    const clone = canvas.cloneNode(true);
    clone.querySelectorAll('.selected').forEach(n=>n.classList.remove('selected'));
    clone.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));
    clone.querySelectorAll('.canvas-node').forEach(n=>n.removeAttribute('tabindex'));
    let css = '';
    for (const sheet of [...document.styleSheets]) { try { css += [...sheet.cssRules].map(rule=>rule.cssText).join('\n')+'\n'; } catch {} }
    css += '\n' + (project.customCode?.css || '');
    let interactionScript = '';
    if (project.interactions?.length) {
      const rules = JSON.stringify(project.interactions).replace(/</g,'\\u003c');
      interactionScript = '<script>(function(){const rules=' + rules + ';rules.forEach(r=>{const n=document.getElementById(r.id);if(!n)return;n.addEventListener(r.event,()=>{if(r.action==="navigate"){if(/^(https?:\\/\\/|\\/|#|mailto:)/i.test(r.value))location.href=r.value;}else if(r.action==="toggle-class"){if(/^[a-zA-Z_][\\w-]*$/.test(r.value))n.classList.toggle(r.value);}else if(r.action==="show-message")alert(r.value);});});})();</scr' + 'ipt>';
    }
    const customJs = project.customCode?.js ? '<script>' + project.customCode.js.replace(/<\/script/gi,'<\\/script') + '</scr' + 'ipt>' : '';
    const title = esc(project.seo?.title || project.activePage || 'Website');
    const description = esc(project.seo?.description || '');
    const canonical = /^https?:\/\//i.test(project.seo?.canonical || '') ? esc(project.seo.canonical) : '';
    const socialImage = /^https:\/\//i.test(project.seo?.socialImage || '') ? esc(project.seo.socialImage) : '';
    const robots = project.seo?.indexable === false ? 'noindex,nofollow' : 'index,follow';
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><meta name="description" content="' + description + '"><meta name="robots" content="' + robots + '">' + (canonical ? '<link rel="canonical" href="' + canonical + '">' : '') + (socialImage ? '<meta property="og:image" content="' + socialImage + '">' : '') + '<style>' + css.replace(/<\/style/gi,'<\\/style') + '</style></head><body>' + clone.outerHTML + interactionScript + customJs + '</body></html>';
    const blob = new Blob([html],{type:'text/html;charset=utf-8'}), url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url; link.download=(project.activePage||'website').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.html';
    document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    notice('Downloaded current page HTML. Hosting and multi-page packaging still require deployment setup.');
  };

  window.CodeStructEditor = {
    getProject() { capturePage(); return JSON.parse(JSON.stringify(project)); },
    getExportHTML() { capturePage(); return getExportHTML(); },
    getAllExportHTML() {
      capturePage();
      const active = project.activePage, markup = canvas.innerHTML, output = {};
      const slugify = value => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80) || 'page';
      for (const [name, html] of Object.entries(project.pages || {})) {
        project.activePage = name; canvas.innerHTML = html; bindNodes();
        output[slugify(name)] = getExportHTML();
      }
      project.activePage = active; canvas.innerHTML = markup; bindNodes(); inspector();
      return output;
    },
    insertImage(url, alt = 'Uploaded image') {
      if (!String(url).startsWith('https://')) throw new Error('Only HTTPS image URLs can be inserted.');
      const section = document.createElement('section'); section.className = 'new-section canvas-node'; section.dataset.node = 'image'; section.tabIndex = 0;
      const image = document.createElement('img'); image.src = url; image.alt = String(alt).slice(0,240); image.style.maxWidth = '100%'; image.style.height = 'auto';
      section.appendChild(image); canvas.appendChild(section); bindNodes(); select(section); snapshot(); scheduleSave();
    },
    getCloudProjectId() { return project.cloudProjectId || null; },
    setCloudProjectId(id) { project.cloudProjectId = id || null; saveProject(); },
    loadCloudDocument(doc, id) {
      if (!doc || typeof doc !== 'object' || !doc.pages || typeof doc.pages !== 'object') throw new Error('Invalid project document');
      Object.assign(project, doc);
      project.cloudProjectId = id || project.cloudProjectId || null;
      project.activePage = project.pages[project.activePage] ? project.activePage : (Object.keys(project.pages)[0] || 'Home');
      canvas.innerHTML = project.pages[project.activePage] || '';
      selected = null; bindNodes(); inspector(); updatePageLabel(); renderItems(); snapshot(); saveProject();
    },
    refresh() { bindNodes(); renderItems(); saveProject(); }
  };
  bindNodes(); renderItems(); snapshot(); snapshotStatus();
})();