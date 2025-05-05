import prisma from '../utils/prismaClient';
import { SwiftCode } from '@prisma/client'; // Import the generated type
import { CreateSwiftCodeInput } from '../validation/swiftCodeSchemas'; // Import input type

// --- Function for Endpoint 1 (GET /{swiftCode}) ---
/**
 * Fetches details for a single SWIFT code.
 * If the code represents a headquarter (ends in XXX), it also fetches its associated branches.
 * @param swiftCode The SWIFT code to retrieve.
 * @returns The SwiftCode object, potentially with a 'branches' array, or null if not found.
 */
export const getSwiftCodeDetails = async (swiftCode: string): Promise<(SwiftCode & { branches?: SwiftCode[] }) | null> => {
    const codeDetails = await prisma.swiftCode.findUnique({
        where: { swiftCode: swiftCode },
    });

    if (!codeDetails) {
        return null; // Not found
    }

    // If it's a headquarter, find its branches (codes starting with the same first 8 chars, but not the headquarter itself)
    if (codeDetails.isHeadquarter) {
        const headquarterIdentifier = swiftCode.substring(0, 8);
        const branches = await prisma.swiftCode.findMany({
            where: {
                headquarterIdentifier: headquarterIdentifier,
                swiftCode: {
                    not: swiftCode, // Exclude the headquarter code itself
                },
            },
            orderBy: {
                swiftCode: 'asc',
            },
        });
        return { ...codeDetails, branches: branches };
    }

    return codeDetails;
};

// --- Function for Endpoint 2 (GET /country/{countryISO2code}) ---
/**
 * Fetches all SWIFT codes (headquarters and branches) for a specific country.
 * @param countryISO2 The 2-letter ISO code of the country (case-insensitive).
 * @returns An array of SwiftCode objects for the specified country.
 */
export const getSwiftCodesByCountry = async (countryISO2: string): Promise<SwiftCode[]> => {
    // Fetch all codes matching the uppercase country ISO2 code
    const codes = await prisma.swiftCode.findMany({
        where: {
            countryISO2: countryISO2
        },
        orderBy: {
            swiftCode: 'asc',
        },
    });
    // Returns the full SwiftCode objects, controller will select fields
    return codes;
};

// --- Function for Endpoint 3 (POST /) ---
/**
 * Creates a new SWIFT code entry.
 * @param data The validated input data for the new SWIFT code.
 * @returns The newly created SwiftCode object.
 * @throws Prisma.PrismaClientKnownRequestError if a unique constraint violation occurs (e.g., duplicate swiftCode).
 */
export const createSwiftCode = async (data: CreateSwiftCodeInput): Promise<SwiftCode> => {
    const countryNameUpper = data.countryName.toUpperCase(); // Enforce uppercase
    const headquarterIdentifier = data.swiftCode.substring(0, 8);

    // Prisma will throw an error if swiftCode is not unique (P2002 code)
    const newCode = await prisma.swiftCode.create({
        data: {
            swiftCode: data.swiftCode,
            bankName: data.bankName,
            address: data.address ?? '',
            countryISO2: data.countryISO2,
            countryName: countryNameUpper,
            isHeadquarter: data.isHeadquarter,
            headquarterIdentifier: headquarterIdentifier,
        },
    });
    return newCode;
};

// --- Function for Endpoint 4 (DELETE /{swiftCode}) ---
/**
 * Deletes a SWIFT code entry by its code.
 * @param swiftCode The SWIFT code to delete.
 * @returns The deleted SwiftCode object.
 * @throws Prisma.PrismaClientKnownRequestError if the code to delete is not found (P2025 code).
 */
export const deleteSwiftCode = async (swiftCode: string): Promise<SwiftCode> => {
    // Prisma's delete throws an error if the record is not found (P2025)
    const deletedCode = await prisma.swiftCode.delete({
        where: { swiftCode: swiftCode },
    });
    return deletedCode;
};