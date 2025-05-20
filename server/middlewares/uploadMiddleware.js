import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter to only accept specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.gpx', '.kml', '.geojson', '.json'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only GPX, KML, GeoJSON and JSON files are allowed.'), false);
  }
};

// Create and configure the multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// Export middleware functions
export const uploadSingleFile = upload.single('file');

export const uploadMultipleFiles = upload.array('files', 5); // max 5 files

// Handle upload errors
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred during upload
    return res.status(400).json({ 
      message: 'File upload error', 
      error: err.message 
    });
  } else if (err) {
    // A general error occurred
    return res.status(500).json({ 
      message: 'Error uploading file', 
      error: err.message 
    });
  }
  
  // No error
  next();
};

export default {
  uploadSingleFile,
  uploadMultipleFiles,
  handleUploadErrors
};