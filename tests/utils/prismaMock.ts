import { PrismaClient } from '@prisma/client';
    import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
    import prisma from '@/utils/prismaClient'; // Import the actual prisma instance

    // Tell Jest to mock the prisma client module
    jest.mock('@/utils/prismaClient', () => ({
      __esModule: true,
      default: mockDeep<PrismaClient>(),
    }));

    // Export the mocked instance and a reset function
    export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

    beforeEach(() => {
      mockReset(prismaMock); // Reset mocks before each test
    });