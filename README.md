This Node Js Backend Following Folder Structure Below

event-management-api/
├─ src/
│  ├─ common/                 # Shared utilities, helpers, middleware
│  │  ├─ decorators/          # Optional: custom request decorators
│  │  ├─ filters/             # Error handlers
│  │  ├─ interceptors/        # Logging, response formatting
│  │  └─ utils/
│  │      └─ generateApiKey.js
│  │
│  ├─ config/                 # Config files
│  │  ├─ database.js          # MySQL connection setup
│  │  ├─ app.js               # App configs (port, env, CORS)
│  │  └─ stripe.js            # Stripe/subscription config
│  │
│  ├─ modules/                # Feature modules organized by API version
│  │  ├─ v1/
│  │  │  ├─ auth/
│  │  │  │  ├─ auth.controller.js
│  │  │  │  ├─ auth.service.js
│  │  │  │  └─ auth.routes.js
│  │  │  │
│  │  │  ├─ events/
│  │  │  │  ├─ events.controller.js
│  │  │  │  ├─ events.service.js
│  │  │  │  └─ events.routes.js
│  │  │  │
│  │  │  ├─ tickets/
│  │  │  │  ├─ tickets.controller.js
│  │  │  │  ├─ tickets.service.js
│  │  │  │  └─ tickets.routes.js
│  │  │  │
│  │  │  ├─ addons/
│  │  │  │  ├─ addons.controller.js
│  │  │  │  ├─ addons.service.js
│  │  │  │  └─ addons.routes.js
│  │  │  │
│  │  │  ├─ subscriptions/
│  │  │  │  ├─ subscriptions.controller.js
│  │  │  │  ├─ subscriptions.service.js
│  │  │  │  └─ subscriptions.routes.js
│  │  │  │
│  │  │  └─ apiKeys/
│  │  │      ├─ apiKeys.controller.js
│  │  │      ├─ apiKeys.service.js
│  │  │      └─ apiKeys.routes.js
│  │  │
│  │  └─ v2/                  # Optional API v2
│  │      └─ ...same structure as v1...
│  │
│  ├─ models/                 # Sequelize / MySQL models
│  │  ├─ user.model.js
│  │  ├─ event.model.js
│  │  ├─ ticket.model.js
│  │  ├─ addon.model.js
│  │  ├─ subscription.model.js
│  │  └─ apiKey.model.js
│  │
│  ├─ middlewares/            # Middleware for auth, API key, rate limiting
│  │  ├─ auth.middleware.js
│  │  ├─ apiKey.middleware.js
│  │  └─ rateLimit.middleware.js
│  │
│  ├─ jobs/                   # Queue jobs (emails, ticket generation)
│  │  └─ ticketJob.js
│  │
│  ├─ docs/                   # Swagger / OpenAPI docs
│  │  └─ swagger.js
│  │
│  └─ server.js               # Main entry point
│
├─ uploads/                   # Files uploaded/generated
│  ├─ events/                 # Event banners/images
│  ├─ tickets/                # Ticket PDFs / QR codes
│  ├─ addons/                 # Addon files
│  └─ temp/                   # Temporary files
│
├─ package.json
├─ .env
└─ README.md




Perfect 👍 You want a **realistic example** showing both **single-day** and **multi-day** event structures — including **slots**, **ticket types**, and **slot-based ticket pricing**.
Here’s a clean and clear example 👇

---

## 🎟️ **Example 1: Single-Day Event**

**Event:**

```
Tech Meetup 2025  
Date: 2025-11-17  
Location: San Francisco  
Entry Type: single_day
```

### 🕒 Slots (Single-Day)

| Slot ID | Description      | Start (UTC)         | End (UTC)           |
| ------- | ---------------- | ------------------- | ------------------- |
| 1       | Opening Session  | 2025-11-17 09:00:00 | 2025-11-17 10:30:00 |
| 2       | Networking Break | 2025-11-17 10:30:00 | 2025-11-17 11:00:00 |
| 3       | Keynote Session  | 2025-11-17 11:00:00 | 2025-11-17 13:00:00 |

### 🎫 Ticket Types

| Ticket ID | Title             | Type       | Entry Type | Base Price | Count | Hidden |
| --------- | ----------------- | ---------- | ---------- | ---------- | ----- | ------ |
| 10        | General Admission | open_sales | single     | 100        | 100   | N      |
| 11        | Student Pass      | comps      | single     | 0          | 50    | N      |

### 💰 Ticket Pricing (Per Slot)

| Ticket Type       | Slot            | Price |
| ----------------- | --------------- | ----- |
| General Admission | Opening Session | 80    |
| General Admission | Keynote Session | 120   |
| Student Pass      | Opening Session | 0     |

---

## 🎟️ **Example 2: Multi-Day Event**

**Event:**

```
Music Festival 2025  
Dates: 2025-12-05 → 2025-12-07  
Location: Los Angeles  
Entry Type: multi_day
```

### 🕒 Slots (Per Day)

| Slot ID | Description          | Date       | Start (UTC)         | End (UTC)           |
| ------- | -------------------- | ---------- | ------------------- | ------------------- |
| 20      | Day 1 - Opening Show | 2025-12-05 | 2025-12-05 15:00:00 | 2025-12-05 18:00:00 |
| 21      | Day 2 - Live Concert | 2025-12-06 | 2025-12-06 17:00:00 | 2025-12-06 22:00:00 |
| 22      | Day 3 - Closing Show | 2025-12-07 | 2025-12-07 16:00:00 | 2025-12-07 20:00:00 |

### 🎫 Ticket Types

| Ticket ID | Title              | Type       | Entry Type | Base Price | Count | Hidden |
| --------- | ------------------ | ---------- | ---------- | ---------- | ----- | ------ |
| 30        | 3-Day VIP Pass     | open_sales | multi      | 300        | 50    | N      |
| 31        | Day Pass           | open_sales | slot       | 120        | 200   | N      |
| 32        | Complimentary Pass | comps      | multi      | 0          | 20    | Y      |

### 💰 Ticket Pricing (Per Slot)

| Ticket Type        | Slot (Event Day)     | Price |
| ------------------ | -------------------- | ----- |
| 3-Day VIP Pass     | Day 1 - Opening Show | 300   |
| 3-Day VIP Pass     | Day 2 - Live Concert | 300   |
| 3-Day VIP Pass     | Day 3 - Closing Show | 300   |
| Day Pass           | Day 1 - Opening Show | 100   |
| Day Pass           | Day 2 - Live Concert | 120   |
| Day Pass           | Day 3 - Closing Show | 150   |
| Complimentary Pass | Any Slot             | 0     |

---

### 💡 Summary of How It Works

* **Single-Day Event** → One day, multiple sessions (slots).
* **Multi-Day Event** → Several days, each with its own slots.
* **Ticket Types** → Define general access, free passes, VIPs, etc.
* **Slot-based Pricing** → Adjusts ticket prices per slot/day for flexibility.

---

Would you like me to show how this same data structure would look in **JSON format (for API response)** too? It’ll help visualize your backend response better.

# ENV variables

PORT=5000
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=saas_eboxticket_backend
JWT_SECRET=e3ff5f077839c1331b1d893a728246685cb7dba9e3a77bffe7d52eaccf660988 
JWT_EXPIRES_IN=7d # JWT expiration time
TOKEN_EXPIRES_IN=1h # Token expiration time for email verification and password reset

# Email configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=

# Base URL for verification
CLIENT_URL=http://localhost:5000