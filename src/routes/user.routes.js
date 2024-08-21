import express from "express";
import { upload } from "../middleware/upload.js";
import { verifyJWT } from "../middleware/auth.js";
import {
    changeCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory,
    loginUser,
    logout,
    refreshAccessToken,
    register,
    updateUserAccountDetails
} from "../controller/user.ctrl.js";
import { updateUserAvatar, updateUserCoverImage } from "../controller/userfile.ctrl.js";


const router = express.Router();

//user router
router.route('/register').post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    register
)

router.route('/login').post(loginUser)

//Secured routes
router.route('/logout').get(verifyJWT, logout)
router.route('/me').get(verifyJWT, getCurrentUser)
router.route('/me/update/:id').patch(verifyJWT, updateUserAccountDetails)

router.route('/me/avatar').post(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route('/me/cover-image').post(verifyJWT, upload.single("coverImage"), updateUserCoverImage)


router.post('/refresh-token', refreshAccessToken)
router.route('/change-password').post(verifyJWT, changeCurrentPassword)

router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/c/:history").get(verifyJWT, getWatchHistory)


export default router;