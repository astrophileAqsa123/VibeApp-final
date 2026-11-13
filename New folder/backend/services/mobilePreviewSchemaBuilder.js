function normalizePrompt(prompt = "") {
  return String(prompt || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectAppType(prompt = "") {
  const text = normalizePrompt(prompt);

  if (text.includes("calculator")) return "calculator";

  if (
    text.includes("notepad") ||
    text.includes("note app") ||
    text.includes("notes app") ||
    text.includes("note manager") ||
    text.includes("notes manager")
  ) {
    return "notepad";
  }

  if (
    text.includes("student") ||
    text.includes("school") ||
    text.includes("course") ||
    text.includes("education") ||
    text.includes("teacher") ||
    text.includes("class")
  ) {
    return "student";
  }

  if (
    text.includes("product") ||
    text.includes("store") ||
    text.includes("shop") ||
    text.includes("inventory") ||
    text.includes("ecommerce") ||
    text.includes("e commerce")
  ) {
    return "product";
  }

  if (
    text.includes("patient") ||
    text.includes("doctor") ||
    text.includes("clinic") ||
    text.includes("hospital") ||
    text.includes("medical")
  ) {
    return "patient";
  }

  if (
    text.includes("task") ||
    text.includes("todo") ||
    text.includes("kanban") ||
    text.includes("project")
  ) {
    return "task";
  }

  if (
    text.includes("employee") ||
    text.includes("staff") ||
    text.includes("hr")
  ) {
    return "employee";
  }

  if (
    text.includes("expense") ||
    text.includes("invoice") ||
    text.includes("payment") ||
    text.includes("budget") ||
    text.includes("finance")
  ) {
    return "expense";
  }

  if (text.includes("book") || text.includes("library")) return "book";

  if (
    text.includes("customer") ||
    text.includes("crm") ||
    text.includes("lead")
  ) {
    return "customer";
  }

  return "generic";
}

function field(name, label, type = "text", required = true, options = []) {
  return {
    name,
    label,
    type,
    required,
    options,
  };
}

function createSchema({
  appType,
  title,
  layout,
  primary,
  background,
  fields,
  data,
}) {
  return {
    appType,
    title,
    layout,
    theme: {
      primary,
      background,
      text: "#0F172A",
    },
    fields,
    data,
  };
}

function getDefaultSchema(appType) {
  const schemas = {
    notepad: createSchema({
      appType: "notepad",
      title: "Notepad",
      layout: "notes",
      primary: "#4F46E5",
      background: "#EEF2FF",
      fields: [
        field("title", "Title", "text", true),
        field("category", "Category", "select", true, [
          "Work",
          "Personal",
          "Study",
          "Ideas",
        ]),
        field("note", "Note", "textarea", true),
        field("status", "Status", "select", true, [
          "Active",
          "Pinned",
          "Archived",
        ]),
      ],
      data: [
        {
          id: "1",
          title: "Meeting Ideas",
          category: "Work",
          note: "Write down the main meeting ideas and next steps.",
          status: "Pinned",
        },
        {
          id: "2",
          title: "Study Plan",
          category: "Study",
          note: "Prepare revision topics and daily study goals.",
          status: "Active",
        },
      ],
    }),

    student: createSchema({
      appType: "student",
      title: "Student Manager",
      layout: "education",
      primary: "#2563EB",
      background: "#EFF6FF",
      fields: [
        field("name", "Student Name", "text", true),
        field("email", "Email", "email", true),
        field("course", "Course", "select", true, [
          "AI",
          "Computer Science",
          "Business",
          "Design",
        ]),
        field("semester", "Semester", "text", true),
        field("status", "Status", "select", true, [
          "Active",
          "Pending",
          "Completed",
        ]),
      ],
      data: [
        {
          id: "1",
          name: "Ayesha Khan",
          email: "ayesha@example.com",
          course: "AI",
          semester: "Semester 2",
          status: "Active",
        },
        {
          id: "2",
          name: "Ali Raza",
          email: "ali@example.com",
          course: "Computer Science",
          semester: "Semester 4",
          status: "Pending",
        },
      ],
    }),

    product: createSchema({
      appType: "product",
      title: "Product Store",
      layout: "ecommerce",
      primary: "#EA580C",
      background: "#FFF7ED",
      fields: [
        field("name", "Product Name", "text", true),
        field("category", "Category", "select", true, [
          "Electronics",
          "Fashion",
          "Home",
          "Accessories",
        ]),
        field("price", "Price", "number", true),
        field("stock", "Stock", "number", true),
        field("status", "Status", "select", true, [
          "Active",
          "Pending",
          "Archived",
        ]),
      ],
      data: [
        {
          id: "1",
          name: "Smart Watch",
          category: "Electronics",
          price: "12000",
          stock: "18",
          status: "Active",
        },
        {
          id: "2",
          name: "Bluetooth Speaker",
          category: "Accessories",
          price: "6500",
          stock: "24",
          status: "Active",
        },
      ],
    }),

    patient: createSchema({
      appType: "patient",
      title: "Clinic Manager",
      layout: "medical",
      primary: "#0F766E",
      background: "#ECFDF5",
      fields: [
        field("name", "Patient Name", "text", true),
        field("phone", "Phone", "phone", true),
        field("age", "Age", "number", true),
        field("doctor", "Doctor", "select", true, [
          "Dr. Ahmed",
          "Dr. Sana",
          "Dr. Bilal",
        ]),
        field("status", "Status", "select", true, [
          "Active",
          "Pending",
          "Completed",
        ]),
      ],
      data: [
        {
          id: "1",
          name: "Sarah Ahmed",
          phone: "03001234567",
          age: "26",
          doctor: "Dr. Ahmed",
          status: "Active",
        },
        {
          id: "2",
          name: "Hamza Noor",
          phone: "03111234567",
          age: "32",
          doctor: "Dr. Sana",
          status: "Pending",
        },
      ],
    }),

    task: createSchema({
      appType: "task",
      title: "Task Board",
      layout: "kanban",
      primary: "#7C3AED",
      background: "#F5F3FF",
      fields: [
        field("title", "Task Title", "text", true),
        field("priority", "Priority", "select", true, [
          "High",
          "Medium",
          "Low",
        ]),
        field("assignee", "Assignee", "text", true),
        field("dueDate", "Due Date", "date", true),
        field("status", "Status", "select", true, [
          "Todo",
          "In Progress",
          "Review",
          "Completed",
        ]),
      ],
      data: [
        {
          id: "1",
          title: "Design Dashboard",
          priority: "High",
          assignee: "Zainab",
          dueDate: "2026-08-10",
          status: "Todo",
        },
        {
          id: "2",
          title: "Fix Login Flow",
          priority: "Medium",
          assignee: "Ali",
          dueDate: "2026-08-12",
          status: "In Progress",
        },
      ],
    }),

    employee: createSchema({
      appType: "employee",
      title: "Employee Manager",
      layout: "business",
      primary: "#0F172A",
      background: "#F8FAFC",
      fields: [
        field("name", "Employee Name", "text", true),
        field("email", "Email", "email", true),
        field("department", "Department", "select", true, [
          "Engineering",
          "Design",
          "Sales",
          "HR",
        ]),
        field("salary", "Salary", "number", true),
        field("status", "Status", "select", true, [
          "Active",
          "Pending",
          "Resigned",
        ]),
      ],
      data: [
        {
          id: "1",
          name: "Usman Malik",
          email: "usman@example.com",
          department: "Engineering",
          salary: "85000",
          status: "Active",
        },
      ],
    }),

    expense: createSchema({
      appType: "expense",
      title: "Expense Tracker",
      layout: "finance",
      primary: "#16A34A",
      background: "#F0FDF4",
      fields: [
        field("title", "Title", "text", true),
        field("category", "Category", "select", true, [
          "Food",
          "Travel",
          "Bills",
          "Shopping",
        ]),
        field("amount", "Amount", "number", true),
        field("date", "Date", "date", true),
        field("status", "Status", "select", true, [
          "Paid",
          "Pending",
          "Cancelled",
        ]),
      ],
      data: [
        {
          id: "1",
          title: "Internet Bill",
          category: "Bills",
          amount: "4500",
          date: "2026-08-04",
          status: "Paid",
        },
      ],
    }),

    book: createSchema({
      appType: "book",
      title: "Library Manager",
      layout: "library",
      primary: "#9333EA",
      background: "#FAF5FF",
      fields: [
        field("title", "Book Title", "text", true),
        field("author", "Author", "text", true),
        field("category", "Category", "select", true, [
          "Programming",
          "Business",
          "Novel",
          "Science",
        ]),
        field("status", "Status", "select", true, [
          "Available",
          "Issued",
          "Reserved",
        ]),
      ],
      data: [
        {
          id: "1",
          title: "Flutter Basics",
          author: "John Smith",
          category: "Programming",
          status: "Available",
        },
      ],
    }),

    customer: createSchema({
      appType: "customer",
      title: "Customer CRM",
      layout: "business",
      primary: "#0891B2",
      background: "#ECFEFF",
      fields: [
        field("name", "Customer Name", "text", true),
        field("email", "Email", "email", true),
        field("phone", "Phone", "phone", true),
        field("stage", "Stage", "select", true, [
          "Lead",
          "Contacted",
          "Converted",
          "Lost",
        ]),
        field("status", "Status", "select", true, [
          "Active",
          "Pending",
          "Closed",
        ]),
      ],
      data: [
        {
          id: "1",
          name: "Bilal Shah",
          email: "bilal@example.com",
          phone: "03001230000",
          stage: "Lead",
          status: "Active",
        },
      ],
    }),
  };

  return (
    schemas[appType] ||
    createSchema({
      appType: "generic",
      title: "CRUD Manager",
      layout: "default",
      primary: "#2563EB",
      background: "#F8FAFC",
      fields: [
        field("name", "Name", "text", true),
        field("category", "Category", "text", false),
        field("status", "Status", "select", true, [
          "Active",
          "Pending",
          "Completed",
        ]),
      ],
      data: [
        {
          id: "1",
          name: "Sample Record",
          category: "General",
          status: "Active",
        },
      ],
    })
  );
}

function normalizeSchema(schema, prompt = "") {
  const appType = schema.appType || detectAppType(prompt);
  const defaultSchema = getDefaultSchema(appType);

  return {
    appType,
    title: schema.title || defaultSchema.title,
    layout: schema.layout || defaultSchema.layout,
    theme: {
      primary: schema.theme?.primary || defaultSchema.theme.primary,
      background: schema.theme?.background || defaultSchema.theme.background,
      text: schema.theme?.text || "#0F172A",
    },
    fields:
      Array.isArray(schema.fields) && schema.fields.length
        ? schema.fields
        : defaultSchema.fields,
    data:
      Array.isArray(schema.data) && schema.data.length
        ? schema.data
        : defaultSchema.data,
  };
}

function buildMobilePreviewSchema({ prompt = "", schema = null }) {
  if (schema && typeof schema === "object") {
    return normalizeSchema(schema, prompt);
  }

  const appType = detectAppType(prompt);
  return getDefaultSchema(appType);
}

module.exports = {
  buildMobilePreviewSchema,
  detectAppType,
};