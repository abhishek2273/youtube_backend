import User from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';


//Generate Web Token (Access and Refresh Token)
const webToken = async (userID) => {
    try {
        const user = await User.findById(userID);
        const accessToken = user.generateAccess_Token()
        const refreshToken = user.generateRefresh_Token()

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating and access token")
    }
}

//Options 
const options = {
    httpOnly: true,
    secure: true,
}

//REGISTER --------
export const register = asyncHandler(async (req, res, next) => {
    const { username, fullName, email, password } = req.body;

    if ([fullName, email, password, username].some((field) =>
        field?.trim() === "")
    ) {
        throw new ApiError(400, "field is missing")
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] })

    if (existedUser) {
        throw new ApiError(409, "User already exist? Please login");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file Local is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase(),
        email,
        password
    })

    const createdUser = await User.findById(user._id).select("-refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Intrenal server error")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, ` ${username} Registered successfully`)
    )
})

//LOGIN --------
export const loginUser = asyncHandler(async (req, res) => {
    const { userId, password } = req.body;

    if (!userId || !password) {
        throw new ApiError(400, "Please fill the required field")
    }

    const user = await User.findOne({ $or: [{ username: userId }, { email: userId }] }).select("+password")

    if (!user) {
        throw new ApiError(404, "User not exist? Please Register first")
    }

    const isPasswordMatched = await user.isPasswordCorrect(password);
    if (!isPasswordMatched) {
        throw new ApiError(401, "Wrong Credentials")
    }

    const { accessToken, refreshToken } = await webToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-refreshToken");

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken,
            },
            `${loggedInUser.username} login successfully`
        ))
})

//LOGOUT --------
export const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    return res
        .status(202)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out sucessfully"))
})

//Refresh Access Token (for when user already logged in)--------
export const refreshAccessToken = asyncHandler(async (req, res, next) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshAccessToken;
    if (!incomingRefreshToken) {
        throw new ApiError("401", "Unauthorized request")
    }

    try {
        const decodedIncomingRefreshToken = jwt.verify(
            incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedIncomingRefreshToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }

        const { accessToken, newRefreshToken } = await webToken(user._id)
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(200,
                    { accessToken, newRefreshToken },
                    "Access token refreshed successfully")
            )
    } catch (error) {
        throw new ApiError(400, error?.message || "Invalid Token")
    }
})

//change Password
const changeCurrentPassword = asyncHandler(async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id)

    const isOldPassword = await user.isPasswordCorrect(oldPassword)
    if (!isOldPassword) {
        throw new ApiError(400, "Invalid old Password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(201, "Password changed sucessfully"))
})

// get user profile
const getCurrentUser = asyncHandler(async (req, res, next) => {
    const user = req.user
    
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {
                data: user,
            },
            `${user.username} profile accessed`))
})

// update user profile
const updateUserAccountDetails = asyncHandler(async (req, res, next) => {
    const { fullName, email } = req.body;
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName, email
            }
        },
        { new: true }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})

// get user Channel Profile
const getUserChannelProfile = asyncHandler(async (req, res, next) => {
    const { username } = req.params;
    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    // await User.find({ username })
    const channel = await User.aggregate([
        {
            $match: { username: username?.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channels",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "user channel fetched successfully")
        )
})


//get user watch history-----
const getWatchHistory = asyncHandler(async (req, res, next) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                form: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch History Fetched sucessfully"
            )
        )
})

export {
    changeCurrentPassword,
    getCurrentUser,
    updateUserAccountDetails,
    getUserChannelProfile,
    getWatchHistory,
}