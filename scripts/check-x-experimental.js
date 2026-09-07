const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'X.Enhance.Experimental.api-twitter.v0.1.0.sgmodule');
const scriptPath = path.join(__dirname, 'x-experimental-request.js');
const {
  rewriteVariablesString,
  rewriteUrl,
  rewriteJsonBody,
  rewriteFormBody,
  rewriteRequest
} = require(scriptPath);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const moduleText = fs.readFileSync(modulePath, 'utf8');
const mitmLine = moduleText.split(/\r?\n/).map(x => x.trim()).find(x => x.startsWith('hostname ='));

assert(moduleText.includes('#!version=0.1.0'), 'experimental module version missing');
assert(moduleText.includes('api\\.twitter\\.com'), 'experimental pattern must target api.twitter.com');
assert(moduleText.includes('x-experimental-request.js'), 'experimental request script missing');
assert(moduleText.includes('scripts/x-enhance.js'), 'experimental response fallback missing');
assert(mitmLine && mitmLine.includes('api.twitter.com'), 'experimental MITM must include api.twitter.com');

const variables = rewriteVariablesString(JSON.stringify({
  count: 20,
  includePromotedContent: true,
  withCommunity: true
}));
assert(variables.changed, 'variables JSON should be changed');
assert(JSON.parse(variables.value).includePromotedContent === false, 'promoted flag not forced false');

const encodedVariables = encodeURIComponent(JSON.stringify({
  count: 20,
  includePromotedContent: true
}));
const url = 'https://api.twitter.com/graphql/abc/HomeTimeline?variables=' + encodedVariables + '&features=%7B%7D';
const urlResult = rewriteUrl(url);
assert(urlResult.changed, 'GET URL should be rewritten');
const urlVariables = decodeURIComponent(urlResult.value.match(/[?&]variables=([^&]*)/)[1]);
assert(JSON.parse(urlVariables).includePromotedContent === false, 'GET variables flag not forced false');

const jsonBody = JSON.stringify({
  variables: {
    count: 20,
    includePromotedContent: true,
    requestContext: 'launch'
  },
  features: {}
});
const jsonResult = rewriteJsonBody(jsonBody);
assert(jsonResult.changed, 'POST JSON body should be rewritten');
assert(JSON.parse(jsonResult.value).variables.includePromotedContent === false, 'POST JSON variables flag not forced false');

const formBody = 'variables=' + encodeURIComponent(JSON.stringify({
  count: 20,
  includePromotedContent: true
})) + '&features=%7B%7D';
const formResult = rewriteFormBody(formBody);
assert(formResult.changed, 'form body should be rewritten');
const formVariables = decodeURIComponent(formResult.value.match(/(?:^|&)variables=([^&]*)/)[1]);
assert(JSON.parse(formVariables).includePromotedContent === false, 'form variables flag not forced false');

const untouched = rewriteRequest({
  url: 'https://api.twitter.com/graphql/abc/UserByScreenName?variables=' +
    encodeURIComponent(JSON.stringify({screen_name: 'example'})),
  body: ''
});
assert(!untouched.changed, 'request without promoted flag must remain untouched');

console.log('PASS: X Experimental request rewrite and module checks');
