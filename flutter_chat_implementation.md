# Flutter Socket.IO Chat Integration Guide

This guide details how to integrate the backend's real-time chat system into a Flutter application using Socket.IO and REST API endpoints.

---

## 1. Dependencies

Add the following packages to your Flutter `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  # Socket.IO client library matching Socket.IO v4 protocol
  socket_io_client: ^2.0.3+1
  # HTTP client for attachment uploads
  http: ^1.2.0
```

---

## 2. Establishing the WebSocket Connection

Initialize the Socket.IO manager with the backend endpoint and authenticate using the JWT token via query parameters.

### Connection Configuration:
*   **Protocol/Transport**: Force `websocket` to avoid proxy/Caddy polling disconnections.
*   **Authentication**: Provide the `token` in the handshake query.

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class ChatSocketService {
  IO.Socket? socket;

  void connect(String jwtToken) {
    // Configure socket.io options
    socket = IO.io(
      'https://dor.sakibalhasa.xyz',
      IO.OptionBuilder()
          .setTransports(['websocket']) // Force WebSocket only
          .setQuery({'token': jwtToken}) // Handshake auth token
          .disableAutoConnect()          // Connect manually
          .build(),
    );

    // Register connection status events
    socket!.onConnect((_) {
      print('Socket Connected successfully');
    });

    socket!.onDisconnect((_) {
      print('Socket Disconnected');
    });

    socket!.onConnectError((err) {
      print('Socket Connection Error: $err');
    });

    // Start connection
    socket!.connect();
  }

  void disconnect() {
    socket?.disconnect();
  }
}
```

---

## 3. Listening to Real-time Events

Register listeners to handle incoming messages, read receipts, and error notifications.

```dart
void registerListeners() {
  if (socket == null) return;

  // 1. Receive incoming messages
  socket!.on('message', (data) {
    // Structure of incoming data:
    // {
    //   "messageId": "UUID",
    //   "conversationId": "UUID",
    //   "senderId": "UUID",
    //   "senderRole": "ADMIN" | "VENDOR" | "PARTY" | "DRIVER" | "SUPER_ADMIN",
    //   "message": "Hello world",  (optional)
    //   "file": "uploads/chat/...", (optional)
    //   "image": "uploads/chat/...",(optional)
    //   "isRead": false,
    //   "createdAt": "2026-08-22T15:25:10.895Z"
    // }
    print('Received message: $data');
    // TODO: Update your Chat UI state / database
  });

  // 2. Listen to read notifications (when the other participant reads messages)
  socket!.on('messages_read', (data) {
    // Structure of incoming data:
    // {
    //   "conversationId": "UUID",
    //   "readerId": "UUID",
    //   "readerRole": "VENDOR",
    //   "count": 5
    // }
    print('Messages marked read: $data');
    // TODO: Update local messages UI to show "Read" status
  });

  // 3. Listen to server validation/auth errors
  socket!.on('error', (data) {
    print('Socket Server Error: $data');
  });
}
```

---

## 4. Emitting Client Actions

### A. Sending a Message (Text-only)
Emit the `send_message` event with the conversation ID and message text:

```dart
void sendMessage(String conversationId, String text) {
  if (socket == null || !socket!.connected) return;

  socket!.emit('send_message', {
    'conversationId': conversationId,
    'message': text,
  });
}
```

### B. Marking a Conversation as Read
Emit the `mark_read` event to notify the server and the other participant that you have read all messages in this conversation:

```dart
void markConversationAsRead(String conversationId) {
  if (socket == null || !socket!.connected) return;

  socket!.emit('mark_read', {
    'conversationId': conversationId,
  });
}
```

---

## 5. Sending Messages with Attachments (File / Image)

For sending attachments (files, photos, documents), use the **HTTP fallback endpoint** with `multipart/form-data`. This handles file uploads and broadcasts the completed message over WebSockets.

*   **Endpoint**: `POST https://dor.sakibalhasa.xyz/api/v1/chat/conversations/:id/messages`
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **Form Fields**:
    *   `message`: Text body (optional if files are sent)
    *   `file`: Binary file (optional)
    *   `image`: Binary image (optional)

```dart
import 'dart:io';
import 'package:http/http.dart' as http;

Future<void> sendChatMessageWithAttachments({
  required String conversationId,
  required String jwtToken,
  String? messageText,
  File? fileAttachment,
  File? imageAttachment,
}) async {
  final url = Uri.parse('https://dor.sakibalhasa.xyz/api/v1/chat/conversations/$conversationId/messages');
  
  final request = http.MultipartRequest('POST', url);
  
  // 1. Add authentication header
  request.headers['Authorization'] = 'Bearer $jwtToken';

  // 2. Add text fields
  if (messageText != null) {
    request.fields['message'] = messageText;
  }

  // 3. Add binary file attachments
  if (fileAttachment != null) {
    request.files.add(
      await http.MultipartFile.fromPath(
        'file', // Field name expected by backend FileFieldsInterceptor
        fileAttachment.path,
      ),
    );
  }

  // 4. Add binary image attachments
  if (imageAttachment != null) {
    request.files.add(
      await http.MultipartFile.fromPath(
        'image', // Field name expected by backend FileFieldsInterceptor
        imageAttachment.path,
      ),
    );
  }

  // 5. Send request
  try {
    final response = await request.send();
    if (response.statusCode == 201) {
      final responseBody = await response.stream.bytesToString();
      print('Attachment Message Sent Successfully: $responseBody');
    } else {
      print('Failed to send attachment message. Code: ${response.statusCode}');
    }
  } catch (e) {
    print('Error uploading attachment message: $e');
  }
}
```
