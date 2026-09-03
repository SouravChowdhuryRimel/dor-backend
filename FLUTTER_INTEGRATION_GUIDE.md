# Flutter Integration Guide: Notification & Inquiry System

এই গাইডে **Flutter Mobile App** এর জন্য **Notification** (FCM Push, Socket.io Real-time, REST API) এবং **Inquiry** (ইনকোয়ারি সাবমিশন, ইমেজ আপলোড, ফিল্টারিং) মডিউলের সম্পূর্ণ ইন্টিগ্রেশন নির্দেশনা ও ডার্ট (Dart) কোড দেওয়া হলো।

---

## 📌 ১. ওভারভিউ ও আর্কিটেকচার

| ফিচার | টেকনোলজি / অ্যান্ডপয়েন্ট | বিবরণ |
| :--- | :--- | :--- |
| **Push Notification** | Firebase Cloud Messaging (FCM) | ব্যাকগ্রাউন্ড বা অ্যাপ বন্ধ থাকা অবস্থায় পুশ নোটিফিকেশন পাঠাতে। |
| **Real-time Notification** | Socket.io Client | অ্যাপ ওপেন থাকা অবস্থায় মুহূর্তের মধ্যে (ইন-অ্যাপ) নোটিফিকেশন অ্যালার্টের জন্য। |
| **Notification Storage & History** | REST API (`/api/v1/notifications`) | ডাটাবেজে জমা হওয়া নোটিফিকেশন লিস্ট ও `isRead` আপডেট করতে। |
| **Inquiry Management** | REST API (`/api/v1/inquiries`) | নতুন ইনকোয়ারি (ছবিসহ) জমা দেওয়া, দেখা ও আপডেট করতে। |

---

## 🔔 ২. Notification Module Integration

### A. FCM (Firebase Push Notification) Setup

#### ১. Login Endpoint এ FCM Token পাঠানো
ইউজার (Party, Company, Driver, Admin) লগইন করার সময় Firebase Messaging থেকে Token নিয়ে ব্যাকএন্ডের `fcmToken` বা `fcm-token` ফিল্ডে পাঠাতে হবে।

```dart
// Dart / Flutter Login Request Example
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:dio/dio.dart';

Future<void> loginUser(String phoneNumber, String password) async {
  // 1. Get FCM Token from Firebase
  String? fcmToken = await FirebaseMessaging.instance.getToken();

  final dio = Dio();
  final response = await dio.post(
    'https://your-domain.com/api/v1/auth/signin',
    data: {
      'phoneNumber': phoneNumber,
      'password': password,
      'fcmToken': fcmToken, // Optional field
    },
  );

  if (response.statusCode == 200 || response.statusCode == 201) {
    String token = response.data['data']['accessToken'];
    // Save token to SecureStorage
  }
}
```

#### ২. Logout এ FCM Token মুছে ফেলা
ইউজার লগআউট করার সময় ব্যাকএন্ডের token-delete API হিট করতে হবে:

- **Endpoint**: `DELETE /api/v1/auth/fcm-token`
- **Headers**: `Authorization: Bearer <ACCESS_TOKEN>`

```dart
Future<void> removeFcmToken(String accessToken) async {
  final dio = Dio();
  await dio.delete(
    'https://your-domain.com/api/v1/auth/fcm-token',
    options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
  );
}
```

---

### B. Socket.IO Real-time Notification Client

অ্যাপ ওপেন থাকাকালীন Socket.IO কানেক্ট করে রিয়েল-টাইম রুমের ইভেন্ট শুনতে হবে।

#### 📦 Flutter Package Requirement
`pubspec.yaml` এ যুক্ত করুন:
```yaml
dependencies:
  socket_io_client: ^2.0.3.1
  firebase_messaging: ^15.0.0
  flutter_local_notifications: ^17.0.0
```

