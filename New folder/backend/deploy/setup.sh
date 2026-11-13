#!/usr/bin/env bash
# VibeApp server setup for Ubuntu 22.04/24.04 (DigitalOcean 4GB or AWS t3.medium).
# Run as the normal user (e.g. ubuntu / a sudo user), NOT as root:  bash setup.sh
set -euo pipefail

HOME_DIR="$HOME"
echo "== 1/7 packages =="
sudo apt-get update
sudo apt-get install -y git unzip curl xz-utils zip nginx openjdk-17-jdk ca-certificates \
  libglu1-mesa clang cmake ninja-build pkg-config libgtk-3-dev

echo "== 2/7 swap (4GB) - needed for Gradle on a 4GB server =="
if ! swapon --show | grep -q swapfile; then
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo 'vm.swappiness=20' | sudo tee /etc/sysctl.d/99-swap.conf
  sudo sysctl -p /etc/sysctl.d/99-swap.conf
fi

echo "== 3/7 Node 22 + pm2 =="
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo npm i -g pm2

echo "== 4/7 Flutter =="
if [ ! -d "$HOME_DIR/flutter" ]; then
  git clone https://github.com/flutter/flutter.git -b stable "$HOME_DIR/flutter"
fi
export PATH="$PATH:$HOME_DIR/flutter/bin"
flutter config --no-analytics >/dev/null 2>&1 || true
flutter config --enable-web
flutter precache --android --web

echo "== 5/7 Android SDK =="
SDK="$HOME_DIR/android-sdk"
if [ ! -d "$SDK/cmdline-tools/latest" ]; then
  mkdir -p "$SDK/cmdline-tools"
  curl -fsSL -o /tmp/cmdtools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q /tmp/cmdtools.zip -d "$SDK/cmdline-tools"
  mv "$SDK/cmdline-tools/cmdline-tools" "$SDK/cmdline-tools/latest"
  rm /tmp/cmdtools.zip
fi
export ANDROID_HOME="$SDK" ANDROID_SDK_ROOT="$SDK"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null || true
"$SDK/cmdline-tools/latest/bin/sdkmanager" "platform-tools" "platforms;android-34" "platforms;android-35" "build-tools;34.0.0"
flutter config --android-sdk "$SDK"
yes | flutter doctor --android-licenses >/dev/null || true

echo "== 6/7 Gradle low-memory settings (4GB server) =="
mkdir -p "$HOME_DIR/.gradle"
cat > "$HOME_DIR/.gradle/gradle.properties" <<'GP'
org.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError
org.gradle.daemon=false
org.gradle.workers.max=1
org.gradle.parallel=false
kotlin.daemon.jvmargs=-Xmx1024m
GP

echo "== 7/7 done =="
flutter doctor -v || true
cat <<MSG

Next:
  1. Upload the backend to ~/vibeapp, then:  cd ~/vibeapp && npm ci --omit=dev
  2. cp deploy/.env.example .env  and fill it in
  3. pm2 start ecosystem.config.js && pm2 save && pm2 startup
  4. sudo cp deploy/nginx-vibeapp.conf /etc/nginx/sites-available/vibeapp  (edit domain)
     sudo ln -s /etc/nginx/sites-available/vibeapp /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
  5. sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d api.YOURDOMAIN
MSG
