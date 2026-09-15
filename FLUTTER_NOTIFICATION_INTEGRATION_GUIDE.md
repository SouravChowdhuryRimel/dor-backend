# 🔔 Flutter Notification Integration Guide (কাউন্ট ও লিস্ট ফিক্স গাইড)

এই গাইডে Flutter অ্যাপে **নোটিফিকেশন কাউন্ট (Unread Badge)** এবং **নোটিফিকেশন লিস্ট (Notification List & Pagination)** সঠিকভাবে প্রদর্শনের সম্পূর্ণ সমাধান, Dart Models, API Service, Socket.io Real-Time Integration, Firebase Cloud Messaging (FCM) এবং UI Snippets বিস্তারিত দেওয়া হলো।

---

## 🧐 কেন নোটিফিকেশন কাউন্ট ও লিস্ট আগে ঠিকমতো শো হচ্ছিল না? (Root Cause Analysis)

### ১. কাউন্ট (Badge Count) সঠিকভাবে না পাওয়ার কারণ:
* **ভুল ফিল্ড ব্যবহার:** পূর্বে Flutter থেকে `meta.total` বা `response.length` রিড করা হচ্ছিল। `meta.total` হলো ইউজারের **সর্বমোট (Read + Unread মিলিয়ে)** কতগুলো নোটিফিকেশন আছে তার সংখ্যা। ফলে ১০টি নোটিফিকেশন থাকলে এবং সবগুলো পড়া হয়ে গেলেও কাউন্টার `10` দেখাচ্ছিল!
* **ডেডিকেটেড আনরিড কাউন্ট এন্ডপয়েন্ট না থাকা:** আগে দ্রুত শুধু অপঠিত (Unread) সংখ্যা জানার কোনো এন্ডপয়েন্ট ছিল না।
* **সমাধান:** 
  1. নতুন লাইটওয়েট এন্ডপয়েন্ট তৈরি করা হয়েছে: `GET /api/v1/notifications/unread-count` যা শুধুমাত্র `{ "unreadCount": 3, "total": 12 }` রিটার্ন করে।
  2. সাধারণ লিস্ট এন্ডপয়েন্টেও `meta.unreadCount` যুক্ত করা হয়েছে।

### ২. নোটিফিকেশন লিস্ট শো না হওয়ার কারণ:
* **JSON রেসপন্স স্ট্রাকচার (Nesting):** ব্যাকএন্ড রেসপন্স ফরম্যাট:
  ```json
  {
    "data": [ ... নোটিফিকেশন অবজেক্টগুলো ... ],
    "meta": { "total": 12, "unreadCount": 3, "page": 1, ... }
  }
  ```
  Flutter-এ যদি সরাসরি `response.data` কে `List` হিসেবে কাস্ট করা হয় (অর্থাৎ `response.data['data']` না নিয়ে), তাহলে `type '_Map<String, dynamic>' is not a subtype of type 'List<dynamic>'` এরর দেয় এবং লিস্ট ক্র্যাশ করে।
* **Null-Safety ইস্যু:** সব নোটিফিকেশন কিন্তু ইনকোয়ারি সংক্রান্ত নাও হতে পারে। যেমন- অ্যাডমিন নোটিফিকেশন, সিস্টেম অ্যালার্ট বা ডেলিভারি অ্যালার্টের ক্ষেত্রে `inquiry`, `party`, `category` ফিল্ডগুলো `null` থাকে। Flutter মডেলে এগুলোকে `nullable (?)` না রাখলে `Null check operator used on a null value` এক্সেপশন হয়ে লিস্ট ফাঁকা হয়ে যায়।
* **প্রাইমারি কি এর নাম:** ব্যাকএন্ডে নোটিফিকেশনের আইডি ফিল্ডের নাম **`notificationId`** (নট `id`)।
* **এক ক্লিকে সব পড়া মার্ক করার অভাব:** নতুন `PATCH /api/v1/notifications/read-all` যুক্ত করা হয়েছে।

---

## 📌 API Endpoints Overview

