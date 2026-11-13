/**
 * supabaseCrudFactory.js
 *
 * Generates a Supabase-connected Flutter CRUD app from a template definition.
 * This is a PARALLEL code path — it does NOT modify the in-memory factory.
 *
 * Input:  the same sanitized template object that uniqueFlutterCrudFactory uses
 * Output: { code, tableSql, tableName }
 */

const { buildProductShellDart } = require("./productShell");
const { buildRoleAuthDart, normalizeRoles } = require("./roleAuthFactory");
const { normalizeUiPreset } = require("../uiPresets");

function safeString(value = "") {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, "\\n")
    .trim();
}

function normalize(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toCamelCase(label = "") {
  const words = normalize(label).split(" ").filter(Boolean);
  if (!words.length) return "field";
  return words
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join("");
}

function titleCase(text = "") {
  return normalize(text)
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeHex(value, fallback = "#22D3EE") {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const r = raw[1] + raw[1];
    const g = raw[2] + raw[2];
    const b = raw[3] + raw[3];
    return `#${r}${g}${b}`.toUpperCase();
  }
  return fallback;
}

function hexToFlutterColor(value, fallback = "#22D3EE") {
  const hex = normalizeHex(value, fallback).replace("#", "");
  return `Color(0xFF${hex})`;
}

function sanitizeField(field = {}, index = 0) {
  const label = field.label || field.title || field.name || field.key || `Field ${index + 1}`;
  const name = field.name || field.key || toCamelCase(label);
  let type = normalize(field.type || "text");

  if (["mobile", "phone number", "contact"].includes(type)) type = "phone";
  if (["email address"].includes(type)) type = "email";
  if (["long text", "multi line", "multiline"].includes(type)) type = "textarea";
  if (["integer", "decimal", "price", "amount"].includes(type)) type = "number";
  if (["dropdown", "choice", "options"].includes(type)) type = "select";

  const allowedTypes = new Set(["text", "textarea", "number", "date", "email", "phone", "select"]);
  if (!allowedTypes.has(type)) type = "text";

  return {
    name: toCamelCase(name),
    label: titleCase(label) || `Field ${index + 1}`,
    type,
    required: Boolean(field.required),
    options:
      Array.isArray(field.options) && field.options.length
        ? field.options.map((item) => String(item))
        : type === "select"
        ? ["Active", "Pending", "Completed"]
        : [],
  };
}

function getDefaultFields(entity = "Record") {
  const cleanEntity = normalize(entity);

  if (cleanEntity.includes("student")) {
    return [
      { name: "name", label: "Student Name", type: "text", required: true },
      { name: "className", label: "Class / Batch", type: "text", required: false },
      { name: "phone", label: "Phone Number", type: "phone", required: false },
      { name: "status", label: "Status", type: "select", required: false, options: ["Active", "Pending", "Completed"] },
    ];
  }

  if (cleanEntity.includes("product") || cleanEntity.includes("inventory")) {
    return [
      { name: "name", label: "Product Name", type: "text", required: true },
      { name: "category", label: "Category", type: "text", required: false },
      { name: "quantity", label: "Quantity", type: "number", required: false },
      { name: "price", label: "Price", type: "number", required: false },
    ];
  }

  if (cleanEntity.includes("note") || cleanEntity.includes("notepad")) {
    return [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "content", label: "Content", type: "textarea", required: false },
      { name: "category", label: "Category", type: "text", required: false },
      { name: "date", label: "Date", type: "date", required: false },
    ];
  }

  if (cleanEntity.includes("expense")) {
    return [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "category", label: "Category", type: "text", required: false },
      { name: "date", label: "Date", type: "date", required: false },
    ];
  }

  return [
    { name: "name", label: `${entity} Name`, type: "text", required: true },
    { name: "category", label: "Category", type: "text", required: false },
    { name: "status", label: "Status", type: "select", required: false, options: ["Active", "Pending", "Completed"] },
    { name: "notes", label: "Notes", type: "textarea", required: false },
  ];
}

