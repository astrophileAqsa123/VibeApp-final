function safeString(value = '') {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
function hex(value, fallback = '#2563EB') {
  const raw = String(value || fallback).replace('#','').toUpperCase();
  return /^[0-9A-F]{6}$/.test(raw) ? `Color(0xFF${raw})` : `Color(0xFF${fallback.replace('#','')})`;
}
function sharedPrelude(plan, extraImports = '') {
  const theme = plan.theme || {};
  const blueprintRoles = Array.isArray(plan?.appBlueprint?.roles) ? plan.appBlueprint.roles : [];
  const hasRoleMode = plan?.featurePolicies?.roleBased === true && blueprintRoles.length > 0;
  return `
import 'package:flutter/material.dart';
${extraImports}

void main() => runApp(const VibeContextApp());

class AppDesign {
  static const String name = '${safeString(plan.appName)}';
  static const String archetype = '${safeString(plan.archetype)}';
  static const String uiPreset = '${safeString(plan.uiPreset || 'modern')}';
  static const Color primary = ${hex(theme.primary, '#2563EB')};
  static const Color secondary = ${hex(theme.secondary, '#38BDF8')};
  static const Color background = ${hex(theme.background, '#F8FAFC')};
  static const Color surface = ${hex(theme.surface, '#FFFFFF')};
  static const Color text = ${hex(theme.text, '#0F172A')};
  static const Color accent = ${hex(theme.accent, '#10B981')};
  static double get radius => uiPreset == 'compact' ? 12 : (uiPreset == 'soft' ? 30 : (uiPreset == 'minimal' ? 14 : 22));
  static EdgeInsets get pagePadding => EdgeInsets.all(uiPreset == 'compact' ? 12 : 18);
}

class VibeContextApp extends StatelessWidget {
  const VibeContextApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: AppDesign.name,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: AppDesign.primary, brightness: Brightness.light),
        scaffoldBackgroundColor: AppDesign.background,
        inputDecorationTheme: InputDecorationTheme(filled: true, fillColor: AppDesign.surface, border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppDesign.radius), borderSide: BorderSide.none)),
      ),
      home: ${hasRoleMode ? 'const ContextAuthGate()' : 'const ContextHomePage()'},
    );
  }
}

class MetricCard extends StatelessWidget {
  final String label; final String value; final IconData icon; final Color? color;
  const MetricCard({super.key, required this.label, required this.value, required this.icon, this.color});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: AppDesign.surface, borderRadius: BorderRadius.circular(AppDesign.radius), border: Border.all(color: AppDesign.primary.withOpacity( .10))),
    child: Row(children:[Container(width:42,height:42,decoration:BoxDecoration(color:(color ?? AppDesign.primary).withOpacity(.12),borderRadius:BorderRadius.circular(14)),child:Icon(icon,color:color ?? AppDesign.primary)),const SizedBox(width:12),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(label,style:Theme.of(context).textTheme.labelMedium),const SizedBox(height:2),Text(value,style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.w800))]))])
  );
}

class SimpleBars extends StatelessWidget {
  final List<num> values; final List<String> labels; final double maxValue;
  const SimpleBars({super.key, required this.values, required this.labels, required this.maxValue});
  @override Widget build(BuildContext context) => SizedBox(height:150,child:Row(crossAxisAlignment:CrossAxisAlignment.end,children:List.generate(values.length,(i){final ratio=maxValue<=0?0.0:(values[i]/maxValue).clamp(0.0,1.0).toDouble();return Expanded(child:Padding(padding:const EdgeInsets.symmetric(horizontal:4),child:Column(mainAxisAlignment:MainAxisAlignment.end,children:[Expanded(child:Align(alignment:Alignment.bottomCenter,child:FractionallySizedBox(heightFactor:ratio == 0 ? .03 : ratio,child:Container(decoration:BoxDecoration(color:AppDesign.primary.withOpacity(.78),borderRadius:BorderRadius.circular(8)))))),const SizedBox(height:6),Text(labels[i],style:Theme.of(context).textTheme.labelSmall)])));}))); 
}
`;
}

function buildCalorieTracker(plan) {
  return `${sharedPrelude(plan)}
class FoodEntry { final String name; final int calories; final String meal; final DateTime time; FoodEntry(this.name,this.calories,this.meal,this.time); }
class ContextHomePage extends StatefulWidget { const ContextHomePage({super.key}); @override State<ContextHomePage> createState()=>_ContextHomePageState(); }
class _ContextHomePageState extends State<ContextHomePage> {
  int goal=2000;
  final List<FoodEntry> entries=[FoodEntry('Oatmeal',320,'Breakfast',DateTime.now()),FoodEntry('Chicken bowl',540,'Lunch',DateTime.now()),FoodEntry('Apple',95,'Snack',DateTime.now())];
  int get total=>entries.fold(0,(sum,e)=>sum+e.calories); int get remaining=>goal-total; double get progress=>(total/goal).clamp(0.0,1.0).toDouble();
  int mealTotal(String meal)=>entries.where((e)=>e.meal==meal).fold(0,(s,e)=>s+e.calories);
  void addFood(){final name=TextEditingController(), cal=TextEditingController();String meal='Breakfast';showDialog(context:context,builder:(ctx)=>StatefulBuilder(builder:(ctx,setLocal)=>AlertDialog(title:const Text('Add food'),content:Column(mainAxisSize:MainAxisSize.min,children:[TextField(controller:name,decoration:const InputDecoration(labelText:'Food name')),const SizedBox(height:10),TextField(controller:cal,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Calories')),const SizedBox(height:10),DropdownButtonFormField<String>(value:meal,items:['Breakfast','Lunch','Dinner','Snack'].map((m)=>DropdownMenuItem(value:m,child:Text(m))).toList(),onChanged:(v)=>setLocal(()=>meal=v ?? meal),decoration:const InputDecoration(labelText:'Meal'))]),actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:const Text('Cancel')),FilledButton(onPressed:(){final value=int.tryParse(cal.text.trim());if(name.text.trim().isEmpty||value==null||value<=0)return;setState(()=>entries.insert(0,FoodEntry(name.text.trim(),value,meal,DateTime.now())));Navigator.pop(ctx);},child:const Text('Add'))])));}
  @override Widget build(BuildContext context){final week=<double>[1420.0,1780.0,1650.0,2050.0,1890.0,total.toDouble(),0.0];return Scaffold(appBar:AppBar(title:Text(AppDesign.name),actions:[IconButton(onPressed:(){setState(()=>goal=goal==2000?1800:2000);},icon:const Icon(Icons.tune))]),floatingActionButton:FloatingActionButton.extended(onPressed:addFood,icon:const Icon(Icons.add),label:const Text('Add food')),body:SafeArea(child:ListView(padding:AppDesign.pagePadding,children:[Text('Today',style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w800)),const SizedBox(height:14),Container(padding:const EdgeInsets.all(20),decoration:BoxDecoration(gradient:LinearGradient(colors:[AppDesign.primary,AppDesign.secondary]),borderRadius:BorderRadius.circular(AppDesign.radius)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('$total kcal',style:Theme.of(context).textTheme.headlineMedium?.copyWith(color:Colors.white,fontWeight:FontWeight.w900)),Text('${'$'}{remaining>=0?remaining:0} kcal remaining of $goal',style:const TextStyle(color:Colors.white70)),const SizedBox(height:14),LinearProgressIndicator(value:progress,minHeight:10,borderRadius:BorderRadius.circular(20),backgroundColor:Colors.white24,color:Colors.white)])),const SizedBox(height:14),Row(children:[Expanded(child:MetricCard(label:'Breakfast',value:'${'$'}{mealTotal('Breakfast')} kcal',icon:Icons.free_breakfast)),const SizedBox(width:10),Expanded(child:MetricCard(label:'Lunch',value:'${'$'}{mealTotal('Lunch')} kcal',icon:Icons.lunch_dining))]),const SizedBox(height:10),Row(children:[Expanded(child:MetricCard(label:'Dinner',value:'${'$'}{mealTotal('Dinner')} kcal',icon:Icons.dinner_dining)),const SizedBox(width:10),Expanded(child:MetricCard(label:'Snacks',value:'${'$'}{mealTotal('Snack')} kcal',icon:Icons.cookie))]),const SizedBox(height:20),Text('Weekly calories',style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.w800)),const SizedBox(height:10),Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:AppDesign.surface,borderRadius:BorderRadius.circular(AppDesign.radius)),child:SimpleBars(values:week,labels:const ['M','T','W','T','F','S','S'],maxValue:2400.0)),const SizedBox(height:20),Text('Food log',style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.w800)),const SizedBox(height:8),...entries.map((e)=>Card(child:ListTile(leading:CircleAvatar(backgroundColor:AppDesign.primary.withOpacity(.12),child:Icon(Icons.restaurant,color:AppDesign.primary)),title:Text(e.name),subtitle:Text(e.meal),trailing:Text('${'$'}{e.calories} kcal',style:const TextStyle(fontWeight:FontWeight.w800))))),const SizedBox(height:80)])));}
}
`;
}

function buildFinance(plan) {
  return `${sharedPrelude(plan)}
class Tx { final String title,category; final double amount; final bool income; Tx(this.title,this.category,this.amount,this.income); }
class ContextHomePage extends StatefulWidget { const ContextHomePage({super.key}); @override State<ContextHomePage> createState()=>_ContextHomePageState(); }
class _ContextHomePageState extends State<ContextHomePage>{final tx=<Tx>[Tx('Salary','Income',3200,true),Tx('Groceries','Food',145,false),Tx('Transport','Travel',60,false),Tx('Internet','Bills',45,false)];double get income=>tx.where((e)=>e.income).fold(0,(s,e)=>s+e.amount);double get expense=>tx.where((e)=>!e.income).fold(0,(s,e)=>s+e.amount);double get balance=>income-expense;
void addTx(){final title=TextEditingController(),amount=TextEditingController();bool isIncome=false;String cat='Food';showDialog(context:context,builder:(ctx)=>StatefulBuilder(builder:(ctx,setLocal)=>AlertDialog(title:const Text('Add transaction'),content:Column(mainAxisSize:MainAxisSize.min,children:[TextField(controller:title,decoration:const InputDecoration(labelText:'Title')),const SizedBox(height:10),TextField(controller:amount,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Amount')),const SizedBox(height:10),SwitchListTile(contentPadding:EdgeInsets.zero,title:Text(isIncome?'Income':'Expense'),value:isIncome,onChanged:(v)=>setLocal(()=>isIncome=v)),if(!isIncome)DropdownButtonFormField<String>(value:cat,items:['Food','Travel','Bills','Shopping','Other'].map((v)=>DropdownMenuItem(value:v,child:Text(v))).toList(),onChanged:(v)=>setLocal(()=>cat=v??cat))]),actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:const Text('Cancel')),FilledButton(onPressed:(){final a=double.tryParse(amount.text);if(title.text.trim().isEmpty||a==null||a<=0)return;setState(()=>tx.insert(0,Tx(title.text.trim(),isIncome?'Income':cat,a,isIncome)));Navigator.pop(ctx);},child:const Text('Save'))])));}
@override Widget build(BuildContext context){final food=tx.where((e)=>!e.income&&e.category=='Food').fold<double>(0,(s,e)=>s+e.amount);final travel=tx.where((e)=>!e.income&&e.category=='Travel').fold<double>(0,(s,e)=>s+e.amount);final bills=tx.where((e)=>!e.income&&e.category=='Bills').fold<double>(0,(s,e)=>s+e.amount);final other=(expense-food-travel-bills).clamp(0.0,double.infinity).toDouble();return Scaffold(appBar:AppBar(title:Text(AppDesign.name)),floatingActionButton:FloatingActionButton.extended(onPressed:addTx,icon:const Icon(Icons.add),label:const Text('Transaction')),body:ListView(padding:AppDesign.pagePadding,children:[Container(padding:const EdgeInsets.all(22),decoration:BoxDecoration(color:AppDesign.primary,borderRadius:BorderRadius.circular(AppDesign.radius)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('Available balance',style:TextStyle(color:Colors.white70)),Text(r'${'$'}' + balance.toStringAsFixed(2),style:Theme.of(context).textTheme.headlineMedium?.copyWith(color:Colors.white,fontWeight:FontWeight.w900))])),const SizedBox(height:12),Row(children:[Expanded(child:MetricCard(label:'Income',value:r'${'$'}' + income.toStringAsFixed(0),icon:Icons.arrow_downward,color:Colors.green)),const SizedBox(width:10),Expanded(child:MetricCard(label:'Spent',value:r'${'$'}' + expense.toStringAsFixed(0),icon:Icons.arrow_upward,color:Colors.red))]),const SizedBox(height:20),Text('Spending by category',style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.w800)),const SizedBox(height:10),Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:AppDesign.surface,borderRadius:BorderRadius.circular(AppDesign.radius)),child:SimpleBars(values:[food,travel,bills,other],labels:const ['Food','Travel','Bills','Other'],maxValue:<double>[food,travel,bills,other,1.0].reduce((a,b)=>a>b?a:b))),const SizedBox(height:20),Text('Recent transactions',style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.w800)),...tx.map((e)=>Card(child:ListTile(leading:CircleAvatar(backgroundColor:(e.income?Colors.green:Colors.red).withOpacity(.12),child:Icon(e.income?Icons.south_west:Icons.north_east,color:e.income?Colors.green:Colors.red)),title:Text(e.title),subtitle:Text(e.category),trailing:Text((e.income?'+':'-') + r'${'$'}' + e.amount.toStringAsFixed(2),style:TextStyle(fontWeight:FontWeight.w800,color:e.income?Colors.green:Colors.red))))),const SizedBox(height:80)]));}}
`;
}

function buildTracker(plan) {
  const kind=safeString(plan.trackerKind || 'progress'); const unit=safeString(plan.unit || 'points'); const goal=Number(plan.goal || 100);
  const labels = kind==='hydration' ? ['250 ml','500 ml','750 ml'] : kind==='habit' ? ['Read','Walk','Meditate'] : kind==='workout' ? ['Run','Strength','Yoga'] : kind==='attendance' ? ['Present','Present','Absent'] : ['Entry A','Entry B','Entry C'];
  return `${sharedPrelude(plan)}
class TrackEntry{final String label;final double value;final DateTime time;TrackEntry(this.label,this.value,this.time);}
class ContextHomePage extends StatefulWidget{const ContextHomePage({super.key});@override State<ContextHomePage> createState()=>_ContextHomePageState();}
class _ContextHomePageState extends State<ContextHomePage>{double goal=${goal};final entries=<TrackEntry>[TrackEntry('${safeString(labels[0])}',${goal*0.16},DateTime.now()),TrackEntry('${safeString(labels[1])}',${goal*0.22},DateTime.now())];double get total=>entries.fold(0,(s,e)=>s+e.value);double get progress=>(total/goal).clamp(0.0,1.0).toDouble();void quickAdd(){setState(()=>entries.insert(0,TrackEntry('${kind==='habit'?'Completed habit':'Quick add'}',${kind==='hydration'?250:kind==='habit'?1:kind==='workout'?15:1},DateTime.now())));}void addEntry(){final label=TextEditingController(),value=TextEditingController();showDialog(context:context,builder:(ctx)=>AlertDialog(title:const Text('Add entry'),content:Column(mainAxisSize:MainAxisSize.min,children:[TextField(controller:label,decoration:const InputDecoration(labelText:'Label')),const SizedBox(height:10),TextField(controller:value,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Value'))]),actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:const Text('Cancel')),FilledButton(onPressed:(){final v=double.tryParse(value.text);if(label.text.trim().isEmpty||v==null)return;setState(()=>entries.insert(0,TrackEntry(label.text.trim(),v,DateTime.now())));Navigator.pop(ctx);},child:const Text('Add'))]));}
@override Widget build(BuildContext context){final history=[goal*.35,goal*.52,goal*.47,goal*.71,goal*.64,total,0.0];return Scaffold(appBar:AppBar(title:Text(AppDesign.name)),floatingActionButton:FloatingActionButton.extended(onPressed:addEntry,icon:const Icon(Icons.add),label:const Text('Add')),body:ListView(padding:AppDesign.pagePadding,children:[Text('Your ${safeString(kind)} progress',style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w800)),const SizedBox(height:14),Container(padding:const EdgeInsets.all(20),decoration:BoxDecoration(color:AppDesign.surface,borderRadius:BorderRadius.circular(AppDesign.radius)),child:Column(children:[Row(children:[Expanded(child:Text('${kind==='habit'?'Today':'Current'}',style:Theme.of(context).textTheme.titleMedium)),Text('${'$'}{total.toStringAsFixed(0)} / ${'$'}{goal.toStringAsFixed(0)} ${safeString(unit)}',style:const TextStyle(fontWeight:FontWeight.w800))]),const SizedBox(height:14),LinearProgressIndicator(value:progress,minHeight:12,borderRadius:BorderRadius.circular(20)),const SizedBox(height:12),FilledButton.icon(onPressed:quickAdd,icon:const Icon(Icons.bolt),label:const Text('Quick add'))])),const SizedBox(height:20),Text('7-day trend',style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.w800)),const SizedBox(height:10),Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:AppDesign.surface,borderRadius:BorderRadius.circular(AppDesign.radius)),child:SimpleBars(values:history,labels:const ['M','T','W','T','F','S','S'],maxValue:goal)),const SizedBox(height:20),Text('Recent activity',style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.w800)),...entries.map((e)=>Card(child:ListTile(leading:CircleAvatar(child:Icon(Icons.check,color:AppDesign.primary)),title:Text(e.label),subtitle:Text('Today'),trailing:Text('${'$'}{e.value.toStringAsFixed(e.value%1==0?0:1)} ${safeString(unit)}',style:const TextStyle(fontWeight:FontWeight.w800))))),const SizedBox(height:80)]));}}
`;
}

function buildCalculator(plan) {
  const kind=plan.calculatorKind || 'basic';
  if (kind==='basic') return buildBasicCalculator(plan);
  const configs={
    bmi:{title:'BMI calculator',a:'Weight (kg)',b:'Height (cm)',c:null,formula:'final result = b == 0 ? 0.0 : a / ((b / 100) * (b / 100));',suffix:'BMI'},
    tip:{title:'Tip & split',a:'Bill amount',b:'Tip %',c:'People',formula:'final people = c <= 0 ? 1.0 : c; final result = (a + (a * b / 100)) / people;',suffix:'per person'},
    loan:{title:'Loan payment',a:'Principal',b:'Annual interest %',c:'Months',formula:'final months = c <= 0 ? 1.0 : c; final monthlyRate = b / 1200; final result = (monthlyRate == 0 ? a / months : a * monthlyRate * (pow(1 + monthlyRate, months) / (pow(1 + monthlyRate, months) - 1))).toDouble();',suffix:'monthly'},
    grade:{title:'Grade calculator',a:'Score',b:'Total marks',c:null,formula:'final result = b <= 0 ? 0.0 : (a / b) * 100;',suffix:'%'},
  };
  const c=configs[kind]||configs.grade; const mathImport=kind==='loan'?"import 'dart:math';":"";
  return `${sharedPrelude(plan, mathImport)}
class ContextHomePage extends StatefulWidget{const ContextHomePage({super.key});@override State<ContextHomePage> createState()=>_ContextHomePageState();}
class _ContextHomePageState extends State<ContextHomePage>{final aC=TextEditingController(),bC=TextEditingController(),cC=TextEditingController();double? output;void calculate(){final a=double.tryParse(aC.text) ?? 0.0,b=double.tryParse(bC.text) ?? 0.0,c=double.tryParse(cC.text) ?? 0.0;${c.formula}setState(()=>output=result);}@override void dispose(){aC.dispose();bC.dispose();cC.dispose();super.dispose();}@override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:Text(AppDesign.name)),body:ListView(padding:AppDesign.pagePadding,children:[Text('${safeString(c.title)}',style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w900)),const SizedBox(height:8),Text('Enter the values below. Your result updates when you calculate.',style:Theme.of(context).textTheme.bodyMedium),const SizedBox(height:22),TextField(controller:aC,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'${safeString(c.a)}')),const SizedBox(height:12),TextField(controller:bC,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'${safeString(c.b)}')),${c.c?`const SizedBox(height:12),TextField(controller:cC,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'${safeString(c.c)}')),`:''}const SizedBox(height:18),FilledButton.icon(onPressed:calculate,icon:const Icon(Icons.calculate),label:const Text('Calculate')),const SizedBox(height:22),if(output!=null)Container(padding:const EdgeInsets.all(24),decoration:BoxDecoration(gradient:LinearGradient(colors:[AppDesign.primary,AppDesign.secondary]),borderRadius:BorderRadius.circular(AppDesign.radius)),child:Column(children:[const Text('Result',style:TextStyle(color:Colors.white70)),const SizedBox(height:6),Text(output!.toStringAsFixed(2),style:Theme.of(context).textTheme.displaySmall?.copyWith(color:Colors.white,fontWeight:FontWeight.w900)),Text('${safeString(c.suffix)}',style:const TextStyle(color:Colors.white70))]))]));}
`;
}

