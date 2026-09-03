const prisma = require('../db');

// A user's recent notifications plus their unread count, for the notification bell.
const getMyNotifications = async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } })
    ]);

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ message: 'Server error fetching notifications.' });
  }
};

// Mark a single notification (by id) or all of the user's notifications ("all") as read.
const markNotificationsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await prisma.notification.updateMany({
        where: { userId: req.user.id, isRead: false },
        data: { isRead: true }
      });
    } else {
      await prisma.notification.updateMany({
        where: { id: parseInt(id), userId: req.user.id },
        data: { isRead: true }
      });
    }

    res.status(200).json({ message: 'Marked as read.' });
  } catch (error) {
    console.error('Mark Notification Read Error:', error);
    res.status(500).json({ message: 'Server error updating notification.' });
  }
};

module.exports = { getMyNotifications, markNotificationsRead };
