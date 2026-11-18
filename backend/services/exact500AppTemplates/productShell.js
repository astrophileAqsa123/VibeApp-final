function buildSplashDart() {
  return `class VibeSplashPage extends StatefulWidget {
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

`;
}

function buildDashboardDart() {
  return `class VibeDashboardPage extends StatelessWidget {
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
`;
}

const MODULE_ORDER = ["dashboard", "records", "categories", "calendar", "analytics", "profile", "settings"];
const REQUIRED_MODULES = ["dashboard", "records", "profile", "settings"];

function normalizeShellOptions(options = {}) {
  const requested = new Set(Array.isArray(options.modules) ? options.modules : []);
  const modules = MODULE_ORDER.filter((id) => REQUIRED_MODULES.includes(id) || requested.has(id));
  return { modules, icon: /^[a-z0-9_]+$/.test(options.icon || "") ? options.icon : "folder_copy" };
}

function moduleDefinitions(cfg) {
  return {
    dashboard: { label: "'Dashboard'", short: "'Home'", outlined: "dashboard_outlined", selected: "dashboard_rounded", page: "VibeDashboardPage(onManage: _openRecords)" },
    records: { label: "AppProfile.entityPlural", short: "AppProfile.entityPlural", outlined: `${cfg.icon}_outlined`, selected: `${cfg.icon}_rounded`, page: "const CrudHomePage()" },
    categories: { label: "'Categories'", short: "'Categories'", outlined: "category_outlined", selected: "category_rounded", page: "const VibeCategoriesPage()" },
    calendar: { label: "'Calendar'", short: "'Calendar'", outlined: "calendar_month_outlined", selected: "calendar_month_rounded", page: "const VibeCalendarPage()" },
    analytics: { label: "'Analytics'", short: "'Insights'", outlined: "insights_outlined", selected: "insights_rounded", page: "const VibeAnalyticsPage()" },
    profile: { label: "'Profile'", short: "'Profile'", outlined: "person_outline_rounded", selected: "person_rounded", page: "const VibeProfilePage()" },
    settings: { label: "'Settings'", short: "'Settings'", outlined: "settings_outlined", selected: "settings_rounded", page: "const VibeSettingsPage()" },
  };
}

function destination(def, labelKey) {
  return `NavigationDestination(icon: const Icon(Icons.${def.outlined}), selectedIcon: const Icon(Icons.${def.selected}), label: ${def[labelKey]})`;
}

function buildShellClass(cfg) {
  const defs = moduleDefinitions(cfg);
  const ids = cfg.modules;
  const indexOf = (id) => ids.indexOf(id);
  const insight = ["analytics", "calendar", "categories"].find((id) => ids.includes(id));
  const slotIds = ["dashboard", "records", insight, "profile"].filter(Boolean);
  const slots = `<int>[${slotIds.map(indexOf).join(", ")}]`;
  const pages = ids.map((id) => `    ${defs[id].page},`).join("\n");
  const dests = ids.map((id) => `    ${destination(defs[id], "label")},`).join("\n");
  const slotDests = slotIds.map((id) => `              ${destination(defs[id], "short")},`).join("\n");
  return `class VibeProductShell extends StatefulWidget {
  const VibeProductShell({super.key});

  @override
  State<VibeProductShell> createState() => _VibeProductShellState();
}

class _VibeProductShellState extends State<VibeProductShell> {
  int _index = 0;

  List<Widget> _pages() => <Widget>[
${pages}
  ];

  List<NavigationDestination> _destinations() => <NavigationDestination>[
${dests}
  ];

  List<NavigationRailDestination> _railDestinations() => _destinations().map((destination) => NavigationRailDestination(
    icon: destination.icon,
    selectedIcon: destination.selectedIcon,
    label: Text(destination.label),
  )).toList();

  void _openRecords() => setState(() => _index = ${indexOf("records")});

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
            selectedIndex: ${slots}.contains(selected) ? ${slots}.indexOf(selected) : 0,
            onDestinationSelected: (slot) {
              const indexes = ${slots};
              setState(() => _index = indexes[slot]);
            },
            destinations: <NavigationDestination>[
${slotDests}
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
`;
}

// Shared helpers: every module reads the app's real records, never sample numbers.
function buildDataHelpersDart() {
  return `class VibeData {
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
`;
}

function pageScaffold(body) {
  return `    return Scaffold(
      backgroundColor: AppProfile.background,
      body: SafeArea(
        child: ValueListenableBuilder<List<Map<String, dynamic>>>(
          valueListenable: AppProfile.records,
          builder: (context, records, _) => ListView(
            padding: const EdgeInsets.all(20),
            children: <Widget>[
${body}
            ],
          ),
        ),
      ),
    );`;
}

