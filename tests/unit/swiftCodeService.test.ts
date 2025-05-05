import { prismaMock } from '../utils/prismaMock'; // Import the mocked instance
    import * as swiftCodeService from '@/services/swiftCodeService';
    import { SwiftCode } from '@prisma/client';
    import { CreateSwiftCodeInput } from '@/validation/swiftCodeSchemas';

    describe('SwiftCode Service', () => {

      const mockHqCode: SwiftCode = {
        swiftCode: 'BANKUSNYXXX',
        bankName: 'Test Bank HQ',
        address: '123 Main St',
        countryISO2: 'US',
        countryName: 'UNITED STATES',
        isHeadquarter: true,
        headquarterIdentifier: 'BANKUSNY',
      };

      const mockBranchCode: SwiftCode = {
        swiftCode: 'BANKUSNY123',
        bankName: 'Test Bank Branch 1',
        address: '456 Side St',
        countryISO2: 'US',
        countryName: 'UNITED STATES',
        isHeadquarter: false,
        headquarterIdentifier: 'BANKUSNY',
      };

      const mockBranchCode2: SwiftCode = {
        swiftCode: 'BANKUSNY456',
        bankName: 'Test Bank Branch 2',
        address: '789 Other St',
        countryISO2: 'US',
        countryName: 'UNITED STATES',
        isHeadquarter: false,
        headquarterIdentifier: 'BANKUSNY',
      };

      // --- getSwiftCodeDetails ---
      describe('getSwiftCodeDetails', () => {
        it('should return null if swift code is not found', async () => {
          prismaMock.swiftCode.findUnique.mockResolvedValue(null);
          const result = await swiftCodeService.getSwiftCodeDetails('NOTFOUND');
          expect(result).toBeNull();
          expect(prismaMock.swiftCode.findUnique).toHaveBeenCalledWith({
            where: { swiftCode: 'NOTFOUND' },
          });
        });

        it('should return branch details without branches array', async () => {
          prismaMock.swiftCode.findUnique.mockResolvedValue(mockBranchCode);
          const result = await swiftCodeService.getSwiftCodeDetails(mockBranchCode.swiftCode);
          expect(result).toEqual(mockBranchCode);
          expect(result).not.toHaveProperty('branches');
          expect(prismaMock.swiftCode.findUnique).toHaveBeenCalledWith({
            where: { swiftCode: mockBranchCode.swiftCode },
          });
          // Ensure findMany was NOT called for branches
          expect(prismaMock.swiftCode.findMany).not.toHaveBeenCalled();
        });

        it('should return headquarter details with associated branches', async () => {
          prismaMock.swiftCode.findUnique.mockResolvedValue(mockHqCode);
          prismaMock.swiftCode.findMany.mockResolvedValue([mockBranchCode, mockBranchCode2]);

          const result = await swiftCodeService.getSwiftCodeDetails(mockHqCode.swiftCode);

          expect(result).toEqual({
            ...mockHqCode,
            branches: [mockBranchCode, mockBranchCode2],
          });
          expect(prismaMock.swiftCode.findUnique).toHaveBeenCalledWith({
            where: { swiftCode: mockHqCode.swiftCode },
          });
          expect(prismaMock.swiftCode.findMany).toHaveBeenCalledWith({
            where: {
              headquarterIdentifier: mockHqCode.headquarterIdentifier,
              swiftCode: {
                not: mockHqCode.swiftCode,
              },
            },
            orderBy: {
              swiftCode: 'asc',
            },
          });
        });

         it('should return headquarter details with empty branches array if no branches found', async () => {
          prismaMock.swiftCode.findUnique.mockResolvedValue(mockHqCode);
          prismaMock.swiftCode.findMany.mockResolvedValue([]); // No branches found

          const result = await swiftCodeService.getSwiftCodeDetails(mockHqCode.swiftCode);

          expect(result).toEqual({
            ...mockHqCode,
            branches: [],
          });
           expect(prismaMock.swiftCode.findMany).toHaveBeenCalledWith({
             where: {
               headquarterIdentifier: mockHqCode.headquarterIdentifier,
               swiftCode: { not: mockHqCode.swiftCode },
             },
             orderBy: { swiftCode: 'asc' },
           });
        });
      });

      // --- getSwiftCodesByCountry ---
      describe('getSwiftCodesByCountry', () => {
        it('should return an array of swift codes for a given country', async () => {
          const countryCodes = [mockHqCode, mockBranchCode, mockBranchCode2];
          prismaMock.swiftCode.findMany.mockResolvedValue(countryCodes);

          const result = await swiftCodeService.getSwiftCodesByCountry('US');

          expect(result).toEqual(countryCodes);
          expect(prismaMock.swiftCode.findMany).toHaveBeenCalledWith({
            where: { countryISO2: 'US' },
            orderBy: { swiftCode: 'asc' },
          });
        });

        it('should return an empty array if no codes found for the country', async () => {
          prismaMock.swiftCode.findMany.mockResolvedValue([]);
          const result = await swiftCodeService.getSwiftCodesByCountry('XX');
          expect(result).toEqual([]);
          expect(prismaMock.swiftCode.findMany).toHaveBeenCalledWith({
            where: { countryISO2: 'XX' },
            orderBy: { swiftCode: 'asc' },
          });
        });
      });

      // --- createSwiftCode ---
      describe('createSwiftCode', () => {
        it('should create and return a new swift code', async () => {
          const inputData: CreateSwiftCodeInput = {
            swiftCode: 'NEWCCODEGBXXX',
            bankName: 'New Bank PLC',
            address: '1 New Street',
            countryISO2: 'GB',
            countryName: 'UNITeD KiNGDOM', // Service should uppercase this
            isHeadquarter: true,
          };
          const expectedResult: SwiftCode = {
            ...inputData,
            countryName: 'UNITED KINGDOM',
            address: '1 New Street', // Ensure address is handled
            headquarterIdentifier: 'NEWCCODE',
          };

          prismaMock.swiftCode.create.mockResolvedValue(expectedResult);

          const result = await swiftCodeService.createSwiftCode(inputData);

          expect(result).toEqual(expectedResult);
          expect(prismaMock.swiftCode.create).toHaveBeenCalledWith({
            data: {
              swiftCode: 'NEWCCODEGBXXX',
              bankName: 'New Bank PLC',
              address: '1 New Street',
              countryISO2: 'GB',
              countryName: 'UNITED KINGDOM', // Service ensures uppercase
              isHeadquarter: true,
              headquarterIdentifier: 'NEWCCODE',
            },
          });
        });

         it('should handle optional address correctly when creating', async () => {
           const inputData: CreateSwiftCodeInput = {
             swiftCode: 'NOADDRDEYYY',
             bankName: 'No Address Bank',
             countryISO2: 'DE',
             countryName: 'Germany',
             isHeadquarter: false,
             // address is omitted
           };
           const expectedResult: SwiftCode = {
             swiftCode: 'NOADDRDEYYY',
             bankName: 'No Address Bank',
             address: '', // Service should default optional address to empty string
             countryISO2: 'DE',
             countryName: 'GERMANY', // Service uppercases
             isHeadquarter: false,
             headquarterIdentifier: 'NOADDRDE',
           };

           prismaMock.swiftCode.create.mockResolvedValue(expectedResult);
           const result = await swiftCodeService.createSwiftCode(inputData);

           expect(result).toEqual(expectedResult);
           expect(prismaMock.swiftCode.create).toHaveBeenCalledWith({
             data: {
               ...expectedResult, // Use the expected result for comparison as it includes defaults/transformations
             },
           });
         });

        // Error cases (like unique constraint violation) are typically handled by Prisma
        // and tested in integration tests or controller tests where the error is caught.
      });

      // --- deleteSwiftCode ---
      describe('deleteSwiftCode', () => {
        it('should delete and return the swift code', async () => {
          prismaMock.swiftCode.delete.mockResolvedValue(mockBranchCode);

          const result = await swiftCodeService.deleteSwiftCode(mockBranchCode.swiftCode);

          expect(result).toEqual(mockBranchCode);
          expect(prismaMock.swiftCode.delete).toHaveBeenCalledWith({
            where: { swiftCode: mockBranchCode.swiftCode },
          });
        });

        // Prisma's delete throws an error if not found (P2025),
        // which would be tested in integration or controller tests.
        it('should throw error if swift code to delete is not found (mocked behavior)', async () => {
            // Simulate Prisma throwing the P2025 error
            const notFoundError = new Error("Record to delete does not exist.") as any;
            notFoundError.code = 'P2025';
            prismaMock.swiftCode.delete.mockRejectedValue(notFoundError);

            await expect(swiftCodeService.deleteSwiftCode('NOTFOUND')).rejects.toThrow(notFoundError);

            expect(prismaMock.swiftCode.delete).toHaveBeenCalledWith({
                where: { swiftCode: 'NOTFOUND' },
            });
        });
      });
    });