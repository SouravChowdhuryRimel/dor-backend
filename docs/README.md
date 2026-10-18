# 📚 Price Check BD — Documentation & Guides

Welcome to the **Price Check BD** project documentation directory. This folder contains all architectural specifications, business logic rules, integration guides for the Flutter mobile applications, and DevOps deployment runbooks.

---

## 📑 Document Directory

| Document | Type | Description |
| :--- | :--- | :--- |
| [**Business Logic Specification**](./Price_Check_BD_Final_Business_Logic.md) | Specification | Master business rules, role capabilities (Super Admin, Admin, Company, Driver, Party), and domain workflows. |
| [**CI/CD & Deployment Guide**](./CI_CD_GUIDE.md) | DevOps | GitHub Actions workflow, GHCR container image publishing, Docker Compose setup, and VPS deployment runbook. |
| [**Inquiry & RFQ Flow**](./INQUIRY_FLOW.md) | Architecture | Reverse-auction inquiry flow, quote matching, response rules, and API lifecycle. |
| [**Inquiry Flutter Integration Guide**](./INQUIRY_FLUTTER_GUIDE.md) | Mobile Guide | Step-by-step Flutter guide for party inquiry creation, multi-image upload, and vendor quote management. |
| [**Order & Delivery Flow**](./ORDER_AND_DELIVERY_FLOW.md) | Architecture | Comprehensive state transitions from order creation, company acceptance, driver assignment, to delivery fulfillment. |
| [**Order & Driver Assignment Guide**](./ORDER_DRIVER_ASSIGNMENT_FLUTTER_GUIDE.md) | Mobile Guide | Flutter guide for company order acceptance, assigning/reassigning drivers, driver tracking, and real-time socket events. |
| [**Flutter Chat Integration**](./FLUTTER_CHAT_INTEGRATION.md) | Mobile Guide | Messenger-style 1-on-1 chat, live location sharing, unread message badges, and push notifications. |
| [**Flutter Chat Socket & REST Guide**](./FLUTTER_CHAT_INTEGRATION_GUIDE.md) | Mobile Guide | In-depth Socket.io connection handling, reconnection strategies, message ack callbacks, and payload structures. |
| [**Flutter Notification Integration**](./FLUTTER_NOTIFICATION_INTEGRATION_GUIDE.md) | Mobile Guide | In-app notification list, unread badge counter handling, push toggle preferences, and Firebase FCM setup. |
| [**Seller Keywords & Inquiry Routing**](./SELLER_KEYWORDS_AND_INQUIRY_FLUTTER_GUIDE.md) | Mobile Guide | Seller profile tag management, global keyword validation, and automated inquiry distribution. |

---

> [!NOTE]
> If you create a new integration guide or workflow document, please place it in this `docs/` folder and add a reference here.
