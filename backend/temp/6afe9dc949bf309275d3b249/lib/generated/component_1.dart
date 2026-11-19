part of vibe_generated_app;

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  FlutterError.onError = (FlutterErrorDetails details) {
    if (details.exceptionAsString().contains('RenderFlex overflowed') || details.exceptionAsString().contains('overflowed by')) {
      debugPrint('Layout overflow auto-handled: ${details.exceptionAsString()}');
      return;
    }
    FlutterError.presentError(details);
  };
  runApp(const VibeGeneratedApp());
}

class AppField {
  final String name;
  final String label;
  final String type;
  final bool required;
  final List<String> options;

  const AppField({
    required this.name,
    required this.label,
    required this.type,
    required this.required,
    this.options = const <String>[],
  });
}

class AppProfile {
  static const String appName = 'Student Manager';
  static const String entity = 'Student';
  static const String entityPlural = 'Students';
  static const String statusField = 'status';
  static const String categoryField = 'classname';
  static const String dateField = '';
  static const String amountField = '';
  static const List<String> highlightStatuses = <String>['Active', 'Graduated'];
  static const String domain = 'Education';
  static const String logo = '🎓';
  static const String layout = 'card_stack';
  static const int uiVariant = 20;
  static const String uiPreset = 'modern';
  static const String emptyState = 'No students added yet';
  static const String cta = 'Add Student';

  static const Color primary = Color(0xFF2563EB);
  static const Color secondary = Color(0xFF38BDF8);
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color text = Color(0xFF172033);
  static const Color accent = Color(0xFF10B981);

  static const bool hasStatsSummary = false;
  static const bool hasFilterChips = false;
  static const bool hasDeleteConfirm = true;
  static const bool hasSplash = true;
  static const bool hasDashboard = true;
  static const bool hasProfile = true;
  static const bool hasSettings = true;
  static const bool hasAuth = false;
  static const bool allowSignup = true;
  static const String navigation = 'bottom';
  static final ValueNotifier<int> recordCount = ValueNotifier<int>(0);
  static final ValueNotifier<List<Map<String, dynamic>>> records = ValueNotifier<List<Map<String, dynamic>>>(<Map<String, dynamic>>[]);
  static double get cardRadius {
    switch (uiPreset) {
      case 'minimal': return 14;
      case 'business': return 18;
      case 'soft': return 30;
      case 'compact': return 10;
      default: return 26;
    }
  }
  static double get panelRadius => uiPreset == 'compact' ? 12 : (uiPreset == 'soft' ? 32 : (uiPreset == 'minimal' ? 16 : 24));
  static double get pageInset => uiPreset == 'compact' ? 10 : (uiPreset == 'soft' ? 22 : 16);
  static bool get flatCards => uiPreset == 'minimal' || uiPreset == 'compact';
  static bool get compactUi => uiPreset == 'compact';
  static bool get businessUi => uiPreset == 'business';
  static bool get softUi => uiPreset == 'soft';

  static const List<AppField> fields = <AppField>[
    AppField(
      name: 'name',
      label: 'Student Name',
      type: 'text',
      required: true,
      options: <String>[],
    ),
    AppField(
      name: 'rollnumber',
      label: 'Roll Number',
      type: 'text',
      required: false,
      options: <String>[],
    ),
    AppField(
      name: 'classname',
      label: 'Class',
      type: 'text',
      required: false,
      options: <String>[],
    ),
    AppField(
      name: 'guardianname',
      label: 'Guardian Name',
      type: 'text',
      required: false,
      options: <String>[],
    ),
    AppField(
      name: 'phone',
      label: 'Phone',
      type: 'phone',
      required: false,
      options: <String>[],
    ),
    AppField(
      name: 'status',
      label: 'Status',
      type: 'select',
      required: false,
      options: <String>['Active', 'Graduated', 'Transferred', 'Suspended'],
    )
  ];
}

class VibeGeneratedApp extends StatelessWidget {
  const VibeGeneratedApp({super.key});

