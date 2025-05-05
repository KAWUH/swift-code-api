import { Request, Response } from 'express';
import * as swiftCodeService from '../services/swiftCodeService';
import { createSwiftCodeSchema } from '../validation/swiftCodeSchemas';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Handles GET /v1/swift-codes/{swift-code}
 * Retrieves details for a specific SWIFT code.
 */
export const getSingleSwiftCode = async (req: Request, res: Response) => {
    const { swiftCode } = req.params;

    if (!swiftCode) {
        return res.status(400).json({ error: 'SWIFT code parameter is required.' });
    }

    try {
        const result = await swiftCodeService.getSwiftCodeDetails(swiftCode.toUpperCase());

        if (!result) {
            return res.status(404).json({ error: `SWIFT code '${swiftCode}' not found.` });
        }

        const responseData = {
            address: result.address ?? '',
            bankName: result.bankName,
            countryISO2: result.countryISO2,
            countryName: result.countryName,
            isHeadquarter: result.isHeadquarter,
            swiftCode: result.swiftCode,
            ...(result.branches && { branches: result.branches.map(branch => ({
                address: branch.address ?? '',
                bankName: branch.bankName,
                countryISO2: branch.countryISO2,
                isHeadquarter: branch.isHeadquarter,
                swiftCode: branch.swiftCode,
            }))})
        };


        res.status(200).json(responseData);
    } catch (error) {
        console.error(`Error fetching SWIFT code ${swiftCode}:`, error);

        res.status(500).json({ error: 'Internal server error while fetching SWIFT code details.' });
    }
};

/**
 * Handles GET /v1/swift-codes/country/{countryISO2code}
 * Retrieves all SWIFT codes for a specific country.
 */
export const getSwiftCodesForCountry = async (req: Request, res: Response) => {
    const { countryISO2code } = req.params;

    if (!countryISO2code || countryISO2code.length !== 2 || !/^[a-zA-Z]+$/.test(countryISO2code)) {
        return res.status(400).json({ error: 'Invalid Country ISO2 code format. Must be 2 letters.' });
    }

    try {
        const countryCodeUpper = countryISO2code.toUpperCase();

        const results = await swiftCodeService.getSwiftCodesByCountry(countryCodeUpper);

        // Determine countryName. If no results, the country isn't in our SWIFT data.
        const countryName = results.length > 0 ? results[0].countryName : "Country Not Found";

        const responseData = {
            countryISO2: countryCodeUpper, 
            countryName: countryName,
            swiftCodes: results.map(code => ({
                address: code.address ?? '',
                bankName: code.bankName,
                countryISO2: code.countryISO2,
                isHeadquarter: code.isHeadquarter,
                swiftCode: code.swiftCode,
            }))
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error(`Error fetching SWIFT codes for country ${countryISO2code}:`, error);

        res.status(500).json({ error: 'Internal server error while fetching SWIFT codes for country.' });
    }
};

/**
 * Handles POST /v1/swift-codes
 * Creates a new SWIFT code entry.
 */
export const createSingleSwiftCode = async (req: Request, res: Response) => {
    try {
        const validatedData = createSwiftCodeSchema.parse(req.body);

        const newCode = await swiftCodeService.createSwiftCode(validatedData);

        res.status(201).json({ message: `SWIFT code ${newCode.swiftCode} created successfully.` });

    } catch (error) {
        // Handle Zod validation errors
        if (error instanceof ZodError) {
            return res.status(400).json({ error: "Invalid input data.", details: error.errors });
        }
        // Handle Prisma unique constraint violation (duplicate swiftCode)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Assuming 'swiftCode' is the unique field causing the error
            const target = (error.meta?.target as string[])?.includes('swiftCode') ? 'SWIFT code' : 'field';
            return res.status(409).json({ error: `Conflict: ${target} already exists.` });
        }
        // Handle other potential errors
        console.error('Error creating SWIFT code:', error);
        res.status(500).json({ error: 'Internal server error while creating SWIFT code.' });
    }
};

/**
 * Handles DELETE /v1/swift-codes/{swift-code}
 * Deletes a specific SWIFT code.
 */
export const deleteSingleSwiftCode = async (req: Request, res: Response) => {
    const { swiftCode } = req.params;

    if (!swiftCode) {
        return res.status(400).json({ error: 'SWIFT code parameter is required.' });
    }

    try {
        const codeToDeleteUpper = swiftCode.toUpperCase();

        const deletedCode = await swiftCodeService.deleteSwiftCode(codeToDeleteUpper);

        res.status(200).json({ message: `SWIFT code ${deletedCode.swiftCode} deleted successfully.` });

    } catch (error) {
        // Handle Prisma 'Record to delete does not exist' error
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return res.status(404).json({ error: `SWIFT code '${swiftCode}' not found.` });
        }
        // Handle other potential errors
        console.error(`Error deleting SWIFT code ${swiftCode}:`, error);
        res.status(500).json({ error: 'Internal server error while deleting SWIFT code.' });
    }
};