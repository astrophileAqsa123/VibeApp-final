export const TIPS = [
  {
    icon: "✦",
    title: "Flutter & Dart Architecture",
    desc: "VibeApp generates production-grade Flutter widgets with null safety, reactive state management, and native performance on every screen.",
  },
  {
    icon: "⚡",
    title: "Supabase Realtime Backend",
    desc: "Auto-provisioned PostgreSQL tables and instant CRUD APIs. Add auth, storage, and database features just by prompting.",
  },
  {
    icon: "📱",
    title: "Cross-Platform Perfection",
    desc: "Your app looks beautiful on iPhone, Android phones, iPads, tablets, and web browsers with adaptive layout breakpoints.",
  },
  {
    icon: "🛠",
    title: "Yours To Keep",
    desc: "Export clean Flutter source code, build release APKs, or download the full ZIP project anytime. Zero lock-in.",
  },
];

export const QUICK_PROMPTS = [
  "Add dark mode toggle",
  "Change accent color to emerald",
  "Add search and filter bar",
  "Add smooth entry animations",
  "Add pull-to-refresh list",
];

// Keep the Flutter iframe at real CSS-pixel device dimensions, then scale only
// the visual shell so the complete phone/tablet remains visible in the studio.
export const DEVICE_FRAME_SIZES = {
  iphone: { outerWidth: 413, outerHeight: 872, viewport: "393 × 852" },
  android: { outerWidth: 428, outerHeight: 931, viewport: "412 × 915" },
  tablet: { outerWidth: 792, outerHeight: 1048, viewport: "768 × 1024" },
  desktop: { outerWidth: 1280, outerHeight: 800, viewport: "1280 × 762" },
};
