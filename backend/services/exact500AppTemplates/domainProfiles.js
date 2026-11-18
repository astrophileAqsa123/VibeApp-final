/**
 * Domain profiles for the component library.
 *
 * Before this module every simple management prompt produced the same
 * generic app: one "Record" entity named after the prompt text, the same
 * Name/Status/Date/Notes fields, and the same 12 product-shell tabs
 * (Analytics, Calendar, Reports, ...) regardless of the domain.
 *
 * A profile decides, per domain:
 *   - which record type the app manages (Patient, Book, Medicine, Expense ...)
 *   - which fields and status options that record type has
 *   - which shell modules make sense (charts only where numbers matter)
 *
 * Output is deterministic: same prompt, same profile.
 */

const MODULE_IDS = Object.freeze(["dashboard", "records", "categories", "calendar", "analytics", "profile", "settings"]);

// Every app gets these. Optional modules are added per profile.
const BASE_MODULES = Object.freeze(["dashboard", "records", "profile", "settings"]);

// Material icon used for the records tab, per profile (generation-time choice).
const ICONS = Object.freeze({
  doctor: "medical_services", hospital: "local_hospital", pharmacy: "medication", library: "menu_book",
  teacher: "co_present", attendance: "fact_check", student: "school", hotel: "hotel", restaurant: "restaurant",
  gym: "fitness_center", employee: "badge", expense: "payments", invoice: "receipt_long", inventory: "inventory_2",
  crm: "trending_up", customer: "people", vendor: "local_shipping", vehicle: "directions_car", property: "home_work",
  event: "event", project: "folder_special", task: "task_alt", appointment: "event_available", trip: "flight",
  notes: "sticky_note_2", recipe: "restaurant_menu", habit: "self_improvement", generic: "folder_copy",
});

// Statuses worth a dashboard card. Falls back to the first two options of the status field.
const HIGHLIGHTS = Object.freeze({
  hospital: ["Admitted", "Discharged"], pharmacy: ["Low Stock", "Out of Stock"], library: ["Available", "Issued"],
  invoice: ["Paid", "Overdue"], task: ["In Progress", "Done"], hotel: ["Checked In", "Reserved"],
  crm: ["Won", "Proposal"], inventory: ["Low Stock", "Out of Stock"], attendance: ["Present", "Absent"],
  restaurant: ["Preparing", "Paid"],
});

function field(name, label, type = "text", extra = {}) {
  return { name, label, type, required: false, ...extra };
}

function required(f) {
  return { ...f, required: true };
}

