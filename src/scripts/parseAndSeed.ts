import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

const csvFilePath = path.join(__dirname, '..', '..', 'data', 'swift_data.csv');

const swiftCodeRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const countryISO2Regex = /^[A-Z]{2}$/;

interface SwiftCodeCsvRow {
    'COUNTRY ISO2 CODE': string;
    'SWIFT CODE': string;
    'NAME': string;
    'ADDRESS': string;
    'COUNTRY NAME': string;
}

async function seedDatabase() {
    console.log(`Starting to process CSV file from: ${csvFilePath}`);
    const results: Prisma.SwiftCodeCreateInput[] = [];

    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim()
            }))
            .on('data', (row: SwiftCodeCsvRow) => {
                if (!row['SWIFT CODE'] || !row['NAME'] || !row['COUNTRY ISO2 CODE'] || !row['COUNTRY NAME']) {
                    console.warn(`Skipping row due to missing essential data: ${JSON.stringify(row)}`);
                    return; // Skip this row
                }
               
                const swiftCode = row['SWIFT CODE'].trim().toUpperCase();
                const countryISO2 = row['COUNTRY ISO2 CODE'].trim().toUpperCase();
                const countryName = row['COUNTRY NAME'].trim().toUpperCase();
                const isHeadquarter = swiftCode.endsWith('XXX');
                const headquarterIdentifier = swiftCode.substring(0, 8);

                if (!swiftCodeRegex.test(swiftCode)) {
                    console.warn(`Skipping row due to invalid SWIFT code format: ${swiftCode} in row ${JSON.stringify(row)}`);
                    return; // Skip this row
                }
                if (!countryISO2Regex.test(countryISO2)) {
                    console.warn(`Skipping row due to invalid Country ISO2 code format: ${countryISO2} in row ${JSON.stringify(row)}`);
                    return; // Skip this row
                }

                const swiftCodeData = {
                    swiftCode: swiftCode,
                    bankName: row['NAME'].trim(),
                    address: row['ADDRESS']?.trim() ?? '',
                    countryISO2: countryISO2,
                    countryName: countryName,
                    isHeadquarter: isHeadquarter,
                    headquarterIdentifier: headquarterIdentifier,
                };
                results.push(swiftCodeData);
            })
            .on('end', async () => {
                console.log(`CSV file successfully processed. Found ${results.length} valid records.`);
                console.log('Starting database seeding...');

                let successCount = 0;
                let errorCount = 0;

                for (const data of results) {
                    try {
                        await prisma.swiftCode.upsert({
                            where: { swiftCode: data.swiftCode },
                            update: data, // Update existing record if swiftCode matches
                            create: data, // Create new record if swiftCode doesn't exist
                        });
                        successCount++;
                    } catch (error) {
                        console.error(`Failed to upsert record for SWIFT code ${data.swiftCode}:`, error);
                        errorCount++;
                    }
                }

                console.log(`Database seeding finished.`);
                console.log(`Successfully upserted: ${successCount} records.`);
                console.log(`Failed to upsert: ${errorCount} records.`);
                resolve();
            })
            .on('error', (error) => {
                console.error('Error reading CSV file:', error);
                reject(error);
            });
    });
}

seedDatabase()
    .catch((e) => {
        console.error('An error occurred during the seeding process:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        console.log('Prisma client disconnected.');
    });