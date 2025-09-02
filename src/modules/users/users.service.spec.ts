import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { PrismaService } from "../../shared/database/prisma.service";
import { CacheService } from "../../shared/cache/cache.service";

describe("UsersService", () => {
  let service: UsersService;
  let mockPrismaService: Partial<PrismaService>;
  let mockCacheService: Partial<CacheService>;

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      } as any,
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findByEmail", () => {
    it("should return user by email", async () => {
      const mockUser = { id: 1, email: "test@example.com" };
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUser
      );

      const result = await service.findByEmail("test@example.com");

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        include: {
          company: true,
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it("should return null if user not found", async () => {
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });
  });

  describe("getUserStats", () => {
    it("should return user statistics", async () => {
      (mockPrismaService.user.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(15) // inactive
        .mockResolvedValueOnce(5); // suspended

      const result = await service.getUserStats();

      expect(result).toEqual({
        total: 100,
        active: 80,
        inactive: 15,
        suspended: 5,
      });
    });
  });
});
