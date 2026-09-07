// X Enhance Experimental request rewriter for Shadowrocket
// Version: 0.1.0
// Purpose: force GraphQL variables.includePromotedContent=false on api.twitter.com.
// This script is intentionally narrow and does not modify authentication headers, cookies or hostnames.

(function () {
  'use strict';

  const VERSION = '0.1.0';

  function setPromotedFalse(obj) {
    if (!obj || typeof obj !== 'object') return false;
    let changed = false;

    if (Object.prototype.hasOwnProperty.call(obj, 'includePromotedContent') &&
        obj.includePromotedContent !== false) {
      obj.includePromotedContent = false;
      changed = true;
    }

    if (Object.prototype.hasOwnProperty.call(obj, 'include_promoted_content') &&
        obj.include_promoted_content !== false) {
      obj.include_promoted_content = false;
      changed = true;
    }

    return changed;
  }

  function rewriteVariablesString(value) {
    if (typeof value !== 'string' || !value) {
      return { value: value, changed: false };
    }

    try {
      const parsed = JSON.parse(value);
      const changed = setPromotedFalse(parsed);
      return {
        value: changed ? JSON.stringify(parsed) : value,
        changed: changed
      };
    } catch (_) {
      const replaced = value
        .replace(/("includePromotedContent"\s*:\s*)true\b/g, '$1false')
        .replace(/("include_promoted_content"\s*:\s*)true\b/g, '$1false');
      return { value: replaced, changed: replaced !== value };
    }
  }

  function rewriteUrl(url) {
    if (typeof url !== 'string' || !url) {
      return { value: url, changed: false };
    }

    const match = url.match(/([?&]variables=)([^&]*)/);
    if (!match) return { value: url, changed: false };

    let decoded;
    try {
      decoded = decodeURIComponent(match[2].replace(/\+/g, '%20'));
    } catch (_) {
      decoded = match[2];
    }

    const rewritten = rewriteVariablesString(decoded);
    if (!rewritten.changed) return { value: url, changed: false };

    const encoded = encodeURIComponent(rewritten.value);
    return {
      value: url.slice(0, match.index) +
        match[1] + encoded +
        url.slice(match.index + match[0].length),
      changed: true
    };
  }

  function rewriteJsonBody(body) {
    if (typeof body !== 'string' || !body) {
      return { value: body, changed: false };
    }

    try {
      const parsed = JSON.parse(body);
      let changed = false;

      if (parsed && typeof parsed === 'object') {
        if (parsed.variables && typeof parsed.variables === 'object') {
          changed = setPromotedFalse(parsed.variables) || changed;
        } else if (typeof parsed.variables === 'string') {
          const variables = rewriteVariablesString(parsed.variables);
          if (variables.changed) {
            parsed.variables = variables.value;
            changed = true;
          }
        }

        changed = setPromotedFalse(parsed) || changed;
      }

      return {
        value: changed ? JSON.stringify(parsed) : body,
        changed: changed
      };
    } catch (_) {
      return { value: body, changed: false };
    }
  }

  function rewriteFormBody(body) {
    if (typeof body !== 'string' || !body || body.indexOf('variables=') === -1) {
      return { value: body, changed: false };
    }

    const match = body.match(/(^|&)variables=([^&]*)/);
    if (!match) return { value: body, changed: false };

    let decoded;
    try {
      decoded = decodeURIComponent(match[2].replace(/\+/g, '%20'));
    } catch (_) {
      decoded = match[2];
    }

    const rewritten = rewriteVariablesString(decoded);
    if (!rewritten.changed) return { value: body, changed: false };

    const encoded = encodeURIComponent(rewritten.value);
    const start = match.index + match[1].length;
    const end = match.index + match[0].length;

    return {
      value: body.slice(0, start) + 'variables=' + encoded + body.slice(end),
      changed: true
    };
  }

  function rewriteRequest(request) {
    const result = {};
    let changed = false;

    const urlResult = rewriteUrl(request && request.url);
    if (urlResult.changed) {
      result.url = urlResult.value;
      changed = true;
    }

    const body = request && request.body;
    if (typeof body === 'string' && body) {
      let bodyResult = rewriteJsonBody(body);
      if (!bodyResult.changed) bodyResult = rewriteFormBody(body);

      if (bodyResult.changed) {
        result.body = bodyResult.value;
        changed = true;
      }
    }

    return { result: result, changed: changed };
  }

  function runShadowrocket() {
    try {
      const rewritten = rewriteRequest($request || {});
      if (rewritten.changed) {
        console.log('[X Experimental ' + VERSION + '] includePromotedContent => false: ' + ($request.url || ''));
        $done(rewritten.result);
      } else {
        console.log('[X Experimental ' + VERSION + '] intercepted but no promoted flag found: ' + ($request.url || ''));
        $done({});
      }
    } catch (error) {
      console.log('[X Experimental ' + VERSION + '] passthrough after error: ' + error);
      $done({});
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      setPromotedFalse: setPromotedFalse,
      rewriteVariablesString: rewriteVariablesString,
      rewriteUrl: rewriteUrl,
      rewriteJsonBody: rewriteJsonBody,
      rewriteFormBody: rewriteFormBody,
      rewriteRequest: rewriteRequest
    };
  }

  if (typeof $done === 'function') runShadowrocket();
})();
