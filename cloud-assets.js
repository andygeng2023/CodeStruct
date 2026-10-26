import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const client = createClient('https://syylksyuulzljivcvopo.supabase.co', 'sb_publishable_8jlFPKRvAsQtQbRf18Aukg_nj1JTeqr', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.addEventListener('change', async event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.id !== 'cloudAsset' || !input.files?.[0]) return;
  const file = input.files[0];
  const host = document.querySelector('#assetResult');
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Sign in to upload assets.');
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) throw new Error('Choose an image under 10 MB.');
    if (host) host.textContent = 'Uploading image…';
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100) || 'image';
    const path = user.id + '/' + Date.now() + '-' + filename;
    const uploaded = await client.storage.from('sytely-assets').upload(path, file, { contentType: file.type, upsert: false });
    if (uploaded.error) throw uploaded.error;
    const url = client.storage.from('sytely-assets').getPublicUrl(path).data.publicUrl;
    if (host) host.innerHTML = '<img src="' + escapeText(url) + '" alt="" style="max-width:100%;max-height:100px;display:block;margin:8px 0"><button id="insertUploadedAsset" class="button secondary full-button">Insert image on canvas</button>';
    document.querySelector('#insertUploadedAsset')?.addEventListener('click', () => {
      window.CodeStructEditor?.insertImage(url, file.name);
      const status = document.querySelector('#cloudMessage');
      if (status) { status.textContent = 'Image inserted. Save the project to cloud.'; status.dataset.kind = 'success'; }
    });
    const status = document.querySelector('#cloudMessage');
    if (status) { status.textContent = 'Image uploaded to your asset library.'; status.dataset.kind = 'success'; }
  } catch (error) {
    if (host) host.textContent = error.message || 'Upload failed.';
    const status = document.querySelector('#cloudMessage');
    if (status) { status.textContent = error.message || 'Upload failed.'; status.dataset.kind = 'error'; }
  }
});
