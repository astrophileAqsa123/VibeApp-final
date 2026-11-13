const { inferUiPresetFromPrompt, normalizeUiPreset } = require('./uiPresets');
const { buildArchitectBlueprint, inferDomain, roleBasedRequested, DOMAIN_BLUEPRINTS } = require('./ai/appArchitectAgent');
const { critiqueBlueprint } = require('./ai/blueprintCritic');

const ARCHETYPES = [
  {
    id: 'calorie_tracker', family: 'tracker', confidence: 0.99,
    patterns: [/\bcalorie(s)?\b/i, /\bcaloric\b/i, /\bfood\s*(intake|log|tracker)\b/i],
    appName: 'CalorieTrack', domain: 'health', icon: 'local_fire_department',
    capabilities: ['daily_goal','daily_total','remaining','meal_breakdown','food_log','weekly_chart'],
  },
  {
    id: 'expense_tracker', family: 'finance', confidence: 0.98,
    patterns: [/\bexpense\b/i, /\bspending\b/i, /\bbudget\s*(tracker|manager)?\b/i, /\bpersonal finance\b/i],
    appName: 'SpendWise', domain: 'finance', icon: 'account_balance_wallet',
    capabilities: ['income','expense','balance','category_breakdown','transaction_history','monthly_chart'],
  },
  {
    id: 'savings_tracker', family: 'tracker', confidence: 0.96,
    patterns: [/\bsavings?\s*(goal|tracker|planner)\b/i, /\bmoney\s*goal\b/i],
    appName: 'SaveGoal', domain: 'finance', icon: 'savings',
    capabilities: ['goal','progress','contributions','history','summary'],
    trackerKind: 'savings', unit: '$', goal: 5000,
  },
  {
    id: 'habit_tracker', family: 'tracker', confidence: 0.98,
    patterns: [/\bhabit\b/i, /\bstreak\b/i, /\bdaily routine\b/i],
    appName: 'HabitFlow', domain: 'productivity', icon: 'check_circle',
    capabilities: ['daily_goal','streak','progress','history','quick_complete'],
    trackerKind: 'habit', unit: 'done', goal: 5,
  },
  {
    id: 'hydration_tracker', family: 'tracker', confidence: 0.99,
    patterns: [/\bwater\s*(intake|tracker|reminder)\b/i, /\bhydration\b/i],
    appName: 'HydraDaily', domain: 'health', icon: 'water_drop',
    capabilities: ['daily_goal','progress','quick_add','history'],
    trackerKind: 'hydration', unit: 'ml', goal: 2500,
  },
  {
    id: 'workout_tracker', family: 'tracker', confidence: 0.96,
    patterns: [/\bworkout\b/i, /\bexercise\s*(tracker|log)\b/i, /\bgym\s*(tracker|log)\b/i],
    appName: 'FitLog', domain: 'fitness', icon: 'fitness_center',
    capabilities: ['workout_log','duration','volume','weekly_progress','history'],
    trackerKind: 'workout', unit: 'min', goal: 45,
  },
  {
    id: 'attendance_tracker', family: 'tracker', confidence: 0.95,
    patterns: [/\battendance\b/i],
    appName: 'AttendFlow', domain: 'education', icon: 'how_to_reg',
    capabilities: ['present_absent','attendance_rate','daily_summary','history'],
    trackerKind: 'attendance', unit: 'present', goal: 30,
  },
  {
    id: 'bmi_calculator', family: 'calculator', confidence: 0.99,
    patterns: [/\bbmi\b/i, /\bbody mass index\b/i],
    appName: 'BMI Insight', domain: 'health', calculatorKind: 'bmi', icon: 'monitor_weight',
    capabilities: ['height_weight_input','bmi_formula','category_result'],
  },
  {
    id: 'tip_calculator', family: 'calculator', confidence: 0.99,
    patterns: [/\btip\s*calculator\b/i, /\bbill\s*split\b/i],
    appName: 'TipSplit', domain: 'utility', calculatorKind: 'tip', icon: 'receipt_long',
    capabilities: ['bill_input','tip_percentage','people_count','per_person_total'],
  },
  {
    id: 'loan_calculator', family: 'calculator', confidence: 0.99,
    patterns: [/\bloan\s*calculator\b/i, /\bmortgage\s*calculator\b/i, /\bemi\b/i],
    appName: 'LoanCalc', domain: 'finance', calculatorKind: 'loan', icon: 'calculate',
    capabilities: ['principal','interest','term','monthly_payment'],
  },
  {
    id: 'grade_calculator', family: 'calculator', confidence: 0.97,
    patterns: [/\bgrade\s*calculator\b/i, /\bgpa\s*calculator\b/i, /\bmarks?\s*calculator\b/i],
    appName: 'GradeMate', domain: 'education', calculatorKind: 'grade', icon: 'school',
    capabilities: ['score_input','percentage','grade_result'],
  },
  {
    id: 'unit_converter', family: 'converter', confidence: 0.99,
    patterns: [/\bunit\s*converter\b/i, /\bconvert(er|ing)?\b.*\b(unit|length|weight|temperature|currency)\b/i, /\b(length|weight|temperature)\s*converter\b/i],
    appName: 'Convertly', domain: 'utility', icon: 'swap_horiz',
    capabilities: ['value_input','unit_picker','conversion_result','swap_units'],
  },
  {
    id: 'calculator', family: 'calculator', confidence: 0.96,
    patterns: [/\bcalculator\b/i, /\barithmetic\s*app\b/i],
    appName: 'QuickCalc', domain: 'utility', calculatorKind: 'basic', icon: 'calculate',
    capabilities: ['keypad','expression','result','clear','backspace'],
  },
  {
    id: 'pomodoro', family: 'timer', confidence: 0.99,
    patterns: [/\bpomodoro\b/i, /\bfocus\s*timer\b/i],
    appName: 'FocusFlow', domain: 'productivity', timerKind: 'pomodoro', icon: 'timer',
    capabilities: ['countdown','start_pause','reset','focus_break_mode'],
  },
  {
    id: 'timer_stopwatch', family: 'timer', confidence: 0.98,
    patterns: [/\bstopwatch\b/i, /\bcountdown\s*timer\b/i, /\btimer\s*app\b/i],
    appName: 'TimeFlow', domain: 'utility', timerKind: 'stopwatch', icon: 'timer',
    capabilities: ['elapsed_time','start_pause','reset','laps'],
  },
  {
    id: 'quiz', family: 'quiz', confidence: 0.97,
    patterns: [/\bquiz\b/i, /\bmcq\b/i, /\btrivia\b/i, /\bmultiple choice\b/i],
    appName: 'QuizSpark', domain: 'education', icon: 'quiz',
    capabilities: ['question_flow','options','score','progress','restart'],
  },
  {
    id: 'booking', family: 'schedule', confidence: 0.94,
    patterns: [/\bappointment\b/i, /\bbooking\b/i, /\breservation\b/i, /\bschedule\s*(manager|planner|app)\b/i],
    appName: 'ScheduleFlow', domain: 'scheduling', icon: 'calendar_month',
    capabilities: ['upcoming_schedule','add_booking','status','date_time','quick_summary'],
  },
  {
    id: 'hospital_management', family: 'workspace', confidence: 0.99,
    patterns: [/\b(hospital|clinic|healthcare|medical)\b/i],
    appName: 'CareFlow', domain: 'hospital', icon: 'local_hospital',
    capabilities: ['role_auth','appointments','patients','doctors','medical_records','prescriptions','billing','departments'],
  },
  {
    id: 'school_management', family: 'workspace', confidence: 0.99,
    patterns: [/\b(school|academy|student management|college management)\b/i],
    appName: 'CampusFlow', domain: 'school', icon: 'school',
    capabilities: ['role_auth','students','teachers','classes','attendance','assignments','grades','timetable'],
  },
  {
    id: 'notes_app', family: 'workspace', confidence: 0.98,
    patterns: [/\b(notes?|notepad|memo)\b/i],
    appName: 'NoteFlow', domain: 'notes', icon: 'note_alt',
    capabilities: ['notes','search','tags','favorites','archive'],
  },
  {
    id: 'shopping_catalog', family: 'catalog', confidence: 0.93,
    patterns: [/\bproduct\s*catalog\b/i, /\bshopping\s*app\b/i, /\be[- ]?commerce\b/i, /\bonline store\b/i],
    appName: 'ShopFlow', domain: 'commerce', icon: 'storefront',
    capabilities: ['catalog_grid','search','category_filter','favorites','cart_count'],
  },
];



