# Price Check BD — Final Business Logic & Functional Specification

> **Document Type:** Business Logic / Functional Source of Truth  
> **App Name:** Price Check BD  
> **Platforms:** Mobile App (Android & iOS) + Web Admin Panel  
> **Primary Roles:** Super Admin, Admin, Company, Driver, Party  
> **Language Goal:** Bengali-first, English-supported  
> **Important:** এই document-এর latest business rules আগের payment/ledger-centric planning-কে supersede করে।

---

# 1. Product Vision

Price Check BD হলো একটি **Bangladesh-focused B2B product marketplace, order coordination, delivery coordination, inquiry, complaint, chat, analytics এবং audit platform**।

এই platform-এর মূল উদ্দেশ্য:

- Company তাদের product ও price publish করবে।
- Party নিজের category-এর product খুঁজবে এবং order করবে।
- Party-specific special price / custom rate support থাকবে।
- Company platform-এর Driver ব্যবহার করে delivery request পাঠাতে পারবে।
- Driver pickup এবং delivery proof submit করবে।
- Party product না পেলে Inquiry submit করবে।
- Company Inquiry দেখে Party-এর সাথে যোগাযোগ করতে পারবে।
- Party Company অথবা Driver-এর বিরুদ্ধে Complaint করতে পারবে।
- Admin এবং Super Admin Complaint resolve করবে।
- Admin/Super Admin system-এর activities audit করবে।
- Role অনুযায়ী analytics দেখানো হবে।
- **App-এর ভিতরে কোনো payment transaction, payment gateway, due, ledger বা payment verification থাকবে না।**

---

# 2. The Most Important Business Boundary

## 2.1 App কী manage করবে

Price Check BD manage করবে:

- Category
- User registration
- Document verification
- Company
- Driver
- Party
- Product
- Product price
- Offer price
- Special price
- Product listing
- Inquiry
- Order
- Driver delivery request
- Pickup proof
- Delivery proof
- Complaint
- Chat
- Notification
- Analytics
- Audit logs
- User moderation / ban

## 2.2 App কী manage করবে না

App manage করবে না:

- Online payment
- Payment gateway
- Cash payment record
- Bank payment record
- Payment verification
- Paid / unpaid status
- Due amount
- Ledger
- Debit / credit
- Financial receipt
- Company-to-Party payment settlement
- Driver payment settlement

### Core Rule

```text
APP:
Product Price
   ↓
Quantity
   ↓
Order Value
   ↓
Delivery Coordination
   ↓
Delivery Complete

OUTSIDE APP:
Party ↔ Company টাকা লেনদেন
Company / Party ↔ Driver delivery charge settlement
```

অর্থাৎ App **commercial amount calculate করতে পারে**, কিন্তু actual money transaction App-এর responsibility না।

---

# 3. Core User Roles

Price Check BD-এর primary roles:

1. Super Admin
2. Admin
3. Company
4. Driver
5. Party

---

# 4. Category as the Main Access Scope

Category এই system-এ শুধু product classification নয়। এটি **primary business scope**।

উদাহরণ:

- Rice Mill
- Plastic Dana

## 4.1 Registration Category Rule

### Company
একটি Company registration-এর সময় **একটি single category**-এর অধীনে register করবে।

### Driver
No need category during registration.


### Party
একজন Party registration-এর সময় **একটি single category**-এর অধীনে register করবে।

### Admin
একজন Admin-কে Super Admin এক বা একাধিক category access দিতে পারবে।

উদাহরণ:

```text
Admin A
├── Rice Mill
└── Plastic Dana
```

Admin A এই দুই category-এর সকল relevant data manage করতে পারবে।

---

# 5. Admin Permission Philosophy

Admin-এর জন্য আলাদা complex platform permission matrix প্রয়োজন নেই।

## Core Rule

```text
Admin Access = Assigned Category-এর Full Operational Access
```

অর্থাৎ Admin-কে যেসব category access দেওয়া হবে, সেই category-এর:

- Company
- Party
- Driver
- Product
- Order
- Delivery
- Inquiry
- Complaint
- Analytics
- Audit Logs

সে দেখতে এবং role অনুযায়ী manage করতে পারবে।

## Admin-এর Global Restriction

Admin করতে পারবে না:

- নতুন Category create
- Category structure globally control
- নতুন Admin account create
- অন্য Admin-এর category permission assign
- Platform-wide Super Admin configuration manage

এই authority শুধু Super Admin-এর।

---

# 6. Super Admin

Super Admin হলো পুরো platform-এর **global governance, moderation, analytics এবং audit authority**।

## 6.1 Super Admin Scope

