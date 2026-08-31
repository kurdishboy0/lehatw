const prisma = require('../db');
const sendEmail = require('../utils/sendEmail');
const { getDisplayName } = require('../utils/displayName');

const PROFILE_NAME_SELECT = {
  select: {
    id: true,
    email: true,
    studentProfile: { select: { fullName: true } },
    hrProfile: { select: { companyName: true } }
  }
};

function displayNameFromIncludedUser(user) {
  return user.studentProfile?.fullName || user.hrProfile?.companyName || user.email.split('@')[0];
}

// 1. Send a message. Persists it, then best-effort emails the recipient — an email
// failure never blocks the in-app message from being sent.
const sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content is required." });
    }
    if (Number(recipientId) === req.user.id) {
      return res.status(400).json({ message: "You can't message yourself." });
    }

    const recipient = await prisma.user.findUnique({ where: { id: Number(recipientId) } });
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found." });
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user.id,
        recipientId: recipient.id,
        content: content.trim()
      }
    });

    res.status(201).json({ message: "Message sent!", data: message });

    // Best-effort email notification — fired after responding so a slow SMTP
    // round-trip never delays the in-app "message sent" confirmation.
    Promise.all([
      getDisplayName(req.user),
      prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } })
    ])
      .then(([senderName, senderUser]) => sendEmail(
        recipient.email,
        `New message on Lehatw from ${senderName}`,
        `${senderName} (${senderUser.email}) sent you a message on Lehatw:\n\n"${content.trim()}"\n\nLog in to Lehatw to reply.`
      ))
      .catch((emailError) => console.error("Message notification email failed (non-fatal):", emailError));
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ message: "Server error sending message." });
  }
};

// 2. Inbox: one row per conversation, showing the other participant, the latest
// message, and how many unread messages they've sent you.
const getInbox = async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: req.user.id }, { recipientId: req.user.id }] },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: PROFILE_NAME_SELECT,
        recipient: PROFILE_NAME_SELECT
      }
    });

    const conversations = new Map();
    for (const msg of messages) {
      const otherUser = msg.senderId === req.user.id ? msg.recipient : msg.sender;
      if (!conversations.has(otherUser.id)) {
        conversations.set(otherUser.id, {
          userId: otherUser.id,
          name: displayNameFromIncludedUser(otherUser),
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: 0
        });
      }
      if (msg.recipientId === req.user.id && !msg.isRead) {
        conversations.get(otherUser.id).unreadCount += 1;
      }
    }

    res.status(200).json(Array.from(conversations.values()));
  } catch (error) {
    console.error("Get Inbox Error:", error);
    res.status(500).json({ message: "Server error fetching inbox." });
  }
};

// 3. One conversation thread with a specific user; opening it marks their messages read.
const getConversation = async (req, res) => {
  try {
    const otherUserId = Number(req.params.userId);

    // Independent reads run in parallel; marking messages read doesn't need to block the response.
    const [otherUser, messages] = await Promise.all([
      prisma.user.findUnique({ where: { id: otherUserId }, ...PROFILE_NAME_SELECT }),
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: req.user.id, recipientId: otherUserId },
            { senderId: otherUserId, recipientId: req.user.id }
          ]
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    if (!otherUser) {
      return res.status(404).json({ message: "User not found." });
    }

    prisma.message.updateMany({
      where: { senderId: otherUserId, recipientId: req.user.id, isRead: false },
      data: { isRead: true }
    }).catch((err) => console.error("Mark-as-read failed (non-fatal):", err));

    res.status(200).json({
      otherUser: { userId: otherUser.id, name: displayNameFromIncludedUser(otherUser) },
      messages
    });
  } catch (error) {
    console.error("Get Conversation Error:", error);
    res.status(500).json({ message: "Server error fetching conversation." });
  }
};

module.exports = { sendMessage, getInbox, getConversation };
