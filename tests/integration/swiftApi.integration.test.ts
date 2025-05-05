import request from 'supertest';
    import app from '@/server'; // Import your Express app instance
    import prisma from '@/utils/prismaClient'; // Import prisma for setup/teardown
    import { execSync } from 'child_process'; // To run prisma commands if needed directly

    // --- Test Data ---
    const hqData = {
        swiftCode: 'INTEUSNYXXX',
        bankName: 'Integration Test Bank HQ',
        address: '1 Integration Plaza',
        countryISO2: 'US',
        countryName: 'UNITED STATES',
        isHeadquarter: true,
        headquarterIdentifier: 'INTEUSNY',
    };

    const branchData1 = {
        swiftCode: 'INTEUSNYB01',
        bankName: 'Integration Test Bank Branch 1',
        address: '2 Integration Ave',
        countryISO2: 'US',
        countryName: 'UNITED STATES',
        isHeadquarter: false,
        headquarterIdentifier: 'INTEUSNY',
    };

     const branchData2 = {
        swiftCode: 'INTEUSNYB02',
        bankName: 'Integration Test Bank Branch 2',
        address: '3 Integration Blvd',
        countryISO2: 'US',
        countryName: 'UNITED STATES',
        isHeadquarter: false,
        headquarterIdentifier: 'INTEUSNY',
    };

    const otherCountryData = {
        swiftCode: 'INTEGBXXLON',
        bankName: 'UK Integration Test Bank',
        address: '1 London Rd',
        countryISO2: 'GB',
        countryName: 'UNITED KINGDOM',
        isHeadquarter: true,
        headquarterIdentifier: 'INTEGBXX',
    };

    // --- Test Suite ---
    describe('SWIFT API Endpoints (/v1/swift-codes)', () => {
        // Use beforeAll to setup the database ONCE for the suite
        beforeAll(async () => {
            console.log('[Test Setup] Resetting test database...');
            try {
                // Ensure SWIFT_DB_URL in .env.test is used by Prisma CLI
                execSync('npx prisma migrate reset --force --skip-seed', {
                    env: { ...process.env }, // Pass current env vars
                    stdio: 'inherit'
                });
                console.log('[Test Setup] Database reset complete.');

                // Seed the database with test data
                console.log('[Test Setup] Seeding test data...');
                await prisma.swiftCode.createMany({
                    data: [hqData, branchData1, branchData2, otherCountryData],
                });
                console.log('[Test Setup] Test data seeded.');
            } catch (error) {
                console.error('[Test Setup] Failed:', error);
                throw error; // Prevent tests from running if setup fails
            }
        });

        // Use afterAll to disconnect Prisma client
        afterAll(async () => {
            await prisma.$disconnect();
            console.log('[Test Teardown] Prisma disconnected.');
            // No need to clean data if migrate reset runs before each suite/run
        });

        // --- GET /v1/swift-codes/{swift-code} ---
        describe('GET /v1/swift-codes/:swiftCode', () => {
            it('should return 404 if swift code not found', async () => {
                const res = await request(app).get('/v1/swift-codes/NOTFOUNDCODE');
                expect(res.statusCode).toEqual(404);
                expect(res.body).toHaveProperty('error', "SWIFT code 'NOTFOUNDCODE' not found.");
            });

            it('should return branch details correctly', async () => {
                const res = await request(app).get(`/v1/swift-codes/${branchData1.swiftCode}`);
                expect(res.statusCode).toEqual(200);
                expect(res.body).toMatchObject({
                    swiftCode: branchData1.swiftCode,
                    bankName: branchData1.bankName,
                    address: branchData1.address,
                    countryISO2: branchData1.countryISO2,
                    countryName: branchData1.countryName,
                    isHeadquarter: false,
                });
                // Branch response should NOT have the 'branches' array
                expect(res.body).not.toHaveProperty('branches');
            });

            it('should return headquarter details with branches', async () => {
                const res = await request(app).get(`/v1/swift-codes/${hqData.swiftCode}`);
                expect(res.statusCode).toEqual(200);
                expect(res.body).toMatchObject({
                    swiftCode: hqData.swiftCode,
                    bankName: hqData.bankName,
                    address: hqData.address,
                    countryISO2: hqData.countryISO2,
                    countryName: hqData.countryName,
                    isHeadquarter: true,
                });
                // HQ response SHOULD have the 'branches' array
                expect(res.body).toHaveProperty('branches');
                expect(res.body.branches).toBeInstanceOf(Array);
                expect(res.body.branches).toHaveLength(2); // branchData1 and branchData2
                // Check if branches contain the expected swift codes (order might vary depending on DB/query)
                const branchCodes = res.body.branches.map((b: any) => b.swiftCode);
                expect(branchCodes).toContain(branchData1.swiftCode);
                expect(branchCodes).toContain(branchData2.swiftCode);
                 // Check structure of one branch
                 expect(res.body.branches[0]).toMatchObject({
                     swiftCode: expect.any(String),
                     bankName: expect.any(String),
                     address: expect.any(String),
                     countryISO2: hqData.countryISO2, // Should match HQ country
                     isHeadquarter: false,
                 });
            });

             it('should handle case-insensitivity in swift code parameter', async () => {
                 const res = await request(app).get(`/v1/swift-codes/${hqData.swiftCode.toLowerCase()}`);
                 expect(res.statusCode).toEqual(200);
                 expect(res.body.swiftCode).toEqual(hqData.swiftCode); // Ensure response has correct case
             });
        });

        // --- GET /v1/swift-codes/country/{countryISO2code} ---
        describe('GET /v1/swift-codes/country/:countryISO2code', () => {
            it('should return 400 for invalid country code format', async () => {
                const res = await request(app).get('/v1/swift-codes/country/USA'); // Too long
                expect(res.statusCode).toEqual(400);
                expect(res.body).toHaveProperty('error');

                const res2 = await request(app).get('/v1/swift-codes/country/U1'); // Contains number
                expect(res2.statusCode).toEqual(400);
                expect(res2.body).toHaveProperty('error');
            });

            it('should return codes for a specific country (US)', async () => {
                const res = await request(app).get('/v1/swift-codes/country/US');
                expect(res.statusCode).toEqual(200);
                expect(res.body).toHaveProperty('countryISO2', 'US');
                expect(res.body).toHaveProperty('countryName', 'UNITED STATES');
                expect(res.body).toHaveProperty('swiftCodes');
                expect(res.body.swiftCodes).toBeInstanceOf(Array);
                expect(res.body.swiftCodes).toHaveLength(3); // hqData, branchData1, branchData2

                // Check structure of one code
                expect(res.body.swiftCodes[0]).toMatchObject({
                    swiftCode: expect.any(String),
                    bankName: expect.any(String),
                    address: expect.any(String),
                    countryISO2: 'US',
                    isHeadquarter: expect.any(Boolean),
                });
            });

             it('should return codes for another specific country (GB)', async () => {
                 const res = await request(app).get('/v1/swift-codes/country/GB');
                 expect(res.statusCode).toEqual(200);
                 expect(res.body).toHaveProperty('countryISO2', 'GB');
                 expect(res.body).toHaveProperty('countryName', 'UNITED KINGDOM');
                 expect(res.body.swiftCodes).toBeInstanceOf(Array);
                 expect(res.body.swiftCodes).toHaveLength(1);
                 expect(res.body.swiftCodes[0].swiftCode).toEqual(otherCountryData.swiftCode);
             });

            it('should return empty array and "Country Not Found" if country has no codes', async () => {
                const res = await request(app).get('/v1/swift-codes/country/XX'); // Assuming XX has no codes
                expect(res.statusCode).toEqual(200);
                 expect(res.body).toHaveProperty('countryISO2', 'XX');
                 expect(res.body).toHaveProperty('countryName', 'Country Not Found'); // As per controller logic
                expect(res.body.swiftCodes).toBeInstanceOf(Array);
                expect(res.body.swiftCodes).toHaveLength(0);
            });

             it('should handle case-insensitivity in country code parameter', async () => {
                 const res = await request(app).get('/v1/swift-codes/country/us');
                 expect(res.statusCode).toEqual(200);
                 expect(res.body.countryISO2).toEqual('US'); // Ensure response has correct case
                 expect(res.body.swiftCodes.length).toBeGreaterThan(0);
             });
        });

        // --- POST /v1/swift-codes ---
        describe('POST /v1/swift-codes', () => {
            const newCodeData = {
                swiftCode: 'POSTTESTXXX',
                bankName: 'Post Test Bank France',
                address: '1 Rue Test',
                countryISO2: 'FR',
                countryName: 'FRANCE',
                isHeadquarter: true,
            };

            // Clean up the created code after tests in this block
            afterAll(async () => {
                try {
                    await prisma.swiftCode.delete({ where: { swiftCode: newCodeData.swiftCode }});
                } catch (error) {
                    // Ignore if already deleted or never created
                }
            });


            it('should create a new swift code successfully', async () => {
                const res = await request(app)
                    .post('/v1/swift-codes')
                    .send(newCodeData);

                expect(res.statusCode).toEqual(201);
                expect(res.body).toHaveProperty('message', `SWIFT code ${newCodeData.swiftCode} created successfully.`);

                // Verify in database
                const dbRecord = await prisma.swiftCode.findUnique({ where: { swiftCode: newCodeData.swiftCode }});
                expect(dbRecord).not.toBeNull();
                expect(dbRecord).toMatchObject({
                    ...newCodeData,
                    countryName: 'FRANCE', // Ensure case is handled if needed
                    headquarterIdentifier: 'POSTTEST',
                });
            });

            it('should return 409 Conflict if swift code already exists', async () => {
                // First ensure it exists (it should from the previous test)
                 await request(app).post('/v1/swift-codes').send(newCodeData).expect(409); // Or expect 409 if run again

                // Try creating again
                const res = await request(app)
                    .post('/v1/swift-codes')
                    .send(newCodeData);

                expect(res.statusCode).toEqual(409);
                expect(res.body).toHaveProperty('error', 'Conflict: SWIFT code already exists.');
            });

            it('should return 400 Bad Request for invalid input data (Zod validation)', async () => {
                const invalidData = { ...newCodeData, swiftCode: 'INVALID' }; // Invalid SWIFT code format
                const res = await request(app)
                    .post('/v1/swift-codes')
                    .send(invalidData);

                expect(res.statusCode).toEqual(400);
                expect(res.body).toHaveProperty('error', 'Invalid input data.');
                expect(res.body).toHaveProperty('details');
                expect(res.body.details).toBeInstanceOf(Array);
                expect(res.body.details[0].path).toContain('swiftCode'); // Check which field failed
            });

             it('should return 400 Bad Request for missing required fields', async () => {
                 const invalidData = {
                     // swiftCode: 'MISSINGFIELD', // Missing swiftCode
                     bankName: 'Missing Fields Bank',
                     countryISO2: 'MF',
                     countryName: 'MISSING FIELDS',
                     isHeadquarter: false,
                 };
                 const res = await request(app)
                     .post('/v1/swift-codes')
                     .send(invalidData);

                 expect(res.statusCode).toEqual(400);
                 expect(res.body).toHaveProperty('error', 'Invalid input data.');
                 expect(res.body.details[0].path).toContain('swiftCode');
             });
        });

        // --- DELETE /v1/swift-codes/{swift-code} ---
        describe('DELETE /v1/swift-codes/:swiftCode', () => {
            const codeToDelete = {
                swiftCode: 'DELETEMEUSXXX',
                bankName: 'Delete Test Bank',
                address: '1 Delete Ln',
                countryISO2: 'US',
                countryName: 'UNITED STATES',
                isHeadquarter: true,
                headquarterIdentifier: 'DELETEME',
            };

            // Create the record before trying to delete it
            beforeAll(async () => {
                await prisma.swiftCode.create({ data: codeToDelete });
            });

            it('should delete an existing swift code successfully', async () => {
                const res = await request(app).delete(`/v1/swift-codes/${codeToDelete.swiftCode}`);
                expect(res.statusCode).toEqual(200);
                expect(res.body).toHaveProperty('message', `SWIFT code ${codeToDelete.swiftCode} deleted successfully.`);

                // Verify in database
                const dbRecord = await prisma.swiftCode.findUnique({ where: { swiftCode: codeToDelete.swiftCode }});
                expect(dbRecord).toBeNull();
            });

            it('should return 404 Not Found if swift code does not exist', async () => {
                const res = await request(app).delete('/v1/swift-codes/ALREADYGONE');
                expect(res.statusCode).toEqual(404);
                expect(res.body).toHaveProperty('error', "SWIFT code 'ALREADYGONE' not found.");
            });

             it('should handle case-insensitivity in swift code parameter for delete', async () => {
                 // Recreate the record to test case-insensitive delete
                 await prisma.swiftCode.create({ data: codeToDelete });

                 const res = await request(app).delete(`/v1/swift-codes/${codeToDelete.swiftCode.toLowerCase()}`);
                 expect(res.statusCode).toEqual(200); // Should find and delete

                 // Verify in database
                 const dbRecord = await prisma.swiftCode.findUnique({ where: { swiftCode: codeToDelete.swiftCode } });
                 expect(dbRecord).toBeNull();
             });
        });
    });