Super Admin দেখতে এবং manage করতে পারবে:

- সকল Category
- সকল Admin
- সকল Company
- সকল Driver
- সকল Party
- সকল Complaint
- সকল Inquiry
- সকল Audit Log
- সকল Analytics

## 6.2 Super Admin Responsibilities

### Platform Governance
- পুরো platform audit করা
- suspicious activity review করা
- user moderation
- user ban / unban
- system activity monitor

### Verification
- Pending Company document review
- Pending Driver document review
- Pending Party document review
- Account approve / reject

### Admin Management
- Admin account create
- Admin update
- Admin status manage
- Admin-কে এক বা একাধিক Category assign

### Category Management
- Category create
- Category edit
- Category status manage
- Category-level oversight

### Complaints
- সকল Complaint দেখতে পারবে
- Complaint update করতে পারবে
- Complaint resolve করতে পারবে
- Complaint reopen/escalate করতে পারবে যদি প্রয়োজন হয়

### Products / Orders / Delivery / Inquiry
Super Admin এগুলো **operationally company-এর হয়ে manage করবে না**।

সে primarily:

- View
- Audit
- Investigate
- Moderate

করবে।

### Analytics
Super Admin detailed global analytics দেখতে পারবে।

সে চাইলে individual:

- Company analytics
- Driver analytics
- Party analytics
- Admin analytics

দেখতে পারবে।

### Chat
Super Admin শুধুমাত্র:

```text
Super Admin ↔ Admin
```

Chat করতে পারবে।

---

# 7. Admin

Admin হলো **category-scoped operational administrator**।

## 7.1 Admin Scope

Admin তার assigned category-এর মধ্যে সব relevant operational data access করবে।

উদাহরণ:

```text
Admin A Access:
- Rice Mill
- Plastic Dana
```

তাহলে Admin A এই দুই category-এর:

- Company
- Party
- Driver
- Product
- Order
- Delivery
- Inquiry
- Complaint
- Audit Log
- Analytics

দেখতে এবং manage করতে পারবে।

## 7.2 Admin Responsibilities

- Category-scoped Company management
- Category-scoped Party management
- Category-scoped Driver management
- Pending verification review
- Complaint management
- Complaint resolve
- Audit activity review
- Operational analytics
- User behavior monitoring
- Product / Order / Delivery view & audit

## 7.3 Admin Restrictions

Admin করতে পারবে না:

- Category create
- Admin account create
- Admin permission/category assignment globally change
- Super Admin-এর global configuration change

## 7.4 Admin Chat

Admin chat করতে পারবে:

```text
Admin ↔ Super Admin
Admin ↔ Company
```

Admin direct chat করবে না:

- Party
- Driver

---

# 8. Company

Company হলো actual seller / business operator।

## 8.1 Registration

Company:

- একটি single category select করবে
- business information submit করবে
- required documents submit করবে
- verification pending থাকবে
- Admin/Super Admin approval-এর পর active হবে

## 8.2 Company Main Responsibilities

- Product add
- Product edit
- Regular price set
- Offer price set
- Party-specific Special Price set
- Order manage
- Delivery request create
- Driver select/request
- Inquiry view
- Inquiry response/contact
- Company-related Complaint response
- Driver-related Complaint view when Driver delivered Company’s product
- Company analytics view
- Chat

## 8.3 Company Chat

Company chat করতে পারবে:

```text
Company ↔ Admin
Company ↔ Driver
Company ↔ Party
```

---

# 9. Driver

Driver হলো platform-এর delivery execution user।

## 9.1 Registration

Driver:

- একটি single category-এর অধীনে register করবে
- required document submit করবে
- verification pending থাকবে
- approval-এর পর active হবে

## 9.2 Driver Responsibilities

- Delivery request দেখা
- Delivery request accept/reject
- Accepted delivery list দেখা
- Pending delivery দেখা
- Pickup proof submit
- Delivery status update
- Delivery proof submit
- Driver-related Complaint response
- Own analytics দেখা
- Company/Party-এর সাথে chat

## 9.3 Driver Chat

```text
Driver ↔ Company
Driver ↔ Party
```

## 9.4 Driver Payment

Driver payment App-এর মাধ্যমে হবে না।

```text
Driver payment settlement = Manual / Outside App
```

Driver এবং Company/Party নিজেদের মধ্যে কথা বলে settlement করবে।

---

# 10. Party

Party হলো buyer/customer।

## 10.1 Registration

Party:

- একটি single category-এর অধীনে register করবে
- required document/information submit করবে
- verification pending থাকবে
- approval-এর পর full access পাবে

## 10.2 Party Responsibilities

