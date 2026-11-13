const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { detectExtraPackages, patchPubspec } = require('../services/webPreviewManager');

test('preview dependencies are saved in each isolated workspace and are idempotent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-dependency-test-'));
  try {
    const first = path.join(root, 'first');
    const second = path.join(root, 'second');
    for (const dir of [first, second]) {
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, 'pubspec.yaml'), 'name: preview\r\ndependencies:\r\n  flutter:\r\n    sdk: flutter\r\n');
    }
    const packages = detectExtraPackages("import 'package:shared_preferences/shared_preferences.dart';");
    patchPubspec(first, packages);
    patchPubspec(first, packages);
    const saved = fs.readFileSync(path.join(first, 'pubspec.yaml'), 'utf8');
    assert.equal(saved.match(/shared_preferences:/g).length, 1);
    assert.match(saved, /dependencies:\s+shared_preferences: \^2\.2\.3/);
    assert.doesNotMatch(fs.readFileSync(path.join(second, 'pubspec.yaml'), 'utf8'), /shared_preferences/);
    patchPubspec(first, { supabase: true, sharedPreferences: true });
    const combined = fs.readFileSync(path.join(first, 'pubspec.yaml'), 'utf8');
    assert.equal(combined.match(/shared_preferences:/g).length, 1);
    assert.match(combined, /supabase_flutter: \^2\.5\.0/);
    patchPubspec(first, detectExtraPackages("import 'package:hive_flutter/hive_flutter.dart';"));
    patchPubspec(first, { hive: true });
    assert.equal(fs.readFileSync(path.join(first, 'pubspec.yaml'), 'utf8').match(/hive_flutter:/g).length, 1);
    assert.doesNotMatch(fs.readFileSync(path.join(second, 'pubspec.yaml'), 'utf8'), /hive_flutter/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
