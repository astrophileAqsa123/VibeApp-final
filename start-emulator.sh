#!/bin/bash

ANDROID_SDK_PATH=${ANDROID_SDK_PATH:-/home/zainab1/android-sdk}
ADB_PATH=${ADB_PATH:-$ANDROID_SDK_PATH/platform-tools/adb}
EMULATOR_BIN=${EMULATOR_BIN:-$ANDROID_SDK_PATH/emulator/emulator}
AVD_NAME=${AVD_NAME:-vibeapp_emulator}
ADB_SERIAL=${ADB_SERIAL:-emulator-5554}

DISPLAY_ID=${DISPLAY_ID:-:99}
DISPLAY_NUM=${DISPLAY_ID#:}
VNC_PORT=${VNC_PORT:-5900}
NOVNC_PORT=${NOVNC_PORT:-6080}

ADB_TARGET="$ADB_PATH -s $ADB_SERIAL"

echo "======================================"
echo " VibeApp Interactive Linux Emulator"
echo " Using Xvnc + noVNC"
echo "======================================"
echo "AVD Name: $AVD_NAME"
echo "ADB Serial: $ADB_SERIAL"
echo "Display: $DISPLAY_ID"
echo "VNC Port: $VNC_PORT"
echo "noVNC Port: $NOVNC_PORT"
echo "======================================"

echo ""
echo "Step 1: Killing old preview sessions..."

pkill -f "websockify" 2>/dev/null || true
pkill -f "x11vnc" 2>/dev/null || true
pkill -f "Xvfb" 2>/dev/null || true
pkill -f "Xvnc" 2>/dev/null || true

# IMPORTANT:
# Do NOT use: pkill -f emulator
# because this script name is start-emulator.sh and it can kill itself.
pkill -f "emulator.*-avd" 2>/dev/null || true
pkill -f "qemu-system" 2>/dev/null || true

sleep 2

echo ""
echo "Step 2: Cleaning X display locks..."

sudo mkdir -p /tmp/.X11-unix
sudo chmod 1777 /tmp/.X11-unix
sudo rm -f /tmp/.X${DISPLAY_NUM}-lock
sudo rm -f /tmp/.X11-unix/X${DISPLAY_NUM}

sleep 1

echo ""
echo "Step 3: Starting Xvnc display..."

Xvnc $DISPLAY_ID \
  -geometry 1280x900 \
  -depth 24 \
  -SecurityTypes None \
  -localhost no \
  -AlwaysShared \
  -rfbport $VNC_PORT \
  > /tmp/vibeapp-xvnc.log 2>&1 &

sleep 4

echo ""
echo "Step 4: Checking Xvnc display..."

xdpyinfo -display $DISPLAY_ID >/dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "❌ Xvnc failed to start."
  echo ""
  echo "Xvnc log:"
  cat /tmp/vibeapp-xvnc.log
  exit 1
fi

echo "✅ Xvnc display ready on $DISPLAY_ID"
echo "✅ VNC port ready on $VNC_PORT"

export DISPLAY=$DISPLAY_ID
export XDG_SESSION_TYPE=x11
export GDK_BACKEND=x11
export QT_QPA_PLATFORM=xcb
export SDL_VIDEODRIVER=x11

echo ""
echo "Step 5: Starting Android emulator inside Xvnc..."

$EMULATOR_BIN \
  -avd "$AVD_NAME" \
  -no-audio \
  -no-boot-anim \
  -gpu swiftshader_indirect \
  -no-metrics \
  -no-snapshot-load \
  -no-snapshot-save \
  -memory 3072 \
  -cores 2 \
  -camera-back none \
  -camera-front none \
  > /tmp/vibeapp-emulator.log 2>&1 &

sleep 8

echo ""
echo "Step 6: Waiting for emulator device..."

$ADB_PATH wait-for-device

echo ""
echo "Step 7: Waiting for Android boot complete..."

BOOT_COMPLETED=""

until [ "$BOOT_COMPLETED" = "1" ]; do
  BOOT_COMPLETED=$($ADB_TARGET shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  echo "Boot status: $BOOT_COMPLETED"
  sleep 3
done

echo "✅ Emulator booted."

sleep 3

echo ""
echo "Step 8: Optimizing emulator performance..."

# Wake/unlock emulator
$ADB_TARGET shell input keyevent 82 2>/dev/null || true

# Keep screen awake
$ADB_TARGET shell settings put system screen_off_timeout 2147483647 2>/dev/null || true

# Disable Android animations for smoother preview
$ADB_TARGET shell settings put global window_animation_scale 0 2>/dev/null || true
$ADB_TARGET shell settings put global transition_animation_scale 0 2>/dev/null || true
$ADB_TARGET shell settings put global animator_duration_scale 0 2>/dev/null || true

# Reduce background issues
$ADB_TARGET shell settings put global stay_on_while_plugged_in 3 2>/dev/null || true

# If System UI is stuck, restart it
echo "Restarting System UI if needed..."
$ADB_TARGET shell pkill com.android.systemui 2>/dev/null || true

sleep 6

# Wake again after System UI restart
$ADB_TARGET shell input keyevent 82 2>/dev/null || true

echo "✅ Emulator performance optimized."

echo ""
echo "Step 9: Starting noVNC / websockify..."

websockify \
  --web=/usr/share/novnc/ \
  $NOVNC_PORT \
  localhost:$VNC_PORT \
  > /tmp/vibeapp-websockify.log 2>&1 &

sleep 3

echo ""
echo "Step 10: Checking noVNC port..."

ss -ltn | grep ":$NOVNC_PORT" >/dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "❌ websockify failed."
  echo ""
  echo "websockify log:"
  cat /tmp/vibeapp-websockify.log
  exit 1
fi

echo "✅ noVNC is listening on port $NOVNC_PORT"

echo ""
echo "Step 11: Checking emulator device list..."

$ADB_PATH devices

echo ""
echo "======================================"
echo " DONE"
echo "======================================"
echo ""
echo "Open this URL in browser:"
echo ""
echo "http://localhost:$NOVNC_PORT/vnc.html?host=localhost&port=$NOVNC_PORT&path=websockify&autoconnect=true&resize=scale"
echo ""
echo "Keep this terminal open."
echo ""
echo "Useful logs:"
echo "cat /tmp/vibeapp-xvnc.log"
echo "cat /tmp/vibeapp-emulator.log"
echo "cat /tmp/vibeapp-websockify.log"
echo ""