- নিজের category-এর Product browse
- Lowest effective price অনুযায়ী Product listing দেখা
- Offer price দেখা
- নিজের Special Price দেখা
- Order place
- Order track
- Delivery track
- Inquiry submit
- Inquiry response পাওয়ার পর Company-এর সাথে যোগাযোগ
- Company Complaint submit
- Driver/Delivery Complaint submit
- Own analytics দেখা
- Company/Driver-এর সাথে chat

## 10.3 Party Chat

```text
Party ↔ Company
Party ↔ Driver
```

---

# 11. Product Pricing Model

Price Check BD-এ তিন ধরনের Product Price থাকবে:

1. Regular Price
2. Offer Price
3. Special Price

---

## 11.1 Regular Price

Regular Price হলো product-এর default/normal market price।

উদাহরণ:

```text
Product A
Regular Price: 2500 Tk
```

UI-তে Offer/Special Price active থাকলে Regular Price strike-through style-এ দেখানো যেতে পারে।

উদাহরণ:

```text
Regular Price: ~~2500 Tk~~
Offer Price:   2100 Tk
```

---

## 11.2 Offer Price

Offer Price হলো Company-এর general discounted price।

এটি সেই সকল eligible Party দেখবে যাদের জন্য আলাদা Special Price set করা নেই।

উদাহরণ:

```text
Product A

Regular Price: 2500 Tk
Offer Price:   2100 Tk
```

Party-এর Special Price না থাকলে payable/display effective price:

```text
Effective Price = Offer Price
```

যদি Offer Price না থাকে:

```text
Effective Price = Regular Price
```

---

## 11.3 Special Price

Special Price হলো specific Party-এর জন্য Company-এর custom rate।

উদাহরণ:

```text
Product A

Regular Price: 2500 Tk
Offer Price:   2100 Tk
Special Price: 1500 Tk
```

যদি Party-এর জন্য Special Price থাকে, Party দেখবে:

```text
Regular Price: 2500 Tk
Offer Price:   2100 Tk
Your Special Price: 1500 Tk
```

Effective ordering price হবে:

```text
Special Price
```

---

# 12. Effective Price Rule

Final displayed/order price নির্ধারণের priority:

```text
1. Special Price
2. Offer Price
3. Regular Price
```

অর্থাৎ:

```text
IF Special Price exists for current Party:
    Effective Price = Special Price

ELSE IF Offer Price exists:
    Effective Price = Offer Price

ELSE:
    Effective Price = Regular Price
```

---

# 13. Product Listing Sorting

Party-এর Product listing defaultভাবে:

```text
Lowest Effective Price
        ↓
Higher Effective Price
        ↓
Highest Effective Price
```

Sort করার সময় current Party-এর জন্য effective price ব্যবহার হবে।

## Example

| Company | Regular Price | Offer Price | Party Special Price | Effective Price |
|---|---:|---:|---:|---:|
| Company A | 2500 | 2100 | — | 2100 |
| Company B | 2400 | 2200 | 1500 | 1500 |
| Company C | 2300 | — | — | 2300 |

Party-এর listing:

1. Company B — 1500 Tk
2. Company A — 2100 Tk
3. Company C — 2300 Tk

---

# 14. Product Visibility

Party শুধু তার own category-এর relevant Product দেখবে।

উদাহরণ:

```text
Party Category = Rice Mill
```

Party defaultভাবে Plastic Dana category-এর Product browse করবে না।

---

# 15. Inquiry System

Inquiry হলো **Party demand discovery system**।

যখন Party প্রয়োজনীয় Product খুঁজে পাবে না, তখন সে Inquiry submit করতে পারবে।

## 15.1 Inquiry Form

Inquiry form:

- Category
- Title
- Description
- Product/reference image — Optional
- Party information — System generated
- Created time — System generated

যেহেতু Party single category-এর অধীনে, সাধারণ flow-তে Inquiry category Party-এর category থেকেই auto-select করা যেতে পারে।

## 15.2 Inquiry Flow

```text
Party searches Product
        ↓
Product not found
        ↓
Create Inquiry
        ↓
Inquiry submitted
        ↓
Matching Category Companies notified
        ↓
Company views Inquiry
        ↓
Company contacts/responds to Party
        ↓
Party and Company discuss
        ↓
Order may be placed
```

## 15.3 Company Inquiry Access

Company নিজের category-এর Inquiry দেখতে পারবে।

যদি Company-এর কাছে requested Product থাকে:

- Party-এর সাথে contact/chat
- Product suggest
- Special Price offer
- Order process শুরু

## 15.4 Admin / Super Admin Inquiry Access

### Super Admin
সব Inquiry view করতে পারবে।

