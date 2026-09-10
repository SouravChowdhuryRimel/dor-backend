# Seller Keywords, Category Selection & Inquiry Matching — Flutter Integration Guide

এই গাইডে **বিক্রেতার প্রোফাইলে কীওয়ার্ড/ট্যাগ ম্যানেজমেন্ট**, **ক্রেতার ক্যাটাগরি ও কীওয়ার্ড নির্বাচন/সার্চ** এবং **বিক্রেতার ড্যাশবোর্ডে ইনকোয়ারি প্রদর্শন ও নোটিফিকেশন**-এর সম্পূর্ণ Flutter ইমপ্লিমেন্টেশন গাইড (Dart Models, API Services, এবং UI Snippets) বিস্তারিত দেওয়া হলো।


---

## 📌 API Endpoints Overview

| ফিচার | মেথড | এন্ডপয়েন্ট | বিবরণ |
| :--- | :--- | :--- | :--- |
| **বিক্রেতার তথ্য ও কীওয়ার্ড ফেচ** | `GET` | `/api/v1/companies/:id` | বিক্রেতার প্রোফাইল ও বর্তমান কীওয়ার্ড লিস্ট (`keywords: []`) |
| **কীওয়ার্ড যোগ / বাদ / পরিবর্তন** | `PATCH` | `/api/v1/companies/:id/keywords` | বিক্রেতার কীওয়ার্ড ট্যাগ যোগ (`addKeywords`), রিমুভ (`removeKeywords`) বা রিপ্লেস (`keywords`) |
| **ক্যাটাগরি ও কীওয়ার্ড তালিকা** | `GET` | `/api/v1/categories/keywords` | সকল সক্রিয় ক্যাটাগরি ও সমস্ত ইউনিক কীওয়ার্ডের সম্মিলিত তালিকা (সার্চ ও ফিল্টার সাপোর্টসহ) |
| **ক্যাটাগরি ও কীওয়ার্ড সার্চ** | `GET` | `/api/v1/categories?search=চাল` | ক্যাটাগরির নাম ও কীওয়ার্ড অনুযায়ী কেস-ইনসেনসিটিভ সার্চ |
| **ক্রেতার ইনকোয়ারি সাবমিট** | `POST` | `/api/v1/inquiries` | ক্যাটাগরি ও কীওয়ার্ডসহ নতুন ইনকোয়ারি তৈরি (Multipart Form-data) |
| **বিক্রেতার ড্যাশবোর্ড সামারি** | `GET` | `/api/v1/dashboard/company/:id/summary` | মোট ইনকোয়ারি সংখ্যা ও ক্রেতার পূর্ণ বিবরণসহ সাম্প্রতিক ইনকোয়ারি তালিকা |
| **ম্যাচিং ইনকোয়ারি তালিকা** | `GET` | `/api/v1/inquiries` | বিক্রেতার ক্যাটাগরি/কীওয়ার্ডের সাথে ম্যাচ করা পেজিনেটেড ইনকোয়ারি লিস্ট |

---

## 🛠️ Dart Data Models

### ১. `CompanyProfileModel` (বিক্রেতার মডেল)
```dart
class CompanyProfileModel {
  final String companyId;
  final String companyName;
  final String ownerName;
  final String phoneNumber;
  final String email;
  final String? district;
  final String? upozela;
  final String address;
  final String categoryId;
  final String? categoryName;
  final List<String> keywords;
  final String? companyImage;

  CompanyProfileModel({
    required this.companyId,
    required this.companyName,
    required this.ownerName,
    required this.phoneNumber,
    required this.email,
    this.district,
    this.upozela,
    required this.address,
    required this.categoryId,
    this.categoryName,
    required this.keywords,
    this.companyImage,
  });

  factory CompanyProfileModel.fromJson(Map<String, dynamic> json) {
    final cat = json['category'];
    return CompanyProfileModel(
      companyId: json['companyId'] ?? '',
      companyName: json['companyName'] ?? '',
      ownerName: json['ownerName'] ?? '',
      phoneNumber: json['phoneNumber'] ?? '',
      email: json['email'] ?? '',
      district: json['district'],
      upozela: json['upozela'],
      address: json['address'] ?? '',
      categoryId: json['categoryId'] ?? '',
      categoryName: cat is Map<String, dynamic> ? cat['categoryName'] : null,
      keywords: json['keywords'] != null
          ? List<String>.from(json['keywords'])
          : [],
      companyImage: json['companyImage'],
    );
  }
}
```

