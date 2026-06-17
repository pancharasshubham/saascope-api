import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "storage/uploads";

// ---------- Ensure storage folder exists ----------
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({

  destination: (
    req,
    file,
    cb
  ) => {

    cb(null, uploadDir);
  },

  filename: (
    req,
    file,
    cb
  ) => {

    const uniqueName =
      `${Date.now()}-${file.originalname}`;

    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,

  fileFilter: (
    req,
    file,
    cb
  ) => {

    const allowedMimeTypes = [
      "text/csv",
      "application/vnd.ms-excel",
    ];

    if (
      !allowedMimeTypes.includes(
        file.mimetype
      )
    ) {

      return cb(
        new Error(
          "Only CSV files are allowed"
        )
      );
    }

    cb(null, true);
  },

  limits: {
    fileSize:
      10 * 1024 * 1024,
  },
});