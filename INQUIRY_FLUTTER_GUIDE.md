# Product Inquiry & Response System - Flutter Integration Guide

This guide provides complete instructions, Dart data models, API service methods, and UI flow recommendations for integrating the **Product Inquiry & Response System** in the Flutter mobile application for both **Party (Customer)** and **Company (Vendor)** roles.

---

## 📌 Feature Summary & Business Logic

### 1. Party (Customer) Capabilities
- **Create Inquiry**: Submit a request for products not currently listed. Includes title, product name, description, quantity, delivery deadline date, and **multiple images**.
- **Auto Category Selection**: `categoryId` is optional. If omitted by the Party, the backend automatically assigns `party.categoryId` from their authenticated profile.
- **View Offers/Responses**: View total `responseCount` and **all private company responses** (price offers, comments, company contact details, and linked direct product IDs).
- **Close Inquiry**: Tap a **"Close Inquiry"** button once a deal is struck. Changing status to `CLOSED` locks the post from receiving further responses.

### 2. Company (Vendor) Capabilities
- **Automated Push Notifications**: All verified companies in the inquiry's category automatically receive a push notification when an inquiry is created.
- **Submit Response / Offer**: Companies can submit a price offer (`offeredPrice`), message (`comment`), and optional direct product link (`productId`).
- **Privacy Rule**: When a company views an inquiry, it sees the total `responseCount` across all competitors for transparency, but **only sees its OWN response** in the details. Competitor offers remain hidden.

---

## 🌐 Base URL & Headers

```text
Base URL: http://<YOUR_SERVER_IP>:3000/api/v1
```

### Common Headers
```json
{
  "Authorization": "Bearer <ACCESS_TOKEN>"
}
```

---

## 🛠️ Dart Data Models

### 1. `InquiryModel`
```dart
class InquiryModel {
  final String inquiryId;
  final String title;
  final String? productName;
  final String description;
  final String? quantity;
  final DateTime? deadline;
  final String status; // "OPEN" | "CLOSED"
  final List<String> imageUrls;
  final String categoryId;
  final String partyId;
  final int responseCount;
  final List<InquiryResponseModel> responses;
  final DateTime createdAt;

  InquiryModel({
    required this.inquiryId,
    required this.title,
    this.productName,
    required this.description,
    this.quantity,
    this.deadline,
    required this.status,
    required this.imageUrls,
    required this.categoryId,
    required this.partyId,
    required this.responseCount,
    required this.responses,
    required this.createdAt,
  });

  factory InquiryModel.fromJson(Map<String, dynamic> json) {
    return InquiryModel(
      inquiryId: json['inquiryId'] ?? '',
      title: json['title'] ?? '',
      productName: json['productName'],
      description: json['description'] ?? '',
      quantity: json['quantity'],
      deadline: json['deadline'] != null ? DateTime.tryParse(json['deadline']) : null,
      status: json['status'] ?? 'OPEN',
      imageUrls: json['imageUrls'] != null ? List<String>.from(json['imageUrls']) : [],
      categoryId: json['categoryId'] ?? '',
      partyId: json['partyId'] ?? '',
      responseCount: json['responseCount'] ?? 0,
      responses: json['responses'] != null
          ? (json['responses'] as List).map((r) => InquiryResponseModel.fromJson(r)).toList()
          : [],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
```

### 2. `InquiryResponseModel`
```dart
class InquiryResponseModel {
  final String responseId;
  final String inquiryId;
  final String companyId;
  final String? comment;
  final double? offeredPrice;
  final String? productId;
  final String? companyName;
  final String? companyPhone;
  final String? ownerName;
  final DateTime createdAt;

  InquiryResponseModel({
    required this.responseId,
    required this.inquiryId,
    required this.companyId,
    this.comment,
    this.offeredPrice,
    this.productId,
    this.companyName,
    this.companyPhone,
    this.ownerName,
    required this.createdAt,
  });

  factory InquiryResponseModel.fromJson(Map<String, dynamic> json) {
    return InquiryResponseModel(
      responseId: json['responseId'] ?? '',
      inquiryId: json['inquiryId'] ?? '',
      companyId: json['companyId'] ?? '',
      comment: json['comment'],
      offeredPrice: json['offeredPrice'] != null ? (json['offeredPrice'] as num).toDouble() : null,
      productId: json['productId'],
      companyName: json['company']?['companyName'],
      companyPhone: json['company']?['phoneNumber'] ?? json['company']?['companyPhone'],
      ownerName: json['company']?['ownerName'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
```

---

## 📡 API Endpoints & Flutter Service Code (`http` / `dio`)

### 1️⃣ Party: Create Inquiry (Multi-Image Multipart)

- **Endpoint**: `POST /api/v1/inquiries`
- **Role**: `PARTY`
- **Content-Type**: `multipart/form-data`

