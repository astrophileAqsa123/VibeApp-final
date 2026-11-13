const { normalizeAppSpec } = require('../appSpec');
const { ComponentRegistry, resolveComponents } = require('../components');

function camel(value = '') {
  const words = String(value).replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'record';
  return words.map((word, index) => index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function singularLabel(value = '') {
  let text = String(value).trim();
  if (/ies$/i.test(text)) text = `${text.slice(0, -3)}y`;
  else if (/sses$/i.test(text)) text = text.slice(0, -2);
  else if (/s$/i.test(text) && !/ss$/i.test(text)) text = text.slice(0, -1);
  return text || 'Record';
}

const DOMAIN_FIELDS = {
  hospital: {
    appointment: [['patientName','Patient','text'],['doctorName','Doctor','text'],['date','Date','date'],['time','Time','text'],['status','Status','status',['Scheduled','Completed','Cancelled']],['notes','Notes','textarea']],
    doctor: [['name','Name','text'],['specialty','Specialty','text'],['phone','Phone','phone'],['status','Status','status',['Available','Busy','Off duty']]],
    patient: [['name','Name','text'],['age','Age','number'],['phone','Phone','phone'],['condition','Condition','text'],['status','Status','status',['Active','Follow-up','Discharged']]],
    medicalRecord: [['patientName','Patient','text'],['date','Date','date'],['diagnosis','Diagnosis','text'],['notes','Clinical Notes','textarea']],
    prescription: [['patientName','Patient','text'],['medicine','Medicine','text'],['dosage','Dosage','text'],['date','Date','date'],['status','Status','status',['Active','Completed','Stopped']]],
    department: [['name','Name','text'],['head','Department Head','text'],['location','Location','text']],
    billing: [['patientName','Patient','text'],['amount','Amount','number'],['date','Date','date'],['status','Status','status',['Pending','Paid','Overdue']]],
  },
  school: {
    student: [['name','Name','text'],['className','Class','text'],['guardian','Guardian','text'],['phone','Phone','phone'],['status','Status','status',['Active','Absent','Graduated']]],
    teacher: [['name','Name','text'],['subject','Subject','text'],['phone','Phone','phone'],['status','Status','status',['Active','On leave']]],
    assignment: [['title','Title','text'],['className','Class','text'],['dueDate','Due Date','date'],['status','Status','status',['Open','Submitted','Graded']]],
    attendance: [['studentName','Student','text'],['date','Date','date'],['status','Status','status',['Present','Absent','Late']]],
    grade: [['studentName','Student','text'],['subject','Subject','text'],['score','Score','number'],['date','Date','date']],
    class: [['name','Name','text'],['teacher','Teacher','text'],['room','Room','text']],
  },
  hotel: {
    booking: [['guestName','Guest','text'],['room','Room','text'],['checkIn','Check In','date'],['checkOut','Check Out','date'],['status','Status','status',['Booked','Checked in','Completed','Cancelled']]],
    reservation: [['guestName','Guest','text'],['room','Room','text'],['date','Date','date'],['status','Status','status',['Reserved','Confirmed','Cancelled']]],
    guest: [['name','Name','text'],['phone','Phone','phone'],['email','Email','email'],['status','Status','status',['Staying','Upcoming','Past']]],
    room: [['name','Room','text'],['type','Type','text'],['price','Price','number'],['status','Status','status',['Available','Occupied','Cleaning','Maintenance']]],
    payment: [['guestName','Guest','text'],['amount','Amount','number'],['date','Date','date'],['status','Status','status',['Pending','Paid','Refunded']]],
    maintenance: [['room','Room','text'],['issue','Issue','text'],['date','Date','date'],['status','Status','status',['Open','In progress','Resolved']]],
  },
};

function genericFields(label, kind = '') {
  const fields = [[/name|people|staff|doctor|patient|student|guest|customer|member/i.test(label) ? 'name' : 'title', /name|people|staff|doctor|patient|student|guest|customer|member/i.test(label) ? 'Name' : 'Title', 'text']];
  if (/calendar|history|booking|appointment|schedule|payment|billing|order|transaction/i.test(`${label} ${kind}`)) fields.push(['date','Date','date']);
  if (/payment|billing|expense|transaction|budget|price|invoice/i.test(label)) fields.push(['amount','Amount','number']);
  fields.push(['status','Status','status',['Active','Pending','Completed']],['notes','Notes','textarea']);
  return fields;
}

function fieldObjects(defs) {
  return defs.map(([id,label,type,options], index) => ({ id, label, type, required:index===0, searchable:type==='text', filterable:type==='status', ...(options ? {options} : {}) }));
}

function entityFromScreen(screen, domain) {
  const label = singularLabel(screen.label || screen.title || screen.id);
  const id = camel(label);
  const domainMap = DOMAIN_FIELDS[domain] || {};
  const direct = domainMap[id] || domainMap[camel(screen.id)] || null;
  return {
    id,
    name: label,
    pluralName: String(screen.label || screen.title || `${label}s`),
    icon: screen.icon || screen.id || 'description',
    displayField: /name|people|staff|doctor|patient|student|guest|customer|member/i.test(label) ? 'name' : 'title',
    operations: { create:true, read:true, update:true, delete:true },
    fields: fieldObjects(direct || genericFields(label, screen.kind)),
  };
}

function buildWorkspaceComponentSpec(plan = {}, prompt = '') {
  const blueprint = plan.appBlueprint || {};
  const domain = String(plan.domain || blueprint.appIdentity?.domain || 'generic');
  const sourceScreens = Array.isArray(blueprint.screens) && blueprint.screens.length ? blueprint.screens : (plan.screenBlueprint || []);
  const excludedKinds = new Set(['dashboard','settings','reminders','reports','analytics','search','detail','favorites','form']);
  const excludedIds = /^(home|today|overview|profile|settings|notifications|reports|analytics|search)$/i;
  const entities = [];
  const seen = new Set();
  const screenEntityMap = new Map();
  for (const screen of sourceScreens) {
    const kind = String(screen.kind || '').toLowerCase();
    if (excludedKinds.has(kind) || excludedIds.test(String(screen.id || ''))) continue;
    const entity = entityFromScreen(screen, domain);
    if (!entity.id || seen.has(entity.id)) continue;
    seen.add(entity.id);
    entities.push(entity);
    if (screen?.id) screenEntityMap.set(String(screen.id), entity.id);
    if (entities.length >= 12) break;
  }
  if (entities.length < 2) {
    for (const fallback of [
      {id:'record',label:'Records',kind:'list'},
      {id:'task',label:'Tasks',kind:'list'},
    ]) {
      const entity = entityFromScreen(fallback, domain);
      if (!seen.has(entity.id)) { seen.add(entity.id); entities.push(entity); }
      if (entities.length >= 2) break;
    }
  }

  const roleMode = plan.featurePolicies?.roleBased === true && Array.isArray(plan.roles) && plan.roles.length > 0;
  const roles = roleMode ? plan.roles.map((role) => ({
    id: role.id,
    name: role.label || role.name || role.id,
    dashboardId: `${role.id}Dashboard`,
    allowedScreens: Array.isArray(blueprint.navigation?.byRole?.[role.id]) ? blueprint.navigation.byRole[role.id] : [],
  })) : [];

  const normalized = normalizeAppSpec({
    app: {
      id: camel(plan.appName || blueprint.appIdentity?.name || domain || 'generatedApp'),
      name: plan.appName || blueprint.appIdentity?.name || 'Generated App',
      description: String(prompt || '').trim(),
      storageMode: 'memory',
    },
    theme: plan.theme || {},
    authentication: {
      enabled: roleMode || plan.featurePolicies?.auth === 'required',
      allowSignup: true,
    },
    roles,
    dashboards: roleMode ? plan.roles.map((role) => ({
      roleId: role.id,
      id: `${role.id}Dashboard`,
      widgets: (blueprint.roleDashboards?.[role.id]?.cards || []).map((label, index) => ({ id: `${role.id}Card${index + 1}`, label, type: 'metric' })),
    })) : [],
    splash: { enabled:true, title:plan.appName || blueprint.appIdentity?.name || 'Generated App' },
    entities,
    relationships: [],
    views: [],
  });
  if (!normalized.valid) throw new Error(`Workspace component spec invalid: ${normalized.errors.join('; ')}`);
  const resolution = resolveComponents(normalized.spec, new ComponentRegistry());
  normalized.spec.selectedCapabilities = resolution.components.map((component) => component.id);
  normalized.spec.contextualDomain = domain;
  normalized.spec.workspaceBlueprint = blueprint;

  if (roleMode) {
    const roleEntityAccess = {};
    const roleDashboardCards = {};
    const rolePrimaryActions = {};
    const roleNavigation = {};
    const roleEntityActions = {};
    const normalizedEntityIds = new Set(normalized.spec.entities.map((entity) => entity.id));
    const normalizedByLabel = new Map(normalized.spec.entities.map((entity) => [String(entity.name).toLowerCase(), entity.id]));

    const actionTarget = (action = '') => {
      const rawAction = String(action).trim().toLowerCase();
      const clean = rawAction.replace(/^(add|create|new|book|manage|review|mark|issue|receive|assign|schedule|request|complete|set|place|transfer)\s+/i, '').trim();
      if (!clean) return null;
      const entitiesByHint = (pattern) => normalized.spec.entities.find((entity) => pattern.test(`${entity.id} ${entity.name} ${entity.pluralName}`.toLowerCase()))?.id || null;
      if (/^book\b/.test(rawAction)) {
        const booking = entitiesByHint(/booking|appointment|reservation/);
        if (booking) return booking;
      }
      if (/clinical note/.test(rawAction)) {
        const notes = entitiesByHint(/clinical.?note/);
        if (notes) return notes;
      }
      if (/stock item|inventory item/.test(rawAction)) {
        const stock = entitiesByHint(/stock|inventory/);
        if (stock) return stock;
      }
      if (/reserve book/.test(rawAction)) {
        const catalog = entitiesByHint(/catalog/) || entitiesByHint(/book/);
        if (catalog) return catalog;
      }
      if (/issue book/.test(rawAction)) {
        const loan = entitiesByHint(/loan/) || entitiesByHint(/catalog|book/);
        if (loan) return loan;
      }
      if (/add book/.test(rawAction)) {
        const catalog = entitiesByHint(/catalog/) || entitiesByHint(/book/);
        if (catalog) return catalog;
      }
      if (/refill/.test(rawAction)) {
        const prescription = entitiesByHint(/prescription|refill/);
        if (prescription) return prescription;
      }
      if (/dispense/.test(rawAction)) {
        const dispensing = entitiesByHint(/dispensing/) || entitiesByHint(/prescription/) || entitiesByHint(/inventory/);
        if (dispensing) return dispensing;
      }
      if (/add medicine/.test(rawAction)) {
        const inventory = entitiesByHint(/inventory/) || entitiesByHint(/medicine/);
        if (inventory) return inventory;
      }
      if (/medicine/.test(rawAction)) {
        const medicine = entitiesByHint(/medicine/) || entitiesByHint(/inventory/) || entitiesByHint(/prescription/);
        if (medicine) return medicine;
      }
      for (const entity of normalized.spec.entities) {
        const names = [entity.id, entity.name, entity.pluralName].map((value) => String(value).toLowerCase());
        if (names.some((name) => name === clean || name.includes(clean) || clean.includes(name.replace(/s$/, '')))) return entity.id;
      }
      return normalizedByLabel.get(clean) || null;
    };

    for (const role of plan.roles) {
      const roleName = role.label || role.name || role.id;
      const navIds = Array.isArray(blueprint.navigation?.byRole?.[role.id]) ? blueprint.navigation.byRole[role.id] : [];
      const entityIds = [];
      for (const screenId of navIds) {
        const entityId = screenEntityMap.get(String(screenId));
        if (entityId && normalizedEntityIds.has(entityId) && !entityIds.includes(entityId)) entityIds.push(entityId);
      }
      // A role should never get an empty functional workspace. If the blueprint
      // nav contains only dashboards/profile, expose the first two domain entities.
      if (!entityIds.length) entityIds.push(...normalized.spec.entities.slice(0, 2).map((entity) => entity.id));
      roleEntityAccess[roleName] = entityIds;
      roleDashboardCards[roleName] = blueprint.roleDashboards?.[role.id]?.cards || role.dashboard || [];
      const primaryLabel = blueprint.primaryActions?.byRole?.[role.id]?.[0] || role.primaryAction || '';
      const primaryEntityId = actionTarget(primaryLabel);
      if (primaryEntityId && normalizedEntityIds.has(primaryEntityId) && !entityIds.includes(primaryEntityId)) entityIds.push(primaryEntityId);
      roleEntityAccess[roleName] = entityIds;
      rolePrimaryActions[roleName] = { label: primaryLabel, entityId: primaryEntityId };
      roleNavigation[roleName] = navIds;

      const lowerRole = String(roleName).toLowerCase();
      const isAdmin = /admin|owner|superuser|manager|supervisor|head|dispatcher/.test(lowerRole);
      const isOperator = /doctor|teacher|staff|employee|agent|provider|librarian|pharmacist|trainer|driver|rider|receptionist|operator|sales rep|organizer|officer/.test(lowerRole);
      for (const entityId of entityIds) {
        let actions = ['read'];
        if (isAdmin) actions = ['create','read','update','delete'];
        else if (isOperator) actions = ['create','read','update'];
        if (primaryEntityId === entityId && !actions.includes('create')) actions = ['create', ...actions];
        roleEntityActions[`${roleName}::${entityId}`] = actions;
      }
    }

    normalized.spec.workspaceRoleConfig = {
      entityAccess: roleEntityAccess,
      entityActions: roleEntityActions,
      dashboardCards: roleDashboardCards,
      primaryActions: rolePrimaryActions,
      navigation: roleNavigation,
      analyticsPolicy: blueprint.featurePolicies?.analytics || 'optional',
      chartsPolicy: blueprint.featurePolicies?.charts || 'optional',
    };

    // Keep declarative permissions aligned with the UI-visible resources.
    normalized.spec.permissions = [];
    for (const role of normalized.spec.roles) {
      const visible = roleEntityAccess[role.name] || [];
      for (const entityId of visible) normalized.spec.permissions.push({ roleId: role.id, resource: entityId, actions: roleEntityActions[`${role.name}::${entityId}`] || ['read'] });
    }
  }
  return normalized.spec;
}

module.exports = { buildWorkspaceComponentSpec };
