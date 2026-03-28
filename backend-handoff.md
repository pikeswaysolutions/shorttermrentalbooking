# Backend Handoff Documentation

## 1. Application Overview

### Purpose
This is a **Venue Booking Management System** that allows customers to request event bookings and administrators to manage those requests, configure event types, pricing rules, add-ons, and availability.

### Core Features
- **Customer Booking Flow**: Multi-step wizard for submitting venue rental requests with deep linking support
- **Interactive Calendar Widget**: Public-facing calendar for date selection and availability viewing
- **Admin Dashboard**: Overview of pending requests, upcoming events, and revenue metrics
- **Calendar Management**: Visual calendar with booking conflicts, time blocking, and cooldown periods
- **Event Type Configuration**: Define rental packages with pricing, duration rules, and custom confirmation pages
- **Add-ons Management**: Optional services that can be attached to event types
- **Dynamic Pricing Rules**: Time-based and day-based pricing adjustments
- **Rental Policies**: Configurable terms displayed to customers
- **Email Template Integration**: Resend email template configuration per event type with automated follow-up scheduling
- **API Key Management**: Secure storage of Resend API key for email automation
- **Logo Management**: Upload and display custom company logo
- **Embeddable Widgets**: Standalone calendar and booking flow for external websites
- **Deep Linking**: Direct URLs to specific event types and pre-selected dates

---

## 2. Route Map

### Public Routes (No Authentication Required)

| Route | Purpose | Data Requirements | Query Parameters |
|-------|---------|-------------------|------------------|
| `/` | Landing page / Home | Display active event types, venue information, logo | None |
| `/booking` | Customer booking wizard | Fetch active event types, add-ons, pricing rules, blocked dates | `?eventType=ID` (optional)<br>`?date=YYYY-MM-DD` (optional) |
| `/calendar` | Interactive calendar widget | Fetch bookings for date range, event types, blocked dates | None |

**Deep Linking Support:**
- `/booking?eventType=abc123` - Pre-selects event type, skips to step 2
- `/booking?date=2024-12-25` - Pre-selects date
- `/booking?eventType=abc123&date=2024-12-25` - Pre-selects both

### Admin Routes (Authentication Required)

| Route | Purpose | Data Requirements |
|-------|---------|-------------------|
| `/admin` | Admin dashboard redirect | Redirect to `/admin/dashboard` |
| `/admin/dashboard` | Admin dashboard | Fetch booking statistics, pending requests count, revenue data |
| `/admin/calendar` | Calendar view with bookings | Fetch all bookings, blocked dates by date range |
| `/admin/bookings` | List all booking requests | Fetch all bookings with filtering (pending, confirmed, declined) |
| `/admin/event-types` | Manage event types | CRUD operations on event types |
| `/admin/addons` | Manage add-ons | CRUD operations on add-ons |
| `/admin/pricing-rules` | Manage pricing rules | CRUD operations on pricing rules |
| `/admin/settings` | Global settings | Read/update rental policies, API keys, logo, and venue information |

### Embeds (No Authentication Required)

| Embed | Purpose | Data Requirements |
|-------|---------|-------------------|
| `embed-calendar.html` | Standalone calendar widget | Fetch bookings for display only |
| `embed-full-booking.html` | Full booking flow widget | Same as `/booking` route |

---

## 3. Data Models

### Booking

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique identifier | Auto-generated |
| `eventType` | object/reference | Yes | Reference to EventType | Must exist in system |
| `date` | string (YYYY-MM-DD) | Yes | Event date | ISO date format |
| `startTime` | string (HH:mm) | Yes | Event start time | 24-hour format (e.g., "14:30") |
| `endTime` | string (HH:mm) | Yes | Event end time | Must be after startTime |
| `contactName` | string | Yes | Customer full name | Min 1 char |
| `contactEmail` | string | Yes | Customer email | Valid email format |
| `contactPhone` | string | Yes | Customer phone | Min 1 char |
| `guestCount` | number | Yes | Number of attendees | Min 1 |
| `descriptionOfUse` | string | Yes | Event description | Min 1 char |
| `notes` | string | No | Additional notes | Optional |
| `selectedAddOns` | array of strings | No | Array of add-on IDs | Each ID must exist |
| `totalPrice` | number | Yes | Calculated total price | Min 0 |
| `status` | string | Yes | Booking status | Enum: "pending", "confirmed", "declined", "cancelled" |
| `agreedToPolicies` | boolean | Yes | Policy agreement flag | Must be true |
| `policiesViewedAt` | string (ISO DateTime) | Yes | When policies were viewed | ISO 8601 format |
| `createdAt` | string (ISO DateTime) | Yes | Creation timestamp | Auto-generated |
| `startDate` | string (ISO DateTime) | Yes | Full start datetime | ISO 8601 format |
| `endDate` | string (ISO DateTime) | Yes | Full end datetime | ISO 8601 format |

**Relationships:**
- Belongs to one `EventType`
- Has many `AddOn` (via selectedAddOns array)

---

### EventType

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique identifier | Auto-generated |
| `name` | string | Yes | Display name | Min 1 char |
| `description` | string | Yes | Description text | Min 1 char |
| `baseRate` | number | Yes | Hourly rate in dollars | Min 0 |
| `minDuration` | number | Yes | Minimum hours required | Min 1 |
| `cooldownHours` | number | Yes | Hours needed between events | Min 0 |
| `active` | boolean | Yes | Visibility to customers | Default true |
| `color` | string | Yes | Hex color code | Hex format (e.g., "#3B82F6") |
| `emailTemplates` | object | No | Email template configuration | See EmailTemplates schema |
| `confirmationPage` | object | No | Confirmation page settings | See ConfirmationPage schema |
| `createdAt` | string (ISO DateTime) | Yes | Creation timestamp | Auto-generated |