const SCREEN_BLUEPRINTS = {
  hospital_management: [
    { id:'home', title:'Home', kind:'dashboard', icon:'home' },
    { id:'today', title:'Today', kind:'dashboard', icon:'today' },
    { id:'overview', title:'Overview', kind:'dashboard', icon:'dashboard' },
    { id:'appointments', title:'Appointments', kind:'calendar', icon:'event' },
    { id:'bookAppointment', title:'Book Appointment', kind:'form', icon:'add_circle' },
    { id:'doctors', title:'Doctors', kind:'list', icon:'medical_services' },
    { id:'patients', title:'Patients', kind:'list', icon:'people' },
    { id:'records', title:'Medical Records', kind:'history', icon:'folder_shared' },
    { id:'prescriptions', title:'Prescriptions', kind:'list', icon:'medication' },
    { id:'departments', title:'Departments', kind:'categories', icon:'domain' },
    { id:'billing', title:'Billing', kind:'history', icon:'receipt_long' },
    { id:'schedule', title:'Schedule', kind:'calendar', icon:'calendar_month' },
    { id:'notifications', title:'Notifications', kind:'reminders', icon:'notifications' },
    { id:'profile', title:'Profile', kind:'settings', icon:'person' },
  ],
  school_management: [
    { id:'home', title:'Home', kind:'dashboard', icon:'home' },
    { id:'today', title:'Today', kind:'dashboard', icon:'today' },
    { id:'overview', title:'Overview', kind:'dashboard', icon:'dashboard' },
    { id:'timetable', title:'Timetable', kind:'calendar', icon:'calendar_month' },
    { id:'assignments', title:'Assignments', kind:'list', icon:'assignment' },
    { id:'attendance', title:'Attendance', kind:'history', icon:'how_to_reg' },
    { id:'grades', title:'Grades', kind:'list', icon:'grade' },
    { id:'classes', title:'Classes', kind:'list', icon:'class_' },
    { id:'students', title:'Students', kind:'list', icon:'people' },
    { id:'staff', title:'Staff', kind:'list', icon:'badge' },
    { id:'grading', title:'Grading', kind:'form', icon:'edit_note' },
    { id:'notifications', title:'Notifications', kind:'reminders', icon:'notifications' },
    { id:'profile', title:'Profile', kind:'settings', icon:'person' },
  ],
  notes_app: [
    { id:'notes', title:'Notes', kind:'list', icon:'note_alt' },
    { id:'newNote', title:'New Note', kind:'form', icon:'add' },
    { id:'search', title:'Search', kind:'search', icon:'search' },
    { id:'tags', title:'Tags', kind:'categories', icon:'sell' },
    { id:'favorites', title:'Favorites', kind:'favorites', icon:'star' },
    { id:'archive', title:'Archive', kind:'history', icon:'archive' },
    { id:'settings', title:'Settings', kind:'settings', icon:'settings' },
  ],
  calorie_tracker: [
    { id:'dashboard', title:'Dashboard', kind:'dashboard', icon:'dashboard' },
    { id:'addFood', title:'Add Food', kind:'form', icon:'add_circle' },
    { id:'foodLog', title:'Food Log', kind:'history', icon:'restaurant_menu' },
    { id:'meals', title:'Meals', kind:'list', icon:'lunch_dining' },
    { id:'nutrition', title:'Nutrition Summary', kind:'analytics', icon:'pie_chart' },
    { id:'macroGoals', title:'Macro Goals', kind:'goal', icon:'track_changes' },
    { id:'weightProgress', title:'Weight Progress', kind:'analytics', icon:'monitor_weight' },
    { id:'weeklyAnalytics', title:'Weekly Analytics', kind:'analytics', icon:'insights' },
    { id:'recipes', title:'Recipes', kind:'list', icon:'menu_book' },
    { id:'favorites', title:'Favorite Foods', kind:'favorites', icon:'star' },
    { id:'reminders', title:'Meal Reminders', kind:'reminders', icon:'notifications' },
    { id:'settings', title:'Profile & Settings', kind:'settings', icon:'person' },
  ],
  expense_tracker: [
    { id:'dashboard', title:'Dashboard', kind:'dashboard', icon:'dashboard' },
    { id:'transactions', title:'Transactions', kind:'history', icon:'receipt_long' },
    { id:'addTransaction', title:'Add Transaction', kind:'form', icon:'add_card' },
    { id:'budgets', title:'Budgets', kind:'goal', icon:'account_balance_wallet' },
    { id:'categories', title:'Categories', kind:'categories', icon:'category' },
    { id:'accounts', title:'Accounts & Wallets', kind:'list', icon:'account_balance' },
    { id:'savingsGoals', title:'Savings Goals', kind:'goal', icon:'savings' },
    { id:'bills', title:'Bills & Subscriptions', kind:'reminders', icon:'event_note' },
    { id:'analytics', title:'Monthly Analytics', kind:'analytics', icon:'insights' },
    { id:'reports', title:'Reports', kind:'reports', icon:'assessment' },
    { id:'recurring', title:'Recurring Transactions', kind:'list', icon:'repeat' },
    { id:'settings', title:'Profile & Settings', kind:'settings', icon:'person' },
  ],
  savings_tracker: [
    { id:'dashboard', title:'Dashboard', kind:'dashboard', icon:'dashboard' },
    { id:'goals', title:'Savings Goals', kind:'goal', icon:'savings' },
    { id:'addContribution', title:'Add Contribution', kind:'form', icon:'add_circle' },
    { id:'contributions', title:'Contributions', kind:'history', icon:'receipt_long' },
    { id:'accounts', title:'Accounts', kind:'list', icon:'account_balance' },
    { id:'milestones', title:'Milestones', kind:'achievements', icon:'emoji_events' },
    { id:'progress', title:'Goal Progress', kind:'analytics', icon:'insights' },
    { id:'forecast', title:'Savings Forecast', kind:'analytics', icon:'show_chart' },
    { id:'plans', title:'Saving Plans', kind:'list', icon:'list_alt' },
    { id:'reminders', title:'Contribution Reminders', kind:'reminders', icon:'notifications' },
    { id:'history', title:'History', kind:'history', icon:'history' },
    { id:'settings', title:'Profile & Settings', kind:'settings', icon:'person' },
  ],
  habit_tracker: [
    { id:'today', title:'Today', kind:'dashboard', icon:'today' },
    { id:'habits', title:'My Habits', kind:'list', icon:'check_circle' },
    { id:'addHabit', title:'Add Habit', kind:'form', icon:'add_task' },
    { id:'routine', title:'Routine Planner', kind:'calendar', icon:'calendar_month' },
    { id:'streaks', title:'Streaks', kind:'history', icon:'local_fire_department' },
    { id:'calendar', title:'Habit Calendar', kind:'calendar', icon:'calendar_month' },
    { id:'progress', title:'Progress', kind:'analytics', icon:'insights' },
    { id:'insights', title:'Habit Insights', kind:'analytics', icon:'lightbulb' },
    { id:'achievements', title:'Achievements', kind:'achievements', icon:'emoji_events' },
    { id:'reminders', title:'Reminders', kind:'reminders', icon:'notifications' },
    { id:'templates', title:'Habit Templates', kind:'list', icon:'view_list' },
    { id:'settings', title:'Profile & Settings', kind:'settings', icon:'person' },
  ],
  hydration_tracker: [
    { id:'today', title:'Today', kind:'dashboard', icon:'water_drop' },
    { id:'quickAdd', title:'Quick Add Water', kind:'form', icon:'add_circle' },
    { id:'timeline', title:'Daily Timeline', kind:'history', icon:'schedule' },
    { id:'goal', title:'Daily Goal', kind:'goal', icon:'flag' },
    { id:'weekly', title:'Weekly Progress', kind:'analytics', icon:'insights' },
    { id:'monthly', title:'Monthly History', kind:'history', icon:'calendar_month' },
    { id:'drinkTypes', title:'Drink Types', kind:'categories', icon:'category' },
    { id:'reminders', title:'Hydration Reminders', kind:'reminders', icon:'notifications' },
    { id:'streaks', title:'Streaks', kind:'history', icon:'local_fire_department' },
    { id:'insights', title:'Hydration Insights', kind:'analytics', icon:'lightbulb' },
    { id:'achievements', title:'Achievements', kind:'achievements', icon:'emoji_events' },
    { id:'settings', title:'Profile & Settings', kind:'settings', icon:'person' },
  ],
  workout_tracker: [
    { id:'dashboard', title:'Dashboard', kind:'dashboard', icon:'dashboard' },
    { id:'plans', title:'Workout Plans', kind:'list', icon:'list_alt' },
    { id:'exercises', title:'Exercise Library', kind:'list', icon:'fitness_center' },
    { id:'workoutDetail', title:'Workout Detail', kind:'detail', icon:'info' },
    { id:'startWorkout', title:'Start Workout', kind:'form', icon:'play_arrow' },
    { id:'logWorkout', title:'Log Workout', kind:'form', icon:'add_circle' },
    { id:'history', title:'Workout History', kind:'history', icon:'history' },
    { id:'progress', title:'Progress', kind:'analytics', icon:'insights' },
    { id:'records', title:'Personal Records', kind:'achievements', icon:'emoji_events' },
    { id:'bodyMetrics', title:'Body Metrics', kind:'analytics', icon:'monitor_weight' },
    { id:'goals', title:'Fitness Goals', kind:'goal', icon:'flag' },
    { id:'settings', title:'Profile & Settings', kind:'settings', icon:'person' },
  ],
  attendance_tracker: [
    { id:'dashboard', title:'Dashboard', kind:'dashboard', icon:'dashboard' },
    { id:'classes', title:'Classes', kind:'list', icon:'school' },
    { id:'students', title:'Students', kind:'list', icon:'groups' },
    { id:'mark', title:'Mark Attendance', kind:'form', icon:'fact_check' },
    { id:'register', title:'Daily Register', kind:'history', icon:'how_to_reg' },
    { id:'calendar', title:'Attendance Calendar', kind:'calendar', icon:'calendar_month' },
    { id:'history', title:'Attendance History', kind:'history', icon:'history' },
    { id:'analytics', title:'Analytics', kind:'analytics', icon:'insights' },
    { id:'reports', title:'Reports', kind:'reports', icon:'assessment' },
    { id:'lowAttendance', title:'Low Attendance', kind:'list', icon:'warning_amber' },
    { id:'notifications', title:'Notifications', kind:'reminders', icon:'notifications' },
    { id:'settings', title:'Profile & Settings', kind:'settings', icon:'person' },
  ],
  booking: [
    { id:'services', title:'Services', kind:'list', icon:'home_repair_service' },
    { id:'categories', title:'Service Categories', kind:'categories', icon:'category' },
    { id:'serviceDetail', title:'Service Detail', kind:'detail', icon:'info' },
    { id:'providers', title:'Providers', kind:'list', icon:'groups' },
    { id:'providerDetail', title:'Provider Detail', kind:'detail', icon:'person' },
    { id:'availability', title:'Availability', kind:'calendar', icon:'calendar_month' },
    { id:'newBooking', title:'Book Appointment', kind:'form', icon:'event_available' },
    { id:'confirmation', title:'Booking Confirmation', kind:'detail', icon:'check_circle' },
    { id:'upcoming', title:'Upcoming Bookings', kind:'list', icon:'event_note' },
    { id:'history', title:'Booking History', kind:'history', icon:'history' },
    { id:'favorites', title:'Favorite Providers', kind:'favorites', icon:'star' },
    { id:'notifications', title:'Notifications', kind:'reminders', icon:'notifications' },
    { id:'settings', title:'Profile & Settings', kind:'settings', icon:'person' },
  ],
  quiz: [
    { id:'home', title:'Home', kind:'dashboard', icon:'home' },
    { id:'categories', title:'Categories', kind:'categories', icon:'category' },
    { id:'quizSets', title:'Quiz Sets', kind:'list', icon:'view_list' },
    { id:'quizDetail', title:'Quiz Detail', kind:'detail', icon:'info' },
    { id:'quiz', title:'Take Quiz', kind:'form', icon:'quiz' },
    { id:'results', title:'Results', kind:'analytics', icon:'emoji_events' },
    { id:'review', title:'Review Answers', kind:'history', icon:'fact_check' },
    { id:'history', title:'Quiz History', kind:'history', icon:'history' },
    { id:'leaderboard', title:'Leaderboard', kind:'analytics', icon:'leaderboard' },
    { id:'achievements', title:'Achievements', kind:'achievements', icon:'emoji_events' },
    { id:'saved', title:'Saved Quizzes', kind:'favorites', icon:'bookmark' },
    { id:'settings', title:'Profile & Settings', kind:'settings', icon:'person' },
  ],
  shopping_catalog: [
    { id:'home', title:'Home', kind:'dashboard', icon:'storefront' },
    { id:'categories', title:'Categories', kind:'categories', icon:'category' },
    { id:'search', title:'Search', kind:'search', icon:'search' },
    { id:'products', title:'Products', kind:'list', icon:'inventory_2' },
    { id:'productDetail', title:'Product Detail', kind:'detail', icon:'info' },
    { id:'favorites', title:'Favorites', kind:'favorites', icon:'favorite' },
    { id:'cart', title:'Cart', kind:'cart', icon:'shopping_cart' },
    { id:'checkout', title:'Checkout', kind:'form', icon:'payments' },
    { id:'orders', title:'Orders', kind:'history', icon:'receipt_long' },
    { id:'orderDetail', title:'Order Detail', kind:'detail', icon:'local_shipping' },
    { id:'notifications', title:'Notifications', kind:'reminders', icon:'notifications' },
    { id:'profile', title:'Profile', kind:'profile', icon:'person' },
    { id:'settings', title:'Settings', kind:'settings', icon:'settings' },
  ],
};


