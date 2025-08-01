const { z } = require('zod');

const createCommentSchema = z.object({
    text: z
        .string({ required_error: "Comment text is required" }).trim()
        .min(1, { message: 'Comment cannot be empty' })
        .max(500, { message: 'Comment must not exceed 500 characters' })
});

const updateCommentSchema = z.object({
    text: z
        .string({ required_error: "Comment text is required" }).trim()
        .min(1, { message: 'Comment cannot be empty' })
        .max(500, { message: 'Comment must not exceed 500 characters' })
});

const commentParamsSchema = z.object({
    id: z
        .string({ required_error: "Comment ID is required" })
        .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid comment ID format" })
});

const incidentCommentParamsSchema = z.object({
    incidentId: z
        .string({ required_error: "Incident ID is required" })
        .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid incident ID format" })
});

module.exports = {
    createCommentSchema,
    updateCommentSchema,
    commentParamsSchema,
    incidentCommentParamsSchema
};