```dart
import 'dart:io';
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<InquiryModel?> createInquiry({
  required String token,
  required String title,
  String? productName,
  required String description,
  String? quantity,
  String? deadline, // e.g. "2026-09-20"
  String? categoryId, // Optional: auto-fetches from profile if null
  List<File>? imageFiles,
}) async {
  final uri = Uri.parse('http://YOUR_SERVER_IP:3000/api/v1/inquiries');
  var request = http.MultipartRequest('POST', uri);

  request.headers['Authorization'] = 'Bearer $token';

  // Add text fields
  request.fields['title'] = title;
  request.fields['description'] = description;
  if (productName != null) request.fields['productName'] = productName;
  if (quantity != null) request.fields['quantity'] = quantity;
  if (deadline != null) request.fields['deadline'] = deadline;
  if (categoryId != null) request.fields['categoryId'] = categoryId;

  // Add multiple image files
  if (imageFiles != null) {
    for (var file in imageFiles) {
      request.files.add(
        await http.MultipartFile.fromPath('images', file.path),
      );
    }
  }

  final streamedResponse = await request.send();
  final response = await http.Response.fromStream(streamedResponse);

  if (response.statusCode == 201 || response.statusCode == 200) {
    final body = jsonDecode(response.body);
    return InquiryModel.fromJson(body['data']);
  } else {
    throw Exception(jsonDecode(response.body)['message'] ?? 'Failed to create inquiry');
  }
}
```

---

### 2️⃣ List All Inquiries (Filtered by Role)

- **Endpoint**: `GET /api/v1/inquiries?page=1&limit=10`
- **Role**: `PARTY` (returns Party's own inquiries) | `COMPANY` (returns inquiries matching Company's category)

```dart
Future<List<InquiryModel>> getInquiries({
  required String token,
  int page = 1,
  int limit = 10,
}) async {
  final uri = Uri.parse('http://YOUR_SERVER_IP:3000/api/v1/inquiries?page=$page&limit=$limit');
  final response = await http.get(
    uri,
    headers: {'Authorization': 'Bearer $token'},
  );

  if (response.statusCode == 200) {
    final body = jsonDecode(response.body);
    final List list = body['data']['data'];
    return list.map((item) => InquiryModel.fromJson(item)).toList();
  } else {
    throw Exception('Failed to load inquiries');
  }
}
```

---

### 3️⃣ Get Inquiry Details with Responses

- **Endpoint**: `GET /api/v1/inquiries/{inquiryId}`
- **Role**: Any authenticated user

```dart
Future<InquiryModel> getInquiryDetails({
  required String token,
  required String inquiryId,
}) async {
  final uri = Uri.parse('http://YOUR_SERVER_IP:3000/api/v1/inquiries/$inquiryId');
  final response = await http.get(
    uri,
    headers: {'Authorization': 'Bearer $token'},
  );

  if (response.statusCode == 200) {
    final body = jsonDecode(response.body);
    return InquiryModel.fromJson(body['data']);
  } else {
    throw Exception('Failed to load inquiry details');
  }
}
```

---

### 4️⃣ Company: Submit Response / Price Offer

- **Endpoint**: `POST /api/v1/inquiries/{inquiryId}/responses`
- **Role**: `VENDOR` (Company)

```dart
Future<InquiryResponseModel> submitResponse({
  required String token,
  required String inquiryId,
  required String comment,
  required double offeredPrice,
  String? productId,
}) async {
  final uri = Uri.parse('http://YOUR_SERVER_IP:3000/api/v1/inquiries/$inquiryId/responses');
  final response = await http.post(
    uri,
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'comment': comment,
      'offeredPrice': offeredPrice,
      if (productId != null) 'productId': productId,
    }),
  );

  if (response.statusCode == 201 || response.statusCode == 200) {
    final body = jsonDecode(response.body);
    return InquiryResponseModel.fromJson(body['data']);
  } else {
    // Throws 400 if inquiry is CLOSED
    final err = jsonDecode(response.body);
    throw Exception(err['message'] ?? 'Failed to submit response');
  }
}
```

---

### 5️⃣ Party: Close Inquiry

- **Endpoint**: `PATCH /api/v1/inquiries/{inquiryId}/close`
- **Role**: `PARTY` (Owner)

```dart
Future<InquiryModel> closeInquiry({
  required String token,
  required String inquiryId,
}) async {
  final uri = Uri.parse('http://YOUR_SERVER_IP:3000/api/v1/inquiries/$inquiryId/close');
  final response = await http.patch(
    uri,
    headers: {'Authorization': 'Bearer $token'},
  );

  if (response.statusCode == 200) {
    final body = jsonDecode(response.body);
    return InquiryModel.fromJson(body['data']);
  } else {
    throw Exception('Failed to close inquiry');
  }
}
```

---

## 📱 UI Screen Recommendations

### 1. Party Create Inquiry Screen
- Multi-image selector using `image_picker` package.
- Input fields: **Title**, **Product Name**, **Description**, **Quantity**, **Deadline Date Picker**.
- Submit button sends multipart request without needing a category dropdown (backend defaults to party category).

### 2. Inquiry Details Screen (Party View)
- Header card showing Inquiry status badge (`OPEN` in Green, `CLOSED` in Red).
- Image Carousel / Grid for `imageUrls`.
- Sub-header: *"Total Responses: X"*.
- Cards list of Company Responses:
  - Company Name & Contact Number.
  - Offered Price per unit.
  - Direct Order Button if `productId` is provided.
- Bottom Action Bar: **"Close Inquiry"** button (Visible only if `status == "OPEN"`).

### 3. Inquiry Response BottomSheet (Company View)
- Price Input Field (`offeredPrice`).
- Message / Remarks Input Field (`comment`).
- Optional Product Selector from company's product list (`productId`).
- Disable submit button if Inquiry `status == "CLOSED"`.
