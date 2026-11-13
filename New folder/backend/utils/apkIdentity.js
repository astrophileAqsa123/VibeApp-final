const crypto = require('crypto');

function packageNameForProject(projectId, userId, codeHash = '') {
  const stableSeed = String(projectId || userId || codeHash || 'vibeapp');
  const digest = crypto.createHash('sha1').update(stableSeed).digest('hex').slice(0, 12);
  return `com.vibeapp.generated.p${digest}`;
}

function androidIdentityPatchPython(packageName) {
  const safePackage = String(packageName || 'com.vibeapp.generated.app').replace(/[^a-zA-Z0-9_.]/g, '');
  return String.raw`python3 - <<'PY_ANDROID_ID'
from pathlib import Path
import re

package_name = ${JSON.stringify(safePackage)}
android_dir = Path("android")
kts = android_dir / "app" / "build.gradle.kts"
groovy = android_dir / "app" / "build.gradle"

if kts.exists():
    text = kts.read_text()
    text = re.sub(r'applicationId\s*=\s*"[^"]+"', f'applicationId = "{package_name}"', text, count=1)
    kts.write_text(text)
elif groovy.exists():
    text = groovy.read_text()
    text = re.sub(r'applicationId\s+["\'][^"\']+["\']', f'applicationId "{package_name}"', text, count=1)
    groovy.write_text(text)
else:
    raise SystemExit("Could not find Android app Gradle build file")
PY_ANDROID_ID`;
}

module.exports = { packageNameForProject, androidIdentityPatchPython };
