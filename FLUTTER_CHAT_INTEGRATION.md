# Flutter Chat Integration Guide
**DOR Backend - Messenger-like Chat, Location Tracking, Unread Counter & FCM Integration**

---

## Table of Contents
1. [Base URLs & Authentication](#1-base-urls--authentication)
2. [Data Models (Dart)](#2-data-models-dart)
3. [REST API Endpoints](#3-rest-api-endpoints)
   - [3.1 List Conversations (with Unread Count)](#31-list-conversations-with-unread-count)
   - [3.2 Total Unread Message Count](#32-total-unread-message-count)
   - [3.3 Get Message History](#33-get-message-history)
   - [3.4 Send Message (Text / Image / File / Location)](#34-send-message-text--image--file--location)
   - [3.5 Update Live Location / Stop Sharing](#35-update-live-location--stop-sharing)
   - [3.6 Mark Conversation as Read](#36-mark-conversation-as-read)
4. [Socket.IO Real-Time Integration](#4-socketio-real-time-integration)
   - [4.1 Connecting to Socket](#41-connecting-to-socket)
   - [4.2 Listening to Incoming Messages & Live Updates](#42-listening-to-incoming-messages--live-updates)
   - [4.3 Sending Messages & Updating Live Location via Sockets](#43-sending-messages--updating-live-location-via-sockets)
5. [FCM Push Notification Setup](#5-fcm-push-notification-setup)
   - [5.1 Registering FCM Token](#51-registering-fcm-token)
   - [5.2 Handling Notifications & Deep Linking](#52-handling-notifications--deep-linking)
6. [Complete Flutter Socket Service Example](#6-complete-flutter-socket-service-example)

---

## 1. Base URLs & Authentication

- **HTTP Base URL**: `https://dor.sakibalhasa.xyz/api/v1` (or local `http://<YOUR_IP>:3000/api/v1`)
- **WebSocket URL**: `https://dor.sakibalhasa.xyz` (or local `http://<YOUR_IP>:3000`)
- **Auth Header**:
  ```http
  Authorization: Bearer <ACCESS_TOKEN>
  ```

---

## 2. Data Models (Dart)

### `ChatMessage` Model
```dart
class ChatMessage {
  final String messageId;
  final String conversationId;
  final String senderId;
  final String senderRole;
  final String? message;
  final String? file;
  final String? image;
  final double? latitude;
  final double? longitude;
  final String? locationName;
  final bool isLiveLocation;
  final DateTime? liveExpiresAt;
  final bool isRead;
  final DateTime createdAt;

  ChatMessage({
    required this.messageId,
    required this.conversationId,
    required this.senderId,
    required this.senderRole,
    this.message,
    this.file,
    this.image,
    this.latitude,
    this.longitude,
    this.locationName,
    this.isLiveLocation = false,
    this.liveExpiresAt,
    required this.isRead,
    required this.createdAt,
  });

  bool get isLocation => latitude != null && longitude != null;
  bool get isLiveActive =>
      isLiveLocation &&
      liveExpiresAt != null &&
      liveExpiresAt!.isAfter(DateTime.now());

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      messageId: json['messageId'] ?? '',
      conversationId: json['conversationId'] ?? '',
      senderId: json['senderId'] ?? '',
      senderRole: json['senderRole'] ?? '',
      message: json['message'],
      file: json['file'],
      image: json['image'],
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      locationName: json['locationName'],
      isLiveLocation: json['isLiveLocation'] ?? false,
      liveExpiresAt: json['liveExpiresAt'] != null
          ? DateTime.parse(json['liveExpiresAt'])
          : null,
      isRead: json['isRead'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'messageId': messageId,
        'conversationId': conversationId,
        'senderId': senderId,
        'senderRole': senderRole,
        'message': message,
        'file': file,
        'image': image,
        'latitude': latitude,
        'longitude': longitude,
        'locationName': locationName,
        'isLiveLocation': isLiveLocation,
        'liveExpiresAt': liveExpiresAt?.toIso8601String(),
        'isRead': isRead,
        'createdAt': createdAt.toIso8601String(),
      };
}
```

### `ConversationItem` Model
```dart
class ConversationItem {
  final String id;
  final Participant otherParticipant;
  final ChatMessage? lastMessage;
  final int unreadCount;
  final DateTime updatedAt;

  ConversationItem({
    required this.id,
    required this.otherParticipant,
    this.lastMessage,
    required this.unreadCount,
    required this.updatedAt,
  });

  factory ConversationItem.fromJson(Map<String, dynamic> json) {
    return ConversationItem(
      id: json['id'],
      otherParticipant: Participant.fromJson(json['otherParticipant']),
      lastMessage: json['lastMessage'] != null
          ? ChatMessage.fromJson(json['lastMessage'])
          : null,
      unreadCount: json['unreadCount'] ?? 0,
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }
}

class Participant {
  final String id;
  final String name;
  final String role;
  final String? image;
  final String? email;

  Participant({
    required this.id,
    required this.name,
    required this.role,
    this.image,
    this.email,
  });

  factory Participant.fromJson(Map<String, dynamic> json) {
    return Participant(
      id: json['id'],
      name: json['name'] ?? '',
      role: json['role'] ?? '',
      image: json['image'],
      email: json['email'],
    );
  }
}
```

---

## 3. REST API Endpoints

### 3.1 List Conversations (with Unread Count)
- **Endpoint**: `GET /chat/conversations`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "5b7bcdf7-70c8-4ec3-aa11-69b31d983d50",
      "otherParticipant": {
        "id": "dd3462c9-9b2b-40cc-b6b4-12e4342bb00f",
        "name": "Seed Company",
        "role": "VENDOR",
        "image": null,
        "email": "company@example.com"
      },
      "lastMessage": {
        "messageId": "5646fc66-588c-45eb-999f-9d842303cc6c",
        "message": null,
        "latitude": 23.8155,
        "longitude": 90.4190,
        "locationName": "Mirpur 10 - Live Tracking",
        "isLiveLocation": true,
        "liveExpiresAt": "2026-09-14T18:47:39.730Z",
        "isRead": false,
        "createdAt": "2026-09-14T18:17:39.744Z"
      },
      "unreadCount": 2,
      "updatedAt": "2026-09-14T18:17:39.771Z"
    }
  ]
}
```

---

### 3.2 Total Unread Message Count
Use this for showing a badge on the bottom navigation tab (e.g. `Chat (3)`).
- **Endpoint**: `GET /chat/unread-count`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "totalUnreadCount": 3,
    "conversations": [
      {
        "conversationId": "5b7bcdf7-70c8-4ec3-aa11-69b31d983d50",
        "unreadCount": 2
      },
      {
        "conversationId": "6d8d8275-2601-4eed-a124-c2694a4e0eda",
        "unreadCount": 1
      }
    ]
  }
}
```

---

### 3.3 Get Message History
- **Endpoint**: `GET /chat/conversations/:id/messages?limit=50&before=<ISO_TIMESTAMP>`
- **Headers**: `Authorization: Bearer <TOKEN>`

---

### 3.4 Send Message (Text / Image / File / Location)
- **Endpoint**: `POST /chat/conversations/:id/messages`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Content-Type**: `application/json` (or `multipart/form-data` if uploading file/image)

#### Option A: Sending Static Location
```json
{
  "latitude": 23.8103,
  "longitude": 90.4125,
  "locationName": "Mirpur 10, Dhaka"
}
```

#### Option B: Sending Live Location (e.g. for 30 or 60 minutes)
```json
{
  "latitude": 23.8103,
  "longitude": 90.4125,
  "locationName": "Sharing live location",
  "isLiveLocation": true,
  "liveDurationMinutes": 30
}
```

#### Option C: Normal Text Message
```json
{
  "message": "Hello, how are you?"
}
```

- **Response (`201 Created`)**:
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "messageId": "5646fc66-588c-45eb-999f-9d842303cc6c",
    "conversationId": "5b7bcdf7-70c8-4ec3-aa11-69b31d983d50",
    "senderId": "dd3462c9-9b2b-40cc-b6b4-12e4342bb00f",
    "senderRole": "VENDOR",
    "message": null,
    "latitude": 23.8103,
    "longitude": 90.4125,
    "locationName": "Sharing live location",
    "isLiveLocation": true,
    "liveExpiresAt": "2026-09-14T18:47:39.730Z",
    "isRead": false,
    "createdAt": "2026-09-14T18:17:39.744Z"
  }
}
```

---

### 3.5 Update Live Location / Stop Sharing
As the device moves, periodically call this endpoint (or use WebSocket) to update coordinates.
- **Endpoint**: `PATCH /chat/conversations/:id/messages/:messageId/location`
- **Headers**: `Authorization: Bearer <TOKEN>`

#### To Update Coordinates:
```json
{
  "latitude": 23.8155,
  "longitude": 90.4190
}
```

#### To Stop Sharing Live Location Early:
```json
{
  "latitude": 23.8155,
  "longitude": 90.4190,
  "isStop": true
}
```

- **Response (`200 OK`)**:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "chatMessage": {
      "messageId": "5646fc66-588c-45eb-999f-9d842303cc6c",
      "latitude": 23.8155,
      "longitude": 90.4190,
      "isLiveLocation": true
    },
    "isLive": true
  }
}
```

---

### 3.6 Mark Conversation as Read
Call this when the user opens the chat screen.
- **Endpoint**: `PATCH /chat/conversations/:id/read`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response**:
```json
{
  "success": true,
  "data": {
    "count": 2,
    "receiverId": "dd3462c9-9b2b-40cc-b6b4-12e4342bb00f",
    "receiverRole": "VENDOR"
  }
}
```

---

## 4. Socket.IO Real-Time Integration

Install `socket_io_client` in Flutter:
```yaml
dependencies:
  socket_io_client: ^2.0.3+1
```

### 4.1 Connecting to Socket
Pass the JWT token in `auth` or `query`:
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

IO.Socket socket = IO.io(
  'https://dor.sakibalhasa.xyz',
  IO.OptionBuilder()
      .setTransports(['websocket'])
      .enableAutoConnect()
      .setQuery({'token': accessToken})
      .setExtraHeaders({'authorization': 'Bearer $accessToken'})
      .build(),
);

socket.onConnect((_) {
  print('✅ Connected to Chat WebSocket');
});

socket.onDisconnect((_) => print('❌ Disconnected from Chat WebSocket'));
socket.onConnectError((err) => print('⚠️ Connect Error: $err'));
```

### 4.2 Listening to Incoming Messages & Live Updates

#### 1. Incoming Messages (`'message'`)
Fired when a new message (text, image, or location) arrives:
```dart
socket.on('message', (data) {
  print('📩 New message received: $data');
  // data contains:
  // - messageId, conversationId, senderId, senderRole
  // - message, file, image
  // - latitude, longitude, locationName, isLiveLocation, liveExpiresAt
  // - receiverUnreadCount, receiverTotalUnreadCount (Use to update badges instantly!)

  final message = ChatMessage.fromJson(data);
  // Add to your chat state list
  // Update badge counter with data['receiverTotalUnreadCount']
});
```

#### 2. Live Location Updates (`'live_location_updated'`)
Fired when the sender moves or stops live tracking:
```dart
socket.on('live_location_updated', (data) {
  print('📍 Live location updated: $data');
  // data contains:
  // - conversationId
  // - messageId
  // - latitude
  // - longitude
  // - isLiveLocation (false if stopped or expired)
  // - isLive (bool)

  final messageId = data['messageId'];
  final newLat = data['latitude'];
  final newLng = data['longitude'];
  final isLive = data['isLive'];

  // Update marker position on Google Map in chat
});
```

#### 3. Messages Read (`'messages_read'`)
Fired when the other person opens the chat and reads messages:
```dart
socket.on('messages_read', (data) {
  print('👁️ Messages read: $data');
  // data contains: { conversationId, readerId, readerRole, count }
  // Update your message status to seen/read (double blue tick)
});
```

### 4.3 Sending Messages & Updating Live Location via Sockets

#### Send Message via Socket:
```dart
socket.emit('send_message', {
  'conversationId': conversationId,
  'message': 'Hello from Flutter!',
  // For location:
  'latitude': 23.8103,
  'longitude': 90.4125,
  'locationName': 'Dhaka, Bangladesh',
  'isLiveLocation': false, // or true for live tracking
  'liveDurationMinutes': 30,
});
```

#### Update Live Location via Socket:
```dart
socket.emit('update_live_location', {
  'conversationId': conversationId,
  'messageId': activeLiveMessageId,
  'latitude': newLatitude,
  'longitude': newLongitude,
  'isStop': false, // set true to stop sharing
});
```

#### Mark as Read via Socket:
```dart
socket.emit('mark_read', {
  'conversationId': conversationId,
});
```

---

## 5. FCM Push Notification Setup

When a message is sent, the backend automatically triggers an FCM push notification with:
- **Title**: `নতুন বার্তা: <Sender Name>`
- **Body**: Text preview or `📍 [লোকেশন শেয়ার করা হয়েছে]` / `📷 [ছবি পাঠানো হয়েছে]`
- **Android Channel ID**: `chat_messages` (High priority with sound)
- **APNs Sound & Badge**: Automatically sent to iOS
- **Data payload**:
  ```json
  {
    "type": "CHAT_MESSAGE",
    "conversationId": "5b7bcdf7-70c8-4ec3-aa11-69b31d983d50",
    "senderId": "dd3462c9-9b2b-40cc-b6b4-12e4342bb00f",
    "senderName": "Seed Company",
    "messageId": "5646fc66-588c-45eb-999f-9d842303cc6c",
    "unreadCount": "2",
    "totalUnreadCount": "3",
    "click_action": "FLUTTER_NOTIFICATION_CLICK"
  }
  ```

### 5.1 Registering FCM Token
After logging in, send the device FCM token to the backend:
```dart
Future<void> registerFcmToken(String fcmToken) async {
  final response = await http.post(
    Uri.parse('https://dor.sakibalhasa.xyz/api/v1/auth/fcm-token'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken',
    },
    body: jsonEncode({'fcmToken': fcmToken}),
  );
  print('FCM Token Register: ${response.statusCode}');
}
```

### 5.2 Handling Notifications & Deep Linking
```dart
FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
  if (message.data['type'] == 'CHAT_MESSAGE') {
    final conversationId = message.data['conversationId'];
    // Navigate to ChatScreen(conversationId: conversationId)
  }
});
```

---

## 6. Complete Flutter Socket Service Example

```dart
import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;

class ChatSocketService {
  static final ChatSocketService _instance = ChatSocketService._internal();
  factory ChatSocketService() => _instance;
  ChatSocketService._internal();

  IO.Socket? _socket;

  final _messageController = StreamController<Map<String, dynamic>>.broadcast();
  final _liveLocationController = StreamController<Map<String, dynamic>>.broadcast();
  final _readController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get onMessage => _messageController.stream;
  Stream<Map<String, dynamic>> get onLiveLocation => _liveLocationController.stream;
  Stream<Map<String, dynamic>> get onRead => _readController.stream;

  void connect(String serverUrl, String token) {
    if (_socket != null && _socket!.connected) return;

    _socket = IO.io(
      serverUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .setQuery({'token': token})
          .setExtraHeaders({'authorization': 'Bearer $token'})
          .build(),
    );

    _socket!.onConnect((_) => print('✅ Socket Connected'));
    _socket!.onDisconnect((_) => print('❌ Socket Disconnected'));

    _socket!.on('message', (data) {
      if (data is Map<String, dynamic>) {
        _messageController.add(data);
      }
    });

    _socket!.on('live_location_updated', (data) {
      if (data is Map<String, dynamic>) {
        _liveLocationController.add(data);
      }
    });

    _socket!.on('messages_read', (data) {
      if (data is Map<String, dynamic>) {
        _readController.add(data);
      }
    });
  }

  void sendMessage({
    required String conversationId,
    String? text,
    double? latitude,
    double? longitude,
    String? locationName,
    bool isLiveLocation = false,
    int liveDurationMinutes = 60,
  }) {
    _socket?.emit('send_message', {
      'conversationId': conversationId,
      'message': text,
      'latitude': latitude,
      'longitude': longitude,
      'locationName': locationName,
      'isLiveLocation': isLiveLocation,
      'liveDurationMinutes': liveDurationMinutes,
    });
  }

  void updateLiveLocation({
    required String conversationId,
    required String messageId,
    required double latitude,
    required double longitude,
    bool isStop = false,
  }) {
    _socket?.emit('update_live_location', {
      'conversationId': conversationId,
      'messageId': messageId,
      'latitude': latitude,
      'longitude': longitude,
      'isStop': isStop,
    });
  }

  void markAsRead(String conversationId) {
    _socket?.emit('mark_read', {
      'conversationId': conversationId,
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
```