function buildBasicCalculator(plan){return `${sharedPrelude(plan)}
class ContextHomePage extends StatefulWidget{const ContextHomePage({super.key});@override State<ContextHomePage> createState()=>_ContextHomePageState();}
class _ContextHomePageState extends State<ContextHomePage>{String display='0';double? stored;String? op;bool replace=true;void input(String key){setState((){if(RegExp(r'^\\d$').hasMatch(key)||key=='.'){if(replace){display=key=='.'?'0.':key;replace=false;}else if(!(key=='.'&&display.contains('.')))display+=key;return;}if(key=='C'){display='0';stored=null;op=null;replace=true;return;}if(key=='⌫'){display=display.length>1?display.substring(0,display.length-1):'0';return;}if(key=='='){if(stored!=null&&op!=null){final b=double.tryParse(display) ?? 0.0;double r=stored!;if(op=='+')r+=b;if(op=='-')r-=b;if(op=='×')r*=b;if(op=='÷')r=b==0?0:r/b;display=r%1==0?r.toInt().toString():r.toStringAsFixed(6).replaceFirst(RegExp(r'0+$'),'').replaceFirst(RegExp(r'\\.$'),'');stored=null;op=null;replace=true;}return;}stored=double.tryParse(display) ?? 0.0;op=key;replace=true;});}
@override Widget build(BuildContext context){const keys=['C','⌫','÷','×','7','8','9','-','4','5','6','+','1','2','3','=','0','.'];return Scaffold(appBar:AppBar(title:Text(AppDesign.name)),body:SafeArea(child:Padding(padding:AppDesign.pagePadding,child:Column(children:[Expanded(child:Container(width:double.infinity,alignment:Alignment.bottomRight,padding:const EdgeInsets.all(24),decoration:BoxDecoration(color:AppDesign.surface,borderRadius:BorderRadius.circular(AppDesign.radius)),child:Text(display,style:Theme.of(context).textTheme.displayMedium?.copyWith(fontWeight:FontWeight.w700)))),const SizedBox(height:14),Expanded(flex:3,child:GridView.builder(itemCount:keys.length,gridDelegate:const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:4,crossAxisSpacing:10,mainAxisSpacing:10),itemBuilder:(context,i){final k=keys[i];final action=['+','-','×','÷','='].contains(k);return FilledButton.tonal(onPressed:()=>input(k),style:FilledButton.styleFrom(backgroundColor:action?AppDesign.primary:AppDesign.surface,foregroundColor:action?Colors.white:AppDesign.text,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(AppDesign.radius))),child:Text(k,style:const TextStyle(fontSize:22,fontWeight:FontWeight.w700)));}))]))));}}
`;}

