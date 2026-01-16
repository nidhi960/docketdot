import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Role from "../models/Role.js";
import auth from "../middleware/auth.js";
import { generateEmployeeId, generatePassword } from "../utils/helpers.js";
import { generateToken } from "../utils/generateToken.js";
import BlacklistedToken from "../models/BlacklistedToken.js";
import checkPermission from "../middleware/checkPermission.js";

const router = express.Router();

const cookieExpireTime = process.env.JWT_COOKIE_EXPIRES_IN || 1;

// 🔥 NUCLEAR OPTION: Force settings that work on Railway
// We explicitly set SameSite='none' and Secure=true
const getCookieOptions = () => {
  return {
    httpOnly: true,
    secure: true,       // ⚠️ MUST be true on Railway (HTTPS)
    sameSite: "none",   // ⚠️ MUST be 'none' for Cross-Domain
    maxAge: 24 * 60 * 60 * 1000 
  };
};

/* ---------------- LOGIN ---------------- */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: "error", message: "All fields are required" });
    }

    const user = await User.findOne({ email }).populate("role_id");
    if (!user) return res.status(400).json({ message: "Invalid Credentials" });
    if (user.status !== "active") return res.status(403).json({ message: "User inactive" });
    if (user.role_id.status !== "active") return res.status(403).json({ message: "Your Role is inactive" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid Credentials" });

    const token = generateToken(user._id, user.role_id._id);

    // ✅ FORCE COOKIE SETTINGS
    const cookieOptions = {
      ...getCookieOptions(),
      expires: new Date(Date.now() + cookieExpireTime * 24 * 60 * 60 * 1000),
    };

    console.log("Setting Cookie with options:", cookieOptions); // Debug log in Railway Logs

    res.cookie("jwt", token, cookieOptions);

    const userResp = user.toObject();
    delete userResp.password;
    res.json({ user: userResp });
  } catch (error) {
    next(error);
  }
});

router.get("/check", auth, async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
});

router.get("/logout", auth, async (req, res, next) => {
  try {
    const { token, expiryAt } = req.tokenDetails;
    await BlacklistedToken.create({ token, expiryAt });

    res.clearCookie("jwt", getCookieOptions());

    return res.status(200).json({ status: "success", message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
});

/* ---------------- CREATE USER ---------------- */
router.post("/create", auth, checkPermission, async (req, res, next) => {
  try {
    const { name, email, department, role_id, status } = req.body;

    if (!role_id) return res.status(400).json({ message: "Role required" });

    const role = await Role.findById(role_id);
    if (!role) return res.status(400).json({ message: "Invalid role" });

    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email exists" });

    const e_id = await generateEmployeeId(role.name, User);
    const rawPass = generatePassword();
    const hashedPass = await bcrypt.hash(rawPass, 10);

    const user = await User.create({
      name,
      email,
      department,
      role_id,
      status,
      e_id,
      password: hashedPass,
    });

    const userResp = user.toObject();
    delete userResp.password;

    res.json({
      message: "User created",
      e_id,
      password: rawPass,
      user: userResp,
    });
  } catch (err) {
    next(err);
  }
});

/* ---------------- BULK IMPORT USERS ---------------- */
router.post("/bulk-import", auth, checkPermission, async (req, res, next) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: "Users data is required" });
    }

    let imported = 0;
    let failed = 0;
    const errors = [];
    const credentials = [];

    for (let i = 0; i < users.length; i++) {
      const row = users[i];

      try {
        const { name, email, department, role_name, status } = row;

        if (!email || !role_name) {
          failed++;
          errors.push({
            row: i + 1,
            email,
            error: "Email and role are required",
          });
          continue;
        }

        if (await User.findOne({ email })) {
          failed++;
          errors.push({
            row: i + 1,
            email,
            error: "Email already exists",
          });
          continue;
        }

        const role = await Role.findOne({
          name: new RegExp(`^${role_name}$`, "i"),
        });

        if (!role) {
          failed++;
          errors.push({
            row: i + 1,
            email,
            error: `Invalid role: ${role_name}`,
          });
          continue;
        }

        const e_id = await generateEmployeeId(role.name, User);
        const rawPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        await User.create({
          name,
          email,
          department,
          role_id: role._id,
          status: status || "active",
          e_id,
          password: hashedPassword,
        });

        credentials.push({
          name,
          email,
          e_id,
          password: rawPassword,
        });

        imported++;
      } catch (rowError) {
        failed++;
        errors.push({
          row: i + 1,
          email: row.email,
          error: rowError.message,
        });
      }
    }

    res.json({
      message: "Bulk import completed",
      imported,
      failed,
      errors,
      credentials,
    });
  } catch (error) {
    next(error);
  }
});

/* ---------------- GET USERS ---------------- */
router.get("/users", auth, checkPermission, async (req, res, next) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("role_id", "name")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get("/clients", auth, checkPermission, async (req, res, next) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate({
        path: "role_id",
        match: { name: "Client" },
        select: "name",
      })
      .sort({ createdAt: -1 });

    const clients = users.filter((u) => u.role_id !== null);

    res.json(clients);
  } catch (error) {
    next(error);
  }
});

/* ---------------- UPDATE USER ---------------- */
router.put("/users/:id", auth, checkPermission, async (req, res, next) => {
  try {
    const { name, email, department, role_id, status } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.department = department ?? user.department;
    user.role_id = role_id ?? user.role_id;
    user.status = status ?? user.status;

    await user.save();

    const userResp = user.toObject();
    delete userResp.password;

    res.json({ message: "Updated", user: userResp });
  } catch (error) {
    next(error);
  }
});

/* ---------------- DELETE ---------------- */
router.delete("/users/:id", auth, checkPermission, async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    next(error);
  }
});

/* ---------------- RESET PASSWORD ---------------- */
router.post(
  "/reset-password/:id",
  auth,
  checkPermission,
  async (req, res, next) => {
    try {
      const { password } = req.body;

      if (!password || password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      user.password = hashedPassword;
      await user.save();

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

