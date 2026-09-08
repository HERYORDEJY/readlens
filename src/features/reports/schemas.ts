import * as yup from "yup";

export const createReportSchema = yup.object({
  title: yup
    .string()
    .trim()
    .required("Give the report a title")
    .max(120, "Keep the title under 120 characters"),
  description: yup.string().trim().required("Describe what this report covers"),
});

export type CreateReportFormValues = yup.InferType<typeof createReportSchema>;
