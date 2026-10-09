(function () {
  const isLiveServer = window.location.port === '5500';
  const apiBase = isLiveServer
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : `${window.location.origin}/api`;
  const apiUrl = new URL(apiBase, window.location.href);
  const apiPrefix = apiUrl.pathname.replace(/\/$/, '');
  window.API_BASE_URL = apiBase;
  const accessKey = 'financeiro.acessToken';
  const userKey = 'financeiro.userId';
  const nativeFetch = window.fetch.bind(window);
  const loginUrl = new URL('../auth/index.html', document.currentScript.src)
    .href;
  const isAuthPage = window.location.pathname.includes('/auth/');
  let refreshInProgress;

  function clearSession() {
    sessionStorage.removeItem(accessKey);
    sessionStorage.removeItem(userKey);
  }

  async function goToLogin() {
    const userId = sessionStorage.getItem(userKey);
    if (userId) {
      try {
        await nativeFetch(`${apiBase}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId }),
          signal: AbortSignal.timeout(1500),
        });
      } catch {
        // A sessão local ainda deve ser encerrada se a API estiver indisponível.
      }
    }
    clearSession();
    if (!isAuthPage) window.location.replace(loginUrl);
  }

  function refreshSession() {
    if (refreshInProgress) return refreshInProgress;
    refreshInProgress = refreshSessionOnce().finally(() => {
      refreshInProgress = null;
    });
    return refreshInProgress;
  }

  async function refreshSessionOnce() {
    const userId = sessionStorage.getItem(userKey);
    if (!userId) return false;
    try {
      const response = await nativeFetch(`${apiBase}/auth/refreshToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) return false;
      const tokens = await response.json();
      sessionStorage.setItem(accessKey, tokens.acessToken);
      return true;
    } catch {
      return false;
    }
  }

  const authReady = isAuthPage
    ? Promise.resolve()
    : (async () => {
        if (sessionStorage.getItem(accessKey)) return;
        if (!(await refreshSession())) await goToLogin();
      })();

  window.fetch = async function (input, init) {
    const requestUrl = new URL(
      input instanceof Request ? input.url : input,
      window.location.href
    );
    if (
      requestUrl.origin !== apiUrl.origin ||
      !requestUrl.pathname.startsWith(`${apiPrefix}/`) ||
      requestUrl.pathname.startsWith(`${apiPrefix}/auth/`)
    ) {
      return nativeFetch(input, init);
    }

    await authReady;
    const accessToken = sessionStorage.getItem(accessKey);
    if (!accessToken) {
      await goToLogin();
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const sendWithToken = (token) => {
      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined)
      );
      headers.set('Authorization', `Bearer ${token}`);
      // Uma Request com body é consumida no primeiro fetch; clone-a para permitir
      // reenviar a chamada depois da renovação do token.
      const requestInput = input instanceof Request ? input.clone() : input;
      return nativeFetch(requestInput, {
        ...init,
        headers,
        credentials: 'include',
      });
    };

    let response = await sendWithToken(accessToken);
    if (response.status !== 401) return response;
    if (!(await refreshSession())) {
      await goToLogin();
      return response;
    }
    response = await sendWithToken(sessionStorage.getItem(accessKey));
    if (response.status === 401) await goToLogin();
    return response;
  };

  document.addEventListener('click', async (event) => {
    if (event.target.closest('[data-logout]')) {
      event.preventDefault();
      await goToLogin();
    }
  });
})();