| মেথড | এন্ডপয়েন্ট | হেডার | ডেসক্রিপশন |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications/unread-count` | `Bearer <TOKEN>` | **আনরিড কাউন্টার ব্যাজ লোড করতে** (খুব দ্রুত রেসপন্স দেয়) |
| `GET` | `/api/v1/notifications?page=1&limit=10` | `Bearer <TOKEN>` | সম্পূর্ণ নোটিফিকেশন লিস্ট (পেজিনেশনসহ) |
| `GET` | `/api/v1/notifications?isRead=false` | `Bearer <TOKEN>` | **শুধুমাত্র অপঠিত (Unread)** নোটিফিকেশন ফিল্টার |
| `PATCH` | `/api/v1/notifications/:id/read` | `Bearer <TOKEN>` | নির্দিষ্ট একটি নোটিফিকেশনকে Read মার্ক করা |
| `PATCH` | `/api/v1/notifications/read-all` | `Bearer <TOKEN>` | **এক ক্লিকে সব নোটিফিকেশনকে Read মার্ক করা** |
| `PATCH` | `/api/v1/notifications/push-toggle` | `Bearer <TOKEN>` | পুশ নোটিফিকেশন চালু/বন্ধ করা এবং FCM টোকেন পাঠানো |
| `GET` | `/api/v1/notifications/push-status` | `Bearer <TOKEN>` | পুশ নোটিফিকেশন স্টেটাস চেক করা |
| `POST` | `/api/v1/auth/fcm-token` | `Bearer <TOKEN>` | লগইন এর পর FCM Push Token সেভ করা |

---

## 📦 1. Production-Grade Dart Models (Null-Safe)

এই মডেলগুলো একটি ফাইলে রাখুন: `lib/models/notification_model.dart`

```dart
// lib/models/notification_model.dart

class NotificationResponseModel {
  final List<NotificationItemModel> data;
  final NotificationMetaModel meta;

  NotificationResponseModel({
    required this.data,
    required this.meta,
  });

  factory NotificationResponseModel.fromJson(Map<String, dynamic> json) {
    return NotificationResponseModel(
      data: json['data'] != null && json['data'] is List
          ? (json['data'] as List)
              .map((item) => NotificationItemModel.fromJson(item))
              .toList()
          : [],
      meta: json['meta'] != null
          ? NotificationMetaModel.fromJson(json['meta'])
          : NotificationMetaModel.empty(),
    );
  }
}

class NotificationMetaModel {
  final int total;
  final int unreadCount;
  final int page;
  final int limit;
  final int totalPages;
  final bool hasNextPage;
  final bool hasPreviousPage;

  NotificationMetaModel({
    required this.total,
    required this.unreadCount,
    required this.page,
    required this.limit,
    required this.totalPages,
    required this.hasNextPage,
    required this.hasPreviousPage,
  });

  factory NotificationMetaModel.fromJson(Map<String, dynamic> json) {
    return NotificationMetaModel(
      total: json['total'] ?? 0,
      unreadCount: json['unreadCount'] ?? 0,
      page: json['page'] ?? 1,
      limit: json['limit'] ?? 10,
      totalPages: json['totalPages'] ?? 1,
      hasNextPage: json['hasNextPage'] ?? false,
      hasPreviousPage: json['hasPreviousPage'] ?? false,
    );
  }

  factory NotificationMetaModel.empty() {
    return NotificationMetaModel(
      total: 0,
      unreadCount: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    );
  }
}

class NotificationUnreadCountModel {
  final int total;
  final int unreadCount;

  NotificationUnreadCountModel({
    required this.total,
    required this.unreadCount,
  });

  factory NotificationUnreadCountModel.fromJson(Map<String, dynamic> json) {
    return NotificationUnreadCountModel(
      total: json['total'] ?? 0,
      unreadCount: json['unreadCount'] ?? 0,
    );
  }
}

class NotificationItemModel {
  final String notificationId;
  final String title;
  final String message;
  bool isRead;
  final String? companyId;
  final String? partyId;
  final String? driverId;
  final String? userId;
  final String? inquiryId;
  final DateTime createdAt;
  final DateTime updatedAt;
  final InquirySnippetModel? inquiry;

  NotificationItemModel({
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
    required this.updatedAt,
    this.inquiry,
  });

  factory NotificationItemModel.fromJson(Map<String, dynamic> json) {
    return NotificationItemModel(
      notificationId: json['notificationId'] ?? '',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      isRead: json['isRead'] ?? false,
      companyId: json['companyId'],
      partyId: json['partyId'],
      driverId: json['driverId'],
      userId: json['userId'],
      inquiryId: json['inquiryId'],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt']) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt']) ?? DateTime.now()
          : DateTime.now(),
      inquiry: json['inquiry'] != null
          ? InquirySnippetModel.fromJson(json['inquiry'])
          : null,
    );
  }
}

