const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  // 1. Look for the badge in the request headers
  const authHeader = req.headers.authorization;

  // 2. If there is no badge, or it's not formatted correctly, kick them out
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Not authorized, no token provided!" });
  }

  try {
    // 3. Extract just the token string (remove the word "Bearer ")
    const token = authHeader.split(' ')[1];

    // 4. Verify the badge is real using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Attach the user's ID and Role to the request so the next function knows who they are
    req.user = decoded;
    
    // 6. Open the door and let them through!
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, invalid token!" });
  }
};

// NEW: The Admin Bouncer
const adminOnly = (req, res, next) => {
  // We check the role that was decoded from the token in the protect function
  if (req.user && req.user.role === 'ADMIN') {
    next(); // Let them through!
  } else {
    res.status(403).json({ message: "Access denied. Admins only!" });
  }
};

// Make sure to export both!
module.exports = { protect, adminOnly };