### Admin
শুধু assigned category-এর Inquiry view করতে পারবে।

Admin/Super Admin commercial negotiation করবে না; তারা oversight/audit করবে।

---

# 16. Order Management

Order শুরু করবে Party।

## 16.1 Order Creation

Party:

- Product select করবে
- Effective Price দেখবে
- Quantity select করবে
- Delivery-related information দেবে
- Order place করবে

## 16.2 Order Value

```text
Order Value = Effective Product Price × Quantity
```

Order Value app-এর মধ্যে display করা যাবে।

কিন্তু:

```text
Order Value ≠ Payment Record
```

---

# 17. Order Lifecycle

Recommended business lifecycle:

```text
Placed
  ↓
Accepted
  ↓
Driver Requested
  ↓
Delivery Assigned
  ↓
Picked Up
  ↓
In Transit
  ↓
Delivered
  ↓
Completed
```

Alternative terminal state:

```text
Cancelled
```

## Important

Order lifecycle-এ থাকবে না:

- Paid
- Unpaid
- Partially Paid
- Due
- Payment Pending

---

# 18. Company Order Management

Company নতুন Order পেলে:

- View
- Accept
- Reject / Cancel
- Delivery arrange

করতে পারবে।

Order Accept করার পর Company platform থেকে Driver খুঁজবে।

---

# 19. Driver Delivery Request System

## 19.1 Driver Discovery

Company Order accept করার পর:

- relevant Driver list দেখতে পারবে
- Driver performance/availability দেখতে পারবে
- delivery request পাঠাতে পারবে

Category-based Driver filtering প্রযোজ্য হবে।

## 19.2 Driver Request Flow

```text
Company sends Delivery Request
        ↓
Driver receives Request
        ↓
Driver Accepts / Rejects
        ↓
Accepted Driver becomes Assigned Driver
```

---

# 20. Pickup Proof

Driver Company-এর কাছ থেকে Product pickup করার সময় proof submit করবে।

Pickup Proof হতে পারে:

- Photo
- Timestamp
- Optional note
- Order/Delivery reference

এর business meaning:

```text
Driver officially received goods from Company
```

Pickup proof submit হওয়ার পর:

```text
Delivery Status = Picked Up
```

---

# 21. Delivery Proof

Party-এর কাছে Product পৌঁছানোর পর Driver delivery proof submit করবে।

Delivery Proof হতে পারে:

- Photo
- Timestamp
- Receiver confirmation-related evidence
- Optional note

এরপর:

```text
Delivery Status = Delivered
```

এবং business process অনুযায়ী:

```text
Order Status = Completed
```

হতে পারে।

---

# 22. Manual Payment Rule

## 22.1 Party → Company

Delivery complete হওয়ার পর Party এবং Company নিজেদের মধ্যে manually টাকা লেনদেন করবে।

```text
Party ↔ Company Payment = Outside App
```

## 22.2 Driver Payment

Driver-এর delivery charge / payment-ও:

```text
Manual / Outside App
```

## 22.3 App কখনো জানবে না

- কে টাকা দিয়েছে
- কত টাকা দিয়েছে
- full payment হয়েছে কি না
- due আছে কি না
- bank/cash transaction কীভাবে হয়েছে

---

# 23. Complaint System

Complaint হলো post-order/post-delivery service and dispute workflow।

Party Complaint করতে পারবে:

1. Company-এর বিরুদ্ধে
2. Driver / Delivery-এর বিরুদ্ধে

---

# 24. Company Complaint

Company-related Complaint হতে পারে:

- Wrong Product
- Product quality issue
- Quantity issue
- Company behavior
- Product information mismatch
- Order handling issue

## Company Rights

Company নিজের বিরুদ্ধে হওয়া Complaint:

- দেখতে পারবে
- response দিতে পারবে
- explanation দিতে পারবে
- supporting proof দিতে পারবে

কিন্তু Company:

```text
Complaint Resolved করতে পারবে না
```

---

# 25. Driver Complaint

Driver-related Complaint হতে পারে:

- Late delivery
- Driver behavior
- Damaged Product during delivery
- Pickup/Delivery dispute
- Delivery proof issue
- Delivery handling problem

## Driver Rights

Driver নিজের বিরুদ্ধে Complaint:

- দেখতে পারবে
- response দিতে পারবে
- explanation দিতে পারবে
- proof submit করতে পারবে

কিন্তু Driver:

```text
Complaint Resolved করতে পারবে না
```

---

# 26. Why Company Can See Driver Complaints

যদি কোনো Driver Company-এর Product delivery করে এবং সেই Delivery-এর বিরুদ্ধে Complaint আসে, তাহলে Company Complaint দেখতে পারবে।

