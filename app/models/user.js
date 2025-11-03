import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String },
        email: { type: String },
        password: { type: String },
        mobile_no: { type: String },
        image: { type: Array, default: [] },
    },
    { timestamps: true }
);
export default mongoose.model("User", userSchema);