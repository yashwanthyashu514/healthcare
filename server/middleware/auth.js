const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No authentication token, access denied'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        req.userHospital = decoded.hospital;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token is invalid or expired'
        });
    }
};

const requireSuperAdmin = (req, res, next) => {
    if (req.userRole !== 'SUPER_ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. SUPER_ADMIN role required.'
        });
    }
    next();
};

const requireHospitalAdmin = (req, res, next) => {
    if (req.userRole !== 'HOSPITAL_ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. HOSPITAL_ADMIN role required.'
        });
    }
    next();
};

module.exports = { authMiddleware, requireSuperAdmin, requireHospitalAdmin };
