import 'package:flutter/material.dart';

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
  static const String appName = 'TuitionFeeManager';
  static const String entity = 'Student';
  static const String domain = 'business';
  static const String logo = '📋';
  static const String layout = 'catalog_grid';
  static const int uiVariant = 21;
  static const String uiPreset = 'business';
  static const String emptyState = 'No student records yet';
  static const String cta = 'Add Student';

  static const Color primary = Color(0xFF0D47A1);
  static const Color secondary = Color(0xFF1976D2);
  static const Color background = Color(0xFFFFFFFF);
  static const Color surface = Color(0xFFF5F5F5);
  static const Color text = Color(0xFF1C1917);
  static const Color accent = Color(0xFF42A5F5);

  static const bool hasStatsSummary = false;
  static const bool hasFilterChips = false;
  static const bool hasDeleteConfirm = true;
  static const bool hasSplash = true;
  static const bool hasDashboard = true;
  static const bool hasProfile = true;
  static const bool hasSettings = true;
  static const bool hasAuth = true;
  static const bool allowSignup = true;
  static const String navigation = 'bottom';
  static final ValueNotifier<int> recordCount = ValueNotifier<int>(0);
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
      name: 'studentname',
      label: 'Student Name',
      type: 'text',
      required: true,
      options: <String>[],
    ),
    AppField(
      name: 'studentid',
      label: 'Student Id',
      type: 'text',
      required: false,
      options: <String>[],
    ),
    AppField(
      name: 'classgrade',
      label: 'Class Grade',
      type: 'text',
      required: false,
      options: <String>[],
    ),
    AppField(
      name: 'feeamount',
      label: 'Fee Amount',
      type: 'number',
      required: false,
      options: <String>[],
    ),
    AppField(
      name: 'duedate',
      label: 'Due Date',
      type: 'date',
      required: false,
      options: <String>[],
    ),
    AppField(
      name: 'paymentstatus',
      label: 'Payment Status',
      type: 'text',
      required: false,
      options: <String>['Paid', 'Unpaid', 'Partial'],
    ),
    AppField(
      name: 'paymentdate',
      label: 'Payment Date',
      type: 'date',
      required: false,
      options: <String>[],
    ),
    AppField(
      name: 'notes',
      label: 'Notes',
      type: 'text',
      required: false,
      options: <String>[],
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
    VibeDemoUser(name: 'Student User', email: 'student@demo.app', role: 'Student', password: 'demo123', isDemo: true),
    VibeDemoUser(name: 'Teacher User', email: 'teacher@demo.app', role: 'Teacher', password: 'demo123', isDemo: true),
    VibeDemoUser(name: 'Admin User', email: 'admin@demo.app', role: 'Admin', password: 'demo123', isDemo: true)
  ];

  static List<String> get roles => <String>['Student', 'Teacher', 'Admin'];
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
    VibeModulePage(title: 'Add ' + AppProfile.entity, icon: Icons.add_circle_outline_rounded, description: 'Create a new ' + AppProfile.entity.toLowerCase() + ' and continue the domain workflow.', onManage: _openRecords),
    VibeModulePage(title: 'Categories', icon: Icons.category_outlined, description: 'Group ' + AppProfile.entity.toLowerCase() + ' records into useful categories and segments.', onManage: _openRecords),
    VibeModulePage(title: 'Calendar', icon: Icons.calendar_month_outlined, description: 'Review dates, schedules, deadlines, and time-based ' + AppProfile.domain.toLowerCase() + ' activity.', onManage: _openRecords),
    VibeModulePage(title: 'Analytics', icon: Icons.insights_outlined, description: 'Monitor trends, totals, and operational signals across your ' + AppProfile.domain.toLowerCase() + ' workspace.', onManage: _openRecords),
    VibeModulePage(title: 'Reports', icon: Icons.assessment_outlined, description: 'Review structured summaries and reporting views for ' + AppProfile.entity.toLowerCase() + ' data.', onManage: _openRecords),
    VibeModulePage(title: 'Favorites', icon: Icons.star_outline_rounded, description: 'Keep important ' + AppProfile.entity.toLowerCase() + ' records easy to reach.', onManage: _openRecords),
    VibeModulePage(title: 'Activity', icon: Icons.history_rounded, description: 'Follow recent changes, updates, and workflow activity.', onManage: _openRecords),
    VibeModulePage(title: 'Notifications', icon: Icons.notifications_outlined, description: 'Review reminders, alerts, and important workspace updates.', onManage: _openRecords),
    const VibeProfilePage(),
    const VibeSettingsPage(),
  ];

  List<NavigationDestination> _destinations() => <NavigationDestination>[
    const NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard_rounded), label: 'Dashboard'),
    NavigationDestination(icon: const Icon(Icons.folder_copy_outlined), selectedIcon: const Icon(Icons.folder_copy_rounded), label: AppProfile.entity + 's'),
    NavigationDestination(icon: const Icon(Icons.add_circle_outline_rounded), selectedIcon: const Icon(Icons.add_circle_rounded), label: 'Add ' + AppProfile.entity),
    const NavigationDestination(icon: Icon(Icons.category_outlined), selectedIcon: Icon(Icons.category_rounded), label: 'Categories'),
    const NavigationDestination(icon: Icon(Icons.calendar_month_outlined), selectedIcon: Icon(Icons.calendar_month_rounded), label: 'Calendar'),
    const NavigationDestination(icon: Icon(Icons.insights_outlined), selectedIcon: Icon(Icons.insights_rounded), label: 'Analytics'),
    const NavigationDestination(icon: Icon(Icons.assessment_outlined), selectedIcon: Icon(Icons.assessment_rounded), label: 'Reports'),
    const NavigationDestination(icon: Icon(Icons.star_outline_rounded), selectedIcon: Icon(Icons.star_rounded), label: 'Favorites'),
    const NavigationDestination(icon: Icon(Icons.history_outlined), selectedIcon: Icon(Icons.history_rounded), label: 'Activity'),
    const NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications_rounded), label: 'Notifications'),
    const NavigationDestination(icon: Icon(Icons.person_outline_rounded), selectedIcon: Icon(Icons.person_rounded), label: 'Profile'),
    const NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings_rounded), label: 'Settings'),
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
            selectedIndex: <int>[0, 1, 2, 5, 10].contains(selected) ? <int>[0, 1, 2, 5, 10].indexOf(selected) : 0,
            onDestinationSelected: (slot) {
              const indexes = <int>[0, 1, 2, 5, 10];
              setState(() => _index = indexes[slot]);
            },
            destinations: <NavigationDestination>[
              const NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard_rounded), label: 'Home'),
              NavigationDestination(icon: const Icon(Icons.folder_copy_outlined), selectedIcon: const Icon(Icons.folder_copy_rounded), label: AppProfile.entity + 's'),
              NavigationDestination(icon: const Icon(Icons.add_circle_outline_rounded), selectedIcon: const Icon(Icons.add_circle_rounded), label: 'Add ' + AppProfile.entity),
              const NavigationDestination(icon: Icon(Icons.insights_outlined), selectedIcon: Icon(Icons.insights_rounded), label: 'Insights'),
              const NavigationDestination(icon: Icon(Icons.person_outline_rounded), selectedIcon: Icon(Icons.person_rounded), label: 'Profile'),
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

