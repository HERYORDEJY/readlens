import * as yup from "yup";

export const loginSchema = yup.object({
    email: yup
        .string()
        .trim()
        .required("Email is required")
        .email("Enter a valid email address"),
    password: yup.string().required("Password is required"),
});

export type LoginFormValues = yup.InferType<typeof loginSchema>;

export const otpSchema = yup.object({
    otp: yup
        .string()
        .trim()
        .required("Enter the code we emailed you")
        .matches(/^\d{4,8}$/, "The code should be 4-8 digits"),
});

export type OtpFormValues = yup.InferType<typeof otpSchema>;