function buildConverter(plan){return `${sharedPrelude(plan)}
class ContextHomePage extends StatefulWidget{const ContextHomePage({super.key});@override State<ContextHomePage> createState()=>_ContextHomePageState();}
class _ContextHomePageState extends State<ContextHomePage>{final input=TextEditingController();String from='Kilometers',to='Miles';double? result;final units=const ['Meters','Kilometers','Miles','Feet'];double toMeters(double v,String u){if(u=='Kilometers')return v*1000;if(u=='Miles')return v*1609.344;if(u=='Feet')return v*.3048;return v;}double fromMeters(double v,String u){if(u=='Kilometers')return v/1000;if(u=='Miles')return v/1609.344;if(u=='Feet')return v/.3048;return v;}void convert(){final v=double.tryParse(input.text);if(v==null)return;setState(()=>result=fromMeters(toMeters(v,from),to));}void swap(){setState((){final x=from;from=to;to=x;result=null;});}@override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:Text(AppDesign.name)),body:ListView(padding:AppDesign.pagePadding,children:[Text('Unit converter',style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w900)),const SizedBox(height:20),TextField(controller:input,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Value')),const SizedBox(height:12),Row(children:[Expanded(child:DropdownButtonFormField<String>(value:from,items:units.map((u)=>DropdownMenuItem(value:u,child:Text(u))).toList(),onChanged:(v)=>setState(()=>from=v??from),decoration:const InputDecoration(labelText:'From'))),IconButton(onPressed:swap,icon:const Icon(Icons.swap_horiz)),Expanded(child:DropdownButtonFormField<String>(value:to,items:units.map((u)=>DropdownMenuItem(value:u,child:Text(u))).toList(),onChanged:(v)=>setState(()=>to=v??to),decoration:const InputDecoration(labelText:'To')))]),const SizedBox(height:18),FilledButton(onPressed:convert,child:const Text('Convert')),if(result!=null)...[const SizedBox(height:22),Container(padding:const EdgeInsets.all(24),decoration:BoxDecoration(color:AppDesign.primary,borderRadius:BorderRadius.circular(AppDesign.radius)),child:Text('${'$'}{result!.toStringAsFixed(4)} ${'$'}to',textAlign:TextAlign.center,style:Theme.of(context).textTheme.headlineMedium?.copyWith(color:Colors.white,fontWeight:FontWeight.w900)))]]));}
`}

