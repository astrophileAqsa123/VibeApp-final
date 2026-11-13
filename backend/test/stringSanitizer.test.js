const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeGeneratedFlutterCode } = require('../services/exact500AppTemplates/flutterCodeSafety');

test('String conversion repair preserves real method names across repeated sanitation', () => {
  const input = `void main() { final raw = preferences.getString(_storageKey); final a = prefs.getString(value); final b = object.toString(); final c = String(value); }`;
  const once = sanitizeGeneratedFlutterCode(input);
  const twice = sanitizeGeneratedFlutterCode(once);
  for (const code of [once, twice]) {
    assert.ok(code.includes('preferences.getString(_storageKey)'));
    assert.ok(code.includes('prefs.getString(value)'));
    assert.ok(code.includes('object.toString()'));
    assert.ok(code.includes('final c = value.toString()'));
  }
});

test('previously corrupted compiler storage call is recovered on preview', () => {
  const input = `import 'package:shared_preferences/shared_preferences.dart';
class NormalizedMemoryStore { void load() { final raw = preferences.get_storageKey.toString(); } }`;
  assert.ok(sanitizeGeneratedFlutterCode(input).includes('preferences.getString(_storageKey)'));
});

test('repairs persisted legacy compact role gate before preview build', () => {
  const input = `
import 'package:flutter/material.dart';
class AppDesign { static const String name='Demo'; static const Color primary=Colors.blue; }
const List<String> generatedRoles = <String>['Patient','Doctor'];
class ContextAuthGate extends StatefulWidget { const ContextAuthGate({super.key}); @override State<ContextAuthGate> createState()=>_ContextAuthGateState(); }
class _ContextAuthGateState extends State<ContextAuthGate> {
  String? selectedRole; bool splash=true;
  @override Widget build(BuildContext context){
    return Scaffold(body:SafeArea(child:Center(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:480),child:ListView(shrinkWrap:true,padding:const EdgeInsets.all(24),children:[Text('Welcome to '+AppDesign.name),const SizedBox(height:22),...generatedRoles.map((r)=>Padding(padding:const EdgeInsets.only(bottom:10),child:FilledButton.tonalIcon(onPressed:()=>setState(()=>selectedRole=r),icon:const Icon(Icons.person_outline),label:Padding(padding:const EdgeInsets.symmetric(vertical:14),child:Text('Continue as '+r))))]))))));
  }
}
class ContextHomePage extends StatelessWidget { const ContextHomePage({super.key,this.initialRole,this.onLogout}); final String? initialRole; final VoidCallback? onLogout; @override Widget build(BuildContext context)=>const SizedBox(); }
void main()=>runApp(const MaterialApp(home:ContextAuthGate()));
`;
  const output = sanitizeGeneratedFlutterCode(input);
  assert.doesNotMatch(output, /generatedRoles\.map\(\(r\)=>Padding/);
  assert.match(output, /generatedRoles\.map<Widget>\(\(role\) \{/);
  assert.match(output, /if \(generatedRoles\.isEmpty\)/);
  assert.equal(sanitizeGeneratedFlutterCode(output), output);
});

test('removes persisted role gate entirely when generatedRoles is empty', () => {
  const input = `
import 'package:flutter/material.dart';
class AppDesign { static const String name='Demo'; static const Color primary=Colors.blue; }
const List<String> generatedRoles = <String>[];
class ContextAuthGate extends StatefulWidget { const ContextAuthGate({super.key}); @override State<ContextAuthGate> createState()=>_ContextAuthGateState(); }
class _ContextAuthGateState extends State<ContextAuthGate> {
  String? selectedRole;
  @override Widget build(BuildContext context){
    return Scaffold(body:SafeArea(child:Center(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:480),child:ListView(children:[const Text('Choose a role to enter the demo workspace'),...generatedRoles.map((r)=>Padding(padding:const EdgeInsets.all(8),child:Text('Continue as '+r)))]))))));
  }
}
class ContextHomePage extends StatelessWidget { const ContextHomePage({super.key}); @override Widget build(BuildContext context)=>const SizedBox(); }
void main()=>runApp(const MaterialApp(home: const ContextAuthGate()));
`;
  const output = sanitizeGeneratedFlutterCode(input);
  assert.doesNotMatch(output, /class ContextAuthGate/);
  assert.doesNotMatch(output, /class _ContextAuthGateState/);
  assert.doesNotMatch(output, /Choose a role to enter the demo workspace/);
  assert.match(output, /home: const ContextHomePage\(\)/);
});