class InquirySnippetModel {
  final String inquiryId;
  final String? title;
  final String? description;
  final CategorySnippetModel? category;
  final PartySnippetModel? party;

  InquirySnippetModel({
    required this.inquiryId,
    this.title,
    this.description,
    this.category,
    this.party,
  });

  factory InquirySnippetModel.fromJson(Map<String, dynamic> json) {
    return InquirySnippetModel(
      inquiryId: json['inquiryId'] ?? '',
      title: json['title'],
      description: json['description'],
      category: json['category'] != null
          ? CategorySnippetModel.fromJson(json['category'])
          : null,
      party: json['party'] != null
          ? PartySnippetModel.fromJson(json['party'])
          : null,
    );
  }
}

class CategorySnippetModel {
  final String categoryId;
  final String categoryName;

  CategorySnippetModel({
    required this.categoryId,
    required this.categoryName,
  });

  factory CategorySnippetModel.fromJson(Map<String, dynamic> json) {
    return CategorySnippetModel(
      categoryId: json['categoryId'] ?? '',
      categoryName: json['categoryName'] ?? '',
    );
  }
}

class PartySnippetModel {
  final String partyId;
  final String partyName;
  final String? businessName;
  final String? phoneNumber;
  final String? email;
  final String? district;
  final String? upozela;
  final String? address;

  PartySnippetModel({
    required this.partyId,
    required this.partyName,
    this.businessName,
    this.phoneNumber,
    this.email,
    this.district,
    this.upozela,
    this.address,
  });

  factory PartySnippetModel.fromJson(Map<String, dynamic> json) {
    return PartySnippetModel(
      partyId: json['partyId'] ?? '',
      partyName: json['partyName'] ?? '',
      businessName: json['businessName'],
      phoneNumber: json['phoneNumber'],
      email: json['email'],
      district: json['district'],
      upozela: json['upozela'],
      address: json['address'],
    );
  }
}
```

---

## 🌐 2. Flutter API Service (`notification_api_service.dart`)

Dio অথবা http প্যাকেজ ব্যবহার করে API সার্ভিস লিখুন:

```dart
// lib/services/notification_api_service.dart

import 'package:dio/dio.dart';
import '../models/notification_model.dart';

class NotificationApiService {
  final Dio _dio;
  final String baseUrl;

  NotificationApiService({
    required Dio dio,
    this.baseUrl = 'https://your-api-domain.com/api/v1', // আপনার ব্যাকএন্ড URL
  }) : _dio = dio;

  // ১. আনরিড নোটিফিকেশন সংখ্যা চেক করা (হোমস্ক্রিন ও বেল আইকনের জন্য)
  Future<NotificationUnreadCountModel> getUnreadCount(String token) async {
    try {
      final response = await _dio.get(
        '$baseUrl/notifications/unread-count',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200) {
        return NotificationUnreadCountModel.fromJson(response.data);
      }
      throw Exception('Failed to load unread count');
    } catch (e) {
      rethrow;
    }
  }

  // ২. পেজিনেটেড নোটিফিকেশন লিস্ট লোড করা
  Future<NotificationResponseModel> getNotifications({
    required String token,
    int page = 1,
    int limit = 10,
    bool? isRead, // null দিলে সব আসবে, false দিলে শুধু অপঠিত
  }) async {
    try {
      final Map<String, dynamic> queryParams = {
        'page': page,
        'limit': limit,
      };
      if (isRead != null) {
        queryParams['isRead'] = isRead.toString();
      }

      final response = await _dio.get(
        '$baseUrl/notifications',
        queryParameters: queryParams,
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200) {
        // রেসপন্স অবজেক্ট থেকে 'data' এবং 'meta' রিড করা
        return NotificationResponseModel.fromJson(response.data);
      }
      throw Exception('Failed to load notifications');
    } catch (e) {
      rethrow;
    }
  }

