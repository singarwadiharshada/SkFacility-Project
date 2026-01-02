import dotenv from "dotenv";
dotenv.config();
import app  from "./app";

try {
  const PORT = process.env.PORT || 5001;

  // console.log('=== ENVIRONMENT VARIABLES CHECK ===');
  // console.log('PORT:', process.env.PORT);
  // console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
  // console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
  // console.log('CLOUDINARY_API_KEY exists:', !!process.env.CLOUDINARY_API_KEY);
  // console.log('CLOUDINARY_API_SECRET exists:', !!process.env.CLOUDINARY_API_SECRET);

  app.listen(PORT, () => {
    console.log(`\n✅ Server is running on port ${PORT}`);
    console.log(`📊 Database: ${process.env.MONGODB_URI?.split('@')[1] || 'Not configured'}`);
  });
  
} catch (error: any) {
  console.error('❌ Server failed to start:');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}