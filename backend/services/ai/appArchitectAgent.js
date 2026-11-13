const COMMON_SCREENS = [
  ['notifications','Notifications','reminders'],
  ['profile','Profile','settings'],
  ['settings','Settings','settings'],
];

const DOMAIN_BLUEPRINTS = {
  hospital: {
    match: /\b(hospital|clinic|healthcare|medical center|patient portal)\b/i,
    roles: [
      ['patient','Patient',['Upcoming appointments','Prescriptions','Medical records','Bills'],['home','appointments','records','prescriptions','profile'],'Book Appointment'],
      ['doctor','Doctor',["Today's appointments",'Assigned patients','Clinical notes','Schedule'],['today','patients','appointments','clinicalNotes','prescriptions'],'Add Clinical Note'],
      ['admin','Admin',['Doctors','Patients','Departments','Billing'],['overview','doctors','patients','departments','billing'],'Add Doctor'],
    ],
    screens: [['home','Home','dashboard'],['today','Today','dashboard'],['overview','Overview','dashboard'],['appointments','Appointments','calendar'],['bookAppointment','Book Appointment','form'],['clinicalNotes','Clinical Notes','list'],['doctors','Doctors','list'],['patients','Patients','list'],['records','Medical Records','history'],['prescriptions','Prescriptions','list'],['departments','Departments','categories'],['billing','Billing','history'],['schedule','Schedule','calendar'],...COMMON_SCREENS],
    analytics:'optional', charts:'disabled', auth:'required', roleBased:true,
  },
  school: {
    match: /\b(school|academy|college|university|education management|student management)\b/i,
    roles: [
      ['student','Student',['Today timetable','Assignments','Attendance','Grades'],['home','timetable','assignments','grades','profile'],'View Assignment'],
      ['teacher','Teacher',["Today's classes",'Attendance','Assignments','Grading'],['today','classes','attendance','assignments','grading'],'Mark Attendance'],
      ['admin','Admin',['Students','Teachers','Classes','Operations'],['overview','students','teachers','classes','attendance'],'Add Student'],
    ],
    screens: [['home','Home','dashboard'],['today','Today','dashboard'],['overview','Overview','dashboard'],['timetable','Timetable','calendar'],['assignments','Assignments','list'],['attendance','Attendance','history'],['grades','Grades','list'],['classes','Classes','list'],['students','Students','list'],['teachers','Teachers','list'],['grading','Grading','form'],...COMMON_SCREENS],
    analytics:'optional', charts:'disabled', auth:'required', roleBased:true,
  },
  restaurant: {
    match: /\b(restaurant|cafe|cafeteria|food ordering|dining)\b/i,
    roles: [
      ['customer','Customer',['Popular dishes','Current order','Reservations','Loyalty'],['home','menu','cart','orders','profile'],'Place Order'],
      ['staff','Staff',['Open tables','Active orders','Kitchen queue','Shift tasks'],['today','orders','tables','kitchen','profile'],'Create Order'],
      ['manager','Manager',['Sales summary','Staff','Inventory','Reservations'],['overview','orders','staff','inventory','reports'],'Manage Menu'],
    ],
    screens: [['home','Home','dashboard'],['today','Today','dashboard'],['overview','Overview','dashboard'],['menu','Menu','list'],['cart','Cart','list'],['orders','Orders','history'],['tables','Tables','categories'],['kitchen','Kitchen Queue','list'],['reservations','Reservations','calendar'],['inventory','Inventory','list'],['staff','Staff','list'],['reports','Operations Report','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'optional', auth:'required', roleBased:true,
  },
  commerce: {
    match: /\b(e-?commerce|marketplace|online store|shopping platform|seller portal)\b/i,
    roles: [
      ['customer','Customer',['Recommended products','Cart','Recent orders','Wishlist'],['home','search','cart','orders','profile'],'Shop Now'],
      ['seller','Seller',['Orders to fulfill','Products','Inventory','Payouts'],['sellerHome','products','sellerOrders','inventory','payouts'],'Add Product'],
      ['admin','Admin',['Marketplace health','Sellers','Orders','Catalog'],['overview','sellers','orders','products','reports'],'Review Seller'],
    ],
    screens: [['home','Home','dashboard'],['sellerHome','Seller Home','dashboard'],['overview','Overview','dashboard'],['search','Search','search'],['products','Products','list'],['cart','Cart','list'],['orders','Orders','history'],['sellerOrders','Seller Orders','history'],['inventory','Inventory','list'],['payouts','Payouts','history'],['sellers','Sellers','list'],['reports','Sales Reports','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'optional', auth:'required', roleBased:true,
  },
  hotel: {
    match: /\b(hotel|resort|guest house|hospitality)\b/i,
    roles: [
      ['guest','Guest',['Upcoming stay','Room details','Services','Payments'],['home','bookings','services','payments','profile'],'Book Room'],
      ['receptionist','Receptionist',['Arrivals','Departures','Room status','Guest requests'],['today','reservations','guests','rooms','requests'],'Check In Guest'],
      ['manager','Manager',['Occupancy','Revenue','Staff','Maintenance'],['overview','rooms','staff','maintenance','reports'],'Manage Rooms'],
    ],
    screens: [['home','Home','dashboard'],['today','Front Desk','dashboard'],['overview','Overview','dashboard'],['bookings','My Bookings','calendar'],['reservations','Reservations','calendar'],['guests','Guests','list'],['rooms','Rooms','list'],['services','Services','list'],['requests','Guest Requests','list'],['payments','Payments','history'],['staff','Staff','list'],['maintenance','Maintenance','list'],['reports','Operations Reports','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'optional', auth:'required', roleBased:true,
  },
  delivery: {
    match: /\b(delivery|courier|logistics|fleet|dispatch|shipping)\b/i,
    roles: [
      ['customer','Customer',['Active delivery','Recent shipments','Addresses','Support'],['home','shipments','track','addresses','profile'],'Create Shipment'],
      ['driver','Driver',['Assigned stops','Route','Completed deliveries','Earnings'],['today','route','deliveries','proof','profile'],'Complete Delivery'],
      ['dispatcher','Dispatcher',['Live fleet','Unassigned jobs','Drivers','Exceptions'],['overview','dispatch','drivers','shipments','reports'],'Assign Driver'],
    ],
    screens: [['home','Home','dashboard'],['today','Today','dashboard'],['overview','Operations','dashboard'],['shipments','Shipments','list'],['track','Track Delivery','detail'],['addresses','Addresses','list'],['route','Route','list'],['deliveries','Deliveries','history'],['proof','Proof of Delivery','form'],['dispatch','Dispatch Board','list'],['drivers','Drivers','list'],['reports','Delivery Reports','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'optional', auth:'required', roleBased:true,
  },
  booking: {
    match: /\b(booking|appointment|reservation|service booking|salon|spa)\b/i,
    roles: [
      ['customer','Customer',['Upcoming booking','Services','Saved providers','History'],['services','availability','book','bookings','profile'],'Book Appointment'],
      ['provider','Provider',["Today's appointments",'Availability','Clients','Services'],['today','providerBookings','availability','clients','profile'],'Set Availability'],
      ['admin','Admin',['Providers','Bookings','Services','Operations'],['overview','providers','bookings','services','settings'],'Add Provider'],
    ],
    screens: [['services','Services','list'],['availability','Availability','calendar'],['book','Book Appointment','form'],['bookings','My Bookings','history'],['today','Today','dashboard'],['providerBookings','Appointments','calendar'],['clients','Clients','list'],['overview','Overview','dashboard'],['providers','Providers','list'],...COMMON_SCREENS],
    analytics:'disabled', charts:'disabled', auth:'required', roleBased:true,
  },
  hr: {
    match: /\b(hr|human resources|employee management|workforce|leave management|payroll)\b/i,
    roles: [
      ['employee','Employee',['My attendance','Leave balance','Payslips','Tasks'],['home','attendance','leave','payslips','profile'],'Request Leave'],
      ['manager','Manager',['Team attendance','Approvals','Goals','Team tasks'],['team','approvals','attendance','performance','profile'],'Approve Request'],
      ['hr','HR Admin',['Employees','Recruitment','Payroll','Policies'],['overview','employees','recruitment','payroll','reports'],'Add Employee'],
    ],
    screens: [['home','Home','dashboard'],['team','Team','dashboard'],['overview','HR Overview','dashboard'],['employees','Employees','list'],['attendance','Attendance','history'],['leave','Leave','history'],['approvals','Approvals','list'],['performance','Performance','list'],['payslips','Payslips','history'],['payroll','Payroll','history'],['recruitment','Recruitment','list'],['reports','HR Reports','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'optional', auth:'required', roleBased:true,
  },
  library: {
    match: /\b(library|book lending|book management)\b/i,
    roles: [
      ['member','Member',['Borrowed books','Due soon','Reservations','Fines'],['home','catalog','loans','reservations','profile'],'Reserve Book'],
      ['librarian','Librarian',['Checkouts','Returns','Reservations','Overdue'],['desk','loans','returns','members','catalog'],'Issue Book'],
      ['admin','Admin',['Collection','Members','Staff','Fines'],['overview','catalog','members','staff','reports'],'Add Book'],
    ],
    screens: [['home','Home','dashboard'],['desk','Library Desk','dashboard'],['overview','Overview','dashboard'],['catalog','Catalog','list'],['loans','Loans','history'],['returns','Returns','form'],['reservations','Reservations','list'],['members','Members','list'],['staff','Staff','list'],['fines','Fines','history'],['reports','Library Reports','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'disabled', auth:'required', roleBased:true,
  },
  pharmacy: {
    match: /\b(pharmacy|chemist|medicine inventory|prescription fulfillment)\b/i,
    roles: [
      ['customer','Customer',['Prescriptions','Orders','Refills','Payments'],['home','prescriptions','orders','refills','profile'],'Request Refill'],
      ['pharmacist','Pharmacist',['Pending prescriptions','Dispensing queue','Drug checks','Stock alerts'],['today','prescriptions','dispensing','inventory','profile'],'Dispense Medicine'],
      ['admin','Admin',['Inventory','Suppliers','Staff','Sales'],['overview','inventory','suppliers','staff','reports'],'Add Medicine'],
    ],
    screens: [['home','Home','dashboard'],['today','Today','dashboard'],['overview','Overview','dashboard'],['prescriptions','Prescriptions','list'],['orders','Orders','history'],['refills','Refills','form'],['dispensing','Dispensing','list'],['inventory','Inventory','list'],['suppliers','Suppliers','list'],['staff','Staff','list'],['reports','Pharmacy Reports','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'optional', auth:'required', roleBased:true,
  },
  fitness_coaching: {
    match: /\b(personal trainer|fitness coach|coaching app|gym management|fitness management)\b/i,
    roles: [
      ['client','Client',['Today workout','Progress','Nutrition','Coach messages'],['home','workouts','progress','nutrition','profile'],'Start Workout'],
      ['trainer','Trainer',['Clients','Today sessions','Programs','Check-ins'],['today','clients','programs','sessions','profile'],'Create Program'],
      ['admin','Admin',['Members','Trainers','Plans','Operations'],['overview','members','trainers','plans','reports'],'Add Member'],
    ],
    screens: [['home','Home','dashboard'],['today','Today','dashboard'],['overview','Overview','dashboard'],['workouts','Workouts','list'],['progress','Progress','analytics'],['nutrition','Nutrition','list'],['clients','Clients','list'],['programs','Programs','list'],['sessions','Sessions','calendar'],['members','Members','list'],['trainers','Trainers','list'],['plans','Plans','list'],['reports','Reports','reports'],...COMMON_SCREENS],
    analytics:'required', charts:'optional', auth:'required', roleBased:true,
  },
  real_estate: {
    match: /\b(real estate|property management|rental management|landlord|tenant portal)\b/i,
    roles: [
      ['tenant','Tenant',['Rent due','Maintenance requests','Lease','Messages'],['home','payments','maintenance','lease','profile'],'Request Maintenance'],
      ['agent','Agent',['Leads','Viewings','Listings','Tasks'],['today','leads','viewings','properties','profile'],'Schedule Viewing'],
      ['owner','Owner/Admin',['Occupancy','Properties','Tenants','Revenue'],['overview','properties','tenants','payments','reports'],'Add Property'],
    ],
    screens: [['home','Home','dashboard'],['today','Today','dashboard'],['overview','Portfolio','dashboard'],['properties','Properties','list'],['tenants','Tenants','list'],['leads','Leads','list'],['viewings','Viewings','calendar'],['payments','Payments','history'],['maintenance','Maintenance','list'],['lease','Lease','detail'],['reports','Property Reports','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'optional', auth:'required', roleBased:true,
  },
  crm: {
    match: /\b(crm|customer relationship|sales pipeline|lead management)\b/i,
    roles: [
      ['sales_rep','Sales Rep',['My leads','Deals','Tasks','Follow-ups'],['home','leads','deals','tasks','profile'],'Add Lead'],
      ['sales_manager','Sales Manager',['Team pipeline','Forecast','Activities','Targets'],['overview','deals','team','reports','profile'],'Assign Lead'],
      ['admin','Admin',['Users','Pipeline settings','Integrations','Audit'],['adminHome','users','pipeline','settings','reports'],'Add User'],
    ],
    screens: [['home','Home','dashboard'],['overview','Sales Overview','dashboard'],['adminHome','Admin Overview','dashboard'],['leads','Leads','list'],['deals','Deals','list'],['tasks','Tasks','list'],['team','Team','list'],['pipeline','Pipeline','categories'],['users','Users','list'],['reports','Sales Reports','reports'],...COMMON_SCREENS],
    analytics:'required', charts:'optional', auth:'required', roleBased:true,
  },
  inventory: {
    match: /\b(inventory|warehouse|stock management|procurement)\b/i,
    roles: [
      ['operator','Warehouse Staff',['Pick list','Receiving','Stock moves','Alerts'],['today','stock','receiving','picking','profile'],'Receive Stock'],
      ['supervisor','Supervisor',['Stock levels','Transfers','Approvals','Team tasks'],['overview','stock','transfers','approvals','profile'],'Approve Transfer'],
      ['admin','Admin',['Inventory value','Suppliers','Locations','Reports'],['adminHome','stock','suppliers','locations','reports'],'Add Stock Item'],
    ],
    screens: [['today','Today','dashboard'],['overview','Warehouse Overview','dashboard'],['adminHome','Inventory Overview','dashboard'],['stock','Stock','list'],['receiving','Receiving','form'],['picking','Picking','list'],['transfers','Transfers','history'],['approvals','Approvals','list'],['suppliers','Suppliers','list'],['locations','Locations','categories'],['reports','Inventory Reports','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'optional', auth:'required', roleBased:true,
  },
  event: {
    match: /\b(event management|conference|event booking|wedding planner|organizer)\b/i,
    roles: [
      ['attendee','Attendee',['Upcoming events','Tickets','Schedule','Announcements'],['home','events','tickets','schedule','profile'],'Register'],
      ['organizer','Organizer',['Registrations','Agenda','Vendors','Tasks'],['today','events','registrations','agenda','profile'],'Create Event'],
      ['admin','Admin',['Events','Organizers','Venues','Operations'],['overview','events','organizers','venues','reports'],'Add Organizer'],
    ],
    screens: [['home','Home','dashboard'],['today','Today','dashboard'],['overview','Overview','dashboard'],['events','Events','list'],['tickets','Tickets','history'],['schedule','Schedule','calendar'],['registrations','Registrations','list'],['agenda','Agenda','calendar'],['organizers','Organizers','list'],['vendors','Vendors','list'],['venues','Venues','list'],['reports','Event Reports','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'disabled', auth:'required', roleBased:true,
  },
  project: {
    match: /\b(project management|task management|team workspace|kanban|work management)\b/i,
    roles: [
      ['member','Team Member',['My tasks','Due soon','Projects','Mentions'],['home','tasks','projects','activity','profile'],'Add Task'],
      ['manager','Project Manager',['Project health','Team workload','Milestones','Risks'],['overview','projects','team','milestones','reports'],'Create Project'],
      ['admin','Workspace Admin',['Users','Workspaces','Permissions','Audit'],['adminHome','users','projects','settings','reports'],'Invite User'],
    ],
    screens: [['home','Home','dashboard'],['overview','Project Overview','dashboard'],['adminHome','Admin Overview','dashboard'],['tasks','Tasks','list'],['projects','Projects','list'],['activity','Activity','history'],['team','Team','list'],['milestones','Milestones','calendar'],['users','Users','list'],['reports','Project Reports','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'optional', auth:'required', roleBased:true,
  },
  banking: {
    match: /\b(bank|banking|credit union|digital wallet management)\b/i,
    roles: [
      ['customer','Customer',['Balances','Recent transactions','Cards','Payments'],['home','accounts','transactions','payments','profile'],'Transfer Money'],
      ['officer','Bank Officer',['Customer requests','Applications','Cases','Approvals'],['today','customers','applications','cases','profile'],'Review Application'],
      ['admin','Admin',['Operations','Users','Risk alerts','Audit'],['overview','users','risk','audit','reports'],'Manage Access'],
    ],
    screens: [['home','Home','dashboard'],['today','Today','dashboard'],['overview','Operations','dashboard'],['accounts','Accounts','list'],['transactions','Transactions','history'],['payments','Payments','form'],['customers','Customers','list'],['applications','Applications','list'],['cases','Cases','list'],['users','Users','list'],['risk','Risk Alerts','list'],['audit','Audit Log','history'],['reports','Reports','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'optional', auth:'required', roleBased:true,
  },
  support: {
    match: /\b(help desk|helpdesk|support ticket|customer support|service desk)\b/i,
    roles: [
      ['customer','Customer',['Open tickets','Recent replies','Knowledge base','Status'],['home','tickets','newTicket','knowledge','profile'],'Create Ticket'],
      ['agent','Support Agent',['Assigned tickets','SLA due','Customers','Queue'],['today','assigned','queue','customers','profile'],'Reply to Ticket'],
      ['admin','Support Admin',['Queues','Agents','SLAs','Reports'],['overview','queues','agents','sla','reports'],'Add Agent'],
    ],
    screens: [['home','Home','dashboard'],['today','Today','dashboard'],['overview','Overview','dashboard'],['tickets','My Tickets','list'],['newTicket','New Ticket','form'],['knowledge','Knowledge Base','list'],['assigned','Assigned Tickets','list'],['queue','Queue','list'],['customers','Customers','list'],['queues','Queues','categories'],['agents','Agents','list'],['sla','SLA Policies','list'],['reports','Support Reports','reports'],...COMMON_SCREENS],
    analytics:'optional', charts:'optional', auth:'required', roleBased:true,
  },
  notes: {
    match: /\b(notes?|notepad|memo)\b/i,
    roles: [], screens: [['notes','Notes','list'],['newNote','New Note','form'],['search','Search','search'],['tags','Tags','categories'],['favorites','Favorites','favorites'],['archive','Archive','history'],['settings','Settings','settings']],
    analytics:'disabled', charts:'disabled', auth:'optional', roleBased:false,
  },
};

function slug(value='') { return String(value).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }
function title(value='') { return String(value).replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim(); }
function normalizeRoleTuple(tuple){ const [id,label,dashboard,nav,primaryAction]=tuple; return {id,label,dashboard,nav,primaryAction}; }

function explicitRoles(prompt='') {
  const text = String(prompt);
  let raw = '';
  const roleMatch = text.match(/\broles\s*(?:[:=-]|are\b|as\b)\s*([a-z][a-z\s,/&-]{3,140})/i) || text.match(/\brole\s*[:=]\s*([a-z][a-z\s,/&-]{3,140})/i);
  if (roleMatch) raw = roleMatch[1].split(/\b(?:with|where|and permissions|having|who can)\b/i)[0];
  if (!raw) {
    const forMatch = text.match(/\bfor\s+([a-z][a-z\s-]{1,30}(?:\s*,\s*[a-z][a-z\s-]{1,30}){1,9}(?:\s*(?:,|and|&)\s*[a-z][a-z\s-]{1,30})?)/i);
    if (forMatch) {
      const possible = forMatch[1].split(/,|\band\b|&/i).map(v=>v.trim()).filter(Boolean);
      const roleLike = /\b(admin|administrator|owner|manager|staff|employee|customer|client|member|guest|patient|doctor|nurse|receptionist|teacher|student|provider|seller|driver|dispatcher|agent|librarian|pharmacist|trainer|tenant|landlord|auditor|reviewer|submitter|editor|viewer|operator|supervisor|cashier|waiter|chef)\b/i;
      if (possible.length >= 2 && possible.every(v=>roleLike.test(v))) raw = forMatch[1];
    }
  }
  if (!raw) return [];
  const candidates = raw.split(/,|\/|\band\b|&/i).map(v=>v.trim()).filter(Boolean).filter(v=>v.split(/\s+/).length <= 4).slice(0,10);
  if (candidates.length < 2) return [];
  return [...new Map(candidates.map(v=>[slug(v),{id:slug(v),label:title(v),explicit:true}])).values()];
}

function inferDomain(prompt='') {
  for (const [domain, bp] of Object.entries(DOMAIN_BLUEPRINTS)) if (bp.match.test(prompt)) return domain;
  if (/\b(expense|budget|finance|spending|accounting)\b/i.test(prompt)) return 'finance';
  if (/\b(calorie|nutrition|food log)\b/i.test(prompt)) return 'calorie';
  if (/\b(attendance)\b/i.test(prompt)) return 'attendance';
  if (/\b(fitness|workout)\b/i.test(prompt)) return 'fitness';
  if (/\b(sales)\b/i.test(prompt)) return 'sales';
  if (/\b(calculator)\b/i.test(prompt)) return 'calculator';
  return 'generic';
}

function roleBasedRequested(prompt='') {
  const text=String(prompt||'');
  if (explicitRoles(text).length > 0) return true;
  if (/\b(role[- ]based|user roles?|permissions?|multi[- ]user|different users|different roles|role specific|role-specific|access control|rbac)\b/i.test(text)) return true;
  if (/\b(login|log in|sign in|signin|authentication|auth)\b/i.test(text) && /\b(admin|staff|employee|customer|patient|doctor|teacher|student|provider|seller|manager|agent|driver|receptionist|librarian|owner|tenant|member|nurse|auditor|reviewer)\b/i.test(text)) return true;
  if (/\b(admin|staff|customer|employee|patient|doctor|teacher|student|seller|provider|tenant|member|guest|agent|driver|receptionist|librarian|manager|owner)\s+portal\b/i.test(text)) return true;
  return false;
}

function managementSystemRequested(prompt='', domainBp=null) {
  const text=String(prompt||'');
  if (!domainBp || !Array.isArray(domainBp.roles) || domainBp.roles.length < 2) return false;
  // Recognized management/operations products are inherently multi-actor. Keep
  // ordinary trackers, calculators, notes, and single-user tools non-role-based.
  return /\b(management(?:\s+(?:system|app|software|platform|portal))?|admin(?:istration)?\s+(?:system|portal)|operations?\s+(?:system|platform|portal)|staff\s+portal)\b/i.test(text);
}

function featurePolicyFor(domain, prompt='') {
  const explicitAnalytics = /\b(analytics|chart|insight|reporting dashboard|kpi)\b/i.test(prompt);
  const analyticsDomains = new Set(['finance','calorie','fitness','sales','attendance','crm']);
  const disabledDomains = new Set(['notes','booking','calculator']);
  let analytics = explicitAnalytics ? 'required' : analyticsDomains.has(domain) ? 'required' : disabledDomains.has(domain) ? 'disabled' : 'optional';
  return { auth:'optional', roleBased:false, analytics, charts:analytics==='required'?'optional':analytics==='disabled'?'disabled':'optional' };
}

function genericRoleProfile(role, domain='generic') {
  const name=String(role.label||'User'); const id=role.id||slug(name); const lower=name.toLowerCase();
  const admin=/admin|owner|superuser/.test(lower), manager=/manager|supervisor|lead|head/.test(lower), customer=/customer|client|member|guest|patient|student|tenant|attendee/.test(lower);
  const dashboard = admin ? ['Users & access','Operational overview','Pending approvals','System activity'] : manager ? ['Team workload','Pending approvals','Recent activity','Priority items'] : customer ? ['My activity','Upcoming items','Recent updates','Quick actions'] : [`${name} tasks`,`${name} queue`,'Recent activity','Notifications'];
  const home=`${id}_home`;
  return {...role,dashboard,nav:[home,'records','tasks','notifications','profile'],primaryAction:admin?'Manage Users':manager?'Review Requests':customer?'Create Request':'Add Record',generatedHome:home,domain};
}

function materializeRoles(domainBp, specifiedRoles, domain){
  const defaults=(domainBp?.roles||[]).map(normalizeRoleTuple);
  if(!specifiedRoles.length) return defaults;
  return specifiedRoles.map(role=>{
    const exact=defaults.find(d=>d.id===role.id || d.label.toLowerCase()===role.label.toLowerCase());
    if(exact) return {...exact,explicit:true};
    const semantic=defaults.find(d=>{
      const a=d.label.toLowerCase(), b=role.label.toLowerCase();
      return (/(admin|owner)/.test(a)&&/(admin|owner)/.test(b)) || (/(staff|employee|agent|provider|doctor|teacher|librarian|pharmacist|trainer|driver|receptionist)/.test(a)&&/(staff|employee|agent|provider|doctor|teacher|nurse|librarian|pharmacist|trainer|driver|receptionist)/.test(b)) || (/(customer|patient|student|guest|member|client|tenant|attendee)/.test(a)&&/(customer|patient|student|guest|member|client|tenant|attendee)/.test(b));
    });
    return semantic ? {...semantic,id:role.id,label:role.label,explicit:true} : genericRoleProfile(role,domain);
  });
}

function buildGenericScreens(roles){
  const roleHomes=roles.map(r=>[r.generatedHome||`${r.id}_home`,`${r.label} Home`,'dashboard']);
  return [...roleHomes,['records','Records','list'],['tasks','Tasks','list'],['activity','Activity','history'],['notifications','Notifications','reminders'],['profile','Profile','settings'],['settings','Settings','settings']];
}

function buildArchitectBlueprint(prompt='', basePlan=null) {
  const domain = inferDomain(prompt);
  const domainBp = DOMAIN_BLUEPRINTS[domain];
  const specifiedRoles = explicitRoles(prompt);
  const wantsRoles = roleBasedRequested(prompt) || managementSystemRequested(prompt, domainBp);
  let roles = wantsRoles ? materializeRoles(domainBp,specifiedRoles,domain) : [];
  if(!roles.length && wantsRoles) roles=[genericRoleProfile({id:'user',label:'User'},domain),genericRoleProfile({id:'admin',label:'Admin'},domain)];
  const policy = { ...featurePolicyFor(domain,prompt), ...(domainBp ? {analytics:domainBp.analytics,charts:domainBp.charts} : {}) };
  if (roles.length) { policy.roleBased=true; policy.auth='required'; }
  else { policy.roleBased=false; policy.auth=/\b(login|log in|sign in|signin|authentication|auth)\b/i.test(String(prompt)) ? 'required' : 'optional'; }
  const rawScreens = domainBp?.screens || (roles.length ? buildGenericScreens(roles) : basePlan?.screenBlueprint?.map(s=>[s.id,s.title,s.kind]) || []);
  const screenMap=new Map(rawScreens.map(([id,label,kind])=>[id,{id,label,purpose:`${label} workflow for ${domain}`,kind,roleVisibility:[],dataSources:[],components:[],actions:[]} ]));
  for(const role of roles){
    const home=role.generatedHome||role.nav?.[0];
    if(home && !screenMap.has(home)) screenMap.set(home,{id:home,label:`${role.label} Home`,purpose:`Role dashboard for ${role.label}`,kind:'dashboard',roleVisibility:[role.id],dataSources:[],components:[],actions:[]});
  }
  const screens=[...screenMap.values()];
  const roleNavigation={}, primaryActionsByRole={}, roleDashboards={};
  for (const role of roles) {
    const available=new Set(screens.map(s=>s.id));
    let nav=(role.nav||[]).filter(id=>available.has(id));
    if(!nav.length) nav=[role.generatedHome||`${role.id}_home`,'records','tasks','notifications','profile'].filter(id=>available.has(id));
    roleNavigation[role.id]=nav.slice(0,5);
    primaryActionsByRole[role.id]=role.primaryAction?[role.primaryAction]:[];
    roleDashboards[role.id]={id:`${role.id}Dashboard`,title:`${role.label} Dashboard`,cards:role.dashboard||[]};
    for(const id of nav){ const s=screenMap.get(id); if(s && !s.roleVisibility.includes(role.id)) s.roleVisibility.push(role.id); }
  }
  // Shared profile/notifications/settings are available to every authenticated role.
  for(const s of screens) if(['profile','notifications','settings'].includes(s.id)) s.roleVisibility=roles.map(r=>r.id);
  return {
    architectVersion:2,
    appIdentity:{name:basePlan?.appName||title(domain==='generic'?'Generated App':domain),domain,archetype:basePlan?.archetype||domain,description:String(prompt).trim()},
    actors:roles.map(r=>({id:r.id,label:r.label})), roles, entities:[], workflows:[], screens, roleDashboards,
    navigation:{default:basePlan?.navigationPlan?.primary?.map(x=>x.id)||[],byRole:roleNavigation},
    primaryActions:{default:[],byRole:primaryActionsByRole}, featurePolicies:policy,
  };
}

module.exports={DOMAIN_BLUEPRINTS,buildArchitectBlueprint,inferDomain,explicitRoles,featurePolicyFor,roleBasedRequested,managementSystemRequested,genericRoleProfile};