  // ৩. একটি নির্দিষ্ট নোটিফিকেশনকে Read মার্ক করা
  Future<bool> markAsRead({
    required String token,
    required String notificationId,
  }) async {
    try {
      final response = await _dio.patch(
        '$baseUrl/notifications/$notificationId/read',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ৪. এক ক্লিকে সব নোটিফিকেশন Read মার্ক করা
  Future<bool> markAllAsRead({required String token}) async {
    try {
      final response = await _dio.patch(
        '$baseUrl/notifications/read-all',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ৫. লগইন এর পর FCM Push Token সার্ভারে পাঠানো
  Future<void> updateFcmToken({
    required String token,
    required String fcmToken,
  }) async {
    try {
      await _dio.post(
        '$baseUrl/auth/fcm-token',
        data: {'fcmToken': fcmToken},
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );
    } catch (e) {
      // log error
    }
  }
}
```

---

## ⚡ 3. Real-Time Socket.io Integration (`notification_socket_service.dart`)

ব্যাকএন্ডে Socket.io গেটওয়ে চালু আছে। নতুন কোনো নোটিফিকেশন আসার সাথে সাথে লাইভ কাউন্টার বাড়াতে এবং লিস্টে নোটিফিকেশন যোগ করতে এই সার্ভিস ব্যবহার করুন:

Dependencies (`pubspec.yaml`):
```yaml
dependencies:
  socket_io_client: ^3.0.2
```

```dart
// lib/services/notification_socket_service.dart

import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../models/notification_model.dart';

class NotificationSocketService {
  IO.Socket? _socket;
  final String socketUrl;

  NotificationSocketService({
    this.socketUrl = 'https://your-api-domain.com', // ব্যাকএন্ড রুট ডোমেইন
  });

  void connect({
    required String token,
    required Function(NotificationItemModel) onNewNotification,
  }) {
    if (_socket != null && _socket!.connected) return;

    _socket = IO.io(
      socketUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .setQuery({'token': token})
          .setExtraHeaders({'Authorization': 'Bearer $token'})
          .build(),
    );

    _socket!.onConnect((_) {
      print('🟢 Notification Socket Connected!');
    });

    _socket!.onDisconnect((_) {
      print('🔴 Notification Socket Disconnected');
    });

    // নতুন নোটিফিকেশন আসার ইভেন্ট
    _socket!.on('notification', (data) {
      print('📩 Realtime Notification Received: $data');
      if (data is Map<String, dynamic>) {
        final item = NotificationItemModel.fromJson(data);
        onNewNotification(item);
      }
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
```

---

## 📱 4. State Management Example (ChangeNotifier / Provider)

নোটিফিকেশন কাউন্ট এবং পেজিনেশন ম্যানেজ করার জন্য `NotificationProvider`:

```dart
// lib/providers/notification_provider.dart

import 'package:flutter/material.dart';
import '../models/notification_model.dart';
import '../services/notification_api_service.dart';
import '../services/notification_socket_service.dart';

class NotificationProvider extends ChangeNotifier {
  final NotificationApiService _apiService;
  final NotificationSocketService _socketService;

  NotificationProvider({
    required NotificationApiService apiService,
    required NotificationSocketService socketService,
  })  : _apiService = apiService,
        _socketService = socketService;

  int _unreadCount = 0;
  int get unreadCount => _unreadCount;

  List<NotificationItemModel> _notifications = [];
  List<NotificationItemModel> get notifications => _notifications;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _hasMore = true;
  bool get hasMore => _hasMore;

  int _currentPage = 1;
  String? _token;

  // ১. অ্যাপ ওপেন হলে ইনিশিয়ালাইজ ও সকেট কানেক্ট করা
  void initialize(String token) {
    _token = token;
    fetchUnreadCount();

    // সকেট লিসেন করুন: লাইভ নোটিফিকেশন আসলে কাউন্ট ১ বাড়বে এবং লিস্টের শুরুতে ঢুকবে
    _socketService.connect(
      token: token,
      onNewNotification: (newItem) {
        _unreadCount += 1;
        _notifications.insert(0, newItem);
        notifyListeners();
      },
    );
  }

  // ২. দ্রুত আনরিড কাউন্ট লোড
  Future<void> fetchUnreadCount() async {
    if (_token == null) return;
    try {
      final res = await _apiService.getUnreadCount(_token!);
      _unreadCount = res.unreadCount;
      notifyListeners();
    } catch (_) {}
  }

  // ৩. নোটিফিকেশন লিস্ট ফেচ (প্রথম পেজ বা রিফ্রেশ)
  Future<void> fetchNotifications({bool? isRead, bool refresh = false}) async {
    if (_token == null) return;
    if (refresh) {
      _currentPage = 1;
      _hasMore = true;
      _notifications = [];
    }

    _isLoading = true;
    notifyListeners();

    try {
      final res = await _apiService.getNotifications(
        token: _token!,
        page: _currentPage,
        limit: 15,
        isRead: isRead,
      );

      if (refresh) {
        _notifications = res.data;
      } else {
        _notifications.addAll(res.data);
      }

      _unreadCount = res.meta.unreadCount;
      _hasMore = res.meta.hasNextPage;
      _currentPage++;
    } catch (e) {
      print("Error fetching notifications: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ৪. নির্দিষ্ট নোটিফিকেশন Read মার্ক করা
  Future<void> markAsRead(String notificationId) async {
    if (_token == null) return;
    final index = _notifications.indexWhere((n) => n.notificationId == notificationId);
    if (index != -1 && !_notifications[index].isRead) {
      _notifications[index].isRead = true;
      if (_unreadCount > 0) _unreadCount -= 1;
      notifyListeners();
      await _apiService.markAsRead(token: _token!, notificationId: notificationId);
    }
  }

  // ৫. সব নোটিফিকেশন Read মার্ক করা
  Future<void> markAllAsRead() async {
    if (_token == null) return;
    for (var n in _notifications) {
      n.isRead = true;
    }
    _unreadCount = 0;
    notifyListeners();
    await _apiService.markAllAsRead(token: _token!);
  }

  @override
  void dispose() {
    _socketService.disconnect();
    super.dispose();
  }
}
```

---

## 🎨 5. Ready-to-Use UI Snippets

### ক. AppBar-এর জন্য নোটিফিকেশন বেল আইকন (Badge Icon)
হোমস্ক্রিনের `AppBar`-এ নোটিফিকেশন বেল আইকন দিন যা রিয়েল-টাইম আনরিড কাউন্ট ব্যাজ দেখাবে:

```dart
// lib/widgets/notification_badge_icon.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';
import '../screens/notification_list_screen.dart';

class NotificationBadgeIcon extends StatelessWidget {
  const NotificationBadgeIcon({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<NotificationProvider>(
      builder: (context, provider, child) {
        final count = provider.unreadCount;

        return Stack(
          alignment: Alignment.center,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_outlined, size: 28),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const NotificationListScreen(),
                  ),
                );
              },
            ),
            if (count > 0)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.redAccent,
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 18,
                    minHeight: 18,
                  ),
                  child: Text(
                    count > 99 ? '99+' : count.toString(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
```

---

### খ. সম্পূর্ণ নোটিফিকেশন লিস্ট স্ক্রিন (`notification_list_screen.dart`)
এই স্ক্রিনে রয়েছে:
- **সবগুলো (All)** এবং **অপঠিত (Unread)** ট্যাব।
- Pull-to-refresh।
- Infinite pagination scroll (নিচে স্ক্রোল করলে অটো লোড হবে)।
- **এক ক্লিকে সব পড়া মার্ক ("সব পঠিত করুন")** বাটন।
- ট্যাপ করলে Read হওয়া এবং বিস্তারিত ইনকোয়ারিতে যাওয়ার ব্যবস্থা।

```dart
// lib/screens/notification_list_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';
import '../models/notification_model.dart';

class NotificationListScreen extends StatefulWidget {
  const NotificationListScreen({Key? key}) : super(key: key);

  @override
  State<NotificationListScreen> createState() => _NotificationListScreenState();
}

class _NotificationListScreenState extends State<NotificationListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    // প্রথম পেজ ফেচ
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().fetchNotifications(refresh: true);
    });

    // স্ক্রোল লিসেনার (Infinite Scroll Pagination)
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >=
          _scrollController.position.maxScrollExtent - 200) {
        final provider = context.read<NotificationProvider>();
        if (!provider.isLoading && provider.hasMore) {
          final isUnreadTab = _tabController.index == 1;
          provider.fetchNotifications(isRead: isUnreadTab ? false : null);
        }
      }
    });

    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        final isUnreadTab = _tabController.index == 1;
        context.read<NotificationProvider>().fetchNotifications(
              isRead: isUnreadTab ? false : null,
              refresh: true,
            );
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('নোটিফিকেশন'),
        actions: [
          if (provider.unreadCount > 0)
            TextButton(
              onPressed: () => provider.markAllAsRead(),
              child: const Text(
                'সব পঠিত করুন',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: [
            const Tab(text: 'সবগুলো'),
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('অপঠিত'),
                  if (provider.unreadCount > 0) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.redAccent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${provider.unreadCount}',
                        style: const TextStyle(fontSize: 11, color: Colors.white),
                      ),
                    )
                  ]
                ],
              ),
            ),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          final isUnreadTab = _tabController.index == 1;
          await provider.fetchNotifications(
            isRead: isUnreadTab ? false : null,
            refresh: true,
          );
        },
        child: _buildListContent(provider),
      ),
    );
  }

  Widget _buildListContent(NotificationProvider provider) {
    if (provider.isLoading && provider.notifications.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.notifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notifications_none, size: 70, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text(
              'কোনো নোটিফিকেশন পাওয়া যায়নি',
              style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      controller: _scrollController,
      itemCount: provider.notifications.length + (provider.hasMore ? 1 : 0),
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        if (index == provider.notifications.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(child: CircularProgressIndicator()),
          );
        }

        final item = provider.notifications[index];
        return _NotificationTile(
          item: item,
          onTap: () {
            if (!item.isRead) {
              provider.markAsRead(item.notificationId);
            }
            // ইনকোয়ারি থাকলে ইনকোয়ারি ডিটেইলস পেজে নেভিগেট করুন
            if (item.inquiryId != null) {
              // Navigator.push(context, MaterialPageRoute(...));
            }
          },
        );
      },
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final NotificationItemModel item;
  final VoidCallback onTap;

  const _NotificationTile({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: item.isRead ? Colors.transparent : Colors.blue.withOpacity(0.06),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: item.isRead
              ? Colors.grey.shade200
              : Theme.of(context).primaryColor.withOpacity(0.15),
          child: Icon(
            item.inquiryId != null ? Icons.assignment_outlined : Icons.notifications,
            color: item.isRead ? Colors.grey.shade600 : Theme.of(context).primaryColor,
          ),
        ),
        title: Text(
          item.title,
          style: TextStyle(
            fontWeight: item.isRead ? FontWeight.normal : FontWeight.bold,
            fontSize: 15,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              item.message,
              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
            ),
            const SizedBox(height: 6),
            Text(
              _formatDate(item.createdAt),
              style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
            ),
          ],
        ),
        trailing: !item.isRead
            ? Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: Colors.blue,
                  shape: BoxShape.circle,
                ),
              )
            : null,
        onTap: onTap,
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 60) {
      return '${diff.inMinutes} মিনিট আগে';
    } else if (diff.inHours < 24) {
      return '${diff.inHours} ঘন্টা আগে';
    } else {
      return '${dt.day}/${dt.month}/${dt.year}';
    }
  }
}
```

---

## 🔔 6. Firebase Cloud Messaging (FCM Push Notifications)

ব্যাকএন্ড যেকোনো নতুন ইনকোয়ারি তৈরি হলে কোম্পানিগুলোর ডিভাইসে সরাসরি FCM পুশ পাঠায়। Flutter-এ FCM সেটআপ:

```dart
// lib/services/fcm_service.dart