কারণ:

```text
Company Product
    ↓
Company Order
    ↓
Company-selected / assigned Driver
    ↓
Driver Delivery
    ↓
Party Complaint
```

Company delivery chain-এর stakeholder।

তাই Driver-এর বিরুদ্ধে Company-related Delivery Complaint:

- Driver দেখতে পারবে
- Company দেখতে পারবে
- Admin দেখতে পারবে
- Super Admin দেখতে পারবে

---

# 27. Complaint Resolution Authority

Complaint final resolution authority:

```text
Admin
Super Admin
```

শুধুমাত্র এরা Complaint-কে final resolved status দিতে পারবে।

## Complaint Lifecycle Example

```text
Submitted
   ↓
Under Review
   ↓
Response Requested
   ↓
Company / Driver Responded
   ↓
Admin Review
   ↓
Resolved
```

Other possible states:

- Rejected
- Escalated
- Reopened

## Core Rule

```text
Company / Driver = Respond
Admin / Super Admin = Resolve
```

---

# 28. Chat System

Chat access intentionally restricted থাকবে।

## Chat Matrix

| User | Can Chat With |
|---|---|
| Super Admin | Admin |
| Admin | Super Admin, Company |
| Company | Admin, Driver, Party |
| Driver | Company, Party |
| Party | Company, Driver |

## Not Allowed Examples

```text
Super Admin ↔ Party   = No
Super Admin ↔ Driver  = No
Super Admin ↔ Company = No
Admin ↔ Party         = No
Admin ↔ Driver        = No
```

---

# 29. Notifications

Notification system business events-এর সাথে connected থাকবে।

উদাহরণ:

- Account approved
- Account rejected
- User suspended/banned
- Product Special Price assigned
- Order placed
- Order accepted
- Driver requested
- Driver accepted delivery
- Pickup proof submitted
- Delivery in transit
- Delivery completed
- Inquiry submitted
- Inquiry response
- Complaint submitted
- Complaint response
- Complaint resolved
- Admin action

---

# 30. Audit Logs

Audit Log হলো system-এর central governance record।

## 30.1 What Should Be Audited

### Account Activity
- registration
- verification
- approval
- rejection
- suspension
- ban
- unban

### Admin Activity
- Admin created
- Admin category assigned
- Admin category changed
- Admin action on users
- Complaint resolution

### Product Activity
- Product created
- Product edited
- Regular Price changed
- Offer Price changed
- Special Price assigned
- Special Price changed

### Order Activity
- Order placed
- Order accepted
- Order rejected
- Driver requested
- Delivery assigned
- Order cancelled
- Order completed

### Delivery Activity
- Delivery request
- Driver accepted/rejected
- Pickup proof
- Delivery status update
- Delivery proof

### Complaint Activity
- Complaint submitted
- Company response
- Driver response
- Admin update
- Complaint resolved
- Complaint reopened

### Inquiry Activity
- Inquiry submitted
- Company viewed/responded
- Inquiry closed/cancelled

### Chat / Moderation Relevant Activity
- moderation-related chat events
- abuse report
- account action after review

---

# 31. Audit Log Structure

প্রতিটি important audit event ideally answer করবে:

```text
Who?
Did What?
To Which Entity?
Under Which Category?
When?
From Which Role?
What Changed?
```

Example:

```text
Actor: Company ABC
Action: Special Price Updated
Target: Product A
Party: Party Rahman
Category: Rice Mill
Old Value: 2100
New Value: 1500
Timestamp: ...
```

---

# 32. Audit Visibility

## Super Admin

```text
Global Audit Logs
```

সব category-এর সব relevant audit দেখতে পারবে।

## Admin

```text
Assigned Categories Filtered Audit Logs
```

Admin-এর audit আলাদা permission system দিয়ে নয়; assigned category scope অনুযায়ী filter হবে।

## Company

Own company-related activity দেখতে পারবে যদি user-facing activity history দেওয়া হয়।

## Driver

Own delivery-related activity দেখতে পারবে।

## Party

Own order/inquiry/complaint-related activity history দেখতে পারবে।

---

# 33. Analytics Philosophy

Analytics App-এর operational data থেকে তৈরি হবে।

কারণ App payment process করে না, তাই Analytics-এ actual financial settlement-based metrics থাকবে না।

## Do Not Use

- Revenue received
- Paid amount
- Due amount
- Profit/Loss based on payment
- Payment success
- Outstanding balance

## Use Instead

- Order Value
- Order Count
- Completed Orders
- Cancelled Orders
- Product performance
- Offer performance
- Special Price usage
- Delivery completion rate
- Complaint rate
- Inquiry activity
- Inquiry-to-order conversion
- User engagement
- Response time
- Driver performance
- Company performance

