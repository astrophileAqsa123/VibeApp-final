// Vocabulary used by the sample-data engine. Everything here is plain data so
// it is easy to extend: add a regex -> list entry and every generated app that
// has a matching entity immediately gets realistic records.

const FIRST_NAMES = [
  "Ayesha", "Daniel", "Sara", "Omar", "Emily", "Bilal", "Hira", "Lucas", "Fatima", "Noah",
  "Zainab", "Ethan", "Maryam", "Ali", "Sophia", "Hamza", "Amelia", "Usman", "Nadia", "Ryan",
  "Hassan", "Olivia", "Rayyan", "Isabella", "Danish", "Mia", "Kabir", "Laila", "Tariq", "Grace",
];

const LAST_NAMES = [
  "Khan", "Carter", "Malik", "Ahmed", "Reyes", "Raza", "Siddiqui", "Nguyen", "Sheikh", "Brooks",
  "Qureshi", "Patel", "Hussain", "Morgan", "Iqbal", "Bennett", "Farooq", "Hayes", "Butt", "Foster",
  "Chaudhry", "Kim", "Rizvi", "Walker", "Mirza", "Evans", "Anwar", "Cooper", "Naqvi", "Price",
];

const COMPANIES = [
  "Northwind Traders", "BlueRiver Supplies", "Summit Wholesale", "Crescent Logistics", "Evergreen Foods",
  "Pioneer Hardware", "Lakeside Distributors", "Orbit Electronics", "Harvest & Co", "Atlas Industrial",
];

const CITIES = ["Lahore", "Karachi", "Islamabad", "Dubai", "London", "Toronto", "Austin", "Manchester"];
const STREETS = [
  "12 Garden Road", "48 Park Lane", "7 Canal View", "221 Main Boulevard", "90 Station Street",
  "15 Orchard Avenue", "33 Mall Road", "5 Lakeshore Drive",
];

const PRIORITIES = ["High", "Medium", "Low", "Medium", "High"];
const GENERIC_STATUS = ["Active", "Pending", "Completed", "Active", "On hold"];
const GENDERS = ["Female", "Male", "Female", "Male", "Female"];
const BLOOD_GROUPS = ["O+", "A+", "B+", "AB+", "O-"];
const TIMES = ["08:30 AM", "09:15 AM", "10:30 AM", "01:00 PM", "02:45 PM"];

const CLASS_NAMES = ["Grade 8 - A", "Grade 7 - B", "Grade 9 - A", "Grade 6 - C", "Grade 10 - B"];
const SUBJECTS = ["Mathematics", "English", "Physics", "Chemistry", "Computer Science", "Biology", "History"];
const COURSES = [
  "Introduction to Programming", "Business Communication", "Data Structures", "Graphic Design Basics",
  "Financial Accounting", "Web Development", "Digital Marketing",
];
const ROOMS = ["Room 101", "Room 204", "Lab 2", "Room 110", "Hall B"];
const SPECIALTIES = ["Cardiology", "Pediatrics", "Orthopedics", "Dermatology", "General Medicine"];
const DEPARTMENTS = ["Operations", "Finance", "Engineering", "Customer Success", "Human Resources", "Sales"];
const CATEGORIES_GENERIC = ["General", "Operations", "Customer", "Internal", "Compliance"];

