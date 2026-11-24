const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

const storage = multer.memoryStorage();

const multerInstance = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only jpg, png, and webp images are allowed"), false);
        }
    },
});

// Wrap multer v2 in a Promise — fixes "next is not a function" with Express v5
const upload = {
    single: (fieldName) => (req, res, next) => {
        multerInstance.single(fieldName)(req, res, (err) => {
            if (err) return next(err);
            next();
        });
    },
};

// Upload buffer to Cloudinary v2 via stream
const uploadToCloudinary = (req, res, next) => {
    if (!req.file) return next();

    const uploadOnce = (attempt) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "profile-pictures",
                resource_type: "image",
                timeout: 120000,
            },
            (error, result) => {
                if (!error) {
                    req.file.path = result.secure_url;
                    req.file.filename = result.public_id;
                    return next();
                }

                const retryable = ["ETIMEDOUT", "ESOCKETTIMEDOUT", "ECONNRESET", "EPIPE"].includes(error.code);
                if (retryable && attempt < 2) {
                    return setTimeout(() => uploadOnce(attempt + 1), 500);
                }

                error.message = error.code === "ETIMEDOUT"
                    ? "Profile upload timed out. Check your connection and try again."
                    : error.message;
                return next(error);
            }
        );

        Readable.from(req.file.buffer).pipe(stream);
    };

    uploadOnce(1);
};

module.exports = { upload, uploadToCloudinary };