---

# 34. Super Admin Analytics

Super Admin সবচেয়ে detailed analytics দেখতে পারবে।

## Platform Analytics

- Total Companies
- Active Companies
- Pending Companies
- Banned Companies
- Total Parties
- Total Drivers
- Total Admins
- Category-wise user count
- Total Products
- Total Orders
- Completed Orders
- Cancelled Orders
- Total Order Value
- Total Deliveries
- Delivery Completion Rate
- Total Inquiries
- Inquiry Response Rate
- Inquiry-to-Order Conversion
- Total Complaints
- Open Complaints
- Resolved Complaints
- Complaint Resolution Time
- Most Active Categories
- Top Products by order count
- Top Companies by order completion
- Top Drivers by delivery completion

## Individual Analytics

Super Admin চাইলে individual:

- Admin
- Company
- Driver
- Party

analytics drill-down করতে পারবে।

---

# 35. Admin Analytics

Admin তার assigned category-এর filtered analytics দেখতে পারবে।

Example:

```text
Admin Access:
- Rice Mill
- Plastic Dana
```

Admin analytics শুধু এই দুই category-এর data নিয়ে তৈরি হবে।

Admin দেখতে পারবে:

- Category Companies
- Category Parties
- Category Drivers
- Products
- Orders
- Order Value
- Deliveries
- Complaints
- Inquiries
- User performance
- Company performance
- Driver performance
- Party activity

---

# 36. Company Analytics

Company শুধু নিজের business-related analytics দেখবে।

Possible metrics:

- Total Products
- Active Products
- Product Views
- Orders Received
- Orders Accepted
- Orders Cancelled
- Orders Completed
- Total Order Value
- Top Ordered Products
- Offer Price Product Performance
- Special Price Usage
- Delivery Requests
- Successful Deliveries
- Average Delivery Completion Time
- Company Complaints
- Driver-related Complaints connected to Company Orders
- Inquiry Views
- Inquiry Responses
- Inquiry-to-Order Conversion

---

# 37. Driver Analytics

Driver নিজের performance analytics দেখবে।

Possible metrics:

- Delivery Requests Received
- Delivery Requests Accepted
- Delivery Requests Rejected
- Pending Deliveries
- Completed Deliveries
- Delivery Completion Rate
- Average Delivery Time
- Pickup Proof Count
- Delivery Proof Count
- Complaints Against Driver
- Complaint Rate
- Recent Performance Trend

---

# 38. Party Analytics

Party নিজের activity-related analytics দেখবে।

Possible metrics:

- Orders Placed
- Completed Orders
- Cancelled Orders
- Total Ordered Quantity
- Total Order Value
- Companies Ordered From
- Special Price Offers Received
- Inquiries Submitted
- Inquiry Responses Received
- Complaints Submitted
- Resolved Complaints
- Delivery History

---

# 39. Admin / Super Admin Individual Performance View

Admin এবং Super Admin user details page থেকে performance দেখতে পারবে।

## Company Performance

- Orders
- Completion Rate
- Cancellation Rate
- Product Count
- Inquiry Response Rate
- Complaint Rate
- Delivery Success
- Activity Trend

## Driver Performance

- Request Acceptance Rate
- Delivery Completion Rate
- Average Delivery Time
- Complaint Count
- Complaint Rate
- Proof Submission Consistency

## Party Activity

- Order Frequency
- Completed Orders
- Cancellation Behavior
- Inquiry Usage
- Complaint Frequency
- Platform Activity

## Admin Performance — Super Admin Only

- Categories Managed
- Verification Actions
- Complaint Resolution Actions
- User Moderation Actions
- Audit Activity
- Response/Action Trend

---

# 40. User Verification Flow

Company, Driver এবং Party-এর common flow:

```text
Registration
    ↓
Documents / Information Submitted
    ↓
Pending Verification
    ↓
Admin / Super Admin Review
    ↓
Approved
```

Alternative:

```text
Rejected
Suspended
Banned
```

Admin শুধু তার assigned category-এর registration review করবে।

Super Admin সব category-এর review করতে পারবে।

---

# 41. User Ban / Moderation

Super Admin সব Company, Driver, Party manage এবং ban করতে পারবে।

Category Admin তার scope-এর user operationally manage করবে।

যদি future policy অনুযায়ী Admin-এর ban action allow করা হয়, সেটি category-scoped হবে।

সব moderation action Audit Log-এ record হবে।

---

# 42. Data Visibility Summary

