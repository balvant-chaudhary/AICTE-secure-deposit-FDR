import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { initCronJobs } from './src/services/cronService.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Mandatory MongoDB connection check before server initialization
    await connectDB();

    // 2. Initialize background cron jobs once DB is verified
    initCronJobs();

    // 3. Start Express HTTP server only when database is confirmed
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`AICTE FDR Management Portal API running on port ${PORT}`);
      console.log(`Healthcheck: http://localhost:${PORT}/api/health`);
      console.log(`Persistence: Active (MongoDB)`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error(`\n[FATAL ERROR]: Unable to establish persistent MongoDB connection.`);
    console.error(`The server cannot start without an active database connection.\n`);
    console.error(`[Troubleshooting Steps]:`);
    console.error(`1. MongoDB Atlas: Provide a valid connection string in server/.env:`);
    console.error(`   MONGO_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/aicte-securedeposit?retryWrites=true&w=majority"\n`);
    console.error(`2. Local MongoDB: Ensure mongod service is running on 127.0.0.1:27017:\n   Run 'net start MongoDB' or launch 'mongod --dbpath <data-directory>'\n`);
    process.exit(1);
  }
};

startServer();