---

### ২. `CategoryKeywordResponseModel` (ক্যাটাগরি ও কীওয়ার্ড মডেল)
```dart
class CategoryKeywordItem {
  final String categoryId;
  final String categoryName;
  final String? categoryThumbnail;
  final List<String> keywords;

  CategoryKeywordItem({
    required this.categoryId,
    required this.categoryName,
    this.categoryThumbnail,
    required this.keywords,
  });

  factory CategoryKeywordItem.fromJson(Map<String, dynamic> json) {
    return CategoryKeywordItem(
      categoryId: json['categoryId'] ?? '',
      categoryName: json['categoryName'] ?? '',
      categoryThumbnail: json['categoryThumbnail'],
      keywords: json['keywords'] != null
          ? List<String>.from(json['keywords'])
          : [],
    );
  }
}

class CategoryKeywordResponseModel {
  final List<CategoryKeywordItem> categories;
  final List<String> allKeywords;

  CategoryKeywordResponseModel({
    required this.categories,
    required this.allKeywords,
  });

  factory CategoryKeywordResponseModel.fromJson(Map<String, dynamic> json) {
    final catList = (json['categories'] as List? ?? [])
        .map((e) => CategoryKeywordItem.fromJson(e))
        .toList();
    final kwList = json['allKeywords'] != null
        ? List<String>.from(json['allKeywords'])
        : <String>[];
    return CategoryKeywordResponseModel(
      categories: catList,
      allKeywords: kwList,
    );
  }
}
```

---

### ৩. `InquiryDetailModel` (ইনকোয়ারি ও ক্রেতার তথ্য)
```dart
class BuyerContactModel {
  final String partyId;
  final String partyName;
  final String businessName;
  final String phoneNumber;
  final String email;
  final String? district;
  final String? upozela;
  final String? address;

  BuyerContactModel({
    required this.partyId,
    required this.partyName,
    required this.businessName,
    required this.phoneNumber,
    required this.email,
    this.district,
    this.upozela,
    this.address,
  });

  factory BuyerContactModel.fromJson(Map<String, dynamic> json) {
    return BuyerContactModel(
      partyId: json['partyId'] ?? '',
      partyName: json['partyName'] ?? '',
      businessName: json['businessName'] ?? '',
      phoneNumber: json['phoneNumber'] ?? '',
      email: json['email'] ?? '',
      district: json['district'],
      upozela: json['upozela'],
      address: json['address'],
    );
  }
}

class InquiryDetailModel {
  final String inquiryId;
  final String title;
  final String? productName;
  final String description;
  final String? quantity;
  final DateTime? deadline;
  final String status;
  final List<String> imageUrls;
  final List<String> keywords;
  final String categoryId;
  final String? categoryName;
  final BuyerContactModel? party;
  final bool hasResponded;
  final DateTime createdAt;

  InquiryDetailModel({
    required this.inquiryId,
    required this.title,
    this.productName,
    required this.description,
    this.quantity,
    this.deadline,
    required this.status,
    required this.imageUrls,
    required this.keywords,
    required this.categoryId,
    this.categoryName,
    this.party,
    required this.hasResponded,
    required this.createdAt,
  });

  factory InquiryDetailModel.fromJson(Map<String, dynamic> json) {
    final cat = json['category'];
    return InquiryDetailModel(
      inquiryId: json['inquiryId'] ?? '',
      title: json['title'] ?? '',
      productName: json['productName'],
      description: json['description'] ?? '',
      quantity: json['quantity'],
      deadline: json['deadline'] != null ? DateTime.tryParse(json['deadline']) : null,
      status: json['status'] ?? 'OPEN',
      imageUrls: json['imageUrls'] != null ? List<String>.from(json['imageUrls']) : [],
      keywords: json['keywords'] != null ? List<String>.from(json['keywords']) : [],
      categoryId: json['categoryId'] ?? '',
      categoryName: cat is Map<String, dynamic> ? cat['categoryName'] : null,
      party: json['party'] != null ? BuyerContactModel.fromJson(json['party']) : null,
      hasResponded: json['hasResponded'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
```