const NAVIGATION_BLUEPRINTS = {
  hospital_management: ['home','appointments','records','prescriptions'],
  school_management: ['home','timetable','assignments','grades'],
  notes_app: ['notes','search','favorites','archive'],
  calorie_tracker: ['dashboard','foodLog','addFood','weeklyAnalytics'],
  expense_tracker: ['dashboard','transactions','addTransaction','budgets'],
  savings_tracker: ['dashboard','goals','addContribution','progress'],
  habit_tracker: ['today','habits','addHabit','progress'],
  hydration_tracker: ['today','timeline','quickAdd','weekly'],
  workout_tracker: ['dashboard','plans','startWorkout','progress'],
  attendance_tracker: ['dashboard','students','mark','reports'],
  bmi_calculator: ['calculator','results','history','guide'],
  tip_calculator: ['calculator','split','history','settings'],
  loan_calculator: ['calculator','results','amortization','saved'],
  grade_calculator: ['calculator','results','history','guide'],
  unit_converter: ['converter','categories','history','favorites'],
  calculator: ['calculator','history','saved','guide'],
  pomodoro: ['timer','sessions','stats','goals'],
  timer_stopwatch: ['timer','sessions','stats','history'],
  quiz: ['home','categories','quiz','leaderboard'],
  booking: ['services','availability','newBooking','upcoming'],
  shopping_catalog: ['home','search','cart','orders'],
};

