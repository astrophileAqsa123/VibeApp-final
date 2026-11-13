#!/bin/bash

export ANDROID_HOME=/home/zainab1/android-sdk
export ANDROID_SDK_ROOT=/home/zainab1/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=/home/zainab1/flutter/bin:/home/zainab1/android-sdk/platform-tools:/home/zainab1/android-sdk/emulator:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

set -e
echo "Target device: emulator-5554"
/home/zainab1/android-sdk/platform-tools/adb devices
state=$(/home/zainab1/android-sdk/platform-tools/adb -s emulator-5554 get-state 2>/dev/null || true)
if [ "$state" != "device" ]; then echo "Target device not ready: emulator-5554"; exit 1; fi