**EmailTemplates Schema (nested object):**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `confirmationAlias` | string | No | Resend template alias for booking confirmation | Optional |
| `followupAlias` | string | No | Resend template alias for pre-event follow-up | Optional |
| `followupDaysBefore` | number | No | Days before event to send follow-up email | Min 1, Max 365, Default 1 |

**ConfirmationPage Schema (nested object):**

| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `title` | string | No | Page heading | "Request Received!" |
| `message` | string (HTML) | No | Rich text message | Default HTML message |
| `buttons` | array of objects | No | CTA buttons (max 2) | `[{label: "Back to Home", url: "/", style: "primary"}]` |

**Button Schema (nested in confirmationPage.buttons):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | Yes | Button text |
| `url` | string | Yes | Button destination URL |
| `style` | string | Yes | "primary" or "outline" |

**Relationships:**
- Has many `Booking`
- Has many `AddOn` (many-to-many via event type assignment)
- Has many `PricingRule` (via eventTypeId)

---

### AddOn

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique identifier | Auto-generated |
| `name` | string | Yes | Display name | Min 1 char |
| `description` | string | Yes | Description text | Min 1 char |
| `price` | number | Yes | Price in dollars | Min 0 |
| `type` | string | Yes | Pricing type | Enum: "flat", "hourly" |
| `eventTypeIds` | array of strings | Yes | Associated event types | Each ID must exist |
| `active` | boolean | Yes | Visibility to customers | Default true |
| `createdAt` | string (ISO DateTime) | Yes | Creation timestamp | Auto-generated |

**Relationships:**
- Belongs to many `EventType` (via eventTypeIds)

---

### PricingRule

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique identifier | Auto-generated |
| `name` | string | Yes | Display name | Min 1 char |
| `eventTypeId` | string | No | Specific event type (null = all) | Must exist if provided |
| `days` | array of numbers | No | Days of week (0=Sun, 6=Sat) | Each 0-6, null = all days |
| `startTime` | string (HH:mm) | No | Time range start | 24-hour format, null = all day |
| `endTime` | string (HH:mm) | No | Time range end | 24-hour format, null = all day |
| `hourlyRate` | number | Yes | Override hourly rate | Min 0 |
| `active` | boolean | Yes | Rule enabled | Default true |
| `createdAt` | string (ISO DateTime) | Yes | Creation timestamp | Auto-generated |

**Relationships:**
- Optionally belongs to one `EventType`

**Business Logic:**
- Rules are applied during price calculation
- More specific rules override general rules
- Priority: EventType-specific > Day-specific > Time-specific > Base rate

---

### BlockedDate

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | string (UUID) | Yes | Unique identifier | Auto-generated |
| `date` | string (YYYY-MM-DD) | Yes | Blocked date | ISO date format |
| `reason` | string | Yes | Reason for blocking | Min 1 char |
| `isFullDay` | boolean | Yes | Full day vs time slot | Default true |
| `startTime` | string (HH:mm) | No | Block start time (if not full day) | 24-hour format |
| `endTime` | string (HH:mm) | No | Block end time (if not full day) | 24-hour format |
| `createdAt` | string (ISO DateTime) | Yes | Creation timestamp | Auto-generated |

**Business Logic:**
- If `isFullDay = true`, ignore startTime/endTime
- If `isFullDay = false`, both startTime and endTime are required
- Prevent bookings during blocked periods

---

### Settings (Singleton)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Always "global-settings" |
| `companyName` | string | No | Company/brand name |
| `venueName` | string | No | Venue name (legacy, use companyName) |
| `venueDescription` | string | No | Venue description |
| `logo` | string (Base64) | No | Company logo as base64-encoded image |
| `primaryColor` | string | No | Primary brand color (hex) |
| `accentColor` | string | No | Accent brand color (hex) |
| `rentalPolicies` | object | No | Policy text sections |
| `apiKeys` | object | No | External API credentials (ENCRYPTED) |