// Primary label for each kind of record (what shows in the list title).
// Matched against `${entity.id} ${entity.name}` (lower-cased).
const TITLES = [
  [/assignment|homework/, ["Algebra worksheet 4", "Photosynthesis lab report", "Essay: My Hero", "Python loops practice", "World War II timeline"]],
  [/timetable|lesson|period/, ["Mathematics - Period 1", "English Literature - Period 2", "Physics Lab - Period 4", "Computer Science - Period 5", "Art - Period 6"]],
  [/exam|test|quiz/, ["Mid-term Mathematics", "Unit test: Cell Biology", "English Grammar Quiz", "Physics Practical", "Final Computer Science"]],
  [/class|section|grade level/, CLASS_NAMES],
  [/course|program(?!me)|curriculum/, COURSES],
  [/subject/, SUBJECTS],
  [/department|ward/, ["Cardiology", "Pediatrics", "Emergency", "Radiology", "Outpatient"]],
  [/appointment|consultation|visit|viewing|booking|reservation|session|meeting|schedule/, ["Initial consultation", "Follow-up meeting", "Site visit", "Review session", "Quick call"]],
  [/audit/, ["Admin signed in", "Role changed for Ali Khan", "Password reset requested", "Export generated", "Settings updated"]],
  [/activity|timeline/, ["Commented on Design review", "Moved API task to Done", "Created milestone Beta", "Assigned Bug 42 to Omar", "Uploaded spec v2"]],
  [/risk|alert|fraud/, ["Unusual overseas login", "Large cash withdrawal", "Multiple failed attempts", "New device detected", "Velocity limit exceeded"]],
  [/application/, ["Personal loan", "Credit card", "Home loan", "Account opening", "Overdraft facility"]],
  [/case/, ["Disputed transaction", "Card replacement", "Suspicious login", "Chargeback request", "Account freeze"]],
  [/knowledge|faq|article|help/, ["How to reset your password", "Updating billing details", "Tracking your order", "Refund policy", "Account security tips"]],
  [/\bsla\b|polic/, ["Premium - 1 hour response", "Standard - 4 hour response", "Basic - 24 hour response", "Critical - 15 min response", "Weekend coverage"]],
  [/team|squad/, ["Design team", "Platform team", "Mobile team", "QA team", "Growth team"]],
  [/address/, ["Home", "Office", "Warehouse", "Parents' house", "Shop"]],
  [/service/, ["Haircut & styling", "Deep tissue massage", "Manicure", "Consultation", "Facial treatment"]],
  [/agenda|keynote|speaker/, ["Opening keynote", "Panel: Future of work", "Workshop: Design systems", "Networking lunch", "Closing remarks"]],
  [/prescription|medicine|medication|drug|pharma/, ["Amoxicillin 500mg", "Paracetamol 650mg", "Metformin 850mg", "Cetirizine 10mg", "Ibuprofen 400mg"]],
  [/medical.?record|clinical|diagnos|lab.?result/, ["Annual health screening", "Blood test results", "Chest X-ray report", "Allergy assessment", "Post-surgery review"]],
  [/billing|invoice|bill|payment|payout|fine|fee/, ["INV-1041", "INV-1042", "INV-1043", "INV-1044", "INV-1045"]],
  [/room|suite/, ["Deluxe King 201", "Standard Twin 105", "Family Suite 310", "Single Room 102", "Executive Suite 401"]],
  [/table/, ["Table 1 (window)", "Table 4 (booth)", "Table 7 (patio)", "Table 2", "Table 9 (family)"]],
  [/menu|dish|food|meal/, ["Grilled chicken wrap", "Margherita pizza", "Beef burger", "Caesar salad", "Mango lassi"]],
  [/order|cart|checkout/, ["Order #3001", "Order #3002", "Order #3003", "Order #3004", "Order #3005"]],
  [/product|catalog|item|goods|merchandise|listing/, ["Wireless mouse", "Notebook A5 (pack of 5)", "USB-C charging cable", "Desk lamp", "Water bottle 750ml"]],
  [/stock|inventory|sku|warehouse item|receiving|picking/, ["A4 copy paper (500 sheets)", "Ballpoint pens (box of 50)", "Printer toner cartridge", "Packing tape rolls", "Cardboard boxes (medium)"]],
  [/book|library|loan|borrow|checkout/, ["The Alchemist", "Atomic Habits", "A Brief History of Time", "Clean Code", "To Kill a Mockingbird"]],
  [/supplier|vendor|seller|distributor/, COMPANIES],
  [/location|warehouse|branch|site|venue|facility/, ["Main Warehouse", "Downtown Branch", "Lakeside Campus", "Riverside Hall", "Airport Depot"]],
  [/shipment|delivery|parcel|package|dispatch|route|stop/, ["Parcel PK-48213", "Parcel PK-48214", "Parcel PK-48215", "Parcel PK-48216", "Parcel PK-48217"]],
  [/lead|prospect|opportunit/, ["Website inquiry - Crescent Mart", "Referral - BlueRiver Co", "Trade show contact", "Demo request - Orbit Tech", "Inbound call - Summit Ltd"]],
  [/deal|pipeline|quote|proposal/, ["Annual software license", "Warehouse automation pilot", "Office renovation", "Training package", "Support contract renewal"]],
  [/task|todo|to-do|\baction|checklist|chore/, ["Prepare weekly report", "Review pending approvals", "Update customer records", "Schedule team sync", "Order office supplies"]],
  [/project|initiative|campaign/, ["Website redesign", "Mobile app launch", "Q4 marketing campaign", "Customer survey", "Office relocation"]],
  [/milestone|goal|objective/, ["Design sign-off", "Beta release", "Customer pilot", "Launch readiness review", "Post-launch retrospective"]],
  [/ticket|issue|incident|complaint|support|bug|defect/, ["Cannot reset password", "Invoice shows wrong amount", "App crashes on login", "Delivery arrived damaged", "Request for refund"]],
  [/request|approval|leave|requisition/, ["Annual leave (3 days)", "Laptop replacement", "Remote work request", "Training budget approval", "Sick leave (1 day)"]],
  [/event|conference|webinar|workshop|ticket sale/, ["Annual Tech Summit", "Product launch night", "Community workshop", "Leadership offsite", "Charity gala dinner"]],
  [/property|listing|apartment|flat|house|unit(?!s)/, ["2-bed apartment, Garden Heights", "Studio near Metro", "Family house, Phase 5", "Office space, Blue Tower", "Penthouse, Lakeview"]],
  [/lease|rent|tenancy/, ["Lease - Apt 4B", "Lease - Studio 12", "Lease - House 7", "Lease - Office 3A", "Lease - Apt 9C"]],
  [/maintenance|repair|work.?order/, ["Leaking kitchen tap", "AC not cooling", "Elevator inspection", "Broken window latch", "Hallway light replacement"]],
  [/payroll|salary|payslip/, ["Payslip - October", "Payslip - September", "Payslip - August", "Bonus - Q3", "Payslip - July"]],
  [/attendance|check.?in/, ["Morning check-in", "Morning check-in", "Morning check-in", "Morning check-in", "Morning check-in"]],
  [/workout|exercise|training plan/, ["Upper body strength", "Morning cardio", "Leg day", "Core and mobility", "HIIT circuit"]],
  [/nutrition|meal plan|diet/, ["High-protein breakfast", "Balanced lunch plate", "Light dinner", "Post-workout shake", "Healthy snack box"]],
  [/membership|plan|subscription|package(?!s)/, ["Basic monthly", "Premium monthly", "Annual family", "Student plan", "Corporate plan"]],
  [/account|wallet|card/, ["Savings ****4821", "Current ****7710", "Credit card ****0932", "Business ****5566", "Wallet ****1204"]],
  [/transaction|transfer|expense|income|spend/, ["Grocery shopping", "Electricity bill", "Salary credit", "Online subscription", "Fuel station"]],
  [/note|memo|journal|idea/, ["Weekly planning", "Meeting notes - product sync", "Grocery list", "Book recommendations", "Project ideas"]],
  [/tag|label|folder/, ["Work", "Personal", "Ideas", "Urgent", "Reading list"]],
  [/archive/, ["Old project plan", "2025 budget draft", "Travel itinerary - Dubai", "Recipe collection", "Retired checklist"]],
  [/announcement|notice|news|message|notification/, ["Holiday schedule update", "New policy reminder", "System maintenance tonight", "Welcome new team members", "Quarterly town hall"]],
  [/report|summary|analytics/, ["Weekly summary", "Monthly performance", "Quarterly review", "Annual overview", "Year-to-date report"]],
  [/kitchen/, ["Order #3001 - 2 items", "Order #3002 - 4 items", "Order #3003 - 1 item", "Order #3004 - 3 items", "Order #3005 - 5 items"]],
  [/proof/, ["Signed by recipient", "Left with reception", "Photo confirmation", "Signed by guard", "Handed to neighbour"]],
  [/refill/, ["Refill - Metformin", "Refill - Atorvastatin", "Refill - Inhaler", "Refill - Levothyroxine", "Refill - Vitamin D"]],
  [/availability|slot|shift/, ["Morning shift", "Afternoon shift", "Evening shift", "Weekend shift", "Night shift"]],
];

