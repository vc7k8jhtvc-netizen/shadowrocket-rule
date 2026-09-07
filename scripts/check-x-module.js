const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const scriptPath = path.join(__dirname, 'x-enhance.js');
const modulePath = path.join(root, 'X.Enhance.Shadowrocket.v1.0.1.sgmodule');
const { cleanPayload, promotedCandidate } = require(scriptPath);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const moduleText = fs.readFileSync(modulePath, 'utf8');
const moduleLines = moduleText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
const mitmLine = moduleLines.find(line => line.startsWith('hostname ='));
assert(mitmLine, 'X module missing MITM hostname line');
assert(mitmLine.includes('%APPEND%'), 'X module MITM must append instead of overwrite');
assert(mitmLine.includes('api.x.com'), 'X module must include api.x.com');
assert(mitmLine.includes('global.albtls.t.co'), 'X module must include global.albtls.t.co');
assert(!mitmLine.includes('api.twitter.com'), 'X module must not MITM api.twitter.com');
assert(moduleText.includes('scripts/x-enhance.js'), 'X module must use repository-owned script');
assert(moduleText.includes('binary-body-mode=1'), 'X module must enable binary body handling');
assert(moduleText.includes('(?:global\\.)?albtls\\.t\\.co'), 'X module pattern must cover global.albtls.t.co');
assert(moduleText.includes('DOMAIN,ads-api.twitter.com,REJECT'), 'X module missing ads-api block');
assert(moduleText.includes('DOMAIN-SUFFIX,ads-twitter.com,REJECT'), 'X module missing ads-twitter block');

const fixture = {
  data: {
    home: {
      timeline: {
        instructions: [
          {
            type: 'TimelineAddEntries',
            entries: [
              {
                entryId: 'tweet-100',
                content: {
                  itemContent: {
                    tweet_results: {
                      result: {
                        __typename: 'Tweet',
                        legacy: { full_text: 'normal post' }
                      }
                    }
                  }
                }
              },
              {
                entryId: 'tweet-200',
                content: {
                  itemContent: {
                    tweet_results: {
                      result: {
                        __typename: 'Tweet',
                        promotedMetadata: { advertiserId: '42' },
                        legacy: { full_text: 'promoted post' }
                      }
                    }
                  }
                }
              },
              {
                entryId: 'cursor-bottom-0',
                content: { cursorType: 'Bottom' }
              },
              {
                entryId: 'module-1',
                content: {
                  items: [
                    {
                      item: {
                        entryId: 'tweet-300',
                        itemContent: {
                          tweet_results: {
                            result: {
                              __typename: 'Tweet',
                              legacy: { full_text: 'normal module post' }
                            }
                          }
                        }
                      }
                    },
                    {
                      item: {
                        entryId: 'promoted-tweet-301',
                        itemContent: {
                          advertiser_results: { result: { id: '7' } }
                        }
                      }
                    }
                  ]
                }
              }
            ]
          },
          {
            type: 'TimelineReplaceEntry',
            entry: {
              entryId: 'promoted-trend-1',
              content: {
                itemContent: {
                  __typename: 'TimelineTrend',
                  disclosureType: 'Promoted'
                }
              }
            }
          },
          {
            type: 'TimelineAddEntries',
            entries: [
              {
                entryId: 'trend-2',
                content: {
                  itemContent: {
                    __typename: 'TimelineTrend',
                    disclosureType: 'NoDisclosure'
                  }
                }
              }
            ]
          }
        ]
      }
    }
  }
};

assert(promotedCandidate({
  entryId: 'tweet-1',
  content: { itemContent: { tweet_results: { result: { legacy: { full_text: 'ok' } } } } }
}) === false, 'normal tweet must not be classified as promoted');

const result = cleanPayload(fixture);
assert(result.removed === 3, 'expected 3 promoted items removed, got ' + result.removed);

const instructions = result.payload.data.home.timeline.instructions;
const entries = instructions[0].entries;
assert(entries.length === 3, 'top-level entries should keep normal tweet, cursor and module');
assert(entries.some(entry => entry.entryId === 'tweet-100'), 'normal tweet was removed');
assert(entries.some(entry => entry.entryId === 'cursor-bottom-0'), 'cursor was removed');

const moduleEntry = entries.find(entry => entry.entryId === 'module-1');
assert(moduleEntry.content.items.length === 1, 'promoted module item was not removed');
assert(moduleEntry.content.items[0].item.entryId === 'tweet-300', 'normal module item was removed');

assert(instructions[1].entry === null, 'promoted replacement entry was not removed');
assert(instructions[2].entries.length === 1, 'NoDisclosure trend must remain');

console.log('PASS: X Enhance module and fixture checks');
