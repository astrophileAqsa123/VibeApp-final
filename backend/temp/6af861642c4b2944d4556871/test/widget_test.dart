import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:make_a_tution_fee_management_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
