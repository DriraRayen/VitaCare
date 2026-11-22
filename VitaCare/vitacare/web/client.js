/** Same-origin browser client. The served module URL identifies the default mount. */
export function createVitaCareClient({baseURL = new URL('../', import.meta.url), onUnauthorized} = {}) {
  const base = new URL(baseURL, location.href);
  if (base.origin !== location.origin) throw new Error('VitaCare requires a same-origin API.');
  base.pathname = base.pathname.replace(/\/?$/, '/');
  base.search = '';
  base.hash = '';

  async function post(action, body, headers) {
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(action)) throw new TypeError('Invalid VitaCare action.');
    const response = await fetch(new URL('api/' + action, base), {
      method: 'POST', credentials: 'same-origin', mode: 'same-origin',
      headers: {...headers, 'X-Vita-Request': '1'}, body
    });
    if (response.status === 401) onUnauthorized?.();
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(typeof data.detail === 'string' ? data.detail : 'Requête impossible.');
      error.status = response.status;
      throw error;
    }
    return data;
  }
  return {
    call(action, data = {}) {
      return post(action, JSON.stringify(data), {'Content-Type':'application/json'});
    },
    uploadDocument(file, title, category) {
      return post('documents', file, {'X-Title':encodeURIComponent(title), 'X-Category':encodeURIComponent(category)});
    },
    documentURL(id) {
      if (!Number.isSafeInteger(id) || id < 1) throw new TypeError('Invalid document ID.');
      return new URL('api/document/' + id, base).href;
    }
  };
}
