export const mongoProviders = [
  {
    provide: "MONGO_CONNECTION",
    useFactory: (): Promise<typeof import("mongoose")> =>
      import("mongoose").then((mongoose) => {
        const uri =
          process.env.MONGODB_URI || "mongodb://localhost:27017/nestjs_logs";
        mongoose.connect(uri);
        return mongoose;
      }),
  },
];