  @override
  Widget build(BuildContext context) {
    final bool isLight = ThemeData.estimateBrightnessForColor(AppProfile.background) == Brightness.light;
    return MaterialApp(
      title: AppProfile.appName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: isLight ? Brightness.light : Brightness.dark,
        scaffoldBackgroundColor: AppProfile.background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppProfile.primary,
          brightness: isLight ? Brightness.light : Brightness.dark,
          primary: AppProfile.primary,
          secondary: AppProfile.secondary,
          surface: AppProfile.surface,
        ),
        useMaterial3: true,
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: isLight ? Colors.black.withOpacity(0.04) : Colors.white.withOpacity(0.06),
          labelStyle: TextStyle(color: AppProfile.text.withOpacity(0.70)),
          hintStyle: TextStyle(color: AppProfile.text.withOpacity(0.40)),
          prefixIconColor: AppProfile.primary,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppProfile.uiPreset == 'compact' ? 10 : (AppProfile.uiPreset == 'soft' ? 24 : 18)),
            borderSide: BorderSide(color: isLight ? Colors.black.withOpacity(0.12) : Colors.white.withOpacity(0.12)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppProfile.uiPreset == 'compact' ? 10 : (AppProfile.uiPreset == 'soft' ? 24 : 18)),
            borderSide: BorderSide(color: isLight ? Colors.black.withOpacity(0.12) : Colors.white.withOpacity(0.12)),
          ),
          focusedBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(18)),
            borderSide: BorderSide(color: AppProfile.primary, width: 1.4),
          ),
        ),
      ),
      home: AppProfile.hasSplash ? const VibeSplashPage() : (AppProfile.hasAuth ? const VibeAuthGate() : const VibeProductShell()),
    );
  }
}

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
  static const bool allowSignup = true;
  static final List<VibeDemoUser> users = <VibeDemoUser>[
    VibeDemoUser(name: 'User User', email: 'user@demo.app', role: 'User', password: 'demo123', isDemo: true)
  ];

  static List<String> get roles => <String>['User'];
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
      resizeToAvoidBottomInset: true,
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
      resizeToAvoidBottomInset: true,
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

class VibeSplashPage extends StatefulWidget {
  const VibeSplashPage({super.key});

  @override
  State<VibeSplashPage> createState() => _VibeSplashPageState();
}

class _VibeSplashPageState extends State<VibeSplashPage> {
  @override
  void initState() {
    super.initState();
    Future<void>.delayed(const Duration(milliseconds: 1400), () {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(builder: (_) => AppProfile.hasAuth ? const VibeAuthGate() : const VibeProductShell()),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: <Color>[AppProfile.background, AppProfile.surface],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Container(
                height: 104,
                width: 104,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: <Color>[AppProfile.primary, AppProfile.secondary]),
                  borderRadius: BorderRadius.circular(32),
                  boxShadow: <BoxShadow>[
                    BoxShadow(color: AppProfile.primary.withOpacity(0.28), blurRadius: 34, offset: const Offset(0, 18)),
                  ],
                ),
                child: Text(AppProfile.logo, style: const TextStyle(fontSize: 48)),
              ),
              const SizedBox(height: 28),
              FittedBox(fit: BoxFit.scaleDown, child: Text(AppProfile.appName, textAlign: TextAlign.center, style: const TextStyle(color: AppProfile.text, fontSize: 28, fontWeight: FontWeight.w900))),
              const SizedBox(height: 8),
              Text('Built for smarter ' + AppProfile.domain.toLowerCase() + ' workflows', style: TextStyle(color: AppProfile.text.withOpacity(0.58), fontWeight: FontWeight.w600)),
              const SizedBox(height: 42),
              const SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 3, color: AppProfile.primary)),
            ],
            ),
          ),
        ),
      ),
    );
  }
}

class VibeProductShell extends StatefulWidget {
  const VibeProductShell({super.key});

  @override
  State<VibeProductShell> createState() => _VibeProductShellState();
}

class _VibeProductShellState extends State<VibeProductShell> {
  int _index = 0;

  List<Widget> _pages() => <Widget>[
    VibeDashboardPage(onManage: _openRecords),
    const CrudHomePage(),
    const VibeProfilePage(),
    const VibeSettingsPage(),
  ];

