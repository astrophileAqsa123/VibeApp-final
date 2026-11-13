#!/bin/bash

ANDROID_SDK_PATH=${ANDROID_SDK_PATH:-/home/zainab1/android-sdk}
ADB_PATH=${ADB_PATH:-$ANDROID_SDK_PATH/platform-tools/adb}

echo "Stopping VibeApp preview services..."

echo "Stopping Flutter preview runner..."
pkill -f "flutter.*vibeapp_preview" 2>/dev/null || true
pkill -f "dart.*vibeapp_preview" 2>/dev/null || true

echo "Stopping noVNC..."
pkill -f "websockify" 2>/dev/null || true

echo "Stopping VNC..."
pkill -f "x11vnc" 2>/dev/null || true

echo "Stopping Android emulator..."
pkill -f "emulator.*vibeapp_emulator" 2>/dev/null || true

echo "Stopping virtual display..."
pkill -f "Xvfb" 2>/dev/null || true

echo "Restarting ADB server..."
$ADB_PATH kill-server 2>/dev/null || true
$ADB_PATH start-server 2>/dev/null || true

echo "✅ All VibeApp preview services stopped."