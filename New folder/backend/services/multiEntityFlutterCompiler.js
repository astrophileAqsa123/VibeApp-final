const { checkFlutterCodeSyntax } = require("./exact500AppTemplates/flutterCodeSafety");
const { auditCompilerSpec } = require("./appSpec/compilerCapabilities");

function dartString(value = "") {
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\$/g, "\\$").replace(/\r?\n/g, " ")}'`;
}

function colorLiteral(value, fallback) {
  const clean = String(value || fallback).replace("#", "").toUpperCase();
  return `Color(0xFF${/^[0-9A-F]{6}$/.test(clean) ? clean : fallback.replace("#", "")})`;
}

function iconName(value = "") {
  const text = String(value).toLowerCase();
  if (/colon|people|staff|user|author/.test(text)) return "people_alt_outlined";
  if (/habitat|home|building|library/.test(text)) return "domain_outlined";
  if (/mission|trip|travel/.test(text)) return "rocket_launch_outlined";
  if (/resource|inventory|product/.test(text)) return "inventory_2_outlined";
  if (/incident|issue|alert/.test(text)) return "warning_amber_outlined";
  if (/equipment|tool|maintenance/.test(text)) return "construction_outlined";
  if (/book/.test(text)) return "menu_book_outlined";
  return "description_outlined";
}

function seedValue(entity, field, rowIndex, entities) {
  const id = String(field.id || "").toLowerCase();
  const label = String(field.label || field.id || "Field");
  const type = String(field.type || "text");
  if (field.referenceEntity) {
    const parent = entities.find((item) => item.id === field.referenceEntity);
    return parent ? `${parent.id}-${(rowIndex % 3) + 1}` : "";
  }
  if (Array.isArray(field.options) && field.options.length) return field.options[rowIndex % field.options.length];
  if (type === "boolean") return rowIndex % 2 === 0;
  if (type === "number" || /age|quantity|capacity|level|power|minimum|count|amount|price|budget/.test(id)) return (rowIndex + 1) * 10;
  if (type === "date" || /date/.test(id)) return `2026-${String(rowIndex + 1).padStart(2, "0")}-${String(10 + rowIndex).padStart(2, "0")}`;
  if (type === "email") return `contact${rowIndex + 1}@example.com`;
  if (type === "phone") return `+1 202 555 01${String(rowIndex).padStart(2, "0")}`;
  if (/name|title/.test(id)) return `${entity.name} ${["North", "Central", "West"][rowIndex] || rowIndex + 1}`;
  if (/status/.test(id)) return ["Active", "Planned", "Stable"][rowIndex] || "Active";
  if (/location|destination/.test(id)) return ["North Studio", "Central Office", "West Site"][rowIndex] || "Central Hub";
  if (/description|resolution|notes/.test(id)) return `${label} sample for ${entity.name.toLowerCase()} operations.`;
  if (/unit/.test(id)) return ["kg", "litres", "units"][rowIndex] || "units";
  if (/skill/.test(id)) return ["Engineering", "Botany", "Navigation"][rowIndex] || "Operations";
  if (/occupation|type|condition|severity|health/.test(id)) return ["Operational", "Good", "Standard"][rowIndex] || "Operational";
  return `${label} ${rowIndex + 1}`;
}

function dartValue(value) {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `<String>[${value.map(dartString).join(", ")}]`;
  return dartString(value);
}

function buildDefinitions(spec) {
  return spec.entities.map((entity) => {
    const fields = entity.fields.map((field) => `FieldDefinition(
        id: ${dartString(field.id)}, label: ${dartString(field.label)}, type: ${dartString(field.type)},
        required: ${Boolean(field.required)}, readOnly: ${Boolean(field.readOnly)},
        unique: ${Boolean(field.unique)},
        options: <String>[${(field.options || []).map(dartString).join(", ")}],
        referenceEntity: ${field.referenceEntity ? dartString(field.referenceEntity) : "null"},
      )`).join(",\n      ");
    return `EntityDefinition(
    id: ${dartString(entity.id)}, name: ${dartString(entity.name)}, pluralName: ${dartString(entity.pluralName)},
    icon: Icons.${iconName(entity.icon || entity.id)}, displayField: ${dartString(entity.displayField)},
    canCreate: ${entity.operations?.create !== false}, canUpdate: ${entity.operations?.update !== false}, canDelete: ${entity.operations?.delete !== false},
    fields: <FieldDefinition>[\n      ${fields}\n    ],
  )`;
  }).join(",\n  ");
}

function buildRelationships(spec) {
  return (spec.relationships || []).map((relationship) => `RelationshipDefinition(
    id: ${dartString(relationship.id)}, type: ${dartString(relationship.type)},
    sourceEntity: ${dartString(relationship.sourceEntity)}, targetEntity: ${dartString(relationship.targetEntity)},
    targetField: ${relationship.targetField ? dartString(relationship.targetField) : "null"},
    required: ${Boolean(relationship.required)}, onDelete: ${dartString(relationship.onDelete || "restrict")},
    sectionTitle: ${dartString(relationship.sourceDisplay?.sectionTitle || "Related records")},
  )`).join(",\n  ");
}

function buildSeedData(spec) {
  return spec.entities.map((entity) => {
    const samples = spec.seedData?.[entity.id];
    if (samples?.length) return `${dartString(entity.id)}: <Map<String, dynamic>>[${samples.map((row) => `<String, dynamic>{${Object.entries(row).map(([key, value]) => `${dartString(key)}: ${dartValue(value)}`).join(", ")}}`).join(",\n")}]`;
    const rows = [0, 1, 2].map((rowIndex) => {
      const pairs = [`'id': ${dartString(`${entity.id}-${rowIndex + 1}`)}`];
      for (const field of entity.fields.filter(f => f.id !== 'id')) pairs.push(`${dartString(field.id)}: ${dartValue(seedValue(entity, field, rowIndex, spec.entities))}`);
      return `<String, dynamic>{${pairs.join(", ")}}`;
    });
    return `${dartString(entity.id)}: <Map<String, dynamic>>[${rows.join(",\n      ")}]`;
  }).join(",\n    ");
}

function buildSeedLinks(spec) {
  return (spec.relationships || [])
    .filter((relationship) => relationship.type === "manyToMany")
    .map((relationship) => `${dartString(relationship.id)}: <String>{
      ${dartString(`${relationship.sourceEntity}-1::${relationship.targetEntity}-1`)},
      ${dartString(`${relationship.sourceEntity}-1::${relationship.targetEntity}-2`)},
      ${dartString(`${relationship.sourceEntity}-2::${relationship.targetEntity}-2`)},
    }`).join(",\n    ");
}