#### Socket Service Implementation

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  late IO.Socket socket;

  void connectSocket(String jwtToken, String userRole, String userId) {
    socket = IO.io(
      'https://your-domain.com',
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setExtraHeaders({'Authorization': 'Bearer $jwtToken'})
          .build(),
    );

    socket.connect();

    socket.onConnect((_) {
      print('✅ Socket Connected! ID: ${socket.id}');
    });

    // 1. Listen for notifications based on Role & User ID
    // Dynamic Event Name Pattern: notification_<role>_<id>
    String eventName = '';
    if (userRole == 'PARTY') {
      eventName = 'notification_party_$userId';
    } else if (userRole == 'VENDOR') {
      eventName = 'notification_company_$userId';
    } else if (userRole == 'DRIVER') {
      eventName = 'notification_driver_$userId';
    } else if (userRole == 'ADMIN' || userRole == 'SUPER_ADMIN') {
      eventName = 'admin_notification';
    }

    if (eventName.isNotEmpty) {
      socket.on(eventName, (data) {
        print('🔔 Real-time Notification Received: $data');
        // Show in-app banner, snackbar or refresh notification list UI
        // data contains: { notificationId, title, message, createdAt, ... }
      });
    }

    socket.onDisconnect((_) => print('❌ Socket Disconnected'));
  }

  void disconnect() {
    socket.disconnect();
  }
}
```

---

### C. Notification REST APIs

#### 1. Fetch All Notifications for Logged-in Account
- **Method**: `GET`
- **URL**: `/api/v1/notifications?page=1&limit=10`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`

```json
// Response Format (200 OK)
{
  "success": true,
  "statusCode": 200,
  "message": "Notifications retrieved successfully",
  "data": {
    "data": [
      {
        "notificationId": "353be7a8-23b8-4ef2-b3a9-267cb523809d",
        "title": "নতুন প্রোডাক্ট যুক্ত হয়েছে",
        "message": "কোম্পানি \"Seed Company\" একটি নতুন প্রোডাক্ট যুক্ত করেছে: \"প্রিমিয়াম ৬০ গ্রেড রড 16mm\"",
        "isRead": false,
        "createdAt": "2026-09-03T21:10:46.609Z",
        "inquiry": null
      }
    ],
    "meta": {
      "total": 12,
      "page": 1,
      "limit": 10,
      "totalPages": 2,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

#### 2. Mark Notification as Read
- **Method**: `PATCH`
- **URL**: `/api/v1/notifications/:notificationId/read`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`

---

## 📝 ৩. Inquiry Module Integration

ইনকোয়ারি মডিউল শুধুমাত্র `PARTY` (কাস্টমার) রোল থেকে সাবমিট করা যাবে। অন্য যে কোনো রোল বা পাবলিক গ্রাহক ইনকোয়ারি লিস্ট দেখতে পারবেন।

### A. Create New Inquiry (Multipart Form Data with Image)

- **Method**: `POST`
- **URL**: `/api/v1/inquiries`
- **Headers**: 
  - `Authorization: Bearer <PARTY_JWT_TOKEN>`
  - `Content-Type: multipart/form-data`

#### Request Body Fields:
- `title` (String, Required) - ইনকোয়ারির শিরোনাম
- `description` (String, Required) - ইনকোয়ারির বিস্তারিত বিবরণ
- `categoryId` (String, Required) - সংশ্লিষ্ট ক্যাটাগরি ID
- `image` (File, Optional) - ইনকোয়ারি পণ্যের ছবি (PNG/JPEG)

#### Flutter Dart Code Example:
```dart
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';

Future<bool> createInquiry({
  required String partyToken,
  required String title,
  required String description,
  required String categoryId,
  XFile? imageFile,
}) async {
  final dio = Dio();

  FormData formData = FormData.fromMap({
    'title': title,
    'description': description,
    'categoryId': categoryId,
    if (imageFile != null)
      'image': await MultipartFile.fromFile(
        imageFile.path,
        filename: imageFile.name,
      ),
  });

  try {
    final response = await dio.post(
      'https://your-domain.com/api/v1/inquiries',
      data: formData,
      options: Options(
        headers: {
          'Authorization': 'Bearer $partyToken',
          'Content-Type': 'multipart/form-data',
        },
      ),
    );

    if (response.statusCode == 201) {
      print('✅ Inquiry Created Successfully: ${response.data}');
      return true;
    }
  } catch (e) {
    print('❌ Error creating inquiry: $e');
  }
  return false;
}
```

