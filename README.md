# 🎉 Saha Events — Event Venue Booking Platform

> End-of-Module Project — "Build & Ship" | Cloud Architecture & Vibe Programming

---

## 👥 Team (Group of 4)

| Full Name | Role |
|---|---|
| Gaid Mohamed Amine | Frontend / UI |
| Brik Mohamed EL Amine | Backend / Supabase |
| Chabane Sofiane | Admin Panel / Auth |
| Boulekeouas Chaima & Gaid Mohamed Amine | Deployment / DevOps |

---

## 🎯 Theme: Events — "Saha-Event"

**Saha Events** is a business extranet that allows clients to search, browse, and book event venues across Algeria. Upon booking, clients upload a CCP payment receipt as proof of transaction. An admin panel allows staff to approve or reject bookings in real time.

### Table Mapping

| Element | Maps To | Description |
|---|---|---|
| **Table A — Users** | `profiles` + Supabase Auth | Clients who register and book venues |
| **Table B — Resources** | `venues` | Available event halls (name, price, location, photo) |
| **Table C — Interactions** | `bookings` | Reservations linking a client to a venue, with a date and status (pending / confirmed / cancelled) |
| **File (Storage)** | `payment receipt` bucket | The CCP payment receipt uploaded by the client at booking time |

### Table Relationships

```
profiles (A)  ──< bookings (C) >──  venues (B)
                      │
                      └── payment_receipt_url → Supabase Storage
```

---

## 🔗 Links

| | Link |
|---|---|
| 🌐 Live Application | `https://saha-events.vercel.app`  |
| 💻 GitHub Repository | `https://github.com/mbrik/saha_event.git`  |

### 🔑 Test Credentials

| Field | Value |
|---|---|
| Email | `jhondoe7123@gmail.com`  |
| Password | `12345678` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + React |
| Database / Auth / Storage | Supabase (PostgreSQL Cloud) |
| Hosting / CI/CD | Vercel |
| Styling | Custom CSS-in-JS with glassmorphism design system |
| Languages Supported | English, French, Arabic (with RTL support) |

---

## 🔐 Data Security — Row Level Security (RLS)

RLS is enabled on the `bookings` table in Supabase. Each client can only view, create, or modify their own bookings. No user can access another user's reservation data, even by querying the API directly.

Policies configured in Supabase:

```sql
-- A user can only view their own bookings
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
USING (auth.uid() = user_id);

-- A user can only create a booking under their own identity
CREATE POLICY "Users can insert own bookings"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- A user can only update their own bookings
CREATE POLICY "Users can update own bookings"
ON bookings FOR UPDATE
USING (auth.uid() = user_id);
```

---

## 📊 Complete User Flow

```
Register / Login
      ↓
Browse available venues (Table B — venues)
      ↓
Open a venue → Pick a date + Upload CCP payment receipt
      ↓
Booking created (Table C — bookings) with status "pending"
      ↓
Admin reviews and approves or rejects the booking
      ↓
Client receives a real-time in-app notification
      ↓
Personal dashboard — view bookings, statuses, and receipts
```

---

## 🏗️ Architecture Analysis — Vercel + Supabase

### 1. Why is Vercel + Supabase financially smarter than a traditional server? (CAPEX vs OPEX)

Setting up this project on a traditional physical infrastructure would require significant **CAPEX** (Capital Expenditures): purchasing servers, network switches, software licenses, UPS units, and setting up a secured server room. These costs accumulate before a single line of code is written and remain **fixed regardless of usage** — if the application has zero users in its first month, the investment is already spent.

With Vercel and Supabase, the model shifts entirely to **OPEX** (Operating Expenditures): we pay only for what we consume, on demand, with no upfront hardware commitment. Both platforms offer free tiers that comfortably cover a project at launch or MVP stage. If traffic grows, scaling is handled automatically with no new capital investment. This approach minimizes financial risk, preserves cash flow, and keeps costs strictly proportional to real usage — which is exactly the right model for a project in its early stages.

### 2. How does Vercel handle scalability compared to a physical local data center?

A physical local data center comes with hard constraints: industrial cooling systems, server racks, redundant power supplies, limited bandwidth tied to an ISP contract, and a team required to maintain everything around the clock. Scalability in this model is **vertical and planned** — you order a new server, wait for delivery, rack it, configure it. If an unexpected traffic spike hits (for example, a surge in venue bookings on a popular wedding weekend), the system can simply saturate and go down.

Vercel is built on a **Serverless and Edge Computing** architecture. The Next.js application is deployed as stateless functions, automatically replicated across dozens of Points of Presence (PoPs) worldwide. Scalability is **horizontal and automatic** — if 1,000 users visit the platform simultaneously, Vercel spins up 1,000 parallel function instances with no manual intervention. There are no servers to cool, no racks to fill, no capacity to pre-provision. The infrastructure is elastic by design, and the developer never has to think about it.

### 3. What represents structured and non-structured data in Saha Events?

Both types of data coexist in this application and are handled by different services.

**Structured data** is everything stored in PostgreSQL via Supabase. The `profiles`, `venues`, `bookings`, and `notifications` tables contain data with a fixed schema — typed columns, primary keys, foreign keys, and constraints. This data is easily queried with SQL filters (`WHERE user_id = ...`, `WHERE status = 'pending'`), aggregated, and joined across tables. Concrete examples include: a venue's daily price (`price_per_day INTEGER`), a booking's status (`status TEXT`), and an event date (`date DATE`).

**Non-structured data** refers to the files uploaded by clients — the CCP payment receipts (JPG, PNG, or PDF). These files have no schema: their content varies, their size is unpredictable, and they cannot be filtered with SQL. They are stored in **Supabase Storage** (an object storage service similar to AWS S3) and referenced in the `bookings` table only by their file path (`payment_receipt_url TEXT`). This separation between the structured reference and the unstructured file itself is a standard cloud architecture pattern, keeping relational queries fast while offloading binary data to a purpose-built storage layer.

---

## 📁 Project Structure

```
saha-events/
├── app/
│   ├── page.js                  # Home page
│   ├── venues/
│   │   ├── page.js              # Venue carousel & browsing
│   │   └── [id]/page.js         # Individual venue detail page
│   ├── bookings/page.js         # Bookings dashboard
│   ├── profile/page.js          # User profile & settings
│   ├── login/page.js            # Login page
│   ├── signup/page.js           # Registration page
│   └── admin/page.js            # Admin panel (approve/reject bookings)
├── components/
│   ├── NavBar.js                # Main navigation bar
│   ├── VenueModal.js            # Booking modal with date picker & file upload
│   ├── ThemeContext.js          # Theme system + i18n (EN / FR / AR)
│   ├── GlobalBackground.js      # Animated global background
│   └── Icons.js                 # SVG icon components
├── lib/
│   └── supabase.js              # Supabase client configuration
└── README.md
```

---

## ✨ Key Features

- **Multilingual** — Full English, French, and Arabic support with RTL layout
- **Dark / Light mode** — Persistent theme preference
- **Real-time notifications** — Booking status updates pushed instantly via Supabase Realtime
- **Admin panel** — Venue management, booking approval/rejection, user overview, activity feed
- **Secure file upload** — CCP receipts stored in Supabase Storage, accessible only via signed references
- **Responsive design** — Glassmorphism UI optimized for desktop and mobile

---

*© 2026 Saha Events — Academic Project*
