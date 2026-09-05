'use strict';

import { handler as LeadsHandler } from './internal/leads.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/leads') return LeadsHandler(request, env);
    return env.ASSETS.fetch(request);
  }
};