---

### B. Get All Inquiries (With Filtering & Pagination)

- **Method**: `GET`
- **URL**: `/api/v1/inquiries?page=1&limit=10&categoryId=XYZ&partyId=ABC`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`

#### Query Parameters (All Optional):
- `page` (int) - Default: `1`
- `limit` (int) - Default: `10`
- `categoryId` (string) - নির্দিষ্ট ক্যাটাগরির ইনকোয়ারি ফিল্টার করতে
- `partyId` (string) - নির্দিষ্ট পার্টির ইনকোয়ারি ফিল্টার করতে
- `search` (string) - শিরোনাম/বিবরণে সার্চ করতে

---

### C. Update Inquiry (Optional Payload & Optional Image)

- **Method**: `PATCH`
- **URL**: `/api/v1/inquiries/:id`
- **Headers**: `Authorization: Bearer <PARTY_JWT_TOKEN>`
- **Content-Type**: `multipart/form-data`

*নোট: এই অ্যান্ডপয়েন্টের সকল পেলোড ফিল্ড অপশনাল (`title`, `description`, `categoryId`, `image`)।*

```dart
Future<bool> updateInquiry({
  required String partyToken,
  required String inquiryId,
  String? title,
  String? description,
  String? categoryId,
  XFile? newImageFile,
}) async {
  final dio = Dio();

  Map<String, dynamic> dataMap = {};
  if (title != null) dataMap['title'] = title;
  if (description != null) dataMap['description'] = description;
  if (categoryId != null) dataMap['categoryId'] = categoryId;
  if (newImageFile != null) {
    dataMap['image'] = await MultipartFile.fromFile(
      newImageFile.path,
      filename: newImageFile.name,
    );
  }

  FormData formData = FormData.fromMap(dataMap);

  final response = await dio.patch(
    'https://your-domain.com/api/v1/inquiries/$inquiryId',
    data: formData,
    options: Options(
      headers: {
        'Authorization': 'Bearer $partyToken',
        'Content-Type': 'multipart/form-data',
      },
    ),
  );

  return response.statusCode == 200;
}
```

---

### D. Delete Inquiry

- **Method**: `DELETE`
- **URL**: `/api/v1/inquiries/:id`
- **Headers**: `Authorization: Bearer <PARTY_JWT_TOKEN>`

---

## 🛠️ ৪. Dart Model Classes (Copy & Paste Ready)

### Notification Model (`notification_model.dart`)
```dart
class NotificationModel {
  final String notificationId;
  final String title;
  final String message;
  final bool isRead;
  final String? companyId;
  final String? partyId;
  final String? driverId;
  final String? userId;
  final String? inquiryId;
  final DateTime createdAt;

  NotificationModel({
    required this.notificationId,
    required this.title,
    required this.message,
    required this.isRead,
    this.companyId,
    this.partyId,
    this.driverId,
    this.userId,
    this.inquiryId,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      notificationId: json['notificationId'] ?? '',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      isRead: json['isRead'] ?? false,
      companyId: json['companyId'],
      partyId: json['partyId'],
      driverId: json['driverId'],
      userId: json['userId'],
      inquiryId: json['inquiryId'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
```

### Inquiry Model (`inquiry_model.dart`)
```dart
class InquiryModel {
  final String inquiryId;
  final String title;
  final String description;
  final String? imageUrl;
  final String categoryId;
  final String partyId;
  final String createdAt;

  InquiryModel({
    required this.inquiryId,
    required this.title,
    required this.description,
    this.imageUrl,
    required this.categoryId,
    required this.partyId,
    required this.createdAt,
  });

  factory InquiryModel.fromJson(Map<String, dynamic> json) {
    return InquiryModel(
      inquiryId: json['inquiryId'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      imageUrl: json['imageUrl'],
      categoryId: json['categoryId'] ?? '',
      partyId: json['partyId'] ?? '',
      createdAt: json['createdAt'] ?? '',
    );
  }
}
```
