# Flutter Chat Integration Guide (Socket.io & REST API)

이 문서/এই নির্দেশিকাটি আমাদের NestJS Backend (`dor-backend`)-এর Chat system-কে Flutter Mobile App-এ কীভাবে সঠিকভাবে Implement ও Integrate করবেন তা বিস্তারিত বর্ণনা করে।

---

## 📋 সূচিপত্র (Table of Contents)
1. [Backend Chat System Overview](#1-backend-chat-system-overview)
2. [Flutter Dependency Setup](#2-flutter-dependency-setup)
3. [Authentication & Socket Connection](#3-authentication--socket-connection)
4. [Data Models (Dart Models)](#4-data-models-dart-models)
5. [Socket.io Service Class](#5-socketio-service-class)
6. [HTTP REST API Service (Conversations & Message History)](#6-http-rest-api-service-conversations--message-history)
7. [State Management / Provider Example](#7-state-management--provider-example)
8. [Flutter UI Implementation (Chat Screen & Conversation List)](#8-flutter-ui-implementation-chat-screen--conversation-list)
9. [Sending Images & Files](#9-sending-images--files)
10. [Error Handling & Best Practices](#10-error-handling--best-practices)

---

## 1. Backend Chat System Overview

আমাদের Backend-এ Real-time Messaging-এর জন্য **Socket.io WebSocket Gateway** এবং Message History & Upload-এর জন্য **HTTP REST APIs** দুটি সুবিধাই রাখা হয়েছে।

* **Base URL (HTTP)**: `https://dor.sakibalhasa.xyz/api/v1` (বা আপনার স্থানীয় Server IP/URL)
* **WebSocket URL**: `https://dor.sakibalhasa.xyz` (Socket.io client ব্যবহার করে)
* **Role Types**: `USER`, `VENDOR`, `PARTY`, `ADMIN`, `DRIVER`, `EMPLOYEE`

---

## 2. Flutter Dependency Setup

আপনার Flutter প্রজেক্টের `pubspec.yaml` ফাইলে নিচের Package গুলো যুক্ত করুন:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Real-time WebSocket connection
  socket_io_client: ^3.0.2

  # HTTP request & API calls
  http: ^1.2.1
  
  # Image & File Selection
  image_picker: ^1.1.2
  file_picker: ^8.0.0
  
  # Provider / Riverpod / Bloc for State Management (Example uses Provider)
  provider: ^6.1.2

  # UI Formatting (Date/Time)
  intl: ^0.19.0
```

তৈরি হয়ে গেলে Terminal-এ প্রজেক্টে চালান:
```bash
flutter pub get
```

---

## 3. Authentication & Socket Connection

Socket.io সংযোগ স্থাপনের সময় **JWT Access Token** পাঠাতে হবে।

### Connection Rules:
1. **Handshake Query** অথবা **Authorization Header** দিয়ে Token পাঠাতে হবে:
   - Query: `?token=YOUR_JWT_ACCESS_TOKEN`
   - Header: `Authorization: Bearer YOUR_JWT_ACCESS_TOKEN`
2. Connection সফল হলে Backend থেকে ইউজারের নিজস্ব রূমে যুক্ত করে নেওয়া হবে: `user_${userId}`.

---

## 4. Data Models (Dart Models)

### A. Conversation Model (`conversation_model.dart`)

```dart
class ConversationModel {
  final String conversationId;
  final String userOneId;
  final String userOneRole;
  final String userTwoId;
  final String userTwoRole;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final int unreadCount;
  final DateTime createdAt;
  final Map<String, dynamic>? otherParticipant;

  ConversationModel({
    required this.conversationId,
    required this.userOneId,
    required this.userOneRole,
    required this.userTwoId,
    required this.userTwoRole,
    this.lastMessage,
    this.lastMessageAt,
    this.unreadCount = 0,
    required this.createdAt,
    this.otherParticipant,
  });

  factory ConversationModel.fromJson(Map<String, dynamic> json) {
    return ConversationModel(
      conversationId: json['conversationId'] ?? '',
      userOneId: json['userOneId'] ?? '',
      userOneRole: json['userOneRole'] ?? '',
      userTwoId: json['userTwoId'] ?? '',
      userTwoRole: json['userTwoRole'] ?? '',
      lastMessage: json['lastMessage'],
      lastMessageAt: json['lastMessageAt'] != null
          ? DateTime.parse(json['lastMessageAt'])
          : null,
      unreadCount: json['unreadCount'] ?? 0,
      createdAt: DateTime.parse(json['createdAt']),
      otherParticipant: json['otherParticipant'],
    );
  }
}
```

### B. Chat Message Model (`chat_message_model.dart`)

```dart
class ChatMessageModel {
  final String messageId;
  final String conversationId;
  final String senderId;
  final String senderRole;
  final String? message;
  final String? file;
  final String? image;
  bool isRead;
  final DateTime createdAt;

  ChatMessageModel({
    required this.messageId,
    required this.conversationId,
    required this.senderId,
    required this.senderRole,
    this.message,
    this.file,
    this.image,
    this.isRead = false,
    required this.createdAt,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      messageId: json['messageId'] ?? '',
      conversationId: json['conversationId'] ?? '',
      senderId: json['senderId'] ?? '',
      senderRole: json['senderRole'] ?? '',
      message: json['message'],
      file: json['file'],
      image: json['image'],
      isRead: json['isRead'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'messageId': messageId,
      'conversationId': conversationId,
      'senderId': senderId,
      'senderRole': senderRole,
      'message': message,
      'file': file,
      'image': image,
      'isRead': isRead,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
```

---

## 5. Socket.io Service Class (`chat_socket_service.dart`)

এই সার্ভিসটি Socket.io Connections, Global Event Listeners, এবং Events Emit পরিচালনা করবে।

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class ChatSocketService {
  IO.Socket? _socket;
  bool get isConnected => _socket?.connected ?? false;

  // Connection initialize
  void initSocket({
    required String baseUrl, // e.g. 'https://dor.sakibalhasa.xyz'
    required String accessToken,
    required Function(dynamic messageData) onMessageReceived,
    required Function(dynamic readData) onMessagesRead,
    required Function(String error) onError,
  }) {
    if (_socket != null && _socket!.connected) return;

    _socket = IO.io(
      baseUrl,
      IO.OptionBuilder()
          .setTransports(['websocket']) // websocket transport only
          .enableAutoConnect()
          .setQuery({'token': accessToken})
          .setExtraHeaders({'Authorization': 'Bearer $accessToken'})
          .build(),
    );

    _socket!.onConnect((_) {
      print('✅ Connected to Chat WebSocket Server');
    });

    _socket!.onDisconnect((_) {
      print('❌ Disconnected from Chat WebSocket Server');
    });

    _socket!.onConnectError((data) {
      print('⚠️ Connection Error: $data');
      onError('Connection Error: $data');
    });

    // Event: Incoming Message
    _socket!.on('message', (data) {
      print('📩 Received socket message: $data');
      onMessageReceived(data);
    });

    // Event: Read Confirmation
    _socket!.on('messages_read', (data) {
      print('👁️ Received messages_read event: $data');
      onMessagesRead(data);
    });

    // Event: Error
    _socket!.on('error', (data) {
      print('🚨 Socket error event: $data');
      onError(data['message'] ?? 'Socket Error');
    });
  }

  // Real-time Text Message Send
  void sendMessage({
    required String conversationId,
    String? message,
    String? fileUrl,
    String? imageUrl,
  }) {
    if (_socket == null || !_socket!.connected) {
      print('⚠️ Cannot send message: Socket is not connected');
      return;
    }

    _socket!.emit('send_message', {
      'conversationId': conversationId,
      'message': message,
      'file': fileUrl,
      'image': imageUrl,
    });
  }

  // Mark Conversation as Read
  void markAsRead({required String conversationId}) {
    if (_socket == null || !_socket!.connected) return;

    _socket!.emit('mark_read', {
      'conversationId': conversationId,
    });
  }

  // Disconnect Socket
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
```

---

## 6. HTTP REST API Service (`chat_api_service.dart`)

WebSocket সংযোগ বিচ্ছিন্ন হলেও মেসেজ হিস্ট্রি আনা, নতুন কনভারসেশন তৈরি বা ফাইল আপলোডের জন্য REST API সার্ভিসের মেথডসমূহ:

```dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'conversation_model.dart';
import 'chat_message_model.dart';

class ChatApiService {
  final String baseUrl = 'https://dor.sakibalhasa.xyz/api/v1';

  Map<String, String> _headers(String token) => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

  // 1. Get or Create Conversation
  Future<ConversationModel> getOrCreateConversation({
    required String token,
    required String receiverId,
    required String receiverRole, // e.g. 'VENDOR', 'PARTY', 'USER', etc.
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chat/conversations'),
      headers: _headers(token),
      body: jsonEncode({
        'receiverId': receiverId,
        'receiverRole': receiverRole,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final body = jsonDecode(response.body);
      final data = body['data'] ?? body;
      return ConversationModel.fromJson(data);
    } else {
      throw Exception('Failed to get/create conversation: ${response.body}');
    }
  }

  // 2. Get User Conversation List
  Future<List<ConversationModel>> listConversations(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/chat/conversations'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final body = jsonDecode(response.body);
      final List list = body['data'] ?? body;
      return list.map((json) => ConversationModel.fromJson(json)).toList();
    } else {
      throw Exception('Failed to list conversations: ${response.body}');
    }
  }

  // 3. Fetch Message History (Paginated)
  Future<List<ChatMessageModel>> getMessages({
    required String token,
    required String conversationId,
    int limit = 30,
    String? beforeMessageId,
  }) async {
    String url = '$baseUrl/chat/conversations/$conversationId/messages?limit=$limit';
    if (beforeMessageId != null) {
      url += '&before=$beforeMessageId';
    }

    final response = await http.get(
      Uri.parse(url),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final body = jsonDecode(response.body);
      final List list = body['data'] ?? body;
      return list.map((json) => ChatMessageModel.fromJson(json)).toList();
    } else {
      throw Exception('Failed to fetch messages: ${response.body}');
    }
  }

  // 4. Send Message via HTTP (Multipart for Image/File attachment)
  Future<ChatMessageModel> sendMessageWithAttachment({
    required String token,
    required String conversationId,
    String? textMessage,
    File? imageFile,
    File? documentFile,
  }) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/chat/conversations/$conversationId/messages'),
    );

    request.headers['Authorization'] = 'Bearer $token';

    if (textMessage != null && textMessage.isNotEmpty) {
      request.fields['message'] = textMessage;
    }

    if (imageFile != null) {
      request.files.add(await http.MultipartFile.fromPath(
        'image',
        imageFile.path,
      ));
    }

    if (documentFile != null) {
      request.files.add(await http.MultipartFile.fromPath(
        'file',
        documentFile.path,
      ));
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final body = jsonDecode(response.body);
      final data = body['data'] ?? body;
      return ChatMessageModel.fromJson(data);
    } else {
      throw Exception('Failed to send message via HTTP: ${response.body}');
    }
  }

  // 5. Mark Conversation Read via HTTP
  Future<void> markReadHttp({
    required String token,
    required String conversationId,
  }) async {
    await http.patch(
      Uri.parse('$baseUrl/chat/conversations/$conversationId/read'),
      headers: _headers(token),
    );
  }
}
```

---

## 7. State Management / Provider Example (`chat_provider.dart`)

```dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'conversation_model.dart';
import 'chat_message_model.dart';
import 'chat_socket_service.dart';
import 'chat_api_service.dart';

class ChatProvider extends ChangeNotifier {
  final ChatSocketService _socketService = ChatSocketService();
  final ChatApiService _apiService = ChatApiService();

  List<ConversationModel> conversations = [];
  List<ChatMessageModel> messages = [];
  bool isLoading = false;
  String? activeConversationId;
  String? currentUserId;

  // Initialize Connection
  void initSocket(String baseUrl, String token, String userId) {
    currentUserId = userId;
    _socketService.initSocket(
      baseUrl: baseUrl,
      accessToken: token,
      onMessageReceived: _handleIncomingSocketMessage,
      onMessagesRead: _handleIncomingReadEvent,
      onError: (err) => print('Provider Error: $err'),
    );
  }

  // Fetch Conversations List
  Future<void> loadConversations(String token) async {
    isLoading = true;
    notifyListeners();
    try {
      conversations = await _apiService.listConversations(token);
    } catch (e) {
      print('Load Conversations Error: $e');
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  // Open Chat Conversation & Load History
  Future<void> openConversation(String token, String conversationId) async {
    activeConversationId = conversationId;
    messages = [];
    isLoading = true;
    notifyListeners();

    try {
      messages = await _apiService.getMessages(
        token: token,
        conversationId: conversationId,
      );
      // Mark read via Socket & HTTP
      _socketService.markAsRead(conversationId: conversationId);
      await _apiService.markReadHttp(token: token, conversationId: conversationId);
    } catch (e) {
      print('Load Messages Error: $e');
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  // Send Text Message
  void sendTextMessage(String text) {
    if (activeConversationId == null || text.trim().isEmpty) return;

    _socketService.sendMessage(
      conversationId: activeConversationId!,
      message: text.trim(),
    );
  }

  // Send File or Image Message
  Future<void> sendMediaMessage(String token, {File? image, File? file}) async {
    if (activeConversationId == null) return;
    try {
      await _apiService.sendMessageWithAttachment(
        token: token,
        conversationId: activeConversationId!,
        imageFile: image,
        documentFile: file,
      );
    } catch (e) {
      print('Send Media Error: $e');
    }
  }

  // Internal Callback: Socket New Message Received
  void _handleIncomingSocketMessage(dynamic data) {
    final newMsg = ChatMessageModel.fromJson(Map<String, dynamic>.from(data));

    // If active conversation matches, add message to list
    if (activeConversationId == newMsg.conversationId) {
      messages.insert(0, newMsg); // Or append depending on list direction
      if (newMsg.senderId != currentUserId) {
        _socketService.markAsRead(conversationId: activeConversationId!);
      }
      notifyListeners();
    }

    // Update conversation item lastMessage in the main list
    final index = conversations.indexWhere((c) => c.conversationId == newMsg.conversationId);
    if (index != -1) {
      // Refresh list
      loadConversations(currentUserId ?? '');
    }
  }

  // Internal Callback: Socket Mark Read Event
  void _handleIncomingReadEvent(dynamic data) {
    final convId = data['conversationId'];
    if (activeConversationId == convId) {
      for (var msg in messages) {
        msg.isRead = true;
      }
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _socketService.disconnect();
    super.dispose();
  }
}
```

---

## 8. Flutter UI Implementation

### Chat Screen (`chat_screen.dart`)

```dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'chat_provider.dart';
import 'chat_message_model.dart';

class ChatScreen extends StatefulWidget {
  final String conversationId;
  final String token;
  final String currentUserId;
  final String recipientName;

  const ChatScreen({
    Key? key,
    required this.conversationId,
    required this.token,
    required this.currentUserId,
    required this.recipientName,
  }) : super(key: key);

  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _textController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<ChatProvider>(context, listenFalse);
      provider.openConversation(widget.token, widget.conversationId);
    });
  }

  void _sendText() {
    if (_textController.text.trim().isEmpty) return;
    final provider = Provider.of<ChatProvider>(context, listenFalse);
    provider.sendTextMessage(_textController.text.trim());
    _textController.clear();
  }

  Future<void> _pickAndSendImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      final provider = Provider.of<ChatProvider>(context, listenFalse);
      provider.sendMediaMessage(widget.token, image: File(pickedFile.path));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.recipientName),
      ),
      body: Consumer<ChatProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          return Column(
            children: [
              Expanded(
                child: ListView.builder(
                  reverse: true, // Show latest message at the bottom
                  itemCount: provider.messages.length,
                  itemBuilder: (context, index) {
                    final msg = provider.messages[index];
                    final isMe = msg.senderId == widget.currentUserId;
                    return _buildMessageBubble(msg, isMe);
                  },
                ),
              ),
              _buildInputArea(),
            ],
          );
        },
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessageModel msg, bool isMe) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isMe ? Colors.blue[600] : Colors.grey[300],
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment:
              isMe ? CrossAlignment.end : CrossAlignment.start,
          children: [
            if (msg.image != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 6.0),
                child: Image.network(
                  'https://dor.sakibalhasa.xyz${msg.image}',
                  width: 200,
                  fit: BoxFit.cover,
                ),
              ),
            if (msg.message != null && msg.message!.isNotEmpty)
              Text(
                msg.message!,
                style: TextStyle(
                  color: isMe ? Colors.white : Colors.black87,
                  fontSize: 15,
                ),
              ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${msg.createdAt.hour}:${msg.createdAt.minute.toString().padLeft(2, '0')}',
                  style: TextStyle(
                    fontSize: 10,
                    color: isMe ? Colors.white70 : Colors.black54,
                  ),
                ),
                if (isMe) ...[
                  const SizedBox(width: 4),
                  Icon(
                    msg.isRead ? Icons.done_all : Icons.done,
                    size: 14,
                    color: msg.isRead ? Colors.cyanAccent : Colors.white70,
                  )
                ]
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(8),
      color: Colors.white,
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.image, color: Colors.blue),
            onPressed: _pickAndSendImage,
          ),
          Expanded(
            child: TextField(
              controller: _textController,
              decoration: const InputDecoration(
                hintText: 'Type a message...',
                border: InputBorder.none,
              ),
              onSubmitted: (_) => _sendText(),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.send, color: Colors.blue),
            onPressed: _sendText,
          ),
        ],
      ),
    );
  }
}
```

---

## 9. Sending Images & Files

1. **HTTP Multipart API**: ছোট বা মাঝারি সাইজের ইমেজ বা ফাইল পাঠানোর সময় HTTP POST Endpoint (`/api/v1/chat/conversations/:id/messages`) ব্যবহার করা সবচেয়ে সুবিধাজনক।
2. Server এ ফাইল সেভ হওয়ার পর Gateway নিজে থেকেই উভয় ইউজারের সকেটে Live Message Broadcast করে দেয়।

---

## 10. Error Handling & Best Practices

1. **Socket Transports**: Flutter `socket_io_client`-এ অবশ্যই `['websocket']` Transport সেট করবেন, যাতে unnecessary Long Pooling Polling না ঘটে।
2. **Auto-Reconnect**: মোবাইল নেটওয়ার্ক স্যুইচিং হলে অ্যাপ যাতে স্বয়ংক্রিয়ভাবে Reconnect করতে পারে তার জন্য App Lifecycle Handler দিয়ে Background to Foreground স্টেট হ্যান্ডেল করুন।
3. **Pagination**: `GET /api/v1/chat/conversations/:id/messages?limit=30&before=LAST_MESSAGE_ID` ব্যবহার করে Scroll position ধরে রেখে পুরোনো মেসেজ লোড করুন।
