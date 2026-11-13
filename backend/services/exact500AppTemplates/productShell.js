function buildProductShellDart() {
  return `
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

module.exports = { buildProductShellDart };
