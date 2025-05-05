import express from 'express';
import * as swiftCodeController from '../controllers/swiftCodeController';

const router = express.Router();

// GET /v1/swift-codes/{swift-code} - Retrieve details for a single SWIFT code
router.get('/:swiftCode', swiftCodeController.getSingleSwiftCode);

// GET /v1/swift-codes/country/{countryISO2code} - Retrieve all SWIFT codes for a country
router.get('/country/:countryISO2code', swiftCodeController.getSwiftCodesForCountry);

// POST /v1/swift-codes - Create a new SWIFT code entry
router.post('/', swiftCodeController.createSingleSwiftCode);

// DELETE /v1/swift-codes/{swift-code} - Delete a specific SWIFT code
router.delete('/:swiftCode', swiftCodeController.deleteSingleSwiftCode);

export default router;