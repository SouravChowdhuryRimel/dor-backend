# 📱 Order Accept, Driver Assign & Remove - Flutter Integration Guide

This document provides a comprehensive integration guide for Flutter developers implementing **Order Acceptance**, **Driver Assignment**, **Driver Removal**, and handling real-time **WebSocket & Push Notifications** across **Company (Vendor)**, **Party (Customer)**, and **Driver** applications.

---

## 📑 Table of Contents
1. [Overview & Role Permissions](#1-overview--role-permissions)
2. [API Endpoints Reference](#2-api-endpoints-reference)
3. [Dart Models](#3-dart-models)
4. [Order API Service (Dio Implementation)](#4-order-api-service-dio-implementation)
5. [Controller / UI Action Examples](#5-controller--ui-action-examples)
6. [3-Way Notification & WebSocket Handling](#6-3-way-notification--websocket-handling)
7. [Error Handling & Edge Cases](#7-error-handling--edge-cases)

---

## 1. Overview & Role Permissions

| Action | Allowed Roles | Description |
| :--- | :--- | :--- |
| **Accept Order** | `VENDOR`, `ADMIN`, `SUPER_ADMIN` | Accept a pending order. `driverId` is **OPTIONAL**. |
| **Assign / Change Driver** | `VENDOR`, `PARTY`, `ADMIN`, `SUPER_ADMIN` | Assign a new driver or replace the currently assigned driver. |
| **Remove Driver** | `VENDOR`, `PARTY`, `ADMIN`, `SUPER_ADMIN` | Unassign the driver from the order without cancelling the order. |

---

## 2. API Endpoints Reference

### 2.1. Accept Order (Driver Optional)
- **Method:** `PATCH`
- **Path:** `/api/v1/orders/{orderId}/accept`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Request Body (Optional):**
```json
{
  "driverId": "d290f1ee-6c54-4b01-90e6-d701748f0851"
}
```
> *Note: Sending `{}` or omitting the body accepts the order without assigning a driver.*

- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Order accepted successfully",
  "data": {
    "orderId": "uuid",
    "showOrderId": "ORD-123456",
    "status": "ACCEPTED",
    "deliveries": []
  }
}
```

---

### 2.2. Assign / Update Driver
- **Method:** `PATCH`
- **Path:** `/api/v1/orders/{orderId}/assign-driver`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Request Body:**
```json
{
  "driverId": "d290f1ee-6c54-4b01-90e6-d701748f0851"
}
```

- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Driver assigned to order successfully",
  "data": {
    "orderId": "uuid",
    "showOrderId": "ORD-123456",
    "status": "ACCEPTED",
    "deliveries": [
      {
        "deliveryId": "uuid",
        "driverId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
        "status": "PENDING"
      }
    ]
  }
}
```

---

### 2.3. Remove Driver

#### Option A: Dedicated Route (Recommended)
- **Method:** `PATCH`
- **Path:** `/api/v1/orders/{orderId}/remove-driver`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Request Body:** *None*

#### Option B: Via `assign-driver` with `null`
- **Method:** `PATCH`
- **Path:** `/api/v1/orders/{orderId}/assign-driver`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Request Body:**
```json
{
  "driverId": null
}
```

- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Driver removed from order successfully",
  "data": {
    "orderId": "uuid",
    "showOrderId": "ORD-123456",
    "status": "ACCEPTED",
    "deliveries": [
      {
        "deliveryId": "uuid",
        "driverId": null,
        "status": "PENDING"
      }
    ]
  }
}
```

---

## 3. Dart Models

```dart
// lib/data/models/order_driver_request.dart

class AcceptOrderRequest {
  final String? driverId;

  AcceptOrderRequest({this.driverId});

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (driverId != null && driverId!.trim().isNotEmpty) {
      map['driverId'] = driverId!.trim();
    }
    return map;
  }
}

class AssignDriverRequest {
  final String? driverId;

  AssignDriverRequest({this.driverId});

  Map<String, dynamic> toJson() => {
    'driverId': driverId,
  };
}
```

---

## 4. Order API Service (Dio Implementation)

```dart
// lib/data/services/order_api_service.dart

import 'package:dio/dio.dart';

class OrderApiService {
  final Dio _dio;

  OrderApiService(this._dio);

  /// 1. Accept Order (Company Only)
  /// If [driverId] is null or empty, the order is accepted without a driver.
  Future<Response> acceptOrder({
    required String orderId,
    String? driverId,
  }) async {
    final payload = AcceptOrderRequest(driverId: driverId);
    return await _dio.patch(
      '/api/v1/orders/$orderId/accept',
      data: payload.toJson(),
    );
  }

  /// 2. Assign or Change Driver (Company or Party)
  Future<Response> assignDriver({
    required String orderId,
    required String driverId,
  }) async {
    return await _dio.patch(
      '/api/v1/orders/$orderId/assign-driver',
      data: {'driverId': driverId},
    );
  }

  /// 3. Remove Driver from Order (Company or Party)
  Future<Response> removeDriver({
    required String orderId,
  }) async {
    return await _dio.patch(
      '/api/v1/orders/$orderId/remove-driver',
    );
  }
}
```

---

## 5. Controller / UI Action Examples

```dart
// lib/presentation/controllers/order_details_controller.dart

import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../data/services/order_api_service.dart';

class OrderDetailsController extends ChangeNotifier {
  final OrderApiService _orderService;
  bool _isLoading = false;

  bool get isLoading => _isLoading;

  OrderDetailsController(this._orderService);

  /// 🏢 Company Accepts Order
  Future<bool> acceptOrder(BuildContext context, String orderId, {String? selectedDriverId}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _orderService.acceptOrder(
        orderId: orderId,
        driverId: selectedDriverId,
      );

      final msg = res.data['message'] ?? 'অর্ডারটি সফলভাবে গৃহীত হয়েছে!';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.green),
      );
      return true;
    } on DioException catch (e) {
      _showError(context, e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// 🏢/👤 Company or Party Assigns Driver
  Future<bool> assignDriver(BuildContext context, String orderId, String driverId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _orderService.assignDriver(
        orderId: orderId,
        driverId: driverId,
      );

      final msg = res.data['message'] ?? 'ড্রাইভার সফলভাবে নির্ধারণ করা হয়েছে!';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.green),
      );
      return true;
    } on DioException catch (e) {
      _showError(context, e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// 🏢/👤 Company or Party Removes Driver
  Future<bool> removeDriver(BuildContext context, String orderId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _orderService.removeDriver(orderId: orderId);

      final msg = res.data['message'] ?? 'ড্রাইভার সফলভাবে অপসারণ করা হয়েছে!';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.blueGrey),
      );
      return true;
    } on DioException catch (e) {
      _showError(context, e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _showError(BuildContext context, DioException e) {
    final errorMessage = e.response?.data?['message'] ?? 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(errorMessage.toString()), backgroundColor: Colors.red),
    );
  }
}
```

---

## 6. 3-Way Notification & WebSocket Handling

Whenever an order is accepted, or a driver is assigned/changed/removed, notifications are dispatched to **Driver, Company, and Party** simultaneously via WebSockets and Firebase Cloud Messaging (FCM).

### Notification Event Matrix

| Scenario | 🚚 Driver App | 🏢 Company App | 👤 Party (Customer) App |
| :--- | :--- | :--- | :--- |
| **Driver Assigned** | `DRIVER_ASSIGNED`<br>*(নতুন ডেলিভারি নির্ধারিত)* | `DRIVER_ASSIGNED`<br>*(ড্রাইভার নির্ধারিত হয়েছে)* | `DRIVER_ASSIGNED`<br>*(ড্রাইভার নির্ধারিত হয়েছে)* |
| **Driver Changed (Reassigned)** | **Old Driver:** `DRIVER_REMOVED`<br>**New Driver:** `DRIVER_ASSIGNED` | `DRIVER_ASSIGNED` | `DRIVER_ASSIGNED` |
| **Driver Removed** | `DRIVER_REMOVED`<br>*(ডেলিভারি দায়িত্ব প্রত্যাহার)* | `DRIVER_REMOVED`<br>*(ড্রাইভার অপসারণ করা হয়েছে)* | `DRIVER_REMOVED`<br>*(ড্রাইভার অপসারণ করা হয়েছে)* |
| **Order Accepted** | — | — | `ORDER_ACCEPTED`<br>*(অর্ডার গৃহীত হয়েছে)* |

---

### Notification Payload Parser in Flutter

```dart
// lib/core/notifications/order_notification_handler.dart

class OrderNotificationHandler {
  static void handleNotificationData(Map<String, dynamic> data) {
    final String? type = data['type'];
    final String? orderId = data['orderId'];
    final String? showOrderId = data['showOrderId'];

    if (type == null || orderId == null) return;

    switch (type) {
      case 'DRIVER_ASSIGNED':
        // 1. Refresh active order / delivery list
        // 2. Update driver info badge on UI
        debugPrint('[Notification] Driver Assigned for Order: $showOrderId');
        break;

      case 'DRIVER_REMOVED':
        // 1. If Driver App: Remove order from driver active queue
        // 2. If Company/Party App: Reset assigned driver UI state
        debugPrint('[Notification] Driver Removed for Order: $showOrderId');
        break;

      case 'ORDER_ACCEPTED':
        // Party App: Update status to Accepted
        debugPrint('[Notification] Order Accepted: $showOrderId');
        break;

      default:
        debugPrint('[Notification] Unhandled type: $type');
    }
  }
}
```

---

## 7. Error Handling & Edge Cases

| Status Code | Reason | User-Friendly Message |
| :--- | :--- | :--- |
| `400 Bad Request` | Order is already `CANCELLED` or `DELIVERED` | "বাতিল বা ডেলিভার্ড অর্ডারে ড্রাইভার পরিবর্তন করা সম্ভব নয়।" |
| `403 Forbidden` | User is not the owner company or party | "আপনার এই অর্ডারে ড্রাইভার পরিবর্তনের অনুমতি নেই।" |
| `404 Not Found` | Order or Driver ID does not exist | "অর্ডার বা ড্রাইভার খুঁজে পাওয়া যায়নি।" |

---