**RentalPolicies Schema (nested object):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payment` | string | No | Payment terms text |
| `cancellation` | string | No | Cancellation policy text |
| `liability` | string | No | Liability policy text |
| `cleanup` | string | No | Cleanup requirements text |

**ApiKeys Schema (nested object):**

| Field | Type | Required | Description | Security |
|-------|------|----------|-------------|----------|
| `resendApiKey` | string | No | Resend API key for email automation | MUST BE ENCRYPTED at rest |

**CRITICAL SECURITY REQUIREMENTS:**
- The `apiKeys` object MUST be encrypted in the database
- API keys should NEVER be returned in plain text to the frontend
- When reading settings, return masked version: `"re_••••••••••••••••"`
- Only decrypt for internal backend email operations
- Implement proper access controls for API key updates

**Logo Handling:**
- Logo stored as base64-encoded string
- Frontend handles file upload and converts to base64
- Backend stores as-is (no additional processing needed)
- Maximum recommended size: 2MB
- Supported formats: PNG, JPG, SVG, etc.

**Note:** This is a singleton entity - only one record exists system-wide.

---

## 4. Forms & User Inputs

### Customer Booking Form (`/booking`)

**URL Parameters Support:**
- `?eventType=EVENT_ID` - Pre-selects event type and skips to step 2
- `?date=YYYY-MM-DD` - Pre-selects date (stays on step 1 if no eventType)
- Both parameters can be combined

**Step 1: Event Type Selection**
- **Input:** Click on event type card
- **Validation:** Must select one event type
- **Action:** Proceed to step 2
- **Note:** Skipped if `eventType` query parameter is provided

**Step 2: Date & Time Selection**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `date` | date | Yes | Must be today or future |
| `startTime` | time (30-min intervals) | Yes | Valid time slot |
| `endTime` | time (30-min intervals) | Yes | Must be after startTime |

**Client-side validations:**
- End time must be after start time
- Duration must meet event type's `minDuration`
- Time slot must not conflict with existing bookings (including cooldown periods)
- Time slot must not overlap with blocked dates/times

**Expected response:** Return conflict errors if booking overlaps

**Step 3: Add-ons Selection**
- **Input:** Checkbox selection of add-ons
- **Validation:** None (all optional)
- **Action:** Proceed to step 4

**Step 4: Final Details & Review**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `contactName` | text | Yes | Min 1 char |
| `contactEmail` | email | Yes | Valid email format |
| `contactPhone` | tel | Yes | Min 1 char |
| `guestCount` | number | Yes | Min 1 |
| `descriptionOfUse` | textarea | Yes | Min 1 char |
| `notes` | textarea | No | Optional |
| `agreedToPolicies` | checkbox | Yes | Must be true |

**Expected Response:**
- Success: Return created booking object
- Error: Return validation errors with field-level details

**Post-Submit Behavior:**
- Display confirmation page using `eventType.confirmationPage` settings
- If `emailTemplates.confirmationAlias` exists, trigger email send

---

### Calendar Widget (`/calendar`)

**Purpose:** Public-facing interactive calendar for date selection

**Data Requirements:**
- Fetch all bookings for the selected month (with date range filter)
- Fetch all active event types for display
- Fetch blocked dates for the selected month

**User Interactions:**
- Navigate between months (previous/next)
- Click on available dates to start booking
- Visual indicators for:
  - Available dates (green)
  - Dates with existing bookings (amber)
  - Past dates (disabled/grayed out)
  - Current day (highlighted)

**Date Click Behavior:**
- Redirects to `/booking?date=YYYY-MM-DD`
- Pre-selects the clicked date in the booking wizard

**Expected API Calls:**
- `GET /bookings?startDate=YYYY-MM-01&endDate=YYYY-MM-31` - For calendar month
- `GET /event-types?active=true` - For event type display
- `GET /blocked-dates?startDate=YYYY-MM-01&endDate=YYYY-MM-31` - For blocked dates

---

### Admin Event Type Form (`/admin/event-types`)

**Create/Edit Event Type**

**General Tab:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | text | Yes | Min 1 char |
| `description` | textarea | Yes | Min 1 char |
| `baseRate` | number | Yes | Min 0 |
| `minDuration` | number | Yes | Min 1 |
| `cooldownHours` | number | Yes | Min 0 |
| `color` | color | Yes | Valid hex color |
| `emailTemplates.confirmationAlias` | text | No | Optional |
| `emailTemplates.followupAlias` | text | No | Optional |
| `emailTemplates.followupDaysBefore` | number | No | Min 1, Max 365, Default 1 |
| `active` | checkbox | Yes | Boolean |

**Confirmation Page Tab:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `confirmationPage.title` | text | No | Optional |
| `confirmationPage.message` | rich text (HTML) | No | Valid HTML |
| `confirmationPage.buttons[].label` | text | No | Required if button exists |
| `confirmationPage.buttons[].url` | text | No | Required if button exists |
| `confirmationPage.buttons[].style` | select | No | "primary" or "outline" |

**Expected Response:**
- Success: Return created/updated event type
- Error: Return validation errors

---

### Admin Add-on Form (`/admin/addons`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | text | Yes | Min 1 char |
| `description` | textarea | Yes | Min 1 char |
| `price` | number | Yes | Min 0 |
| `type` | select | Yes | "flat" or "hourly" |
| `eventTypeIds` | multi-select | Yes | At least one event type |
| `active` | checkbox | Yes | Boolean |

**Expected Response:**
- Success: Return created/updated add-on
- Error: Return validation errors

---

### Admin Pricing Rule Form (`/admin/pricing-rules`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | text | Yes | Min 1 char |
| `eventTypeId` | select | No | Null or valid event type ID |
| `days` | multi-select | No | Array of 0-6 or null |
| `startTime` | time | No | Valid time or null |
| `endTime` | time | No | Valid time or null |
| `hourlyRate` | number | Yes | Min 0 |
| `active` | checkbox | Yes | Boolean |

**Expected Response:**
- Success: Return created/updated pricing rule
- Error: Return validation errors

---

### Admin Calendar Block Form (`/admin/calendar`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `date` | date | Yes | Valid date |
| `blockMode` | radio | Yes | "full" or "time" |
| `reason` | text | No | Optional |
| `startTime` | time | Conditional | Required if blockMode = "time" |
| `endTime` | time | Conditional | Required if blockMode = "time" |

**Validation:**
- If `blockMode = "time"`, endTime must be after startTime

**Expected Response:**
- Success: Return created blocked date
- Error: Return validation errors

---

### Admin Booking Edit Form (`/admin/bookings` and `/admin/calendar`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `contactName` | text | Yes | Min 1 char |
| `contactEmail` | email | Yes | Valid email |
| `contactPhone` | tel | Yes | Min 1 char |
| `guestCount` | number | Yes | Min 1 |
| `eventType` | select | Yes | Valid event type ID |
| `date` | date | Yes | Valid date |
| `startTime` | time | Yes | Valid time |
| `endTime` | time | Yes | Must be after startTime |
| `descriptionOfUse` | textarea | Yes | Min 1 char |

**Expected Response:**
- Success: Return updated booking
- Error: Return validation errors

---

### Admin Settings Form (`/admin/settings`)

**Branding Tab:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `logo` | file upload | No | Image files only, max 2MB |
| `companyName` | text | No | Optional |
| `primaryColor` | color | No | Valid hex color |
| `accentColor` | color | No | Valid hex color |

**Logo Upload Handling:**
- Frontend converts uploaded file to base64
- Sends base64 string to backend in `settings.logo` field
- Backend stores as-is (no conversion needed)
- To remove logo, send `null` or empty string

**Policies Tab:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `rentalPolicies.payment` | textarea | No | Optional |
| `rentalPolicies.cancellation` | textarea | No | Optional |
| `rentalPolicies.liability` | textarea | No | Optional |
| `rentalPolicies.cleanup` | textarea | No | Optional |

**API Keys Tab:**

| Field | Type | Required | Validation | Security |
|-------|------|----------|------------|----------|
| `apiKeys.resendApiKey` | password | No | Optional, format: `re_*` | Encrypt at rest, mask in responses |

**CRITICAL SECURITY REQUIREMENTS:**
- When settings are fetched, the `apiKeys.resendApiKey` field should be masked (e.g., `"re_••••••••••••••••"`)
- Only accept full key value on updates (not masked version)
- Validate Resend API key format starts with `re_`
- Encrypt before storing in database
- Never log API keys in plain text

**Expected Response:**
- Success: Return updated settings object with masked API key
- Error: Return validation errors

---

## 5. CRUD Requirements

### Booking

**Create (POST)**
- **Endpoint needed:** Create new booking
- **Input:** Full booking object (see Data Models)
- **Business Logic:**
  - Validate no time conflicts (including cooldown)
  - Validate against blocked dates
  - Calculate `totalPrice` server-side using pricing engine
  - Set status to "pending" by default
  - Generate unique ID
  - Set createdAt timestamp
- **Response:** Created booking object

**Read Single (GET)**
- **Endpoint needed:** Get booking by ID
- **Response:** Single booking object with populated eventType

**Read List (GET)**
- **Endpoint needed:** Get all bookings
- **Filters needed:**
  - By status ("pending", "confirmed", "declined", "cancelled")
  - By date range (for calendar views)
  - By event type
- **Sorting:** By createdAt (desc by default)
- **Response:** Array of booking objects

**Update (PUT/PATCH)**
- **Endpoint needed:** Update booking by ID
- **Input:** Partial or full booking object
- **Business Logic:**
  - Re-validate time conflicts if date/time changed
  - Recalculate price if duration or add-ons changed
- **Response:** Updated booking object

**Update Status (PATCH)**
- **Endpoint needed:** Update booking status only
- **Input:** `{ status: "confirmed" | "declined" | "cancelled" }`
- **Business Logic:**
  - If status changes to "confirmed" and `emailTemplates.confirmationAlias` exists, trigger email
  - Schedule follow-up email based on `emailTemplates.followupDaysBefore` if `followupAlias` exists
- **Response:** Updated booking object

**Delete (DELETE)**
- **Endpoint needed:** Delete booking by ID
- **Response:** Success confirmation

---

### EventType

**Create (POST)**
- **Endpoint needed:** Create new event type
- **Input:** Full event type object
- **Business Logic:** Generate unique ID, set createdAt
- **Response:** Created event type object

**Read Single (GET)**
- **Endpoint needed:** Get event type by ID
- **Response:** Single event type object

**Read List (GET)**
- **Endpoint needed:** Get all event types
- **Filters needed:**
  - By active status (customer views only active=true)
- **Response:** Array of event type objects

**Update (PUT/PATCH)**
- **Endpoint needed:** Update event type by ID
- **Input:** Partial or full event type object
- **Response:** Updated event type object

**Delete (DELETE)**
- **Endpoint needed:** Delete event type by ID
- **Business Logic:** Prevent deletion if bookings exist
- **Response:** Success confirmation or error

---

### AddOn

**Create (POST)**
- **Endpoint needed:** Create new add-on
- **Input:** Full add-on object
- **Business Logic:** Validate eventTypeIds exist
- **Response:** Created add-on object

**Read Single (GET)**
- **Endpoint needed:** Get add-on by ID
- **Response:** Single add-on object

**Read List (GET)**
- **Endpoint needed:** Get all add-ons
- **Filters needed:**
  - By eventTypeId (for customer booking flow)
  - By active status
- **Response:** Array of add-on objects

**Update (PUT/PATCH)**
- **Endpoint needed:** Update add-on by ID
- **Input:** Partial or full add-on object
- **Response:** Updated add-on object

**Delete (DELETE)**
- **Endpoint needed:** Delete add-on by ID
- **Response:** Success confirmation

---

### PricingRule

**Create (POST)**
- **Endpoint needed:** Create new pricing rule
- **Input:** Full pricing rule object
- **Business Logic:** Validate eventTypeId if provided
- **Response:** Created pricing rule object

**Read Single (GET)**
- **Endpoint needed:** Get pricing rule by ID
- **Response:** Single pricing rule object

**Read List (GET)**
- **Endpoint needed:** Get all pricing rules
- **Filters needed:**
  - By active status
  - By eventTypeId
- **Response:** Array of pricing rule objects

**Update (PUT/PATCH)**
- **Endpoint needed:** Update pricing rule by ID
- **Input:** Partial or full pricing rule object
- **Response:** Updated pricing rule object

**Delete (DELETE)**
- **Endpoint needed:** Delete pricing rule by ID
- **Response:** Success confirmation

---

### BlockedDate

**Create (POST)**
- **Endpoint needed:** Create new blocked date
- **Input:** Full blocked date object
- **Business Logic:**
  - If isFullDay=false, validate startTime < endTime
- **Response:** Created blocked date object

**Read Single (GET)**
- **Endpoint needed:** Get blocked date by ID
- **Response:** Single blocked date object

**Read List (GET)**
- **Endpoint needed:** Get all blocked dates
- **Filters needed:**
  - By date
  - By date range (for calendar views)
- **Response:** Array of blocked date objects

**Delete (DELETE)**
- **Endpoint needed:** Delete blocked date by ID
- **Response:** Success confirmation

---

### Settings

**Read (GET)**
- **Endpoint needed:** Get global settings
- **Response:** Settings object with masked API keys and full logo (base64)
- **Security:** Return `apiKeys.resendApiKey` as masked value (e.g., `"re_••••••••••••••••"`)

**Update (PUT/PATCH)**
- **Endpoint needed:** Update global settings
- **Input:** Partial or full settings object
- **Business Logic:**
  - If `apiKeys.resendApiKey` is provided and not masked, encrypt before saving
  - If masked value is sent, ignore (no update to API key)
  - Validate Resend API key format if provided
  - Store `logo` as-is (already base64 from frontend)
  - To remove logo, accept `null` or empty string
- **Response:** Updated settings object with masked API key

**Note:** No create/delete - settings are singleton

---

## 6. State Expectations

### Loading States

**Expected Behavior:**
- All data fetches should return loading indicators
- Forms should disable submit buttons during save operations
- Button component expects `isLoading` prop to show spinner

**Example:**
```javascript
<Button isLoading={loading}>Submit</Button>
```

---

### Error States

**Expected Error Response Format:**
```json
{
  "error": true,
  "message": "Human-readable error message",
  "fields": {
    "fieldName": "Field-specific error message"
  }
}
```

**Frontend Expectations:**
- HTTP 4xx/5xx status codes for errors
- Field-level errors for form validation
- Global error messages for system failures

---

### Empty States

**Expected Behavior:**
- Empty arrays should return `[]` not null
- Empty objects should return `{}` not null
- Frontend displays custom empty state UI when arrays are empty

**Examples:**
- No bookings: "No bookings found"
- No event types: "No event types configured"

---

### Pagination Expectations

**Current Implementation:** No pagination (loads all records)

**Future Consideration:**
- If implementing pagination, use query params: `?page=1&limit=20`
- Return format:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

### Sorting Expectations

**Default Sorting:**
- Bookings: By `createdAt` DESC (newest first)
- Event Types: By `name` ASC
- Add-ons: By `name` ASC
- Pricing Rules: By `name` ASC
- Blocked Dates: By `date` ASC

**Future Consideration:**
- If implementing dynamic sorting, use query param: `?sortBy=createdAt&order=desc`

---

## 7. Authentication Requirements

### Roles

**Customer (Public)**
- No authentication required
- Can access: `/`, `/booking`, `/calendar`, embeds
- Can create bookings

**Admin (Authenticated)**
- Authentication required
- Can access: All `/admin/*` routes
- Can perform all CRUD operations

---

### Authentication Flow Expectations

**Frontend Assumptions:**
- Admin routes are protected by auth check
- If not authenticated, redirect to login
- Session/token persists across page reloads

**NOT Implemented in Frontend:**
- Login page (needs to be built)
- Logout functionality (needs to be built)
- User management (needs to be built)

**Backend Requirements:**
- Implement authentication mechanism
- Protect all `/admin/*` endpoints
- Public endpoints: All customer-facing reads and booking creation

---

### Session Expectations

**Frontend Expectations:**
- Session persists in browser (localStorage, cookies, etc.)
- Session includes user role
- Session timeout handled gracefully

---

## 8. External Integrations

### Resend (Email Service)

**Purpose:** Send transactional emails for booking confirmations and follow-ups

**API Key Storage:**
- Stored in `Settings.apiKeys.resendApiKey`
- MUST be encrypted at rest in database
- Retrieved and decrypted only for internal email operations
- Never exposed in plain text to frontend

**Integration Points:**

**1. Booking Confirmation Email**
- **Trigger:** When admin changes booking status to "confirmed"
- **Condition:** If `eventType.emailTemplates.confirmationAlias` is not empty AND `settings.apiKeys.resendApiKey` exists
- **Template Data Expected:**
  ```json
  {
    "customerName": "John Doe",
    "eventName": "Wedding Package",
    "eventDate": "January 15, 2024",
    "eventTime": "2:00 PM - 6:00 PM",
    "guestCount": 150,
    "totalPrice": "$1,200.00",
    "status": "confirmed"
  }
  ```
- **Recipient:** `booking.contactEmail`
- **Template:** Use alias from `eventType.emailTemplates.confirmationAlias`
- **Error Handling:** Log warning but don't fail booking update if email fails

**2. Follow-up Email (Scheduled)**
- **Trigger:** Scheduled job that runs daily and checks for upcoming events
- **Condition:** 
  - If `eventType.emailTemplates.followupAlias` is not empty
  - AND `settings.apiKeys.resendApiKey` exists
  - AND today's date is exactly `eventType.emailTemplates.followupDaysBefore` days before the event date
  - AND booking status is "confirmed"
- **Calculation Example:**
  - Event date: January 15, 2024
  - `followupDaysBefore`: 3
  - Send email on: January 12, 2024
- **Template Data Expected:**
  ```json
  {
    "customerName": "John Doe",
    "eventName": "Wedding Package",
    "eventDate": "January 15, 2024",
    "eventTime": "2:00 PM - 6:00 PM",
    "guestCount": 150,
    "daysUntilEvent": 3
  }
  ```
- **Recipient:** `booking.contactEmail`
- **Template:** Use alias from `eventType.emailTemplates.followupAlias`
- **Error Handling:** Log error but continue processing other bookings

**Expected Backend Implementation:**
- Resend API integration using stored API key
- Template rendering with dynamic data
- Scheduled job (cron/worker) for follow-up emails
- Error handling for failed sends
- Email send logging (success/failure)
- Rate limiting to respect Resend API limits

**Scheduled Job Requirements:**
- Run daily at a consistent time (e.g., 9:00 AM)
- Query all confirmed bookings
- Calculate days until event for each booking
- Send follow-up email if days match `followupDaysBefore`
- Mark email as sent to avoid duplicates (optional: add `followupEmailSent` boolean to Booking model)

---

## 9. Environment Variables Referenced

### Expected Environment Variables

The frontend does not directly access environment variables, but the backend will need:

**Required:**
- `DATABASE_URL` - Database connection string
- `API_BASE_URL` - Base URL for API endpoints
- `JWT_SECRET` or equivalent - For authentication
- `ENCRYPTION_KEY` - For encrypting API keys in database (AES-256 recommended)

**Optional:**
- `RESEND_API_KEY` - **DEPRECATED:** Should be stored in Settings, not environment
- `FRONTEND_URL` - For CORS configuration
- `NODE_ENV` - Environment mode (development, production)
- `EMAIL_CRON_SCHEDULE` - Cron schedule for follow-up emails (default: "0 9 * * *")

**Note:** The Resend API key should be stored in the Settings model, not as an environment variable, to allow admin users to update it without redeploying the application.

---

## 10. Edge Cases The Backend Must Handle

### Booking Conflicts

**Scenario:** Two users book the same time slot simultaneously

**Expected Behavior:**
- Use database-level locking or transactions
- First request succeeds, second returns conflict error
- Error message: "This time slot is no longer available"

---

### Cooldown Period Validation

**Scenario:** Booking ends at 5:00 PM, cooldown is 2 hours, next booking starts at 6:00 PM

**Expected Behavior:**
- Reject booking with error
- Error message: "This time conflicts with another event. Earliest available start time is 7:00 PM"

---

### Pricing Calculation

**Scenario:** Multiple pricing rules apply to the same time slot

**Expected Behavior:**
- Apply most specific rule (EventType-specific > Day-specific > Time-specific > Base rate)
- Calculate per 30-minute interval
- Return exact price matching frontend calculation

**Frontend Calculation Logic:**
```javascript
// Iterates through 30-minute chunks
// Finds matching pricing rule for each chunk
// Sums all chunks to get total
```

**Backend Must Match:** See `src/utils/pricingEngine.js` for reference

---

### Blocked Date Overlaps

**Scenario:** User tries to book time that partially overlaps a blocked time slot

**Expected Behavior:**
- Reject entire booking
- Error message: "This time slot is blocked due to: [reason]"

---

### Event Type Deletion

**Scenario:** Admin tries to delete event type with existing bookings

**Expected Behavior:**
- Prevent deletion
- Error message: "Cannot delete event type with existing bookings"

---

### Add-on Availability

**Scenario:** User selects add-on, then switches event type where add-on is not available

**Expected Behavior:**
- Frontend clears invalid add-ons
- Backend should validate add-ons belong to selected event type
- Reject booking if invalid add-on submitted

---

### Time Validation

**Scenario:** User submits endTime before startTime

**Expected Behavior:**
- Reject with validation error
- Error message: "End time must be after start time"

---

### Minimum Duration Validation

**Scenario:** User books 1 hour when event type requires 2 hours minimum

**Expected Behavior:**
- Reject with validation error
- Error message: "Minimum duration for this event is 2 hours"

---

### Future Date Validation

**Scenario:** User tries to book date in the past

**Expected Behavior:**
- Reject with validation error
- Error message: "Cannot book dates in the past"

---

### Email Template Missing

**Scenario:** Booking confirmed but `confirmationAlias` is empty or invalid

**Expected Behavior:**
- Log warning but don't fail booking update
- Gracefully skip email send
- Return success for booking update

---

### API Key Missing or Invalid

**Scenario:** Email should be sent but `settings.apiKeys.resendApiKey` is empty or invalid

**Expected Behavior:**
- Log error but don't fail booking operation
- Gracefully skip email send
- Return success for booking update
- Optionally: Store failed email attempts for admin review

---

### Follow-up Email Already Sent

**Scenario:** Scheduled job runs multiple times and tries to send follow-up email again

**Expected Behavior:**
- Implement idempotency check (e.g., `followupEmailSent` boolean on Booking)
- Skip sending if already sent
- Log skip event

---

### Settings Not Initialized

**Scenario:** First-time setup, settings record doesn't exist

**Expected Behavior:**
- Create default settings record on first access
- Return default values:
  ```json
  {
    "id": "global-settings",
    "companyName": "Luxe Events",
    "venueName": "",
    "venueDescription": "",
    "logo": null,
    "primaryColor": "#3B82F6",
    "accentColor": "#10B981",
    "rentalPolicies": {
      "payment": "Default payment policy text",
      "cancellation": "Default cancellation policy text",
      "liability": "Default liability policy text",
      "cleanup": "Default cleanup policy text"
    },
    "apiKeys": {
      "resendApiKey": ""
    }
  }
  ```

---

### Concurrent Booking Updates

**Scenario:** Two admins edit the same booking simultaneously

**Expected Behavior:**
- Use optimistic locking or versioning
- Last write wins OR return conflict error
- Recommended: Return error with current state

---

### Price Recalculation

**Scenario:** Admin edits booking date/time or add-ons

**Expected Behavior:**
- Recalculate `totalPrice` server-side
- Update booking with new price
- Return updated booking object

---

### Orphaned References

**Scenario:** Event type deleted but add-ons still reference it

**Expected Behavior:**
- Cascade delete or prevent deletion
- Recommended: Prevent event type deletion if references exist

---

### API Key Encryption Failure

**Scenario:** Encryption service fails when saving API key

**Expected Behavior:**
- Return error to admin
- Do not save API key in plain text
- Error message: "Failed to securely store API key. Please try again."

---

### Invalid Follow-up Days Value

**Scenario:** Admin sets `followupDaysBefore` to 0 or negative number

**Expected Behavior:**
- Reject with validation error
- Error message: "Follow-up days must be between 1 and 365"

---

### Invalid Event Type ID in URL

**Scenario:** User accesses `/booking?eventType=invalid-id`

**Expected Behavior:**
- Backend returns 404 or validation error for invalid event type
- Frontend ignores invalid parameter and shows step 1 (event type selection)
- Log the invalid attempt for monitoring

---

### Invalid Date in URL

**Scenario:** User accesses `/booking?date=invalid-date` or `/booking?date=2024-13-45`

**Expected Behavior:**
- Frontend validates date format and ignores invalid dates
- Falls back to current date
- Backend should validate date format if received

---

### Logo File Too Large

**Scenario:** User tries to upload logo larger than 2MB

**Expected Behavior:**
- Frontend prevents upload and shows error: "Image size must be less than 2MB"
- Backend should also validate size if implemented
- Reject with error if size exceeds limit

---

### Invalid Logo Format

**Scenario:** User tries to upload non-image file as logo

**Expected Behavior:**
- Frontend prevents upload and shows error: "Please upload an image file (PNG, JPG, SVG, etc.)"
- Backend should validate base64 is valid image data
- Reject with error if format is invalid

---

## 11. Data Seeding Requirements

### Initial Data Needed for Development

**EventTypes (at least 2):**
```json
[
  {
    "name": "Wedding Package",
    "description": "Full-day wedding rental with setup and teardown",
    "baseRate": 150,
    "minDuration": 4,
    "cooldownHours": 2,
    "active": true,
    "color": "#3B82F6",
    "emailTemplates": {
      "confirmationAlias": "",
      "followupAlias": "",
      "followupDaysBefore": 1
    }
  },
  {
    "name": "Corporate Event",
    "description": "Professional meeting and event space",
    "baseRate": 100,
    "minDuration": 2,
    "cooldownHours": 1,
    "active": true,
    "color": "#10B981",
    "emailTemplates": {
      "confirmationAlias": "",
      "followupAlias": "",
      "followupDaysBefore": 3
    }
  }
]
```

**AddOns (at least 2):**
```json
[
  {
    "name": "Catering Service",
    "description": "Full catering for your event",
    "price": 500,
    "type": "flat",
    "eventTypeIds": ["<wedding-id>", "<corporate-id>"],
    "active": true
  },
  {
    "name": "AV Equipment",
    "description": "Professional audio/visual setup",
    "price": 50,
    "type": "hourly",
    "eventTypeIds": ["<corporate-id>"],
    "active": true
  }
]
```

**Settings:**
```json
{
  "id": "global-settings",
  "companyName": "Grand Event Hall",
  "venueName": "Grand Event Hall",
  "venueDescription": "Beautiful venue for all occasions",
  "logo": null,
  "primaryColor": "#3B82F6",
  "accentColor": "#10B981",
  "rentalPolicies": {
    "payment": "50% deposit required, balance due 7 days before event",
    "cancellation": "Cancellations within 30 days are non-refundable",
    "liability": "Renters responsible for damages during event",
    "cleanup": "Venue must be left in original condition"
  },
  "apiKeys": {
    "resendApiKey": ""
  }
}
```

---

## 12. API Endpoint Expectations

### Expected REST API Structure

**Base URL:** `/api` (or similar)

**Bookings:**
- `GET /bookings` - List all bookings (with filters)
  - Query params: `?status=pending`, `?startDate=YYYY-MM-DD`, `?endDate=YYYY-MM-DD`, `?eventType=ID`
- `GET /bookings/:id` - Get single booking
- `POST /bookings` - Create booking
- `PATCH /bookings/:id` - Update booking
- `PATCH /bookings/:id/status` - Update booking status
- `DELETE /bookings/:id` - Delete booking

**Event Types:**
- `GET /event-types` - List all event types
  - Query params: `?active=true` (for customer views)
- `GET /event-types/:id` - Get single event type
- `POST /event-types` - Create event type (admin)
- `PATCH /event-types/:id` - Update event type (admin)
- `DELETE /event-types/:id` - Delete event type (admin)

**Add-ons:**
- `GET /add-ons` - List all add-ons
  - Query params: `?eventTypeId=ID`, `?active=true`
- `GET /add-ons/:id` - Get single add-on
- `POST /add-ons` - Create add-on (admin)
- `PATCH /add-ons/:id` - Update add-on (admin)
- `DELETE /add-ons/:id` - Delete add-on (admin)

**Pricing Rules:**
- `GET /pricing-rules` - List all pricing rules
  - Query params: `?active=true`, `?eventTypeId=ID`
- `GET /pricing-rules/:id` - Get single pricing rule
- `POST /pricing-rules` - Create pricing rule (admin)
- `PATCH /pricing-rules/:id` - Update pricing rule (admin)
- `DELETE /pricing-rules/:id` - Delete pricing rule (admin)

**Blocked Dates:**
- `GET /blocked-dates` - List all blocked dates
  - Query params: `?date=YYYY-MM-DD`, `?startDate=YYYY-MM-DD`, `?endDate=YYYY-MM-DD`
- `GET /blocked-dates/:id` - Get single blocked date
- `POST /blocked-dates` - Create blocked date (admin)
- `DELETE /blocked-dates/:id` - Delete blocked date (admin)

**Settings:**
- `GET /settings` - Get global settings (with masked API keys)
- `PATCH /settings` - Update global settings (admin)

**Dashboard Stats (Admin):**
- `GET /dashboard/stats` - Get dashboard statistics
  - Expected response:
    ```json
    {
      "pendingRequests": 5,
      "upcomingEvents": 12,
      "totalRevenue": 25000,
      "recentBookings": [...]
    }
    ```

---

## 13. Deep Linking & Integration Guide

### Overview

The application supports deep linking to allow external websites to link directly to specific booking flows or pre-selected dates.

### Deep Link Formats

**1. Calendar View**
```
https://yourapp.com/calendar
```
- Shows interactive monthly calendar
- Users can browse and select dates
- Displays availability at a glance

**2. Event Type Direct Link**
```
https://yourapp.com/booking?eventType={EVENT_TYPE_ID}
```
- Skips event type selection
- Goes directly to date/time picker
- Use for "Book Wedding" or "Book Corporate Event" buttons

**3. Pre-selected Date**
```
https://yourapp.com/booking?date=YYYY-MM-DD
```
- Pre-fills the date field
- User still selects event type first

**4. Combined Parameters**
```
https://yourapp.com/booking?eventType={EVENT_TYPE_ID}&date=YYYY-MM-DD
```
- Pre-selects both event type and date
- User goes directly to time selection

### Implementation Examples

**HTML Button Examples:**
```html
<!-- Calendar Link -->
<a href="https://yourapp.com/calendar" class="btn btn-primary">
  View Available Dates
</a>

<!-- Event Type Link -->
<a href="https://yourapp.com/booking?eventType=abc123" class="btn btn-primary">
  Book Wedding Package
</a>

<!-- Combined Link -->
<a href="https://yourapp.com/booking?eventType=abc123&date=2024-12-25" class="btn btn-primary">
  Book Christmas Event
</a>
```

**WordPress Shortcode Example:**
```php
[booking_button event_type="wedding-id" text="Book Wedding"]
```

**Email Template Example:**
```html
<a href="https://yourapp.com/booking?eventType={{event_type_id}}" 
   style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
  Complete Your Booking
</a>
```

### Backend Requirements for Deep Linking

**Event Type Validation:**
- When `?eventType=ID` is provided, validate the ID exists
- Return 404 or validation error if invalid
- Ensure event type is active (active=true)

**Date Validation:**
- When `?date=YYYY-MM-DD` is provided, validate format
- Ensure date is not in the past
- Check against blocked dates

**Response Format:**
- If validation fails, return error in standard format
- Frontend will handle gracefully by showing default view

---

## 14. Embedding Guide

### Overview

The application provides embeddable widgets that can be integrated into external websites using iframe elements.

### Available Widgets

**1. Full Booking Widget**
```html
<iframe 
  src="https://yourapp.com/booking" 
  style="width:100%; height:700px; border:none; border-radius:12px; overflow:hidden;">
</iframe>
```
- Complete booking flow
- Best for dedicated booking pages
- Recommended height: 700px

**2. Calendar Widget**
```html
<iframe 
  src="https://yourapp.com/calendar" 
  style="width:100%; height:900px; border:none; border-radius:12px; overflow:hidden;">
</iframe>
```
- Interactive monthly calendar
- Shows availability
- Users can click dates to book
- Recommended height: 900px

### Customization Options

**Adjust Dimensions:**
```html
<iframe 
  src="https://yourapp.com/booking" 
  style="width:100%; max-width:800px; height:700px; border:none;">
</iframe>
```

**Responsive Embedding:**
```html
<div style="position:relative; padding-bottom:100%; height:0;">
  <iframe 
    src="https://yourapp.com/calendar"
    style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;">
  </iframe>
</div>
```

### Backend Considerations

**CORS Headers:**
- Allow embedding from authorized domains
- Set appropriate `X-Frame-Options` or `Content-Security-Policy` headers
- Example: `X-Frame-Options: ALLOW-FROM https://yourwebsite.com`

**Security:**
- Validate referrer headers
- Implement rate limiting per domain
- Monitor for abuse

---

## 15. Success Criteria

The backend implementation will be considered complete when:

1. ✅ All CRUD operations work for all entities
2. ✅ Booking conflict validation prevents double-bookings
3. ✅ Pricing calculation matches frontend logic exactly
4. ✅ Authentication protects admin routes
5. ✅ Email integration sends confirmations when configured
6. ✅ Scheduled follow-up emails are sent based on `followupDaysBefore` setting
7. ✅ API keys are encrypted at rest and masked in responses
8. ✅ Logo upload/storage/retrieval works correctly
9. ✅ Deep linking with URL parameters functions properly
10. ✅ Calendar widget returns correct availability data
11. ✅ Data persistence survives server restarts
12. ✅ Error responses follow documented format
13. ✅ Edge cases are handled gracefully
14. ✅ API endpoints match expected structure
15. ✅ Seed data is available for testing
16. ✅ Email scheduler runs reliably and handles errors
17. ✅ Date range filtering works for calendar views

---

## 16. Additional Notes

### Frontend State Management
- Currently uses React Context (`StoreContext.jsx`)
- All data operations currently mock (in-memory)
- Backend should provide REST API to replace these mocks

### Price Calculation Reference
- See `src/utils/pricingEngine.js` for exact calculation logic
- Backend MUST replicate this logic to ensure price consistency
- Calculations happen per 30-minute interval

### Time Format Standards
- Dates: `YYYY-MM-DD` (ISO 8601)
- Times: `HH:mm` (24-hour format)
- DateTimes: ISO 8601 full format

### CORS Requirements
- Allow requests from frontend domain
- Support credentials if using cookie-based auth
- Allow embedding from authorized domains (for iframe widgets)

### Logo Storage
- Frontend sends base64-encoded images
- Backend stores as text/string (no binary storage needed)
- No image processing required on backend
- Return full base64 string when fetching settings

### File Upload (Future Feature)
- Currently only logo is supported
- May be needed for venue photos or event type images in future

### Security Best Practices
- Encrypt all API keys using industry-standard encryption (AES-256)
- Use environment variable for encryption key
- Implement rate limiting on email sending
- Validate all user inputs server-side
- Use prepared statements for database queries
- Implement HTTPS in production
- Validate file uploads (type, size)
- Sanitize base64 data before storage

### Performance Considerations
- Index database fields used in queries (date, status, eventTypeId)
- Optimize date range queries for calendar views
- Cache settings object (singleton, rarely changes)
- Consider CDN for logo delivery if needed

---

**Document Version:** 2.0  
**Last Updated:** 2024  
**Frontend Framework:** React 18.3.1  
**Styling:** Tailwind CSS  
**Routing:** React Router v6  

**Changelog:**
- v2.0: Added logo upload/management, calendar widget, deep linking support, booking links, comprehensive integration guide
- v1.1: Added API Keys management in Settings, Follow-up email days configuration, email scheduling requirements, and enhanced security specifications
- v1.0: Initial release