function buildTimer(plan){
  const pomo=plan.timerKind==='pomodoro';
  const initial=pomo?1500:0;
  const tick=pomo?"if (seconds > 0) { seconds--; } else { timer?.cancel(); running = false; }":"seconds++;";
  const modeChip=pomo?"const Chip(label: Text('Focus session')),":"";
  const lapButton=pomo?"":"const SizedBox(width: 12), OutlinedButton(onPressed: addLap, child: const Text('Lap')),";
  const lower=pomo
    ? "const Text('Stay focused. When the timer ends, take a short break.', textAlign: TextAlign.center),"
    : "Expanded(child: ListView(children: laps.asMap().entries.map((e) => ListTile(leading: CircleAvatar(child: Text('\\${e.key + 1}')), title: Text(e.value))).toList())),";
  return `${sharedPrelude(plan,"import 'dart:async';")}
class ContextHomePage extends StatefulWidget {
  const ContextHomePage({super.key});
  @override State<ContextHomePage> createState() => _ContextHomePageState();
}
class _ContextHomePageState extends State<ContextHomePage> {
  Timer? timer;
  int seconds = ${initial};
  bool running = false;
  final List<String> laps = <String>[];

  void toggle() {
    if (running) {
      timer?.cancel();
      setState(() => running = false);
      return;
    }
    setState(() => running = true);
    timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() { ${tick} });
    });
  }

  void reset() {
    timer?.cancel();
    setState(() {
      seconds = ${initial};
      running = false;
      laps.clear();
    });
  }

  void addLap() => setState(() => laps.insert(0, formatted));

  String get formatted {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '\${m.toString().padLeft(2, '0')}:\${s.toString().padLeft(2, '0')}';
  }

  @override void dispose() { timer?.cancel(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(AppDesign.name)),
      body: SafeArea(
        child: Padding(
          padding: AppDesign.pagePadding,
          child: Column(
            children: [
              const Spacer(),
              ${modeChip}
              Text(formatted, style: Theme.of(context).textTheme.displayLarge?.copyWith(fontWeight: FontWeight.w900, color: AppDesign.primary)),
              const SizedBox(height: 28),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  FilledButton.icon(onPressed: toggle, icon: Icon(running ? Icons.pause : Icons.play_arrow), label: Text(running ? 'Pause' : 'Start')),
                  const SizedBox(width: 12),
                  OutlinedButton.icon(onPressed: reset, icon: const Icon(Icons.restart_alt), label: const Text('Reset')),
                  ${lapButton}
                ],
              ),
              const SizedBox(height: 24),
              ${lower}
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
`;}

function buildQuiz(plan){return `${sharedPrelude(plan)}
class Question{final String text;final List<String> options;final int answer;const Question(this.text,this.options,this.answer);}const qs=<Question>[Question('Which widget is the root of many Flutter screens?',['Scaffold','Row','Text','Icon'],0),Question('Which keyword creates an immutable compile-time value?',['var','final','const','late'],2),Question('Which structure stores key/value pairs?',['List','Set','Map','Queue'],2)];
class ContextHomePage extends StatefulWidget{const ContextHomePage({super.key});@override State<ContextHomePage> createState()=>_ContextHomePageState();}class _ContextHomePageState extends State<ContextHomePage>{int index=0,score=0;bool done=false;void pick(int i){if(done)return;if(i==qs[index].answer)score++;if(index==qs.length-1){setState(()=>done=true);}else setState(()=>index++);}void restart()=>setState((){index=0;score=0;done=false;});@override Widget build(BuildContext context){if(done)return Scaffold(appBar:AppBar(title:Text(AppDesign.name)),body:Center(child:Column(mainAxisSize:MainAxisSize.min,children:[Icon(Icons.emoji_events,size:72,color:AppDesign.primary),const SizedBox(height:14),Text('${'$'}score / ${'$'}{qs.length}',style:Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight:FontWeight.w900)),const SizedBox(height:8),const Text('Quiz complete'),const SizedBox(height:20),FilledButton(onPressed:restart,child:const Text('Try again'))])));final q=qs[index];return Scaffold(appBar:AppBar(title:Text(AppDesign.name)),body:ListView(padding:AppDesign.pagePadding,children:[LinearProgressIndicator(value:(index+1)/qs.length),const SizedBox(height:20),Text('Question ${'$'}{index+1} of ${'$'}{qs.length}',style:Theme.of(context).textTheme.labelLarge),const SizedBox(height:8),Text(q.text,style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w800)),const SizedBox(height:18),...q.options.asMap().entries.map((e)=>Padding(padding:const EdgeInsets.only(bottom:10),child:FilledButton.tonal(onPressed:()=>pick(e.key),style:FilledButton.styleFrom(padding:const EdgeInsets.all(18),alignment:Alignment.centerLeft),child:Text(e.value))))]));}}
`}

function buildSchedule(plan){return `${sharedPrelude(plan)}
class Booking{final String title,person,time,status;Booking(this.title,this.person,this.time,this.status);}class ContextHomePage extends StatefulWidget{const ContextHomePage({super.key});@override State<ContextHomePage> createState()=>_ContextHomePageState();}class _ContextHomePageState extends State<ContextHomePage>{final bookings=<Booking>[Booking('Consultation','Alex','09:30 AM','Confirmed'),Booking('Review','Maya','11:00 AM','Pending')];void addBooking(){final title=TextEditingController(),person=TextEditingController(),time=TextEditingController(text:'02:00 PM');showDialog(context:context,builder:(ctx)=>AlertDialog(title:const Text('New booking'),content:Column(mainAxisSize:MainAxisSize.min,children:[TextField(controller:title,decoration:const InputDecoration(labelText:'Purpose')),const SizedBox(height:10),TextField(controller:person,decoration:const InputDecoration(labelText:'Name')),const SizedBox(height:10),TextField(controller:time,decoration:const InputDecoration(labelText:'Time'))]),actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:const Text('Cancel')),FilledButton(onPressed:(){if(title.text.trim().isEmpty)return;setState(()=>bookings.add(Booking(title.text.trim(),person.text.trim(),time.text.trim(),'Confirmed')));Navigator.pop(ctx);},child:const Text('Book'))]));}@override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:Text(AppDesign.name)),floatingActionButton:FloatingActionButton.extended(onPressed:addBooking,icon:const Icon(Icons.add),label:const Text('Book')),body:ListView(padding:AppDesign.pagePadding,children:[Text('Schedule',style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w900)),const SizedBox(height:12),Row(children:[Expanded(child:MetricCard(label:'Today',value:'${'$'}{bookings.length}',icon:Icons.event_available)),const SizedBox(width:10),const Expanded(child:MetricCard(label:'Next',value:'09:30',icon:Icons.schedule))]),const SizedBox(height:20),...bookings.map((b)=>Card(child:ListTile(leading:Container(width:48,height:48,alignment:Alignment.center,decoration:BoxDecoration(color:AppDesign.primary.withOpacity(.12),borderRadius:BorderRadius.circular(14)),child:Text(b.time.split(' ').first,style:TextStyle(fontWeight:FontWeight.w900,color:AppDesign.primary))),title:Text(b.title),subtitle:Text('${'$'}{b.person} • ${'$'}{b.time}'),trailing:Chip(label:Text(b.status)))))]));}
`}

function buildCatalog(plan){return `${sharedPrelude(plan)}
class Product{final String name,category;final double price;bool favorite;Product(this.name,this.category,this.price,{this.favorite=false});}class ContextHomePage extends StatefulWidget{const ContextHomePage({super.key});@override State<ContextHomePage> createState()=>_ContextHomePageState();}class _ContextHomePageState extends State<ContextHomePage>{final products=<Product>[Product('Everyday Backpack','Bags',54),Product('Studio Headphones','Audio',129),Product('Running Shoes','Sport',88),Product('Minimal Watch','Accessories',110)];String query='';int cart=0;@override Widget build(BuildContext context){final shown=products.where((p)=>p.name.toLowerCase().contains(query.toLowerCase())).toList();return Scaffold(appBar:AppBar(title:Text(AppDesign.name),actions:[Badge(label:Text('${'$'}cart'),child:IconButton(onPressed:(){},icon:const Icon(Icons.shopping_bag_outlined)))]),body:ListView(padding:AppDesign.pagePadding,children:[TextField(onChanged:(v)=>setState(()=>query=v),decoration:const InputDecoration(prefixIcon:Icon(Icons.search),hintText:'Search products')),const SizedBox(height:18),Text('Discover',style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w900)),const SizedBox(height:12),GridView.builder(shrinkWrap:true,physics:const NeverScrollableScrollPhysics(),itemCount:shown.length,gridDelegate:const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:2,crossAxisSpacing:12,mainAxisSpacing:12,childAspectRatio:.78),itemBuilder:(context,i){final p=shown[i];return Container(padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:AppDesign.surface,borderRadius:BorderRadius.circular(AppDesign.radius)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Expanded(child:Container(width:double.infinity,decoration:BoxDecoration(color:AppDesign.primary.withOpacity(.10),borderRadius:BorderRadius.circular(AppDesign.radius)),child:Icon(Icons.shopping_bag,size:54,color:AppDesign.primary))),const SizedBox(height:10),Text(p.category,style:Theme.of(context).textTheme.labelSmall),Text(p.name,maxLines:2,style:const TextStyle(fontWeight:FontWeight.w800)),const Spacer(),Row(children:[Expanded(child:Text(r'${'$'}' + p.price.toStringAsFixed(0),style:const TextStyle(fontWeight:FontWeight.w900))),IconButton(onPressed:()=>setState(()=>p.favorite=!p.favorite),icon:Icon(p.favorite?Icons.favorite:Icons.favorite_border,color:p.favorite?Colors.red:null)),IconButton(onPressed:()=>setState(()=>cart++),icon:const Icon(Icons.add_shopping_cart))])])) ;})]));}}
`}