function sanitizeTemplate(template = {}) {
  const appName = template.appName || template.title || template.name || "Generated CRUD App";
  const entity = template.entity || template.recordName || template.itemName || "Record";
  const theme = template.theme || {};
  const fields = Array.isArray(template.fields) && template.fields.length ? template.fields : getDefaultFields(entity);

  const rawFeatures = template.features || {};
  const experience = template.experience || {};
  const roleSource = rawFeatures.roles ?? experience.roles ?? template.authentication?.roles ?? template.auth?.roles ?? [];
  const hasRoleDefinitions = Array.isArray(roleSource) && roleSource.length > 0;
  const authEnabled = Boolean(
    rawFeatures.hasAuth || rawFeatures.roleBasedAuth || experience.auth ||
    template.authentication?.enabled || template.auth?.enabled || hasRoleDefinitions
  );

  return {
    appName: String(appName).trim(),
    entity: String(entity).trim(),
    domain: String(template.domain || "Business").trim(),
    logo: String(template.logo || "✨").trim(),
    layout: String(template.layout || "card_stack").trim(),
    uiVariant: Number.isFinite(Number(template.uiVariant)) ? Number(template.uiVariant) : 0,
    uiPreset: normalizeUiPreset(template.uiPreset || template.designPreset || template.templateStyle || "modern"),
    primary: normalizeHex(theme.primary || template.primary || "#22D3EE"),
    secondary: normalizeHex(theme.secondary || template.secondary || "#38BDF8"),
    background: normalizeHex(theme.background || template.background || "#020617"),
    surface: normalizeHex(theme.surface || template.surface || "#0F172A"),
    text: normalizeHex(theme.text || template.text || "#FFFFFF"),
    accent: normalizeHex(theme.accent || template.accent || "#10B981"),
    emptyState: String(template.emptyState || "No records yet"),
    cta: String(template.cta || `Add ${entity}`),
    fields: fields.map(sanitizeField),
    features: {
      hasStatsSummary: Boolean(rawFeatures.hasStatsSummary ?? template.hasStatsSummary),
      hasFilterChips: Boolean(rawFeatures.hasFilterChips ?? template.hasFilterChips),
      hasDeleteConfirm: Boolean(rawFeatures.hasDeleteConfirm ?? template.hasDeleteConfirm ?? true),
      hasSplash: Boolean(rawFeatures.hasSplash ?? experience.splash ?? true),
      hasDashboard: Boolean(rawFeatures.hasDashboard ?? experience.dashboard ?? true),
      hasProfile: Boolean(rawFeatures.hasProfile ?? experience.profile ?? true),
      hasSettings: Boolean(rawFeatures.hasSettings ?? experience.settings ?? true),
      navigation: String(rawFeatures.navigation ?? experience.navigation ?? "bottom"),
      hasAuth: authEnabled,
      roles: normalizeRoles(roleSource, authEnabled),
      allowSignup: Boolean(rawFeatures.allowSignup ?? experience.allowSignup ?? template.authentication?.allowSignup ?? template.auth?.allowSignup ?? true),
    },
  };
}

/**
 * Derive a Supabase table name from the entity name.
 * e.g. "Student" → "students", "Product Inventory" → "product_inventory"
 */
function deriveTableName(entity = "records") {
  let name = normalize(entity).replace(/\s+/g, "_");
  // Simple pluralization
  if (!name.endsWith("s")) name += "s";
  return name;
}

/**
 * Map our field types to Postgres column types.
 */
function fieldToSqlType(fieldType = "text") {
  switch (fieldType) {
    case "number": return "numeric";
    case "date": return "date";
    case "email": return "text";
    case "phone": return "text";
    case "textarea": return "text";
    case "select": return "text";
    default: return "text";
  }
}

/**
 * Generate a SQL CREATE TABLE statement for the Supabase table.
 */
