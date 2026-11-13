import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vibe_multi_validation/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory directory;
  late Box<String> database;
  late NormalizedMemoryStore store;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    directory = await Directory.systemTemp.createTemp('film-store-test-');
    Hive.init(directory.path);
    database = await Hive.openBox<String>('test');
    store = NormalizedMemoryStore(database: database);
    while (store.isLoading) { await Future<void>.delayed(Duration.zero); }
  });
  tearDown(() async {
    await store.flush();
    store.dispose();
    await Hive.close();
    await directory.delete(recursive: true);
  });

  test('seed foreign keys resolve and all relationships are navigable', () {
    for (final entity in entityDefinitions) {
      for (final field in entity.fields.where((f) => f.referenceEntity != null)) {
        for (final row in store.records(entity.id)) {
          expect(store.find(field.referenceEntity!, row[field.id].toString()), isNotNull);
        }
      }
    }
    expect(store.related('projectScene', 'project', 'project-1'), isNotEmpty);
    expect(store.related('sceneProp', 'scene', 'scene-1'), hasLength(2));
    expect(store.related('sceneProp', 'prop', 'prop-2'), hasLength(2));
  });

  test('deleting parent is blocked without changing data; child deletion is allowed', () {
    final before = store.records('project').length;
    expect(store.delete('project', 'project-1'), isNotNull);
    expect(store.records('project'), hasLength(before));
    expect(store.delete('expense', 'expense-1'), isNull);
    expect(store.find('expense', 'expense-1'), isNull);
  });

  test('invalid references are rejected', () {
    expect(() => store.save('task', {'title': 'Bad', 'projectId': 'missing'}), throwsStateError);
  });

  test('CRUD and many-to-many survive reopening without ID collisions', () async {
    final id = store.save('prop', {'name': 'Camera', 'category': 'Lens', 'condition': 'Good'});
    final relation = relationshipDefinitions.firstWhere((r) => r.id == 'sceneProp');
    store.syncManyToMany(relation, 'scene', 'scene-1', {id});
    await store.flush();
    final restored = NormalizedMemoryStore(database: database);
    while (restored.isLoading) { await Future<void>.delayed(Duration.zero); }
    expect(restored.find('prop', id)?['name'], 'Camera');
    expect(restored.related('sceneProp', 'scene', 'scene-1').single['id'], id);
    final next = restored.save('prop', {'name': 'Microphone'});
    expect(next, isNot(id));
    expect(restored.find('prop', id), isNotNull);
    await restored.flush();
    restored.dispose();
  });

  testWidgets('budget summary calculates expenses and details show related sections', (tester) async {
    final budget = viewDefinitions.firstWhere((v) => v['type'] == 'budget');
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: BudgetSummary(store: store, view: budget, recordId: 'project-1'))));
    expect(find.text('Budget: 10.00'), findsOneWidget);
    expect(find.text('Actual: 10.00'), findsOneWidget);
    await tester.pumpWidget(MaterialApp(home: EntityDetailsScreen(store: store, entity: entityById('scene'), recordId: 'scene-1')));
    await tester.scrollUntilVisible(find.text('Props'), 250);
    expect(find.text('Props'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('calendar and filters render without layout errors', (tester) async {
    await tester.pumpWidget(MaterialApp(home: CalendarScreen(store: store, view: viewDefinitions.firstWhere((v) => v['type'] == 'calendar'))));
    expect(find.byType(CalendarDatePicker), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(MaterialApp(home: EntityListScreen(store: store, entity: entityById('scene'))));
    expect(find.text('Sort: Title'), findsOneWidget);
    expect(find.text('Filter field'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