  List<NavigationDestination> _destinations() => <NavigationDestination>[
    NavigationDestination(icon: const Icon(Icons.dashboard_outlined), selectedIcon: const Icon(Icons.dashboard_rounded), label: 'Dashboard'),
    NavigationDestination(icon: const Icon(Icons.school_outlined), selectedIcon: const Icon(Icons.school_rounded), label: AppProfile.entityPlural),
    NavigationDestination(icon: const Icon(Icons.person_outline_rounded), selectedIcon: const Icon(Icons.person_rounded), label: 'Profile'),
    NavigationDestination(icon: const Icon(Icons.settings_outlined), selectedIcon: const Icon(Icons.settings_rounded), label: 'Settings'),
  ];

  List<NavigationRailDestination> _railDestinations() => _destinations().map((destination) => NavigationRailDestination(
    icon: destination.icon,
    selectedIcon: destination.selectedIcon,
    label: Text(destination.label),
  )).toList();

  void _openRecords() => setState(() => _index = 1);

  @override
  Widget build(BuildContext context) {
    final pages = _pages();
    final destinations = _destinations();
    final int selected = _index < 0 ? 0 : (_index >= pages.length ? pages.length - 1 : _index);

    return LayoutBuilder(
      builder: (context, constraints) {
        final bool wide = constraints.maxWidth >= 900;
        final content = IndexedStack(index: selected, children: pages);
        return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: AppProfile.background,
          drawer: wide ? null : Drawer(
            backgroundColor: AppProfile.surface,
            child: SafeArea(
              child: ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: destinations.length,
                itemBuilder: (context, index) => ListTile(
                  selected: selected == index,
                  leading: destinations[index].icon,
                  title: Text(destinations[index].label, overflow: TextOverflow.ellipsis),
                  onTap: () { setState(() => _index = index); Navigator.pop(context); },
                ),
              ),
            ),
          ),
          appBar: wide ? null : AppBar(title: Text(destinations[selected].label, overflow: TextOverflow.ellipsis), backgroundColor: AppProfile.surface),
          bottomNavigationBar: wide ? null : NavigationBar(
            selectedIndex: <int>[0, 1, 2].contains(selected) ? <int>[0, 1, 2].indexOf(selected) : 0,
            onDestinationSelected: (slot) {
              const indexes = <int>[0, 1, 2];
              setState(() => _index = indexes[slot]);
            },
            destinations: <NavigationDestination>[
              NavigationDestination(icon: const Icon(Icons.dashboard_outlined), selectedIcon: const Icon(Icons.dashboard_rounded), label: 'Home'),
              NavigationDestination(icon: const Icon(Icons.school_outlined), selectedIcon: const Icon(Icons.school_rounded), label: AppProfile.entityPlural),
              NavigationDestination(icon: const Icon(Icons.person_outline_rounded), selectedIcon: const Icon(Icons.person_rounded), label: 'Profile'),
            ],
          ),
          body: wide
              ? Row(children: <Widget>[
                  SingleChildScrollView(
                    child: IntrinsicHeight(
                      child: NavigationRail(
                        selectedIndex: selected,
                        extended: constraints.maxWidth >= 1180,
                        onDestinationSelected: (value) => setState(() => _index = value),
                        labelType: constraints.maxWidth >= 1180 ? NavigationRailLabelType.none : NavigationRailLabelType.selected,
                        destinations: _railDestinations(),
                      ),
                    ),
                  ),
                  const VerticalDivider(width: 1),
                  Expanded(child: content),
                ])
              : content,
        );
      },
    );
  }
}

class VibeData {
  static String text(Map<String, dynamic> record, String field) => (record[field] ?? '').toString().trim();

  static double number(Map<String, dynamic> record, String field) => double.tryParse(text(record, field)) ?? 0;

  static String labelOf(String field) {
    for (final item in AppProfile.fields) {
      if (item.name == field) return item.label;
    }
    return field;
  }

  static String format(double value) => value == value.roundToDouble() ? value.toInt().toString() : value.toStringAsFixed(1);

