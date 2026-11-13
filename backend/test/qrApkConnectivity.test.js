const test = require('node:test');
const assert = require('node:assert/strict');

const { isPrivateIpv4, interfaceScore, isLikelyVirtualInterface } = require('../utils/networkAccess');
const { parseDevices, windowsPathToWsl } = require('../services/apkDeviceInstaller');
const { packageNameForProject, androidIdentityPatchPython } = require('../utils/apkIdentity');

test('private IPv4 detection covers common LAN ranges', () => {
  assert.equal(isPrivateIpv4('192.168.43.181'), true);
  assert.equal(isPrivateIpv4('10.0.0.2'), true);
  assert.equal(isPrivateIpv4('172.24.96.1'), true);
  assert.equal(isPrivateIpv4('8.8.8.8'), false);
});

test('ADB device parser separates real devices and emulators', () => {
  const parsed = parseDevices(`List of devices attached\nemulator-5554 device product:sdk\nABC123 device usb:1-1\nXYZ unauthorized usb:2-1\n`);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].isEmulator, true);
  assert.equal(parsed[1].isEmulator, false);
  assert.equal(parsed[2].status, 'unauthorized');
});

test('Windows APK artifact paths can be mapped into WSL', () => {
  assert.equal(windowsPathToWsl('C:\\Users\\me\\app.apk'), '/mnt/c/Users/me/app.apk');
});

test('generated APK package id is stable per project and valid', () => {
  const a = packageNameForProject('507f1f77bcf86cd799439011', 'u1', 'hash1');
  const b = packageNameForProject('507f1f77bcf86cd799439011', 'u1', 'hash2');
  const other = packageNameForProject('507f1f77bcf86cd799439012', 'u1', 'hash1');
  assert.equal(a, b);
  assert.notEqual(a, other);
  assert.match(a, /^com\.vibeapp\.generated\.p[a-f0-9]{12}$/);
});

test('Android identity patch handles Kotlin and Groovy applicationId', () => {
  const script = androidIdentityPatchPython('com.vibeapp.generated.p123abc');
  assert.match(script, /build\.gradle\.kts/);
  assert.match(script, /applicationId/);
  assert.match(script, /com\.vibeapp\.generated\.p123abc/);
});


test('physical Wi-Fi/LAN addresses outrank WSL and virtual adapters', () => {
  assert.equal(isLikelyVirtualInterface('vEthernet (WSL)'), true);
  assert.equal(isLikelyVirtualInterface('Wi-Fi'), false);
  assert.ok(interfaceScore('Wi-Fi', '192.168.43.181') > interfaceScore('vEthernet (WSL)', '172.24.96.1'));
  assert.ok(interfaceScore('Ethernet', '192.168.1.20') > interfaceScore('Ethernet', '172.16.1.120'));
});

test('APK build script treats analyzer warnings as non-fatal but real errors as fatal', () => {
  const source = require('fs').readFileSync(require('path').join(__dirname, '..', 'services', 'apkBuildManager.js'), 'utf8');
  assert.match(source, /analyzer returned non-zero for warnings\/info only/);
  assert.match(source, /grep -Eiq/);
  assert.match(source, /format .*main\.dart/);
  assert.match(source, /building release APK/);
});


test('APK analyzer scopes validation to generated main.dart and ignores flutter create default widget test', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '..', 'services', 'apkBuildManager.js'), 'utf8');
  assert.match(source, /analyze --no-fatal-infos --no-fatal-warnings lib\/main\.dart/);
  assert.match(source, /default test\/widget_test\.dart/);
  assert.doesNotMatch(source, /analyze --no-fatal-infos --no-fatal-warnings 2>&1/);
});
