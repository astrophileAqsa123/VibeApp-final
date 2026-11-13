const test = require("node:test");
const assert = require("node:assert/strict");
const { buildFlutterCrudApp } = require("../services/exact500AppTemplates/uniqueFlutterCrudFactory");
const { buildFlutterSupabaseCrudApp } = require("../services/exact500AppTemplates/supabaseCrudFactory");
const { checkFlutterCodeSyntax } = require("../services/exact500AppTemplates/flutterCodeSafety");
const { applyLocalCodeEdit } = require("../services/localCodeEditService");

const studentTemplate = {
  id: "student-management",
  appType: "student_management",
  appName: "Student Management",
  entity: "Student",
  domain: "education",
  layout: "card_stack",
  logo: "🎓",
  theme: {
    primary: "#2563EB",
    secondary: "#38BDF8",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#172033",
    accent: "#10B981",
  },
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "course", label: "Course", type: "text", required: false },
  ],
  initialData: [],
};

function assertProductShell(code) {
  assert.match(code, /class VibeSplashPage/);
  assert.match(code, /class VibeProductShell/);
  assert.match(code, /class VibeDashboardPage/);
  assert.match(code, /class VibeProfilePage/);
  assert.match(code, /class VibeSettingsPage/);
  assert.match(code, /static const String navigation = 'bottom'/);
  assert.match(code, /NavigationRail\(/);
  assert.match(code, /NavigationDestinationLabelBehavior\.onlyShowSelected/);
  assert.match(code, /grid\.maxWidth < 360/);
  assert.match(code, /constraints\.maxWidth < 430/);
  assert.match(code, /EdgeInsets\.fromLTRB\(20, 20, 20, 96\)/);
  assert.doesNotMatch(code, /Tap the add button to create your first record/);
  assert.equal(checkFlutterCodeSyntax(code).valid, true);
}

test("student template generates a complete product shell", () => {
  const code = buildFlutterCrudApp(studentTemplate);
  assertProductShell(code);
  assert.match(code, /class RecordDetailsPage extends StatelessWidget/);
  assert.match(code, /onTap: \(\) => _openDetails\(record\)/);
  assert.match(code, /const Text\('View details'/);
  assert.match(code, /\.\.\.AppProfile\.fields\.map/);
  assert.doesNotMatch(code, /final displayFields = AppProfile\.fields\.take/);
});

test("Supabase generation receives the same product shell", () => {
  const result = buildFlutterSupabaseCrudApp({
    template: studentTemplate,
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "test-key",
    tableName: "students",
  });
  assertProductShell(result.code);
});

test("experience features remain editable without full AI generation", async () => {
  const original = buildFlutterCrudApp(studentTemplate);
  const removedProfile = await applyLocalCodeEdit({
    instruction: "remove profile page",
    existingCode: original,
    originalPrompt: "student management app",
  });
  assert.equal(removedProfile.handled, true);
  assert.match(removedProfile.code, /static const bool hasProfile = false/);

  const drawer = await applyLocalCodeEdit({
    instruction: "use a navigation drawer",
    existingCode: removedProfile.code,
    originalPrompt: "student management app",
    appConfig: removedProfile.appConfig,
  });
  assert.equal(drawer.handled, true);
  assert.match(drawer.code, /static const String navigation = 'drawer'/);
});

test("role-based login prompts generate guarded demo authentication", () => {
  const code = buildFlutterCrudApp({
    ...studentTemplate,
    features: { hasAuth: true, roles: ["Admin", "Manager", "Viewer"] },
  });
  assert.match(code, /static const bool hasAuth = true/);
  assert.match(code, /class VibeRoleLoginPage/);
  assert.match(code, /class VibeAuthSession/);
  assert.match(code, /role: 'Admin'/);
  assert.match(code, /role: 'Manager'/);
  assert.match(code, /role: 'Viewer'/);
  assert.match(code, /!VibeAuthSession\.canDelete/);
  assert.match(code, /VibeAuthSession\.signOut/);
  assert.equal(checkFlutterCodeSyntax(code).valid, true);
});

test("role-based login can be added to an existing generated app", async () => {
  const original = buildFlutterCrudApp(studentTemplate);
  const edited = await applyLocalCodeEdit({
    instruction: "add role based login for admin, manager and viewer",
    existingCode: original,
    originalPrompt: "student management app",
    appConfig: studentTemplate,
  });
  assert.equal(edited.handled, true);
  assert.match(edited.code, /static const bool hasAuth = true/);
  assert.match(edited.code, /role: 'Viewer'/);
  assert.equal(checkFlutterCodeSyntax(edited.code).valid, true);
});

test("UI presets produce renderer metadata and distinct styling hooks", () => {
  for (const preset of ["minimal", "modern", "business", "soft", "compact"]) {
    const code = buildFlutterCrudApp({
      ...studentTemplate,
      uiPreset: preset,
    });
    assert.match(code, new RegExp(`static const String uiPreset = '${preset}'`));
    assert.match(code, /static double get cardRadius/);
    assert.equal(checkFlutterCodeSyntax(code).valid, true);
  }
});

test("role-based apps include signup and role-specific dashboard behavior", () => {
  const code = buildFlutterCrudApp({
    ...studentTemplate,
    features: {
      hasAuth: true,
      allowSignup: true,
      hasDashboard: true,
      navigation: "bottom",
      roles: ["Admin", "Teacher", "Student"],
    },
  });
  assert.match(code, /class VibeRoleSignupPage/);
  assert.match(code, /dashboardTitle/);
  assert.match(code, /Teacher Dashboard|role \+ ' Dashboard'/);
  assert.match(code, /signupRoles/);
  assert.match(code, /Admin-like roles are intentionally excluded/);
  assert.equal(checkFlutterCodeSyntax(code).valid, true);
});
