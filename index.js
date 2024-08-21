import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express();

//Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import userRouter from "./src/routes/user.routes.js";
import commentRouter from "./src/routes/comment.routes.js";
import likeRouter from "./src/routes/like.routes.js";
import playlistRouter from "./src/routes/playlist.routes.js";
import tweetRouter from "./src/routes/tweet.routes.js";
import subscriptionRouter from "./src/routes/subscription.routes.js";
import videoRouter from "./src/routes/video.routes.js";


//routes decleration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/comment", commentRouter)
app.use("/api/v1/like", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/tweet", tweetRouter)
app.use("/api/v1/subscription", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)


export { app }