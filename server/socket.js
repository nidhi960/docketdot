import { Server } from "socket.io";
import Message from "./models/Message.js";

const onlineUsers = new Map(); // userId => socketId

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: "*", credentials: true },
  });

  io.on("connection", (socket) => {
    /* ---------------- USER ONLINE ---------------- */
    socket.on("join", (userId) => {
      if (!userId) return;
      onlineUsers.set(userId.toString(), socket.id);
      io.emit("online-users", Array.from(onlineUsers.keys()));
    });

    /* ---------------- JOIN ROOMS ---------------- */
    socket.on("join-conversation", (conversationId) => {
      if (!conversationId) return;
      socket.join(conversationId);
    });

    socket.on("join-conversations", (conversationIds = []) => {
      if (!Array.isArray(conversationIds)) return;
      conversationIds.forEach((id) => {
        if (id) socket.join(id);
      });
    });

    /* ---------------- SEND MESSAGE ---------------- */
    socket.on("send-message", ({ conversationId, message }) => {
      if (!conversationId || !message) return;

      // 1. Send to the room (for people who already have the chat open)
      io.to(conversationId).emit("new-message", { message });

      // 2. CRITICAL: Notify members individually (for those who don't have the room joined yet)
      // This works ONLY if your Backend Controller .populated('conversation') and 'members'
      const members = message.conversation?.members || [];
      members.forEach((member) => {
        const memberId = typeof member === "string" ? member : member._id;

        // Skip the sender
        if (memberId.toString() === message.sender?._id?.toString()) return;

        const recipientSocketId = onlineUsers.get(memberId.toString());
        if (recipientSocketId) {
          // Send directly to the recipient's personal socket
          io.to(recipientSocketId).emit("new-message", { message });
        }
      });
    });

    /* ---------------- TYPING ---------------- */
    socket.on("typing", ({ conversationId, user }) => {
      if (conversationId && user) {
        socket.to(conversationId).emit("typing", { conversationId, user });
      }
    });

    socket.on("stop-typing", ({ conversationId, userId }) => {
      if (conversationId && userId) {
        socket
          .to(conversationId)
          .emit("stop-typing", { conversationId, userId });
      }
    });

    /* ---------------- DELETE MESSAGE ---------------- */
    socket.on("delete-message", ({ messageId, conversationId }) => {
      if (messageId && conversationId) {
        io.to(conversationId).emit("message-deleted", { messageId });
      }
    });

    /* ---------------- READ RECEIPTS ---------------- */
    socket.on("read-messages", async ({ conversationId, userId }) => {
      if (!conversationId || !userId) return;

      await Message.updateMany(
        { conversation: conversationId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );

      socket
        .to(conversationId)
        .emit("messages-read", { conversationId, userId });
    });

    socket.on("new-conversation", (conversation) => {
      setConversations((prev) => {
        if (prev.some((c) => c._id === conversation._id)) return prev;
        return [conversation, ...prev];
      });
      // Recipient joins the room immediately
      socketRef.current?.emit("join-conversation", conversation._id);
    });
    /* ---------------- DISCONNECT ---------------- */
    socket.on("disconnect", () => {
      for (let [userId, sockId] of onlineUsers.entries()) {
        if (sockId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit("online-users", Array.from(onlineUsers.keys()));
    });
  });

  return io;
};