const ICON_MAP = {
  dashboard:'dashboard', add_circle:'add_circle', restaurant_menu:'restaurant_menu', insights:'insights', flag:'flag', settings:'settings',
  receipt_long:'receipt_long', add_card:'add_card', account_balance_wallet:'account_balance_wallet', today:'today', check_circle:'check_circle',
  add_task:'add_task', local_fire_department:'local_fire_department', water_drop:'water_drop', history:'history', fitness_center:'fitness_center',
  person:'person', how_to_reg:'how_to_reg', fact_check:'fact_check', home_repair_service:'home_repair_service', info:'info', calendar_month:'calendar_month',
  event_available:'event_available', event_note:'event_note', home:'home', category:'category', quiz:'quiz', emoji_events:'emoji_events', leaderboard:'leaderboard',
  storefront:'storefront', inventory_2:'inventory_2', shopping_cart:'shopping_cart', calculate:'calculate', bookmark:'bookmark', menu_book:'menu_book',
  swap_horiz:'swap_horiz', star:'star', straighten:'straighten', timer:'timer', tune:'tune', list_alt:'list_alt', lunch_dining:'lunch_dining',
  pie_chart:'pie_chart', track_changes:'track_changes', monitor_weight:'monitor_weight', notifications:'notifications', account_balance:'account_balance',
  savings:'savings', assessment:'assessment', repeat:'repeat', lightbulb:'lightbulb', view_list:'view_list', schedule:'schedule', play_arrow:'play_arrow',
  show_chart:'show_chart', school:'school', groups:'groups', warning_amber:'warning_amber', search:'search', favorite:'favorite', payments:'payments',
  local_shipping:'local_shipping', edit_note:'edit_note', compare_arrows:'compare_arrows', flash_on:'flash_on', table_chart:'table_chart', music_note:'music_note'
};

function dartIcon(name='dashboard') {
  const clean = ICON_MAP[name] || 'dashboard';
  return `Icons.${clean}`;
}

function ensureScreenBlueprint(plan={}) {
  if (Array.isArray(plan.screenBlueprint) && plan.screenBlueprint.length >= 3) return plan.screenBlueprint;
  return [
    { id:'dashboard', title:'Dashboard', kind:'dashboard', icon:'dashboard' },
    { id:'records', title:'Records', kind:'list', icon:'list_alt' },
    { id:'add', title:'Add New', kind:'form', icon:'add_circle' },
    { id:'categories', title:'Categories', kind:'list', icon:'category' },
    { id:'details', title:'Details', kind:'detail', icon:'info' },
    { id:'calendar', title:'Calendar', kind:'history', icon:'calendar_month' },
    { id:'analytics', title:'Analytics', kind:'analytics', icon:'insights' },
    { id:'reports', title:'Reports', kind:'analytics', icon:'assessment' },
    { id:'favorites', title:'Favorites', kind:'list', icon:'star' },
    { id:'history', title:'History', kind:'history', icon:'history' },
    { id:'notifications', title:'Notifications', kind:'list', icon:'notifications' },
    { id:'settings', title:'Profile & Settings', kind:'settings', icon:'person' },
  ];
}

function multiScreenSupport(plan={}) {
  const screens = ensureScreenBlueprint(plan);
  const secondary = screens.slice(1);
  const routes = secondary.map((screen) => `        '/${safeString(screen.id)}': (_) => const GeneratedFeatureScreen(screenId:'${safeString(screen.id)}', title:'${safeString(screen.title)}', kind:'${safeString(screen.kind)}', icon:${dartIcon(screen.icon)}),`).join('\n');
  const tiles = secondary.map((screen) => `ListTile(leading:Icon(${dartIcon(screen.icon)}),title:Text('${safeString(screen.title)}'),subtitle:Text('${safeString(screen.kind)}'),onTap:(){Navigator.of(context).pushNamed('/${safeString(screen.id)}');})`).join(',');
  const navItems = Array.isArray(plan.navigationPlan?.primary) && plan.navigationPlan.primary.length
    ? plan.navigationPlan.primary
    : screens.slice(0, 4).map((screen) => ({ id: screen.id, label: screen.title, icon: screen.icon, kind: screen.kind }));
  const navScreens = navItems.map((item) => screens.find((screen) => screen.id === item.id) || screens[0]).slice(0, 4);
  while (navScreens.length < 4) navScreens.push(screens[Math.min(navScreens.length, screens.length - 1)] || screens[0]);
  const navPageCode = navScreens.map((screen, index) => index === 0 && screen.id === screens[0].id
    ? '    const ContextHomePage(),'
    : `    const GeneratedFeatureScreen(screenId:'${safeString(screen.id)}',title:'${safeString(screen.title)}',kind:'${safeString(screen.kind)}',icon:${dartIcon(screen.icon)}),`
  ).join('\n');
  const navDestinationCode = navScreens.map((screen) => `      NavigationDestination(icon:Icon(${dartIcon(screen.icon)}),selectedIcon:Icon(${dartIcon(screen.icon)}),label:'${safeString(screen.title)}'),`).join('\n');
  const support = `
class DomainSplashPage extends StatefulWidget {
  const DomainSplashPage({super.key});
  @override State<DomainSplashPage> createState()=>_DomainSplashPageState();
}
class _DomainSplashPageState extends State<DomainSplashPage> {
  @override void initState(){super.initState();Future<void>.delayed(const Duration(milliseconds:1200),(){if(!mounted)return;Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder:(_)=>const DomainHomeShell()));});}
  @override Widget build(BuildContext context)=>Scaffold(body:Container(width:double.infinity,decoration:const BoxDecoration(gradient:LinearGradient(colors:[AppDesign.primary,AppDesign.secondary],begin:Alignment.topLeft,end:Alignment.bottomRight)),child:SafeArea(child:Column(mainAxisAlignment:MainAxisAlignment.center,children:[Container(width:92,height:92,decoration:BoxDecoration(color:Colors.white.withOpacity(.18),borderRadius:BorderRadius.circular(28)),child:const Icon(Icons.auto_awesome_rounded,color:Colors.white,size:46)),const SizedBox(height:22),Text(AppDesign.name,textAlign:TextAlign.center,style:const TextStyle(color:Colors.white,fontSize:30,fontWeight:FontWeight.w900)),const SizedBox(height:8),Text(AppDesign.archetype.replaceAll('_',' '),style:const TextStyle(color:Colors.white70,fontWeight:FontWeight.w700)),const SizedBox(height:32),const CircularProgressIndicator(color:Colors.white)]))));
}

class DomainHomeShell extends StatefulWidget {
  const DomainHomeShell({super.key});
  @override State<DomainHomeShell> createState()=>_DomainHomeShellState();
}
class _DomainHomeShellState extends State<DomainHomeShell> {
  int index=0;
  List<Widget> pages()=> <Widget>[
${navPageCode}
    const DomainMorePage(),
  ];
  @override Widget build(BuildContext context)=>Scaffold(
    body:IndexedStack(index:index,children:pages()),
    bottomNavigationBar:NavigationBar(selectedIndex:index,onDestinationSelected:(value)=>setState(()=>index=value),destinations:const <NavigationDestination>[
${navDestinationCode}
      NavigationDestination(icon:Icon(Icons.grid_view_outlined),selectedIcon:Icon(Icons.grid_view_rounded),label:'More'),
    ]),
  );
}

class DomainDrawer extends StatelessWidget {
  const DomainDrawer({super.key});
  @override Widget build(BuildContext context)=>Drawer(child:SafeArea(child:ListView(padding:AppDesign.pagePadding,children:<Widget>[
    Text(AppDesign.name,style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.w900)),
    const SizedBox(height:8),Text('All screens',style:Theme.of(context).textTheme.labelLarge),const Divider(),
    ${tiles}
  ])));
}

class DomainMorePage extends StatelessWidget {
  const DomainMorePage({super.key});
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('All screens')),body:SafeArea(child:ListView(padding:AppDesign.pagePadding,children:[Text('Explore '+AppDesign.name,style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w900)),const SizedBox(height:6),Text('All generated modules are available here.',style:Theme.of(context).textTheme.bodyMedium),const SizedBox(height:14),${tiles}])));
}

class GeneratedFeatureScreen extends StatefulWidget {
  final String screenId; final String title; final String kind; final IconData icon;
  const GeneratedFeatureScreen({super.key,required this.screenId,required this.title,required this.kind,required this.icon});
  @override State<GeneratedFeatureScreen> createState()=>_GeneratedFeatureScreenState();
}
class _GeneratedFeatureScreenState extends State<GeneratedFeatureScreen> {
  late final List<String> items;
  bool reminders=true, compact=false; double goal=70; String query='';
  @override void initState(){super.initState();items=_seedItems();}
  List<String> _seedItems(){
    final key=widget.screenId.toLowerCase();
    if(key.contains('notification')) return ['Goal reminder','New activity alert','Weekly summary ready'];
    if(key.contains('favorite')) return ['Pinned ${'$'}{AppDesign.archetype.replaceAll('_',' ')} item','Saved insight','Quick access record'];
    if(key.contains('categor')||key.contains('budget')) return ['Primary group','Secondary group','Needs review'];
    if(key.contains('history')||key.contains('log')||key.contains('transaction')) return ['Today • completed','Yesterday • updated','Earlier • archived'];
    if(key.contains('report')) return ['Weekly report','Monthly summary','Performance export'];
    if(key.contains('goal')||key.contains('target')) return ['Primary target','Stretch target','Next milestone'];
    return ['${'$'}{widget.title} item 1','${'$'}{widget.title} item 2','${'$'}{widget.title} item 3'];
  }
  void addItem(){final c=TextEditingController();showDialog(context:context,builder:(ctx)=>AlertDialog(title:Text('Add to ${'$'}{widget.title}'),content:TextField(controller:c,decoration:InputDecoration(labelText:'New ${'$'}{widget.title.toLowerCase()} value')),actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:const Text('Cancel')),FilledButton(onPressed:(){if(c.text.trim().isEmpty)return;setState(()=>items.insert(0,c.text.trim()));Navigator.pop(ctx);},child:const Text('Save'))]));}
  Widget sectionTitle(String text)=>Padding(padding:const EdgeInsets.only(bottom:10),child:Text(text,style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.w900)));
  Widget buildBody(){
    final key=widget.screenId.toLowerCase();
    if(widget.kind=='form') return ListView(padding:AppDesign.pagePadding,children:[sectionTitle(widget.title),TextField(decoration:InputDecoration(labelText:widget.title+' name')),const SizedBox(height:12),TextField(decoration:InputDecoration(labelText:key.contains('food')?'Calories / quantity':key.contains('expense')||key.contains('transaction')?'Amount':'Value / amount'),keyboardType:TextInputType.number),const SizedBox(height:12),TextField(decoration:InputDecoration(labelText:key.contains('booking')?'Booking notes':'Notes'),maxLines:3),const SizedBox(height:16),FilledButton.icon(onPressed:addItem,icon:const Icon(Icons.save),label:Text('Save '+widget.title))]);
    if(widget.kind=='analytics') {final base=(widget.title.length*7)%35+55; return ListView(padding:AppDesign.pagePadding,children:[sectionTitle(widget.title),Row(children:[Expanded(child:MetricCard(label:widget.title+' score',value:'${'$'}base%',icon:Icons.trending_up)),const SizedBox(width:10),Expanded(child:MetricCard(label:'Change',value:'+${'$'}{(widget.title.length%9)+4}%',icon:Icons.show_chart))]),const SizedBox(height:22),Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:AppDesign.surface,borderRadius:BorderRadius.circular(AppDesign.radius)),child:SimpleBars(values:<num>[base-18,base-8,base-12,base+3,base-5,base+8,base],labels:const ['M','T','W','T','F','S','S'],maxValue:100.0))]);}
    if(widget.kind=='goal') return ListView(padding:AppDesign.pagePadding,children:[sectionTitle(widget.title),MetricCard(label:widget.title,value:'${'$'}{goal.round()}%',icon:Icons.flag),const SizedBox(height:18),Slider(value:goal,min:10,max:100,divisions:18,label:'${'$'}{goal.round()}',onChanged:(v)=>setState(()=>goal=v)),FilledButton.icon(onPressed:()=>ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(widget.title+' saved'))),icon:const Icon(Icons.check),label:Text('Save '+widget.title))]);
    if(widget.kind=='settings') return ListView(padding:AppDesign.pagePadding,children:[sectionTitle(widget.title),SwitchListTile(value:reminders,onChanged:(v)=>setState(()=>reminders=v),title:Text(key.contains('profile')?'Activity reminders':'Reminders'),subtitle:Text('Controls for '+widget.title.toLowerCase())),SwitchListTile(value:compact,onChanged:(v)=>setState(()=>compact=v),title:const Text('Compact layout')),ListTile(leading:Icon(widget.icon),title:Text(widget.title+' preferences'),subtitle:const Text('Domain-specific generated settings')),const ListTile(leading:Icon(Icons.info_outline),title:Text('About'),subtitle:Text('Generated by VibeApp'))]);
    if(widget.kind=='detail') return ListView(padding:AppDesign.pagePadding,children:[sectionTitle(widget.title),Container(padding:const EdgeInsets.all(20),decoration:BoxDecoration(color:AppDesign.surface,borderRadius:BorderRadius.circular(AppDesign.radius)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Icon(widget.icon,size:44,color:AppDesign.primary),const SizedBox(height:14),Text(widget.title,style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w900)),const SizedBox(height:8),Text('Detailed ${'$'}{AppDesign.archetype.replaceAll('_',' ')} information for ${'$'}{widget.title.toLowerCase()}.'),const SizedBox(height:18),FilledButton.icon(onPressed:addItem,icon:const Icon(Icons.add),label:Text('Add '+widget.title+' action'))]))]);
    if(key.contains('calendar')||key.contains('schedule')) return ListView(padding:AppDesign.pagePadding,children:[sectionTitle(widget.title),CalendarDatePicker(initialDate:DateTime.now(),firstDate:DateTime(2020),lastDate:DateTime(2035),onDateChanged:(_){ }),const SizedBox(height:12),...items.map((e)=>Card(child:ListTile(leading:Icon(Icons.event_outlined,color:AppDesign.primary),title:Text(e),subtitle:const Text('Scheduled item'))))]);
    final visible=items.where((e)=>e.toLowerCase().contains(query.toLowerCase())).toList();
    return ListView(padding:AppDesign.pagePadding,children:[sectionTitle(widget.title),TextField(onChanged:(v)=>setState(()=>query=v),decoration:InputDecoration(prefixIcon:const Icon(Icons.search),hintText:'Search '+widget.title.toLowerCase())),const SizedBox(height:12),...visible.map((e)=>Card(child:ListTile(leading:Icon(widget.icon,color:AppDesign.primary),title:Text(e),subtitle:Text(key.contains('history')||key.contains('log')?'Historical '+AppDesign.archetype.replaceAll('_',' ')+' entry':key.contains('notification')?'App alert':'${'$'}{widget.title} data'),trailing:IconButton(onPressed:()=>setState(()=>items.remove(e)),icon:const Icon(Icons.delete_outline))))) ]);
  }
  @override Widget build(BuildContext context)=>Scaffold(drawer:const DomainDrawer(),appBar:AppBar(title:Text(widget.title)),floatingActionButton:(widget.kind=='list'||widget.kind=='history')?FloatingActionButton(onPressed:addItem,child:const Icon(Icons.add)):null,body:SafeArea(child:buildBody()));
}
`;
  return { routes, support };
}