---

## 🌐 Flutter API Service (`ApiService.dart`)

```dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'http://YOUR_SERVER_IP:3000/api/v1';

  // Helper: Common Headers with Token
  static Map<String, String> _headers(String token) => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
  };

  // ==========================================
  // 1. বিক্রেতার প্রোফাইল ও কীওয়ার্ড সার্ভিস
  // ==========================================

  /// বিক্রেতার প্রোফাইল ফেচ (কীওয়ার্ডসহ)
  static Future<CompanyProfileModel?> getCompanyProfile({
    required String companyId,
    required String token,
  }) async {
    final url = Uri.parse('$baseUrl/companies/$companyId');
    final res = await http.get(url, headers: _headers(token));

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body)['data'];
      return CompanyProfileModel.fromJson(data);
    }
    return null;
  }

  /// বিক্রেতার কীওয়ার্ড যোগ / বাদ / পরিবর্তন (Dedicated API)
  static Future<bool> updateCompanyKeywords({
    required String companyId,
    required String token,
    List<String>? keywords,      // সম্পূর্ণ লিস্ট রিপ্লেস করতে চাইলে
    List<String>? addKeywords,   // নতুন কীওয়ার্ড যোগ করতে চাইলে
    List<String>? removeKeywords,// কোনো কীওয়ার্ড ডিলিট করতে চাইলে
  }) async {
    final url = Uri.parse('$baseUrl/companies/$companyId/keywords');
    final Map<String, dynamic> body = {};

    if (addKeywords != null && addKeywords.isNotEmpty) {
      body['addKeywords'] = addKeywords;
    } else if (removeKeywords != null && removeKeywords.isNotEmpty) {
      body['removeKeywords'] = removeKeywords;
    } else if (keywords != null) {
      body['keywords'] = keywords;
    }

    final res = await http.patch(
      url,
      headers: _headers(token),
      body: jsonEncode(body),
    );

    return res.statusCode == 200;
  }

  // ==========================================
  // 2. ক্রেতার ক্যাটাগরি ও কীওয়ার্ড সার্ভিস
  // ==========================================

  /// ক্যাটাগরি ও অল কীওয়ার্ড লিস্ট পাওয়া
  static Future<CategoryKeywordResponseModel?> getCategoriesAndKeywords({
    String? search,
  }) async {
    String endpoint = '$baseUrl/categories/keywords';
    if (search != null && search.trim().isNotEmpty) {
      endpoint += '?search=${Uri.encodeComponent(search.trim())}';
    }

    final res = await http.get(Uri.parse(endpoint));
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body)['data'];
      return CategoryKeywordResponseModel.fromJson(data);
    }
    return null;
  }

  /// ক্রেতা কর্তৃক নতুন ইনকোয়ারি তৈরি (Multipart)
  static Future<bool> createInquiry({
    required String token,
    required String title,
    required String description,
    String? productName,
    String? quantity,
    String? deadline, // 'YYYY-MM-DD'
    String? categoryId,
    List<String>? keywords,
    List<File>? imageFiles,
  }) async {
    final url = Uri.parse('$baseUrl/inquiries');
    final req = http.MultipartRequest('POST', url);

    req.headers['Authorization'] = 'Bearer $token';
    req.fields['title'] = title;
    req.fields['description'] = description;

    if (productName != null) req.fields['productName'] = productName;
    if (quantity != null) req.fields['quantity'] = quantity;
    if (deadline != null) req.fields['deadline'] = deadline;
    if (categoryId != null) req.fields['categoryId'] = categoryId;

    if (keywords != null && keywords.isNotEmpty) {
      // JSON array আকারে পাঠানো যায় অথবা কমা দিয়ে
      req.fields['keywords'] = jsonEncode(keywords);
    }

    if (imageFiles != null && imageFiles.isNotEmpty) {
      for (final file in imageFiles) {
        req.files.add(
          await http.MultipartFile.fromPath('images', file.path),
        );
      }
    }

    final streamedRes = await req.send();
    final res = await http.Response.fromStream(streamedRes);

    return res.statusCode == 201;
  }

  // ==========================================
  // 3. বিক্রেতার ড্যাশবোর্ড ও ইনকোয়ারি সার্ভিস
  // ==========================================

  /// বিক্রেতার ড্যাশবোর্ড সামারি (ইনকোয়ারি ও ক্রেতার তথ্যসহ)
  static Future<Map<String, dynamic>?> getCompanyDashboard({
    required String companyId,
    required String token,
  }) async {
    final url = Uri.parse('$baseUrl/dashboard/company/$companyId/summary');
    final res = await http.get(url, headers: _headers(token));

    if (res.statusCode == 200) {
      return jsonDecode(res.body)['data'] as Map<String, dynamic>;
    }
    return null;
  }

  /// বিক্রেতার সাথে ম্যাচ করা ইনকোয়ারি তালিকা
  static Future<List<InquiryDetailModel>> getMatchingInquiries({
    required String token,
    int page = 1,
    int limit = 10,
  }) async {
    final url = Uri.parse('$baseUrl/inquiries?page=$page&limit=$limit');
    final res = await http.get(url, headers: _headers(token));

    if (res.statusCode == 200) {
      final list = jsonDecode(res.body)['data'] as List? ?? [];
      return list.map((e) => InquiryDetailModel.fromJson(e)).toList();
    }
    return [];
  }
}
```

