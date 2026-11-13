const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ADB_PATH = process.env.ADB_PATH || 'adb';
const ADB_PATH_WSL = process.env.ADB_PATH_WSL || path.posix.join(
  process.env.ANDROID_SDK_PATH || '/home/zainab1/android-sdk',
  'platform-tools',
  'adb'
);

function windowsPathToWsl(value = '') {
  return String(value).replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`);
}

function shellQuote(value) {
  return `'${String(value ?? '').replace(/'/g, `'"'"'`)}'`;
}

function spawnCommand(command, args = [], timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish(new Error(`Command timed out: ${command} ${args.join(' ')}`));
    }, timeoutMs);

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    child.on('error', (error) => finish(Object.assign(new Error(error.message), { code: error.code })));
    child.on('close', (code) => {
      if (code === 0) return finish(null, { stdout, stderr });
      finish(new Error((stderr || stdout || `${command} exited with code ${code}`).trim()));
    });
  });
}

async function runAdb(args = [], timeoutMs = 120000) {
  const shouldPreferWsl = process.platform === 'win32' && /^\//.test(ADB_PATH_WSL) && !process.env.ADB_PATH;
  if (!shouldPreferWsl) {
    try {
      return await spawnCommand(ADB_PATH, args, timeoutMs);
    } catch (error) {
      if (!(process.platform === 'win32' && error.code === 'ENOENT')) throw error;
    }
  }

  if (process.platform !== 'win32') {
    return spawnCommand(ADB_PATH_WSL, args, timeoutMs);
  }

  const mappedArgs = args.map((value) => {
    const text = String(value);
    return /^[A-Za-z]:[\\/]/.test(text) ? windowsPathToWsl(text) : text;
  });
  const commandLine = [shellQuote(ADB_PATH_WSL), ...mappedArgs.map(shellQuote)].join(' ');
  return spawnCommand('wsl', ['bash', '-lc', commandLine], timeoutMs);
}

function parseDevices(output = '') {
  return String(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().startsWith('list of devices'))
    .map((line) => {
      const [id, status = 'unknown', ...details] = line.split(/\s+/);
      return { id, status, isEmulator: id.startsWith('emulator-'), details: details.join(' ') };
    });
}

async function listAdbDevices() {
  const result = await runAdb(['devices', '-l'], 30000);
  const devices = parseDevices(result.stdout);
  return {
    devices,
    installableDevices: devices.filter((device) => device.status === 'device'),
    unauthorizedDevices: devices.filter((device) => device.status === 'unauthorized'),
    offlineDevices: devices.filter((device) => device.status === 'offline'),
  };
}

async function installApkArtifact({ apkPath, deviceId = '', packageName = '' }) {
  if (!apkPath || !fs.existsSync(apkPath)) throw new Error('APK artifact not found.');

  const deviceInfo = await listAdbDevices();
  const installable = deviceInfo.installableDevices;
  if (!installable.length) {
    if (deviceInfo.unauthorizedDevices.length) {
      throw new Error('Android device is unauthorized. Unlock the phone and allow USB debugging, then retry.');
    }
    if (deviceInfo.offlineDevices.length) {
      throw new Error('Android device is offline. Reconnect USB/ADB and retry.');
    }
    throw new Error('No connected Android device found. Enable USB debugging and connect a phone or start an emulator.');
  }

  const selected = deviceId
    ? installable.find((device) => device.id === deviceId)
    : installable.find((device) => !device.isEmulator) || installable[0];
  if (!selected) throw new Error(`Requested Android device not found: ${deviceId}`);

  const prefix = ['-s', selected.id];
  try {
    await runAdb([...prefix, 'install', '-r', '-d', apkPath], 180000);
  } catch (error) {
    if (packageName && /INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match|inconsistent certificates/i.test(error.message)) {
      await runAdb([...prefix, 'uninstall', packageName], 60000).catch(() => {});
      await runAdb([...prefix, 'install', apkPath], 180000);
    } else {
      throw error;
    }
  }

  let launched = false;
  if (packageName) {
    try {
      await runAdb([...prefix, 'shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1'], 30000);
      launched = true;
    } catch (_) {}
  }

  return {
    message: launched ? 'APK installed and launched on the selected Android device.' : 'APK installed on the selected Android device.',
    deviceId: selected.id,
    packageName,
    launched,
  };
}

module.exports = { windowsPathToWsl, parseDevices, listAdbDevices, installApkArtifact };
