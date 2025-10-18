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