---

## 🎨 UI Widgets (Flutter Implementation)

### ১. বিক্রেতার প্রোফাইলে কীওয়ার্ড ট্যাগ বক্স উইজেট (`SellerKeywordsWidget`)
বিক্রেতা প্রোফাইলে ছোট ছোট বক্স বা ট্যাগ আকারে কীওয়ার্ডগুলো দেখতে পারবে এবং 'x' বাটনে চেপে রিমুভ অথবা নতুন কীওয়ার্ড লিখে '+' বাটনে যোগ করতে পারবে:

```dart
import 'package:flutter/material.dart';

class SellerKeywordsWidget extends StatefulWidget {
  final String companyId;
  final String token;
  final List<String> initialKeywords;

  const SellerKeywordsWidget({
    Key? key,
    required this.companyId,
    required this.token,
    required this.initialKeywords,
  }) : super(key: key);

  @override
  State<SellerKeywordsWidget> createState() => _SellerKeywordsWidgetState();
}

class _SellerKeywordsWidgetState extends State<SellerKeywordsWidget> {
  late List<String> _keywords;
  final TextEditingController _addController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _keywords = List.from(widget.initialKeywords);
  }

  Future<void> _addKeyword(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _keywords.contains(trimmed)) return;

    setState(() => _isLoading = true);
    final success = await ApiService.updateCompanyKeywords(
      companyId: widget.companyId,
      token: widget.token,
      addKeywords: [trimmed],
    );

    if (success) {
      setState(() {
        _keywords.add(trimmed);
        _addController.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('কীওয়ার্ড "$trimmed" যোগ হয়েছে')),
      );
    }
    setState(() => _isLoading = false);
  }

  Future<void> _removeKeyword(String keyword) async {
    setState(() => _isLoading = true);
    final success = await ApiService.updateCompanyKeywords(
      companyId: widget.companyId,
      token: widget.token,
      removeKeywords: [keyword],
    );

    if (success) {
      setState(() {
        _keywords.remove(keyword);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('কীওয়ার্ড "$keyword" মুছে ফেলা হয়েছে')),
      );
    }
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'ব্যবসা/সেবার কীওয়ার্ডসমূহ',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                if (_isLoading)
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'এই কীওয়ার্ড অনুযায়ী ক্রেতাদের সংশ্লিষ্ট Enquiry স্বয়ংক্রিয়ভাবে আপনার ড্যাশবোর্ডে আসবে।',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 12),

            // ট্যাগ / চিপ লিস্ট
            Wrap(
              spacing: 8.0,
              runSpacing: 4.0,
              children: _keywords.map((kw) {
                return Chip(
                  label: Text(kw, style: const TextStyle(fontSize: 13)),
                  backgroundColor: Colors.blue.shade50,
                  deleteIcon: const Icon(Icons.close, size: 16, color: Colors.red),
                  onDeleted: () => _removeKeyword(kw),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(color: Colors.blue.shade200),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 12),

            // নতুন কীওয়ার্ড ইনপুট ফিল্ড
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _addController,
                    decoration: InputDecoration(
                      hintText: 'কীওয়ার্ড লিখুন (যেমন: চাল, মোবাইল, কম্পিউটার)',
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onSubmitted: _addKeyword,
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: () => _addKeyword(_addController.text),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('যোগ করুন'),
                  style: ElevatedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

---

### ২. ক্রেতার ইনকোয়ারি ফর্ম: ক্যাটাগরি ও কীওয়ার্ড নির্বাচন উইজেট
ক্রেতা ইনকোয়ারি তৈরি করার সময় ক্যাটাগরি সিলেক্ট করবে, সার্চ করে কীওয়ার্ড ট্যাগ বেছে নিতে পারবে:

```dart
import 'package:flutter/material.dart';