function addMultiScreenNavigation(code, plan={}) {
  const { routes, support } = multiScreenSupport(plan);
  let updated = String(code || '');
  updated = updated.replace('      home: const ContextHomePage(),', `      home: const DomainSplashPage(),\n      routes: {\n${routes}\n      },`);
  return `${updated}\n${support}`;
}


function iconExpr(name='dashboard') {
  const map = {
    home:'Icons.home_outlined', today:'Icons.today_outlined', dashboard:'Icons.dashboard_outlined', event:'Icons.event_outlined',
    add_circle:'Icons.add_circle_outline', medical_services:'Icons.medical_services_outlined', people:'Icons.people_outline',
    folder_shared:'Icons.folder_shared_outlined', medication:'Icons.medication_outlined', domain:'Icons.domain_outlined', receipt_long:'Icons.receipt_long_outlined',
    calendar_month:'Icons.calendar_month_outlined', notifications:'Icons.notifications_outlined', person:'Icons.person_outline', assignment:'Icons.assignment_outlined',
    how_to_reg:'Icons.how_to_reg_outlined', grade:'Icons.grade_outlined', class_:'Icons.class_outlined', badge:'Icons.badge_outlined', edit_note:'Icons.edit_note_outlined',
    note_alt:'Icons.note_alt_outlined', add:'Icons.add', search:'Icons.search', sell:'Icons.sell_outlined', star:'Icons.star_outline', archive:'Icons.archive_outlined', settings:'Icons.settings_outlined'
  };
  return map[name] || 'Icons.grid_view_outlined';
}