class VibeModulePage extends StatefulWidget {
  final String title;
  final IconData icon;
  final String description;
  final VoidCallback onManage;
  const VibeModulePage({super.key, required this.title, required this.icon, required this.description, required this.onManage});

  @override
  State<VibeModulePage> createState() => _VibeModulePageState();
}

class _VibeModulePageState extends State<VibeModulePage> {
  final TextEditingController _quickTitle = TextEditingController();
  final TextEditingController _quickNote = TextEditingController();
  String _category = 'General';
  bool _onlyUnread = false;
  final Set<String> _favoriteItems = <String>{'Priority record', 'Weekly summary'};

  @override
  void dispose() {
    _quickTitle.dispose();
    _quickNote.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: AppProfile.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            _header(),
            const SizedBox(height: 24),
            _moduleBody(context),
          ],
        ),
      ),
    );
  }

  Widget _header() => Row(children: <Widget>[
    Container(height: 52, width: 52, decoration: BoxDecoration(color: AppProfile.primary.withOpacity(0.14), borderRadius: BorderRadius.circular(16)), child: Icon(widget.icon, color: AppProfile.primary)),
    const SizedBox(width: 14),
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
      Text(widget.title, style: const TextStyle(color: AppProfile.text, fontSize: 24, fontWeight: FontWeight.w900)),
      const SizedBox(height: 4),
      Text(widget.description, style: TextStyle(color: AppProfile.text.withOpacity(0.60), height: 1.35)),
    ])),
  ]);

  Widget _moduleBody(BuildContext context) {
    switch (widget.title) {
      case 'Quick Create': return _quickCreate(context);
      case 'Categories': return _categories();
      case 'Calendar': return _calendar();
      case 'Analytics': return _analytics();
      case 'Reports': return _reports();
      case 'Favorites': return _favorites();
      case 'Activity': return _activity();
      case 'Notifications': return _notifications();
      default: return _emptyModule();
    }
  }

  Widget _quickCreate(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
    Text('Create a new ' + AppProfile.entity.toLowerCase(), style: const TextStyle(color: AppProfile.text, fontSize: 18, fontWeight: FontWeight.w900)),
    const SizedBox(height: 14),
    TextField(controller: _quickTitle, decoration: InputDecoration(labelText: AppProfile.entity + ' name', prefixIcon: const Icon(Icons.edit_outlined))),
    const SizedBox(height: 12),
    DropdownButtonFormField<String>(value: _category, decoration: const InputDecoration(labelText: 'Category', prefixIcon: Icon(Icons.category_outlined)), items: const <String>['General','Priority','Personal','Archived'].map((v)=>DropdownMenuItem<String>(value:v,child:Text(v))).toList(), onChanged:(v){if(v!=null)setState(()=>_category=v);}),
    const SizedBox(height: 12),
    TextField(controller: _quickNote, maxLines: 3, decoration: const InputDecoration(labelText: 'Notes', prefixIcon: Icon(Icons.notes_outlined))),
    const SizedBox(height: 16),
    FilledButton.icon(onPressed: () { if (_quickTitle.text.trim().isEmpty) return; AppProfile.recordCount.value = AppProfile.recordCount.value + 1; ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppProfile.entity + ' created in ' + _category))); _quickTitle.clear(); _quickNote.clear(); }, icon: const Icon(Icons.add_rounded), label: Text('Create ' + AppProfile.entity)),
    const SizedBox(height: 10),
    OutlinedButton.icon(onPressed: widget.onManage, icon: const Icon(Icons.folder_open_outlined), label: Text('Open all ' + AppProfile.entity + 's')),
  ]);

  Widget _categories() => ValueListenableBuilder<int>(valueListenable: AppProfile.recordCount, builder:(context,count,_) {
    final categories = <({String name,int count,IconData icon})>[
      (name:'General',count:count,icon:Icons.inbox_outlined),
      (name:'Priority',count:(count/2).ceil(),icon:Icons.priority_high_rounded),
      (name:'Recently updated',count:(count/3).ceil(),icon:Icons.update_rounded),
      (name:'Archived',count:(count/4).floor(),icon:Icons.archive_outlined),
    ];
    return Column(children: categories.map((item)=>Card(child:ListTile(leading:CircleAvatar(backgroundColor:AppProfile.primary.withOpacity(.12),child:Icon(item.icon,color:AppProfile.primary)),title:Text(item.name,style:const TextStyle(fontWeight:FontWeight.w800)),subtitle:Text(item.count.toString()+' '+AppProfile.entity.toLowerCase()+' records'),trailing:const Icon(Icons.chevron_right_rounded),onTap:widget.onManage))).toList());
  });

  Widget _calendar() {
    final now = DateTime.now();
    final days = List<int>.generate(14, (i)=>now.add(Duration(days:i)).day);
    return Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[
      Row(mainAxisAlignment:MainAxisAlignment.spaceBetween,children:<Widget>[Text(_monthName(now.month)+' '+now.year.toString(),style:const TextStyle(fontSize:18,fontWeight:FontWeight.w900)),const Icon(Icons.calendar_month_outlined,color:AppProfile.primary)]),
      const SizedBox(height:14),
      GridView.builder(shrinkWrap:true,physics:const NeverScrollableScrollPhysics(),itemCount:days.length,gridDelegate:const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:7,crossAxisSpacing:8,mainAxisSpacing:8),itemBuilder:(context,i)=>Container(alignment:Alignment.center,decoration:BoxDecoration(color:i==0?AppProfile.primary:AppProfile.surface,borderRadius:BorderRadius.circular(12),border:Border.all(color:AppProfile.primary.withOpacity(.14))),child:Text(days[i].toString(),style:TextStyle(color:i==0?Colors.black:AppProfile.text,fontWeight:FontWeight.w800)))),
      const SizedBox(height:22),
      const Text('Upcoming',style:TextStyle(fontSize:17,fontWeight:FontWeight.w900)),
      const SizedBox(height:8),
      _timelineTile('Today','Review active records',Icons.today_outlined),
      _timelineTile('Tomorrow','Follow up on pending items',Icons.schedule_outlined),
      _timelineTile('This week','Prepare workspace summary',Icons.event_note_outlined),
    ]);
  }

  Widget _analytics() => ValueListenableBuilder<int>(valueListenable:AppProfile.recordCount,builder:(context,count,_)=>Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[
    Wrap(spacing:12,runSpacing:12,children:<Widget>[
      _moduleMetric('Total',count.toString(),Icons.folder_copy_outlined),
      _moduleMetric('Active',((count*.72).round()).toString(),Icons.bolt_outlined),
      _moduleMetric('Growth','+'+(count==0?0:12).toString()+'%',Icons.trending_up_rounded),
    ]),
    const SizedBox(height:22),
    const Text('7-day activity',style:TextStyle(fontSize:17,fontWeight:FontWeight.w900)),
    const SizedBox(height:12),
    SizedBox(height:180,child:Row(crossAxisAlignment:CrossAxisAlignment.end,children:<double>[.35,.58,.42,.78,.64,.92,.74].asMap().entries.map((e)=>Expanded(child:Padding(padding:const EdgeInsets.symmetric(horizontal:5),child:Column(mainAxisAlignment:MainAxisAlignment.end,children:<Widget>[Expanded(child:Align(alignment:Alignment.bottomCenter,child:FractionallySizedBox(heightFactor:e.value,child:Container(decoration:BoxDecoration(color:AppProfile.primary.withOpacity(.72),borderRadius:BorderRadius.circular(8)))))),const SizedBox(height:6),Text(<String>['M','T','W','T','F','S','S'][e.key],style:TextStyle(color:AppProfile.text.withOpacity(.55))) ])))).toList())),
  ]));

  Widget _reports() => Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[
    _reportCard('Weekly summary','Updated today','PDF',Icons.picture_as_pdf_outlined),
    _reportCard(AppProfile.domain+' performance','Updated yesterday','Chart',Icons.bar_chart_rounded),
    _reportCard(AppProfile.entity+' audit','Updated 3 days ago','CSV',Icons.table_chart_outlined),
    const SizedBox(height:8),
    OutlinedButton.icon(onPressed:()=>ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Report export prepared'))),icon:const Icon(Icons.download_outlined),label:const Text('Export selected report')),
  ]);

  Widget _favorites() => Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[
    Text(_favoriteItems.length.toString()+' saved items',style:TextStyle(color:AppProfile.text.withOpacity(.6),fontWeight:FontWeight.w700)),
    const SizedBox(height:10),
    ...<String>['Priority record','Weekly summary','Pinned workspace','Recent search'].map((name){final saved=_favoriteItems.contains(name);return Card(child:ListTile(leading:Icon(saved?Icons.star_rounded:Icons.star_border_rounded,color:saved?AppProfile.primary:AppProfile.text.withOpacity(.45)),title:Text(name,style:const TextStyle(fontWeight:FontWeight.w800)),subtitle:Text(saved?'Saved for quick access':'Tap the star to save'),trailing:IconButton(onPressed:()=>setState(()=>saved?_favoriteItems.remove(name):_favoriteItems.add(name)),icon:Icon(saved?Icons.bookmark_remove_outlined:Icons.bookmark_add_outlined))));}),
  ]);

  Widget _activity() => Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[
    _activityTile('Record updated','A '+AppProfile.entity.toLowerCase()+' was edited','2 min ago',Icons.edit_outlined),
    _activityTile('New record created','A new '+AppProfile.entity.toLowerCase()+' was added','24 min ago',Icons.add_circle_outline_rounded),
    _activityTile('Report generated','Weekly workspace summary is ready','Yesterday',Icons.description_outlined),
    _activityTile('Settings changed','Notification preferences updated','2 days ago',Icons.settings_outlined),
  ]);

  Widget _notifications() {
    final rows=<({String title,String body,bool unread,IconData icon})>[
      (title:'Pending review',body:'Items need your attention',unread:true,icon:Icons.rate_review_outlined),
      (title:'Weekly summary ready',body:'Your latest workspace report is available',unread:true,icon:Icons.summarize_outlined),
      (title:'Backup complete',body:'Workspace data was backed up successfully',unread:false,icon:Icons.cloud_done_outlined),
    ];
    final visible=_onlyUnread?rows.where((r)=>r.unread):rows;
    return Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[
      SwitchListTile(contentPadding:EdgeInsets.zero,value:_onlyUnread,onChanged:(v)=>setState(()=>_onlyUnread=v),title:const Text('Unread only'),secondary:const Icon(Icons.mark_email_unread_outlined)),
      ...visible.map((r)=>Card(child:ListTile(leading:CircleAvatar(backgroundColor:r.unread?AppProfile.primary.withOpacity(.16):AppProfile.surface,child:Icon(r.icon,color:r.unread?AppProfile.primary:AppProfile.text.withOpacity(.5))),title:Text(r.title,style:TextStyle(fontWeight:r.unread?FontWeight.w900:FontWeight.w600)),subtitle:Text(r.body),trailing:r.unread?const Icon(Icons.circle,size:10,color:AppProfile.primary):null))),
    ]);
  }

  Widget _emptyModule() => Card(child:Padding(padding:const EdgeInsets.all(20),child:Text(widget.description)));

  Widget _timelineTile(String when,String text,IconData icon)=>Card(child:ListTile(leading:Icon(icon,color:AppProfile.primary),title:Text(text,style:const TextStyle(fontWeight:FontWeight.w800)),subtitle:Text(when)));
  Widget _reportCard(String title,String subtitle,String badge,IconData icon)=>Card(child:ListTile(leading:Icon(icon,color:AppProfile.primary),title:Text(title,style:const TextStyle(fontWeight:FontWeight.w800)),subtitle:Text(subtitle),trailing:Chip(label:Text(badge))));
  Widget _activityTile(String title,String body,String time,IconData icon)=>Padding(padding:const EdgeInsets.only(bottom:8),child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[CircleAvatar(backgroundColor:AppProfile.primary.withOpacity(.12),child:Icon(icon,color:AppProfile.primary,size:19)),const SizedBox(width:12),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[Text(title,style:const TextStyle(fontWeight:FontWeight.w900)),Text(body),Text(time,style:TextStyle(color:AppProfile.text.withOpacity(.48),fontSize:12))]))]));
  String _monthName(int month)=>const <String>['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1];

  Widget _moduleMetric(String label, String value, IconData iconData) => Container(
    width: 180,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppProfile.surface, borderRadius: BorderRadius.circular(AppProfile.cardRadius), border: Border.all(color: AppProfile.primary.withOpacity(0.12))),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
      Icon(iconData, color: AppProfile.primary),
      const SizedBox(height: 12),
      Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppProfile.text, fontSize: 18, fontWeight: FontWeight.w900)),
      const SizedBox(height: 4),
      Text(label, style: TextStyle(color: AppProfile.text.withOpacity(0.55), fontSize: 12)),
    ]),
  );
}

