import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:build_a_school_managemnet_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
