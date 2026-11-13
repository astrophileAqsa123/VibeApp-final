function normalizeRoles(rawRoles, enabled = false) {
  if (!enabled) return ["User"];
  const source = Array.isArray(rawRoles) ? rawRoles : [];
  const roles = [...new Set(source.map((role) => {
    const value = typeof role === "string" ? role : role?.name;
    return String(value || "").replace(/[^a-z0-9 _-]/gi, "").trim();
  }).filter(Boolean))].slice(0, 6);
  return roles.length ? roles : ["User", "Admin"];
}

function safeDart(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildRoleAuthDart(roles = [], options = {}) {
  const normalized = normalizeRoles(roles, true);
  const allowSignup = options.allowSignup !== false;
  const users = normalized.map((role, index) => {
    const slug = role.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || `user${index + 1}`;
    return `VibeDemoUser(name: '${safeDart(role)} User', email: '${safeDart(slug)}@demo.app', role: '${safeDart(role)}', password: 'demo123', isDemo: true)`;
  }).join(",\n    ");

  return `
class VibeDemoUser {
  final String name;
  final String email;
  final String role;
  final String password;
  final bool isDemo;
  const VibeDemoUser({required this.name, required this.email, required this.role, required this.password, this.isDemo = false});
}

class VibeAuthSession {
  static final ValueNotifier<VibeDemoUser?> currentUser = ValueNotifier<VibeDemoUser?>(null);
  static const String demoPassword = 'demo123';
  static const bool allowSignup = ${allowSignup ? "true" : "false"};
  static final List<VibeDemoUser> users = <VibeDemoUser>[
    ${users}
  ];

  static List<String> get roles => <String>[${normalized.map((role) => `'${safeDart(role)}'`).join(", ")}];
  static List<String> get signupRoles {
    final safeRoles = roles.where((role) {
      final value = role.toLowerCase();
      return !value.contains('admin') && !value.contains('owner') && !value.contains('super');
    }).toList();
    return safeRoles;
  }

  static String get _role => (currentUser.value?.role ?? '').toLowerCase();
  static bool get isAdministrator => _role.contains('admin') || _role.contains('owner') || _role.contains('super');
  static bool get isManager => isAdministrator || _role.contains('manager') || _role.contains('lead');
  static bool get isReadOnly => _role.contains('viewer') || _role.contains('student') || _role.contains('customer') || _role.contains('patient');
  static bool get canCreate => !isReadOnly && (isManager || _role.contains('staff') || _role.contains('employee') || _role.contains('editor') || _role.contains('operator') || _role.contains('doctor') || _role.contains('teacher') || _role.contains('reception'));
  static bool get canUpdate => canCreate;
  static bool get canDelete => isManager;
  static bool get canOpenSettings => isAdministrator;

  static String get dashboardTitle {
    final role = currentUser.value?.role ?? 'User';
    return role + ' Dashboard';
  }

  static String get dashboardHeadline {
    if (isAdministrator) return 'Full workspace control';
    if (_role.contains('manager') || _role.contains('lead')) return 'Manage team activity';
    if (_role.contains('doctor')) return 'Your clinical workspace';
    if (_role.contains('teacher')) return 'Your teaching workspace';
    if (_role.contains('reception')) return 'Front desk workspace';
    if (_role.contains('student')) return 'Your student workspace';
    if (_role.contains('customer') || _role.contains('patient')) return 'Your personal workspace';
    if (isReadOnly) return 'View workspace information';
    return 'Your assigned workspace';
  }

  static String get dashboardDescription {
    if (isAdministrator) return 'Manage records, users, settings, and all available actions.';
    if (isManager) return 'Create and update records, review activity, and manage day-to-day work.';
    if (isReadOnly) return 'View the information available to your role without administrative controls.';
    return 'Access the records and actions assigned to your role.';
  }

  static VibeDemoUser? authenticate(String email, String password) {
    for (final user in users) {
      if (user.email.toLowerCase() == email.trim().toLowerCase() && user.password == password) return user;
    }
    return null;
  }

  static String? signUp({required String name, required String email, required String password, required String role}) {
    if (!allowSignup) return 'Signup is disabled for this generated app.';
    if (name.trim().length < 2) return 'Enter your name.';
    if (!email.contains('@')) return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (!signupRoles.contains(role)) return 'This role cannot be selected during public signup.';
    if (users.any((user) => user.email.toLowerCase() == email.trim().toLowerCase())) return 'An account with this email already exists.';
    final user = VibeDemoUser(name: name.trim(), email: email.trim(), role: role, password: password);
    users.add(user);
    currentUser.value = user;
    return null;
  }

  static void previewAsRole(String role) {
    final match = users.where((user) => user.role == role).toList();
    if (match.isNotEmpty) currentUser.value = match.first;
  }

  static void signOut() => currentUser.value = null;
}

class VibeAuthGate extends StatelessWidget {
  const VibeAuthGate({super.key});

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<VibeDemoUser?>(
    valueListenable: VibeAuthSession.currentUser,
    builder: (context, user, _) => user == null
        ? const VibeRoleLoginPage()
        : const VibeProductShell(),
  );
}

class VibeRoleLoginPage extends StatefulWidget {
  const VibeRoleLoginPage({super.key});
  @override
  State<VibeRoleLoginPage> createState() => _VibeRoleLoginPageState();
}

class _VibeRoleLoginPageState extends State<VibeRoleLoginPage> {
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController(text: VibeAuthSession.demoPassword);
  bool _obscure = true;
  bool _submitting = false;

  @override
  void dispose() { _email.dispose(); _password.dispose(); super.dispose(); }

  Future<void> _login() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter an email and password.')));
      return;
    }
    setState(() => _submitting = true);
    await Future<void>.delayed(const Duration(milliseconds: 250));
    if (!mounted) return;
    final user = VibeAuthSession.authenticate(_email.text, _password.text);
    setState(() => _submitting = false);
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invalid credentials. You can use a demo account below.')));
      return;
    }
    VibeAuthSession.currentUser.value = user;
  }

  void _useAccount(VibeDemoUser user) {
    _email.text = user.email;
    _password.text = user.password;
    setState(() {});
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppProfile.background,
    body: SafeArea(child: Center(child: SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 480),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(color: AppProfile.surface, borderRadius: BorderRadius.circular(AppProfile.panelRadius), border: Border.all(color: AppProfile.primary.withOpacity(0.25))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: <Widget>[
          Container(width: 64, height: 64, alignment: Alignment.center, decoration: BoxDecoration(color: AppProfile.primary, borderRadius: BorderRadius.circular(20)), child: const Icon(Icons.admin_panel_settings_rounded, color: Colors.black, size: 34)),
          const SizedBox(height: 22),
          Text('Sign in to ' + AppProfile.appName, style: const TextStyle(color: AppProfile.text, fontSize: 27, fontWeight: FontWeight.w900)),
          const SizedBox(height: 7),
          Text('Role-based access · your dashboard changes with your role.', style: TextStyle(color: AppProfile.text.withOpacity(0.60))),
          const SizedBox(height: 22),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress, autofillHints: const <String>[AutofillHints.email], decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined))),
          const SizedBox(height: 12),
          TextField(controller: _password, obscureText: _obscure, onSubmitted: (_) => _login(), decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline), suffixIcon: IconButton(onPressed: () => setState(() => _obscure = !_obscure), icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined)))),
          const SizedBox(height: 18),
          FilledButton.icon(onPressed: _submitting ? null : _login, icon: _submitting ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.login_rounded), label: Text(_submitting ? 'Signing in…' : 'Sign in')),
          if (AppProfile.allowSignup && VibeAuthSession.allowSignup && VibeAuthSession.signupRoles.isNotEmpty) ...<Widget>[
            const SizedBox(height: 8),
            OutlinedButton.icon(onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const VibeRoleSignupPage())), icon: const Icon(Icons.person_add_alt_1_rounded), label: const Text('Create account')),
          ],
          const SizedBox(height: 20),
          Text('Demo accounts · password: demo123', style: TextStyle(color: AppProfile.text.withOpacity(0.55), fontSize: 12, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          ...VibeAuthSession.users.where((user) => user.isDemo).map((user) => Card(
            color: AppProfile.background.withOpacity(0.65),
            child: ListTile(onTap: () => _useAccount(user), leading: const Icon(Icons.person_outline, color: AppProfile.primary), title: Text(user.role, style: const TextStyle(fontWeight: FontWeight.w800)), subtitle: Text(user.email), trailing: const Icon(Icons.arrow_forward_rounded)),
          )),
          const SizedBox(height: 10),
          Text('Prototype auth: connect a real identity provider for production security. Admin-like roles are intentionally excluded from public signup.', style: TextStyle(color: AppProfile.text.withOpacity(0.45), fontSize: 11, height: 1.4)),
        ]),
      ),
    ))),
  );
}

class VibeRoleSignupPage extends StatefulWidget {
  const VibeRoleSignupPage({super.key});
  @override
  State<VibeRoleSignupPage> createState() => _VibeRoleSignupPageState();
}

class _VibeRoleSignupPageState extends State<VibeRoleSignupPage> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  late String _role;
  bool _obscure = true;

  @override
  void initState() {
    super.initState();
    _role = VibeAuthSession.signupRoles.first;
  }

  @override
  void dispose() { _name.dispose(); _email.dispose(); _password.dispose(); super.dispose(); }

  void _signup() {
    final error = VibeAuthSession.signUp(name: _name.text, email: _email.text, password: _password.text, role: _role);
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
      return;
    }
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppProfile.background,
    appBar: AppBar(title: const Text('Create account'), backgroundColor: AppProfile.background),
    body: SafeArea(child: Center(child: SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 480),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(color: AppProfile.surface, borderRadius: BorderRadius.circular(AppProfile.panelRadius), border: Border.all(color: AppProfile.primary.withOpacity(0.20))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: <Widget>[
          const Text('Join the workspace', style: TextStyle(color: AppProfile.text, fontSize: 26, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          Text('Choose an allowed role. Your dashboard and actions will adapt automatically.', style: TextStyle(color: AppProfile.text.withOpacity(0.58))),
          const SizedBox(height: 20),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.badge_outlined))),
          const SizedBox(height: 12),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined))),
          const SizedBox(height: 12),
          TextField(controller: _password, obscureText: _obscure, decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline), suffixIcon: IconButton(onPressed: () => setState(() => _obscure = !_obscure), icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined)))),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _role,
            decoration: const InputDecoration(labelText: 'Role', prefixIcon: Icon(Icons.shield_outlined)),
            items: VibeAuthSession.signupRoles.map((role) => DropdownMenuItem<String>(value: role, child: Text(role))).toList(),
            onChanged: (value) { if (value != null) setState(() => _role = value); },
          ),
          const SizedBox(height: 20),
          FilledButton.icon(onPressed: _signup, icon: const Icon(Icons.person_add_alt_1_rounded), label: const Text('Create account')),
        ]),
      ),
    ))),
  );
}
`;
}

module.exports = { buildRoleAuthDart, normalizeRoles };
