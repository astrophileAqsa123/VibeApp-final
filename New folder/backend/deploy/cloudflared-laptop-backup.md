# Laptop backup (free) - run backend locally and expose it with Cloudflare Tunnel
1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Start backend:  npm start           (port 5000)
3. In another terminal:  cloudflared tunnel --url http://localhost:5000
   It prints https://something.trycloudflare.com  (changes every run)
4. In backend .env set FRONTEND_URL, PUBLIC_BACKEND_URL, APK_PUBLIC_BASE_URL, MOBILE_PREVIEW_BASE_URL to that URL
   (and point the Vercel frontend API URL to it).
5. Atlas > Network Access: temporarily allow your current IP (or 0.0.0.0/0 for the demo day only).
