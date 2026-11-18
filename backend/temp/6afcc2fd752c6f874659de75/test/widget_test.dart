import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:i_want_to_create_an_ecommerce_app_withh_al/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