| Data Area | Super Admin | Admin | Company | Driver | Party |
|---|---|---|---|---|---|
| Categories | All + Manage | Assigned View | Own Category | Own Category | Own Category |
| Admins | All + Manage | No Global Manage | No | No | No |
| Companies | All | Assigned Categories | Own | Related | Related |
| Parties | All | Assigned Categories | Related | Delivery-related | Own |
| Drivers | All | Assigned Categories | Delivery-related | Own | Delivery-related |
| Products | All View | Assigned Categories | Own Manage | Delivery-related | Own Category |
| Orders | All View | Assigned Categories | Own Orders Manage | Assigned Delivery | Own |
| Delivery | All View | Assigned Categories | Own Orders | Own Assigned | Own Orders |
| Inquiry | All View | Assigned Categories | Own Category | No | Own |
| Complaint | All Manage | Assigned Categories Manage | Related Respond | Related Respond | Own Create |
| Analytics | Global + Individual | Category-filtered + Individual | Own | Own | Own |
| Audit Logs | Global | Category-filtered | Own/Related | Own/Related | Own/Related |
| Chat | Admin | Super Admin, Company | Admin, Driver, Party | Company, Party | Company, Driver |

---

# 43. Main End-to-End Product Order Flow

```text
Company Registered
      ↓
Verified
      ↓
Company Adds Product
      ↓
Regular Price Set
      ↓
Optional Offer Price Set
      ↓
Optional Party Special Price Set
      ↓
Party Browses Products
      ↓
Products Sorted by Effective Price
      ↓
Party Selects Product + Quantity
      ↓
Order Placed
      ↓
Company Accepts Order
      ↓
Company Searches Driver
      ↓
Delivery Request Sent
      ↓
Driver Accepts
      ↓
Driver Picks Product
      ↓
Pickup Proof Submitted
      ↓
In Transit
      ↓
Party Receives Product
      ↓
Delivery Proof Submitted
      ↓
Order Completed
      ↓
Money Settlement Happens Outside App
```

---

# 44. Main Inquiry Flow

```text
Party Needs Product
      ↓
Searches Product
      ↓
Product Not Found
      ↓
Creates Inquiry
      ↓
Matching Category Companies Notified
      ↓
Interested Company Views Inquiry
      ↓
Company Contacts Party
      ↓
Product / Price Discussion
      ↓
Optional Special Price
      ↓
Party Places Order
      ↓
Normal Order + Delivery Flow
```

---

# 45. Main Complaint Flow

```text
Party Submits Complaint
      ↓
Complaint Type:
Company / Driver
      ↓
Relevant Company / Driver Can View
      ↓
Company / Driver Responds
      ↓
Admin Reviews
      ↓
Super Admin Can Audit / Intervene
      ↓
Admin or Super Admin Resolves
```

## Important Driver Complaint Visibility

```text
Driver Complaint
      ↓
Related Delivery
      ↓
Related Company Product/Order
      ↓
Driver + Company + Admin + Super Admin Can View
```

---

# 46. Main Admin Scope Flow

```text
Super Admin Creates Admin
      ↓
Assigns Categories
      ↓
Admin Logs In
      ↓
System Loads Assigned Categories
      ↓
All Admin Data Automatically Filtered
      ↓
Admin Manages Full Operational Scope
```

Example:

```text
Admin A
Access:
- Rice Mill
- Plastic Dana

Can manage:
- all Companies in these categories
- all Parties in these categories
- all Drivers in these categories
- all Complaints in these categories
- all Inquiries in these categories
- all Orders/Deliveries in these categories
- all filtered Audit Logs
- all filtered Analytics
```

---

# 47. Recommended Core Modules

Final functional modules:

1. Authentication
2. Registration
3. Verification
4. Category Management
5. Admin Management
6. Company Management
7. Party Management
8. Driver Management
9. Product Management
10. Pricing Management
11. Regular / Offer / Special Price
12. Product Marketplace
13. Product Search & Sorting
14. Inquiry Management
15. Order Management
16. Delivery Request Management
17. Pickup Proof
18. Delivery Proof
19. Complaint Management
20. Chat
21. Notifications
22. Analytics
23. Audit Logs
24. Profile
25. Settings
26. User Moderation / Ban

---

# 48. Modules Explicitly Removed from Scope

The following modules are **not part of the current Price Check BD business model**:

- Payment Gateway
- Payment Transaction
- Payment Verification
- Payment History
- Due Management
- Ledger
- Accounting
- Debit/Credit
- Financial Receipt
- Payment Reminder
- Paid/Unpaid Status
- Profit/Loss based on platform transactions

Older planning documents may contain these concepts, but this document supersedes those parts.

---