// Short sentences that read like real remarks. Specific entities first.
const NOTES = [
  [/attendance|check.?in/, ["Arrived on time.", "Left early with approval.", "Late due to traffic.", "Worked remotely.", "Overtime approved."]],
  [/leave|approval|requisition/, ["Awaiting HR review.", "Approved by line manager.", "Backup coverage arranged.", "Medical certificate attached.", "Needs director sign-off."]],
  [/assignment|homework|exam|test|quiz/, ["Show all working steps.", "Submit before the next class.", "Group work allowed - max 3 students.", "Use the textbook examples as reference.", "Late submissions lose 10%."]],
  [/student|pupil/, ["Participates actively in class.", "Needs extra support in mathematics.", "Excellent attendance this term.", "Interested in the science club.", "Parent meeting scheduled."]],
  [/teacher|instructor/, ["Handles two sections this term.", "Available for parent meetings on Tuesdays.", "Coordinates the science fair.", "Substitute for grade 9 this week.", "Mentors the debate club."]],
  [/patient/, ["Allergic to penicillin.", "Prefers morning appointments.", "Follow-up needed in two weeks.", "Insurance verified.", "Referred by family physician."]],
  [/doctor/, ["Available Monday to Thursday.", "Accepts walk-ins after 2 PM.", "Specialises in preventive care.", "On call this weekend.", "Teaches at the medical college."]],
  [/prescription|medicine|medication|refill/, ["Take after meals.", "Complete the full course.", "Avoid alcohol during treatment.", "Store in a cool, dry place.", "Review dosage after one month."]],
  [/appointment|booking|reservation|visit|viewing|session|meeting/, ["Confirmed by phone.", "Please arrive 10 minutes early.", "Rescheduled once already.", "Bring previous reports.", "Window seat requested."]],
  [/guest|customer|client|member/, ["Prefers email communication.", "Loyal customer since last year.", "Asked about the premium plan.", "Birthday next month.", "Requested a callback."]],
  [/order|shipment|delivery|parcel|package/, ["Handle with care.", "Deliver between 9 AM and 5 PM.", "Customer asked for contactless drop-off.", "Gift wrap requested.", "Fragile items inside."]],
  [/stock|inventory|product|item|supplier|vendor|receiving|picking/, ["Reorder when below minimum level.", "Stored in aisle 3, shelf B.", "Supplier lead time is 5 days.", "Bulk discount available.", "Check expiry date on arrival."]],
  [/ticket|issue|incident|complaint|support|request|approval/, ["Customer notified by email.", "Escalated to the second-level team.", "Waiting for more information.", "Resolved after a quick fix.", "Needs approval from the manager."]],
  [/lead|deal|prospect/, ["Interested in a demo next week.", "Budget approved for this quarter.", "Decision maker is the CTO.", "Follow up after proposal.", "Competitor quote received."]],
  [/task|project|milestone|campaign/, ["Blocked until design is approved.", "Assigned to the core team.", "Review due on Friday.", "Needs client sign-off.", "On track for the deadline."]],
  [/note|memo|journal|idea|archive/, ["Remember to follow up on Friday.", "Draft - needs a final review.", "Shared with the team.", "Check again next week.", "Keep for reference."]],
  [/maintenance|repair/, ["Technician visit booked.", "Parts ordered from supplier.", "Tenant informed about the downtime.", "Recurring problem - inspect fully.", "Completed and tested."]],
  [/payment|billing|invoice|bill|fee|fine|payroll/, ["Paid via bank transfer.", "Reminder sent by email.", "Partial payment received.", "Awaiting confirmation.", "Receipt issued."]],
  [/workout|exercise|nutrition|plan|program|member|trainer/, ["Increase weights gradually.", "Focus on form over speed.", "Drink plenty of water.", "Rest day after this session.", "Progress is on track."]],
];
const NOTES_GENERIC = [
  "Reviewed and up to date.", "Follow up next week.", "Requested by the front desk.", "No issues reported so far.", "Waiting for confirmation.",
];