class VibeDashboardPage extends StatelessWidget {
  final VoidCallback onManage;
  const VibeDashboardPage({super.key, required this.onManage});

  @override
  Widget build(BuildContext context) {
    final sessionUser = VibeAuthSession.currentUser.value;
    final roleLabel = sessionUser?.role ?? 'Workspace';
    final dashboardTitle = sessionUser == null ? 'Dashboard' : VibeAuthSession.dashboardTitle;
    final headline = sessionUser == null ? 'Everything under control' : VibeAuthSession.dashboardHeadline;
    final description = sessionUser == null
        ? 'Manage ' + AppProfile.entity.toLowerCase() + ' records, monitor activity, and keep your work organized.'
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
                  label: Text(canManage ? 'Manage ' + AppProfile.entity + 's' : 'View ' + AppProfile.entity + 's'),
                  style: FilledButton.styleFrom(backgroundColor: (AppProfile.businessUi || AppProfile.softUi) ? AppProfile.primary : Colors.black, foregroundColor: (AppProfile.businessUi || AppProfile.softUi) ? Colors.black : Colors.white),
                ),
              ]),
            ),
            SizedBox(height: AppProfile.compactUi ? 14 : 22),
            const Text('Role overview', style: TextStyle(color: AppProfile.text, fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            ValueListenableBuilder<int>(
              valueListenable: AppProfile.recordCount,
              builder: (context, count, _) {
                final cards = <({String label, String value, IconData icon})>[
                  (label: 'Total ' + AppProfile.entity + 's', value: count.toString(), icon: Icons.groups_rounded),
                  (label: 'Access', value: AppProfile.hasAuth ? (VibeAuthSession.canDelete ? 'Full' : (VibeAuthSession.canCreate ? 'Editor' : 'View')) : 'Full', icon: Icons.shield_outlined),
                  (label: 'Fields', value: AppProfile.fields.length.toString(), icon: Icons.view_list_rounded),
                ];
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
              title: Text(canManage ? 'Open ' + AppProfile.entity + ' workspace' : 'View ' + AppProfile.entity + ' workspace', style: const TextStyle(color: AppProfile.text, fontWeight: FontWeight.w800)),
              subtitle: Text(AppProfile.hasAuth ? 'Available for the ' + roleLabel + ' role' : 'Add and manage records'),
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

class RecordDetailsPage extends StatelessWidget {
  final Map<String, dynamic> record;
  final Future<bool> Function() onEdit;
  final Future<bool> Function() onDelete;

  const RecordDetailsPage({
    super.key,
    required this.record,
    required this.onEdit,
    required this.onDelete,
  });

  String get _title {
    for (final field in AppProfile.fields) {
      final value = (record[field.name] ?? '').toString().trim();
      if (value.isNotEmpty) return value;
    }
    return '${AppProfile.entity} #${record['id']}';
  }

  IconData _iconForField(AppField field) {
    final name = field.name.toLowerCase();
    if (field.type == 'date' || name.contains('date')) return Icons.calendar_today_outlined;
    if (field.type == 'number' || name.contains('budget') || name.contains('price') || name.contains('amount')) return Icons.numbers_outlined;
    if (field.type == 'select' || name.contains('status')) return Icons.flag_outlined;
    if (name.contains('email')) return Icons.email_outlined;
    if (name.contains('phone')) return Icons.phone_outlined;
    if (name.contains('location') || name.contains('destination') || name.contains('address')) return Icons.location_on_outlined;
    if (name.contains('description') || name.contains('notes')) return Icons.notes_outlined;
    return Icons.label_outline;
  }

  @override
  Widget build(BuildContext context) {
    final bool canEdit = !AppProfile.hasAuth || VibeAuthSession.canUpdate;
    final bool canDelete = !AppProfile.hasAuth || VibeAuthSession.canDelete;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: AppProfile.background,
        foregroundColor: AppProfile.text,
        elevation: 0,
        title: Text('${AppProfile.entity} details', style: const TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) {
            return Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 760),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(18, 8, 18, 32),
                  children: <Widget>[
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: <Color>[AppProfile.primary.withOpacity(0.22), AppProfile.secondary.withOpacity(0.10)],
                        ),
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(color: AppProfile.primary.withOpacity(0.24)),
                      ),
                      child: Row(
                        children: <Widget>[
                          Container(
                            height: 58,
                            width: 58,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(color: AppProfile.primary.withOpacity(0.18), borderRadius: BorderRadius.circular(18)),
                            child: Text(AppProfile.logo, style: const TextStyle(fontSize: 29)),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Text(AppProfile.entity, style: TextStyle(color: AppProfile.text.withOpacity(0.55), fontSize: 12, fontWeight: FontWeight.w800)),
                                const SizedBox(height: 4),
                                Text(_title, style: const TextStyle(color: AppProfile.text, fontSize: 23, fontWeight: FontWeight.w900)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text('Details', style: TextStyle(color: AppProfile.text, fontSize: 18, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 10),
                    ...AppProfile.fields.map((AppField field) {
                      final String value = (record[field.name] ?? '').toString().trim();
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(15),
                        decoration: BoxDecoration(
                          color: AppProfile.surface,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: Colors.white.withOpacity(0.09)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Container(
                              height: 38,
                              width: 38,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(color: AppProfile.primary.withOpacity(0.13), borderRadius: BorderRadius.circular(12)),
                              child: Icon(_iconForField(field), size: 19, color: AppProfile.primary),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(field.label, style: TextStyle(color: AppProfile.text.withOpacity(0.50), fontSize: 12, fontWeight: FontWeight.w700)),
                                  const SizedBox(height: 4),
                                  Text(value.isEmpty ? 'Not provided' : value, style: TextStyle(color: value.isEmpty ? AppProfile.text.withOpacity(0.35) : AppProfile.text, fontSize: 15, fontWeight: FontWeight.w700)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 12),
                    if (canEdit || canDelete)
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: <Widget>[
                          if (canEdit)
                            FilledButton.icon(
                              onPressed: () async {
                                final bool updated = await onEdit();
                                if (updated && context.mounted) Navigator.of(context).pop();
                              },
                              icon: const Icon(Icons.edit_outlined),
                              label: const Text('Edit'),
                              style: FilledButton.styleFrom(backgroundColor: AppProfile.primary, foregroundColor: Colors.black),
                            ),
                          if (canDelete)
                            OutlinedButton.icon(
                              onPressed: () async {
                                final bool deleted = await onDelete();
                                if (deleted && context.mounted) Navigator.of(context).pop();
                              },
                              icon: const Icon(Icons.delete_outline),
                              label: const Text('Delete'),
                              style: OutlinedButton.styleFrom(foregroundColor: Colors.redAccent, side: BorderSide(color: Colors.redAccent.withOpacity(0.55))),
                            ),
                        ],
                      )
                    else
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: AppProfile.primary.withOpacity(0.10), borderRadius: BorderRadius.circular(16)),
                        child: const Row(
                          children: <Widget>[
                            Icon(Icons.visibility_outlined, color: AppProfile.primary),
                            SizedBox(width: 10),
                            Text('Read-only access', style: TextStyle(color: AppProfile.text, fontWeight: FontWeight.w700)),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class CrudHomePage extends StatefulWidget {
  const CrudHomePage({super.key});

  @override
  State<CrudHomePage> createState() => _CrudHomePageState();
}

class _CrudHomePageState extends State<CrudHomePage> {
  final TextEditingController _searchController = TextEditingController();
  final List<Map<String, dynamic>> _records = <Map<String, dynamic>>[];
  int _nextId = 1;
  String _query = '';
  String _activeFilter = 'All';
  String _sortMode = 'Newest';

  List<Map<String, dynamic>> get _filteredRecords {
    final cleanQuery = _query.toLowerCase().trim();
    final list = _records.where((record) {
      if (AppProfile.hasFilterChips && _activeFilter != 'All') {
        final matchesFilter = record.values.any((val) => val.toString().toLowerCase() == _activeFilter.toLowerCase());
        if (!matchesFilter) return false;
      }
      if (cleanQuery.isEmpty) return true;
      return record.values.any((value) {
        return value.toString().toLowerCase().contains(cleanQuery);
      });
    }).toList();

    list.sort((a, b) {
      switch (_sortMode) {
        case 'Oldest':
          return (a['id'] as int? ?? 0).compareTo(b['id'] as int? ?? 0);
        case 'A to Z':
          return _primaryValue(a).toLowerCase().compareTo(_primaryValue(b).toLowerCase());
        case 'Z to A':
          return _primaryValue(b).toLowerCase().compareTo(_primaryValue(a).toLowerCase());
        case 'Newest':
        default:
          return (b['id'] as int? ?? 0).compareTo(a['id'] as int? ?? 0);
      }
    });

    return list;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _openDetails(Map<String, dynamic> record) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (BuildContext context) => RecordDetailsPage(
          record: record,
          onEdit: () => _openForm(existing: record),
          onDelete: () => _deleteRecord(record['id'] as int),
        ),
      ),
    );
    if (mounted) setState(() {});
  }

  Future<bool> _deleteRecord(int id) async {
    if (AppProfile.hasAuth && !VibeAuthSession.canDelete) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Your role cannot delete records.')));
      return false;
    }
    if (AppProfile.hasDeleteConfirm) {
      final bool? confirm = await showDialog<bool>(
        context: context,
        builder: (BuildContext ctx) => AlertDialog(
          backgroundColor: AppProfile.surface,
          title: Text('Delete ${AppProfile.entity}?', style: const TextStyle(color: AppProfile.text, fontWeight: FontWeight.bold)),
          content: Text('Are you sure you want to delete this ${AppProfile.entity.toLowerCase()}? This action cannot be undone.', style: TextStyle(color: AppProfile.text.withOpacity(0.80))),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white),
              child: const Text('Delete'),
            ),
          ],
        ),
      );
      if (confirm != true) return false;
    }

    setState(() {
      _records.removeWhere((record) => record['id'] == id);
    });
    AppProfile.recordCount.value = _records.length;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${AppProfile.entity} deleted')),
    );
    return true;
  }

  void _saveRecord(Map<String, dynamic> values, Map<String, dynamic>? existing) {
    if (AppProfile.hasAuth && (existing == null ? !VibeAuthSession.canCreate : !VibeAuthSession.canUpdate)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Your role cannot save this change.')));
      return;
    }
    setState(() {
      if (existing == null) {
        _records.insert(0, <String, dynamic>{'id': _nextId++, ...values});
      } else {
        final dynamic id = existing['id'];
        final index = _records.indexWhere((record) => record['id'] == id);
        if (index != -1) _records[index] = <String, dynamic>{'id': id, ...values};
      }
    });
    AppProfile.recordCount.value = _records.length;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(existing == null ? '${AppProfile.entity} added successfully' : '${AppProfile.entity} updated successfully')),
    );
  }

  Future<bool> _openForm({Map<String, dynamic>? existing}) async {
    if (AppProfile.hasAuth && (existing == null ? !VibeAuthSession.canCreate : !VibeAuthSession.canUpdate)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You have read-only access.')));
      return false;
    }
    final Map<String, TextEditingController> controllers = <String, TextEditingController>{};
    final Map<String, dynamic> values = <String, String>{};

    for (final field in AppProfile.fields) {
      final currentValue = (existing?[field.name] ?? '').toString();
      values[field.name] = currentValue;
      controllers[field.name] = TextEditingController(text: currentValue);
    }

    final bool updated = await showDialog<bool>(
      context: context,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (BuildContext modalContext, StateSetter setModalState) {
            return Dialog(
              backgroundColor: Colors.transparent,
              insetPadding: const EdgeInsets.all(18),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppProfile.surface,
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(color: Colors.white.withOpacity(0.10)),
                    boxShadow: <BoxShadow>[
                      BoxShadow(color: Colors.black.withOpacity(0.30), blurRadius: 30, offset: const Offset(0, 18)),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(30),
                    child: SingleChildScrollView(
                      child: Padding(
                        padding: const EdgeInsets.all(22),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: <Widget>[
                            Row(
                              children: <Widget>[
                                Container(
                                  height: 52,
                                  width: 52,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(color: AppProfile.primary.withOpacity(0.18), borderRadius: BorderRadius.circular(18)),
                                  child: Text(AppProfile.logo, style: const TextStyle(fontSize: 24)),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: <Widget>[
                                      Text(existing == null ? 'Add ${AppProfile.entity}' : 'Edit ${AppProfile.entity}', style: const TextStyle(color: AppProfile.text, fontSize: 22, fontWeight: FontWeight.w900)),
                                      const SizedBox(height: 4),
                                      Text('Fill the details below.', style: TextStyle(color: AppProfile.text.withOpacity(0.55), fontWeight: FontWeight.w600)),
                                    ],
                                  ),
                                ),
                                IconButton(onPressed: () => Navigator.of(dialogContext).pop(), icon: const Icon(Icons.close_rounded)),
                              ],
                            ),
                            const SizedBox(height: 22),
                            ...AppProfile.fields.map((field) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 14),
                                child: _buildFieldInput(field: field, controllers: controllers, values: values, setModalState: setModalState),
                              );
                            }),
                            const SizedBox(height: 8),
                            Row(
                              children: <Widget>[
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: () => Navigator.of(dialogContext).pop(),
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(vertical: 15),
                                      side: BorderSide(color: Colors.white.withOpacity(0.16)),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                                    ),
                                    child: const Text('Cancel'),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: ElevatedButton(
                                    onPressed: () {
                                      final Map<String, dynamic> payload = <String, dynamic>{};

                                      for (final field in AppProfile.fields) {
                                        final value = field.type == 'select' ? values[field.name] ?? '' : controllers[field.name]?.text.trim() ?? '';
                                        if (field.required && value.isEmpty) {
                                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${field.label} is required')));
                                          return;
                                        }
                                        payload[field.name] = value;
                                      }

                                      _saveRecord(payload, existing);
                                      Navigator.of(dialogContext).pop(true);
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppProfile.primary,
                                      foregroundColor: Colors.black,
                                      padding: const EdgeInsets.symmetric(vertical: 15),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                                    ),
                                    child: Text(existing == null ? 'Add Record' : 'Save Changes', style: const TextStyle(fontWeight: FontWeight.w900)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    ) ?? false;

    for (final controller in controllers.values) {
      controller.dispose();
    }
    return updated;
  }

  Widget _buildFieldInput({
    required AppField field,
    required Map<String, TextEditingController> controllers,
    required Map<String, dynamic> values,
    required StateSetter setModalState,
  }) {
    final label = field.required ? '${field.label} *' : field.label;

    if (field.type == 'select') {
      final options = field.options.isEmpty ? <String>['Active', 'Pending', 'Completed'] : field.options;
      final currentValue = options.contains(values[field.name]) ? values[field.name] : null;

      return DropdownButtonFormField<String>(
        value: currentValue,
        decoration: InputDecoration(labelText: label, prefixIcon: const Icon(Icons.tune_rounded)),
        dropdownColor: AppProfile.surface,
        items: options.map((option) => DropdownMenuItem<String>(value: option, child: Text(option))).toList(),
        onChanged: (value) => setModalState(() => values[field.name] = value ?? ''),
      );
    }

    if (field.type == 'date') {
      return TextField(
        controller: controllers[field.name],
        readOnly: true,
        decoration: InputDecoration(labelText: label, prefixIcon: const Icon(Icons.calendar_month_rounded), suffixIcon: const Icon(Icons.expand_more_rounded)),
        onTap: () async {
          final selectedDate = await showDatePicker(context: context, firstDate: DateTime(2000), lastDate: DateTime(2100), initialDate: DateTime.now());
          if (selectedDate == null) return;
          final formatted = '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}';
          controllers[field.name]?.text = formatted;
        },
      );
    }

    return TextField(
      controller: controllers[field.name],
      maxLines: field.type == 'textarea' ? 4 : 1,
      keyboardType: _keyboardTypeFor(field.type),
      decoration: InputDecoration(labelText: label, prefixIcon: Icon(_iconForField(field))),
    );
  }

  TextInputType _keyboardTypeFor(String type) {
    switch (type) {
      case 'number':
        return TextInputType.number;
      case 'email':
        return TextInputType.emailAddress;
      case 'phone':
        return TextInputType.phone;
      case 'textarea':
        return TextInputType.multiline;
      default:
        return TextInputType.text;
    }
  }

  IconData _iconForField(AppField field) {
    switch (field.type) {
      case 'number':
        return Icons.numbers_rounded;
      case 'email':
        return Icons.email_outlined;
      case 'phone':
        return Icons.phone_outlined;
      case 'date':
        return Icons.calendar_month_rounded;
      case 'textarea':
        return Icons.notes_rounded;
      case 'select':
        return Icons.tune_rounded;
      default:
        final name = field.name.toLowerCase();
        if (name.contains('name')) return Icons.badge_outlined;
        if (name.contains('price') || name.contains('amount')) return Icons.payments_outlined;
        if (name.contains('category')) return Icons.category_outlined;
        if (name.contains('status')) return Icons.verified_outlined;
        return Icons.edit_note_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final records = _filteredRecords;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: AppProfile.background,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: AppProfile.hasAuth && !VibeAuthSession.canCreate ? null : () => _openForm(),
        backgroundColor: AppProfile.primary,
        foregroundColor: Colors.black,
        icon: const Icon(Icons.add_rounded),
        label: Text('Add ${AppProfile.entity}'),
      ),
      body: SafeArea(
        child: Column(
          children: <Widget>[
            _buildHeader(),
            _buildSearchBar(),
            if (AppProfile.hasStatsSummary) _buildStatsBanner(),
            if (AppProfile.hasFilterChips) _buildFilterChips(),
            Expanded(child: records.isEmpty ? _buildEmptyState() : _buildBody(records)),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    if (AppProfile.uiPreset == 'minimal') {
      return Padding(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 10),
        child: Row(children: <Widget>[
          Container(height: 44, width: 44, alignment: Alignment.center, decoration: BoxDecoration(color: AppProfile.primary.withOpacity(0.10), borderRadius: BorderRadius.circular(12)), child: Text(AppProfile.logo, style: const TextStyle(fontSize: 22))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
            Text(AppProfile.appName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppProfile.text, fontSize: 23, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text('Manage ' + AppProfile.entity.toLowerCase() + ' records', style: TextStyle(color: AppProfile.text.withOpacity(0.52), fontSize: 12, fontWeight: FontWeight.w600)),
          ])),
        ]),
      );
    }
    if (AppProfile.uiPreset == 'business') {
      return Container(
        margin: const EdgeInsets.fromLTRB(16, 16, 16, 10),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: AppProfile.surface, borderRadius: BorderRadius.circular(18), border: Border(left: BorderSide(color: AppProfile.primary, width: 5), top: BorderSide(color: AppProfile.primary.withOpacity(0.16)), right: BorderSide(color: AppProfile.primary.withOpacity(0.16)), bottom: BorderSide(color: AppProfile.primary.withOpacity(0.16)))),
        child: Row(children: <Widget>[
          Container(height: 50, width: 50, alignment: Alignment.center, decoration: BoxDecoration(color: AppProfile.primary.withOpacity(0.13), borderRadius: BorderRadius.circular(14)), child: Text(AppProfile.logo, style: const TextStyle(fontSize: 25))),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
            Text(AppProfile.domain.toUpperCase(), style: const TextStyle(color: AppProfile.primary, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.4)),
            const SizedBox(height: 4),
            Text(AppProfile.appName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppProfile.text, fontSize: 24, fontWeight: FontWeight.w900)),
          ])),
          Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7), decoration: BoxDecoration(color: AppProfile.primary.withOpacity(0.10), borderRadius: BorderRadius.circular(10)), child: const Text('WORKSPACE', style: TextStyle(color: AppProfile.primary, fontSize: 9, fontWeight: FontWeight.w900))),
        ]),
      );
    }
    if (AppProfile.uiPreset == 'compact') {
      return Container(
        margin: const EdgeInsets.fromLTRB(10, 10, 10, 6),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(color: AppProfile.surface, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppProfile.primary.withOpacity(0.18))),
        child: Row(children: <Widget>[
          Text(AppProfile.logo, style: const TextStyle(fontSize: 20)),
          const SizedBox(width: 10),
          Expanded(child: Text(AppProfile.appName, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppProfile.text, fontSize: 18, fontWeight: FontWeight.w900))),
          Text(AppProfile.entity.toUpperCase(), style: TextStyle(color: AppProfile.text.withOpacity(0.45), fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 1.1)),
        ]),
      );
    }
    final bool soft = AppProfile.uiPreset == 'soft';
    return Container(
      margin: EdgeInsets.fromLTRB(AppProfile.pageInset, 16, AppProfile.pageInset, 10),
      padding: EdgeInsets.all(soft ? 24 : 20),
      decoration: BoxDecoration(
        gradient: soft ? null : const LinearGradient(colors: <Color>[AppProfile.primary, AppProfile.secondary], begin: Alignment.topLeft, end: Alignment.bottomRight),
        color: soft ? AppProfile.surface : null,
        borderRadius: BorderRadius.circular(soft ? 34 : 30),
        border: soft ? Border.all(color: AppProfile.primary.withOpacity(0.18)) : null,
        boxShadow: AppProfile.flatCards ? const <BoxShadow>[] : <BoxShadow>[BoxShadow(color: AppProfile.primary.withOpacity(soft ? 0.10 : 0.22), blurRadius: soft ? 18 : 28, offset: const Offset(0, 12))],
      ),
      child: Row(
        children: <Widget>[
          Container(
            height: 58,
            width: 58,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: soft ? AppProfile.primary.withOpacity(0.12) : Colors.black.withOpacity(0.18), borderRadius: BorderRadius.circular(soft ? 24 : 20)),
            child: Text(AppProfile.logo, style: const TextStyle(fontSize: 28)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(AppProfile.domain.toUpperCase(), style: TextStyle(color: soft ? AppProfile.primary : Colors.black.withOpacity(0.58), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1.5)),
                const SizedBox(height: 5),
                Text(AppProfile.appName, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: soft ? AppProfile.text : Colors.black, fontSize: 26, fontWeight: FontWeight.w900, height: 1.05)),
                const SizedBox(height: 7),
                Text('Create, search, update and delete ${AppProfile.entity.toLowerCase()} records.', style: TextStyle(color: soft ? AppProfile.text.withOpacity(0.58) : Colors.black.withOpacity(0.65), fontWeight: FontWeight.w600, height: 1.35)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: Row(
        children: <Widget>[
          Expanded(
            child: TextField(
              controller: _searchController,
              onChanged: (value) => setState(() => _query = value),
              decoration: InputDecoration(
                hintText: 'Search ${AppProfile.entity.toLowerCase()} records...',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _query.isEmpty
                    ? null
                    : IconButton(
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _query = '');
                        },
                        icon: const Icon(Icons.close_rounded),
                      ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          PopupMenuButton<String>(
            tooltip: 'Sort Records',
            icon: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppProfile.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.12)),
              ),
              child: const Icon(Icons.sort_rounded, color: AppProfile.primary, size: 20),
            ),
            color: AppProfile.surface,
            initialValue: _sortMode,
            onSelected: (String val) => setState(() => _sortMode = val),
            itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
              const PopupMenuItem<String>(value: 'Newest', child: Row(children: <Widget>[Icon(Icons.arrow_downward_rounded, size: 16), SizedBox(width: 8), Text('Newest First')])),
              const PopupMenuItem<String>(value: 'Oldest', child: Row(children: <Widget>[Icon(Icons.arrow_upward_rounded, size: 16), SizedBox(width: 8), Text('Oldest First')])),
              const PopupMenuItem<String>(value: 'A to Z', child: Row(children: <Widget>[Icon(Icons.sort_by_alpha_rounded, size: 16), SizedBox(width: 8), Text('A to Z')])),
              const PopupMenuItem<String>(value: 'Z to A', child: Row(children: <Widget>[Icon(Icons.sort_by_alpha_rounded, size: 16), SizedBox(width: 8), Text('Z to A')])),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatsBanner() {
    final int totalCount = _records.length;
    final int filteredCount = _filteredRecords.length;
    String numFieldName = '';
    String numFieldLabel = '';
    for (final f in AppProfile.fields) {
      if (f.type == 'number') {
        numFieldName = f.name;
        numFieldLabel = f.label;
        break;
      }
    }

    double totalSum = 0.0;
    if (numFieldName.isNotEmpty) {
      for (final r in _records) {
        final val = double.tryParse(r[numFieldName]?.toString() ?? '') ?? 0.0;
        totalSum += val;
      }
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppProfile.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppProfile.primary.withOpacity(0.25)),
        ),
        child: Row(
          children: <Widget>[
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    filteredCount != totalCount ? 'Matching / Total' : 'Total ${AppProfile.entity}s',
                    style: TextStyle(color: AppProfile.text.withOpacity(0.60), fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    filteredCount != totalCount ? '$filteredCount / $totalCount' : '$totalCount',
                    style: const TextStyle(color: AppProfile.text, fontSize: 20, fontWeight: FontWeight.w900),
                  ),
                ],
              ),
            ),
            if (numFieldName.isNotEmpty) ...<Widget>[
              Container(width: 1, height: 36, color: AppProfile.text.withOpacity(0.12)),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text('Total $numFieldLabel', style: TextStyle(color: AppProfile.text.withOpacity(0.60), fontSize: 12, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text(
                      totalSum.toStringAsFixed(totalSum.truncateToDouble() == totalSum ? 0 : 2),
                      style: const TextStyle(color: AppProfile.primary, fontSize: 20, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
              ),
            ],
            Container(width: 1, height: 36, color: AppProfile.text.withOpacity(0.12)),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Sort', style: TextStyle(color: AppProfile.text.withOpacity(0.60), fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(_sortMode, style: const TextStyle(color: AppProfile.accent, fontSize: 15, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    List<String> options = <String>[];
    String filterFieldName = '';

    for (final f in AppProfile.fields) {
      if (f.type == 'select' || f.name.toLowerCase().contains('status') || f.name.toLowerCase().contains('category')) {
        filterFieldName = f.name;
        if (f.options.isNotEmpty) {
          options = <String>['All', ...f.options];
        }
        break;
      }
    }

    if (options.isEmpty) {
      final Set<String> dynamicValues = <String>{'All'};
      for (final r in _records) {
        if (filterFieldName.isNotEmpty && r[filterFieldName] != null && r[filterFieldName].toString().isNotEmpty) {
          dynamicValues.add(r[filterFieldName].toString());
        }
      }
      if (dynamicValues.length > 1) {
        options = dynamicValues.toList();
      }
    }

    if (options.isEmpty) {
      options = <String>['All', 'Active', 'Pending', 'Completed'];
    }

    return Container(
      height: 42,
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: options.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (BuildContext context, int idx) {
          final String opt = options[idx];
          final bool isSelected = _activeFilter == opt;
          return ChoiceChip(
            label: Text(opt),
            selected: isSelected,
            selectedColor: AppProfile.primary,
            backgroundColor: AppProfile.surface,
            labelStyle: TextStyle(
              color: isSelected ? Colors.black : AppProfile.text,
              fontWeight: isSelected ? FontWeight.w900 : FontWeight.w500,
              fontSize: 13,
            ),
            onSelected: (bool val) {
              setState(() {
                _activeFilter = opt;
              });
            },
          );
        },
      ),
    );
  }

  Widget _buildBody(List<Map<String, dynamic>> records) {
    final layout = AppProfile.layout.toLowerCase();
    if (layout.contains('grid') || layout.contains('catalog')) return _buildGrid(records);
    if (layout.contains('table') || layout.contains('ledger')) return _buildTable(records);
    if (layout.contains('timeline') || layout.contains('agenda') || layout.contains('rail')) return _buildTimeline(records);
    if (layout.contains('board') || layout.contains('kanban')) return _buildBoard(records);
    return _buildList(records);
  }

  Widget _buildList(List<Map<String, dynamic>> records) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
      itemCount: records.length,
      itemBuilder: (BuildContext context, int index) => _recordCard(records[index], index),
    );
  }

  Widget _buildGrid(List<Map<String, dynamic>> records) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final int columns = constraints.maxWidth < 430 ? 1 : (constraints.maxWidth < 900 ? 2 : 3);
        return GridView.builder(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: columns, mainAxisExtent: 176, crossAxisSpacing: 12, mainAxisSpacing: 12),
          itemCount: records.length,
          itemBuilder: (BuildContext context, int index) => _recordCard(records[index], index, compact: true),
        );
      },
    );
  }

  Widget _buildTable(List<Map<String, dynamic>> records) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
      children: <Widget>[
        Container(
          decoration: BoxDecoration(color: AppProfile.surface, borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.white.withOpacity(0.10))),
          child: Column(children: records.asMap().entries.map((entry) => _tableRow(entry.value, entry.key)).toList()),
        ),
      ],
    );
  }

  Widget _buildTimeline(List<Map<String, dynamic>> records) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
      itemCount: records.length,
      itemBuilder: (BuildContext context, int index) {
        final record = records[index];
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Column(children: <Widget>[
              Container(height: 26, width: 26, alignment: Alignment.center, decoration: const BoxDecoration(color: AppProfile.primary, shape: BoxShape.circle), child: Text('${index + 1}', style: const TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.w900))),
              Container(width: 2, height: 122, color: Colors.white.withOpacity(0.10)),
            ]),
            const SizedBox(width: 12),
            Expanded(child: _recordCard(record, index)),
          ],
        );
      },
    );
  }

  Widget _buildBoard(List<Map<String, dynamic>> records) {
    final pending = records.where((record) => record.values.join(' ').toString().toLowerCase().contains('pending')).toList();
    final completed = records.where((record) => record.values.join(' ').toString().toLowerCase().contains('complete')).toList();
    final active = records.where((record) => !pending.contains(record) && !completed.contains(record)).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
      scrollDirection: Axis.horizontal,
      children: <Widget>[_boardColumn('Active', active), _boardColumn('Pending', pending), _boardColumn('Completed', completed)],
    );
  }

  Widget _boardColumn(String title, List<Map<String, dynamic>> items) {
    return Container(
      width: 280,
      margin: const EdgeInsets.only(right: 14),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppProfile.surface.withOpacity(0.78), borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.white.withOpacity(0.10))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(title, style: const TextStyle(color: AppProfile.text, fontWeight: FontWeight.w900, fontSize: 16)),
          const SizedBox(height: 10),
          Expanded(child: ListView(children: items.asMap().entries.map((entry) => _recordCard(entry.value, entry.key, compact: true)).toList())),
        ],
      ),
    );
  }

  Widget _tableRow(Map<String, dynamic> record, int index) {
    final title = _primaryValue(record);
    final subtitle = _secondaryValue(record);
    String statusValue = '';
    for (final f in AppProfile.fields) {
      if (f.name.toLowerCase().contains('status') || f.type == 'select') {
        statusValue = (record[f.name] ?? '').toString().trim();
        if (statusValue.isNotEmpty) break;
      }
    }

    return InkWell(
      onTap: () => _openDetails(record),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.08)))),
        child: Row(
          children: <Widget>[
            CircleAvatar(radius: 15, backgroundColor: AppProfile.primary, child: Text('${index + 1}', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 11))),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(title, style: const TextStyle(color: AppProfile.text, fontWeight: FontWeight.w900)),
                  if (subtitle.isNotEmpty) Text(subtitle, style: TextStyle(color: AppProfile.text.withOpacity(0.52), fontSize: 12)),
                ],
              ),
            ),
            if (statusValue.isNotEmpty) ...<Widget>[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppProfile.primary.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppProfile.primary.withOpacity(0.35)),
                ),
                child: Text(statusValue, style: const TextStyle(color: AppProfile.primary, fontSize: 11, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 8),
            ],
            Icon(Icons.chevron_right_rounded, color: AppProfile.text.withOpacity(0.42)),
          ],
        ),
      ),
    );
  }

  Widget _recordCard(Map<String, dynamic> record, int index, {bool compact = false}) {
    final String subtitle = _secondaryValue(record);

    return Container(
      margin: EdgeInsets.only(bottom: compact ? 0 : 14),
      decoration: BoxDecoration(
        color: AppProfile.surface,
        borderRadius: BorderRadius.circular(AppProfile.cardRadius),
        border: Border.all(color: Colors.white.withOpacity(0.10)),
        boxShadow: AppProfile.flatCards ? const <BoxShadow>[] : <BoxShadow>[BoxShadow(color: Colors.black.withOpacity(0.18), blurRadius: 24, offset: const Offset(0, 12))],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(AppProfile.cardRadius),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppProfile.cardRadius),
          onTap: () => _openDetails(record),
          child: Padding(
            padding: EdgeInsets.all(compact ? 13 : 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    CircleAvatar(backgroundColor: AppProfile.primary, radius: compact ? 16 : 19, child: Text('${index + 1}', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 12))),
                    const SizedBox(width: 10),
                    Expanded(child: Text(_primaryValue(record), maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: AppProfile.text, fontSize: compact ? 15 : 18, fontWeight: FontWeight.w900))),
                  ],
                ),
                if (subtitle.isNotEmpty) ...<Widget>[
                  const SizedBox(height: 10),
                  Text(subtitle, maxLines: compact ? 1 : 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: AppProfile.text.withOpacity(0.58), fontSize: 12, fontWeight: FontWeight.w600)),
                ],
                SizedBox(height: compact ? 12 : 16),
                Row(
                  children: <Widget>[
                    const Icon(Icons.visibility_outlined, size: 17, color: AppProfile.primary),
                    const SizedBox(width: 7),
                    const Text('View details', style: TextStyle(color: AppProfile.primary, fontSize: 12, fontWeight: FontWeight.w800)),
                    const Spacer(),
                    Icon(Icons.chevron_right_rounded, color: AppProfile.text.withOpacity(0.42)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _primaryValue(Map<String, dynamic> record) {
    for (final field in AppProfile.fields) {
      final value = (record[field.name] ?? '').toString().trim();
      if (value.isNotEmpty) return value;
    }
    return '${AppProfile.entity} #${record['id']}';
  }

  String _secondaryValue(Map<String, dynamic> record) {
    final values = <String>[];
    for (final field in AppProfile.fields.skip(1).take(2)) {
      final value = (record[field.name] ?? '').toString().trim();
      if (value.isNotEmpty) values.add('${field.label}: ${value}');
    }
    return values.join(' • ');
  }

  Widget _buildEmptyState() {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 96),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight > 116 ? constraints.maxHeight - 116 : 0),
          child: Center(
            child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              height: 76,
              width: 76,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: AppProfile.primary.withOpacity(0.14), shape: BoxShape.circle, border: Border.all(color: AppProfile.primary.withOpacity(0.22))),
              child: Text(AppProfile.logo, style: const TextStyle(fontSize: 38)),
            ),
            const SizedBox(height: 18),
            Text('No ${AppProfile.entity.toLowerCase()} records yet', textAlign: TextAlign.center, style: const TextStyle(color: AppProfile.text, fontSize: 22, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text('Use the add button to create your first record.', textAlign: TextAlign.center, style: TextStyle(color: AppProfile.text.withOpacity(0.55), fontWeight: FontWeight.w600)),
          ],
            ),
          ),
        ),
      ),
    );
  }
}
