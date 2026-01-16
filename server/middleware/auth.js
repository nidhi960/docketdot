import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { configDotenv } from "dotenv";
import BlacklistedToken from "../models/BlacklistedToken.js";
import { generateToken } from "../utils/generateToken.js";

configDotenv({ quiet: true });

const environment = process.env.NODE_ENV;
const jwtSecretKey = process.env.JWT_SECRET;
const cookieExpireTime = process.env.JWT_COOKIE_EXPIRES_IN;

const auth = async (req, res, next) => {
  try {
    // 1. Check for token
    const token = req?.cookies?.jwt;
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: No token found",
      });
    }

    // 2. Check Blacklist
    const blacklistItem = await BlacklistedToken.findOne({ token });
    if (blacklistItem) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: Invalid token found",
      });
    }

    // 3. Verify Token
    const decoded = jwt.verify(token, jwtSecretKey);
    if (!decoded) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: Invalid token found",
      });
    }

    // 4. Find User
    const user = await User.findById(decoded.id)
      .select("-password")
      .populate("role_id");

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "No user found",
      });
    }

    // ============================================================
    // FIXED COOKIE OPTIONS (Used for Clearing & Renewing)
    // ============================================================
    const isProduction = environment === "production";
    
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // True in Production
      sameSite: isProduction ? "none" : "lax", // 'none' is REQUIRED for cross-domain
    };

    // 5. Check Inactive Role
    if (user.role_id.status !== "active") {
      res.clearCookie("jwt", cookieOptions); // Use fixed options
      return res.status(403).json({
        status: "error",
        message: "Your role is inactive. Please contact support.",
      });
    }

    // 6. Check Inactive User
    if (user.status !== "active") {
      res.clearCookie("jwt", cookieOptions); // Use fixed options
      return res.status(403).json({
        status: "error",
        message: "Your account is inactive. Please contact support.",
      });
    }

    req.user = user;
    req.tokenDetails = {
      token,
      expiryAt: decoded.exp,
    };

    // 7. Token Renewal Logic
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    const renewalThreshold = 30 * 60; // 30 minutes in seconds

    if (
      timeUntilExpiry < renewalThreshold &&
      req.originalUrl !== "/api/auth/logout"
    ) {
      try {
        await BlacklistedToken.create({ token, expiryAt: decoded.exp });
      } catch (error) {
        throw new Error("A database error occurred while trying to save data.");
      }

      const newToken = generateToken(user._id);

      // Set the renewed cookie with the correct settings
      res.cookie("jwt", newToken, {
        ...cookieOptions,
        expires: new Date(Date.now() + cookieExpireTime * 24 * 60 * 60 * 1000),
      });
    }

    next();
  } catch (error) {
    if (
      error.message === "A database error occurred while trying to save data."
    ) {
      next(error);
    } else {
      console.error("Auth Middleware Error:", error.message);
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: JWT expired or invalid",
      });
    }
  }
};

export default auth;