function buildWorkspace(plan) {
  const bp = plan.appBlueprint || {};
  const roles = Array.isArray(bp.roles) ? bp.roles : [];
  const hasRoleMode = plan?.featurePolicies?.roleBased === true && roles.length > 0;
  const screens = Array.isArray(plan.screenBlueprint) ? plan.screenBlueprint : [];
  const roleDart = roles.map(r => `'${safeString(r.label)}'`).join(', ');
  const navByRole = bp.navigation?.byRole || {};
  const dashboards = bp.roleDashboards || {};
  const primary = bp.primaryActions?.byRole || {};
  const navMap = roles.map(r => {
    const ids = navByRole[r.id] || [];
    return `'${safeString(r.label)}': <String>[${ids.map(x=>`'${safeString(x)}'`).join(', ')}]`;
  }).join(',\n');
  const cardsMap = roles.map(r => {
    const cards = dashboards[r.id]?.cards || [];
    return `'${safeString(r.label)}': <String>[${cards.map(x=>`'${safeString(x)}'`).join(', ')}]`;
  }).join(',\n');
  const actionMap = roles.map(r => {
    const acts = primary[r.id] || [];
    return `'${safeString(r.label)}': '${safeString(acts[0] || '')}'`;
  }).join(',\n');
  const screenIds = new Set(screens.map(s => s.id));
  const actionTargetFor = (role) => {
    const action = String((primary[role.id] || [])[0] || '').toLowerCase();
    const nav = navByRole[role.id] || [];
    const candidates = [
      ['appointment', ['bookAppointment','book','appointments','providerBookings']],
      ['prescription', ['prescriptions']], ['clinical note', ['records','patients']], ['doctor', ['doctors']],
      ['student', ['students']], ['attendance', ['attendance']], ['product', ['products','inventory']],
      ['employee', ['employees']], ['provider', ['providers']], ['book', ['catalog','loans']],
      ['ticket', ['newTicket','tickets','assigned']], ['shipment', ['shipments']], ['driver', ['drivers','dispatch']],
      ['room', ['rooms','bookings']], ['order', ['orders','sellerOrders']], ['menu', ['menu']],
      ['property', ['properties']], ['listing', ['properties']], ['lead', ['leads']], ['event', ['events']],
    ];
    for (const [token, ids] of candidates) if (action.includes(token)) { const hit=ids.find(id=>screenIds.has(id)); if(hit) return hit; }
    const form = screens.find(sc => sc.kind === 'form' && (sc.roleVisibility?.length ? sc.roleVisibility.includes(role.id) : true));
    if (form) return form.id;
    return nav.find(id => { const sc=screens.find(x=>x.id===id); return sc && ['list','history','calendar','categories'].includes(sc.kind); }) || nav[0] || screens[0]?.id || '';
  };
  const actionTargetMap = roles.map(r => `'${safeString(r.label)}': '${safeString(actionTargetFor(r))}'`).join(',\n');
  const visibilityMap = screens.map(sc => {
    const allowed = Array.isArray(sc.roleVisibility) ? sc.roleVisibility : [];
    const labels = allowed.map(id => roles.find(r => r.id === id)?.label).filter(Boolean);
    return `'${safeString(sc.id)}': <String>[${labels.map(x=>`'${safeString(x)}'`).join(', ')}]`;
  }).join(',\n');
  const screenDefs = screens.map(sc => `GeneratedScreenDef('${safeString(sc.id)}','${safeString(sc.title)}','${safeString(sc.kind)}',${iconExpr(sc.icon)})`).join(',\n');
  const defaultNav = (bp.navigation?.default || plan.navigationPlan?.primary?.map(x=>x.id) || screens.slice(0,4).map(x=>x.id)).map(x=>`'${safeString(x)}'`).join(', ');
  const roleGate = hasRoleMode ? `
class ContextAuthGate extends StatefulWidget {
  const ContextAuthGate({super.key});

  @override
  State<ContextAuthGate> createState() => _ContextAuthGateState();
}

class _ContextAuthGateState extends State<ContextAuthGate> {
  String? selectedRole;
  bool splash = true;

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(const Duration(milliseconds: 450), () {
      if (mounted) setState(() => splash = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (splash) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              CircleAvatar(
                radius: 34,
                backgroundColor: AppDesign.primary.withOpacity(.12),
                child: Icon(Icons.auto_awesome, color: AppDesign.primary, size: 34),
              ),
              const SizedBox(height: 16),
              Text(
                AppDesign.name,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Defensive fallback. The JS generator only emits this class when roles exist,
    // but this keeps generated Dart safe if blueprint data changes later.
    if (generatedRoles.isEmpty) {
      return const ContextHomePage();
    }

    if (selectedRole != null) {
      return ContextHomePage(
        initialRole: selectedRole,
        onLogout: () => setState(() => selectedRole = null),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.all(24),
              children: <Widget>[
                Text(
                  'Welcome to ' + AppDesign.name,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Choose a role to enter the demo workspace. Production authentication can be connected to your identity provider.',
                ),
                const SizedBox(height: 22),
                ...generatedRoles.map<Widget>((role) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: FilledButton.tonalIcon(
                      onPressed: () {
                        setState(() {
                          selectedRole = role;
                        });
                      },
                      icon: const Icon(Icons.person_outline),
                      label: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Text('Continue as ' + role),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
` : '';

  return `${sharedPrelude(plan)}
class GeneratedScreenDef { final String id,title,kind; final IconData icon; const GeneratedScreenDef(this.id,this.title,this.kind,this.icon); }
const List<GeneratedScreenDef> generatedScreens = <GeneratedScreenDef>[${screenDefs}];
const List<String> generatedRoles = <String>[${roleDart}];
const Map<String,List<String>> roleNavigation = <String,List<String>>{${navMap}};
const Map<String,List<String>> roleDashboardCards = <String,List<String>>{${cardsMap}};
const Map<String,String> rolePrimaryAction = <String,String>{${actionMap}};
const Map<String,String> rolePrimaryTarget = <String,String>{${actionTargetMap}};
final Map<String,List<String>> workspaceCreatedRecords = <String,List<String>>{};
List<String> createdRecordsFor(String screenId) => workspaceCreatedRecords.putIfAbsent(screenId, () => <String>[]);
const Map<String,List<String>> screenRoleVisibility = <String,List<String>>{${visibilityMap}};
const List<String> defaultNavigation = <String>[${defaultNav}];

${roleGate}
class ContextHomePage extends StatefulWidget { final String? initialRole; final VoidCallback? onLogout; const ContextHomePage({super.key,this.initialRole,this.onLogout}); @override State<ContextHomePage> createState()=>_ContextHomePageState(); }
class _ContextHomePageState extends State<ContextHomePage> {
  String? role; int selected=0;
  @override void initState(){super.initState(); role=widget.initialRole ?? (generatedRoles.isNotEmpty ? generatedRoles.first : null);}
  List<String> get navIds => role==null ? defaultNavigation : (roleNavigation[role!] ?? defaultNavigation);
  bool canSee(GeneratedScreenDef s){final allowed=screenRoleVisibility[s.id]??<String>[];return role==null||allowed.isEmpty||allowed.contains(role);}
  List<GeneratedScreenDef> get visibleScreens => generatedScreens.where(canSee).toList();
  List<GeneratedScreenDef> get navScreens => navIds.map((id)=>visibleScreens.firstWhere((s)=>s.id==id,orElse:()=>visibleScreens.first)).toList();
  void selectRole(String value){setState((){role=value;selected=0;});}
  @override Widget build(BuildContext context){
    if(generatedRoles.isNotEmpty && role==null) return const SizedBox.shrink();
    final nav=navScreens.take(4).toList();
    final safeIndex=nav.isEmpty?0:selected.clamp(0,nav.length-1).toInt();\n    final current=nav.isEmpty?generatedScreens.first:nav[safeIndex];
    return Scaffold(
      appBar:AppBar(title:Text(AppDesign.name),actions:[if(generatedRoles.isNotEmpty) PopupMenuButton<String>(initialValue:role,onSelected:selectRole,itemBuilder:(_)=>generatedRoles.map((r)=>PopupMenuItem(value:r,child:Text('View as '+r))).toList(),child:Padding(padding:const EdgeInsets.symmetric(horizontal:14),child:Chip(label:Text(role ?? 'Role'))))]),
      body:SafeArea(child:current.kind=='dashboard' ? _dashboard(current) : GeneratedWorkspaceScreen(def:current, role:role)),
      floatingActionButton:_primaryActionButton(),
      bottomNavigationBar:nav.isEmpty?null:NavigationBar(selectedIndex:selected,onDestinationSelected:(i)=>setState(()=>selected=i),destinations:nav.map((s)=>NavigationDestination(icon:Icon(s.icon),label:s.title)).toList()),
      drawer:Drawer(child:SafeArea(child:ListView(children:<Widget>[
        DrawerHeader(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:<Widget>[Text(AppDesign.name,style:const TextStyle(fontSize:24,fontWeight:FontWeight.w900)),if(role!=null) Text(role!)])),
        ...visibleScreens.map((s)=>ListTile(leading:Icon(s.icon),title:Text(s.title),onTap:(){Navigator.push(context,MaterialPageRoute<void>(builder:(_)=>Scaffold(appBar:AppBar(title:Text(s.title)),body:GeneratedWorkspaceScreen(def:s,role:role))));})),
      ]))),
    );
  }
  Widget? _primaryActionButton(){
    final text=rolePrimaryAction[role]??''; if(text.isEmpty)return null;
    return FloatingActionButton.extended(onPressed:() async {
      final targetId=rolePrimaryTarget[role]??'';
      if(targetId.isEmpty){ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(text)));return;}
      final target=generatedScreens.firstWhere((s)=>s.id==targetId,orElse:()=>generatedScreens.first);
      final created=await showWorkspaceCreateDialog(context,target,actionLabel:text,role:role);
      if(created==true && mounted)setState((){});
    },icon:const Icon(Icons.add),label:Text(text));
  }
  Widget _dashboard(GeneratedScreenDef def){
    final cards=roleDashboardCards[role]??<String>[];
    final fallbackCards=<String>[
      for(final item in visibleScreens.where((s)=>s.id!=def.id).take(4)) item.title,
    ];
    final displayCards=cards.isNotEmpty?cards:fallbackCards;
    return ListView(
      padding:AppDesign.pagePadding,
      children:<Widget>[
        Text(role==null?def.title:'${'$'}role Dashboard',style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w900)),
        const SizedBox(height:6),
        Text(role==null?'Manage your ${safeString(plan.domain)} workspace':'Personalized ${safeString(plan.domain)} workspace for ${'$'}role'),
        const SizedBox(height:16),
        ...displayCards.map((c)=>Card(child:ListTile(
          leading:CircleAvatar(backgroundColor:AppDesign.primary.withOpacity(.12),child:Icon(Icons.arrow_forward_rounded,color:AppDesign.primary)),
          title:Text(c),
          subtitle:Text(role==null?'Open $c':'Relevant to ${'$'}role'),
        ))),
      ],
    );
  }
}

Future<bool?> showWorkspaceCreateDialog(BuildContext context, GeneratedScreenDef def,{String? actionLabel,String? role}) {
  final titleController=TextEditingController(); final notesController=TextEditingController();
  return showDialog<bool>(context:context,builder:(dialogContext)=>AlertDialog(
    title:Text(actionLabel?.isNotEmpty==true?actionLabel!:'Add '+def.title),
    content:Column(mainAxisSize:MainAxisSize.min,children:[TextField(controller:titleController,autofocus:true,decoration:InputDecoration(labelText:def.title+' details')),const SizedBox(height:12),TextField(controller:notesController,maxLines:3,decoration:const InputDecoration(labelText:'Notes'))]),
    actions:[TextButton(onPressed:()=>Navigator.pop(dialogContext,false),child:const Text('Cancel')),FilledButton.icon(onPressed:(){final value=titleController.text.trim();if(value.isEmpty){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Please enter a value.')));return;}createdRecordsFor(def.id).insert(0,value);Navigator.pop(dialogContext,true);},icon:const Icon(Icons.save_outlined),label:const Text('Save'))]
  )).whenComplete(() { titleController.dispose(); notesController.dispose(); });
}

class GeneratedWorkspaceScreen extends StatefulWidget {
  final GeneratedScreenDef def; final String? role; const GeneratedWorkspaceScreen({super.key,required this.def,this.role});
  @override State<GeneratedWorkspaceScreen> createState()=>_GeneratedWorkspaceScreenState();
}
class _GeneratedWorkspaceScreenState extends State<GeneratedWorkspaceScreen> {
  late final TextEditingController formTitle; late final TextEditingController formNotes;
  @override void initState(){super.initState();formTitle=TextEditingController();formNotes=TextEditingController();}
  @override void dispose(){formTitle.dispose();formNotes.dispose();super.dispose();}
  List<String> seeds(){
    final lower=widget.def.id.toLowerCase();
    if(lower.contains('doctor')) return <String>['Dr. Ayesha Khan • Cardiology','Dr. Hamza Ali • General Medicine','Dr. Sara Malik • Pediatrics'];
    if(lower.contains('patient')) return <String>['Ali Raza • follow-up today','Fatima Noor • lab review','Usman Tariq • new consultation'];
    if(lower.contains('appointment')) return <String>['09:30 • Dr. Ayesha Khan','11:00 • Dr. Hamza Ali','14:15 • Dr. Sara Malik'];
    if(lower.contains('prescription')) return <String>['Amoxicillin • 5 days','Vitamin D • daily','Pain relief • as needed'];
    if(lower.contains('record')) return <String>['Annual checkup • 12 Sep','Lab results • 08 Sep','Visit summary • 02 Sep'];
    if(lower.contains('department')) return <String>['Cardiology • 8 doctors','Pediatrics • 6 doctors','General Medicine • 12 doctors'];
    if(lower.contains('billing')) return <String>['Invoice #1048 • Paid','Invoice #1041 • Due','Invoice #1036 • Paid'];
    if(lower.contains('student')) return <String>['Areeba Khan • Grade 8','Bilal Ahmed • Grade 9','Hina Noor • Grade 8'];
    if(lower.contains('assignment')) return <String>['Math worksheet • due Friday','Science project • due Monday','Reading task • due tomorrow'];
    if(lower.contains('grade')) return <String>['Mathematics • A','Science • B+','English • A-'];
    if(lower.contains('note')) return <String>['Project ideas','Meeting notes','Personal checklist'];
    return <String>['${'$'}{widget.def.title} item 1','${'$'}{widget.def.title} item 2','${'$'}{widget.def.title} item 3'];
  }
  String itemSubtitle(String value){
    final lower=widget.def.id.toLowerCase();
    if(lower.contains('record')) return 'Clinical document';
    if(lower.contains('prescription')) return 'Medication plan';
    if(lower.contains('doctor')) return 'Provider profile';
    if(lower.contains('patient')) return 'Patient profile';
    if(lower.contains('appointment')) return 'Scheduled appointment';
    if(lower.contains('billing')) return 'Billing record';
    if(lower.contains('department')) return 'Hospital department';
    if(lower.contains('student')) return 'Student profile';
    if(lower.contains('assignment')) return 'Coursework';
    if(lower.contains('grade')) return 'Academic result';
    return widget.role==null?widget.def.title:'${'$'}{widget.role} • ${'$'}{widget.def.title}';
  }
  Future<void> createHere() async {final ok=await showWorkspaceCreateDialog(context,widget.def,role:widget.role);if(ok==true&&mounted)setState((){});}
  void saveForm(){final value=formTitle.text.trim();if(value.isEmpty){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Please complete the required field.')));return;}createdRecordsFor(widget.def.id).insert(0,value);formTitle.clear();formNotes.clear();setState((){});ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(widget.def.title+' saved')));}
  @override Widget build(BuildContext context){
    final def=widget.def; final role=widget.role; final lower=def.id.toLowerCase();
    if(def.kind=='form') return ListView(padding:AppDesign.pagePadding,children:[Text(def.title,style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w900)),const SizedBox(height:16),TextField(controller:formTitle,decoration:InputDecoration(labelText:def.title+' details *')),const SizedBox(height:12),TextField(controller:formNotes,maxLines:3,decoration:const InputDecoration(labelText:'Notes')),const SizedBox(height:16),FilledButton.icon(onPressed:saveForm,icon:const Icon(Icons.save_outlined),label:Text('Save '+def.title)),if(createdRecordsFor(def.id).isNotEmpty)...[const SizedBox(height:20),Text('Recently created',style:Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight:FontWeight.w800)),...createdRecordsFor(def.id).map((x)=>Card(child:ListTile(leading:Icon(def.icon,color:AppDesign.primary),title:Text(x),subtitle:Text(role??'User'))))]]);
    if(def.kind=='calendar') {final items=<String>[...createdRecordsFor(def.id),'Upcoming '+def.title];return ListView(padding:AppDesign.pagePadding,children:[Text(def.title,style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w900)),CalendarDatePicker(initialDate:DateTime.now(),firstDate:DateTime(2024),lastDate:DateTime(2035),onDateChanged:(_){ }),FilledButton.tonalIcon(onPressed:createHere,icon:const Icon(Icons.add),label:Text('Add '+def.title)),const SizedBox(height:10),...items.map((x)=>Card(child:ListTile(leading:Icon(def.icon),title:Text(x),subtitle:Text(role==null?'Scheduled item':'Role: ${'$'}role'))))]);}
    final labels=<String>[...createdRecordsFor(def.id),...seeds()];
    return ListView(padding:AppDesign.pagePadding,children:[Row(children:[Expanded(child:Text(def.title,style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.w900))),if(['list','history','categories','search','favorites'].contains(def.kind))IconButton.filledTonal(onPressed:createHere,icon:const Icon(Icons.add),tooltip:'Add '+def.title)]),const SizedBox(height:12),...labels.map((x)=>Card(child:ListTile(leading:Icon(def.icon,color:AppDesign.primary),title:Text(x),subtitle:Text(itemSubtitle(x)),trailing:createdRecordsFor(def.id).contains(x)?IconButton(onPressed:()=>setState(()=>createdRecordsFor(def.id).remove(x)),icon:const Icon(Icons.delete_outline)):const Icon(Icons.chevron_right))))]);
  }
}
`;
}