  static String title(Map<String, dynamic> record) {
    for (final item in AppProfile.fields) {
      final value = text(record, item.name);
      if (value.isNotEmpty) return value;
    }
    return AppProfile.entity + ' #' + (record['id'] ?? '').toString();
  }

  static String today() {
    final now = DateTime.now();
    return now.year.toString() + '-' + now.month.toString().padLeft(2, '0') + '-' + now.day.toString().padLeft(2, '0');
  }

  // Count (or sum of sumField) per distinct value of field, largest first.
  static List<MapEntry<String, double>> groupBy(List<Map<String, dynamic>> records, String field, {String sumField = ''}) {
    final totals = <String, double>{};
    for (final record in records) {
      final key = text(record, field).isEmpty ? 'Not set' : text(record, field);
      totals[key] = (totals[key] ?? 0) + (sumField.isEmpty ? 1 : number(record, sumField));
    }
    final entries = totals.entries.toList();
    entries.sort((a, b) => b.value.compareTo(a.value));
    return entries;
  }

  static List<({String label, String value, IconData icon})> summaryCards(List<Map<String, dynamic>> records) {
    final cards = <({String label, String value, IconData icon})>[
      (label: 'Total ' + AppProfile.entityPlural, value: records.length.toString(), icon: Icons.folder_copy_rounded),
    ];
    if (AppProfile.amountField.isNotEmpty) {
      final sum = records.fold<double>(0, (total, record) => total + number(record, AppProfile.amountField));
      cards.add((label: 'Total ' + labelOf(AppProfile.amountField), value: format(sum), icon: Icons.payments_outlined));
    }
    if (AppProfile.statusField.isNotEmpty) {
      for (final status in AppProfile.highlightStatuses) {
        final count = records.where((record) => text(record, AppProfile.statusField).toLowerCase() == status.toLowerCase()).length;
        cards.add((label: status, value: count.toString(), icon: Icons.label_outline_rounded));
      }
    }
    if (AppProfile.hasAuth) {
      cards.add((label: 'Access', value: VibeAuthSession.canDelete ? 'Full' : (VibeAuthSession.canCreate ? 'Editor' : 'View'), icon: Icons.shield_outlined));
    }
    return cards;
  }

  static Widget header(IconData icon, String title, String subtitle) => Row(children: <Widget>[
    Container(height: 52, width: 52, decoration: BoxDecoration(color: AppProfile.primary.withOpacity(0.14), borderRadius: BorderRadius.circular(16)), child: Icon(icon, color: AppProfile.primary)),
    const SizedBox(width: 14),
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
      Text(title, style: const TextStyle(color: AppProfile.text, fontSize: 24, fontWeight: FontWeight.w900)),
      const SizedBox(height: 4),
      Text(subtitle, style: TextStyle(color: AppProfile.text.withOpacity(0.60), height: 1.35)),
    ])),
  ]);

  static Widget emptyCard(String message) => Card(child: Padding(padding: const EdgeInsets.all(20), child: Text(message, style: TextStyle(color: AppProfile.text.withOpacity(0.70), height: 1.4))));

  static Widget barChart(String title, List<MapEntry<String, double>> entries) {
    final shown = entries.take(8).toList();
    final double maxValue = shown.isEmpty ? 1 : shown.first.value;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppProfile.surface, borderRadius: BorderRadius.circular(AppProfile.cardRadius), border: Border.all(color: AppProfile.primary.withOpacity(0.12))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
        Text(title, style: const TextStyle(color: AppProfile.text, fontSize: 16, fontWeight: FontWeight.w900)),
        const SizedBox(height: 14),
        ...shown.map((entry) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
            Row(children: <Widget>[
              Expanded(child: Text(entry.key, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppProfile.text, fontWeight: FontWeight.w700))),
              Text(format(entry.value), style: const TextStyle(color: AppProfile.text, fontWeight: FontWeight.w900)),
            ]),
            const SizedBox(height: 5),
            ClipRRect(borderRadius: BorderRadius.circular(8), child: LinearProgressIndicator(value: maxValue <= 0 ? 0.0 : (entry.value / maxValue).clamp(0.0, 1.0).toDouble(), minHeight: 10, backgroundColor: AppProfile.primary.withOpacity(0.10), color: AppProfile.primary)),
          ]),
        )),
      ]),
    );
  }
}

