import mongoose, { Schema } from "mongoose";
import validator from "validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, "username field is required"],
            unique: [true, "This username not available"],
            minlength: [4, "please enter minimum 4 letter"],
            maxlength: [8, "username cannot exceed to 8"],
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: [true, "Email field is required"],
            unique: true,
            lowercase: true,
            trim: true,
            validate: [validator.isEmail, "Please enter a valid email address"]
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, //url
            required: true,
        },
        coverImage: {
            type: String,
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, "Please enter password"],
            minlength: [5, "please enter minimum 6 letter"],
            select: false
        },
        refreshToken: {
            type: String
        }
    },
    { timestamps: true }
)

//save bcrypt password
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10)
    next()
})


//check user-password or save-password
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

//generate jwt Access token
userSchema.methods.generateAccess_Token = function () {
    const payload =
    {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName,
    }

    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    })
}

//generate jwt Refresh token
userSchema.methods.generateRefresh_Token = function () {
    return jwt.sign({
        _id: this._id,
    },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

const userModel = mongoose.model('User', userSchema);
export default userModel;