function navigationPlanFor(archetype, screens = []) {
  const domainAlias = archetype?.domain === 'hospital' ? 'hospital_management'
    : archetype?.domain === 'school' ? 'school_management'
    : archetype?.domain === 'notes' ? 'notes_app'
    : null;
  const requested = NAVIGATION_BLUEPRINTS[archetype.id] || (domainAlias ? NAVIGATION_BLUEPRINTS[domainAlias] : null) || [];
  const byId = new Map(screens.map((screen) => [screen.id, screen]));
  const picked = [];
  for (const id of requested) {
    const screen = byId.get(id);
    if (screen && !picked.some((item) => item.id === screen.id)) picked.push(screen);
  }
  const preferenceKinds = ['dashboard','list','history','form','cart','calendar','analytics','goal','profile'];
  for (const kind of preferenceKinds) {
    if (picked.length >= 4) break;
    const screen = screens.find((item) => item.kind === kind && !picked.some((p) => p.id === item.id));
    if (screen) picked.push(screen);
  }
  for (const screen of screens) {
    if (picked.length >= 4) break;
    if (!picked.some((item) => item.id === screen.id)) picked.push(screen);
  }
  return {
    primary: picked.slice(0, 4).map((screen) => ({ id: screen.id, label: screen.title, icon: screen.icon, kind: screen.kind })),
    overflowLabel: 'More',
  };
}