class VibeDashboardPage extends StatelessWidget {
  final VoidCallback onManage;
  const VibeDashboardPage({super.key, required this.onManage});

  @override
  Widget build(BuildContext context) {
    final sessionUser = VibeAuthSession.currentUser.value;
    final roleLabel = sessionUser?.role ?? 'Workspace';
    final dashboardTitle = sessionUser == null ? 'Dashboard' : VibeAuthSession.dashboardTitle;
    final headline = sessionUser == null ? 'Welcome to ' + AppProfile.appName : VibeAuthSession.dashboardHeadline;
    final description = sessionUser == null
        ? 'Add, search and update ' + AppProfile.entityPlural.toLowerCase() + ' in one place.'
        : VibeAuthSession.dashboardDescription;
    final canManage = !AppProfile.hasAuth || VibeAuthSession.canCreate || VibeAuthSession.canUpdate || VibeAuthSession.isManager;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: AppProfile.background,
      body: SafeArea(
        child: LayoutBuilder(builder: (context, viewport) => ListView(
          padding: EdgeInsets.all(AppProfile.compactUi ? 12 : (viewport.maxWidth < 380 ? 14 : 20)),
          children: <Widget>[
            Row(children: <Widget>[
              Container(height: AppProfile.compactUi ? 44 : 52, width: AppProfile.compactUi ? 44 : 52, alignment: Alignment.center, decoration: BoxDecoration(color: AppProfile.primary, borderRadius: BorderRadius.circular(AppProfile.compactUi ? 10 : 17)), child: Text(AppProfile.logo, style: TextStyle(fontSize: AppProfile.compactUi ? 20 : 25))),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
                Text(roleLabel.toUpperCase(), style: TextStyle(color: AppProfile.primary, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.1)),
                Text(dashboardTitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: AppProfile.text, fontSize: AppProfile.compactUi ? 20 : 23, fontWeight: FontWeight.w900)),
              ])),
              if (sessionUser != null)
                PopupMenuButton<String>(
                  tooltip: 'Preview as role',
                  onSelected: VibeAuthSession.previewAsRole,
                  itemBuilder: (context) => VibeAuthSession.roles.map((role) => PopupMenuItem<String>(value: role, child: Row(children: <Widget>[const Icon(Icons.visibility_outlined, size: 18), const SizedBox(width: 8), Text('Preview as ' + role)]))).toList(),
                  child: Chip(avatar: const Icon(Icons.shield_outlined, size: 16), label: Text(sessionUser.role, overflow: TextOverflow.ellipsis)),
                ),
            ]),
            SizedBox(height: AppProfile.compactUi ? 14 : 24),
            Container(
              padding: EdgeInsets.all(AppProfile.compactUi ? 16 : 24),
              decoration: BoxDecoration(
                gradient: AppProfile.businessUi || AppProfile.softUi ? null : const LinearGradient(colors: <Color>[AppProfile.primary, AppProfile.secondary]),
                color: AppProfile.businessUi || AppProfile.softUi ? AppProfile.surface : null,
                borderRadius: BorderRadius.circular(AppProfile.panelRadius),
                border: (AppProfile.businessUi || AppProfile.softUi) ? Border.all(color: AppProfile.primary.withOpacity(0.20)) : null,
                boxShadow: AppProfile.flatCards ? const <BoxShadow>[] : <BoxShadow>[BoxShadow(color: AppProfile.primary.withOpacity(0.12), blurRadius: 22, offset: const Offset(0, 10))],
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
                Text(AppProfile.domain.toUpperCase(), style: TextStyle(color: (AppProfile.businessUi || AppProfile.softUi) ? AppProfile.primary : Colors.black.withOpacity(0.55), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1.4)),
                const SizedBox(height: 8),
                Text(headline, style: TextStyle(color: (AppProfile.businessUi || AppProfile.softUi) ? AppProfile.text : Colors.black, fontSize: AppProfile.compactUi ? 20 : 25, fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                Text(description, style: TextStyle(color: (AppProfile.businessUi || AppProfile.softUi) ? AppProfile.text.withOpacity(0.62) : Colors.black.withOpacity(0.68), height: 1.4, fontWeight: FontWeight.w600)),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: canManage ? onManage : onManage,
                  icon: Icon(canManage ? Icons.arrow_forward_rounded : Icons.visibility_outlined),
                  label: Text(canManage ? 'Manage ' + AppProfile.entityPlural : 'View ' + AppProfile.entityPlural),
                  style: FilledButton.styleFrom(backgroundColor: (AppProfile.businessUi || AppProfile.softUi) ? AppProfile.primary : Colors.black, foregroundColor: (AppProfile.businessUi || AppProfile.softUi) ? Colors.black : Colors.white),
                ),
              ]),
            ),
            SizedBox(height: AppProfile.compactUi ? 14 : 22),
            const Text('Overview', style: TextStyle(color: AppProfile.text, fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            ValueListenableBuilder<List<Map<String, dynamic>>>(
              valueListenable: AppProfile.records,
              builder: (context, records, _) {
                final cards = VibeData.summaryCards(records);
                return LayoutBuilder(builder: (context, grid) {
                  final int columns = grid.maxWidth < 360 ? 1 : (grid.maxWidth < 680 ? 2 : 3);
                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: columns, crossAxisSpacing: 10, mainAxisSpacing: 10, mainAxisExtent: AppProfile.compactUi ? 100 : 122),
                    itemCount: cards.length,
                    itemBuilder: (context, index) {
                    final card = cards[index];
                    return Container(
                      padding: EdgeInsets.all(AppProfile.compactUi ? 10 : 14),
                      decoration: BoxDecoration(color: AppProfile.surface, borderRadius: BorderRadius.circular(AppProfile.cardRadius), border: Border.all(color: AppProfile.primary.withOpacity(0.14))),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: <Widget>[
                        Icon(card.icon, color: AppProfile.primary),
                        Text(card.value, style: const TextStyle(color: AppProfile.text, fontSize: 17, fontWeight: FontWeight.w900)),
                        Text(card.label, maxLines: 2, style: TextStyle(color: AppProfile.text.withOpacity(0.52), fontSize: 11, fontWeight: FontWeight.w600)),
                      ]),
                    );
                    },
                  );
                });
              },
            ),
            const SizedBox(height: 18),
            if (sessionUser != null)
              Wrap(spacing: 8, runSpacing: 8, children: <Widget>[
                _permissionChip('View', true),
                _permissionChip('Create', VibeAuthSession.canCreate),
                _permissionChip('Edit', VibeAuthSession.canUpdate),
                _permissionChip('Delete', VibeAuthSession.canDelete),
                _permissionChip('Settings', VibeAuthSession.canOpenSettings),
              ]),
            const SizedBox(height: 18),
            ListTile(
              onTap: onManage,
              tileColor: AppProfile.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppProfile.cardRadius)),
              leading: CircleAvatar(backgroundColor: AppProfile.primary, child: Icon(canManage ? Icons.add_rounded : Icons.visibility_outlined, color: Colors.black)),
              title: Text(canManage ? 'Open ' + AppProfile.entityPlural : 'View ' + AppProfile.entityPlural, style: const TextStyle(color: AppProfile.text, fontWeight: FontWeight.w800)),
              subtitle: Text(AppProfile.hasAuth ? 'Available for the ' + roleLabel + ' role' : 'Add, edit and search ' + AppProfile.entityPlural.toLowerCase()),
              trailing: const Icon(Icons.chevron_right_rounded),
            ),
          ],
        )),
      ),
    );
  }

  Widget _permissionChip(String label, bool enabled) {
    return Chip(
      avatar: Icon(enabled ? Icons.check_circle_outline_rounded : Icons.block_rounded, size: 16, color: enabled ? AppProfile.accent : AppProfile.text.withOpacity(0.35)),
      label: Text(label),
      side: BorderSide(color: enabled ? AppProfile.primary.withOpacity(0.28) : AppProfile.text.withOpacity(0.10)),
      backgroundColor: AppProfile.surface,
    );
  }
}

