// Infers a sensible field set for an entity from what it *is* ("Employee",
// "Support Ticket", "Shipment"), so generated apps are not a wall of
// title / status / notes. Rules are plain data: add a row to extend coverage.
//
// A field def is [id, label, type, options?]. The first rule whose pattern
// matches the entity's words wins, so keep specific rules above general ones.
// Domain-exact definitions (workspaceComponentSpec.DOMAIN_FIELDS) still take
// priority over everything here.

const PERSON_LABEL_RE = /\b(name|people|person|staff|doctor|patient|student|guest|customer|member|employee|trainer|driver|tenant|agent|seller|user|organizer|librarian|pharmacist|provider|client|attendee|teacher|officer|operator|supervisor|manager|admin|vendor|supplier|coach|technician|recruit|applicant)s?\b/i;

const PERSON_RULES = [
  [/\bdriver/, [["name", "Name", "text"], ["phone", "Phone", "phone"], ["vehicle", "Vehicle", "text"], ["status", "Status", "status", ["Available", "On route", "Off duty"]]]],
  [/\btrainer|coach/, [["name", "Name", "text"], ["specialty", "Specialty", "text"], ["phone", "Phone", "phone"], ["status", "Status", "status", ["Available", "In session", "Off duty"]]]],
  [/\btenant/, [["name", "Name", "text"], ["unit", "Unit", "text"], ["phone", "Phone", "phone"], ["email", "Email", "email"], ["status", "Status", "status", ["Active", "Notice given", "Past tenant"]]]],
  [/\bseller|vendor|supplier/, [["name", "Name", "text"], ["email", "Email", "email"], ["phone", "Phone", "phone"], ["status", "Status", "status", ["Active", "Pending review", "Suspended"]]]],
  [/\bmember/, [["name", "Name", "text"], ["email", "Email", "email"], ["phone", "Phone", "phone"], ["status", "Status", "status", ["Active", "Expired", "Suspended"]]]],
  [/\bcustomer|client|guest|attendee|applicant/, [["name", "Name", "text"], ["email", "Email", "email"], ["phone", "Phone", "phone"], ["status", "Status", "status", ["Active", "New", "Inactive"]]]],
  [/\buser|admin/, [["name", "Name", "text"], ["email", "Email", "email"], ["role", "Role", "text"], ["status", "Status", "status", ["Active", "Invited", "Disabled"]]]],
  [/\bemployee|staff|agent|organizer|librarian|pharmacist|provider|officer|operator|supervisor|manager|technician|people/, [["name", "Name", "text"], ["role", "Role", "text"], ["department", "Department", "text"], ["phone", "Phone", "phone"], ["status", "Status", "status", ["Active", "On leave", "Inactive"]]]],
];

