const {z} = require('zod');

const registerSchema = z.object({
    username: z
        .string({required_error: "username is required"}).trim()
        .min(3, {message: 'Username must be at least 3 characters long'})
        .max(20, {message: 'Username must not exceed 20 characters'}),
    email: z.email('Invalid email format'),
    phone: z
        .string({required_error: "phone is required"}).trim()
        .min(11, {message: 'Phone number must be 11 characters long'})
        .max(11, {message: 'Phone number must be 11 characters long'}),
    password: z
        .string({required_error: "password is required"}).trim()
        .min(6, {message: 'Password must be at least 6 characters long'})
        .max(20, {message: 'Password must not exceed 20 characters'}),
});

const loginSchema = z.object({
    email: z.email('Invalid email format'),
    password: z
        .string({required_error: "password is required"}).trim()
});

const updateProfileSchema = z.object({
    username: z
        .string().trim()
        .min(3, {message: 'Username must be at least 3 characters long'})
        .max(20, {message: 'Username must not exceed 20 characters'})
        .optional(),
    email: z.email('Invalid email format').optional(),
    phone: z
        .string().trim()
        .min(11, {message: 'Phone number must be 11 characters long'})
        .max(11, {message: 'Phone number must be 11 characters long'})
        .optional(),
    currentPassword: z.string().trim().optional(),
    newPassword: z
        .string().trim()
        .min(6, {message: 'Password must be at least 6 characters long'})
        .max(20, {message: 'Password must not exceed 20 characters'})
        .optional(),
}).refine((data) => {
    // If newPassword is provided, currentPassword must also be provided
    if (data.newPassword && !data.currentPassword) {
        return false;
    }
    return true;
}, {
    message: "Current password is required when changing password",
    path: ["currentPassword"]
});

module.exports = {
    registerSchema,
    loginSchema,
    updateProfileSchema
};