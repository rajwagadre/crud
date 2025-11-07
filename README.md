import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String },
    password: { type: String },
    mobile_no: { type: String },
  },
  { timestamps: true }
);
export default mongoose.model("User", userSchema);

===========================================================

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


==================================================================

import Joi from "joi";

export const superAdminValidation = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  mobile_no: Joi.string().min(10).max(15).required(),
  role: Joi.string().valid("super_admin").required(),
});

==============================================================

import express from "express";
import { registerSuperAdmin } from "../controllers/user.js";

const router = express.Router();

router.post("/super-admin", registerSuperAdmin);

export default router;
