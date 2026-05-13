/*
 * utils/http.js - Cliente HTTP simples para requests do frontend.
 *
 * Este util evita fetch duplicado espalhado em varios arquivos e
 * aplica tratamento minimo comum de erro e parse de resposta.
 */

const HttpClient = {
  /*
   * Executa request HTTP e retorna JSON quando disponivel.
   * Lanca erro padronizado se o status HTTP nao for 2xx.
   */
  async request(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (AppState?.auth?.accessToken && !headers.Authorization) {
      headers.Authorization = `Bearer ${AppState.auth.accessToken}`;
    }

    const response = await fetch(url, { ...options, headers });

    let payload = null;
    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    if (isJson) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    if (!response.ok) {
      const apiMessage = payload && typeof payload === 'object' ? payload.message : null;
      throw new Error(apiMessage || `Falha na requisicao HTTP (${response.status}).`);
    }

    return payload;
  },
};