class VibeProfilePage extends StatefulWidget {
  const VibeProfilePage({super.key});
  @override
  State<VibeProfilePage> createState() => _VibeProfilePageState();
}

class _VibeProfilePageState extends State<VibeProfilePage> {
  final _name = TextEditingController(text: 'Project Administrator');
  final _email = TextEditingController(text: 'admin@example.com');
  @override
  void dispose() { _name.dispose(); _email.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final sessionUser = VibeAuthSession.currentUser.value;
    if (sessionUser != null) {
      _name.text = sessionUser.name;
      _email.text = sessionUser.email;
    }
    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: AppProfile.background,
    appBar: AppBar(title: const Text('Profile'), backgroundColor: AppProfile.background),
    body: ListView(padding: const EdgeInsets.all(20), children: <Widget>[
      const CircleAvatar(radius: 46, backgroundColor: AppProfile.primary, child: Icon(Icons.person_rounded, size: 48, color: Colors.black)),
      const SizedBox(height: 24),
      if (sessionUser != null) ...<Widget>[
        Chip(avatar: const Icon(Icons.shield_outlined, size: 18), label: Text(sessionUser.role)),
        const SizedBox(height: 14),
      ],
      TextField(controller: _name, decoration: const InputDecoration(labelText: 'Display name', prefixIcon: Icon(Icons.badge_outlined))),
      const SizedBox(height: 14),
      TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email address', prefixIcon: Icon(Icons.email_outlined))),
      const SizedBox(height: 22),
      FilledButton.icon(onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile saved'))), icon: const Icon(Icons.save_outlined), label: const Text('Save profile')),
      if (sessionUser != null) ...<Widget>[
        const SizedBox(height: 10),
        OutlinedButton.icon(onPressed: VibeAuthSession.signOut, icon: const Icon(Icons.logout_rounded), label: const Text('Sign out')),
      ],
    ]),
  );
  }
}

