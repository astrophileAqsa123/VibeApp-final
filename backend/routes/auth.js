const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const router = express.Router();

const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { createRateLimiter } = require("../middleware/rateLimit");


const authLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 20,
  prefix: "auth"
});

const otpLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 5,
  prefix: "otp"
});


function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}


function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}


function isStrongPassword(password) {
  return (
    String(password || "").length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
}


function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      userId: user._id,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}


function generateOtp() {
  return crypto
    .randomInt(100000, 999999)
    .toString();
}


async function sendOtpEmail(email, otp) {
  const subject =
    "VibeApp — Verify your email";

  const text =
    `Your VibeApp verification code is: ${otp}\n\n` +
    `This code expires in 15 minutes.\n\n` +
    `If you did not sign up, ignore this email.`;

  await sendEmail(
    email,
    subject,
    text
  );
}


/*
  ==========================================================
  SIGN UP
  POST /api/auth/signup
  ==========================================================
*/

router.post(
  "/signup",
  authLimiter,
  async (req, res) => {
    try {
      const name =
        String(req.body.name || "").trim();

      const email =
        normalizeEmail(req.body.email);

      const password =
        String(req.body.password || "");


      if (!name) {
        return res
          .status(400)
          .json({
            message: "Full name is required"
          });
      }


      if (name.length < 3) {
        return res
          .status(400)
          .json({
            message:
              "Name must be at least 3 characters"
          });
      }


      if (!email) {
        return res
          .status(400)
          .json({
            message: "Email is required"
          });
      }


      if (!isValidEmail(email)) {
        return res
          .status(400)
          .json({
            message:
              "Please enter a valid email address"
          });
      }


      if (!password) {
        return res
          .status(400)
          .json({
            message: "Password is required"
          });
      }


      if (!isStrongPassword(password)) {
        return res
          .status(400)
          .json({
            message:
              "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
          });
      }


      const existingUser =
        await User.findOne({
          email
        });


      if (
        existingUser &&
        existingUser.isVerified
      ) {
        return res
          .status(400)
          .json({
            message:
              "User already exists with this email"
          });
      }


      const otp =
        generateOtp();

      const otpExpires =
        new Date(
          Date.now() +
          15 * 60 * 1000
        );


      const hashedOtp =
        await bcrypt.hash(
          otp,
          10
        );


      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );


      if (
        existingUser &&
        !existingUser.isVerified
      ) {
        existingUser.name =
          name;

        existingUser.password =
          hashedPassword;

        existingUser.otp =
          hashedOtp;

        existingUser.otpExpires =
          otpExpires;

        await existingUser.save();

      } else {

        await User.create({
          name,
          email,
          password:
            hashedPassword,
          isVerified: false,
          otp: hashedOtp,
          otpExpires
        });
      }


      await sendOtpEmail(
        email,
        otp
      );


      return res
        .status(201)
        .json({
          success: true,
          requiresVerification: true,

          message:
            "Account created. Check your email for a 6-digit verification code.",

          email
        });

    } catch (error) {

      console.error(
        "Signup error:",
        error
      );

      res
        .status(500)
        .json({
          message: "Signup failed"
        });
    }
  }
);


/*
  ==========================================================
  VERIFY OTP
  POST /api/auth/verify-otp
  ==========================================================
*/

router.post(
  "/verify-otp",
  otpLimiter,
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body.email
        );

      const otp =
        String(
          req.body.otp || ""
        ).trim();


      if (!email || !otp) {
        return res
          .status(400)
          .json({
            message:
              "Email and verification code are required"
          });
      }


      const user =
        await User.findOne({
          email
        });


      if (!user) {
        return res
          .status(400)
          .json({
            message:
              "No account found for this email"
          });
      }


      if (user.isVerified) {
        return res
          .status(400)
          .json({
            message:
              "Account is already verified"
          });
      }


      if (
        !user.otp ||
        !user.otpExpires
      ) {
        return res
          .status(400)
          .json({
            message:
              "No verification code found. Please request a new one."
          });
      }


      if (
        user.otpExpires <
        new Date()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Verification code has expired. Please request a new one."
          });
      }


      const isMatch =
        await bcrypt.compare(
          otp,
          user.otp
        );


      if (!isMatch) {
        return res
          .status(400)
          .json({
            message:
              "Invalid verification code"
          });
      }


      user.isVerified =
        true;

      user.otp =
        null;

      user.otpExpires =
        null;


      await user.save();


      const token =
        createToken(user);


      return res.json({
        success: true,

        message:
          "Email verified successfully",

        token,

        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email
        }
      });

    } catch (error) {

      console.error(
        "Verify OTP error:",
        error
      );

      res
        .status(500)
        .json({
          message:
            "Verification failed"
        });
    }
  }
);