function buildContextAwareFlutterApp(plan={}) {
  if (!plan || !plan.family) throw new Error('Context-aware plan is required.');
  let result;
  switch (plan.archetype) {
    case 'calorie_tracker': result = { code: buildCalorieTracker(plan), plan }; break;
    case 'expense_tracker': result = { code: buildFinance(plan), plan }; break;
    default: break;
  }
  if (!result) {
    switch (plan.family) {
      case 'tracker': result = { code: buildTracker(plan), plan }; break;
      case 'finance': result = { code: buildFinance(plan), plan }; break;
      case 'calculator': result = { code: buildCalculator(plan), plan }; break;
      case 'converter': result = { code: buildConverter(plan), plan }; break;
      case 'timer': result = { code: buildTimer(plan), plan }; break;
      case 'quiz': result = { code: buildQuiz(plan), plan }; break;
      case 'schedule': result = { code: buildSchedule(plan), plan }; break;
      case 'catalog': result = { code: buildCatalog(plan), plan }; break;
      case 'workspace': result = { code: buildWorkspace(plan), plan }; break;
      default: throw new Error(`Unsupported context-aware family: ${plan.family}`);
    }
  }
  if (plan.family === 'workspace') return { ...result, screenBlueprint: ensureScreenBlueprint(plan) };
  return { ...result, code: addMultiScreenNavigation(result.code, plan), screenBlueprint: ensureScreenBlueprint(plan) };
}
module.exports={buildContextAwareFlutterApp, addMultiScreenNavigation, ensureScreenBlueprint};