// Non-person records, most specific first.
const RECORD_RULES = [
  [/\bsla\b|polic/, [["title", "Title", "text"], ["priority", "Priority", "select", ["Critical", "High", "Standard", "Basic"]], ["status", "Status", "status", ["Active", "Draft", "Retired"]], ["notes", "Notes", "textarea"]]],
  [/knowledge|faq|article|help/, [["title", "Title", "text"], ["category", "Category", "text"], ["status", "Status", "status", ["Published", "Draft", "Archived"]], ["notes", "Summary", "textarea"]]],
  [/audit|activity|timeline|\blog\b/, [["title", "Event", "text"], ["user", "User", "text"], ["date", "Date", "date"], ["notes", "Details", "textarea"]]],
  [/notification|announcement|notice|message/, [["title", "Title", "text"], ["date", "Date", "date"], ["status", "Status", "status", ["Unread", "Read", "Archived"]], ["notes", "Message", "textarea"]]],
  [/risk|alert|fraud|incident/, [["title", "Alert", "text"], ["severity", "Severity", "select", ["Low", "Medium", "High", "Critical"]], ["date", "Date", "date"], ["status", "Status", "status", ["Open", "Investigating", "Resolved"]]]],
  [/attendance|check.?in/, (domain) => [[domain === "hr" ? "employeeName" : domain === "school" ? "studentName" : "memberName", domain === "hr" ? "Employee" : domain === "school" ? "Student" : "Member", "text"], ["date", "Date", "date"], ["status", "Status", "status", ["Present", "Absent", "Late"]], ["notes", "Notes", "textarea"]]],
  [/performance|appraisal|review\b/, [["employeeName", "Employee", "text"], ["score", "Score", "number"], ["date", "Review Date", "date"], ["status", "Status", "status", ["Draft", "Submitted", "Completed"]]]],
  [/recruit|candidate|vacanc/, [["candidateName", "Candidate", "text"], ["position", "Position", "text"], ["date", "Applied", "date"], ["status", "Status", "status", ["Applied", "Interview", "Offered", "Rejected"]]]],
  [/ticket|issue|complaint|case|bug|defect/, [["title", "Title", "text"], ["priority", "Priority", "select", ["Low", "Medium", "High", "Urgent"]], ["assignedTo", "Assigned To", "text"], ["status", "Status", "status", ["Open", "In progress", "Resolved", "Closed"]], ["notes", "Details", "textarea"]]],
  [/leave|approval|requisition|request/, [["title", "Request", "text"], ["requestedBy", "Requested By", "text"], ["date", "Date", "date"], ["status", "Status", "status", ["Pending", "Approved", "Rejected"]], ["notes", "Notes", "textarea"]]],
  [/application/, [["title", "Application", "text"], ["customerName", "Applicant", "text"], ["date", "Submitted", "date"], ["status", "Status", "status", ["Submitted", "In review", "Approved", "Rejected"]]]],
  [/lead|prospect|opportunit|deal|pipeline|quote|proposal/, [["title", "Title", "text"], ["company", "Company", "text"], ["value", "Value", "number"], ["source", "Source", "text"], ["status", "Status", "status", ["New", "Contacted", "Qualified", "Won", "Lost"]]]],
  [/refill|dispens/, [["title", "Medicine", "text"], ["patientName", "Patient", "text"], ["date", "Date", "date"], ["status", "Status", "status", ["Pending", "Ready", "Collected"]]]],
  [/proof/, [["title", "Delivery", "text"], ["recipientName", "Recipient", "text"], ["date", "Date", "date"], ["status", "Status", "status", ["Signed", "Left at door", "Refused"]]]],
  [/shipment|delivery|parcel|package|dispatch|track/, [["title", "Shipment", "text"], ["recipientName", "Recipient", "text"], ["address", "Address", "text"], ["date", "Date", "date"], ["status", "Status", "status", ["Pending", "In transit", "Delivered", "Failed"]]]],
  [/\broute|stop/, [["title", "Route", "text"], ["driver", "Driver", "text"], ["distance", "Distance (km)", "number"], ["status", "Status", "status", ["Planned", "Active", "Completed"]]]],
  [/address/, [["title", "Label", "text"], ["address", "Address", "text"], ["city", "City", "text"], ["phone", "Phone", "phone"]]],
  [/loan|borrow|checkout|issue book|return/, [["title", "Book", "text"], ["memberName", "Member", "text"], ["dueDate", "Due Date", "date"], ["status", "Status", "status", ["Borrowed", "Returned", "Overdue"]]]],
  [/catalog|book/, [["title", "Title", "text"], ["author", "Author", "text"], ["category", "Category", "text"], ["copies", "Copies", "number"], ["status", "Status", "status", ["Available", "On loan", "Reserved"]]]],
  [/prescription|medicine|medication|drug/, [["title", "Medicine", "text"], ["category", "Category", "text"], ["price", "Price", "number"], ["quantity", "Quantity", "number"], ["status", "Status", "status", ["In stock", "Low stock", "Out of stock"]]]],
  [/menu|dish|food|meal/, [["title", "Name", "text"], ["category", "Category", "text"], ["price", "Price", "number"], ["status", "Status", "status", ["Available", "Sold out"]]]],
  [/kitchen/, [["title", "Order", "text"], ["items", "Items", "number"], ["status", "Status", "status", ["Queued", "Preparing", "Ready", "Served"]]]],
  [/\btable\b/, [["title", "Table", "text"], ["capacity", "Seats", "number"], ["status", "Status", "status", ["Free", "Occupied", "Reserved"]]]],
  [/product|goods|merchandise|listing(?!s? of)/, [["title", "Name", "text"], ["category", "Category", "text"], ["price", "Price", "number"], ["quantity", "Stock", "number"], ["status", "Status", "status", ["In stock", "Low stock", "Out of stock"]]]],
  [/stock|inventory|sku|receiving|picking|item/, [["title", "Item", "text"], ["sku", "SKU", "text"], ["quantity", "Quantity", "number"], ["location", "Location", "text"], ["status", "Status", "status", ["In stock", "Low stock", "Out of stock"]]]],
  [/transfer/, [["title", "Transfer", "text"], ["quantity", "Quantity", "number"], ["date", "Date", "date"], ["status", "Status", "status", ["Requested", "In transit", "Received"]]]],
  [/\bcart\b|basket/, [["title", "Cart", "text"], ["amount", "Total", "number"], ["status", "Status", "status", ["Open", "Checked out", "Abandoned"]]]],
  [/order/, [["title", "Order", "text"], ["customerName", "Customer", "text"], ["date", "Date", "date"], ["amount", "Total", "number"], ["status", "Status", "status", ["Pending", "Processing", "Delivered", "Cancelled"]]]],
  [/payout|payslip|payroll|salary/, [["title", "Reference", "text"], ["date", "Date", "date"], ["amount", "Amount", "number"], ["status", "Status", "status", ["Scheduled", "Paid", "On hold"]]]],
  [/fine/, [["title", "Reference", "text"], ["memberName", "Member", "text"], ["amount", "Amount", "number"], ["status", "Status", "status", ["Unpaid", "Paid", "Waived"]]]],
  [/payment|billing|invoice|bill\b/, [["title", "Reference", "text"], ["date", "Date", "date"], ["amount", "Amount", "number"], ["status", "Status", "status", ["Pending", "Paid", "Overdue"]]]],
  [/account|wallet/, [["title", "Account", "text"], ["customerName", "Holder", "text"], ["balance", "Balance", "number"], ["status", "Status", "status", ["Active", "Frozen", "Closed"]]]],
  [/transaction|expense|income|spend/, [["title", "Description", "text"], ["category", "Category", "text"], ["date", "Date", "date"], ["amount", "Amount", "number"], ["status", "Status", "status", ["Completed", "Pending", "Failed"]]]],
  [/maintenance|repair|work.?order/, [["title", "Issue", "text"], ["location", "Location", "text"], ["date", "Date", "date"], ["status", "Status", "status", ["Open", "In progress", "Resolved"]]]],
  [/property|apartment|house|unit\b/, [["title", "Property", "text"], ["address", "Address", "text"], ["rent", "Monthly Rent", "number"], ["status", "Status", "status", ["Available", "Rented", "Under maintenance"]]]],
  [/lease|tenancy/, [["title", "Lease", "text"], ["startDate", "Start Date", "date"], ["endDate", "End Date", "date"], ["rent", "Monthly Rent", "number"], ["status", "Status", "status", ["Active", "Expiring", "Ended"]]]],
  [/viewing/, [["title", "Viewing", "text"], ["customerName", "Visitor", "text"], ["date", "Date", "date"], ["status", "Status", "status", ["Scheduled", "Completed", "Cancelled"]]]],
  [/venue|location|warehouse|branch|site|facility/, [["title", "Name", "text"], ["address", "Address", "text"], ["capacity", "Capacity", "number"], ["status", "Status", "status", ["Open", "Full", "Closed"]]]],
  [/registration/, [["title", "Registration", "text"], ["attendeeName", "Attendee", "text"], ["date", "Date", "date"], ["status", "Status", "status", ["Registered", "Checked in", "Cancelled"]]]],
  [/event|conference|workshop|webinar|agenda|keynote/, [["title", "Event", "text"], ["date", "Date", "date"], ["venue", "Venue", "text"], ["capacity", "Capacity", "number"], ["status", "Status", "status", ["Upcoming", "Live", "Completed"]]]],
  [/booking|reservation|appointment|session|schedule|shift|availability/, [["title", "Title", "text"], ["customerName", "Customer", "text"], ["date", "Date", "date"], ["time", "Time", "text"], ["status", "Status", "status", ["Scheduled", "Confirmed", "Completed", "Cancelled"]]]],
  [/milestone/, [["title", "Milestone", "text"], ["dueDate", "Due Date", "date"], ["status", "Status", "status", ["Upcoming", "In progress", "Reached"]]]],
  [/task|todo|checklist|chore/, [["title", "Task", "text"], ["assignedTo", "Assigned To", "text"], ["dueDate", "Due Date", "date"], ["priority", "Priority", "select", ["Low", "Medium", "High"]], ["status", "Status", "status", ["To do", "In progress", "Done"]]]],
  [/project|initiative|campaign|program/, [["title", "Project", "text"], ["owner", "Owner", "text"], ["dueDate", "Due Date", "date"], ["status", "Status", "status", ["Planning", "Active", "On hold", "Completed"]]]],
  [/team|squad|department|queue|group/, [["name", "Name", "text"], ["lead", "Lead", "text"], ["members", "Members", "number"], ["status", "Status", "status", ["Active", "Inactive"]]]],
  [/workout|exercise|training/, [["title", "Workout", "text"], ["duration", "Duration (min)", "number"], ["date", "Date", "date"], ["status", "Status", "status", ["Planned", "Completed", "Skipped"]]]],
  [/nutrition|diet/, [["title", "Meal", "text"], ["category", "Type", "text"], ["calories", "Calories", "number"], ["status", "Status", "status", ["Planned", "Logged"]]]],
  [/plan|subscription|membership|package/, [["title", "Plan", "text"], ["price", "Price", "number"], ["duration", "Duration (days)", "number"], ["status", "Status", "status", ["Active", "Archived"]]]],
  [/service/, [["title", "Service", "text"], ["price", "Price", "number"], ["duration", "Duration (min)", "number"], ["status", "Status", "status", ["Available", "Unavailable"]]]],
  [/progress|goal|target/, [["title", "Goal", "text"], ["progress", "Progress (%)", "number"], ["dueDate", "Target Date", "date"], ["status", "Status", "status", ["On track", "At risk", "Achieved"]]]],
  [/tag|label|folder|categor/, [["name", "Name", "text"], ["status", "Status", "status", ["Active", "Archived"]]]],
];

const WORD_FIELDS = (label = "", kind = "") => `${label} ${kind}`.toLowerCase();

function isPersonLabel(label = "") {
  return PERSON_LABEL_RE.test(String(label));
}

function inferEntityFields(label = "", domain = "") {
  const words = WORD_FIELDS(label).trim();
  // The head noun (last word) decides what the record is: "Seller Order" is an
  // order, not a person; "Guest Request" is a request, not a guest.
  const head = words.split(/\s+/).pop() || words;
  const copy = (fields) => (typeof fields === "function" ? fields(domain) : fields).map((field) => [...field]);
  for (const [pattern, fields] of PERSON_RULES) if (pattern.test(head)) return copy(fields);
  for (const [pattern, fields] of RECORD_RULES) if (pattern.test(head)) return copy(fields);
  for (const [pattern, fields] of RECORD_RULES) if (pattern.test(words)) return copy(fields);
  return null;
}

module.exports = { inferEntityFields, isPersonLabel, PERSON_LABEL_RE, WORD_FIELDS };
