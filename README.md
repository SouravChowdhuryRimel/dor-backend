# Price Check BD

> **Enterprise-Grade B2B Price Discovery, Commerce, and Supply Chain Orchestration Engine**  
> Architected for high-concurrency, multi-party commodity trading, driver dispatch, and automated logistics across Bangladesh.

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v15%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-v7.7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-v7%2B-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4.8-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![Firebase FCM](https://img.shields.io/badge/Firebase-FCM-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-Proprietary-blue.svg)](#)

---

## 1. Executive Summary

**Price Check BD** is a high-throughput, mission-critical B2B trading and supply-chain platform designed to modernize wholesale trade in Bangladesh (spanning commodities such as Cement, Steel/Rod, Bricks, Agricultural Produce, and Industrial Goods).

The system addresses fundamental inefficiencies in high-volume trade:
- **Real-Time Price Discovery**: Eliminates price opacity with transparent catalog rates and buyer-specific tiered contracts (`PartyProductRate`).
- **Reverse Auction & RFQ Workflows**: Enables wholesale buyers (`Parties`) to broadcast purchase inquiries and receive competitive bids from verified manufacturers (`Companies`).
- **End-to-End Order & Delivery Fulfillment**: Coordinates orders from placement and manufacturing acceptance to logistics assignment, in-transit telemetry, and delivery confirmation.
- **Logistics & Driver Hiring**: Connects companies with dedicated or on-demand commercial fleet drivers with real-time dispatching.
- **Tri-Party Dispute Resolution**: Provides formal complaint and dispute tracking between buyers, sellers, and transport operators.

---

## 2. Architectural Highlights & Engineering Standards

Built by applying Domain-Driven Design (DDD) principles to a **Modular Monolith** architecture:

```
                                 [ Client Traffic ]
                                         │
                         [ Nginx / Cloudflare Edge (SSL / CDN) ]
                                         │
                         [ Node.js Multi-Worker Cluster ]
                                         │
            ┌────────────────────────────┼────────────────────────────┐
            ▼                            ▼                            ▼
   [ Fastify / Express HTTP ]   [ Socket.io WS Gateway ]    [ Background Jobs / Queue ]
   (REST API / Swagger Docs)    (Redis Pub/Sub Adapter)     (BullMQ / Distributed Redis)
            │                            │                            │
            └────────────────────────────┼────────────────────────────┘
                                         │
                             [ Application Modules ]
                       (19 Cohesive Bounded Contexts)
                                         │
            ┌────────────────────────────┴────────────────────────────┐
            ▼                                                         ▼
  [ Database Layer ]                                         [ Cache & Messaging ]
  - PostgreSQL 15+ (Multi-File Schema)                       - Redis 7+ In-Memory Cache
  - Prisma ORM v7 with @prisma/adapter-pg                    - Socket.io Redis Adapter Cluster
  - Tuned pg.Pool Connection Pooling                         - Redis Distributed Rate-Limiting
  - PgBouncer-Ready Architecture                             - Firebase FCM Multi-Device Push
```

### Key Technical Pillars:
1. **Stateless & Cluster-Ready**:
   - Automatically utilizes all available physical CPU cores in production via Node.js native clustering (`cluster.fork()`).
   - Zero in-process session state; horizontal scaling across Kubernetes Pods or container fleets is seamless.
2. **Distributed Real-Time Messaging (`Socket.io` + Redis Pub/Sub)**:
   - WebSocket connections across multiple instances communicate via `@socket.io/redis-adapter`.
   - Real-time direct chat, order state updates, delivery milestones, and instant notifications propagate without message loss.
3. **Resilient 3-Tier Notification Pipeline**:
   - In-app database persistence via Prisma (`Notification` model).
   - Real-time WebSocket delivery to connected clients via `NotificationGateway`.
   - Native mobile push notifications through Firebase Cloud Messaging (FCM) with silent degradation for devices without push tokens.
4. **Optimized High-Concurrency Database Layer**:
   - Employs `@prisma/adapter-pg` coupled with `pg.Pool` connection pooling (`max: 20`, idle timeouts, auto-reconnect).
   - Query instrumentation actively tracks and logs slow queries (`> 100ms`) in non-production environments.
   - Modular multi-file Prisma schema (`prisma/schema/*.prisma`) keeps domain entities organized and maintainable.
5. **Zero-Trust Security & RBAC Pipeline**:
   - Dual-token JWT rotation (short-lived access tokens + cryptographically revolving refresh tokens).
   - Password hashing via `Argon2id` (resistant to GPU/ASIC attacks).
   - Fine-grained Role-Based Access Control (`SUPER_ADMIN`, category-scoped `ADMIN`, `VENDOR`/`COMPANY`, `PARTY`, `DRIVER`, `USER`).
   - Hardened HTTP headers via `Helmet`, strict input sanitization via `ValidationPipe` (`class-validator`), and Redis-backed rate limiting (`@nestjs/throttler`).
6. **Observability & Unified Contract**:
   - Standardized API envelope transformation (`TransformInterceptor`):
     `{ success, statusCode, message, responseTime, data }`.
   - Structured JSON logging via `nestjs-pino` / `pino-http` for zero-overhead production log ingestion.
   - Comprehensive error translation via `GlobalExceptionFilter`.
   - Live infrastructure health checks (`/api/v1/health`) probing DB and Redis status.

---

## 3. Core Domain Capabilities

| Domain Context | Description | Key Capabilities |
| :--- | :--- | :--- |
| **Auth & Security** | Identity & Access Management | JWT lifecycle, refresh token rotation, Argon2, OTP password reset, session revocation. |
| **Users & Governance** | Platform Admin Governance | Super Admin controls, category-scoped Admin assignments (`AdminCategory`), role elevation. |
| **Company Lifecycle** | Manufacturers & Suppliers | Multi-tenant profiles, KYC verification (`PENDING`, `APPROVED`, `REJECTED`, `BLOCKED`), category tagging. |
| **Party Network** | Wholesalers & Buyers | Buyer onboarding, business verification, credit limits, custom pricing rules. |
| **Product & Catalog** | Product Catalog Management | Multi-unit pricing (Ton, Bag, Piece, Kg), packaging types, categorization, keyword indexing. |
| **Custom Rates** | Negotiated Contract Pricing | `PartyProductRate` engine enabling bespoke contracted rates per buyer-product pairing. |
| **Inquiry & RFQ** | Reverse Auction Inquiries | Buyers broadcast RFQs (`Inquiry`); verified suppliers bid with quotes (`InquiryResponse`). |
| **Offers & Promotions** | Targeted Company Deals | Time-limited promotional discount campaigns targeted at individual parties or categories. |
| **Order Management** | Order Processing Engine | Complete state machine: `PENDING` ➔ `ACCEPTED` ➔ `PROCESSING` ➔ `DISPATCHED` ➔ `DELIVERED` / `CANCELLED`. |
| **Logistics & Delivery** | Fulfillment & Dispatching | Driver assignment, trip management (`PENDING`, `IN_TRANSIT`, `REACHED`, `DELIVERED`), status updates. |
| **Fleet & Drivers** | Logistics Workforce | Driver onboarding, license verification, corporate hiring contracts (`DriverHiring`, `CompanyDriver`). |
| **Dispute Resolution** | Multi-Party Complaint Engine | Structured complaints against Companies or Drivers (`Complaint`), chronological message threads. |
| **Support Desk** | Platform Support Ticketing | Admin-managed customer support ticketing with status tracking (`OPEN`, `RESOLVED`, `CLOSED`). |
| **Real-Time Chat** | Live Communication Gateway | Bidirectional chat rooms (`ChatRoom`, `ChatMessage`) with WebSocket broadcast & Redis clustering. |
| **Notification Engine** | Multi-Channel Alerting | In-app notification center, live WebSocket dispatch, and Firebase Cloud Messaging (FCM) push. |
| **Dashboards & Telemetry**| Real-Time Analytical Intelligence | Distinct analytical views for Super Admin, Category Admin, Company, Party, and Driver with Bengali metadata. |
| **Activity Logging** | Audit Trails & Compliance | Chronological audit logs recording actor, target resource, action type, IP, and timestamp. |

---

## 4. Technology Stack Matrix

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime** | [Node.js](https://nodejs.org/) | `v20.x+ LTS` | High-performance asynchronous event-driven JavaScript runtime |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `v5.7.x` | Strongly-typed enterprise application code |
| **Framework** | [NestJS](https://nestjs.com/) | `v11.x` | Enterprise modular dependency injection framework |
| **HTTP Engine** | Express / Fastify Adapter | `Platform-agnostic` | High-throughput HTTP server with non-blocking I/O |
| **Database ORM** | [Prisma](https://www.prisma.io/) | `v7.7.x` | Type-safe ORM utilizing multi-file schema architecture |
| **DB Driver** | `@prisma/adapter-pg` + `pg` | `v7.8.x / v8.20.x` | Native PostgreSQL connection pool adapter |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | `v15+` | ACID-compliant relational data store with optimized indexing |
| **Cache & Pub/Sub** | [Redis](https://redis.io/) / `ioredis` | `v7+ / v5.10.x` | In-memory distributed caching, rate limiting, and cluster Pub/Sub |
| **WebSockets** | [Socket.io](https://socket.io/) | `v4.8.x` | Real-time bidirectional event transport with Redis adapter |
| **Push Engine** | [Firebase Admin SDK](https://firebase.google.com/) | `v14.3.x` | Multi-platform mobile push notification delivery (FCM) |
| **Password Hashing**| [Argon2](https://github.com/ranisalt/node-argon2) | `v0.44.x` | Memory-hard cryptographic hashing (Argon2id) |
| **API Spec** | [Swagger / OpenAPI 3.0](https://swagger.io/) | `v11.4.x` | Automated interactive API contract and documentation |
| **Logging** | [Pino](https://getpino.io/) (`nestjs-pino`) | `v10.3.x / v4.6.x` | Low-overhead structured JSON logger |
| **Testing** | [Jest](https://jestjs.io/) | `v30.x` | Unit, integration, and E2E automated test runner |

---

## 5. Directory & Architecture Map

```
dor-backend/
├── prisma/
│   ├── schema/                     # Modular multi-file Prisma schemas
│   │   ├── schema.prisma           # Datasource and generator configuration
│   │   ├── enum.prisma             # System-wide domain enumerations
│   │   ├── user.prisma             # Super Admin and Admin credentials & roles
│   │   ├── admin-category.prisma   # Category-scoped admin access boundaries
│   │   ├── company.prisma          # Manufacturers, documents, status, KYC
│   │   ├── party.prisma            # Wholesalers, buyers, credit & location
│   │   ├── party-product-rate.prisma # Custom buyer negotiated pricing
│   │   ├── driver.prisma           # Logistics drivers, licenses, fleet mapping
│   │   ├── driver-hiring.prisma    # Company-to-driver hiring contracts
│   │   ├── category.prisma         # Product categories
│   │   ├── sub_category.prisma     # Sub-category definitions
│   │   ├── product.prisma          # Catalog products, pricing, units
│   │   ├── inquiry.prisma          # RFQ / Reverse auction inquiries & bids
│   │   ├── offer.prisma            # Targeted promotional offers
│   │   ├── order.prisma            # Order pipeline, bag counts, financial totals
│   │   ├── delivery.prisma         # Delivery trips, status tracking, OTP
│   │   ├── complaint.prisma        # Dispute tickets and message logs
│   │   ├── support-ticket.prisma   # Platform customer support tickets
│   │   ├── chat.prisma             # Socket.io chat rooms and messages
│   │   ├── notification.prisma     # Notification persistence
│   │   ├── activity-log.prisma     # Audit trail records
│   │   └── keyword.prisma          # Search & discovery keywords
│   └── seed.js                     # High-volume deterministic database seeder
├── src/
│   ├── common/                     # Cross-cutting concerns & infrastructural adapters
│   │   ├── adapters/               # Redis WebSocket adapter (Socket.io clustering)
│   │   ├── decorators/             # Custom parameter decorators (@ReqUser, etc.)
│   │   ├── guards/                 # Authentication & RBAC role guards
│   │   └── interceptors/           # Standard TransformInterceptor response envelope
│   ├── core/                       # Core bootstrap, system modules & config
│   │   ├── cache/                  # Redis connection provider & caching service
│   │   ├── config/                 # Environment validation via class-validator
│   │   ├── database/               # PrismaService with tuned pg.Pool adapter
│   │   ├── exception/              # GlobalExceptionFilter error translation
│   │   ├── health/                 # Infrastructure health check controller
│   │   ├── logger/                 # Pino logger configuration
│   │   └── security/               # Rate-limiting (Throttler) configuration
│   ├── modules/                    # Domain-Driven Bounded Contexts (19 modules)
│   │   ├── auth/                   # Authentication & token rotation
│   │   ├── users/                  # User accounts & admin category delegation
│   │   ├── company/                # Company management & verification
│   │   ├── party/                  # Buyer management & verification
│   │   ├── driver/                 # Driver lifecycle & dispatching
│   │   ├── category/               # Product category trees
│   │   ├── sub-category/           # Sub-category management
│   │   ├── product/                # Product catalog & pricing
│   │   ├── inquiry/                # RFQ / Inquiries & bidding engine
│   │   ├── offer/                  # Promotional deals & campaigns
│   │   ├── order/                  # Order placement & fulfillment state machine
│   │   ├── delivery/               # Delivery tracking & logistics execution
│   │   ├── complaint/              # Tri-party dispute resolution
│   │   ├── support/                # Customer service ticketing
│   │   ├── chat/                   # WebSocket chat gateway & history
│   │   ├── notification/           # Multi-channel notification dispatch
│   │   ├── dashboard/              # Role-specific analytics & telemetry
│   │   ├── activity-log/           # Audit trail logging
│   │   └── keyword/                # Global keyword discovery indexing
│   ├── app.module.ts               # Root application dependency injection graph
│   └── main.ts                     # Bootstrap entry point (Clustering, Helmet, CORS, Swagger)
├── test/                           # End-to-end (E2E) integration test suites
├── .env.example                    # Exhaustive environment variable template
├── nest-cli.json                   # NestJS build toolchain configuration
├── package.json                    # Project dependencies and script definitions
└── tsconfig.json                   # Strict TypeScript compiler options
```

---

## 6. Environment Configuration

Copy `.env.example` to `.env` and configure the environment-specific values:

```bash
cp .env.example .env
```

### Critical Environment Variables:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `Enum` | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | `Number` | `3000` | Application HTTP listening port |
| `DATABASE_URL` | `URI` | - | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `DB_POOL_MAX` | `Number` | `20` | Maximum connection pool size per application worker |
| `REDIS_HOST` | `String` | `localhost` | Redis server hostname |
| `REDIS_PORT` | `Number` | `6379` | Redis server port |
| `JWT_SECRET` | `String` | - | Cryptographic secret for signing access tokens |
| `JWT_EXPIRATION` | `String` | `1h` | Short-lived access token lifespan |
| `JWT_REFRESH_SECRET`| `String` | - | Cryptographic secret for signing refresh tokens |
| `JWT_REFRESH_EXPIRATION` | `String` | `7d` | Refresh token retention window |
| `FIREBASE_PROJECT_ID` | `String` | - | Firebase Admin Project ID for FCM push |
| `FIREBASE_CLIENT_EMAIL`| `String` | - | Firebase service account client email |
| `FIREBASE_PRIVATE_KEY` | `String` | - | Firebase service account RSA private key |
| `SMTP_HOST` | `String` | - | SMTP mail server host for email notifications / OTP |
| `SMTP_PORT` | `Number` | `587` | SMTP mail server port |
| `SMTP_USER` | `String` | - | SMTP authentication username |
| `SMTP_PASSWORD` | `String` | - | SMTP authentication password |
| `CORS_ORIGIN` | `String` | `*` | Allowed CORS origins (comma-separated or wildcard) |

---

## 7. Getting Started & Local Development

### Prerequisites
- **Node.js**: `v20.x` or higher (Active LTS recommended)
- **PostgreSQL**: `v15.x` or higher
- **Redis**: `v7.x` or higher
- **Package Manager**: `npm` (v10+)

### Setup Workflow

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/SouravChowdhuryRimel/dor-backend.git
   cd dor-backend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Ensure `.env` contains valid database credentials and a running Redis instance.

4. **Generate Prisma Client & Sync Database**:
   ```bash
   # Generate Prisma Client from multi-file schema
   npx prisma generate

   # Apply migrations or push schema changes (development)
   npx prisma db push
   ```

5. **Seed Deterministic Test Data**:
   Populates initial categories, keywords, admin accounts, sample companies, parties, and drivers:
   ```bash
   node prisma/seed.js
   ```

6. **Start Application**:
   ```bash
   # Development mode with hot-reload
   npm run start:dev

   # Production mode (with multi-core clustering enabled)
   npm run build
   npm run start:prod
   ```

7. **Verify Health**:
   ```bash
   curl http://localhost:3000/api/v1/health
   # Expected: {"status":"ok","timestamp":"...","services":{"database":"up","redis":"up"}}
   ```

8. **Access Interactive API Docs (Swagger)**:
   Open [http://localhost:3000/docs](http://localhost:3000/docs) in your browser.

---

## 8. API Design Standards & Contracts

### Uniform Success Response Envelope
All controller endpoints automatically serialize through the global `TransformInterceptor`:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dashboard retrieved successfully",
  "responseTime": "32ms",
  "data": {
    "todaySummary": {
      "totalCompanies": 12,
      "totalOrders": 28,
      "totalInquiries": 9,
      "totalOrderValue": 845000
    }
  }
}
```

### Standardized Error Envelope
Handled gracefully by `GlobalExceptionFilter`:

```json
{
  "success": false,
  "statusCode": 404,
  "timestamp": "2026-09-12T01:30:00.000Z",
  "path": "/api/v1/company/non-existent-id",
  "error": "Not Found",
  "message": "Company with ID \"non-existent-id\" not found"
}
```

---

## 9. Testing & Quality Assurance

The codebase adheres to rigorous automated testing standards:

```bash
# Execute unit test suites
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage reports
npm run test:cov

# Run end-to-end integration tests
npm run test:e2e

# Run linter and auto-fix formatting issues
npm run lint
npm run format
```

---

## 10. Production Deployment & Scaling Runbook (10M+ Users)

To operate at enterprise scale handling millions of monthly active users and high-volume transactions:

1. **Horizontal Scaling & Stateless Clustering**:
   - In single-server/bare-metal setups, `main.ts` will automatically spawn worker processes across all physical CPU cores using Node's `cluster` module.
   - For Kubernetes (EKS/GKE), set `NODE_ENV=production` and deploy with Horizontal Pod Autoscaling (HPA) targeting 70% CPU/Memory utilization.
2. **Database Connection Pooling with PgBouncer**:
   - In multi-pod deployments, place **PgBouncer** in transaction pooling mode between NestJS pods and PostgreSQL to prevent connection starvation.
   - Keep each worker's `DB_POOL_MAX` around 10-20 connections.
3. **Redis Caching & Read Replicas**:
   - Direct frequent, read-heavy queries (product lists, category metadata, top keywords) through Redis cache layers.
   - Deploy PostgreSQL read replicas for intensive analytical queries such as end-of-month dashboard rollups.
4. **WebSocket Clustered Distribution**:
   - Utilize Redis Sentinel or Redis Cluster for the `@socket.io/redis-adapter` to ensure high availability of live chat and telemetry.
5. **Observability**:
   - Pipe structured JSON logs generated by `nestjs-pino` directly to your observability aggregator (Datadog, Grafana Loki, or ELK Stack).
   - Use Kubernetes liveness and readiness probes pointing to `/api/v1/health`.

---

## 11. Security & Compliance

- **Authentication**: JWT with Argon2id password hashing and revolving refresh token mechanics.
- **Access Control**: Strict RBAC enforced at the router guard level (`RolesGuard`).
- **Data Protection**: Strict SQL injection prevention via Prisma parameterization; CORS origin restriction; Helmet CSP security headers.
- **Audit Trails**: Non-repudiation guaranteed via the `activity-log` module recording every sensitive update across actors.

---

## 12. Documentation & Guides

Comprehensive architecture specifications, mobile integration guides (Flutter), and DevOps runbooks are available in the [`docs/`](./docs) directory:

- [**Business Logic Specification**](./docs/Price_Check_BD_Final_Business_Logic.md): Master functional source of truth.
- [**CI/CD & Deployment Runbook**](./docs/CI_CD_GUIDE.md): Automated GitHub Actions pipeline and VPS deployment.
- [**Inquiry & RFQ Flow**](./docs/INQUIRY_FLOW.md): Reverse-auction workflows and quote negotiation mechanics.
- [**Inquiry Flutter Integration Guide**](./docs/INQUIRY_FLUTTER_GUIDE.md): Mobile integration for customer inquiries and vendor quotes.
- [**Order & Delivery Flow**](./docs/ORDER_AND_DELIVERY_FLOW.md): End-to-end order fulfillment and delivery lifecycle.
- [**Order & Driver Assignment Guide**](./docs/ORDER_DRIVER_ASSIGNMENT_FLUTTER_GUIDE.md): Mobile driver dispatching and delivery milestones.
- [**Flutter Chat Integration**](./docs/FLUTTER_CHAT_INTEGRATION.md): Real-time chat, live tracking, and unread count badges.
- [**Flutter Chat Socket & REST Guide**](./docs/FLUTTER_CHAT_INTEGRATION_GUIDE.md): Deep-dive Socket.io event handling and REST integration.
- [**Flutter Notification Integration**](./docs/FLUTTER_NOTIFICATION_INTEGRATION_GUIDE.md): Push notifications, FCM tokens, and unread counters.
- [**Seller Keywords & Inquiry Routing**](./docs/SELLER_KEYWORDS_AND_INQUIRY_FLUTTER_GUIDE.md): Vendor keyword indexing and inquiry targeting.

For more details, visit the [Documentation Directory](./docs/README.md).

---

## 13. Authors & Maintenance

- **Platform Architecture**: Price Check BD Core Engineering Team
- **Repository**: [SouravChowdhuryRimel/dor-backend](https://github.com/SouravChowdhuryRimel/dor-backend)
- **License**: Proprietary — All rights reserved.
