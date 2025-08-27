import { DataSource } from "typeorm";
import { User } from "../../modules/users/entities/user.entity";

export const postgresProviders = [
  {
    provide: "POSTGRES_DATA_SOURCE",
    useFactory: async () => {
      const dataSource = new DataSource({
        type: "postgres",
        url: process.env.DATABASE_URL,
        entities: [User],
        synchronize: process.env.NODE_ENV !== "production",
        logging: process.env.NODE_ENV === "development",
        ssl: { rejectUnauthorized: false },
      });
      return dataSource.initialize();
    },
  },
];
