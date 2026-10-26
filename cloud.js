import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const SUPABASE_URL = 'https://syylksyuulzljivcvopo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8jlFPKRvAsQtQbRf18Aukg_nj1JTeqr';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
let currentUser = null;
let realtimeChannel = null;
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
    (signedIn ? '<button id="cloudSave" class="button primary full-button">Save current project to cloud</button><button id="cloudPublish" class="button secondary full-button">Publish database snapshot</button><div class="panel-divider"></div><strong class="panel-small-heading">Your cloud projects</strong>' +
      projects.map(p => '<div class="cloud-project"><strong>' + esc(p.name) + '</strong><small>' + esc(p.slug) + (p.is_published ? ' · snapshot published' : ' · draft') + '</small><button class="button secondary full-button" data-cloud-load="' + esc(p.id) + '">Open project</button></div>').join('') +
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
async function saveCloudProject(publish) {
  if (!currentUser) return message('Sign in before saving to cloud.', 'error');
  const button = publish ? $('#cloudPublish') : $('#cloudSave');
  if (button) button.disabled = true;
  try {
    const doc = currentDocument();
    const existingId = editor().getCloudProjectId();
    const row = {
      owner_id: currentUser.id,
      name: String(doc.name || 'Untitled website').slice(0, 120),
      slug: existingId ? undefined : makeSlug(doc.name),
      document: doc,
      updated_at: new Date().toISOString()
    };
    if (publish) {
      row.published_document = doc;
      row.is_published = true;
      row.published_at = new Date().toISOString();
    }
    let query;
    if (existingId) {
      query = supabase.from('sytely_projects').update(row).eq('id', existingId).select('id').single();
    } else {
      query = supabase.from('sytely_projects').insert(row).select('id').single();
    }
    const { data, error } = await query;
    if (error) throw error;
    editor().setCloudProjectId(data.id);
    window.dispatchEvent(new Event('codestruct-cloud-project-selected'));
    message(publish ? 'Published snapshot saved to Supabase.' : 'Project saved to cloud.', 'success');
    await showCloudPanel();
  } catch (error) {
    message(error.message || 'Cloud save failed.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}
async function loadCloudProject(id) {
  try {
    const { data, error } = await supabase.from('sytely_projects')
      .select('id,name,document').eq('id', id).single();
    if (error) throw error;
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
  if (!id || !currentUser || realtimeChannel) return;
  realtimeChannel = supabase.channel('codestruct-project-' + id)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'sytely_projects', filter: 'id=eq.' + id
    }, payload => {
      const updated = payload.new;
      const savedAt = updated.updated_at ? new Date(updated.updated_at).getTime() : 0;
      if (updated.owner_id !== currentUser?.id || !savedAt) return;
      if (confirm('This project changed in another session. Load the latest cloud version?')) {
        editor().loadCloudDocument(updated.document, updated.id);
        notify('Loaded the latest cloud version.');
      }
    })
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('Realtime collaboration subscription unavailable:', status);
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
