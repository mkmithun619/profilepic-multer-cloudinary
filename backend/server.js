const express=require("express")
const cors=require("cors")
require("dotenv").config()
const connectDB=require("./config/db")
const userRoutes=require("./routes/userRoutes")

const port = process.env.PORT || 5550

const app = express()

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}))
app.use(express.json())

app.use("/api/users",userRoutes)

app.use((error, req, res, next) => {
    const status = error.code === "LIMIT_FILE_SIZE" ? 400 : (error.statusCode || error.http_code || 500);
    const message = error.code === "LIMIT_FILE_SIZE"
        ? "Profile image must be 5 MB or smaller"
        : (error.message || "Server error");
    res.status(status).json({
        success: false,
        message,
    });
})

const startServer = async () => {
    try {
        await connectDB()
        app.listen(port,()=>{
            console.log(`Server is running on port ${port}` )
        })
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error)
        process.exit(1)
    }
}

startServer()