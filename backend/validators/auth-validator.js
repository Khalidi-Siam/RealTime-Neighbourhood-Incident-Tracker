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

module.exports = {
    registerSchema,
    loginSchema
};