/*
  ==========================================================
  RESEND OTP
  POST /api/auth/resend-otp
  ==========================================================
*/

router.post(
  "/resend-otp",
  otpLimiter,
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body.email
        );


      if (!email) {
        return res
          .status(400)
          .json({
            message:
              "Email is required"
          });
      }


      const user =
        await User.findOne({
          email
        });


      if (
        !user ||
        user.isVerified
      ) {
        return res.json({
          success: true,

          message:
            "If an unverified account exists, a verification code has been sent"
        });
      }


      const otp =
        generateOtp();

      const otpExpires =
        new Date(
          Date.now() +
          15 * 60 * 1000
        );

      const hashedOtp =
        await bcrypt.hash(
          otp,
          10
        );


      user.otp =
        hashedOtp;

      user.otpExpires =
        otpExpires;


      await user.save();


      await sendOtpEmail(
        email,
        otp
      );


      return res.json({
        success: true,

        message:
          "A new verification code has been sent to your email"
      });

    } catch (error) {

      console.error(
        "Resend OTP error:",
        error
      );

      res
        .status(500)
        .json({
          message:
            "Failed to resend verification code"
        });
    }
  }
);


/*
  ==========================================================
  LOGIN
  POST /api/auth/login
  ==========================================================
*/

router.post(
  "/login",
  authLimiter,
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body.email
        );

      const password =
        String(
          req.body.password || ""
        );


      if (!email) {
        return res
          .status(400)
          .json({
            message:
              "Email is required"
          });
      }


      if (!isValidEmail(email)) {
        return res
          .status(400)
          .json({
            message:
              "Please enter a valid email address"
          });
      }


      if (!password) {
        return res
          .status(400)
          .json({
            message:
              "Password is required"
          });
      }


      const user =
        await User.findOne({
          email
        });


      if (!user) {
        return res
          .status(400)
          .json({
            message:
              "Invalid email or password"
          });
      }


      const isMatch =
        await bcrypt.compare(
          password,
          user.password
        );


      if (!isMatch) {
        return res
          .status(400)
          .json({
            message:
              "Invalid email or password"
          });
      }


      if (!user.isVerified) {

        const otp =
          generateOtp();

        const otpExpires =
          new Date(
            Date.now() +
            15 * 60 * 1000
          );

        const hashedOtp =
          await bcrypt.hash(
            otp,
            10
          );


        user.otp =
          hashedOtp;

        user.otpExpires =
          otpExpires;


        await user.save();


        await sendOtpEmail(
          email,
          otp
        );


        return res
          .status(403)
          .json({
            success: false,
            requiresVerification: true,

            message:
              "Please verify your email first. A new code has been sent.",

            email
          });
      }


      const token =
        createToken(user);


      return res.json({
        success: true,

        message:
          "Login successful",

        token,

        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email
        }
      });

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      res
        .status(500)
        .json({
          message:
            "Login failed"
        });
    }
  }
);


/*
  ==========================================================
  FORGOT PASSWORD
  POST /api/auth/forgot-password
  ==========================================================

  Always returns a generic message so somebody cannot
  determine which emails are registered with VibeApp.
*/