const PROFILES = [
  {
    key: "doctor",
    // "doctor management" without hospital/patient context manages doctors.
    match: /^(?!.*\b(hospital|clinic|patients?)\b).*\bdoctors?\b/,
    domain: "Healthcare",
    logo: "🩺",
    appName: "Doctor Manager",
    entity: "Doctor",
    plural: "Doctors",
    fields: [
      required(field("name", "Doctor Name")),
      field("specialization", "Specialization"),
      field("phone", "Phone", "phone"),
      field("email", "Email", "email"),
      field("experienceYears", "Experience (years)", "number"),
      field("availability", "Availability", "select", { options: ["Available", "In Surgery", "On Leave"] }),
    ],
    statusField: "availability",
    categoryField: "specialization",
    modules: [],
  },
  {
    key: "hospital",
    match: /\b(hospital|clinic|patients?|medical|healthcare)\b/,
    domain: "Healthcare",
    logo: "🏥",
    appName: "Hospital Manager",
    entity: "Patient",
    plural: "Patients",
    fields: [
      required(field("name", "Patient Name")),
      field("age", "Age", "number"),
      field("gender", "Gender", "select", { options: ["Male", "Female", "Other"] }),
      field("phone", "Phone", "phone"),
      field("diagnosis", "Diagnosis"),
      field("assignedDoctor", "Assigned Doctor"),
      field("admissionDate", "Admission Date", "date"),
      field("status", "Status", "select", { options: ["Admitted", "Under Observation", "Discharged"] }),
    ],
    statusField: "status",
    categoryField: "assignedDoctor",
    dateField: "admissionDate",
    // No charts or calendar by default: a hospital record list does not need them.
    modules: [],
  },
  {
    key: "pharmacy",
    match: /\b(pharmacy|pharmacies|medicines?|drug ?store|chemist)\b/,
    domain: "Pharmacy",
    logo: "💊",
    appName: "Pharmacy Manager",
    entity: "Medicine",
    plural: "Medicines",
    fields: [
      required(field("name", "Medicine Name")),
      field("category", "Category", "select", { options: ["Tablet", "Syrup", "Injection", "Ointment", "Other"] }),
      field("batchNumber", "Batch Number"),
      field("quantity", "Quantity in Stock", "number"),
      field("price", "Price", "number"),
      field("expiryDate", "Expiry Date", "date"),
      field("status", "Stock Status", "select", { options: ["In Stock", "Low Stock", "Out of Stock", "Expired"] }),
    ],
    statusField: "status",
    categoryField: "category",
    dateField: "expiryDate",
    modules: [],
  },
  {
    key: "library",
    match: /\b(library|libraries|books?)\b/,
    domain: "Library",
    logo: "📚",
    appName: "Library Manager",
    entity: "Book",
    plural: "Books",
    fields: [
      required(field("title", "Book Title")),
      field("author", "Author"),
      field("isbn", "ISBN"),
      field("category", "Category", "select", { options: ["Fiction", "Non-fiction", "Science", "History", "Reference", "Children"] }),
      field("copies", "Copies Available", "number"),
      field("status", "Status", "select", { options: ["Available", "Issued", "Reserved", "Lost"] }),
    ],
    statusField: "status",
    categoryField: "category",
    modules: [],
  },
  {
    key: "teacher",
    match: /^(?!.*\b(school|college|university|students?)\b).*\bteachers?\b/,
    domain: "Education",
    logo: "🧑‍🏫",
    appName: "Teacher Manager",
    entity: "Teacher",
    plural: "Teachers",
    fields: [
      required(field("name", "Teacher Name")),
      field("subject", "Subject"),
      field("phone", "Phone", "phone"),
      field("email", "Email", "email"),
      field("joiningDate", "Joining Date", "date"),
      field("status", "Status", "select", { options: ["Active", "On Leave", "Resigned"] }),
    ],
    statusField: "status",
    categoryField: "subject",
    modules: [],
  },
  {
    key: "attendance",
    match: /\battendance\b/,
    domain: "Attendance",
    logo: "📝",
    appName: "Attendance Tracker",
    entity: "Attendance Entry",
    plural: "Attendance Entries",
    fields: [
      required(field("personName", "Name")),
      field("className", "Class / Team"),
      field("date", "Date", "date"),
      field("status", "Status", "select", { options: ["Present", "Absent", "Late", "On Leave"] }),
      field("remarks", "Remarks", "textarea"),
    ],
    statusField: "status",
    categoryField: "className",
    dateField: "date",
    // Present/absent distribution is the whole point of attendance.
    modules: ["analytics", "calendar"],
  },
  {
    key: "student",
    match: /\b(student|students|school|college|university|class|classroom)\b/,
    domain: "Education",
    logo: "🎓",
    appName: "Student Manager",
    entity: "Student",
    plural: "Students",
    fields: [
      required(field("name", "Student Name")),
      field("rollNumber", "Roll Number"),
      field("className", "Class"),
      field("guardianName", "Guardian Name"),
      field("phone", "Phone", "phone"),
      field("status", "Status", "select", { options: ["Active", "Graduated", "Transferred", "Suspended"] }),
    ],
    statusField: "status",
    categoryField: "className",
    modules: [],
  },
  {
    key: "hotel",
    match: /\b(hotel|hotels|resort|guest ?house|hostel)\b/,
    domain: "Hospitality",
    logo: "🏨",
    appName: "Hotel Manager",
    entity: "Booking",
    plural: "Bookings",
    fields: [
      required(field("guestName", "Guest Name")),
      field("roomNumber", "Room Number"),
      field("roomType", "Room Type", "select", { options: ["Single", "Double", "Suite", "Family"] }),
      field("checkIn", "Check-in", "date"),
      field("checkOut", "Check-out", "date"),
      field("amount", "Total Amount", "number"),
      field("status", "Status", "select", { options: ["Reserved", "Checked In", "Checked Out", "Cancelled"] }),
    ],
    statusField: "status",
    categoryField: "roomType",
    dateField: "checkIn",
    amountField: "amount",
    modules: ["calendar"],
  },
  {
    key: "restaurant",
    match: /\b(restaurant|restaurants|cafe|cafes|diner|food order)\b/,
    domain: "Food Service",
    logo: "🍽️",
    appName: "Restaurant Manager",
    entity: "Order",
    plural: "Orders",
    fields: [
      required(field("customerName", "Customer Name")),
      field("tableNumber", "Table Number"),
      field("items", "Items", "textarea"),
      field("total", "Total", "number"),
      field("orderDate", "Order Date", "date"),
      field("status", "Status", "select", { options: ["Preparing", "Served", "Paid", "Cancelled"] }),
    ],
    statusField: "status",
    categoryField: "tableNumber",
    dateField: "orderDate",
    amountField: "total",
    modules: ["analytics"],
  },
  {
    key: "gym",
    match: /\b(gym|gyms|fitness|membership|memberships|members?)\b/,
    domain: "Fitness",
    logo: "🏋️",
    appName: "Gym Manager",
    entity: "Member",
    plural: "Members",
    fields: [
      required(field("name", "Member Name")),
      field("phone", "Phone", "phone"),
      field("plan", "Plan", "select", { options: ["Monthly", "Quarterly", "Yearly"] }),
      field("joinDate", "Join Date", "date"),
      field("expiryDate", "Plan Expiry", "date"),
      field("status", "Status", "select", { options: ["Active", "Expired", "Frozen"] }),
    ],
    statusField: "status",
    categoryField: "plan",
    dateField: "expiryDate",
    modules: [],
  },
  {
    key: "employee",
    match: /\b(employee|employees|staff|hr|payroll|workforce)\b/,
    domain: "Human Resources",
    logo: "👥",
    appName: "Employee Manager",
    entity: "Employee",
    plural: "Employees",
    fields: [
      required(field("name", "Employee Name")),
      field("department", "Department"),
      field("designation", "Designation"),
      field("email", "Email", "email"),
      field("phone", "Phone", "phone"),
      field("salary", "Salary", "number"),
      field("joiningDate", "Joining Date", "date"),
      field("status", "Status", "select", { options: ["Active", "On Leave", "Resigned"] }),
    ],
    statusField: "status",
    categoryField: "department",
    dateField: "joiningDate",
    modules: [],
  },
  {
    key: "expense",
    match: /\b(expense|expenses|budget|budgets|spending|finance|income)\b/,
    domain: "Finance",
    logo: "💸",
    appName: "Expense Tracker",
    entity: "Expense",
    plural: "Expenses",
    fields: [
      required(field("title", "Title")),
      field("amount", "Amount", "number", { required: true }),
      field("category", "Category", "select", { options: ["Food", "Transport", "Bills", "Shopping", "Health", "Other"] }),
      field("date", "Date", "date"),
      field("paymentMethod", "Payment Method", "select", { options: ["Cash", "Card", "Bank Transfer", "Wallet"] }),
      field("notes", "Notes", "textarea"),
    ],
    statusField: "",
    categoryField: "category",
    dateField: "date",
    amountField: "amount",
    // Money by category and over time: charts are the main feature here.
    modules: ["analytics", "calendar"],
  },
  {
    key: "invoice",
    match: /\b(invoice|invoices|billing|accounting|payments?)\b/,
    domain: "Billing",
    logo: "🧾",
    appName: "Invoice Manager",
    entity: "Invoice",
    plural: "Invoices",
    fields: [
      required(field("clientName", "Client Name")),
      field("invoiceNumber", "Invoice Number"),
      field("amount", "Amount", "number", { required: true }),
      field("issueDate", "Issue Date", "date"),
      field("dueDate", "Due Date", "date"),
      field("status", "Status", "select", { options: ["Draft", "Sent", "Paid", "Overdue"] }),
    ],
    statusField: "status",
    categoryField: "status",
    dateField: "dueDate",
    amountField: "amount",
    modules: ["analytics"],
  },
  {
    key: "inventory",
    match: /\b(inventory|warehouse|stock|products?|items?)\b/,
    domain: "Inventory",
    logo: "📦",
    appName: "Inventory Manager",
    entity: "Product",
    plural: "Products",
    fields: [
      required(field("name", "Product Name")),
      field("sku", "SKU"),
      field("category", "Category"),
      field("quantity", "Quantity", "number"),
      field("price", "Unit Price", "number"),
      field("supplier", "Supplier"),
      field("status", "Stock Status", "select", { options: ["In Stock", "Low Stock", "Out of Stock"] }),
    ],
    statusField: "status",
    categoryField: "category",
    modules: ["analytics"],
  },
  {
    key: "crm",
    match: /\b(crm|sales|leads?|deals?|pipeline)\b/,
    domain: "Sales",
    logo: "📈",
    appName: "Sales CRM",
    entity: "Lead",
    plural: "Leads",
    fields: [
      required(field("name", "Lead Name")),
      field("company", "Company"),
      field("email", "Email", "email"),
      field("phone", "Phone", "phone"),
      field("dealValue", "Deal Value", "number"),
      field("followUpDate", "Follow-up Date", "date"),
      field("stage", "Stage", "select", { options: ["New", "Contacted", "Proposal", "Won", "Lost"] }),
    ],
    statusField: "stage",
    categoryField: "stage",
    dateField: "followUpDate",
    amountField: "dealValue",
    modules: ["analytics"],
  },
  {
    key: "customer",
    match: /\b(customers?|clients?|contacts?)\b/,
    domain: "Customers",
    logo: "🤝",
    appName: "Customer Manager",
    entity: "Customer",
    plural: "Customers",
    fields: [
      required(field("name", "Customer Name")),
      field("email", "Email", "email"),
      field("phone", "Phone", "phone"),
      field("city", "City"),
      field("address", "Address", "textarea"),
      field("status", "Status", "select", { options: ["Active", "Inactive", "VIP"] }),
    ],
    statusField: "status",
    categoryField: "city",
    modules: [],
  },
  {
    key: "vendor",
    match: /\b(vendors?|suppliers?)\b/,
    domain: "Procurement",
    logo: "🚚",
    appName: "Vendor Manager",
    entity: "Vendor",
    plural: "Vendors",
    fields: [
      required(field("name", "Vendor Name")),
      field("contactPerson", "Contact Person"),
      field("phone", "Phone", "phone"),
      field("email", "Email", "email"),
      field("category", "Supplies"),
      field("status", "Status", "select", { options: ["Active", "On Hold", "Blacklisted"] }),
    ],
    statusField: "status",
    categoryField: "category",
    modules: [],
  },
  {
    key: "vehicle",
    match: /\b(car|cars|vehicle|vehicles|fleet|bike|bikes|rental)\b/,
    domain: "Transport",
    logo: "🚗",
    appName: "Fleet Manager",
    entity: "Vehicle",
    plural: "Vehicles",
    fields: [
      required(field("name", "Vehicle Name")),
      field("plateNumber", "Plate Number"),
      field("type", "Type", "select", { options: ["Car", "Bike", "Van", "Truck"] }),
      field("dailyRate", "Daily Rate", "number"),
      field("serviceDate", "Next Service", "date"),
      field("status", "Status", "select", { options: ["Available", "Rented", "In Service"] }),
    ],
    statusField: "status",
    categoryField: "type",
    dateField: "serviceDate",
    modules: [],
  },
  {
    key: "property",
    match: /\b(property|properties|real estate|tenants?|landlord|apartments?)\b/,
    domain: "Real Estate",
    logo: "🏠",
    appName: "Property Manager",
    entity: "Property",
    plural: "Properties",
    fields: [
      required(field("title", "Property Title")),
      field("address", "Address", "textarea"),
      field("type", "Type", "select", { options: ["Apartment", "House", "Shop", "Land"] }),
      field("rent", "Monthly Rent", "number"),
      field("tenantName", "Tenant"),
      field("status", "Status", "select", { options: ["Vacant", "Occupied", "Under Maintenance"] }),
    ],
    statusField: "status",
    categoryField: "type",
    amountField: "rent",
    modules: [],
  },
  {
    key: "event",
    match: /\b(events?|conference|wedding)\b/,
    domain: "Events",
    logo: "🎉",
    appName: "Event Planner",
    entity: "Event",
    plural: "Events",
    fields: [
      required(field("title", "Event Title")),
      field("date", "Date", "date"),
      field("venue", "Venue"),
      field("capacity", "Capacity", "number"),
      field("organizer", "Organizer"),
      field("status", "Status", "select", { options: ["Planned", "Confirmed", "Completed", "Cancelled"] }),
    ],
    statusField: "status",
    categoryField: "venue",
    dateField: "date",
    modules: ["calendar"],
  },
  {
    key: "project",
    match: /\b(project|projects)\b/,
    domain: "Projects",
    logo: "🗂️",
    appName: "Project Manager",
    entity: "Project",
    plural: "Projects",
    fields: [
      required(field("name", "Project Name")),
      field("client", "Client"),
      field("deadline", "Deadline", "date"),
      field("budget", "Budget", "number"),
      field("owner", "Owner"),
      field("status", "Status", "select", { options: ["Planned", "In Progress", "On Hold", "Completed"] }),
    ],
    statusField: "status",
    categoryField: "status",
    dateField: "deadline",
    amountField: "budget",
    modules: ["analytics"],
  },
  {
    key: "task",
    match: /\b(tasks?|todo|to do|checklist)\b/,
    domain: "Productivity",
    logo: "✅",
    appName: "Task Manager",
    entity: "Task",
    plural: "Tasks",
    fields: [
      required(field("title", "Task Title")),
      field("priority", "Priority", "select", { options: ["Low", "Medium", "High"] }),
      field("dueDate", "Due Date", "date"),
      field("status", "Status", "select", { options: ["To Do", "In Progress", "Done"] }),
      field("notes", "Notes", "textarea"),
    ],
    statusField: "status",
    categoryField: "priority",
    dateField: "dueDate",
    modules: ["analytics", "calendar"],
  },
  {
    key: "appointment",
    match: /\b(appointments?|bookings?|reservations?|schedule)\b/,
    domain: "Scheduling",
    logo: "📅",
    appName: "Appointment Manager",
    entity: "Appointment",
    plural: "Appointments",
    fields: [
      required(field("clientName", "Client Name")),
      field("service", "Service"),
      field("date", "Date", "date"),
      field("time", "Time"),
      field("phone", "Phone", "phone"),
      field("status", "Status", "select", { options: ["Scheduled", "Completed", "Cancelled", "No Show"] }),
    ],
    statusField: "status",
    categoryField: "service",
    dateField: "date",
    modules: ["calendar"],
  },
  {
    key: "trip",
    match: /\b(trip|trips|travel|tour|tours|itinerary)\b/,
    domain: "Travel",
    logo: "✈️",
    appName: "Trip Planner",
    entity: "Trip",
    plural: "Trips",
    fields: [
      required(field("tripName", "Trip Name")),
      field("destination", "Destination"),
      field("startDate", "Start Date", "date"),
      field("endDate", "End Date", "date"),
      field("budget", "Budget", "number"),
      field("status", "Status", "select", { options: ["Planned", "Confirmed", "In Progress", "Completed"] }),
    ],
    statusField: "status",
    categoryField: "destination",
    dateField: "startDate",
    amountField: "budget",
    modules: ["calendar"],
  },
  {
    key: "notes",
    match: /\b(notes?|notepad|journal|diary)\b/,
    domain: "Notes",
    logo: "🗒️",
    appName: "Notes Manager",
    entity: "Note",
    plural: "Notes",
    fields: [
      required(field("title", "Title")),
      field("content", "Content", "textarea"),
      field("category", "Category", "select", { options: ["Personal", "Work", "Ideas", "Study"] }),
      field("date", "Date", "date"),
    ],
    statusField: "",
    categoryField: "category",
    modules: [],
  },
  {
    key: "recipe",
    match: /\b(recipes?|cooking)\b/,
    domain: "Cooking",
    logo: "🍳",
    appName: "Recipe Book",
    entity: "Recipe",
    plural: "Recipes",
    fields: [
      required(field("title", "Recipe Name")),
      field("cuisine", "Cuisine"),
      field("prepMinutes", "Prep Time (min)", "number"),
      field("ingredients", "Ingredients", "textarea"),
      field("steps", "Steps", "textarea"),
      field("difficulty", "Difficulty", "select", { options: ["Easy", "Medium", "Hard"] }),
    ],
    statusField: "",
    categoryField: "cuisine",
    modules: [],
  },
  {
    key: "habit",
    match: /\b(habits?)\b/,
    domain: "Wellness",
    logo: "🌱",
    appName: "Habit Tracker",
    entity: "Habit",
    plural: "Habits",
    fields: [
      required(field("name", "Habit")),
      field("frequency", "Frequency", "select", { options: ["Daily", "Weekly", "Monthly"] }),
      field("startDate", "Start Date", "date"),
      field("streak", "Current Streak (days)", "number"),
      field("status", "Status", "select", { options: ["Active", "Paused", "Completed"] }),
    ],
    statusField: "status",
    categoryField: "frequency",
    dateField: "startDate",
    modules: ["analytics"],
  },
];