class BuyerInquiryCreationScreen extends StatefulWidget {
  final String token;
  const BuyerInquiryCreationScreen({Key? key, required this.token}) : super(key: key);

  @override
  State<BuyerInquiryCreationScreen> createState() => _BuyerInquiryCreationScreenState();
}

class _BuyerInquiryCreationScreenState extends State<BuyerInquiryCreationScreen> {
  final _titleController = TextEditingController();
  final _productNameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _quantityController = TextEditingController();

  CategoryKeywordResponseModel? _meta;
  CategoryKeywordItem? _selectedCategory;
  final List<String> _selectedKeywords = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCategoriesAndKeywords();
  }

  Future<void> _loadCategoriesAndKeywords() async {
    final meta = await ApiService.getCategoriesAndKeywords();
    setState(() {
      _meta = meta;
      _isLoading = false;
    });
  }

  Future<void> _submitInquiry() async {
    if (_titleController.text.trim().isEmpty || _descriptionController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('শিরোনাম ও বিবরণ আবশ্যক')),
      );
      return;
    }

    setState(() => _isLoading = true);
    final success = await ApiService.createInquiry(
      token: widget.token,
      title: _titleController.text.trim(),
      description: _descriptionController.text.trim(),
      productName: _productNameController.text.trim().isNotEmpty
          ? _productNameController.text.trim()
          : null,
      quantity: _quantityController.text.trim().isNotEmpty
          ? _quantityController.text.trim()
          : null,
      categoryId: _selectedCategory?.categoryId,
      keywords: _selectedKeywords,
    );

    setState(() => _isLoading = false);

    if (success) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('আপনার Enquiry সফলভাবে পোস্ট হয়েছে এবং বিক্রেতাদের নোটিফিকেশন পাঠানো হয়েছে!')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enquiry সাবমিট ব্যর্থ হয়েছে')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('নতুন ইনকোয়ারি তৈরি করুন')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'ইনকোয়ারি শিরোনাম *',
                hintText: 'যেমন: ১০টি কম্পিউটার ও মনিটর প্রয়োজন',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _productNameController,
              decoration: const InputDecoration(
                labelText: 'কাঙ্ক্ষিত পণ্যের নাম (ঐচ্ছিক)',
                hintText: 'যেমন: Desktop PC Core i5',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _quantityController,
              decoration: const InputDecoration(
                labelText: 'পরিমাণ (ঐচ্ছিক)',
                hintText: 'যেমন: ১০ সেট',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),

            // ক্যাটাগরি নির্বাচন ড্রপডাউন
            DropdownButtonFormField<CategoryKeywordItem>(
              value: _selectedCategory,
              decoration: const InputDecoration(
                labelText: 'ক্যাটাগরি নির্বাচন করুন',
                border: OutlineInputBorder(),
              ),
              items: _meta?.categories.map((cat) {
                return DropdownMenuItem(
                  value: cat,
                  child: Text(cat.categoryName),
                );
              }).toList(),
              onChanged: (val) {
                setState(() {
                  _selectedCategory = val;
                  // ক্যাটাগরি সিলেক্ট করলে সংশ্লিষ্ট ডিফল্ট কীওয়ার্ড সাজেস্ট করা
                  if (val != null) {
                    for (var kw in val.keywords) {
                      if (!_selectedKeywords.contains(kw)) {
                        _selectedKeywords.add(kw);
                      }
                    }
                  }
                });
              },
            ),

            const SizedBox(height: 16),
            const Text('সংশ্লিষ্ট কীওয়ার্ড নির্বাচন করুন:', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),

            // সংশ্লিষ্ট ক্যাটাগরি বা সকল কীওয়ার্ডের চিপস
            Wrap(
              spacing: 8.0,
              runSpacing: 4.0,
              children: (_meta?.allKeywords ?? []).map((kw) {
                final isSelected = _selectedKeywords.contains(kw);
                return FilterChip(
                  label: Text(kw),
                  selected: isSelected,
                  selectedColor: Colors.blue.shade100,
                  onSelected: (selected) {
                    setState(() {
                      if (selected) {
                        _selectedKeywords.add(kw);
                      } else {
                        _selectedKeywords.remove(kw);
                      }
                    });
                  },
                );
              }).toList(),
            ),

            const SizedBox(height: 16),
            TextField(
              controller: _descriptionController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'ইনকোয়ারির বিস্তারিত বিবরণ *',
                hintText: 'পণ্য বা সেবার বিশদ বিবরণ লিখুন...',
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _submitInquiry,
                child: const Text('Enquiry পোস্ট করুন', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

### ৩. বিক্রেতার ড্যাশবোর্ডে ইনকোয়ারি কার্ড উইজেট (`SellerInquiryCard`)
বিক্রেতা তার ড্যাশবোর্ড থেকে দেখতে পারবে:
- কোন ক্রেতা Enquiry করেছে (`partyName`, `businessName`)
- কোন পণ্য বা সেবা প্রয়োজন (`productName`, `quantity`)
- কোন ক্যাটাগরির Enquiry (`categoryName`)
- Enquiry-এর বিস্তারিত তথ্য (`description`)
- ক্রেতার সঙ্গে যোগাযোগের প্রয়োজনীয় তথ্য (`phoneNumber`, `address`)

```dart
import 'package:flutter/material.dart';

class SellerInquiryCard extends StatelessWidget {
  final InquiryDetailModel inquiry;
  final VoidCallback? onRespond;

  const SellerInquiryCard({
    Key? key,
    required this.inquiry,
    this.onRespond,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final party = inquiry.party;

    return Card(
      elevation: 3,
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ক্যাটাগরি ও স্ট্যাটাস ব্যাজ
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Chip(
                  label: Text(inquiry.categoryName ?? 'ক্যাটাগরি'),
                  backgroundColor: Colors.blue.shade50,
                  labelStyle: TextStyle(color: Colors.blue.shade800, fontSize: 12),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: inquiry.status == 'OPEN' ? Colors.green.shade50 : Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    inquiry.status == 'OPEN' ? 'চলমান' : 'বন্ধ',
                    style: TextStyle(
                      color: inquiry.status == 'OPEN' ? Colors.green.shade800 : Colors.grey.shade700,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 6),
            // ইনকোয়ারি টাইটেল
            Text(
              inquiry.title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),

            // পণ্য ও পরিমাণ
            if (inquiry.productName != null || inquiry.quantity != null)
              Row(
                children: [
                  const Icon(Icons.shopping_bag_outlined, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    'পণ্য: ${inquiry.productName ?? 'সাধারণ'} | পরিমাণ: ${inquiry.quantity ?? 'অনুল্লিখিত'}',
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade800),
                  ),
                ],
              ),

            const SizedBox(height: 6),
            // বিস্তারিত বিবরণ
            Text(
              inquiry.description,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),

            const Divider(height: 20),

            // ক্রেতার তথ্য ও যোগাযোগের নম্বর (ক্রেতার সঙ্গে যোগাযোগের প্রয়োজনীয় তথ্য)
            if (party != null) ...[
              const Text('ক্রেতার বিবরণ ও যোগাযোগের তথ্য:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.person, size: 16, color: Colors.blue),
                  const SizedBox(width: 6),
                  Text('${party.partyName} (${party.businessName})', style: const TextStyle(fontSize: 13)),
                ],
              ),
              const SizedBox(height: 2),
              Row(
                children: [
                  const Icon(Icons.phone, size: 16, color: Colors.green),
                  const SizedBox(width: 6),
                  SelectableText(party.phoneNumber, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                ],
              ),
              if (party.address != null) ...[
                const SizedBox(height: 2),
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 16, color: Colors.orange),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '${party.address}${party.upozela != null ? ", ${party.upozela}" : ""}${party.district != null ? ", ${party.district}" : ""}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ),
                  ],
                ),
              ],
            ],

            const SizedBox(height: 12),

            // অ্যাকশন বাটন
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (inquiry.hasResponded)
                  const Chip(
                    label: Text('অফার পাঠানো হয়েছে'),
                    backgroundColor: Colors.amber,
                  )
                else
                  ElevatedButton.icon(
                    onPressed: onRespond,
                    icon: const Icon(Icons.local_offer, size: 16),
                    label: const Text('মূল্য অফার দিন'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 🔔 পুশ ও রিয়েল-টাইম নোটিফিকেশন হ্যান্ডলিং

### ১. Firebase Messaging (FCM Push)
ক্রেতা যখন কোনো ক্যাটাগরি বা কীওয়ার্ড দিয়ে Enquiry পোস্ট করবে, সংশ্লিষ্ট বিক্রেতার ডিভাইসে পুশ নোটিফিকেশন আসবে:
```json
{
  "notification": {
    "title": "নতুন ইনকোয়ারি জমা হয়েছে",
    "body": "আপনার ক্যাটাগরি/কীওয়ার্ড অনুযায়ী একটি নতুন ইনকোয়ারি এসেছে: \"১০টি অফিস কম্পিউটার প্রয়োজন\""
  },
  "data": {
    "type": "NEW_INQUIRY",
    "inquiryId": "0ec46da8-d40e-4411-8557-5b3ebaead52f"
  }
}
```

### ২. WebSocket Listener (Real-Time Live Pop-up)
বিক্রেতা অ্যাপে লগইন থাকা অবস্থায় ব্যাকএন্ড `company_{companyId}` রুমে সরাসরি রিয়েল-টাইম নোটিফিকেশন পাঠায়:
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

void listenForCompanyInquiries(String token, Function(dynamic) onNewInquiry) {
  IO.Socket socket = IO.io('http://YOUR_SERVER_IP:3000', <String, dynamic>{
    'transports': ['websocket'],
    'autoConnect': true,
    'query': {'token': token},
  });

  socket.onConnect((_) {
    print('WebSocket Connected for Seller');
  });

  socket.on('notification', (data) {
    if (data['data'] != null && data['data']['type'] == 'NEW_INQUIRY') {
      onNewInquiry(data);
    }
  });
}
```
