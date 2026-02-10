
//get user by id
import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from "bcryptjs";
//get all users
export const getAllUsers=async(req,res)=>{
  try {
    const users=await User.find().select('-password');
    res.status(200).json(users)
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const getUserById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }

  try {
    const user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


//Get logged-in user's profile
export const getUserProfile = async (req, res) => {
  try {
    // req.user is set by the protect middleware after verifying JWT
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

//update user profile
export const updateUserProfile=async(req,res)=>{
  try {
      const {name,email}=req.body;
    const updateUser=await User.findByIdAndUpdate(
        req.user._id,
    {name,email},
    {new:true}).select("-password");
    if(!updateUser){
        return res.status(404).json({ success: false, message: "User not found" });
    }
     res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updateUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const setUserActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;          // user id from URL
    const { active } = req.body;        // boolean flag from request body

    if (typeof active !== "boolean") {
      return res.status(400).json({ success: false, message: "`active` must be boolean" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.active = active;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User has been ${active ? "reactivated" : "suspended"}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active
      }
    });
  } catch (error) {
    console.error("Error updating user active status:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateUser=async(req,res)=>{
  try {
    const {id}=req.params;
    const updates=req.body;
    const updatedUser=await User.findByIdAndUpdate(id,updates,{new:true}).select("-password");
    if(!updatedUser){
       return res.status(400).json({ success: false, message: "User not found" });
    }
     res.status(201).json({success:true,message:"User updated successfully",user:updatedUser});
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const deleteUsers=async(req,res)=>{
  try {
    const {id}=req.params;
    const deleteUser=await User.findByIdAndDelete(id);
    if(!deleteUser){
         return res.status(400).json({ success: false, message: "User not found" });
    }
     res.status(200).json({ success: true, message: "User deleted successfully" });
    
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error", error:     error.message     });
  }
};