function screenBlueprintFor(archetype) {
  if (SCREEN_BLUEPRINTS[archetype.id]) return SCREEN_BLUEPRINTS[archetype.id].map((screen) => ({ ...screen }));
  if (archetype.family === 'calculator') return [
    { id:'calculator', title:'Calculator', kind:'dashboard', icon:'calculate' },
    { id:'inputs', title:'Inputs', kind:'form', icon:'edit_note' },
    { id:'results', title:'Results', kind:'analytics', icon:'insights' },
    { id:'history', title:'History', kind:'history', icon:'history' },
    { id:'saved', title:'Saved Results', kind:'favorites', icon:'bookmark' },
    { id:'compare', title:'Compare Results', kind:'reports', icon:'compare_arrows' },
    { id:'charts', title:'Charts', kind:'analytics', icon:'show_chart' },
    { id:'presets', title:'Presets', kind:'list', icon:'tune' },
    { id:'guide', title:'Formula Guide', kind:'detail', icon:'menu_book' },
    { id:'examples', title:'Examples', kind:'list', icon:'view_list' },
    { id:'favorites', title:'Favorites', kind:'favorites', icon:'star' },
    { id:'settings', title:'Settings', kind:'settings', icon:'settings' },
  ];
  if (archetype.family === 'converter') return [
    { id:'converter', title:'Converter', kind:'dashboard', icon:'swap_horiz' },
    { id:'quickConvert', title:'Quick Convert', kind:'form', icon:'flash_on' },
    { id:'categories', title:'Unit Categories', kind:'categories', icon:'category' },
    { id:'favorites', title:'Favorites', kind:'favorites', icon:'star' },
    { id:'history', title:'History', kind:'history', icon:'history' },
    { id:'reference', title:'Unit Reference', kind:'detail', icon:'straighten' },
    { id:'common', title:'Common Conversions', kind:'list', icon:'view_list' },
    { id:'custom', title:'Custom Units', kind:'form', icon:'tune' },
    { id:'tables', title:'Conversion Tables', kind:'reports', icon:'table_chart' },
    { id:'calculator', title:'Quick Calculator', kind:'dashboard', icon:'calculate' },
    { id:'saved', title:'Saved Conversions', kind:'favorites', icon:'bookmark' },
    { id:'settings', title:'Settings', kind:'settings', icon:'settings' },
  ];
  if (archetype.family === 'timer') return [
    { id:'timer', title:'Timer', kind:'dashboard', icon:'timer' },
    { id:'presets', title:'Presets', kind:'list', icon:'tune' },
    { id:'focusModes', title:'Focus Modes', kind:'categories', icon:'category' },
    { id:'sessions', title:'Sessions', kind:'history', icon:'history' },
    { id:'stats', title:'Statistics', kind:'analytics', icon:'insights' },
    { id:'goals', title:'Focus Goals', kind:'goal', icon:'flag' },
    { id:'schedule', title:'Focus Schedule', kind:'calendar', icon:'calendar_month' },
    { id:'sounds', title:'Sounds', kind:'list', icon:'music_note' },
    { id:'reminders', title:'Reminders', kind:'reminders', icon:'notifications' },
    { id:'achievements', title:'Achievements', kind:'achievements', icon:'emoji_events' },
    { id:'history', title:'Activity History', kind:'history', icon:'history' },
    { id:'settings', title:'Settings', kind:'settings', icon:'settings' },
  ];
  return [
    { id:'dashboard', title:'Dashboard', kind:'dashboard', icon:'dashboard' },
    { id:'records', title:'Records', kind:'list', icon:'list_alt' },
    { id:'add', title:'Add New', kind:'form', icon:'add_circle' },
    { id:'categories', title:'Categories', kind:'categories', icon:'category' },
    { id:'details', title:'Details', kind:'detail', icon:'info' },
    { id:'calendar', title:'Calendar', kind:'calendar', icon:'calendar_month' },
    { id:'analytics', title:'Analytics', kind:'analytics', icon:'insights' },
    { id:'reports', title:'Reports', kind:'reports', icon:'assessment' },
    { id:'favorites', title:'Favorites', kind:'favorites', icon:'star' },
    { id:'history', title:'History', kind:'history', icon:'history' },
    { id:'notifications', title:'Notifications', kind:'reminders', icon:'notifications' },
    { id:'settings', title:'Profile & Settings', kind:'settings', icon:'person' },
  ];
}
function titleCase(value = '') {
  return String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function inferAppName(prompt, archetype) {
  const quoted = String(prompt).match(/(?:called|named)\s+["']?([A-Za-z0-9][A-Za-z0-9 _-]{1,32})["']?/i);
  return quoted ? titleCase(quoted[1]) : archetype.appName;
}

function chooseTheme(archetype, prompt = '') {
  const text = String(prompt).toLowerCase();
  if (/\b(dark|black|midnight)\b/.test(text)) {
    return { primary:'#22D3EE', secondary:'#8B5CF6', background:'#020617', surface:'#0F172A', text:'#F8FAFC', accent:'#10B981', isLight:false };
  }
  const byDomain = {
    health: { primary:'#16A34A', secondary:'#22C55E', background:'#F0FDF4', surface:'#FFFFFF', text:'#14532D', accent:'#F97316', isLight:true },
    fitness: { primary:'#EA580C', secondary:'#FB923C', background:'#FFF7ED', surface:'#FFFFFF', text:'#431407', accent:'#16A34A', isLight:true },
    finance: { primary:'#2563EB', secondary:'#0EA5E9', background:'#EFF6FF', surface:'#FFFFFF', text:'#172554', accent:'#10B981', isLight:true },
    productivity: { primary:'#7C3AED', secondary:'#A78BFA', background:'#F5F3FF', surface:'#FFFFFF', text:'#2E1065', accent:'#14B8A6', isLight:true },
    education: { primary:'#4F46E5', secondary:'#818CF8', background:'#EEF2FF', surface:'#FFFFFF', text:'#1E1B4B', accent:'#F59E0B', isLight:true },
    scheduling: { primary:'#0891B2', secondary:'#22D3EE', background:'#ECFEFF', surface:'#FFFFFF', text:'#164E63', accent:'#F97316', isLight:true },
    commerce: { primary:'#DB2777', secondary:'#F472B6', background:'#FDF2F8', surface:'#FFFFFF', text:'#500724', accent:'#7C3AED', isLight:true },
    utility: { primary:'#0F766E', secondary:'#14B8A6', background:'#F0FDFA', surface:'#FFFFFF', text:'#134E4A', accent:'#F59E0B', isLight:true },
  };
  return byDomain[archetype.domain] || byDomain.utility;
}

function classifyAppArchetype(prompt = '', aiPlan = null) {
  const clean = String(prompt || '').trim();
  if (!clean) return null;
  // A domain management/system request should use the contextual workspace even
  // when it is NOT role-based. Roles/auth are decided separately by the architect.
  // This also prevents phrases such as "school management with attendance"
  // from being misclassified as a single-purpose attendance tracker.
  const inferredDomain = inferDomain(clean);
  const contextualManagement = /\b(management|manager|system|portal|platform|operations|workspace)\b/i.test(clean);
  if (contextualManagement && inferredDomain !== 'generic' && DOMAIN_BLUEPRINTS[inferredDomain]) {
    return {
      id: `${inferredDomain}_workspace`, family: 'workspace', confidence: 0.97,
      appName: `${titleCase(inferredDomain)} Manager`, domain: inferredDomain, icon: 'dashboard',
      capabilities: ['contextual_screens','create_update_delete','search','profile'],
    };
  }
  for (const archetype of ARCHETYPES) {
    if (archetype.patterns.some(pattern => pattern.test(clean))) return { ...archetype };
  }
  const hint = String(aiPlan?.archetype || '').toLowerCase();
  if (hint) {
    const byHint = ARCHETYPES.find(a => a.id.includes(hint) || hint.includes(a.id) || a.domain === hint);
    if (byHint) return { ...byHint, confidence: Math.min(byHint.confidence, 0.88) };
  }
  // Universal role-aware fallback: any explicit role/permission/management prompt
  // becomes a contextual workspace even when the domain has no dedicated archetype.
  if (roleBasedRequested(clean)) {
    const roleDomain = inferDomain(clean);
    return {
      id: `${roleDomain || 'generic'}_role_workspace`, family: 'workspace', confidence: 0.95,
      appName: roleDomain && roleDomain !== 'generic' ? `${titleCase(roleDomain)} Workspace` : 'Role Workspace',
      domain: roleDomain || 'generic', icon: 'dashboard',
      capabilities: ['role_auth','role_dashboards','role_navigation','permissions','profile'],
    };
  }
  return null;
}

function getContextAwarePlan(prompt = '', aiPlan = null) {
  const archetype = classifyAppArchetype(prompt, aiPlan);
  if (!archetype) return null;
  const uiPreset = normalizeUiPreset(aiPlan?.uiPreset || inferUiPresetFromPrompt(prompt) || (['finance','scheduling','commerce'].includes(archetype.domain) ? 'business' : 'modern'));
  const plan = {
    plannerVersion: 1,
    archetype: archetype.id,
    family: archetype.family,
    domain: archetype.domain,
    appName: aiPlan?.appName || inferAppName(prompt, archetype),
    icon: archetype.icon,
    confidence: archetype.confidence,
    uiPreset,
    theme: aiPlan?.theme && typeof aiPlan.theme === 'object' ? aiPlan.theme : chooseTheme(archetype, prompt),
    capabilities: [...archetype.capabilities],
    calculatorKind: archetype.calculatorKind || null,
    trackerKind: archetype.trackerKind || null,
    timerKind: archetype.timerKind || null,
    unit: archetype.unit || null,
    goal: archetype.goal || null,
    screenBlueprint: screenBlueprintFor(archetype),
    prompt: String(prompt || '').trim(),
  };
  plan.navigationPlan = navigationPlanFor(archetype, plan.screenBlueprint);
  plan.appBlueprint = buildArchitectBlueprint(prompt, plan);
  // For role-aware workspaces the architect is the source of truth for screens.
  // This prevents the legacy universal CRUD/12-screen shell from leaking into
  // hospital, restaurant, HR, logistics, custom-role, and future role apps.
  if (plan.family === 'workspace' && Array.isArray(plan.appBlueprint?.screens) && plan.appBlueprint.screens.length) {
    const legacyIconKey = plan.domain === 'hospital' ? 'hospital_management' : plan.domain === 'school' ? 'school_management' : plan.domain === 'notes' ? 'notes_app' : '';
    const legacyIcons = new Map((SCREEN_BLUEPRINTS[legacyIconKey] || []).map((item) => [item.id, item.icon]));
    plan.screenBlueprint = plan.appBlueprint.screens.map((screen) => ({
      id: screen.id,
      title: screen.label || titleCase(screen.id),
      kind: screen.kind || 'list',
      icon: screen.icon || legacyIcons.get(screen.id) || (screen.kind === 'dashboard' ? 'dashboard' : screen.kind === 'calendar' ? 'calendar_month' : screen.kind === 'settings' ? 'person' : 'list_alt'),
      roleVisibility: Array.isArray(screen.roleVisibility) ? [...screen.roleVisibility] : [],
      purpose: screen.purpose || '',
    }));
    plan.navigationPlan = navigationPlanFor(archetype, plan.screenBlueprint);
    // The architect replaces the legacy screen set for contextual workspaces.
    // Rebase default navigation onto the final screen IDs so generic legacy IDs
    // such as dashboard/history/add cannot silently fall back to the first page.
    plan.appBlueprint.navigation = plan.appBlueprint.navigation || { default: [], byRole: {} };
    plan.appBlueprint.navigation.default = plan.navigationPlan.primary.map((item) => item.id);
  }
  const critique = critiqueBlueprint(plan.appBlueprint);
  plan.blueprintCritique = critique;
  if (!critique.pass) {
    console.warn('[critic] blueprint issues:', critique.errors.join('; '));
  }
  plan.roles = plan.appBlueprint.roles;
  plan.roleDashboards = plan.appBlueprint.roleDashboards;
  plan.navigationByRole = plan.appBlueprint.navigation.byRole;
  plan.primaryActionsByRole = plan.appBlueprint.primaryActions.byRole;
  plan.featurePolicies = plan.appBlueprint.featurePolicies;
  console.log(`[architect] domain=${plan.appBlueprint.appIdentity.domain} roles=${plan.roles.map(r=>r.label).join(',') || 'none'} screens=${plan.screenBlueprint.length} analytics=${plan.featurePolicies.analytics}`);
  return plan;
}

module.exports = { ARCHETYPES, SCREEN_BLUEPRINTS, NAVIGATION_BLUEPRINTS, screenBlueprintFor, navigationPlanFor, classifyAppArchetype, getContextAwarePlan };
