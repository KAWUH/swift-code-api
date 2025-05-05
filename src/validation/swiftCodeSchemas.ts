import { z } from 'zod';

// Schema for validating the POST request body
export const createSwiftCodeSchema = z.object({
    swiftCode: z.string().min(8).max(11).regex(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/, "Invalid SWIFT code format"),
    bankName: z.string().min(1, "Bank name cannot be empty"),
    address: z.string().optional(),
    // countryISO2: 2 uppercase letters
    countryISO2: z.string().length(2).regex(/^[A-Z]{2}$/, "Country ISO2 must be 2 uppercase letters"),
    // countryName: Non-empty string, enforce uppercase later
    countryName: z.string().min(1, "Country name cannot be empty"),

    isHeadquarter: z.boolean(),
});

// Type inferred from the schema
export type CreateSwiftCodeInput = z.infer<typeof createSwiftCodeSchema>;