function buildAnalyticsPageDart() {
  return `class VibeAnalyticsPage extends StatelessWidget {
  const VibeAnalyticsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final String groupField = AppProfile.statusField.isNotEmpty ? AppProfile.statusField : AppProfile.categoryField;
${pageScaffold(`              VibeData.header(Icons.insights_outlined, 'Analytics', 'How your ' + AppProfile.entityPlural.toLowerCase() + ' are distributed.'),
              const SizedBox(height: 20),
              if (records.isEmpty)
                VibeData.emptyCard('Charts appear here once you add your first ' + AppProfile.entity.toLowerCase() + '.')
              else ...<Widget>[
                if (groupField.isNotEmpty) VibeData.barChart(AppProfile.entityPlural + ' by ' + VibeData.labelOf(groupField), VibeData.groupBy(records, groupField)),
                if (AppProfile.amountField.isNotEmpty && AppProfile.categoryField.isNotEmpty) ...<Widget>[
                  const SizedBox(height: 14),
                  VibeData.barChart(VibeData.labelOf(AppProfile.amountField) + ' by ' + VibeData.labelOf(AppProfile.categoryField), VibeData.groupBy(records, AppProfile.categoryField, sumField: AppProfile.amountField)),
                ],
              ],`)}
  }
}
`;
}

function buildCategoriesPageDart() {
  return `class VibeCategoriesPage extends StatelessWidget {
  const VibeCategoriesPage({super.key});

  @override
  Widget build(BuildContext context) {
${pageScaffold(`              VibeData.header(Icons.category_outlined, 'Categories', 'Browse ' + AppProfile.entityPlural.toLowerCase() + ' by ' + VibeData.labelOf(AppProfile.categoryField).toLowerCase() + '.'),
              const SizedBox(height: 20),
              if (records.isEmpty)
                VibeData.emptyCard('No ' + AppProfile.entityPlural.toLowerCase() + ' yet. Add one to see it grouped here.')
              else
                ...VibeData.groupBy(records, AppProfile.categoryField).map((entry) => Card(child: ListTile(
                  leading: CircleAvatar(backgroundColor: AppProfile.primary.withOpacity(0.12), child: const Icon(Icons.label_outline_rounded, color: AppProfile.primary)),
                  title: Text(entry.key, style: const TextStyle(fontWeight: FontWeight.w800)),
                  trailing: Text(VibeData.format(entry.value), style: const TextStyle(fontWeight: FontWeight.w900)),
                ))),`)}
  }
}
`;
}

function buildCalendarPageDart() {
  return `class VibeCalendarPage extends StatelessWidget {
  const VibeCalendarPage({super.key});

  Widget _row(Map<String, dynamic> record) {
    final String date = VibeData.text(record, AppProfile.dateField);
    final String status = AppProfile.statusField.isEmpty ? '' : VibeData.text(record, AppProfile.statusField);
    return Card(child: ListTile(
      leading: CircleAvatar(backgroundColor: AppProfile.primary.withOpacity(0.12), child: Text(date.length >= 10 ? date.substring(8, 10) : '-', style: const TextStyle(color: AppProfile.primary, fontWeight: FontWeight.w900))),
      title: Text(VibeData.title(record), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
      subtitle: Text(status.isEmpty ? date : date + '  -  ' + status),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final String today = VibeData.today();
${pageScaffold(`              VibeData.header(Icons.calendar_month_outlined, 'Calendar', AppProfile.entityPlural + ' ordered by ' + VibeData.labelOf(AppProfile.dateField).toLowerCase() + '.'),
              const SizedBox(height: 20),
              ...(() {
                final dated = records.where((record) => VibeData.text(record, AppProfile.dateField).isNotEmpty).toList();
                dated.sort((a, b) => VibeData.text(a, AppProfile.dateField).compareTo(VibeData.text(b, AppProfile.dateField)));
                final upcoming = dated.where((record) => VibeData.text(record, AppProfile.dateField).compareTo(today) >= 0).toList();
                final earlier = dated.where((record) => VibeData.text(record, AppProfile.dateField).compareTo(today) < 0).toList().reversed.toList();
                if (dated.isEmpty) return <Widget>[VibeData.emptyCard('Nothing scheduled yet. Add a ' + AppProfile.entity.toLowerCase() + ' with a ' + VibeData.labelOf(AppProfile.dateField).toLowerCase() + '.')];
                return <Widget>[
                  if (upcoming.isNotEmpty) const Text('Upcoming', style: TextStyle(color: AppProfile.text, fontSize: 17, fontWeight: FontWeight.w900)),
                  ...upcoming.map(_row),
                  if (earlier.isNotEmpty) const Padding(padding: EdgeInsets.only(top: 16), child: Text('Earlier', style: TextStyle(color: AppProfile.text, fontSize: 17, fontWeight: FontWeight.w900))),
                  ...earlier.map(_row),
                ];
              })(),`)}
  }
}
`;
}

function buildModulePagesDart(cfg) {
  const parts = [buildDataHelpersDart()];
  if (cfg.modules.includes("analytics")) parts.push(buildAnalyticsPageDart());
  if (cfg.modules.includes("categories")) parts.push(buildCategoriesPageDart());
  if (cfg.modules.includes("calendar")) parts.push(buildCalendarPageDart());
  return parts.join("\n");
}

/**
 * options.modules: which optional tabs this app gets (analytics, calendar, categories).
 * Dashboard, records, profile and settings are always present. Without options the
 * shell is the minimal one; charts and calendars are never added by default.
 */
function buildProductShellDart(options = {}) {
  const cfg = normalizeShellOptions(options);
  return `
${buildSplashDart()}${buildShellClass(cfg)}
${buildModulePagesDart(cfg)}
${buildDashboardDart()}`;
}

module.exports = { buildProductShellDart, normalizeShellOptions };
