// Semantic sample-data engine.
//
// Generated apps used to ship with placeholders such as "Student North",
// "Student Central" and "Notes sample for timetable operations." because the
// seed generator only looked at the field type. This module looks at the
// *meaning* of every field (its id, label, entity and app domain) and produces
// data a person would actually type: real-looking names, class names, dates
// relative to today, prices, phone numbers, remarks and so on. Rows are also
// cross-linked, so an attendance record for "Ayesha Khan" really points at a
// student called "Ayesha Khan".
//
// It is fully deterministic (no randomness) so regenerating a project twice on
// the same day gives the same data, and tests stay stable.

const P = require("./pools");

const PERSON_ENTITY_RE = new RegExp(`\\b(?:${P.PERSON_ENTITY.source})s?\\b`);
const COMPANY_ENTITY_RE = new RegExp(`\\b(?:${P.COMPANY_ENTITY.source})s?\\b`);
const LINKABLE_TARGET_RE = new RegExp(
  `\\b(?:${P.PERSON_ENTITY.source}|${P.COMPANY_ENTITY.source}|class|room|department|course|subject|location|product|catalog|stock|item|venue|property|plan|project|book|menu)(?:s|es)?\\b`
);

const DEFAULT_ROWS = 5;
// First option dominates (usually the healthy/default state) but every option appears.
const OPTION_PATTERN = [0, 0, 1, 2, 1, 0, 3, 1];