router.post(
  "/forgot-password",
  otpLimiter,
  async (req, res) => {

    const genericMessage =
      "If an account exists for that email, a password recovery link has been sent.";

    try {

      const email =
        normalizeEmail(
          req.body.email
        );


      /*
       * Don't expose whether the email is valid
       * or registered.
       */
      if (
        !email ||
        !isValidEmail(email)
      ) {
        return res.json({
          success: true,
          message: genericMessage
        });
      }


      const user =
        await User.findOne({
          email
        });


      /*
       * Only send recovery mail for an existing
       * verified account.
       */
      if (
        user &&
        user.isVerified
      ) {

        /*
         * Generate a secure 32-byte random token.
         */
        const rawToken =
          crypto
            .randomBytes(32)
            .toString("hex");


        /*
         * Never store the raw reset token.
         */
        const hashedToken =
          crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");


        /*
         * Link remains valid for 30 minutes.
         */
        user.resetPasswordToken =
          hashedToken;

        user.resetPasswordExpires =
          new Date(
            Date.now() +
            30 * 60 * 1000
          );


        await user.save();


        const frontendUrl =
          String(
            process.env.FRONTEND_URL ||
            "http://localhost:5173"
          ).replace(/\/$/, "");


        const resetUrl =
          `${frontendUrl}/reset-password/${rawToken}`;


        const subject =
          "VibeApp — Reset your password";


        const text = [
          `Hi ${user.name || "there"},`,
          "",
          "We received a request to reset your VibeApp password.",
          "",
          "Use the secure link below to choose a new password:",
          "",
          resetUrl,
          "",
          "This password recovery link expires in 30 minutes and can only be used once.",
          "",
          "If you did not request a password reset, you can safely ignore this email.",
          "",
          "— VibeApp"
        ].join("\n");


        try {

          /*
           * Reuses your existing Gmail SMTP utility:
           *
           * backend/utils/sendEmail.js
           */
          await sendEmail(
            user.email,
            subject,
            text
          );

        } catch (mailError) {

          /*
           * SMTP failed, therefore invalidate
           * the reset token.
           */
          user.resetPasswordToken =
            null;

          user.resetPasswordExpires =
            null;


          await user.save();


          console.error(
            "Password reset email error:",
            mailError
          );
        }
      }


      return res.json({
        success: true,
        message: genericMessage
      });

    } catch (error) {

      console.error(
        "Forgot password error:",
        error
      );


      /*
       * Keep response generic even when something
       * goes wrong.
       */
      return res.json({
        success: true,
        message: genericMessage
      });
    }
  }
);


/*
  ==========================================================
  RESET PASSWORD
  POST /api/auth/reset-password/:token
  ==========================================================
*/

router.post(
  "/reset-password/:token",
  authLimiter,
  async (req, res) => {
    try {

      const rawToken =
        String(
          req.params.token || ""
        ).trim();


      const password =
        String(
          req.body.password || ""
        );


      if (!rawToken) {
        return res
          .status(400)
          .json({
            message:
              "Invalid password reset link."
          });
      }


      /*
       * Same password policy as signup.
       */
      if (
        !isStrongPassword(password)
      ) {
        return res
          .status(400)
          .json({
            message:
              "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
          });
      }


      /*
       * Hash token from URL before searching MongoDB.
       */
      const hashedToken =
        crypto
          .createHash("sha256")
          .update(rawToken)
          .digest("hex");


      /*
       * Token must match AND must not be expired.
       */
      const user =
        await User.findOne({
          resetPasswordToken:
            hashedToken,

          resetPasswordExpires: {
            $gt: new Date()
          }
        });


      if (!user) {
        return res
          .status(400)
          .json({
            message:
              "This password reset link is invalid or has expired. Please request a new one."
          });
      }


      /*
       * Prevent setting exactly the same password.
       */
      const samePassword =
        await bcrypt.compare(
          password,
          user.password
        );


      if (samePassword) {
        return res
          .status(400)
          .json({
            message:
              "Your new password must be different from your current password."
          });
      }


      /*
       * Hash new password.
       */
      user.password =
        await bcrypt.hash(
          password,
          10
        );


      /*
       * Invalidate reset token immediately.
       */
      user.resetPasswordToken =
        null;

      user.resetPasswordExpires =
        null;


      /*
       * Also remove any stale OTP.
       */
      user.otp =
        null;

      user.otpExpires =
        null;


      await user.save();


      return res.json({
        success: true,

        message:
          "Password reset successfully. You can now sign in with your new password."
      });

    } catch (error) {

      console.error(
        "Reset password error:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            "Failed to reset password. Please try again."
        });
    }
  }
);


module.exports = router;