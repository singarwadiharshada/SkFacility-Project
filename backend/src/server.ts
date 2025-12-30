import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