function hash(value) {
  let h = 7;
  for (const ch of String(value)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function pick(list, index, offset = 0) {
  return list[(index + offset) % list.length];
}

function words(...parts) {
  return parts
    .filter(Boolean)
    .join(" ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
}

function singular(value = "") {
  const clean = String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean === "people") return "person";
  if (clean.endsWith("ies")) return `${clean.slice(0, -3)}y`;
  if (/(ss|us|is)$/.test(clean)) return clean;
  if (clean.endsWith("ses") || clean.endsWith("xes")) return clean.slice(0, -2);
  if (clean.endsWith("s")) return clean.slice(0, -1);
  return clean;
}

function entityWords(entity = {}) {
  return words(entity.id, entity.name, entity.pluralName);
}

// The head noun (last word) says what a record is: "Seller Order" is an order and
// "Student Attendance" is attendance, while "Student" and "Class Teacher" are people.
function headNoun(entity = {}) {
  const parts = words(entity.name || entity.id).split(/\s+/).filter(Boolean);
  return singular(parts[parts.length - 1] || "");
}

function isPersonEntity(entity) {
  return PERSON_ENTITY_RE.test(headNoun(entity));
}

function isCompanyEntity(entity) {
  return COMPANY_ENTITY_RE.test(headNoun(entity));
}

// ---------------------------------------------------------------- people --

function personName(seedKey, index, { doctor = false } = {}) {
  const offset = hash(seedKey) % P.FIRST_NAMES.length;
  const first = P.FIRST_NAMES[(offset + index * 4) % P.FIRST_NAMES.length];
  const last = P.LAST_NAMES[(offset * 3 + index * 7 + 1) % P.LAST_NAMES.length];
  return `${doctor ? "Dr. " : ""}${first} ${last}`;
}

function personNameForEntity(entity, index) {
  return personName(singular(entity.id), index, { doctor: /doctor/.test(entityWords(entity)) });
}

function personKeyFromField(fieldId) {
  return singular(String(fieldId).replace(/(Name|Id)$/i, "").replace(/^assigned(to)?/i, "") || fieldId);
}

// ------------------------------------------------------------------ dates --

function isoDate(now, offsetDays) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
  return d.toISOString().slice(0, 10);
}

const FUTURE_FIELD = /due|deadline|expir|renew|next|upcoming|schedul|check ?out|return|\bend\b|appoint|booking|visit|event|\bstart|follow|arriv|depart|deliver|\beta\b|valid|reminder/;
const PAST_FIELD = /join|hire|enrol|admission|regist|creat|purchase|issue|order|invoice|payment|paid|sent|submitted|received|joined/;
const FUTURE_ENTITY = /appointment|booking|reservation|event|session|viewing|schedule|timetable|shift|meeting|delivery|shipment|task|milestone|assignment|lesson|exam|reminder|availability|agenda/;

function dateValue(entity, field, index, now) {
  const w = words(field.id, field.label);
  if (/birth|dob/.test(w)) {
    const year = now.getUTCFullYear() - (isPersonEntity(entity) && /student|pupil/.test(entityWords(entity)) ? pick([13, 12, 14, 11, 15], index) : pick([29, 34, 41, 26, 38], index));
    return `${year}-${String(pick([3, 8, 11, 5, 9], index)).padStart(2, "0")}-${String(pick([14, 2, 21, 9, 27], index)).padStart(2, "0")}`;
  }
  if (FUTURE_FIELD.test(w)) return isoDate(now, pick([3, 7, 10, 14, 21], index));
  if (PAST_FIELD.test(w)) return isoDate(now, -pick([30, 21, 14, 7, 3], index));
  if (FUTURE_ENTITY.test(entityWords(entity))) return isoDate(now, pick([0, 1, 2, 4, 7], index));
  return isoDate(now, -pick([1, 2, 3, 5, 9], index));
}

// ------------------------------------------------------------- vocabulary --

function matchPool(table, text) {
  for (const [re, list] of table) if (re.test(text)) return list;
  return null;
}

// Some words mean different things per domain (a "program" in a gym is a
// training plan, not a university course).
const DOMAIN_TITLE_OVERRIDES = {
  fitness_coaching: [
    [/session/, ["Personal training", "Group HIIT", "Yoga flow", "Strength coaching", "Mobility session"]],
    [/program/, ["Fat-loss 8 week plan", "Muscle gain starter", "Beginner full body", "Marathon prep", "Mobility & recovery"]],
    [/plan/, ["Basic monthly", "Premium monthly", "Annual family", "Student plan", "Corporate plan"]],
    [/nutrition/, ["High-protein breakfast", "Balanced lunch plate", "Light dinner", "Post-workout shake", "Healthy snack box"]],
  ],
  library: [
    [/catalog|book/, ["The Alchemist", "Atomic Habits", "A Brief History of Time", "Clean Code", "To Kill a Mockingbird"]],
    [/reservation/, ["Reserve: Atomic Habits", "Reserve: Clean Code", "Reserve: The Alchemist", "Reserve: Sapiens", "Reserve: Deep Work"]],
    [/return/, ["Return: Atomic Habits", "Return: Clean Code", "Return: The Alchemist", "Return: Sapiens", "Return: Deep Work"]],
  ],
  hospital: [
    [/department/, ["Cardiology", "Pediatrics", "Emergency", "Radiology", "Outpatient"]],
    [/appointment|schedule|visit/, ["Routine check-up", "Follow-up visit", "Initial consultation", "Annual review", "Quick consultation"]],
  ],
  event: [
    [/venue/, ["Grand Ballroom", "Conference Hall A", "Rooftop Terrace", "Exhibition Center", "Garden Pavilion"]],
    [/schedule|session|agenda/, ["Opening keynote", "Panel: Future of work", "Workshop: Design systems", "Networking lunch", "Closing remarks"]],
    [/registration/, ["Registration - Tech Summit", "Registration - Launch night", "Registration - Workshop", "Registration - Gala dinner", "Registration - Webinar"]],
  ],
  real_estate: [[/viewing/, ["Viewing: 2-bed apartment", "Viewing: Studio near Metro", "Viewing: Family house", "Viewing: Office space", "Viewing: Penthouse"]]],
  hotel: [
    [/booking|reservation/, ["Weekend stay", "Business trip", "Anniversary getaway", "Family vacation", "Airport layover"]],
    [/request/, ["Extra towels", "Late checkout", "Room cleaning", "Airport transfer", "Extra pillows"]],
    [/maintenance/, ["Leaking tap", "AC not cooling", "Broken door lock", "Flickering light", "Blocked drain"]],
    [/service/, ["Airport pickup", "Laundry service", "Room service breakfast", "Spa session", "Late checkout"]],
  ],
  restaurant: [[/reservation/, ["Dinner for 4", "Birthday lunch", "Anniversary dinner", "Business lunch", "Family brunch"]]],
  inventory: [
    [/transfer/, ["Main Warehouse to Downtown Branch", "Downtown Branch to Harbor Depot", "Airport Depot to Main Warehouse", "Harbor Depot to Riverside Hall", "Main Warehouse to Riverside Hall"]],
    [/approval/, ["Transfer to Downtown Branch", "Reorder printer toner", "Write-off damaged boxes", "Supplier price change", "Cycle count adjustment"]],
    [/picking|pick/, ["Pick list #2201", "Pick list #2202", "Pick list #2203", "Pick list #2204", "Pick list #2205"]],
  ],
  hr: [
    [/approval|request/, ["Annual leave (3 days)", "Laptop replacement", "Remote work request", "Training budget approval", "Sick leave (1 day)"]],
    [/leave/, ["Annual leave", "Sick leave", "Casual leave", "Annual leave", "Unpaid leave"]],
    [/polic/, ["Remote work policy", "Code of conduct", "Leave policy", "Expense policy", "Data security policy"]],
  ],
  delivery: [[/route|stop/, ["Route A - City Centre", "Route B - Industrial Area", "Route C - Airport Road", "Route D - Old Town", "Route E - Riverside"]]],
  support: [[/queue/, ["Billing queue", "Technical support", "General inquiries", "VIP customers", "Escalations"]]],
  crm: [[/team/, ["Northern Sales Team", "Enterprise Accounts", "Inside Sales", "Partnerships", "Customer Success"]]],
};

function titlePool(entity, domain) {
  const text = entityWords(entity);
  return matchPool(DOMAIN_TITLE_OVERRIDES[domain] || [], text) || matchPool(P.TITLES, text);
}

function notesPool(entity) {
  return matchPool(P.NOTES, entityWords(entity)) || P.NOTES_GENERIC;
}

const CATEGORY_POOLS = [
  [/stock|inventory|picking|receiving/, ["Stationery", "Stationery", "Office supplies", "Packaging", "Packaging"]],
  [/product|catalog|item|goods|merchandise/, ["Electronics", "Stationery", "Electronics", "Household", "Accessories"]],
  [/location|warehouse|branch|site|venue|facility|department|ward/, ["Warehouse", "Branch", "Campus", "Hall", "Depot"]],
  [/table/, ["Indoor", "Booth", "Outdoor", "Indoor", "Family"]],
  [/book|library/, ["Fiction", "Science", "Self-help", "Technology", "History"]],
  [/expense|transaction|spend/, ["Food", "Transport", "Utilities", "Health", "Shopping"]],
  [/room|suite/, ["Deluxe", "Standard", "Suite", "Single", "Executive"]],
  [/menu|dish|food/, ["Starter", "Main course", "Dessert", "Beverage", "Side"]],
  [/ticket|issue|support|incident/, ["Billing", "Technical", "Account", "Delivery", "General"]],
  [/event/, ["Conference", "Workshop", "Social", "Webinar", "Networking"]],
  [/property|lease|tenant/, ["Apartment", "House", "Office", "Studio", "Commercial"]],
  [/task|project|milestone/, ["Planning", "Design", "Development", "Review", "Operations"]],
  [/note|memo|journal/, ["Work", "Personal", "Ideas", "Shopping", "Learning"]],
  [/nutrition|meal/, ["Breakfast", "Lunch", "Dinner", "Snack", "Supplement"]],
  [/plan|membership|subscription/, ["Monthly", "Quarterly", "Annual", "Student", "Corporate"]],
  [/workout|exercise|program/, ["Strength", "Cardio", "Mobility", "Strength", "Recovery"]],
  [/medicine|prescription|pharma/, ["Antibiotic", "Pain relief", "Allergy", "Diabetes", "Vitamins"]],
];

// Same field name, different meaning per domain ("department" of a hotel is not
// "Engineering"). Checked before the generic pools.
const DOMAIN_TEXT = {
  hotel: [
    [/department|dept/, ["Front desk", "Housekeeping", "Kitchen", "Maintenance", "Concierge"]],
    [/role|position|designation|job/, ["Receptionist", "Housekeeper", "Chef", "Porter", "Supervisor"]],
    [/issue|problem|fault/, ["Leaking tap", "AC not cooling", "Broken door lock", "Flickering light", "Blocked drain"]],
  ],
  restaurant: [
    [/department|dept/, ["Kitchen", "Service", "Bar", "Cashier", "Management"]],
    [/role|position|designation|job/, ["Waiter", "Chef", "Cashier", "Host", "Barista"]],
    [/table/, ["Table 4", "Table 1", "Table 7", "Table 2", "Table 9"]],
  ],
  hospital: [
    [/department|dept/, ["Cardiology", "Pediatrics", "Emergency", "Radiology", "Outpatient"]],
    [/role|position|designation|job/, ["Nurse", "Receptionist", "Lab technician", "Pharmacist", "Ward manager"]],
  ],
  school: [
    [/department|dept/, ["Science", "Mathematics", "Languages", "Humanities", "Administration"]],
    [/role|position|designation|job/, ["Class teacher", "Head of department", "Coordinator", "Librarian", "Counsellor"]],
  ],
  inventory: [
    [/role|position|designation|job/, ["Forklift operator", "Picker", "Receiving clerk", "Shift lead", "Inventory analyst"]],
    [/item|product/, ["A4 copy paper (500 sheets)", "Ballpoint pens (box of 50)", "Printer toner cartridge", "Packing tape rolls", "Cardboard boxes (medium)"]],
    [/\b(?:location|origin|destination)\b/, ["Main Warehouse", "Downtown Branch", "Harbor Depot", "Airport Depot", "Riverside Hall"]],
  ],
  library: [
    [/department|dept/, ["Circulation", "Reference", "Cataloguing", "Acquisitions", "Digital Services"]],
    [/role|position|designation|job/, ["Librarian", "Assistant", "Archivist", "Desk clerk", "Coordinator"]],
    [/author/, ["Paulo Coelho", "James Clear", "Stephen Hawking", "Robert C. Martin", "Harper Lee"]],
  ],
  fitness_coaching: [
    [/specialty|speciality|expertise/, ["Strength training", "Weight loss", "Yoga", "Cardio", "Nutrition coaching"]],
    [/department|dept/, ["Coaching", "Front desk", "Nutrition", "Sales", "Operations"]],
  ],
  crm: [[/department|dept/, ["Sales", "Marketing", "Customer Success", "Partnerships", "Operations"]]],
  delivery: [[/vehicle/, ["Van - LEA 4821", "Bike - KHI 1190", "Truck - LHR 7733", "Van - ISB 5502", "Bike - LHR 2048"]]],
  real_estate: [[/unit/, ["Apt 4B", "Studio 12", "House 7", "Office 3A", "Apt 9C"]]],
};

// [entity, field, values] - e.g. a hotel room costs $120, not $24.99.
const ENTITY_NUMBERS = [
  [/room|suite/, /price|rate|cost/, [120, 95, 240, 80, 310]],
  [/menu|dish|food/, /price|cost/, [9.5, 12, 14.5, 8, 4.5]],
  [/medicine|pharma|prescription/, /price|cost/, [4.5, 3.2, 8, 2.5, 6]],
  [/property|apartment|lease|unit/, /rent|price/, [1200, 950, 1800, 750, 2100]],
  [/order|payment|billing|invoice|transaction/, /amount|total/, [120, 350, 75, 980, 210]],
  [/kitchen|queue/, /items?|count/, [2, 4, 1, 3, 5]],
  [/service/, /price|cost|rate/, [25, 15, 12, 80, 40]],
  [/lead|deal|pipeline|quote|proposal/, /value|amount/, [12000, 8500, 24000, 5200, 18000]],
  [/transfer|picking/, /quantity|qty/, [40, 120, 15, 60, 25]],
];

const DOMAIN_CATEGORY = {
  banking: [[/account/, ["Savings", "Current", "Credit card", "Business", "Wallet"]]],
  library: [[/catalog|book/, ["Fiction", "Self-help", "Science", "Technology", "Fiction"]]],
};

const NUMBER_FIELDS = [
  [/calorie|kcal/, [450, 620, 380, 210, 540]],
  [/duration|minutes|mins/, [30, 45, 60, 90, 20]],
  [/salary|wage|pay\b/, [3200, 4100, 2800, 5200, 3600]],
  [/rent/, [1200, 950, 1800, 750, 2100]],
  [/price|cost|rate|unit price/, [24.99, 129, 15.5, 89, 49.99]],
  [/fee|tuition|charge/, [250, 300, 275, 320, 290]],
  [/amount|total|balance|revenue|payout|value|budget|sales|income|expense|spend|paid|due amount/, [120, 350, 75, 980, 210]],
  [/score|marks|points/, [88, 76, 93, 67, 81]],
  [/percent|percentage|progress|rate of|attendance rate|completion/, [92, 78, 85, 64, 97]],
  [/rating|stars/, [5, 4, 4, 3, 5]],
  [/age/, null], // handled separately (depends on the entity)
  [/capacity|seats|beds|slots|max/, [30, 25, 40, 20, 35]],
  [/\bmin(?:imum)?\b|reorder|threshold/, [10, 20, 5, 15, 10]],
  [/quantity|qty|stock|count|units|level|items|copies|available/, [48, 120, 15, 75, 8]],
  [/hours/, [2, 4, 6, 8, 3]],
  [/days/, [3, 5, 7, 10, 14]],
  [/weight|kg/, [62, 71, 55, 84, 68]],
  [/height|cm/, [165, 178, 158, 182, 170]],
  [/distance|km|miles/, [12, 5, 28, 9, 17]],
  [/floor/, [1, 2, 3, 4, 2]],
];

const TEXT_FIELDS = [
  [/diagnos|ailment|condition|illness/, ["Seasonal flu", "Hypertension", "Migraine", "Ankle sprain", "Vitamin D deficiency"]],
  [/dosage|dose/, ["500mg twice daily", "1 tablet daily", "10ml at night", "200mg after meals", "1 puff as needed"]],
  [/book/, ["The Alchemist", "Atomic Habits", "A Brief History of Time", "Clean Code", "To Kill a Mockingbird"]],
  [/author/, ["Paulo Coelho", "James Clear", "Stephen Hawking", "Robert C. Martin", "Harper Lee"]],
  [/medicine|drug|medication/, ["Amoxicillin 500mg", "Paracetamol 650mg", "Metformin 850mg", "Cetirizine 10mg", "Ibuprofen 400mg"]],
  [/issue|problem|fault/, ["Leaking tap", "AC not cooling", "Broken door lock", "Flickering light", "Blocked drain"]],
  [/\bitem\b/, ["Wireless mouse", "Notebook A5", "USB-C cable", "Desk lamp", "Water bottle"]],
  [/period|quarter/, ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2025", "Annual 2025"]],
  [/\bevent\b/, ["Annual Tech Summit", "Product launch night", "Community workshop", "Leadership offsite", "Charity gala dinner"]],
  [/interest|looking for/, ["2-bed apartment", "Studio", "Family house", "Office space", "Commercial plot"]],
  [/position|vacancy/, ["Frontend Developer", "Sales Executive", "HR Assistant", "Data Analyst", "Support Agent"]],
  [/specialty|speciality/, P.SPECIALTIES],
  [/department|dept|ward/, P.DEPARTMENTS],
  [/subject/, P.SUBJECTS],
  [/course|program(?!me)/, P.COURSES],
  [/\b(class|grade|section|standard)\b/, P.CLASS_NAMES],
  [/blood/, P.BLOOD_GROUPS],
  [/gender|sex/, P.GENDERS],
  [/priority|urgency|severity/, P.PRIORITIES],
  [/\btime\b|slot/, P.TIMES],
  [/city|town/, P.CITIES],
  [/address|street|location|venue|site/, P.STREETS],
  [/company|organi[sz]ation|employer|supplier|vendor|brand|manufacturer/, P.COMPANIES],
  [/payment method|method/, ["Credit card", "Bank transfer", "Cash", "Mobile wallet", "Credit card"]],
  [/day\b|weekday/, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]],
  [/unit\b|uom/, ["pcs", "box", "kg", "litre", "pack"]],
  [/shelf|aisle|bin|zone|bay|block|wing/, ["Aisle 3, Shelf B", "Aisle 1, Shelf A", "Aisle 5, Shelf C", "Aisle 2, Shelf D", "Aisle 4, Shelf A"]],
  [/skill|expertise|role|position|designation|job/, ["Senior coordinator", "Team lead", "Analyst", "Associate", "Specialist"]],
  [/source|channel|referral/, ["Website", "Referral", "Phone call", "Social media", "Walk-in"]],
  [/stage/, ["Qualified", "Proposal sent", "Negotiation", "New", "Closed won"]],
  [/grade letter|letter/, ["A", "B+", "A-", "B", "A"]],
  [/plan\b|tier|membership/, ["Basic", "Premium", "Family", "Student", "Corporate"]],
  [/color|colour/, ["Navy blue", "Charcoal", "White", "Forest green", "Burgundy"]],
];

function rotatingOption(options, index) {
  if (options.length === 1) return options[0];
  return options[OPTION_PATTERN[index % OPTION_PATTERN.length] % options.length];
}

// ------------------------------------------------------------ main entry --

/**
 * Value for one field of one record. `context` may carry:
 *   entities - every entity in the app (for reference fields)
 *   domain   - app domain id (e.g. "school", "hospital")
 *   now      - Date used for relative dates (defaults to the current time)
 */
function sampleValue(entity, field, index, context = {}) {
  const entities = context.entities || [];
  const domain = context.domain || "";
  const now = context.now instanceof Date ? context.now : new Date();
  const type = String(field.type || "text");
  const id = String(field.id || "");
  const label = String(field.label || field.id || "Field");
  const w = words(id, label);
  const idWords = words(id);
  const isDisplay = id === entity.displayField || /^(name|title|fullname)$/i.test(id);

  if (field.referenceEntity) {
    const parent = entities.find((item) => item.id === field.referenceEntity);
    return parent ? `${parent.id}-${(index % 3) + 1}` : "";
  }
  if (Array.isArray(field.options) && field.options.length) return rotatingOption(field.options, index);
  if (type === "boolean") return index % 3 !== 2;
  if (type === "date" || type === "datetime" || /\bdate\b|\bdob\b/.test(idWords)) return dateValue(entity, field, index, now);

  const personEntity = isPersonEntity(entity);

  if (type === "email" || /e-?mail/.test(w)) {
    if (isCompanyEntity(entity)) {
      const company = pick(P.COMPANIES, index, hash(entity.id) % 3);
      return `contact@${company.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
    }
    const base = personEntity ? personNameForEntity(entity, index) : personName(singular(entity.id), index);
    return `${base.replace(/^Dr\. /, "").toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
  }
  if (type === "phone" || /phone|mobile|whatsapp|contact number|tel\b/.test(w)) {
    return `+1 202 555 01${String(((hash(entity.id) % 40) + index * 13) % 90 + 10)}`;
  }
  if (type === "url" || /\burl\b|website|link/.test(w)) return `https://example.com/${singular(entity.id)}-${index + 1}`;
  if (type === "password") return "Passw0rd!";

  // People referenced from another record (studentName, doctor, assignee,
  // department head...). Checked before the domain vocabulary so a field such as
  // "Department Head" is a person, not a department name.
  if (!isDisplay && type !== "number" && !/\bauthor\b/.test(idWords) && P.PERSON_FIELD.test(idWords.replace(/\s+/g, ""))) {
    return personName(personKeyFromField(id), index, { doctor: /doctor/.test(id.toLowerCase()) });
  }

  const domainPool = matchPool(DOMAIN_TEXT[domain] || [], w);
  if (domainPool) return pick(domainPool, index, /author/.test(w) ? 0 : hash(entity.id) % 2);

  if (type === "number" || /\bage\b/.test(idWords)) {
    if (/\bage\b/.test(idWords)) return /student|pupil/.test(entityWords(entity)) ? pick([13, 12, 14, 11, 15], index) : pick([28, 34, 41, 23, 52], index);
    const override = ENTITY_NUMBERS.find(([entityRe, fieldRe]) => entityRe.test(entityWords(entity)) && fieldRe.test(w));
    if (override) return pick(override[2], index);
    const row = NUMBER_FIELDS.find(([re, list]) => list && re.test(w));
    if (row) return pick(row[1], index);
    return pick([12, 25, 8, 40, 17], index);
  }

  // Display field (name / title).
  if (isDisplay) {
    if (personEntity && !/\btitle\b/.test(idWords)) return personNameForEntity(entity, index);
    if (PERSON_ENTITY_RE.test(words(label)) && !personEntity) return personName(singular(words(label).split(" ")[0]), index);
    if (isCompanyEntity(entity)) return pick(P.COMPANIES, index, hash(entity.id) % 3);
    const pool = titlePool(entity, domain);
    if (pool) return pick(pool, index);
    return `${entity.name || "Record"} #${1001 + index}`;
  }

  if (/\b(sku|code|reference|ref|serial|barcode|invoice no|order no|roll no|ticket no|number|no)\b/.test(w) && type !== "number") {
    const prefix = (label.split(/\s+/)[0] || "REF").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "REF";
    return `${prefix}-${1000 + ((hash(entity.id) % 90) + index * 37)}`;
  }

  if (/\b(description|notes?|details?|remarks?|comments?|content|message|summary|reason|body)\b/.test(w)) {
    return pick(notesPool(entity), index);
  }

  if (/\b(category|type|kind|genre|group)\b/.test(w)) {
    return pick(matchPool(DOMAIN_CATEGORY[domain] || [], entityWords(entity)) || matchPool(CATEGORY_POOLS, entityWords(entity)) || P.CATEGORIES_GENERIC, index);
  }
  if (/\bstatus\b|\bstate\b/.test(w)) return pick(P.GENERIC_STATUS, index);

  // Where a ward/department/class sits is a place inside a building, not a street.
  if (/\b(location|venue|site)\b/.test(w) && /department|ward|room|class|table|lab/.test(entityWords(entity))) {
    return pick(["Block A, Floor 1", "Block B, Floor 2", "Main Building, Floor 3", "Annex, Floor 1", "Block C, Floor 2"], index);
  }

  if (/\b(location|bin|shelf)\b/.test(w) && /stock|inventory|item|sku|picking|receiving|product/.test(entityWords(entity))) {
    return pick(["Aisle 3, Shelf B", "Aisle 1, Shelf A", "Aisle 5, Shelf C", "Aisle 2, Shelf D", "Aisle 4, Shelf A"], index);
  }

  const text = matchPool(TEXT_FIELDS, w);
  if (text) return pick(text, index, hash(entity.id) % 2);

  if (/room|hall|lab\b/.test(w)) return domain === "hotel" ? pick(["Deluxe 201", "Standard 105", "Suite 310", "Single 102", "Executive 401"], index) : pick(P.ROOMS, index);

  // A free-text field we have no vocabulary for: still show something that
  // reads naturally instead of "Field 1".
  if (type === "textarea") return pick(notesPool(entity), index);
  return `${label} ${index + 1}`;
}

function displayFieldOf(entity) {
  if (entity.displayField && entity.fields.some((f) => f.id === entity.displayField)) return entity.displayField;
  return (entity.fields.find((f) => f.type === "text" && !f.referenceEntity) || entity.fields[0] || {}).id;
}

/**
 * Link plain-text fields to the records they obviously refer to:
 * className -> class.name, teacher -> teacher.name, room -> room.name ...
 */
function linkRows(entities, rows) {
  const byKey = new Map();
  for (const entity of entities) {
    for (const key of [entity.id, entity.name]) byKey.set(singular(key), entity);
  }
  for (const entity of entities) {
    for (const field of entity.fields) {
      if (field.referenceEntity || (field.options && field.options.length) || ["number", "date", "datetime", "boolean"].includes(field.type)) continue;
      const base = singular(String(field.id).replace(/(Name|Id|Title)$/, ""));
      if (!base) continue;
      const target = byKey.get(base);
      if (!target || target === entity || !LINKABLE_TARGET_RE.test(entityWords(target))) continue;
      const targetRows = rows[target.id];
      const display = displayFieldOf(target);
      if (!targetRows || !targetRows.length || !display) continue;
      rows[entity.id].forEach((row, index) => {
        row[field.id] = targetRows[index % targetRows.length][display];
      });
    }
  }
}

/** Build realistic, cross-linked seed rows for every entity of a spec. */
function buildSeedRows(spec = {}, options = {}) {
  const entities = Array.isArray(spec.entities) ? spec.entities : [];
  const count = Number.isInteger(options.rows) && options.rows > 0 ? options.rows : DEFAULT_ROWS;
  const context = {
    entities,
    domain: spec.contextualDomain || spec.workspaceBlueprint?.appIdentity?.domain || options.domain || "",
    now: options.now,
  };
  const rows = {};
  for (const entity of entities) {
    rows[entity.id] = Array.from({ length: count }, (_, index) => {
      const row = { id: `${entity.id}-${index + 1}` };
      for (const field of entity.fields) {
        if (field.id !== "id") row[field.id] = sampleValue(entity, field, index, context);
      }
      return row;
    });
  }
  linkRows(entities, rows);
  return rows;
}

module.exports = { sampleValue, buildSeedRows, linkRows, personName, isPersonEntity, displayFieldOf, singular, hash };
