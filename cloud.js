import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import './cloud-assets.js';

const SUPABASE_URL = 'https://syylksyuulzljivcvopo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8jlFPKRvAsQtQbRf18Aukg_nj1JTeqr';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
let currentUser = null;
let realtimeChannel = null;
let lastCloudSaveAt = 0;
let activeRevision = null;
const editorSessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random();
let collaboratorPresence = [];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notify(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}
function editor() {
  if (!window.CodeStructEditor) throw new Error('Editor document API is not ready');
  return window.CodeStructEditor;
}
function setPanel(title, subtitle, body) {
  $('#panelTitle').textContent = title;
  $('#panelSubtitle').textContent = subtitle;
  $('#panelContent').hidden = false;
  $('#panelContent').innerHTML = body;
}
function message(text, kind = 'info') {
  const host = $('#cloudMessage');
  if (host) {
    host.textContent = text;
    host.dataset.kind = kind;
  }
}
function currentDocument() {
  const doc = editor().getProject();
  delete doc.cloudProjectId;
  return doc;
}
async function refreshUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') console.warn(error);
  currentUser = data?.user || null;
  return currentUser;
}
async function listProjects() {
  if (!currentUser) return [];
  const { data, error } = await supabase.from('sytely_projects')
    .select('id,name,slug,updated_at,is_published')
    .order('updated_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}
function renderCloudPanel(projects = []) {
  const signedIn = !!currentUser;
  setPanel('Cloud & publishing', 'Supabase-backed project storage',
    '<div class="page-list">' +
    '<div class="cloud-account"><strong>' + (signedIn ? esc(currentUser.email) : 'Not signed in') + '</strong>' +
    (signedIn ? '<button id="cloudSignOut" class="button secondary full-button">Sign out</button>' : '') + '</div>' +
    (signedIn ? '' :
      '<label class="field-label">Email</label><input id="cloudEmail" type="email" class="full-input" autocomplete="email" placeholder="you@example.com">' +
      '<label class="field-label">Password</label><input id="cloudPassword" type="password" class="full-input" autocomplete="current-password" minlength="8" placeholder="At least 8 characters">' +
      '<div class="cloud-auth-actions"><button id="cloudSignIn" class="button primary">Sign in</button><button id="cloudSignUp" class="button secondary">Create account</button></div>') +
    '<div id="cloudMessage" class="cloud-message" role="status"></div>' +
    (signedIn ? '<button id="cloudSave" class="button primary full-button">Save current project to cloud</button><button id="cloudPublish" class="button secondary full-button">Publish website</button><button id="cloudVersion" class="button secondary full-button">Save version</button><button id="cloudHistory" class="button secondary full-button">Version history</button><label class="field-label" for="cloudAsset">Upload image to asset library</label><input id="cloudAsset" class="full-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"><div id="assetResult"></div><div class="panel-divider"></div><strong class="panel-small-heading">Your cloud projects</strong>' +
      projects.map(p => '<div class="cloud-project"><strong>' + esc(p.name) + '</strong><small>' + esc(p.slug) + (p.is_published ? ' · published' : ' · draft') + '</small>' + (p.is_published ? '<a href="https://syylksyuulzljivcvopo.supabase.co/functions/v1/sytely-site?slug=' + encodeURIComponent(p.slug) + '" target="_blank" rel="noopener noreferrer">Open published website</a>' : '') + '<button class="button secondary full-button" data-cloud-load="' + esc(p.id) + '">Open project</button></div>').join('') +
      '<p class="hint">Cloud saves are private to your authenticated account under database row-level security. Publish stores a snapshot; public hosting is a separate step.</p>' :
      '<p class="hint">Sign in to save and open projects across browsers. Cloud storage uses the Sytely Production Supabase project.</p>') +
    '</div>');
  $('#cloudSignIn')?.addEventListener('click', () => runAuth('signin'));
  $('#cloudSignUp')?.addEventListener('click', () => runAuth('signup'));
  $('#cloudSignOut')?.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return message(error.message, 'error');
    currentUser = null; renderCloudPanel(); message('Signed out');
  });
  $('#cloudSave')?.addEventListener('click', () => saveCloudProject(false));
  $('#cloudPublish')?.addEventListener('click', () => saveCloudProject(true));
  $('#cloudVersion')?.addEventListener('click', () => saveVersion());
  $('#cloudHistory')?.addEventListener('click', () => showVersionHistory());
  $$('[data-cloud-load]').forEach(button => button.addEventListener('click', () => loadCloudProject(button.dataset.cloudLoad)));
}
async function runAuth(mode) {
  const email = ($('#cloudEmail')?.value || '').trim();
  const password = $('#cloudPassword')?.value || '';
  if (!email || !password) return message('Enter an email and password.', 'error');
  if (password.length < 8) return message('Use a password with at least 8 characters.', 'error');
  const button = mode === 'signup' ? $('#cloudSignUp') : $('#cloudSignIn');
  if (button) button.disabled = true;
  try {
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    await refreshUser();
    if (!currentUser) {
      message('Check your email to confirm your account, then sign in.', 'info');
      return;
    }
    await showCloudPanel();
    message(mode === 'signup' ? 'Account created.' : 'Signed in.', 'success');
  } catch (error) {
    message(error.message || 'Authentication failed.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}
function makeSlug(name) {
  const base = String(name || 'website').toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'website';
  return base + '-' + Math.random().toString(36).slice(2, 7);
}
function buildPublishedPages(pages, slug) {
  const keys = Object.keys(pages || {});
  const out = {};
  for (const [key, html] of Object.entries(pages || {})) {
    let result = html;
    for (const target of keys) {
      const escaped = target.replace(/[.*+?^\${}()|[\]\\]/g, '\\function buildPublishedHTML(html, slug) {');
      const route = '?slug=' + encodeURIComponent(slug) + '&page=' + encodeURIComponent(target);
      result = result.replace(new RegExp('href=(["\\'])/?' + escaped + '/?\\1', 'gi'), 'href="' + route + '"');
    }
    out[key] = result;
  }
  return out;
}
function buildPublishedHTML(html, slug) {
  const endpoint = 'https://syylksyuulzljivcvopo.supabase.co/functions/v1/sytely-site';
  const slugLiteral = JSON.stringify(slug);
  const script = '<script>(function(){var slug=' + slugLiteral + ';var endpoint=' + JSON.stringify(endpoint) + ';document.querySelectorAll("form").forEach(function(form){form.querySelectorAll("input,textarea,select").forEach(function(el,i){if(!el.name)el.name="field_"+(i+1)});form.querySelectorAll("button").forEach(function(btn){if(!btn.type||btn.type==="button")btn.type="submit"});var status=document.createElement("p");status.setAttribute("role","status");form.appendChild(status);form.addEventListener("submit",async function(event){event.preventDefault();var payload={};new FormData(form).forEach(function(value,key){payload[key]=String(value).slice(0,2000)});status.textContent="Sending…";try{var response=await fetch(endpoint+"?slug="+encodeURIComponent(slug),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payload:payload})});if(!response.ok)throw new Error("Submission failed ("+response.status+")");status.textContent="Thanks. Your message was sent.";form.reset()}catch(error){status.textContent=error.message||"Could not send your message."}})})})();<\/script>';
  return html.replace('</body>', script + '</body>');
}
async function saveCloudProject(publish) {
  if (!currentUser) return message('Sign in before saving to cloud.', 'error');
  const button = publish ? $('#cloudPublish') : $('#cloudSave');
  if (button) button.disabled = true;
  try {
    const doc = currentDocument();
    const existingId = editor().getCloudProjectId();
    let slug = makeSlug(doc.name);
    let revision = activeRevision;
    if (existingId) {
      const existing = await supabase.from('sytely_projects').select('slug,revision').eq('id', existingId).single();
      if (existing.error) throw existing.error;
      slug = existing.data.slug;
      if (revision == null) revision = Number(existing.data.revision || 1);
    }
    let publishedDocument = null;
    if (publish) {
      const pages = buildPublishedPages(editor().getAllExportHTML(), slug);
      const activePageKey = String(doc.activePage || 'home').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'home';
      publishedDocument = { ...doc, html: pages[activePageKey] || buildPublishedHTML(editor().getExportHTML(), slug), pages, published_at: new Date().toISOString() };
    }
    let projectId = existingId;
    if (existingId) {
      const { data, error } = await supabase.rpc('sytely_save_project_v2', {
        p_project_id: existingId,
        p_expected_revision: revision,
        p_document: doc,
        p_name: String(doc.name || 'Untitled website').slice(0,120),
        p_publish: !!publish,
        p_published_document: publishedDocument
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.ok) {
        activeRevision = Number(result?.current_revision ?? revision);
        throw new Error('Save conflict: another session changed this project. Reload the latest version before editing further.');
      }
      activeRevision = Number(result.current_revision);
    } else {
      const row = {
        owner_id: currentUser.id, name: String(doc.name || 'Untitled website').slice(0,120),
        slug, document: doc, revision: 1, updated_at: new Date().toISOString(),
        ...(publish ? { published_document: publishedDocument, is_published: true, published_at: new Date().toISOString() } : {})
      };
      const { data, error } = await supabase.from('sytely_projects').insert(row).select('id,revision').single();
      if (error) throw error;
      projectId = data.id; activeRevision = Number(data.revision || 1);
      editor().setCloudProjectId(projectId);
    }
    editor().setCloudProjectId(projectId);
    if (publish) {
      const { error: versionError } = await supabase.from('sytely_project_versions').insert({
        project_id: projectId, owner_id: currentUser.id,
        label: 'Published ' + new Date().toLocaleString(), document: doc
      });
      if (versionError) console.warn('Published successfully but version snapshot failed', versionError);
    }
    window.dispatchEvent(new Event('codestruct-cloud-project-selected'));
    message(publish ? 'Published website: https://syylksyuulzljivcvopo.supabase.co/functions/v1/sytely-site?slug=' + slug : 'Project saved to cloud.', 'success');
    await showCloudPanel();
  } catch (error) {
    message(error.message || 'Cloud save failed.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}
async function saveVersion() {
  const projectId = editor().getCloudProjectId();
  if (!currentUser || !projectId) return message('Save this project to cloud first.', 'error');
  const { error } = await supabase.from('sytely_project_versions').insert({
    project_id: projectId, owner_id: currentUser.id,
    label: 'Saved version ' + new Date().toLocaleString(), document: currentDocument()
  });
  if (error) return message(error.message || 'Could not save version.', 'error');
  message('Version saved.', 'success');
}
async function showVersionHistory() {
  const id = editor().getCloudProjectId();
  if (!currentUser || !id) return message('Save this project to cloud first.', 'error');
  const result = await supabase.from('sytely_project_versions')
    .select('id,label,created_at,document').eq('project_id', id)
    .order('created_at', { ascending: false }).limit(50);
  if (result.error) return message(result.error.message, 'error');
  const versions = result.data || [];
  setPanel('Version history', 'Saved project snapshots',
    '<div class="page-list"><button id="historyBack" class="button secondary full-button">Back to cloud projects</button>' +
    versions.map(v => '<div class="cloud-project"><strong>' + esc(v.label) + '</strong><small>' + esc(new Date(v.created_at).toLocaleString()) + '</small><button class="button secondary full-button" data-restore-version="' + esc(v.id) + '">Restore version</button></div>').join('') +
    (versions.length ? '' : '<p class="hint">No saved versions yet.</p>') + '</div>');
  $('#historyBack')?.addEventListener('click', showCloudPanel);
  $('[data-restore-version]').forEach(button => button.addEventListener('click', () => {
    const version = versions.find(v => v.id === button.dataset.restoreVersion);
    if (!version) return;
    editor().loadCloudDocument(version.document, id);
    message('Version restored in the editor. Save to cloud to make it current.', 'success');
  }));
}
async function loadCloudProject(id) {
  try {
    const { data, error } = await supabase.from('sytely_projects')
      .select('id,name,document,revision').eq('id', id).single();
    if (error) throw error;
    activeRevision = Number(data.revision || 1);
    editor().loadCloudDocument(data.document, data.id);
    window.dispatchEvent(new Event('codestruct-cloud-project-selected'));
    message('Cloud project opened.', 'success');
  } catch (error) {
    message(error.message || 'Could not open project.', 'error');
  }
}
async function showCloudPanel() {
  try {
    await refreshUser();
    const projects = currentUser ? await listProjects() : [];
    renderCloudPanel(projects);
  } catch (error) {
    renderCloudPanel([]);
    message(error.message || 'Could not load cloud projects.', 'error');
  }
}
async function attachRealtime() {
  if (realtimeChannel) { await supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
  const id = editor().getCloudProjectId();
  if (!id || !currentUser) return;
  realtimeChannel = supabase.channel('codestruct-project-' + id, { config: { presence: { key: editorSessionId } } })
    .on('presence', { event: 'sync' }, () => {
      const state = realtimeChannel?.presenceState?.() || {};
      collaboratorPresence = Object.values(state).flat().filter(item => item.user_id !== currentUser?.id || item.session_id !== editorSessionId);
      const status = $('#collaborationStatus');
      if (status) status.textContent = collaboratorPresence.length
        ? collaboratorPresence.length + ' other editor session(s) online. Saves use revision checks to prevent overwrites.'
        : 'You are the only active editor. Revision checks protect against stale saves.';
    })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'sytely_projects', filter: 'id=eq.' + id
    }, payload => {
      const updated = payload.new;
      const nextRevision = Number(updated.revision || 0);
      if (updated.owner_id !== currentUser?.id || !nextRevision || nextRevision <= Number(activeRevision || 0)) return;
      const status = $('#collaborationStatus');
      if (status) status.textContent = 'A newer cloud revision is available. Reload before saving to avoid overwriting it.';
      if (confirm('This project changed in another editor session. Load revision ' + nextRevision + '? Your unsaved local changes will be replaced.')) {
        activeRevision = nextRevision;
        editor().loadCloudDocument(updated.document, updated.id);
        notify('Loaded the latest cloud revision.');
      }
    })
    .subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        const { data } = await supabase.auth.getUser();
        await realtimeChannel.track({
          user_id: data?.user?.id || currentUser?.id,
          email: currentUser?.email || 'Editor',
          session_id: editorSessionId,
          joined_at: new Date().toISOString()
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('Realtime collaboration subscription unavailable:', status);
        const host = $('#collaborationStatus');
        if (host) host.textContent = 'Live presence is unavailable. Revision checks remain active when saving.';
      }
    });
}
document.addEventListener('DOMContentLoaded', async () => {
  await refreshUser();
  const button = document.querySelector('.rail-tool[data-panel="cloud"]');
  if (button) button.addEventListener('click', () => {
    $$('.rail-tool').forEach(item => item.classList.toggle('selected', item === button));
    $('#leftPanel').classList.remove('collapsed');
    showCloudPanel();
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    if ($('#panelTitle')?.textContent === 'Cloud & publishing') setTimeout(() => showCloudPanel(), 0);
  });
});
window.addEventListener('codestruct-cloud-project-selected', attachRealtime);