function generateTableSql(tableName, fields = []) {
  const safeTableName = String(tableName || "items").trim().replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase() || "items";
  const safeFields = Array.isArray(fields) ? fields : [];

  const columns = safeFields.map((field) => {
    const colName = String(field.name || "field").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
    const colType = fieldToSqlType(field.type);
    const notNull = field.required ? " NOT NULL" : "";
    return `  ${colName} ${colType}${notNull}`;
  });

  const columnsClause = columns.length > 0 ? columns.join(",\n") + ",\n" : "";

  return [
    `-- Create table for ${safeTableName}`,
    `-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql`,
    `CREATE TABLE IF NOT EXISTS ${safeTableName} (`,
    `  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,`,
    `${columnsClause}  created_at timestamptz DEFAULT now()`,
    `);`,
    ``,
    `-- Enable Row Level Security (RLS)`,
    `ALTER TABLE ${safeTableName} ENABLE ROW LEVEL SECURITY;`,
    ``,
    `-- Allow read and write access for development`,
    `CREATE POLICY "Allow all access" ON ${safeTableName}`,
    `  FOR ALL USING (true) WITH CHECK (true);`,
  ].join("\n");
}

function buildFieldsDart(fields = []) {
  return fields
    .map((field) => {
      const options = Array.isArray(field.options)
        ? field.options.map((item) => `'${safeString(item)}'`).join(", ")
        : "";
      return `AppField(
      name: '${safeString(field.name)}',
      label: '${safeString(field.label)}',
      type: '${safeString(field.type)}',
      required: ${field.required ? "true" : "false"},
      options: <String>[${options}],
    )`;
    })
    .join(",\n    ");
}

/**
 * Build a Supabase-connected Flutter CRUD app.
 *
 * Uses the SAME UI structure as uniqueFlutterCrudFactory, but replaces:
 * - dart:html localStorage → supabase_flutter
 * - Synchronous in-memory CRUD → async Supabase CRUD
 */
