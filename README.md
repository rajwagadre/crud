model/user.js -

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String },
    password: { type: String },
    mobile_no: { type: String },
    role: { type: String, enum: ["super_admin"], },
  },
  { timestamps: true }
);
export default mongoose.model("User", userSchema);

===========================================================

controller/user.js -

import { superAdminValidation } from "../validators/user.js";
import { handleResponse } from "../utils/helper.js";
import User from "../models/user.js";

const registerSuperAdmin = async (req, res) => {
    try {
        const { error } = superAdminValidation.validate(req.body);
        if (error) {
            return handleResponse(res, 400, error.details[0].message);
        }

        const superAdminExists = await User.findOne({ role: "super_admin" });
        if (superAdminExists) {
            return handleResponse(res, 409, "Only one Super Admin can be registered, There has been already super admin present");
        }

        const { email, password, mobile_no } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return handleResponse(res, 409, "Email already exists.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newSuperAdmin = new User({
            email,
            password: hashedPassword,
            mobile_no,
            role: "super_admin",
            status: true,
        });

        await newSuperAdmin.save();

        return handleResponse(res, 201, "Super Admin registered successfully!", newSuperAdmin);
    } catch (error) {
        console.error("Error registering super admin:", error);
        return handleResponse(res, 500, "Server error.");
    }
};


import { signAccessToken, signResetToken } from "../middleware/jwtAuth.js";

==================================================================
validators/user.js - 

import Joi from "joi";

export const superAdminValidation = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  mobile_no: Joi.string().min(10).max(15).required(),
  role: Joi.string().valid("super_admin").required(),
});

==============================================================

routes/user.js -

import express from "express";
import { registerSuperAdmin } from "../controllers/user.js";

const router = express.Router();

router.post("/super-admin", registerSuperAdmin);

export default router;


=====================================================


controller/user.js -
login -


const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the super admin by email
        const foundUser = await User.findOne({ email });

        // If no super admin is found, return an error
        if (!foundUser) {
            return handleResponse(res, 401, 'Invalid email or password');
        } 

        // Ensure the user has a password set
        if (!foundUser.password) {
            return handleResponse(res, 401, 'User does not have a password set.');
        }

        // Compare the provided password with the stored password
        const isMatch = await bcrypt.compare(password, foundUser.password);
        if (!isMatch) {
            return handleResponse(res, 401, 'Invalid email or password');
        }

        // Generate the JWT token
        const token = await signAccessToken(foundUser._id, foundUser.role, foundUser.email);

        // Prepare the response payload
        const baseResponse = {
            token,
            role: foundUser.role,
        };

        // Return the response with the token and user details
        return handleResponse(res, 200, 'Login successful.', baseResponse);

    } catch (error) {
        console.error('Login error:', error);
        return handleResponse(res, 500, 'Internal server error.');
    }
};


===

middleware/jwtAuth.js -

import jwt from "jsonwebtoken";


export const signAccessToken = (user_id, user_role, email) => {
  return jwt.sign(
    {
      user_id,
      user_role,
      email
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};


===
routes/user.js - 

router.post("/login", loginUser);

===

controllers/user.js-

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // Only allow SuperAdmin (assuming stored in 'User' collection)
        const user = await User.findOne({ email, role: "SuperAdmin" });

        if (!user) {
            return handleResponse(res, 404, "No SuperAdmin found with this email address");
        }

        // Generate token with userId and role
        const resetToken = await signResetToken({
            email: user.email,
            userId: user._id,
            role: "SuperAdmin"
        });

        const resetLink = `${process.env.BASE_URL}/reset-password?token=${resetToken}`;  //BASE_URL=https://api.parkhya.co.in
        const emailSubject = "SuperAdmin Password Reset Request";
        const emailText = `Click the following link to reset your SuperAdmin password:\n\n${resetLink}`;

        // Save token in user document
        user.resetToken = resetToken;
        user.resetTokenExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        await sendEmail(user.email, emailSubject, emailText);

        return handleResponse(res, 200, "Password reset email has been sent to SuperAdmin.");
    } catch (error) {
        console.error("Forgot Password Error (SuperAdmin):", error);
        return handleResponse(res, 500, "Error processing request");
    }
};