# 49. Role-Specific Dashboard Philosophy

## Super Admin Dashboard

Main question:

```text
Is the whole platform healthy and properly controlled?
```

Focus:

- Global Analytics
- Pending Verification
- Complaints
- User Growth
- Category Performance
- Order/Delivery Performance
- Inquiry
- Audit
- Admin Performance
- Company/Driver/Party Performance

---

## Admin Dashboard

Main question:

```text
What is happening inside my assigned categories?
```

Focus:

- Assigned Categories
- Pending Verification
- Companies
- Parties
- Drivers
- Complaints
- Orders
- Deliveries
- Inquiry
- Filtered Analytics
- Filtered Audit Logs

---

## Company Dashboard

Main question:

```text
How is my company performing and what needs action?
```

Focus:

- Products
- Orders
- Delivery Requests
- Drivers
- Inquiry
- Special Price
- Complaints
- Analytics

---

## Driver Dashboard

Main question:

```text
What deliveries do I need to complete?
```

Focus:

- New Requests
- Accepted Deliveries
- Pending
- Pickup Proof
- Delivery Proof
- Complaints
- Analytics

---

## Party Dashboard

Main question:

```text
What can I buy, what have I ordered, and what is happening with my orders?
```

Focus:

- Products
- Lowest Price
- Special Offers
- Orders
- Deliveries
- Inquiry
- Complaints
- Analytics

---

# 50. System Design Principles

## Principle 1 — Category Is the Scope

Admin access category-driven হবে।

## Principle 2 — Ownership Matters

Company নিজের Product/Order manage করবে।

Party নিজের Order/Inquiry/Complaint manage করবে।

Driver নিজের assigned Delivery manage করবে।

## Principle 3 — Money Is Outside the Platform

App order value জানবে, payment transaction জানবে না।

## Principle 4 — Pricing Priority Is Fixed

```text
Special Price > Offer Price > Regular Price
```

## Principle 5 — Complaint Respond and Resolve Are Different

```text
Company / Driver = Respond
Admin / Super Admin = Resolve
```

## Principle 6 — Audit Everything Important

Sensitive business actions audit trail-এ থাকবে।

## Principle 7 — Analytics Are Operational

Analytics app activity এবং operational performance-এর ওপর ভিত্তি করবে, actual financial settlement-এর ওপর নয়।

## Principle 8 — Super Admin Is Global

সব category, সব user, সব activity।

## Principle 9 — Admin Is Full Within Assigned Categories

Assigned category-এর operational data-তে full scoped access।

## Principle 10 — Chat Is Relationship-Controlled

সব user সবার সাথে chat করতে পারবে না।

---

# 51. Final System Mental Model

```text
                         SUPER ADMIN
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   Categories              Admins              Global Audit
        │
        ↓
  Category Access
        │
        ↓
       ADMIN
        │
        ├── Companies
        ├── Parties
        ├── Drivers
        ├── Products
        ├── Orders
        ├── Deliveries
        ├── Inquiries
        ├── Complaints
        ├── Analytics
        └── Audit Logs


CATEGORY
   │
   ├──────── COMPANY
   │            │
   │            ├── Product
   │            ├── Regular Price
   │            ├── Offer Price
   │            ├── Party Special Price
   │            ├── Order
   │            ├── Delivery Request
   │            ├── Inquiry Response
   │            ├── Complaint Response
   │            └── Analytics
   │
   ├──────── PARTY
   │            │
   │            ├── Browse Product
   │            ├── See Effective Price
   │            ├── Order
   │            ├── Inquiry
   │            ├── Complaint
   │            └── Analytics
   │
   └──────── DRIVER
                │
                ├── Delivery Request
                ├── Accept / Reject
                ├── Pickup Proof
                ├── Delivery
                ├── Delivery Proof
                ├── Complaint Response
                └── Analytics
```

---

# 52. Final Summary

Price Check BD-এর final business identity:

> **A category-driven B2B marketplace and operational coordination platform where Companies publish products and prices, Parties discover and order products, Drivers execute deliveries, Inquiries connect unmet demand with Companies, Complaints are reviewed and resolved by Admin/Super Admin, and all important platform activity is tracked through Analytics and Audit Logs.**

সবচেয়ে গুরুত্বপূর্ণ boundary:

```text
Price Check BD coordinates business.
Price Check BD does not process money.
```

এবং সবচেয়ে গুরুত্বপূর্ণ governance rule:

```text
Super Admin = Global Access
Admin = Full Access Within Assigned Categories
Company / Driver = Complaint Response
Admin / Super Admin = Complaint Resolution
```

এটাই Price Check BD-এর latest business logic source of truth।