import 'package:firebase_messaging/firebase_messaging.dart';

class FcmService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;

  Future<String?> initialize({
    required Function(String token) onTokenRefresh,
  }) async {
    // পারমিশন চাওয়া
    NotificationSettings settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      String? token = await _fcm.getToken();
      if (token != null) {
        onTokenRefresh(token);
      }

      // টোকেন রিফ্রেশ লিসেনার
      _fcm.onTokenRefresh.listen(onTokenRefresh);

      // অ্যাপ ফোরগ্রাউন্ডে থাকলে পুশ রিসিভ হ্যান্ডলার
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        print("FCM Foreground Message: ${message.notification?.title}");
      });

      return token;
    }
    return null;
  }
}
```

---

## ✅ চেকলিস্ট (Checklist for Flutter Developer)

1. [x] **কাউন্টারের জন্য:** `GET /api/v1/notifications/unread-count` কল করুন এবং রেসপন্সের `unreadCount` ব্যবহার করুন (`total` নয়)।
2. [x] **লিস্টের জন্য:** রেসপন্সের `response.data['data']` থেকে লিস্ট পার্স করুন (সরাসরি `response.data` নয়)।
3. [x] **নাল সেফটি:** নোটিফিকেশন মডেলে `inquiry`, `party`, `category` ফিল্ডগুলো যেন অবশ্যই Nullable (`?`) থাকে।
4. [x] **আইডি ফিল্ড:** নোটিফিকেশন আইডির কি হলো `notificationId`।
5. [x] **এক ক্লিকে সব পড়া মার্ক:** `PATCH /api/v1/notifications/read-all` কল করে ব্যাজ জিরো করুন।
6. [x] **রিয়েল-টাইম:** Socket.io ইভেন্ট `'notification'` শুনুন যাতে নতুন ইনকোয়ারি এলে সাথে সাথে নোটিফিকেশন লিস্ট এবং বেল আইকন আপডেট হয়।