function buildMultiEntityFlutterApp(spec = {}) {
  if (!Array.isArray(spec.entities) || spec.entities.length < 2) {
    throw new Error("Multi-entity compilation requires at least two entities.");
  }
  const issues = auditCompilerSpec(spec);
  if (issues.length) throw new Error(`Unsupported compiler capabilities: ${issues.map((issue) => issue.reason).join("; ")}`);

  const theme = spec.theme || {};
  const authEnabled = Boolean(spec.authentication?.enabled || (Array.isArray(spec.roles) && spec.roles.length));
  const splashEnabled = spec.splash?.enabled !== false;
  const allowSignup = authEnabled && spec.authentication?.allowSignup !== false;
  const roleNames = (Array.isArray(spec.roles) && spec.roles.length ? spec.roles : [{ name: 'User' }])
    .map((role) => String(role?.name || role?.id || 'User'));
  const roleDart = roleNames.map(dartString).join(', ');
  const roleConfig = spec.workspaceRoleConfig && typeof spec.workspaceRoleConfig === 'object' ? spec.workspaceRoleConfig : {};
  const roleEntityAccessDart = Object.entries(roleConfig.entityAccess || {}).map(([role, ids]) => `${dartString(role)}: <String>[${(Array.isArray(ids) ? ids : []).map(dartString).join(', ')}]`).join(',\n  ');
  const roleDashboardCardsDart = Object.entries(roleConfig.dashboardCards || {}).map(([role, cards]) => `${dartString(role)}: <String>[${(Array.isArray(cards) ? cards : []).map(dartString).join(', ')}]`).join(',\n  ');
  const rolePrimaryActionLabelDart = Object.entries(roleConfig.primaryActions || {}).map(([role, action]) => `${dartString(role)}: ${dartString(action?.label || '')}`).join(',\n  ');
  const rolePrimaryActionEntityDart = Object.entries(roleConfig.primaryActions || {}).map(([role, action]) => `${dartString(role)}: ${action?.entityId ? dartString(action.entityId) : "''"}`).join(',\n  ');
  const roleEntityActionsDart = Object.entries(roleConfig.entityActions || {}).map(([key, actions]) => `${dartString(key)}: <String>[${(Array.isArray(actions) ? actions : []).map(dartString).join(', ')}]`).join(',\n  ');
  const analyticsPolicy = String(roleConfig.analyticsPolicy || spec.workspaceBlueprint?.featurePolicies?.analytics || 'optional');
  const code = `import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hive_flutter/hive_flutter.dart';

void main() => runApp(const GeneratedMultiEntityApp());

class FieldDefinition {
  final String id;
  final String label;
  final String type;
  final bool required;
  final bool readOnly;
  final bool unique;
  final List<String> options;
  final String? referenceEntity;
  const FieldDefinition({required this.id, required this.label, required this.type, required this.required, required this.readOnly, this.unique = false, this.options = const <String>[], this.referenceEntity});
}

class EntityDefinition {
  final String id;
  final String name;
  final String pluralName;
  final IconData icon;
  final String displayField;
  final bool canCreate;
  final bool canUpdate;
  final bool canDelete;
  final List<FieldDefinition> fields;
  const EntityDefinition({required this.id, required this.name, required this.pluralName, required this.icon, required this.displayField, required this.canCreate, required this.canUpdate, required this.canDelete, required this.fields});
}

class RelationshipDefinition {
  final String id;
  final String type;
  final String sourceEntity;
  final String targetEntity;
  final String? targetField;
  final bool required;
  final String onDelete;
  final String sectionTitle;
  const RelationshipDefinition({required this.id, required this.type, required this.sourceEntity, required this.targetEntity, required this.targetField, required this.required, required this.onDelete, required this.sectionTitle});
}

const Color appPrimary = ${colorLiteral(theme.primary, "#2563EB")};
const Color appSecondary = ${colorLiteral(theme.secondary, "#38BDF8")};
const Color appBackground = ${colorLiteral(theme.background, "#F8FAFC")};
const Color appSurface = ${colorLiteral(theme.surface, "#FFFFFF")};
const Color appText = ${colorLiteral(theme.text, "#172033")};
const List<Color> appAccentPalette = <Color>[
  appPrimary, appSecondary, Color(0xFF16A34A), Color(0xFFF59E0B), Color(0xFF7C3AED), Color(0xFF0891B2),
];
Color appAccent(int index) => appAccentPalette[index % appAccentPalette.length];

const List<EntityDefinition> entityDefinitions = <EntityDefinition>[
  ${buildDefinitions(spec)}
];

const List<RelationshipDefinition> relationshipDefinitions = <RelationshipDefinition>[
  ${buildRelationships(spec)}
];

EntityDefinition entityById(String id) => entityDefinitions.firstWhere((entity) => entity.id == id);
final List<Map<String, dynamic>> viewDefinitions = (jsonDecode(${dartString(JSON.stringify(spec.views || []))}) as List).map((item) => Map<String, dynamic>.from(item as Map)).toList();

class NormalizedMemoryStore extends ChangeNotifier {
  static const String _storageKey = ${dartString(`vibeapp.${spec.app?.id || "generated"}.v2`)};
  static const bool persistenceEnabled = ${spec.app?.storageMode === "local"};
  Box<String>? _database;
  final Map<String, List<Map<String, dynamic>>> _records = <String, List<Map<String, dynamic>>>{
    ${buildSeedData(spec)}
  };
  final Map<String, Set<String>> _links = <String, Set<String>>{
    ${buildSeedLinks(spec)}
  };
  int _sequence = 100;
  Future<void> _pendingWrite = Future<void>.value();
  bool isLoading = true;
  String? lastError;

  NormalizedMemoryStore({Box<String>? database}) : _database = database { _restore(); }

  Future<void> _restore() async {
    try {
      if (!persistenceEnabled) return;
      if (_database == null) {
        await Hive.initFlutter();
        _database = await Hive.openBox<String>(_storageKey.toLowerCase());
      }
      var raw = _database!.get('snapshot');
      if (raw == null) {
        // Read the previous format once; retain it as a recovery copy.
        final preferences = await SharedPreferences.getInstance();
        raw = preferences.getString(_storageKey);
        if (raw != null) await _database!.put('snapshot', raw);
      }
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw) as Map<String, dynamic>;
        _sequence = (decoded['sequence'] as num?)?.toInt() ?? 100;
        final savedRecords = decoded['records'] as Map<String, dynamic>?;
        final savedLinks = decoded['links'] as Map<String, dynamic>?;
        if (savedRecords != null) {
          for (final entry in savedRecords.entries) {
            _records[entry.key] = (entry.value as List<dynamic>).map((item) => Map<String, dynamic>.from(item as Map)).toList();
          }
        }
        if (savedLinks != null) {
          for (final entry in savedLinks.entries) _links[entry.key] = Set<String>.from(entry.value as List<dynamic>);
        }
        for (final rows in _records.values) for (final row in rows) {
          final suffix = int.tryParse(row['id'].toString().split('-').last) ?? 0;
          if (suffix > _sequence) _sequence = suffix;
        }
      }
    } catch (error) {
      lastError = 'Local data could not be loaded: ' + error.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _persist() {
    if (!persistenceEnabled) return Future<void>.value();
    final snapshot = jsonEncode(<String, dynamic>{'sequence': _sequence, 'records': _records, 'links': _links.map((key, value) => MapEntry<String, dynamic>(key, value.toList()))});
    _pendingWrite = _pendingWrite.then((_) => _writeSnapshot(snapshot));
    return _pendingWrite;
  }

  Future<void> _writeSnapshot(String snapshot) async {
    try {
      if (_database == null) throw StateError('Local database is unavailable');
      await _database!.put('snapshot', snapshot);
      lastError = null;
    } catch (error) {
      lastError = 'Changes are available for this session but could not be saved locally: ' + error.toString();
      notifyListeners();
    }
  }

  List<Map<String, dynamic>> records(String entityId) => List<Map<String, dynamic>>.unmodifiable(_records[entityId] ?? const <Map<String, dynamic>>[]);
  Future<void> flush() => _pendingWrite;
  Map<String, dynamic>? find(String entityId, String id) {
    for (final record in _records[entityId] ?? const <Map<String, dynamic>>[]) {
      if (record['id'] == id) return record;
    }
    return null;
  }

  String save(String entityId, Map<String, dynamic> values, {String? id, Map<String, Set<String>> selections = const <String, Set<String>>{}}) {
    if (isLoading) throw StateError('Wait for local data to finish loading.');
    for (final field in entityById(entityId).fields) {
      final value = values[field.id];
      if (field.required && (value == null || value.toString().trim().isEmpty)) throw StateError(field.label + ' is required');
      if (field.referenceEntity != null && value != null && value.toString().isNotEmpty && find(field.referenceEntity!, value.toString()) == null) throw StateError('Select an existing ' + field.label);
      if (field.type == 'number' && value != null && value.toString().isNotEmpty && (num.tryParse(value.toString()) == null || !num.parse(value.toString()).isFinite)) throw StateError(field.label + ' must be a finite number');
      if (field.unique && value != null && value.toString().isNotEmpty && this.records(entityId).any((r) => r['id'] != id && r[field.id] == value)) throw StateError(field.label + ' must be unique');
    }
    for (final relationship in relationshipDefinitions.where((r) => r.type == 'manyToMany' && (r.sourceEntity == entityId || r.targetEntity == entityId))) {
      final selected = selections[relationship.id] ?? (id == null ? <String>{} : related(relationship.id, entityId, id).map((row) => row['id'].toString()).toSet());
      if (relationship.required && selected.isEmpty) throw StateError('Select at least one related record');
      final other = relationship.sourceEntity == entityId ? relationship.targetEntity : relationship.sourceEntity;
      if (selected.any((key) => find(other, key) == null)) throw StateError('Related record no longer exists');
    }
    final records = _records.putIfAbsent(entityId, () => <Map<String, dynamic>>[]);
    final recordId = id ?? (entityId + '-' + (++_sequence).toString());
    final duplicate = records.indexWhere((record) => record['id'] == recordId);
    final next = <String, dynamic>{...values, 'id': recordId};
    if (duplicate == -1) records.insert(0, next); else records[duplicate] = next;
    for (final relationship in relationshipDefinitions.where((r) => r.type == 'manyToMany' && selections.containsKey(r.id) && (r.sourceEntity == entityId || r.targetEntity == entityId))) syncManyToMany(relationship, entityId, recordId, selections[relationship.id]!, persist: false);
    _persist();
    notifyListeners();
    return recordId;
  }

  List<Map<String, dynamic>> related(String relationshipId, String fromEntity, String recordId) {
    final relationship = relationshipDefinitions.firstWhere((item) => item.id == relationshipId);
    if (relationship.type == 'manyToMany') {
      final links = _links[relationshipId] ?? <String>{};
      final sourceSide = fromEntity == relationship.sourceEntity;
      final ids = links.map((link) => link.split('::')).where((parts) => parts.length == 2 && (sourceSide ? parts[0] == recordId : parts[1] == recordId)).map((parts) => sourceSide ? parts[1] : parts[0]).toSet();
      return records(sourceSide ? relationship.targetEntity : relationship.sourceEntity).where((record) => ids.contains(record['id'])).toList();
    }
    if (fromEntity == relationship.sourceEntity) {
      return records(relationship.targetEntity).where((record) => record[relationship.targetField] == recordId).toList();
    }
    final current = find(fromEntity, recordId);
    final parentId = current?[relationship.targetField];
    final parent = parentId == null ? null : find(relationship.sourceEntity, parentId.toString());
    return parent == null ? <Map<String, dynamic>>[] : <Map<String, dynamic>>[parent];
  }

  void syncManyToMany(RelationshipDefinition relationship, String sourceEntity, String recordId, Set<String> selectedIds, {bool persist = true}) {
    final otherEntity = sourceEntity == relationship.sourceEntity ? relationship.targetEntity : relationship.sourceEntity;
    if (find(sourceEntity, recordId) == null || selectedIds.any((id) => find(otherEntity, id) == null)) throw StateError('Related record no longer exists');
    final links = _links.putIfAbsent(relationship.id, () => <String>{});
    final sourceSide = sourceEntity == relationship.sourceEntity;
    links.removeWhere((link) {
      final parts = link.split('::');
      return parts.length == 2 && (sourceSide ? parts[0] == recordId : parts[1] == recordId);
    });
    for (final selectedId in selectedIds) {
      links.add(sourceSide ? recordId + '::' + selectedId : selectedId + '::' + recordId);
    }
    if (persist) { _persist(); notifyListeners(); }
  }

  String? delete(String entityId, String recordId) {
    // Plan the entire cascade first. No mutation happens until every restriction passes.
    final pending = <String, Set<String>>{};
    void collect(String entity, String id) {
      if (!pending.putIfAbsent(entity, () => <String>{}).add(id)) return;
      for (final r in relationshipDefinitions.where((r) => r.sourceEntity == entity && r.type != 'manyToMany' && r.onDelete == 'cascade')) {
        for (final child in related(r.id, entity, id)) collect(r.targetEntity, child['id'].toString());
      }
    }
    collect(entityId, recordId);
    for (final entry in pending.entries) for (final id in entry.value) {
      for (final r in relationshipDefinitions.where((r) => r.onDelete == 'restrict' && (r.sourceEntity == entry.key || (r.type == 'manyToMany' && r.targetEntity == entry.key)))) {
        final other = r.sourceEntity == entry.key ? r.targetEntity : r.sourceEntity;
        if (related(r.id, entry.key, id).any((row) => !(pending[other]?.contains(row['id']) ?? false))) return 'Cannot delete this record while related ' + entityById(other).pluralName.toLowerCase() + ' exist.';
      }
    }
    for (final r in relationshipDefinitions) {
      if (r.type == 'manyToMany') {
        _links[r.id]?.removeWhere((link) { final parts = link.split('::'); return parts.length == 2 && ((pending[r.sourceEntity]?.contains(parts[0]) ?? false) || (pending[r.targetEntity]?.contains(parts[1]) ?? false)); });
      } else if (r.onDelete == 'detach') {
        for (final row in _records[r.targetEntity] ?? <Map<String, dynamic>>[]) {
          if (pending[r.sourceEntity]?.contains(row[r.targetField]) ?? false) row[r.targetField!] = null;
        }
      }
    }
    for (final entry in pending.entries) _records[entry.key]?.removeWhere((row) => entry.value.contains(row['id']));
    _persist();
    notifyListeners();
    return null;
  }

}

class GeneratedMultiEntityApp extends StatefulWidget {
  const GeneratedMultiEntityApp({super.key});
  @override
  State<GeneratedMultiEntityApp> createState() => _GeneratedMultiEntityAppState();
}

class _GeneratedMultiEntityAppState extends State<GeneratedMultiEntityApp> {
  final NormalizedMemoryStore store = NormalizedMemoryStore();
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: ${dartString(spec.app?.name || spec.appName || "Generated App")},
    theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: appPrimary, primary: appPrimary, secondary: appSecondary, surface: appSurface, brightness: ThemeData.estimateBrightnessForColor(appBackground)), scaffoldBackgroundColor: appBackground, useMaterial3: true),
    home: ${splashEnabled ? 'AppLaunchSplash(store: store)' : (authEnabled ? 'MultiRoleAuthGate(store: store)' : 'AppShell(store: store)')},
  );
}

const bool generatedAuthEnabled = ${authEnabled};
const bool generatedAllowSignup = ${allowSignup};
const List<String> generatedRoles = <String>[${roleDart}];
const Map<String,List<String>> roleEntityAccess = <String,List<String>>{
  ${roleEntityAccessDart}
};
const Map<String,List<String>> roleDashboardCards = <String,List<String>>{
  ${roleDashboardCardsDart}
};
const Map<String,String> rolePrimaryActionLabel = <String,String>{
  ${rolePrimaryActionLabelDart}
};
const Map<String,String> rolePrimaryActionEntity = <String,String>{
  ${rolePrimaryActionEntityDart}
};
const Map<String,List<String>> roleEntityActions = <String,List<String>>{
  ${roleEntityActionsDart}
};
const String generatedAnalyticsPolicy = ${dartString(analyticsPolicy)};

bool roleCan(String? role, String entityId, String action) {
  if (role == null || role.isEmpty || roleEntityActions.isEmpty) return true;
  final actions = roleEntityActions[role + '::' + entityId];
  return actions != null && actions.contains(action);
}

class AppLaunchSplash extends StatefulWidget {
  final NormalizedMemoryStore store;
  const AppLaunchSplash({super.key, required this.store});
  @override State<AppLaunchSplash> createState()=>_AppLaunchSplashState();
}
class _AppLaunchSplashState extends State<AppLaunchSplash> {
  @override void initState(){
    super.initState();
    Future<void>.delayed(const Duration(milliseconds: 1200),(){
      if(!mounted)return;
      Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder:(_)=>generatedAuthEnabled ? MultiRoleAuthGate(store: widget.store) : AppShell(store: widget.store)));
    });
  }
  @override Widget build(BuildContext context)=>Scaffold(body:Container(width:double.infinity,decoration:BoxDecoration(gradient:LinearGradient(colors:<Color>[appPrimary,appSecondary],begin:Alignment.topLeft,end:Alignment.bottomRight)),child:SafeArea(child:Column(mainAxisAlignment:MainAxisAlignment.center,children:<Widget>[
    Container(width:96,height:96,decoration:BoxDecoration(color:Colors.white.withOpacity(.18),borderRadius:BorderRadius.circular(30)),child:const Icon(Icons.auto_awesome_rounded,color:Colors.white,size:48)),
    const SizedBox(height:22),Text(${dartString(spec.app?.name || spec.appName || "Generated App")},textAlign:TextAlign.center,style:const TextStyle(color:Colors.white,fontSize:30,fontWeight:FontWeight.w900)),
    const SizedBox(height:8),const Text('Preparing your workspace',style:TextStyle(color:Colors.white70,fontWeight:FontWeight.w700)),
    const SizedBox(height:32),const CircularProgressIndicator(color:Colors.white),
  ]))));
}

class MultiRoleAuthGate extends StatefulWidget {
  final NormalizedMemoryStore store;
  const MultiRoleAuthGate({super.key, required this.store});
  @override State<MultiRoleAuthGate> createState()=>_MultiRoleAuthGateState();
}
class _MultiRoleAuthGateState extends State<MultiRoleAuthGate> {
  bool credentialsAccepted=false;
  String? activeRole;

  void _acceptCredentials(){
    setState((){
      credentialsAccepted=true;
      activeRole=null;
    });
  }

  void _selectRole(String role){
    setState(()=>activeRole=role);
  }

  void _signOut(){
    setState((){
      credentialsAccepted=false;
      activeRole=null;
    });
  }

  @override Widget build(BuildContext context) {
    if (!credentialsAccepted) {
      return MultiRoleLoginPage(onSignedIn:_acceptCredentials);
    }
    if (activeRole == null) {
      return RoleSelectionPage(onRoleSelected:_selectRole, onBack:()=>setState(()=>credentialsAccepted=false));
    }
    return AppShell(store:widget.store, activeRole:activeRole, onSignOut:_signOut);
  }
}

class MultiRoleLoginPage extends StatefulWidget {
  final VoidCallback onSignedIn;
  const MultiRoleLoginPage({super.key,required this.onSignedIn});
  @override State<MultiRoleLoginPage> createState()=>_MultiRoleLoginPageState();
}
class _MultiRoleLoginPageState extends State<MultiRoleLoginPage> {
  final email=TextEditingController();
  final password=TextEditingController();
  bool obscure=true;

  @override void dispose(){email.dispose();password.dispose();super.dispose();}

  void signIn(){
    if(email.text.trim().isEmpty||password.text.isEmpty){
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Enter email and password.')));
      return;
    }
    widget.onSignedIn();
  }

  @override Widget build(BuildContext context)=>Scaffold(
    backgroundColor:appBackground,
    body:SafeArea(
      child:Center(
        child:SingleChildScrollView(
          padding:const EdgeInsets.all(20),
          child:Container(
            constraints:const BoxConstraints(maxWidth:480),
            padding:const EdgeInsets.all(24),
            decoration:BoxDecoration(
              color:appSurface,
              borderRadius:BorderRadius.circular(24),
              border:Border.all(color:appPrimary.withOpacity(.2)),
            ),
            child:Column(
              crossAxisAlignment:CrossAxisAlignment.stretch,
              children:<Widget>[
                CircleAvatar(radius:32,backgroundColor:appPrimary.withOpacity(.16),child:Icon(Icons.lock_person_rounded,color:appPrimary,size:34)),
                const SizedBox(height:20),
                const Text('Sign in',style:TextStyle(fontSize:28,fontWeight:FontWeight.w900)),
                const SizedBox(height:6),
                Text('Sign in first. You will choose your workspace role on the next screen.',style:TextStyle(color:appText.withOpacity(.58))),
                const SizedBox(height:20),
                TextField(controller:email,keyboardType:TextInputType.emailAddress,decoration:const InputDecoration(labelText:'Email',prefixIcon:Icon(Icons.email_outlined))),
                const SizedBox(height:12),
                TextField(controller:password,obscureText:obscure,decoration:InputDecoration(labelText:'Password',prefixIcon:const Icon(Icons.lock_outline),suffixIcon:IconButton(onPressed:()=>setState(()=>obscure=!obscure),icon:Icon(obscure?Icons.visibility_outlined:Icons.visibility_off_outlined)))),
                const SizedBox(height:18),
                FilledButton.icon(onPressed:signIn,icon:const Icon(Icons.login_rounded),label:const Text('Sign in')),
                if(generatedAllowSignup) ...<Widget>[
                  const SizedBox(height:8),
                  OutlinedButton.icon(
                    onPressed:()=>Navigator.of(context).push(MaterialPageRoute<void>(builder:(_)=>const MultiRoleSignupPage())),
                    icon:const Icon(Icons.person_add_alt_1_rounded),
                    label:const Text('Create account'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class RoleSelectionPage extends StatelessWidget {
  final ValueChanged<String> onRoleSelected;
  final VoidCallback onBack;
  const RoleSelectionPage({super.key, required this.onRoleSelected, required this.onBack});

  @override Widget build(BuildContext context)=>Scaffold(
    backgroundColor:appBackground,
    appBar:AppBar(leading:IconButton(onPressed:onBack,icon:const Icon(Icons.arrow_back_rounded)),title:const Text('Select role')),
    body:SafeArea(
      child:Center(
        child:SingleChildScrollView(
          padding:const EdgeInsets.all(20),
          child:Container(
            constraints:const BoxConstraints(maxWidth:560),
            child:Column(
              crossAxisAlignment:CrossAxisAlignment.stretch,
              children:<Widget>[
                Text('Choose your workspace',style:Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight:FontWeight.w900)),
                const SizedBox(height:6),
                Text('Each role opens a different dashboard, navigation set, permissions, and primary actions.',style:TextStyle(color:appText.withOpacity(.58))),
                const SizedBox(height:20),
                ...generatedRoles.map<Widget>((role){
                  final cards=roleDashboardCards[role] ?? const <String>[];
                  final action=rolePrimaryActionLabel[role] ?? '';
                  return Padding(
                    padding:const EdgeInsets.only(bottom:12),
                    child:Card(
                      child:InkWell(
                        borderRadius:BorderRadius.circular(18),
                        onTap:()=>onRoleSelected(role),
                        child:Padding(
                          padding:const EdgeInsets.all(18),
                          child:Row(
                            children:<Widget>[
                              CircleAvatar(backgroundColor:appPrimary.withOpacity(.14),child:Icon(Icons.shield_outlined,color:appPrimary)),
                              const SizedBox(width:14),
                              Expanded(
                                child:Column(
                                  crossAxisAlignment:CrossAxisAlignment.start,
                                  children:<Widget>[
                                    Text(role,style:const TextStyle(fontSize:17,fontWeight:FontWeight.w900)),
                                    if(cards.isNotEmpty) Padding(padding:const EdgeInsets.only(top:4),child:Text(cards.take(3).join(' • '),maxLines:2,overflow:TextOverflow.ellipsis,style:TextStyle(color:appText.withOpacity(.58)))),
                                    if(action.isNotEmpty) Padding(padding:const EdgeInsets.only(top:5),child:Text('Primary action: '+action,style:TextStyle(color:appPrimary,fontWeight:FontWeight.w700))),
                                  ],
                                ),
                              ),
                              const Icon(Icons.chevron_right_rounded),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class MultiRoleSignupPage extends StatefulWidget {
  const MultiRoleSignupPage({super.key});
  @override State<MultiRoleSignupPage> createState()=>_MultiRoleSignupPageState();
}
class _MultiRoleSignupPageState extends State<MultiRoleSignupPage> {
  final name=TextEditingController(), email=TextEditingController(), password=TextEditingController();
  @override void dispose(){name.dispose();email.dispose();password.dispose();super.dispose();}
  void create(){
    if(name.text.trim().isEmpty||email.text.trim().isEmpty||password.text.length<4){
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Complete all fields.')));
      return;
    }
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Account created. Sign in to choose your role.')));
  }
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Create account')),body:SafeArea(child:ListView(padding:const EdgeInsets.all(20),children:<Widget>[
    const Text('Create your account',style:TextStyle(fontSize:28,fontWeight:FontWeight.w900)),
    const SizedBox(height:8),
    Text('Role access is selected after sign in so the workspace can apply the correct dashboard and permissions.',style:TextStyle(color:appText.withOpacity(.58))),
    const SizedBox(height:16),
    TextField(controller:name,decoration:const InputDecoration(labelText:'Full name')),
    const SizedBox(height:12),
    TextField(controller:email,keyboardType:TextInputType.emailAddress,decoration:const InputDecoration(labelText:'Email')),
    const SizedBox(height:12),
    TextField(controller:password,obscureText:true,decoration:const InputDecoration(labelText:'Password')),
    const SizedBox(height:18),
    FilledButton.icon(onPressed:create,icon:const Icon(Icons.person_add_alt_1_rounded),label:const Text('Create account')),
  ])));
}

class ShellFeature {
  final String title;
  final IconData icon;
  final String description;
  const ShellFeature(this.title, this.icon, this.description);
}

const List<ShellFeature> universalFeatureScreens = <ShellFeature>[
  ShellFeature('Categories', Icons.category_outlined, 'Organize records into useful groups and segments.'),
  ShellFeature('Calendar', Icons.calendar_month_outlined, 'Review dates, deadlines, bookings, and scheduled work.'),
  ShellFeature('Analytics', Icons.insights_outlined, 'Monitor totals, trends, and operational signals.'),
  ShellFeature('Reports', Icons.assessment_outlined, 'Review structured summaries across your data.'),
  ShellFeature('Favorites', Icons.star_outline, 'Keep important records and workflows easy to reach.'),
  ShellFeature('Activity', Icons.history, 'Follow recent work and record activity.'),
  ShellFeature('Notifications', Icons.notifications_outlined, 'Review reminders and important updates.'),
  ShellFeature('Profile', Icons.person_outline, 'Review workspace identity and access information.'),
  ShellFeature('Settings', Icons.settings_outlined, 'Adjust application and workspace preferences.'),
  ShellFeature('Help & Guide', Icons.help_outline, 'Understand the generated workflows and data model.'),
];

class AppShell extends StatefulWidget {
  final NormalizedMemoryStore store;
  final String? activeRole;
  final VoidCallback? onSignOut;
  const AppShell({super.key, required this.store, this.activeRole, this.onSignOut});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int selectedIndex = 0;

  List<EntityDefinition> get accessibleEntities {
    if (widget.activeRole == null || roleEntityAccess.isEmpty) return entityDefinitions;
    final allowed = roleEntityAccess[widget.activeRole!] ?? const <String>[];
    if (allowed.isEmpty) return entityDefinitions;
    final allowedSet = allowed.toSet();
    final result = entityDefinitions.where((entity) => allowedSet.contains(entity.id)).toList();
    return result.isEmpty ? entityDefinitions : result;
  }

  List<ShellFeature> get visibleFeatures {
    final roleMode = widget.activeRole != null && roleEntityAccess.isNotEmpty;
    if (!roleMode) {
      final slots = (12 - (1 + entityDefinitions.length)).clamp(0, universalFeatureScreens.length).toInt();
      return universalFeatureScreens.take(slots).toList();
    }
    final lowerRole = widget.activeRole!.toLowerCase();
    final managerial = lowerRole.contains('admin') || lowerRole.contains('manager') || lowerRole.contains('owner') || lowerRole.contains('supervisor') || lowerRole.contains('head') || lowerRole.contains('dispatcher');
    return universalFeatureScreens.where((feature) {
      if (feature.title == 'Analytics') return generatedAnalyticsPolicy == 'required' || (generatedAnalyticsPolicy == 'optional' && managerial);
      if (feature.title == 'Reports') return managerial && generatedAnalyticsPolicy != 'disabled';
      return <String>{'Notifications','Profile','Settings','Help & Guide'}.contains(feature.title);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final roleEntities = accessibleEntities;
    final features = visibleFeatures;
    final destinations = <NavigationRailDestination>[
      const NavigationRailDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: Text('Dashboard')),
      ...roleEntities.map((entity) => NavigationRailDestination(icon: Icon(entity.icon), selectedIcon: Icon(entity.icon, fill: 1), label: Text(entity.pluralName))),
      ...features.map((feature) => NavigationRailDestination(icon: Icon(feature.icon), selectedIcon: Icon(feature.icon), label: Text(feature.title))),
    ];
    final labels = <String>['Dashboard', ...roleEntities.map((e) => e.pluralName), ...features.map((f) => f.title)];
    if (selectedIndex >= destinations.length) selectedIndex = 0;
    final int entityEnd = roleEntities.length;
    final int featureIndex = selectedIndex - 1 - roleEntities.length;
    final String actionLabel = widget.activeRole == null ? '' : (rolePrimaryActionLabel[widget.activeRole!] ?? '');
    final String actionEntity = widget.activeRole == null ? '' : (rolePrimaryActionEntity[widget.activeRole!] ?? '');
    final List<String> dashboardCards = widget.activeRole == null ? const <String>[] : (roleDashboardCards[widget.activeRole!] ?? const <String>[]);
    final Widget body = selectedIndex == 0
      ? DashboardScreen(
          store: widget.store,
          entities: roleEntities,
          activeRole: widget.activeRole,
          cards: dashboardCards,
          primaryActionLabel: actionLabel,
          primaryActionEntityId: actionEntity,
          onOpenEntity: (index) => setState(() => selectedIndex = index + 1),
        )
      : selectedIndex <= entityEnd
        ? EntityListScreen(key: ValueKey(roleEntities[selectedIndex - 1].id), store: widget.store, entity: roleEntities[selectedIndex - 1], activeRole: widget.activeRole)
        : UniversalFeatureScreen(store: widget.store, feature: features[featureIndex]);
    final String pageTitle = selectedIndex == 0
      ? (widget.activeRole == null ? ${dartString(spec.app?.name || spec.appName || "Generated App")} : widget.activeRole! + ' Dashboard')
      : labels[selectedIndex];
    return LayoutBuilder(builder: (context, constraints) {
      final wide = constraints.maxWidth >= 860;
      return Scaffold(
        appBar: AppBar(title: Text(pageTitle, style: const TextStyle(fontWeight: FontWeight.w900)), actions:<Widget>[
          if(widget.activeRole != null) Padding(padding:const EdgeInsets.only(right:6),child:Chip(label:Text(widget.activeRole!),avatar:const Icon(Icons.shield_outlined,size:16))),
          if(widget.onSignOut != null) IconButton(onPressed:widget.onSignOut,tooltip:'Sign out',icon:const Icon(Icons.logout_rounded)),
        ]),
        drawer: wide ? null : Drawer(child: SafeArea(child: ListView(children: <Widget>[
          Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[
            const Text(${dartString(spec.app?.name || spec.appName || "Generated App")}, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            if(widget.activeRole != null) Padding(padding:const EdgeInsets.only(top:5),child:Text(widget.activeRole!+' workspace',style:TextStyle(color:appText.withOpacity(.55)))),
          ])),
          ListTile(leading: const Icon(Icons.dashboard_outlined), title: const Text('Dashboard'), selected: selectedIndex == 0, onTap: () { setState(() => selectedIndex = 0); Navigator.pop(context); }),
          ...roleEntities.asMap().entries.map((entry) => ListTile(leading: Icon(entry.value.icon), title: Text(entry.value.pluralName), selected: selectedIndex == entry.key + 1, onTap: () { setState(() => selectedIndex = entry.key + 1); Navigator.pop(context); })),
          ...features.asMap().entries.map((entry) { final index = 1 + roleEntities.length + entry.key; return ListTile(leading: Icon(entry.value.icon), title: Text(entry.value.title), selected: selectedIndex == index, onTap: () { setState(() => selectedIndex = index); Navigator.pop(context); }); }),
        ]))),
        body: Row(children: <Widget>[
          if (wide) SingleChildScrollView(child: IntrinsicHeight(child: NavigationRail(selectedIndex: selectedIndex, onDestinationSelected: (index) => setState(() => selectedIndex = index), labelType: NavigationRailLabelType.all, destinations: destinations))),
          if (wide) const VerticalDivider(width: 1),
          Expanded(child: body),
        ]),
        bottomNavigationBar: wide ? null : Builder(builder:(context){
          final indexes = <int>[0];
          for (var i = 0; i < roleEntities.length && i < 3; i += 1) indexes.add(i + 1);
          final moreIndex = destinations.length - 1;
          if (!indexes.contains(moreIndex) && moreIndex > 0) indexes.add(moreIndex);
          final currentSlot = indexes.indexOf(selectedIndex);
          return NavigationBar(
            selectedIndex: currentSlot < 0 ? 0 : currentSlot,
            onDestinationSelected:(slot)=>setState(()=>selectedIndex=indexes[slot]),
            destinations:indexes.map((index){
              if(index == 0) return const NavigationDestination(icon:Icon(Icons.home_outlined),selectedIcon:Icon(Icons.home),label:'Home');
              if(index <= roleEntities.length){final entity=roleEntities[index-1];return NavigationDestination(icon:Icon(entity.icon),selectedIcon:Icon(entity.icon,fill:1),label:entity.pluralName);}
              final feature=features[index-1-roleEntities.length];return NavigationDestination(icon:Icon(feature.icon),selectedIcon:Icon(feature.icon),label:feature.title);
            }).toList(),
          );
        }),
      );
    });
  }
}

class UniversalFeatureScreen extends StatelessWidget {
  final NormalizedMemoryStore store;
  final ShellFeature feature;
  const UniversalFeatureScreen({super.key, required this.store, required this.feature});

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: store,
    builder: (context, _) => ListView(padding: const EdgeInsets.all(20), children: <Widget>[
      Row(children: <Widget>[
        CircleAvatar(radius: 26, backgroundColor: appPrimary.withOpacity(0.14), child: Icon(feature.icon, color: appPrimary)),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
          Text(feature.title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(feature.description),
        ])),
      ]),
      const SizedBox(height: 22),
      _body(context),
    ]),
  );

  Widget _body(BuildContext context) {
    switch (feature.title) {
      case 'Quick Create': return _quickCreate(context);
      case 'Categories': return _categories();
      case 'Calendar': return _calendar(context);
      case 'Analytics': return _analytics();
      case 'Reports': return _reports(context);
      case 'Favorites': return _favorites();
      case 'Activity': return _activity();
      case 'Notifications': return _notifications();
      case 'Profile': return _profile();
      case 'Settings': return _settings();
      case 'Help & Guide': return _help();
      default: return _moduleOverview();
    }
  }

  Widget _quickCreate(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
    const Text('Choose what to create', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
    const SizedBox(height: 10),
    ...entityDefinitions.map((entity) => Card(child: ListTile(
      leading: CircleAvatar(backgroundColor: appPrimary.withOpacity(.12), child: Icon(entity.icon, color: appPrimary)),
      title: Text('New ' + entity.name, style: const TextStyle(fontWeight: FontWeight.w800)),
      subtitle: Text(entity.fields.where((f) => f.id != 'id').take(3).map((f) => f.label).join(' • ')),
      trailing: const Icon(Icons.add_circle_outline),
      onTap: entity.canCreate ? () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => EntityFormScreen(store: store, entity: entity))) : null,
    ))),
  ]);

  Widget _categories() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
    const Text('Data modules', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
    const SizedBox(height: 10),
    ...entityDefinitions.map((entity) => Card(child: Padding(padding: const EdgeInsets.all(16), child: Row(children:<Widget>[
      Icon(entity.icon, color: appPrimary), const SizedBox(width:12), Expanded(child: Column(crossAxisAlignment:CrossAxisAlignment.start, children:<Widget>[Text(entity.pluralName, style:const TextStyle(fontWeight:FontWeight.w900)), Text(entity.fields.length.toString()+' fields')])), Chip(label:Text(store.records(entity.id).length.toString()+' records')),
    ])))),
  ]);

  Widget _calendar(BuildContext context) {
    final calendarViews = viewDefinitions.where((view) => view['type'] == 'calendar').toList();
    if (calendarViews.isNotEmpty) return Column(children: calendarViews.map((view)=>Card(child:ListTile(leading:const Icon(Icons.calendar_month,color:appPrimary),title:Text(view['title'].toString()),subtitle:const Text('Open scheduled records by date'),trailing:const Icon(Icons.chevron_right),onTap:()=>Navigator.push(context,MaterialPageRoute<void>(builder:(_)=>CalendarScreen(store:store,view:view)))))).toList());
    final now=DateTime.now();
    return Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[
      Text('Upcoming • '+now.year.toString(),style:const TextStyle(fontWeight:FontWeight.w900,fontSize:18)),const SizedBox(height:10),
      ...entityDefinitions.take(4).map((entity)=>Card(child:ListTile(leading:const Icon(Icons.event_note_outlined,color:appPrimary),title:Text(entity.pluralName),subtitle:Text(store.records(entity.id).length.toString()+' records available for scheduling')))),
    ]);
  }

  Widget _analytics() {
    final totals=entityDefinitions.map((e)=>store.records(e.id).length).toList();
    final total=totals.fold<int>(0,(a,b)=>a+b);
    final maxValue=totals.isEmpty?1:totals.reduce((a,b)=>a>b?a:b).clamp(1,999999);
    return Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[
      Wrap(spacing:12,runSpacing:12,children:<Widget>[_metric('Total records',total.toString(),Icons.dataset_outlined),_metric('Modules',entityDefinitions.length.toString(),Icons.account_tree_outlined),_metric('Relations',relationshipDefinitions.length.toString(),Icons.link)]),
      const SizedBox(height:22),const Text('Records by module',style:TextStyle(fontSize:18,fontWeight:FontWeight.w900)),const SizedBox(height:12),
      ...entityDefinitions.map((entity){final count=store.records(entity.id).length;return Padding(padding:const EdgeInsets.only(bottom:12),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[Row(mainAxisAlignment:MainAxisAlignment.spaceBetween,children:<Widget>[Text(entity.pluralName),Text(count.toString())]),const SizedBox(height:6),LinearProgressIndicator(value:count/maxValue,color:appPrimary,backgroundColor:appPrimary.withOpacity(.10))]));}),
    ]);
  }

  Widget _reports(BuildContext context) => Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[
    ...entityDefinitions.map((entity)=>Card(child:ListTile(leading:const Icon(Icons.description_outlined,color:appPrimary),title:Text(entity.pluralName+' report',style:const TextStyle(fontWeight:FontWeight.w800)),subtitle:Text(store.records(entity.id).length.toString()+' rows • generated now'),trailing:IconButton(icon:const Icon(Icons.download_outlined),onPressed:()=>ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(entity.name+' report prepared'))))))),
  ]);

  Widget _favorites() => Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[
    const Text('Pinned modules',style:TextStyle(fontSize:18,fontWeight:FontWeight.w900)),const SizedBox(height:10),
    ...entityDefinitions.take(4).map((entity)=>Card(child:ListTile(leading:const Icon(Icons.star_rounded,color:appPrimary),title:Text(entity.pluralName,style:const TextStyle(fontWeight:FontWeight.w800)),subtitle:Text('Quick access • '+store.records(entity.id).length.toString()+' records')))),
  ]);

  Widget _activity() => Column(children:<Widget>[
    ...entityDefinitions.take(5).toList().asMap().entries.map((entry)=>Padding(padding:const EdgeInsets.only(bottom:12),child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[CircleAvatar(radius:18,backgroundColor:appPrimary.withOpacity(.12),child:Icon(entry.value.icon,size:18,color:appPrimary)),const SizedBox(width:12),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[Text(entry.value.name+' workspace checked',style:const TextStyle(fontWeight:FontWeight.w800)),Text(store.records(entry.value.id).length.toString()+' records currently available'),Text(entry.key==0?'Just now':entry.key.toString()+'h ago',style:TextStyle(color:appText.withOpacity(.5),fontSize:12))]))]))),
  ]);

  Widget _notifications() => Column(children:<Widget>[
    ...entityDefinitions.take(3).map((entity)=>Card(child:ListTile(leading:CircleAvatar(backgroundColor:appPrimary.withOpacity(.14),child:const Icon(Icons.notifications_active_outlined,color:appPrimary)),title:Text(entity.pluralName+' update'),subtitle:Text(store.records(entity.id).isEmpty?'No records yet — add the first one':'Review '+store.records(entity.id).length.toString()+' active records'),trailing:const Icon(Icons.circle,size:9,color:appPrimary)))),
    const Card(child:ListTile(leading:Icon(Icons.cloud_done_outlined,color:appPrimary),title:Text('Workspace synchronized'),subtitle:Text('Your local generated data is ready'))),
  ]);

  Widget _profile() => Column(crossAxisAlignment:CrossAxisAlignment.center,children:<Widget>[
    const CircleAvatar(radius:46,backgroundColor:appPrimary,child:Icon(Icons.person_rounded,size:46,color:Colors.white)),const SizedBox(height:14),const Text('Workspace User',style:TextStyle(fontWeight:FontWeight.w900,fontSize:20)),const SizedBox(height:4),Text(entityDefinitions.length.toString()+' modules available',style:TextStyle(color:appText.withOpacity(.58))),const SizedBox(height:20),const TextField(decoration:InputDecoration(labelText:'Display name',prefixIcon:Icon(Icons.badge_outlined))),const SizedBox(height:12),const TextField(decoration:InputDecoration(labelText:'Email',prefixIcon:Icon(Icons.email_outlined))),
  ]);

  Widget _settings() => Column(children:<Widget>[
    const SwitchListTile(value:true,onChanged:null,secondary:Icon(Icons.notifications_outlined),title:Text('Notifications'),subtitle:Text('Workspace updates enabled')),
    const SwitchListTile(value:false,onChanged:null,secondary:Icon(Icons.dark_mode_outlined),title:Text('Dark preference'),subtitle:Text('Uses generated theme defaults')),
    const ListTile(leading:Icon(Icons.security_outlined),title:Text('Privacy & access'),trailing:Icon(Icons.chevron_right)),
    const ListTile(leading:Icon(Icons.storage_outlined),title:Text('Storage mode'),subtitle:Text('Generated memory store')),
  ]);

  Widget _help() => Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[
    const Text('Generated app guide',style:TextStyle(fontSize:18,fontWeight:FontWeight.w900)),const SizedBox(height:10),
    const Card(child:ListTile(leading:Icon(Icons.touch_app_outlined,color:appPrimary),title:Text('Navigate'),subtitle:Text('Use bottom navigation for primary actions and the menu for every module.'))),
    Card(child:ListTile(leading:const Icon(Icons.account_tree_outlined,color:appPrimary),title:const Text('Data model'),subtitle:Text(entityDefinitions.map((e)=>e.name).join(' • ')))),
    Card(child:ListTile(leading:const Icon(Icons.link,color:appPrimary),title:const Text('Relationships'),subtitle:Text(relationshipDefinitions.isEmpty?'No cross-module relationships are required':relationshipDefinitions.length.toString()+' relationships are wired'))),
  ]);

  Widget _moduleOverview() {
    final total = entityDefinitions.fold<int>(0, (sum, entity) => sum + store.records(entity.id).length);
    return Wrap(spacing:12,runSpacing:12,children:<Widget>[_metric('Total records',total.toString(),Icons.folder_copy_outlined),_metric('Data modules',entityDefinitions.length.toString(),Icons.account_tree_outlined),_metric('Relationships',relationshipDefinitions.length.toString(),Icons.link)]);
  }

  Widget _metric(String label, String value, IconData icon) => Container(width:190,padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:appSurface,borderRadius:BorderRadius.circular(18),border:Border.all(color:appPrimary.withOpacity(.14))),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[Icon(icon,color:appPrimary),const SizedBox(height:10),Text(value,style:const TextStyle(fontSize:20,fontWeight:FontWeight.w900)),Text(label)]));
}

class DashboardScreen extends StatelessWidget {
  final NormalizedMemoryStore store;
  final List<EntityDefinition> entities;
  final String? activeRole;
  final List<String> cards;
  final String primaryActionLabel;
  final String primaryActionEntityId;
  final ValueChanged<int> onOpenEntity;
  const DashboardScreen({super.key, required this.store, required this.entities, required this.onOpenEntity, this.activeRole, this.cards = const <String>[], this.primaryActionLabel = '', this.primaryActionEntityId = ''});

  EntityDefinition? _entityForLabel(String label) {
    final clean = label.toLowerCase();
    for (final entity in entities) {
      final one = entity.name.toLowerCase();
      final many = entity.pluralName.toLowerCase();
      if (clean.contains(one) || clean.contains(many) || one.contains(clean) || many.contains(clean)) return entity;
    }
    return null;
  }

  void _runPrimaryAction(BuildContext context) {
    if (primaryActionEntityId.isNotEmpty) {
      for (final entity in entities) {
        if (entity.id != primaryActionEntityId) continue;
        if (entity.canCreate && roleCan(activeRole, entity.id, 'create')) {
          Navigator.push(context, MaterialPageRoute<void>(builder: (_) => EntityFormScreen(store: store, entity: entity)));
        } else {
          Navigator.push(context, MaterialPageRoute<void>(builder: (_) => Scaffold(appBar:AppBar(title:Text(entity.pluralName)),body:EntityListScreen(store:store,entity:entity,activeRole:activeRole))));
        }
        return;
      }
    }
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(primaryActionLabel.isEmpty ? 'No quick action is configured for this role.' : primaryActionLabel + ' is available from the relevant module.')));
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(animation: store, builder: (context, _) {
    final roleTitle = activeRole == null ? 'Operations overview' : activeRole! + ' workspace';
    final roleSubtitle = activeRole == null ? 'Live statistics across every part of your application.' : 'Your dashboard only shows the modules and actions relevant to this role.';
    return ListView(padding: const EdgeInsets.all(20), children: <Widget>[
      if (store.isLoading) const LinearProgressIndicator(),
      if (store.lastError != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: MaterialBanner(content: Text(store.lastError!), actions: const <Widget>[SizedBox.shrink()])),
      Container(padding: const EdgeInsets.all(24), decoration: BoxDecoration(gradient: const LinearGradient(colors: <Color>[appPrimary, appSecondary]), borderRadius: BorderRadius.circular(28)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
        const Icon(Icons.auto_awesome, color: Colors.white, size: 32), const SizedBox(height: 16),
        Text(roleTitle, style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
        const SizedBox(height: 6), Text(roleSubtitle, style: const TextStyle(color: Colors.white70)),
        if (primaryActionLabel.isNotEmpty) ...<Widget>[
          const SizedBox(height: 18),
          FilledButton.icon(onPressed: () => _runPrimaryAction(context), style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: appPrimary), icon: const Icon(Icons.bolt_rounded), label: Text(primaryActionLabel)),
        ],
      ])),
      const SizedBox(height: 20),
      if (cards.isNotEmpty) ...<Widget>[
        Text(activeRole == null ? 'Highlights' : activeRole! + ' priorities', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
        const SizedBox(height: 10),
        LayoutBuilder(builder: (context, constraints) {
          final columns = constraints.maxWidth > 900 ? 4 : constraints.maxWidth > 560 ? 2 : 1;
          return GridView.count(crossAxisCount: columns, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: columns == 1 ? 3.6 : 2.0, children: cards.asMap().entries.map((entry) {
            final related = _entityForLabel(entry.value);
            final accent = appAccent(entry.key);
            final value = related == null ? 'Ready' : store.records(related.id).length.toString();
            return Card(child: Padding(padding: const EdgeInsets.all(16), child: Row(children:<Widget>[
              CircleAvatar(backgroundColor:accent.withOpacity(.14),child:Icon(related?.icon ?? Icons.insights_outlined,color:accent)),
              const SizedBox(width:12), Expanded(child:Column(mainAxisAlignment:MainAxisAlignment.center,crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[Text(entry.value,style:const TextStyle(fontWeight:FontWeight.w800)),const SizedBox(height:3),Text(value,style:TextStyle(color:appText.withOpacity(.60)))])),
            ])));
          }).toList());
        }),
        const SizedBox(height: 18),
      ],
      ...viewDefinitions.map((view) => view['type'] == 'calendar'
        ? Card(child: ListTile(leading: const Icon(Icons.calendar_month), title: Text(view['title'].toString()), trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => CalendarScreen(store: store, view: view)))))
        : BudgetSummary(store: store, view: view)),
      const Text('Your modules', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
      const SizedBox(height: 10),
      LayoutBuilder(builder: (context, constraints) { final columns = constraints.maxWidth > 1000 ? 4 : constraints.maxWidth > 600 ? 3 : 2; return GridView.count(crossAxisCount: columns, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.35, children: entities.asMap().entries.map((entry) { final accent=appAccent(entry.key); return Card(child: InkWell(borderRadius: BorderRadius.circular(18), onTap: () => onOpenEntity(entry.key), child: Container(decoration:BoxDecoration(gradient:LinearGradient(colors:<Color>[accent.withOpacity(.16),accent.withOpacity(.05)]),borderRadius:BorderRadius.circular(18)),padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
        Icon(entry.value.icon, color: accent), const Spacer(), Text(store.records(entry.value.id).length.toString(), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900)), Text(entry.value.pluralName, maxLines: 1, overflow: TextOverflow.ellipsis),
      ])))); }).toList()); }),
    ]);
  });
}

class BudgetSummary extends StatelessWidget {
  final NormalizedMemoryStore store;
  final Map<String, dynamic> view;
  final String? recordId;
  const BudgetSummary({super.key, required this.store, required this.view, this.recordId});
  @override
  Widget build(BuildContext context) {
    final parents = store.records(view['entityId'].toString()).where((row) => recordId == null || row['id'] == recordId).toList();
    final ids = parents.map((row) => row['id']).toSet();
    final budget = parents.fold<double>(0, (sum, row) => sum + (num.tryParse(row[view['budgetField']].toString()) ?? 0));
    final actual = store.records(view['expenseEntity'].toString()).where((row) => ids.contains(row[view['foreignKey']])).fold<double>(0, (sum, row) => sum + (num.tryParse(row[view['amountField']].toString()) ?? 0));
    return Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
      Text(view['title'].toString(), style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 12),
      Wrap(spacing: 24, runSpacing: 8, children: <Widget>[Text('Budget: ' + budget.toStringAsFixed(2)), Text('Actual: ' + actual.toStringAsFixed(2)), Text('Remaining: ' + (budget - actual).toStringAsFixed(2), style: TextStyle(color: actual > budget ? Colors.red : Colors.green))]),
      const SizedBox(height: 12), LinearProgressIndicator(value: budget > 0 ? (actual / budget).clamp(0.0, 1.0).toDouble() : 0, color: actual > budget ? Colors.red : appPrimary),
    ])));
  }
}

class CalendarScreen extends StatefulWidget {
  final NormalizedMemoryStore store;
  final Map<String, dynamic> view;
  const CalendarScreen({super.key, required this.store, required this.view});
  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}
class _CalendarScreenState extends State<CalendarScreen> {
  DateTime selected = DateTime.now();
  @override
  Widget build(BuildContext context) => AnimatedBuilder(animation: widget.store, builder: (context, _) {
    final entity = entityById(widget.view['entityId'].toString());
    final rows = widget.store.records(entity.id).where((row) { final date = DateTime.tryParse((row[widget.view['dateField']] ?? '').toString()); return date != null && date.year == selected.year && date.month == selected.month && date.day == selected.day; }).toList();
    return Scaffold(appBar: AppBar(title: Text(widget.view['title'].toString())), body: ListView(padding: const EdgeInsets.all(16), children: <Widget>[
      CalendarDatePicker(initialDate: selected, firstDate: DateTime(1900), lastDate: DateTime(2200), onDateChanged: (value) => setState(() => selected = value)),
      Text(rows.length.toString() + ' scheduled', style: Theme.of(context).textTheme.titleLarge),
      if (rows.isEmpty) const Padding(padding: EdgeInsets.all(20), child: Text('Nothing scheduled for this day.')),
      ...rows.map((row) => Card(child: ListTile(title: Text((row[entity.displayField] ?? entity.name).toString()), subtitle: Text((row['status'] ?? '').toString()), trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => EntityDetailsScreen(store: widget.store, entity: entity, recordId: row['id'].toString())))))),
      FilledButton.icon(icon: const Icon(Icons.add), label: Text('Add ' + entity.name), onPressed: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => EntityFormScreen(store: widget.store, entity: entity, initialValues: <String, dynamic>{widget.view['dateField'].toString(): selected.toIso8601String().split('T').first})))),
    ]));
  });
}

class EntityListScreen extends StatefulWidget {
  final NormalizedMemoryStore store;
  final EntityDefinition entity;
  final String? activeRole;
  const EntityListScreen({super.key, required this.store, required this.entity, this.activeRole});
  @override
  State<EntityListScreen> createState() => _EntityListScreenState();
}

class _EntityListScreenState extends State<EntityListScreen> {
  String query = '';
  String? sortField;
  bool descending = false;
  String? filterField;
  String? filterValue;
  @override
  Widget build(BuildContext context) => AnimatedBuilder(animation: widget.store, builder: (context, _) {
    if (widget.store.isLoading) return const Center(child: CircularProgressIndicator());
    final records = widget.store.records(widget.entity.id).where((record) => record.values.join(' ').toLowerCase().contains(query.toLowerCase()) && (filterField == null || filterValue == null || record[filterField].toString() == filterValue)).toList();
    final orderBy = sortField ?? widget.entity.displayField;
    records.sort((a, b) { final x = a[orderBy], y = b[orderBy]; final comparison = x is num && y is num ? x.compareTo(y) : (x ?? '').toString().toLowerCase().compareTo((y ?? '').toString().toLowerCase()); return descending ? -comparison : comparison; });
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: widget.entity.canCreate && roleCan(widget.activeRole, widget.entity.id, 'create') ? FloatingActionButton.extended(onPressed: () => _openForm(context), icon: const Icon(Icons.add), label: Text('Add ' + widget.entity.name)) : null,
      body: Column(children: <Widget>[
        Padding(padding: const EdgeInsets.fromLTRB(16, 12, 16, 8), child: TextField(onChanged: (value) => setState(() => query = value), decoration: InputDecoration(hintText: 'Search ' + widget.entity.pluralName.toLowerCase(), prefixIcon: const Icon(Icons.search), border: OutlineInputBorder(borderRadius: BorderRadius.circular(18))))),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Wrap(spacing: 12, crossAxisAlignment: WrapCrossAlignment.center, children: <Widget>[
          DropdownButton<String>(value: orderBy, items: widget.entity.fields.map((f) => DropdownMenuItem(value: f.id, child: Text('Sort: ' + f.label))).toList(), onChanged: (value) => setState(() => sortField = value)),
          IconButton(tooltip: 'Reverse sort order', icon: Icon(descending ? Icons.arrow_downward : Icons.arrow_upward), onPressed: () => setState(() => descending = !descending)),
          DropdownButton<String>(hint: const Text('Filter field'), value: filterField, items: widget.entity.fields.map((f) => DropdownMenuItem(value: f.id, child: Text(f.label))).toList(), onChanged: (value) => setState(() { filterField = value; filterValue = null; })),
          if (filterField != null) DropdownButton<String>(hint: const Text('Value'), value: filterValue, items: widget.store.records(widget.entity.id).map((r) => (r[filterField] ?? '').toString()).toSet().map((value) => DropdownMenuItem(value: value, child: Text(value.isEmpty ? '(empty)' : value))).toList(), onChanged: (value) => setState(() => filterValue = value)),
          if (filterField != null) IconButton(tooltip: 'Clear filter', icon: const Icon(Icons.clear), onPressed: () => setState(() { filterField = null; filterValue = null; })),
        ])),
        Expanded(child: records.isEmpty ? _EmptyState(entity: widget.entity, hasQuery: query.isNotEmpty) : ListView.builder(padding: const EdgeInsets.fromLTRB(16, 8, 16, 96), itemCount: records.length, itemBuilder: (context, index) {
          final record = records[index];
          final subtitle = widget.entity.fields.where((field) => field.id != widget.entity.displayField).take(2).map((field) => (record[field.id] ?? '').toString()).where((value) => value.isNotEmpty).join(' • ');
          final entityIndex = entityDefinitions.indexWhere((item) => item.id == widget.entity.id);
          final accent = appAccent(entityIndex < 0 ? 0 : entityIndex);
          return Card(margin: const EdgeInsets.only(bottom: 10), child: ListTile(contentPadding: const EdgeInsets.all(14), leading: CircleAvatar(backgroundColor: accent.withOpacity(0.14), child: Icon(widget.entity.icon, color: accent)), title: Text((record[widget.entity.displayField] ?? widget.entity.name).toString(), style: const TextStyle(fontWeight: FontWeight.w800)), subtitle: subtitle.isEmpty ? null : Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis), trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => EntityDetailsScreen(store: widget.store, entity: widget.entity, recordId: record['id'].toString(), activeRole: widget.activeRole)))));
        })),
      ]),
    );
  });

  Future<void> _openForm(BuildContext context, {Map<String, dynamic>? record}) async {
    await Navigator.push(context, MaterialPageRoute<void>(builder: (_) => EntityFormScreen(store: widget.store, entity: widget.entity, record: record)));
  }
}

class EntityDetailsScreen extends StatelessWidget {
  final NormalizedMemoryStore store;
  final EntityDefinition entity;
  final String recordId;
  final String? activeRole;
  const EntityDetailsScreen({super.key, required this.store, required this.entity, required this.recordId, this.activeRole});
  @override
  Widget build(BuildContext context) => AnimatedBuilder(animation: store, builder: (context, _) {
    final record = store.find(entity.id, recordId);
    if (record == null) return Scaffold(appBar: AppBar(), body: const Center(child: Text('This record no longer exists.')));
    final relationships = relationshipDefinitions.where((item) => item.sourceEntity == entity.id || item.targetEntity == entity.id).toList();
    return Scaffold(appBar: AppBar(title: Text((record[entity.displayField] ?? entity.name).toString()), actions: <Widget>[
      if (entity.canUpdate && roleCan(activeRole, entity.id, 'update')) IconButton(tooltip: 'Edit', icon: const Icon(Icons.edit_outlined), onPressed: () async { await Navigator.push(context, MaterialPageRoute<void>(builder: (_) => EntityFormScreen(store: store, entity: entity, record: record))); }),
      if (entity.canDelete && roleCan(activeRole, entity.id, 'delete')) IconButton(tooltip: 'Delete', icon: const Icon(Icons.delete_outline, color: Colors.redAccent), onPressed: () => _delete(context)),
    ]), body: ListView(padding: const EdgeInsets.all(18), children: <Widget>[
      ...viewDefinitions.where((view) => view['type'] == 'budget' && view['entityId'] == entity.id).map((view) => BudgetSummary(store: store, view: view, recordId: recordId)),
      ...entity.fields.where((field) => field.id != 'id').map((field) => _DetailRow(field: field, value: _displayValue(field, record[field.id]))),
      ...relationships.map((relationship) {
        final relatedEntity = entityById(relationship.sourceEntity == entity.id ? relationship.targetEntity : relationship.sourceEntity);
        final related = store.related(relationship.id, entity.id, recordId);
        return Padding(padding: const EdgeInsets.only(top: 18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
          Text(relatedEntity.pluralName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)), const SizedBox(height: 8),
          if (related.isEmpty) Text('No related ' + relatedEntity.pluralName.toLowerCase() + '.', style: TextStyle(color: appText.withOpacity(0.55)))
          else ...related.map((item) => Card(child: ListTile(leading: Icon(relatedEntity.icon, color: appPrimary), title: Text((item[relatedEntity.displayField] ?? relatedEntity.name).toString()), trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => EntityDetailsScreen(store: store, entity: relatedEntity, recordId: item['id'].toString(), activeRole: activeRole)))))),
        ]));
      }),
    ]));
  });

  String _displayValue(FieldDefinition field, dynamic value) {
    if (field.referenceEntity != null && value != null) {
      final target = entityById(field.referenceEntity!);
      final record = store.find(target.id, value.toString());
      if (record != null) return (record[target.displayField] ?? value).toString();
    }
    if (value is List) return value.join(', ');
    return value == null || value.toString().trim().isEmpty ? 'Not provided' : value.toString();
  }

  Future<void> _delete(BuildContext context) async {
    final confirmed = await showDialog<bool>(context: context, builder: (dialogContext) => AlertDialog(title: Text('Delete ' + entity.name + '?'), content: const Text('This action checks relationship integrity and cannot be undone.'), actions: <Widget>[TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Delete'))])) ?? false;
    if (!confirmed || !context.mounted) return;
    final error = store.delete(entity.id, recordId);
    if (error != null) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error))); return; }
    Navigator.pop(context);
  }
}

class EntityFormScreen extends StatefulWidget {
  final NormalizedMemoryStore store;
  final EntityDefinition entity;
  final Map<String, dynamic>? record;
  final Map<String, dynamic> initialValues;
  const EntityFormScreen({super.key, required this.store, required this.entity, this.record, this.initialValues = const <String, dynamic>{}});
  @override
  State<EntityFormScreen> createState() => _EntityFormScreenState();
}

class _EntityFormScreenState extends State<EntityFormScreen> {
  final formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> controllers = <String, TextEditingController>{};
  final Map<String, dynamic> values = <String, dynamic>{};
  final Map<String, Set<String>> relationshipSelections = <String, Set<String>>{};
  @override
  void initState() {
    super.initState();
    for (final field in widget.entity.fields) {
      final value = widget.record?[field.id] ?? widget.initialValues[field.id] ?? '';
      values[field.id] = value;
      controllers[field.id] = TextEditingController(text: value.toString());
    }
    if (widget.record != null) {
      for (final relationship in relationshipDefinitions.where((item) => item.type == 'manyToMany' && (item.sourceEntity == widget.entity.id || item.targetEntity == widget.entity.id))) {
        relationshipSelections[relationship.id] = widget.store.related(relationship.id, widget.entity.id, widget.record!['id'].toString()).map((record) => record['id'].toString()).toSet();
      }
    }
  }
  @override
  void dispose() { for (final controller in controllers.values) { controller.dispose(); } super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final manyRelationships = relationshipDefinitions.where((item) => item.type == 'manyToMany' && (item.sourceEntity == widget.entity.id || item.targetEntity == widget.entity.id)).toList();
    return Scaffold(appBar: AppBar(title: Text((widget.record == null ? 'Add ' : 'Edit ') + widget.entity.name)), body: Form(key: formKey, child: ListView(padding: const EdgeInsets.all(18), children: <Widget>[
      ...widget.entity.fields.where((field) => !field.readOnly).map(_field),
      ...manyRelationships.map((relationship) => _relationshipPicker(relationship)),
      const SizedBox(height: 20), FilledButton.icon(onPressed: _save, icon: const Icon(Icons.save_outlined), label: Text(widget.record == null ? 'Create record' : 'Save changes'), style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16))),
    ])));
  }

  Widget _field(FieldDefinition field) {
    if (field.referenceEntity != null) {
      final target = entityById(field.referenceEntity!);
      return Padding(padding: const EdgeInsets.only(bottom: 14), child: DropdownButtonFormField<String>(value: values[field.id]?.toString().isEmpty == false ? values[field.id].toString() : null, decoration: InputDecoration(labelText: field.label, border: const OutlineInputBorder()), items: widget.store.records(target.id).map((record) => DropdownMenuItem<String>(value: record['id'].toString(), child: Text((record[target.displayField] ?? target.name).toString()))).toList(), validator: (value) => field.required && (value == null || value.isEmpty) ? field.label + ' is required' : null, onChanged: (value) => values[field.id] = value ?? ''));
    }
    if (field.options.isNotEmpty) {
      final current = field.options.contains(values[field.id]) ? values[field.id].toString() : null;
      return Padding(padding: const EdgeInsets.only(bottom: 14), child: DropdownButtonFormField<String>(value: current, decoration: InputDecoration(labelText: field.label, border: const OutlineInputBorder()), items: field.options.map((option) => DropdownMenuItem<String>(value: option, child: Text(option))).toList(), validator: (value) => field.required && (value == null || value.isEmpty) ? field.label + ' is required' : null, onChanged: (value) => values[field.id] = value ?? ''));
    }
    if (field.type == 'boolean') return Padding(padding: const EdgeInsets.only(bottom: 14), child: SwitchListTile(title: Text(field.label), value: values[field.id] == true, onChanged: (value) => setState(() => values[field.id] = value)));
    return Padding(padding: const EdgeInsets.only(bottom: 14), child: TextFormField(controller: controllers[field.id], maxLines: field.type == 'textarea' ? 4 : 1, keyboardType: field.type == 'number' ? const TextInputType.numberWithOptions(decimal: true, signed: true) : TextInputType.text, decoration: InputDecoration(labelText: field.label + (field.required ? ' *' : ''), border: const OutlineInputBorder(), suffixIcon: ['date', 'datetime'].contains(field.type) ? IconButton(icon: const Icon(Icons.calendar_month), onPressed: () async { final picked = await showDatePicker(context: context, initialDate: DateTime.tryParse(controllers[field.id]!.text) ?? DateTime.now(), firstDate: DateTime(1900), lastDate: DateTime(2200)); if (picked != null) controllers[field.id]!.text = picked.toIso8601String().split('T').first; }) : null), validator: (value) {
      final text = (value ?? '').trim();
      if (text.isEmpty) return field.required ? field.label + ' is required' : null;
      if (field.type == 'number' && (num.tryParse(text) == null || !num.parse(text).isFinite)) return 'Enter a valid number';
      if (['date', 'datetime'].contains(field.type) && DateTime.tryParse(text) == null) return 'Enter a valid ISO date';
      if (field.type == 'email' && (!text.contains('@') || !text.split('@').last.contains('.'))) return 'Enter a valid email';
      return null;
    }));
  }

  Widget _relationshipPicker(RelationshipDefinition relationship) {
    final other = entityById(relationship.sourceEntity == widget.entity.id ? relationship.targetEntity : relationship.sourceEntity);
    final selected = relationshipSelections.putIfAbsent(relationship.id, () => <String>{});
    return Card(margin: const EdgeInsets.only(bottom: 14), child: ExpansionTile(title: Text(other.pluralName, style: const TextStyle(fontWeight: FontWeight.w800)), subtitle: Text(selected.length.toString() + ' selected'), children: widget.store.records(other.id).map((record) { final id = record['id'].toString(); return CheckboxListTile(value: selected.contains(id), title: Text((record[other.displayField] ?? other.name).toString()), onChanged: (checked) => setState(() { if (checked == true) selected.add(id); else selected.remove(id); })); }).toList()));
  }

  void _save() {
    if (!(formKey.currentState?.validate() ?? false)) return;
    final payload = <String, dynamic>{};
    for (final field in widget.entity.fields) {
      if (field.readOnly) continue;
      if (field.type == 'boolean' || field.options.isNotEmpty || field.referenceEntity != null) payload[field.id] = values[field.id];
      else if (field.type == 'number') payload[field.id] = num.tryParse(controllers[field.id]?.text.trim() ?? '') ?? 0;
      else payload[field.id] = controllers[field.id]?.text.trim() ?? '';
    }
    try {
      widget.store.save(widget.entity.id, payload, id: widget.record?['id']?.toString(), selections: relationshipSelections);
      Navigator.pop(context);
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }
}

class _DetailRow extends StatelessWidget {
  final FieldDefinition field;
  final String value;
  const _DetailRow({required this.field, required this.value});
  @override
  Widget build(BuildContext context) => Card(margin: const EdgeInsets.only(bottom: 10), child: Padding(padding: const EdgeInsets.all(15), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[Icon(Icons.label_outline, color: appPrimary), const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[Text(field.label, style: TextStyle(color: appText.withOpacity(0.55), fontSize: 12)), const SizedBox(height: 3), Text(value, style: const TextStyle(fontWeight: FontWeight.w700))]))])));
}

class _EmptyState extends StatelessWidget {
  final EntityDefinition entity;
  final bool hasQuery;
  const _EmptyState({required this.entity, required this.hasQuery});
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: <Widget>[Icon(hasQuery ? Icons.search_off : entity.icon, size: 54, color: appPrimary), const SizedBox(height: 14), Text(hasQuery ? 'No matching records' : 'No ' + entity.pluralName.toLowerCase() + ' yet', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)), const SizedBox(height: 6), Text(hasQuery ? 'Try a different search.' : 'Create the first record to get started.')]))) ;
}
`.trim();

  const syntax = checkFlutterCodeSyntax(code);
  if (!syntax.valid) {
    const error = new Error(`Multi-entity compiler produced invalid Flutter structure: ${syntax.errors.join("; ")}`);
    error.generatedCode = code;
    throw error;
  }

  return {
    code,
    entrypoint: "lib/main.dart",
    fileManifest: [
      { path: "lib/main.dart", owner: "multiEntityCompiler", role: "previewEntrypoint", entities: spec.entities.map((entity) => entity.id) },
    ],
  };
}

module.exports = { buildMultiEntityFlutterApp, dartString, iconName, seedValue };