const STOP_WORDS = /\b(build|create|make|generate|develop|design|need|want|i|me|my|a|an|the|flutter|crud|app|application|apps|system|software|with|for|please|simple|basic|management|manager|manage|tracker|tracking|portal|dashboard|and|to|of)\b/gi;

function titleCase(value = "") {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function singularize(word = "") {
  const w = String(word);
  if (/ies$/i.test(w)) return `${w.slice(0, -3)}y`;
  if (/(ss|us|is)$/i.test(w)) return w;
  if (/(ches|shes|xes|zes|sses)$/i.test(w)) return w.slice(0, -2);
  if (/s$/i.test(w)) return w.slice(0, -1);
  return w;
}

function pluralize(word = "") {
  const w = String(word).trim();
  if (!w) return "Records";
  if (/(staff|news|data)$/i.test(w)) return w;
  if (/[^aeiou]y$/i.test(w)) return `${w.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(w)) return `${w}es`;
  return `${w}s`;
}

/**
 * Unknown domain: derive the record type from the prompt's head noun instead of
 * pasting the whole prompt ("Hospital Management") into every label.
 */
function genericProfile(prompt = "") {
  const cleaned = String(prompt)
    .replace(/\b(in|using)\s+(blue|red|green|purple|black|white|dark|light|orange|pink|teal|gold)\b(\s+(and\s+)?\w+)?(\s+theme)?/gi, " ")
    .split(/\b(?:where|that|which|users? can|fields?)\b/i)[0]
    .replace(STOP_WORDS, " ")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean);
  const entityWords = words.length ? words.slice(-2) : [];
  const head = singularize(entityWords[entityWords.length - 1] || "Record");
  const entity = titleCase([...entityWords.slice(0, -1), head].join(" ")) || "Record";
  return {
    key: "generic",
    domain: words.length ? titleCase(words.join(" ")) : "General",
    logo: "📋",
    appName: words.length ? `${titleCase(words.join(" "))} Manager` : "Records Manager",
    entity,
    plural: pluralize(entity),
    fields: [
      required(field("name", "Name")),
      field("category", "Category"),
      field("date", "Date", "date"),
      field("status", "Status", "select", { options: ["Active", "Pending", "Completed"] }),
      field("notes", "Notes", "textarea"),
    ],
    statusField: "status",
    categoryField: "category",
    dateField: "date",
    modules: [],
  };
}

function wantsModule(prompt, id) {
  const text = String(prompt).toLowerCase();
  if (id === "analytics") return /\b(charts?|graphs?|analytics|insights?|statistics|stats|reports?)\b/.test(text);
  if (id === "calendar") return /\b(calendar|schedule|timeline)\b/.test(text);
  if (id === "categories") return /\b(categories|category wise|grouped)\b/.test(text);
  return false;
}

function unwantedModule(prompt, id) {
  const text = String(prompt).toLowerCase();
  if (id === "analytics") return /\b(no|without)\s+(charts?|graphs?|analytics)\b/.test(text);
  if (id === "calendar") return /\b(no|without)\s+calendar\b/.test(text);
  return false;
}

/**
 * Only keep a module when the record type actually has the data it needs.
 */
function moduleIsSupported(profile, id) {
  if (id === "analytics") return Boolean(profile.statusField || profile.amountField);
  if (id === "calendar") return Boolean(profile.dateField);
  if (id === "categories") return Boolean(profile.categoryField);
  return true;
}

function resolveDomainProfile(prompt = "") {
  const text = String(prompt).toLowerCase();
  const base = PROFILES.find((profile) => profile.match.test(text)) || genericProfile(prompt);
  const optional = new Set(base.modules || []);
  for (const id of ["analytics", "calendar", "categories"]) {
    if (wantsModule(text, id)) optional.add(id);
    if (unwantedModule(text, id)) optional.delete(id);
  }
  const modules = MODULE_IDS.filter((id) => BASE_MODULES.includes(id) || (optional.has(id) && moduleIsSupported(base, id)));
  const fields = base.fields.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined }));
  return {
    key: base.key,
    domain: base.domain,
    logo: base.logo,
    appName: base.appName,
    entity: base.entity,
    plural: base.plural,
    fields,
    modules,
    statusField: base.statusField || "",
    categoryField: base.categoryField || "",
    dateField: base.dateField || "",
    amountField: base.amountField || "",
    icon: ICONS[base.key] || ICONS.generic,
  };
}

/**
 * The prompt can list its own fields ("with name, age, phone"). Those win over
 * the profile defaults, so the role fields (status/date/amount/category) are
 * re-derived from the final field list and modules that lost their data are dropped.
 */
function bindProfileToFields(profile, fields = [], { explicit = false } = {}) {
  const byName = new Map(fields.map((f) => [f.name, f]));
  const keep = (name, type) => (name && byName.has(name) && (!type || byName.get(name).type === type) ? name : "");
  const first = (predicate) => (fields.find(predicate) || {}).name || "";
  // Fall back to guessing only for user-listed fields; profile defaults are exact.
  const guess = (fn) => (explicit ? fn() : "");
  const dateField = keep(profile.dateField, "date") || guess(() => first((f) => f.type === "date"));
  const statusField = keep(profile.statusField) || guess(() => first((f) => f.type === "select"));
  const categoryField = keep(profile.categoryField) || guess(() => statusField || first((f) => /category|type|class|department|group/i.test(`${f.name} ${f.label}`)));
  const amountField = keep(profile.amountField, "number") || guess(() => first((f) => f.type === "number" && /amount|price|total|cost|salary|budget|fee|rent|value/i.test(`${f.name} ${f.label}`)));
  const statusOptions = (byName.get(statusField) || {}).options || [];
  const highlights = (HIGHLIGHTS[profile.key] || statusOptions.slice(0, 2)).filter((option) => statusOptions.includes(option));
  const bound = { ...profile, fields, dateField, statusField, categoryField, amountField, highlights };
  bound.modules = profile.modules.filter((id) => BASE_MODULES.includes(id) || moduleIsSupported(bound, id));
  return bound;
}

module.exports = { bindProfileToFields, resolveDomainProfile, PROFILES, MODULE_IDS, BASE_MODULES, pluralize, singularize, titleCase };
