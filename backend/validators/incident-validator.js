const { z } = require('zod');

const createIncidentSchema = z.object({
    title: z
        .string({ required_error: "Title is required" }).trim()
        .min(3, { message: 'Title must be at least 3 characters long' })
        .max(100, { message: 'Title must not exceed 100 characters' }),
    description: z
        .string({ required_error: "Description is required" }).trim()
        .min(10, { message: 'Description must be at least 10 characters long' })
        .max(1000, { message: 'Description must not exceed 1000 characters' }),
    address: z
        .string().trim().optional(),
    lat: z
        .string()
        .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= -90 && parseFloat(val) <= 90, {
            message: "Latitude must be a valid number between -90 and 90"
        }).optional(),
    lng: z
        .string()
        .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= -180 && parseFloat(val) <= 180, {
            message: "Longitude must be a valid number between -180 and 180"
        }).optional(),
    category: z
        .enum(['Crime', 'Accident', 'Lost', 'Utility', 'Other'], {
            required_error: "Category is required",
            invalid_type_error: "Category must be one of: Crime, Accident, Lost, Utility, Other"
        })
});

const getIncidentParamsSchema = z.object({
    id: z
        .string({ required_error: "Incident ID is required" })
        .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid incident ID format" })
});

module.exports = {
    createIncidentSchema,
    getIncidentParamsSchema
};
