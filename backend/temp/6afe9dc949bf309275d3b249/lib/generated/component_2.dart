part of vibe_generated_app;

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