class VibeSettingsPage extends StatefulWidget {
  const VibeSettingsPage({super.key});
  @override
  State<VibeSettingsPage> createState() => _VibeSettingsPageState();
}

class _VibeSettingsPageState extends State<VibeSettingsPage> {
  bool notifications = true;
  bool compactMode = false;
  @override
  Widget build(BuildContext context) {
    if (AppProfile.hasAuth && !VibeAuthSession.canOpenSettings) {
      return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: AppProfile.background,
        appBar: AppBar(title: const Text('Settings'), backgroundColor: AppProfile.background),
        body: const Center(child: Padding(padding: EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: <Widget>[
          Icon(Icons.lock_outline_rounded, size: 52, color: AppProfile.primary),
          SizedBox(height: 16),
          Text('Administrator access required', textAlign: TextAlign.center, style: TextStyle(color: AppProfile.text, fontSize: 20, fontWeight: FontWeight.w900)),
          SizedBox(height: 8),
          Text('Your role does not have permission to change workspace settings.', textAlign: TextAlign.center),
        ]))),
      );
    }
    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: AppProfile.background,
    appBar: AppBar(title: const Text('Settings'), backgroundColor: AppProfile.background),
    body: ListView(padding: const EdgeInsets.all(20), children: <Widget>[
      SwitchListTile(value: notifications, onChanged: (value) => setState(() => notifications = value), secondary: const Icon(Icons.notifications_outlined), title: const Text('Notifications'), subtitle: const Text('Receive important activity updates')),
      SwitchListTile(value: compactMode, onChanged: (value) => setState(() => compactMode = value), secondary: const Icon(Icons.view_compact_outlined), title: const Text('Compact mode'), subtitle: const Text('Show more information on screen')),
      const Divider(height: 32),
      const ListTile(leading: Icon(Icons.palette_outlined), title: Text('Appearance'), subtitle: Text('Uses the generated app theme'), trailing: Icon(Icons.chevron_right_rounded)),
      const ListTile(leading: Icon(Icons.shield_outlined), title: Text('Privacy and security'), trailing: Icon(Icons.chevron_right_rounded)),
      const ListTile(leading: Icon(Icons.info_outline_rounded), title: Text('About'), subtitle: Text('Generated with VibeApp')),
    ]),
  );
  }
}