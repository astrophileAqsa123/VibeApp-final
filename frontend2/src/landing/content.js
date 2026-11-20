export const BRAND = 'VibeApp'

export const NAV_LINKS = [
  { label: 'Platform', href: '#product' },
  { label: 'Features', href: '#features' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Developers', href: '#developers' },
]

export const NEW_TASK_TEXT = 'Build mobile app'

export const TODO_TASKS = {
  today: [
    { id: 't1', label: 'Design homepage', done: true },
    { id: 't2', label: NEW_TASK_TEXT, done: false, isNew: true },
    { id: 't3', label: 'Connect Supabase', done: false },
    { id: 't4', label: 'Test live preview', done: false },
  ],
  upcoming: [
    { id: 'u1', label: 'Generate APK build', done: false },
    { id: 'u2', label: 'Export ZIP code', done: false },
  ],
}

export const PRODUCT_CAPTIONS = [
  'Prompt your application',
  'Synthesizing Flutter & database',
  'Ready to run, preview & edit',
]

export const TERMINAL_PRELUDE = [
  { type: 'cmd', text: `vibe generate --from "${NEW_TASK_TEXT}" --target flutter` },
  { type: 'ok', text: 'Parsed prompt · Flutter 3.x Scaffold ready' },
  { type: 'ok', text: 'Scaffolded project structure with Supabase support' },
  { type: 'info', text: 'Synthesizing lib/main.dart' },
  { type: 'blank', text: '' },
]

export const FLUTTER_CODE = [
  "import 'package:flutter/material.dart';",
  '',
  'void main() {',
  '  runApp(const VibeApp());',
  '}',
  '',
  'class VibeApp extends StatelessWidget {',
  '  const VibeApp({super.key});',
  '',
  '  @override',
  '  Widget build(BuildContext context) {',
  '    return MaterialApp(',
  "      title: 'My Tasks',",
  '      theme: ThemeData(',
  '        brightness: Brightness.dark,',
  '        colorSchemeSeed: const Color(0xFF10B981),',
  '      ),',
  '      home: const TodoScreen(),',
  '    );',
  '  }',
  '}',
  '',
  'class TodoScreen extends StatelessWidget {',
  '  const TodoScreen({super.key});',
  '',
  '  @override',
  '  Widget build(BuildContext context) {',
  '    return Scaffold(',
  "      appBar: AppBar(title: const Text('My Tasks')),",
  '      body: ListView(',
  '        padding: const EdgeInsets.all(16),',
  '        children: const [',
  "          TaskTile(title: 'Design homepage', done: true),",
  "          TaskTile(title: 'Build mobile app'),",
  "          TaskTile(title: 'Connect Supabase'),",
  "          TaskTile(title: 'Test live preview'),",
  "        ],",
  '      ),',
  '    );',
  '  }',
  '}',
]

export const TERMINAL_OUTRO = [
  { type: 'blank', text: '' },
  { type: 'ok', text: 'Generated lib/main.dart · ready for Web & APK preview' },
]

export const SHOWCASE_CODE = FLUTTER_CODE.slice(22, 40)

export const SHOWCASE_LOG = [
  { text: 'Prompt parsed · 1 screen, 4 components' },
  { text: 'TodoScreen scaffolded' },
  { text: 'Supabase table schema prepared' },
  { text: 'Web & mobile preview ready', pending: true },
]

export const FEATURES = [
  {
    icon: 'cpu',
    title: 'Prompt-to-Code Engine',
    text: 'Transform natural language ideas into production-ready Flutter apps with clean widgets, typed models, and reactive state.',
  },
  {
    icon: 'layers',
    title: 'Instant Database & Supabase',
    text: 'Seamlessly toggle live cloud persistence. VibeApp provisions database schemas, SQL migrations, and client queries automatically.',
  },
  {
    icon: 'code',
    title: 'Live Web & Mobile QR Preview',
    text: 'Test your app in real-time. Scan a QR code to run on your phone instantly, or spin up the web emulator in one click.',
  },
  {
    icon: 'refresh',
    title: 'Visual Builder & AI Chat',
    text: 'Tweak themes, toggle stats banners, or add fields with point-and-click ease or conversational AI instructions.',
  },
]

export const WORKFLOW_STEPS = [
  {
    number: '01',
    title: 'Prompt',
    text: 'Type what you want to build in plain English. Describe screens, data fields, and styling. VibeApp parses the architecture.',
  },
  {
    number: '02',
    title: 'Generate',
    text: 'Complete Flutter code is generated instantly alongside SQL tables, model classes, and reactive CRUD controllers.',
  },
  {
    number: '03',
    title: 'Preview & Edit',
    text: 'Run live web preview, test on mobile via QR code, and refine UI using conversational chat or the visual property inspector.',
  },
  {
    number: '04',
    title: 'Export & Ship',
    text: 'Download full source code as a ZIP file or trigger automated Android APK builds ready for device installation.',
  },
]

export const DEV_POINTS = [
  {
    number: '01',
    title: 'Pure Flutter & Dart',
    text: 'Clean, idiomatic Dart with clear widget trees, typed data structures, and zero black-box runtimes.',
  },
  {
    number: '02',
    title: 'Supabase-Ready',
    text: 'Auto-generates clean SQL CREATE TABLE scripts and secure client credentials integration with zero config friction.',
  },
  {
    number: '03',
    title: 'One-Click APK & ZIP Export',
    text: 'Export standalone Flutter projects you can open in Android Studio, VS Code, or build directly to an Android APK.',
  },
]

export const FOOTER_COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'Prompt Studio', href: '/build' },
      { label: 'Features', href: '#features' },
      { label: 'Workflow', href: '#workflow' },
      { label: 'Live Preview', href: '#product' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'Flutter Architecture', href: '#developers' },
      { label: 'Supabase Integration', href: '#developers' },
      { label: 'APK Compilation', href: '#developers' },
      { label: 'Template Engine', href: '#developers' },
    ],
  },
  {
    title: 'Product',
    links: [
      { label: 'My Projects', href: '/dashboard' },
      { label: 'Build New App', href: '/build' },
      { label: 'Sign In', href: '/login' },
      { label: 'Create Account', href: '/signup' },
    ],
  },
]