// Roles that are "people" (names should look like real persons).
const PERSON_ENTITY = /student|pupil|teacher|instructor|doctor|nurse|patient|guest|customer|client|member|employee|staff|user|trainer|coach|driver|rider|agent|librarian|pharmacist|tenant|attendee|organizer|provider|officer|candidate|owner|receptionist|cashier|waiter|chef|people|person|contact|author|borrower|manager|admin|recruit|applicant|worker|technician|landlord|lead|prospect/;
const COMPANY_ENTITY = /supplier|vendor|seller|company|organization|organisation|distributor|manufacturer/;
// Field ids that hold a reference to a person.
const PERSON_FIELD = /^(student|patient|guest|customer|client|member|employee|doctor|teacher|trainer|coach|driver|agent|tenant|owner|author|borrower|assignee|assignedto|attendee|technician|guardian|parent|manager|supervisor|organizer|reportedby|createdby|requester|instructor|provider|librarian|pharmacist|cashier|waiter|contact|contactperson|sender|recipient|user|head|speaker|presenter|host|reviewer|approver|candidate|applicant|employee|requestedby|headofdepartment|departmenthead|incharge|lead)(name)?$/;

module.exports = {
  FIRST_NAMES, LAST_NAMES, COMPANIES, CITIES, STREETS, PRIORITIES, GENERIC_STATUS, GENDERS, BLOOD_GROUPS, TIMES,
  CLASS_NAMES, SUBJECTS, COURSES, ROOMS, SPECIALTIES, DEPARTMENTS, CATEGORIES_GENERIC, TITLES, NOTES, NOTES_GENERIC,
  PERSON_ENTITY, COMPANY_ENTITY, PERSON_FIELD,
};
