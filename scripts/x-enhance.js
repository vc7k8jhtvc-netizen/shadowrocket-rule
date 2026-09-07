// X Enhance for Shadowrocket
// Version: 1.0.0
// Purpose: conservatively remove clearly promoted/sponsored entries from X/Twitter timeline JSON.
// Research reference: fkhb90/Surge x_ads_blocker-2.3.js @ 5ff967420b6a085c8285fa907e6810cfb7d25a45.
// This implementation is independently written for this repository and intentionally avoids broad heuristics.

(function () {
  'use strict';

  const VERSION = '1.0.0';
  const MAX_DEPTH = 18;
  const ARRAY_KEYS = new Set(['entries', 'items', 'moduleItems', 'items_results']);
  let removedCount = 0;

  function isObject(value) {
    return value !== null && typeof value === 'object';
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function adLabel(value) {
    if (typeof value !== 'string') return false;
    return /promoted|sponsored|advertisement|(?:^|[_-])ad(?:[_-]|$)/i.test(value);
  }

  function promotedEntryId(value) {
    if (typeof value !== 'string') return false;
    return /(?:^|[-_])(promoted(?:tweet|trend|event)?|advertisement|sponsored|ad)(?:[-_]|$)/i.test(value);
  }

  function promotedSource(value) {
    return typeof value === 'string' && /Twitter for Advertisers|ads-api\.twitter\.com/i.test(value);
  }

  function promotedClientEvent(info) {
    if (!isObject(info)) return false;
    return ['component', 'element', 'action', 'details'].some(function (key) {
      return adLabel(info[key]);
    });
  }

  function promotedSocialContext(context) {
    if (typeof context === 'string') return adLabel(context);
    if (!isObject(context)) return false;
    return ['text', 'context', 'contextType', 'type', '__typename'].some(function (key) {
      return adLabel(context[key]);
    });
  }

  function unwrapTweetResult(result) {
    if (!isObject(result)) return null;
    if (result.__typename === 'TweetWithVisibilityResults' && isObject(result.tweet)) return result.tweet;
    if (isObject(result.tweet)) return result.tweet;
    return result;
  }

  function promotedTweetResult(result) {
    const tweet = unwrapTweetResult(result);
    if (!tweet) return false;

    if (tweet.promotedMetadata || tweet.promoted_metadata ||
        tweet.adMetadata || tweet.ad_metadata ||
        tweet.ext_has_promoted_metadata === true) {
      return true;
    }

    if (adLabel(tweet.__typename)) return true;
    if (tweet.promoted_id || tweet.promotedId) return true;

    if (isObject(tweet.card) &&
        (tweet.card.promotedMetadata || tweet.card.promoted_metadata ||
         tweet.card.adMetadata || tweet.card.ad_metadata)) {
      return true;
    }

    if (isObject(tweet.legacy)) {
      if (tweet.legacy.scribe_key === 'ad' || tweet.legacy.scribe_key === 'promoted') return true;
      if (promotedSource(tweet.legacy.source)) return true;
    }

    return promotedSource(tweet.source);
  }

  function promotedItemContent(content) {
    if (!isObject(content)) return false;

    if (content.promotedMetadata || content.promoted_metadata ||
        content.promotedContent || content.promoted_content ||
        content.adMetadata || content.ad_metadata ||
        content.placementTracking || content.placement_tracking ||
        content.promoted_id || content.promotedId) {
      return true;
    }

    if (adLabel(content.__typename) || adLabel(content.itemType) || adLabel(content.item_type)) return true;
    if (content.advertiser_results || content.advertiserResults) return true;

    const disclosure = content.disclosureType || content.disclosure_type;
    if (adLabel(disclosure)) return true;

    if (promotedSocialContext(content.socialContext || content.social_context)) return true;
    if (promotedClientEvent(content.clientEventInfo || content.client_event_info)) return true;

    const tweetResults = content.tweet_results || content.tweetResults;
    if (isObject(tweetResults) && promotedTweetResult(tweetResults.result)) return true;

    return false;
  }

  function unwrapCandidate(value) {
    if (!isObject(value)) return value;
    if (isObject(value.item)) return value.item;
    return value;
  }

  function promotedCandidate(value) {
    const candidate = unwrapCandidate(value);
    if (!isObject(candidate)) return false;

    const entryId = candidate.entryId || candidate.entry_id;
    if (promotedEntryId(entryId)) return true;

    const content = candidate.content;
    if (promotedItemContent(content)) return true;

    if (isObject(content)) {
      if (promotedItemContent(content.itemContent || content.item_content)) return true;
    }

    if (promotedItemContent(candidate.itemContent || candidate.item_content)) return true;
    if (promotedTweetResult(candidate.result)) return true;

    return false;
  }

  function sanitizeArray(array, depth) {
    if (!Array.isArray(array)) return;
    let write = 0;

    for (let read = 0; read < array.length; read++) {
      const value = array[read];
      if (promotedCandidate(value)) {
        removedCount++;
        continue;
      }

      sanitizeNode(value, depth + 1);
      array[write++] = value;
    }

    if (write !== array.length) array.length = write;
  }

  function sanitizeNode(node, depth) {
    if (!isObject(node) || depth > MAX_DEPTH) return;

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) sanitizeNode(node[i], depth + 1);
      return;
    }

    for (const key in node) {
      if (!hasOwn(node, key)) continue;
      const value = node[key];

      if (key === 'entry' && isObject(value) && promotedCandidate(value)) {
        node[key] = null;
        removedCount++;
        continue;
      }

      if (ARRAY_KEYS.has(key) && Array.isArray(value)) {
        sanitizeArray(value, depth + 1);
        continue;
      }

      if (isObject(value)) sanitizeNode(value, depth + 1);
    }
  }

  function cleanPayload(payload) {
    removedCount = 0;
    sanitizeNode(payload, 0);
    return { payload: payload, removed: removedCount };
  }

  function hasPromotedHint(body) {
    return body.indexOf('promoted') !== -1 ||
           body.indexOf('Promoted') !== -1 ||
           body.indexOf('sponsored') !== -1 ||
           body.indexOf('Sponsored') !== -1 ||
           body.indexOf('advertiser') !== -1 ||
           body.indexOf('placementTracking') !== -1 ||
           body.indexOf('placement_tracking') !== -1 ||
           body.indexOf('adMetadata') !== -1 ||
           body.indexOf('ad_metadata') !== -1;
  }

  function runShadowrocket() {
    const body = typeof $response !== 'undefined' && $response ? $response.body : '';
    if (typeof body !== 'string' || !body || !hasPromotedHint(body)) {
      $done({});
      return;
    }

    try {
      const parsed = JSON.parse(body);
      const result = cleanPayload(parsed);
      if (result.removed === 0) {
        $done({});
        return;
      }

      const url = typeof $request !== 'undefined' && $request ? ($request.url || '') : '';
      console.log('[X Enhance ' + VERSION + '] removed ' + result.removed + ' promoted item(s): ' + url);
      $done({ body: JSON.stringify(result.payload) });
    } catch (error) {
      console.log('[X Enhance ' + VERSION + '] passthrough after parse error: ' + error);
      $done({});
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      cleanPayload: cleanPayload,
      promotedCandidate: promotedCandidate
    };
  }

  if (typeof $done === 'function') runShadowrocket();
})();