const resetPassword = async (req, res) => {
    const { newPassword, confirmPassword } = req.body;
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return handleResponse(res, 400, "Token not provided");
    }

    try {
        if (newPassword !== confirmPassword) {
            return handleResponse(res, 400, "New password and confirm password do not match");
        }

        // Verify reset token
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);  //ACCESS_TOKEN_SECRET=ba345ae87dc79e1f212dc66e305118470bdff22d5f50974425983cd03ff25fc4d3d7087ac52127e9238dc276a5d9ad03515129eee6a5dfd9c30768b00837c16d

        // Ensure only SuperAdmin can reset password
        if (decoded.role !== "SuperAdmin") {
            return handleResponse(res, 403, "Unauthorized: Only SuperAdmin can reset password");
        }

        // Find SuperAdmin user
        const user = await User.findById(decoded.userId);

        if (!user) {
            return handleResponse(res, 404, "SuperAdmin not found");
        }

        // Validate token existence and expiry
        if (!user.resetToken || user.resetToken !== token) {
            return handleResponse(res, 400, "Invalid or expired token. Token can only be used once.");
        }

        if (user.resetTokenExpires < Date.now()) {
            return handleResponse(res, 400, "Token has expired");
        }

        // Hash and update new password
        try {
            user.password = await bcrypt.hash(newPassword, 10);
            user.resetToken = null;
            user.resetTokenExpires = null;
            await user.save();
        } catch (err) {
            console.error("Error while saving new SuperAdmin password:", err);
            return handleResponse(res, 500, "Could not update password.");
        }

        return handleResponse(res, 200, "SuperAdmin password has been successfully reset.");
    } catch (error) {
        console.error("Error during SuperAdmin password reset:", error);
        return handleResponse(res, 400, "Invalid or expired token");
    }
};

middleware/jwtAuth.js -

export const signAccessToken = (user_id, user_role, email) => {
  return jwt.sign(
    {
      user_id,
      user_role,
      email
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};

export const signResetToken = ({ email, userId, role }) => {
  return new Promise((resolve, reject) => {
    const payload = { email, userId, role };
    const options = { expiresIn: process.env.EXPIRATION_TIME || '1h' };

    jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, options, (err, token) => {
      if (err) reject(err);
      resolve(token);
    });
  });
};

utils/emailhandler.js -

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMPT_EMAIL_HOST,
  port: Number(process.env.SMPT_EMAIL_PORT),
  secure: true, 
  auth: {
    user: process.env.SMPT_EMAIL_USER,
    pass: process.env.SMPT_EMAIL_PASSWORD,
  },
});

const sendEmail = async (to, subject, htmlContent, bcc = null,textContent = null) => {
  console.log("Sending email to:", to);
   if (!to || (Array.isArray(to) && to.length === 0)) {
    console.error("❌ Email not sent: No recipients defined");
    return;
  }

  const mailOptions = {
    from: process.env.SMPT_EMAIL_FROM,
    to,
    subject,
    // html: htmlContent,
  };

  if (htmlContent) mailOptions.html = htmlContent;
  if (textContent) mailOptions.text = textContent;

  if (bcc) {
    if (typeof bcc === "string") {
      mailOptions.bcc = bcc.split(",").map(email => email.trim());
    } else if (Array.isArray(bcc)) {
      mailOptions.bcc = bcc;
    }
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email sending failed");
  }
};

export default sendEmail;



============================================================================
for postman requests


import express from "express";
import multer from "multer";

// 🔹 Configure multer for file uploads
const upload = multer({ dest: "uploads/" }); // files will be saved in 'uploads' folder

const setupRoutes = (app) => {
  // 🔹 Dummy middleware to simulate a logged-in user (for testing req.User)
  app.use((req, res, next) => {
    // In real apps, you'd verify a token here and get user from DB
    req.User = { _id: "6850fbbd1bef60ef1fcab80d", name: "Test User" };
    next();
  });

  // 🔹 POST route
  app.post("/submit/:id", upload.array("images", 5), (req, res) => {
    // Access headers
    console.log("req.headers ", req.headers);

    // Access request body (form-data or JSON)
    console.log("req.body ", req.body);

    // Access query parameters (?search=hello)
    console.log("req.query ", req.query);

    // Access URL params (/submit/:id)
    console.log("req.params ", req.params);

    // Access uploaded files (if any)
    console.log("req.files ", req.files);

    // Access user information (simulated authenticated user)
    console.log("req.User?._id ", req.User?._id);

    res.send("Request received successfully!");
  });
};

