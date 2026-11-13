# VibeApp deployment guide

This guide covers the backend deployment. The frontend can remain on Vercel.

## 1. Choose the backend host

### Recommended free-tier setup: Render + MongoDB Atlas

For a free deployment, use a Render free Web Service for the Node/Express API
and MongoDB Atlas' free shared database tier. Keep the frontend on Vercel.

This free setup supports the core API, authentication, project storage, email
flows, and AI generation. It is suitable for a demo or low-traffic project.
Render's free service may sleep after inactivity, so the first request after a
quiet period can be slow.

The free setup does **not** reliably support Flutter web preview, APK generation,
or Android emulator preview. Those features spawn long-running Flutter/Gradle/
ADB processes and need persistent CPU, RAM, disk, and tooling. Use the paid VM
deployment described below when those features are required.

### AWS alternative

AWS EC2 can work if your AWS account is eligible for the current Free Tier or
free-trial offer, but eligibility, instance sizes, regions, billing, and public
IPv4 charges vary. Confirm the offer in the AWS billing console before creating
anything. A small free-eligible instance is usually appropriate only for the
core API, not Flutter/APK builds or an emulator.

For a free-tier goal, Render is simpler because it does not require SSH, Linux
service management, or Nginx configuration. Do not assume that AWS services
such as App Runner, load balancers, NAT gateways, or large EBS volumes are free.

### Paid persistent VM

When you need all features, deploy the backend to a persistent Ubuntu 22.04/24.04
VM, such as an AWS EC2 instance, DigitalOcean Droplet, Hetzner Cloud server, or
Azure VM.

Do **not** deploy this backend as a Vercel serverless function. It runs long-lived
Express processes and starts Flutter/Android build processes. The web preview and
APK features need local disk, a large process timeout, and installed Flutter and
Android tooling.

Recommended starting size:

- API and AI generation only: 2-4 vCPU, 4-8 GB RAM, 30 GB SSD
- Web preview and APK builds: 4-8 vCPU, 8-16 GB RAM, 60+ GB SSD
- Android emulator/mobile preview: a VM with KVM/nested virtualization support,
  at least 8 GB RAM, and the emulator kept on the same private network as the API

MongoDB should be MongoDB Atlas (or another managed MongoDB service), not a
database installed on the application VM.

## 2. Free Render deployment (core API only)

Before creating the service, make sure the repository is pushed to GitHub and
that `backend/.env` is not committed. In the Render dashboard:

1. Select **New > Web Service** and connect the repository.
2. Set **Root Directory** to `backend`.
3. Set **Runtime** to `Node`.
4. Set **Build Command** to `npm ci --omit=dev`.
5. Set **Start Command** to `node server.js`.
6. Select the **Free** instance type.
7. Add the environment variables from the table below.
8. Deploy and copy the generated URL, for example
   `https://vibeapp-backend.onrender.com`.

Render supplies `PORT` automatically. Keep `HOST=0.0.0.0`. Do not add PM2,
Nginx, or SSH commands to the Render deployment; Render manages the process.

Set these Render environment variables for the core API:

```text
NODE_ENV=production
HOST=0.0.0.0
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=<long-random-production-secret>
GROQ_API_KEY=<production-groq-key>
GROQ_MODEL=openai/gpt-oss-120b
FRONTEND_URL=https://<your-vercel-domain>
PUBLIC_FRONTEND_URL=https://<your-vercel-domain>
CLIENT_URL=https://<your-vercel-domain>
PUBLIC_BACKEND_URL=https://vibeapp-backend.onrender.com
EMAIL_USER=<smtp-user>
EMAIL_PASS=<smtp-app-password-or-smtp-password>
```

Do not set Windows paths such as `FLUTTER_PATH=C:\...`,
`ANDROID_SDK_PATH=...`, or `JAVA_HOME=...` on Render. Leave the Flutter/APK/
emulator variables unset in this free deployment. The corresponding features
will not be available until the backend is moved to a machine with those tools.

After deployment, test:

```text
https://vibeapp-backend.onrender.com/
https://vibeapp-backend.onrender.com/api/health
```

The health response should return `success: true` and should eventually show
`mongo: "connected"`.

### Important Render free-tier limitations

- The service can sleep when idle; this is normal.
- The local filesystem is ephemeral. Do not rely on
  `backend/storage/apks` or `backend/temp` surviving a restart/redeploy.
- Do not run APK/Flutter builds on the free instance.
- Build jobs can be interrupted when the service sleeps or restarts.
- Use external object storage later if generated APKs must persist.
- Render's public URL must be HTTPS in the Vercel and CORS settings.