function buildFlutterSupabaseCrudApp({ template = {}, supabaseUrl = "", supabaseAnonKey = "", tableName = "" }) {
  const safe = sanitizeTemplate(template);
  const fieldsDart = buildFieldsDart(safe.fields);
  const productShellDart = buildProductShellDart();
  const roleAuthDart = buildRoleAuthDart(safe.features.roles, { allowSignup: safe.features.allowSignup });
  const table = tableName || deriveTableName(safe.entity);

  const code = `
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: '${safeString(supabaseUrl)}',
    anonKey: '${safeString(supabaseAnonKey)}',
  );
  runApp(const VibeGeneratedApp());
}

final supabase = Supabase.instance.client;

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
  static const String appName = '${safeString(safe.appName)}';
  static const String entity = '${safeString(safe.entity)}';
  static const String domain = '${safeString(safe.domain)}';
  static const String logo = '${safeString(safe.logo)}';
  static const String layout = '${safeString(safe.layout)}';
  static const int uiVariant = ${safe.uiVariant};
  static const String uiPreset = '${safeString(safe.uiPreset)}';
  static const String emptyState = '${safeString(safe.emptyState)}';
  static const String cta = '${safeString(safe.cta)}';
  static const String tableName = '${safeString(table)}';

  static const Color primary = ${hexToFlutterColor(safe.primary)};
  static const Color secondary = ${hexToFlutterColor(safe.secondary)};
  static const Color background = ${hexToFlutterColor(safe.background)};
  static const Color surface = ${hexToFlutterColor(safe.surface)};
  static const Color text = ${hexToFlutterColor(safe.text)};
  static const Color accent = ${hexToFlutterColor(safe.accent)};

  static const bool hasStatsSummary = ${safe.features.hasStatsSummary};
  static const bool hasFilterChips = ${safe.features.hasFilterChips};
  static const bool hasDeleteConfirm = ${safe.features.hasDeleteConfirm};
  static const bool hasSplash = ${safe.features.hasSplash};
  static const bool hasDashboard = ${safe.features.hasDashboard};
  static const bool hasProfile = ${safe.features.hasProfile};
  static const bool hasSettings = ${safe.features.hasSettings};
  static const bool hasAuth = ${safe.features.hasAuth};
  static const bool allowSignup = ${safe.features.allowSignup};
  static const String navigation = '${safeString(safe.features.navigation)}';
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
    ${fieldsDart}
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

${roleAuthDart}

${productShellDart}

class CrudHomePage extends StatefulWidget {
  const CrudHomePage({super.key});

  @override
  State<CrudHomePage> createState() => _CrudHomePageState();
}

class _CrudHomePageState extends State<CrudHomePage> {
  final TextEditingController _searchController = TextEditingController();
  List<Map<String, dynamic>> _records = <Map<String, dynamic>>[];
  bool _loading = true;
  String _query = '';
  String _activeFilter = 'All';
  String _sortMode = 'Newest';

  @override
  void initState() {
    super.initState();
    _loadRecords();
  }

  Future<void> _loadRecords() async {
    setState(() => _loading = true);
    try {
      final response = await supabase
          .from(AppProfile.tableName)
          .select()
          .order('id', ascending: false);
      setState(() {
        _records = List<Map<String, dynamic>>.from(response as List);
      });
      AppProfile.recordCount.value = _records.length;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load records: \${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

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

  Future<void> _deleteRecord(int id) async {
    if (AppProfile.hasAuth && !VibeAuthSession.canDelete) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Your role cannot delete records.')));
      return;
    }
    if (AppProfile.hasDeleteConfirm) {
      final bool? confirm = await showDialog<bool>(
        context: context,
        builder: (BuildContext ctx) => AlertDialog(
          backgroundColor: AppProfile.surface,
          title: Text('Delete \${AppProfile.entity}?', style: const TextStyle(color: AppProfile.text, fontWeight: FontWeight.bold)),
          content: Text('Are you sure you want to delete this \${AppProfile.entity.toLowerCase()}? This action cannot be undone.', style: TextStyle(color: AppProfile.text.withOpacity(0.80))),
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
      if (confirm != true) return;
    }

    try {
      await supabase.from(AppProfile.tableName).delete().eq('id', id);
      await _loadRecords();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('\${AppProfile.entity} deleted')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Delete failed: \${e.toString()}')),
        );
      }
    }
  }

  Future<void> _saveRecord(Map<String, dynamic> values, Map<String, dynamic>? existing) async {
    if (AppProfile.hasAuth && (existing == null ? !VibeAuthSession.canCreate : !VibeAuthSession.canUpdate)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Your role cannot save this change.')));
      return;
    }
    try {
      if (existing == null) {
        await supabase.from(AppProfile.tableName).insert(values);
      } else {
        final dynamic id = existing['id'];
        await supabase.from(AppProfile.tableName).update(values).eq('id', id);
      }
      await _loadRecords();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(existing == null ? '\${AppProfile.entity} added successfully' : '\${AppProfile.entity} updated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Save failed: \${e.toString()}')),
        );
      }
    }
  }

  Future<void> _openForm({Map<String, dynamic>? existing}) async {
    if (AppProfile.hasAuth && (existing == null ? !VibeAuthSession.canCreate : !VibeAuthSession.canUpdate)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You have read-only access.')));
      return;
    }
    final Map<String, TextEditingController> controllers = <String, TextEditingController>{};
    final Map<String, String> values = <String, String>{};

    for (final field in AppProfile.fields) {
      final currentValue = (existing?[field.name] ?? '').toString();
      values[field.name] = currentValue;
      controllers[field.name] = TextEditingController(text: currentValue);
    }

    await showDialog<void>(
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
                                      Text(existing == null ? 'Add \${AppProfile.entity}' : 'Edit \${AppProfile.entity}', style: const TextStyle(color: AppProfile.text, fontSize: 22, fontWeight: FontWeight.w900)),
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
                                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('\${field.label} is required')));
                                          return;
                                        }
                                        payload[field.name] = value;
                                      }

                                      _saveRecord(payload, existing);
                                      Navigator.of(dialogContext).pop();
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
    );

    for (final controller in controllers.values) {
      controller.dispose();
    }
  }

  Widget _buildFieldInput({
    required AppField field,
    required Map<String, TextEditingController> controllers,
    required Map<String, String> values,
    required StateSetter setModalState,
  }) {
    final label = field.required ? '\${field.label} *' : field.label;

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
          final formatted = '\${selectedDate.year}-\${selectedDate.month.toString().padLeft(2, '0')}-\${selectedDate.day.toString().padLeft(2, '0')}';
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
      backgroundColor: AppProfile.background,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: AppProfile.hasAuth && !VibeAuthSession.canCreate ? null : () => _openForm(),
        backgroundColor: AppProfile.primary,
        foregroundColor: Colors.black,
        icon: const Icon(Icons.add_rounded),
        label: Text('Add \${AppProfile.entity}'),
      ),
      body: SafeArea(
        child: Column(
          children: <Widget>[
            _buildHeader(),
            _buildSearchBar(),
            if (AppProfile.hasStatsSummary) _buildStatsBanner(),
            if (AppProfile.hasFilterChips) _buildFilterChips(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : records.isEmpty
                      ? _buildEmptyState()
                      : _buildBody(records),
            ),
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
                Text('Create, search, update and delete \${AppProfile.entity.toLowerCase()} records.', style: TextStyle(color: soft ? AppProfile.text.withOpacity(0.58) : Colors.black.withOpacity(0.65), fontWeight: FontWeight.w600, height: 1.35)),
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
                hintText: 'Search \${AppProfile.entity.toLowerCase()} records...',
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
                    filteredCount != totalCount ? 'Matching / Total' : 'Total \${AppProfile.entity}s',
                    style: TextStyle(color: AppProfile.text.withOpacity(0.60), fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    filteredCount != totalCount ? '\$filteredCount / \$totalCount' : '\$totalCount',
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
                    Text('Total \$numFieldLabel', style: TextStyle(color: AppProfile.text.withOpacity(0.60), fontSize: 12, fontWeight: FontWeight.w600)),
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
    return RefreshIndicator(
      onRefresh: _loadRecords,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
        itemCount: records.length,
        itemBuilder: (BuildContext context, int index) => _recordCard(records[index], index),
      ),
    );
  }

  Widget _buildGrid(List<Map<String, dynamic>> records) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final int columns = constraints.maxWidth < 430 ? 1 : (constraints.maxWidth < 900 ? 2 : 3);
        return GridView.builder(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: columns, mainAxisExtent: 360, crossAxisSpacing: 12, mainAxisSpacing: 12),
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
              Container(height: 26, width: 26, alignment: Alignment.center, decoration: const BoxDecoration(color: AppProfile.primary, shape: BoxShape.circle), child: Text('\${index + 1}', style: const TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.w900))),
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
      onTap: () => _openForm(existing: record),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.08)))),
        child: Row(
          children: <Widget>[
            CircleAvatar(radius: 15, backgroundColor: AppProfile.primary, child: Text('\${index + 1}', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 11))),
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
            IconButton(onPressed: () => _openForm(existing: record), icon: const Icon(Icons.edit_outlined)),
            IconButton(onPressed: () => _deleteRecord(record['id'] as int), icon: const Icon(Icons.delete_outline, color: Colors.redAccent)),
          ],
        ),
      ),
    );
  }

  Widget _recordCard(Map<String, dynamic> record, int index, {bool compact = false}) {
    final displayFields = AppProfile.fields.take(compact ? 3 : 5).toList();

    return Container(
      margin: EdgeInsets.only(bottom: compact ? 0 : 14),
      padding: EdgeInsets.all(compact ? 13 : 16),
      decoration: BoxDecoration(
        color: AppProfile.surface,
        borderRadius: BorderRadius.circular(AppProfile.cardRadius),
        border: Border.all(color: Colors.white.withOpacity(0.10)),
        boxShadow: AppProfile.flatCards ? const <BoxShadow>[] : <BoxShadow>[BoxShadow(color: Colors.black.withOpacity(0.18), blurRadius: 24, offset: const Offset(0, 12))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              CircleAvatar(backgroundColor: AppProfile.primary, radius: compact ? 16 : 19, child: Text('\${index + 1}', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 12))),
              const SizedBox(width: 10),
              Expanded(child: Text(_primaryValue(record), maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: AppProfile.text, fontSize: compact ? 15 : 18, fontWeight: FontWeight.w900))),
            ],
          ),
          const SizedBox(height: 12),
          ...displayFields.map((field) {
            final value = (record[field.name] ?? '').toString();
            if (value.isEmpty) return const SizedBox.shrink();
            final isStatusField = field.type == 'select' || field.name.toLowerCase().contains('status') || field.name.toLowerCase().contains('category');
            if (isStatusField) {
              final isPositive = ['active', 'completed', 'done', 'paid', 'approved', 'success'].contains(value.toLowerCase());
              final isWarning = ['pending', 'in progress', 'waiting', 'review', 'unpaid', 'draft'].contains(value.toLowerCase());
              final badgeColor = isPositive ? Colors.greenAccent : (isWarning ? Colors.orangeAccent : AppProfile.primary);
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: <Widget>[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: badgeColor.withOpacity(0.14),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: badgeColor.withOpacity(0.35)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          Container(width: 6, height: 6, decoration: BoxDecoration(color: badgeColor, shape: BoxShape.circle)),
                          const SizedBox(width: 6),
                          Text('\${field.label}: \$value', style: TextStyle(color: badgeColor, fontSize: 11, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.06), borderRadius: BorderRadius.circular(14)),
                child: Row(
                  children: <Widget>[
                    Icon(_iconForField(field), size: 15, color: AppProfile.primary),
                    const SizedBox(width: 7),
                    Expanded(child: Text('\${field.label}: \${value}', maxLines: compact ? 1 : 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: AppProfile.text.withOpacity(0.72), fontSize: 12, fontWeight: FontWeight.w600))),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 6),
          Row(
            children: <Widget>[
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _openForm(existing: record),
                  icon: const Icon(Icons.edit_outlined, size: 17),
                  label: const Text('Edit'),
                  style: OutlinedButton.styleFrom(foregroundColor: AppProfile.primary, side: BorderSide(color: AppProfile.primary.withOpacity(0.45)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _deleteRecord(record['id'] as int),
                  icon: const Icon(Icons.delete_outline, size: 17),
                  label: const Text('Delete'),
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.redAccent, side: BorderSide(color: Colors.redAccent.withOpacity(0.45)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _primaryValue(Map<String, dynamic> record) {
    for (final field in AppProfile.fields) {
      final value = (record[field.name] ?? '').toString().trim();
      if (value.isNotEmpty) return value;
    }
    return '\${AppProfile.entity} #\${record['id']}';
  }

  String _secondaryValue(Map<String, dynamic> record) {
    final values = <String>[];
    for (final field in AppProfile.fields.skip(1).take(2)) {
      final value = (record[field.name] ?? '').toString().trim();
      if (value.isNotEmpty) values.add('\${field.label}: \${value}');
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
            Text('No \${AppProfile.entity.toLowerCase()} records yet', textAlign: TextAlign.center, style: const TextStyle(color: AppProfile.text, fontSize: 22, fontWeight: FontWeight.w900)),
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
`.trim();

  const tableSql = generateTableSql(table, safe.fields);

  return { code, tableSql, tableName: table };
}

module.exports = {
  buildFlutterSupabaseCrudApp,
  generateTableSql,
  deriveTableName,
  sanitizeTemplate,
};
