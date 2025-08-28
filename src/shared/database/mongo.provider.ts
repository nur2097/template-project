export const mongoProviders = [
  {
    provide: "MONGO_CONNECTION",
    useFactory: (): Promise<typeof import("mongoose")> =>
      import("mongoose").then(async (mongoose) => {
        const uri =
          process.env.MONGODB_URI || "mongodb://localhost:27017/nestjs_logs";
        
        try {
          await mongoose.connect(uri, {
            connectTimeoutMS: 5000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 10000,
            maxPoolSize: 10,
            minPoolSize: 2,
            bufferCommands: false,
          });
          console.log("✅ MongoDB connected successfully");
        } catch (error) {
          console.warn("⚠️ MongoDB connection failed, continuing without logging:", error.message);
        }
        
        return mongoose;
      }),
  },
];