## 3. Prepare MongoDB Atlas

1. Create a production database and database user in MongoDB Atlas.
2. For a paid VM/AWS EC2 deployment, add the VM's fixed public IP to Atlas
   Network Access.
3. For Render's free service, outbound IP addresses are not fixed. Atlas may
   therefore require `0.0.0.0/0` for the connection to work. Use a strong
   database password, a least-privilege database user, and restrict access to
   the required database. Move to a host with a fixed egress IP before
   production. Avoid `0.0.0.0/0` on a paid VM when a fixed IP is available.
4. Copy the SRV connection string and replace its password with the production
   database user's password.
5. Keep the database name in the URI, for example:

   ```text
   mongodb+srv://<user>:<password>@<cluster>/<database>?retryWrites=true&w=majority
   ```

The backend connects through `MONGO_URI` when it starts.

## 4. Prepare the Ubuntu VM (paid VM/AWS EC2 only)

SSH into the VM and run:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx unzip openjdk-17-jdk
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node --version
npm --version
```

Clone the repository into a deployment directory:

```bash
sudo mkdir -p /opt/vibeapp
sudo chown "$USER":"$USER" /opt/vibeapp
git clone <YOUR_REPOSITORY_URL> /opt/vibeapp
cd /opt/vibeapp/backend
npm ci --omit=dev
mkdir -p storage/apks storage/scripts temp
```

Do not copy the development `backend/.env` from a laptop. Create a new
production environment file on the VM and populate it through a secret manager
or a protected file.

## 5. Install build tools for the features you will expose

The API/authentication/AI routes only need Node.js and MongoDB. The following
features have additional requirements:

| Feature | Required backend dependency |
| --- | --- |
| AI generation | `GROQ_API_KEY` |
| Email verification/password reset | Gmail SMTP credentials or another SMTP provider |
| Flutter web preview | Flutter SDK and a working `flutter` command |
| APK generation | Flutter SDK, Android SDK command-line tools, Android build tools, and Java 17 |
| Phone/emulator preview | ADB and a reachable Android emulator |

For Flutter web preview, install Flutter on the VM and verify it before starting
the app:

```bash
flutter doctor
flutter config --enable-web
flutter --version
```

For APK generation, also install Android SDK command-line tools, accept the
licenses, and ensure `sdkmanager`, `adb`, and the required build tools are on
the service user's `PATH`. Verify:

```bash
java -version
adb version
flutter doctor -v
```

If these tools are not installed, disable or do not advertise the corresponding
preview/build feature. The API can still serve authentication and AI generation.

## 6. Configure production environment variables

Create `/opt/vibeapp/backend/.env`:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=5000

MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=<long-random-production-secret>
GROQ_API_KEY=<production-groq-key>
GROQ_MODEL=openai/gpt-oss-120b

FRONTEND_URL=https://<your-vercel-domain>
PUBLIC_FRONTEND_URL=https://<your-vercel-domain>
CLIENT_URL=https://<your-vercel-domain>
PUBLIC_BACKEND_URL=https://api.<your-domain>

EMAIL_USER=<smtp-user>
EMAIL_PASS=<smtp-app-password-or-smtp-password>

FLUTTER_PATH=/opt/flutter/bin/flutter
ANDROID_SDK_PATH=/opt/android-sdk
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
APK_BUILD_PROJECT_PATH=/tmp/vibeapp-apk-builds
APK_ARTIFACT_DIR=/opt/vibeapp/backend/storage/apks
APK_BUILD_CONCURRENCY=1
APK_ARTIFACT_TTL_HOURS=72
```

Use an app password for Gmail, not the normal Gmail password. If using another
SMTP provider, update the mail transport in the backend before deployment.

The repository's development environment contains Windows-specific paths for
Flutter, Java, Android SDK, and preview directories. Replace all of them with
Linux paths as shown above; do not reuse values such as `C:\...` on the VM.

Protect the file:

```bash
chmod 600 /opt/vibeapp/backend/.env
```

Never put these values in Vercel's frontend variables or commit them to Git:
`MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY`, `EMAIL_PASS`, and APK signing
passwords/keys.

## 7. Start and keep the backend running (paid VM/AWS EC2 only)

Test it directly first:

```bash
cd /opt/vibeapp/backend
npm run check
node server.js
```

From another terminal, confirm:

```bash
curl http://127.0.0.1:5000/api/health
```

Stop the foreground process with `Ctrl+C`, then run it under PM2:

```bash
cd /opt/vibeapp/backend
pm2 start server.js --name vibeapp-backend --cwd /opt/vibeapp/backend
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`, then check:

```bash
pm2 status
pm2 logs vibeapp-backend
```

When deploying a new version:

```bash
cd /opt/vibeapp
git pull
cd backend
npm ci --omit=dev
npm run check
pm2 restart vibeapp-backend --update-env
```

## 8. Put HTTPS in front of the API (paid VM/AWS EC2 only)

Point `api.<your-domain>` at the VM's public IP. Allow only SSH, HTTP, and HTTPS
in the VM/cloud firewall.

Create `/etc/nginx/sites-available/vibeapp-api`:

```nginx
server {
    listen 80;
    server_name api.<your-domain>;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 900s;
        proxy_send_timeout 900s;
    }
}
```

Enable it and issue a certificate:

```bash
sudo ln -s /etc/nginx/sites-available/vibeapp-api /etc/nginx/sites-enabled/vibeapp-api
sudo nginx -t
sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.<your-domain>
```

The long proxy timeout matters because Flutter/APK builds can take several
minutes. The frontend primarily polls build status, but the proxy should still
not terminate backend requests prematurely.

## 9. Configure Vercel

In the Vercel project settings, add this **production** environment variable:

```text
VITE_API_URL=https://api.<your-domain>/api
```

Redeploy the frontend after saving it. The backend CORS allow-list reads
`FRONTEND_URL`, `CLIENT_URL`, and `PUBLIC_FRONTEND_URL`, so set those to the
exact Vercel origin, including `https://` and excluding a trailing slash.

Check these URLs in a browser or with `curl`:

```text
https://api.<your-domain>/
https://api.<your-domain>/api/health
```

The health response should show `success: true`. `mongo: "connected"` is
required for signup, login, and saved projects.

## 10. Emulator/mobile preview deployment

The existing `docker-compose.emulator.yml` is a local Linux/KVM setup. It
references host directories and `/dev/kvm`, so it is not deployable unchanged
to Vercel or a normal container platform.

For phone preview:

1. Use a VM with KVM/nested virtualization support.
2. Install and start the Android emulator on that VM.
3. Verify `adb devices` shows `emulator-5554`.
4. Set `ADB_TARGET=emulator-5554` and the Linux `ADB_PATH`.
5. Keep emulator ports private; do not expose ADB publicly.
6. Put the API and emulator on the same VM/private network.

If the cloud provider does not provide nested virtualization, keep the emulator
on a separate machine and configure a secure private connection. Do not expose
port 5555 to the public internet.

## 11. Storage, security, and operations checklist

- Use a managed MongoDB backup/restore policy.
- Back up `backend/storage/apks` if APK downloads must survive a VM replacement;
  object storage is better for long-term artifacts.
- Treat `backend/temp` and generated build directories as disposable.
- Rotate any credentials that have ever been placed in a shared or committed
  `.env` file.
- Use a unique long random `JWT_SECRET` in production.
- Restrict MongoDB access to the VM IP.
- Keep Node.js, Flutter, Android SDK, Java, and OS packages updated.
- Monitor `pm2 logs`, disk usage, RAM, CPU, and failed build jobs.
- Do not expose port 5000 directly after Nginx is working.
- Test signup, email verification, login, project save, AI generation, web
  preview, and APK download separately; build features depend on the installed
  Flutter/Android toolchain.

## Troubleshooting

### CORS error in Vercel

Confirm `VITE_API_URL` points to the HTTPS API URL and that all three frontend
origin variables in the backend match the exact Vercel domain. Restart PM2 after
changing `.env`.

### `mongo: "not-connected"`

Check `MONGO_URI`, Atlas IP allow-listing, the database user's permissions, and
the PM2 log. Do not put an unescaped password containing `@`, `:`, `/`, or `#`
directly in the URI; URL-encode it.

### Web preview fails

Run `which flutter`, `flutter doctor -v`, and inspect `pm2 logs vibeapp-backend`.
`FLUTTER_PATH` must point to the Linux Flutter executable, not a Windows
`.bat` file.

### APK generation fails

Verify Java 17, Flutter, Android SDK licenses/build tools, disk space, and the
`APK_BUILD_PROJECT_PATH`. Keep `APK_BUILD_CONCURRENCY=1` until the VM has enough
RAM for parallel Gradle builds.

### API restarts during a build

Check RAM and disk usage. Increase the VM size, keep build concurrency at one,
and inspect PM2 logs. Do not use a serverless host for these workloads.
