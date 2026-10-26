(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
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
    $('[data-open-page]').forEach(b => b.onclick = () => {
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
    $('[data-asset]').forEach(b => b.onclick = () => {
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
      esc(project.activePage || 'CodeStruct export') + '</title><style>' + css.replace(/<\/style/gi, '<\\/style') +
      '</style></head><body>' + clone.outerHTML + '</body></html>';
    $('#exportCode').value = html;
    $('#codeDialog').showModal();
  }

  function downloadCurrentPage() {
    const clone = canvas.cloneNode(true);
    clone.querySelectorAll('.selected').forEach(n => n.classList.remove('selected'));
    clone.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
    clone.querySelectorAll('.canvas-node').forEach(n => n.removeAttribute('tabindex'));
    let css = '';
    for (const sheet of [...document.styleSheets]) {
      try { css += [...sheet.cssRules].map(rule => rule.cssText).join('\n') + '\n'; } catch {}
    }
    const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
      esc(project.activePage || 'Website') + '</title><style>' + css.replace(/<\/style/gi, '<\\/style') +
      '</style></head><body>' + clone.outerHTML + '</body></html>';
    const blob = new Blob([html], {type:'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = (project.activePage || 'website').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'website';
    a.href = url; a.download = filename + '.html'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice('Downloaded a self-contained HTML file for this page. Hosting is not configured.');
  }


  // Drag-and-drop reordering and basic container nesting.
  let draggedNode = null;
  const dragObserver = new MutationObserver(() => {
    $('.canvas-node', canvas).forEach(n => { n.draggable = true; });
  });
  dragObserver.observe(canvas, {childList:true, subtree:true});
  $('.canvas-node', canvas).forEach(n => { n.draggable = true; });
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
    $('.drop-target', canvas).forEach(n => n.classList.remove('drop-target'));
  });
  canvas.addEventListener('dragover', e => {
    if (!draggedNode) return;
    const target = e.target.closest('.canvas-node');
    if (target && target !== draggedNode && !draggedNode.contains(target)) {
      e.preventDefault();
      $('.drop-target', canvas).forEach(n => n.classList.remove('drop-target'));
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
    $('.drop-target', canvas).forEach(n => n.classList.remove('drop-target'));
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
  $('.rail-tool').forEach(b => {
    if (b.dataset.panel === 'pages') b.onclick = () => { $('.rail-tool').forEach(x => x.classList.toggle('selected', x === b)); left.classList.remove('collapsed'); renderPagesPanel(); };
    if (b.dataset.panel === 'assets') b.onclick = () => { $('.rail-tool').forEach(x => x.classList.toggle('selected', x === b)); left.classList.remove('collapsed'); renderAssetsPanel(); };
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

  bindNodes(); renderItems(); snapshot(); snapshotStatus();
})();