export default setupRoutes;
======================================================

import express from "express";
import multer from "multer";
import User from "../models/user.js"; // (optional if you want to use real DB user)

// 🔹 Configure multer for file uploads
const upload = multer({ dest: "uploads/" }); // files will be saved in 'uploads' folder

const setupRoutes = (app) => {
  // 🔹 Dummy middleware to simulate a logged-in user (for testing req.User)
  app.use((req, res, next) => {
    // In real apps, you'd verify a token here and get user from DB
    req.User = { _id: "6850fbbd1bef60ef1fcab80d", name: "Test User" };
    next();
  });

  // 🔹 POST route
  app.post("/submit/:id", upload.array("images", 5), (req, res) => {
    // Access headers
    console.log("req.headers 👉", req.headers);

    // Access request body (form-data or JSON)
    console.log("req.body 👉", req.body);

    // Access query parameters (?search=hello)
    console.log("req.query 👉", req.query);

    // Access URL params (/submit/:id)
    console.log("req.params 👉", req.params);

    // Access uploaded files (if any)
    console.log("req.files 👉", req.files);

    // Access user information (simulated authenticated user)
    console.log("req.User?._id 👉", req.User?._id);

    res.send("✅ Request received successfully!");
  });
};

export default setupRoutes;

======================================

updated school

const updateSchoolById = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return handleResponse(res, 403, "Only super admin can update school information.");
    }

    const { id } = req.params;
    if (!id) {
      return handleResponse(res, 400, "School ID is required.");
    }

    // Get the current school data from the database
    const school = await User.findById(id);
    if (!school) {
      return handleResponse(res, 404, "School not found.");
    }

    // If admin_Username is not provided in the request body, use the existing one from the database
    if (!req.body.admin_Username) {
      req.body.admin_Username = school.admin_Username;
    }

    // Validate the incoming data
    const { error } = updateSchoolValidation.validate(req.body, { abortEarly: false });
    if (error) {
      return handleResponse(res, 400, error.details.map((err) => err.message).join(", "));
    }

    const {
      email, school_name, school_code, contact_number, mobile_no, address, city, state, pin_code, 
      principal_name, school_type, school_board, established_year, total_students_capacity, website_url, 
      admin_Username, status
    } = req.body;

    // Check if the admin_Username is already taken by another school
    const existingSchool = await User.findOne({ admin_Username });
    if (existingSchool && existingSchool._id.toString() !== school._id.toString()) {
      return handleResponse(res, 400, "This admin_Username is already registered for another school.");
    }

    // Get the logo from the uploaded files
    const logo = req.convertedFiles?.logo ? req.convertedFiles.logo[0] : undefined;

    // Prepare the update fields
    const updateFields = {};
    if (email) updateFields.email = email;
    if (school_name) updateFields.school_name = school_name;
    if (school_code) updateFields.school_code = school_code;
    if (contact_number) updateFields.contact_number = contact_number;
    if (mobile_no) updateFields.mobile_no = mobile_no;
    if (address) updateFields.address = address;
    if (city) updateFields.city = city;
    if (state) updateFields.state = state;
    if (pin_code) updateFields.pin_code = pin_code;
    if (principal_name) updateFields.principal_name = principal_name;
    if (school_type) updateFields.school_type = school_type;
    if (school_board) updateFields.school_board = school_board;
    if (established_year) updateFields.established_year = established_year;
    if (total_students_capacity) updateFields.total_students_capacity = total_students_capacity;
    if (website_url) updateFields.website_url = website_url;
    updateFields.admin_Username = admin_Username;  // This is required and will use the validated one
    
    if (logo) updateFields.logo = logo;

    if (status !== undefined) {
      updateFields.status = status;
      updateFields.deleted = status ? false : true;
    }

    // Perform the update in the database
    const updatedSchool = await User.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedSchool) {
      return handleResponse(res, 404, "School not found.");
    }

    return handleResponse(res, 200, "School updated successfully!", updatedSchool);

  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "An error occurred while updating the school.");
  }
};
