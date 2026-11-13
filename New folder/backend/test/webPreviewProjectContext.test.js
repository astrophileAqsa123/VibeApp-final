const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('web preview worker carries projectId from queued job into resilient fallback flow', () => {
  const managerPath = path.join(__dirname, '..', 'services', 'webPreviewManager.js');
  const source = fs.readFileSync(managerPath, 'utf8');

  assert.match(
    source,
    /const\s*\{\s*sessionId,\s*publicToken,\s*rawCode,\s*projectId\s*=\s*null\s*\}\s*=\s*job;/,
    'processJob must destructure projectId from the queued preview job'
  );
  assert.match(source, /loadVerifiedFallbackCandidates\(projectId,\s*rawCode\)/);
  assert.match(source, /markProjectCodeVerified\(projectId,\s*currentCode,/);
});
