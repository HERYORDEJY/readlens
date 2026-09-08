import { createReportSchema } from "../schemas";

const valid = { title: "Quarterly variance", description: "Reconciles forecast to actuals." };

describe("createReportSchema", () => {
  it("accepts a complete report", async () => {
    await expect(createReportSchema.validate(valid)).resolves.toMatchObject(valid);
  });

  it("trims surrounding whitespace", async () => {
    const result = await createReportSchema.validate({ title: "  Padded  ", description: " Body " });
    expect(result.title).toBe("Padded");
    expect(result.description).toBe("Body");
  });

  it.each([
    ["title", { ...valid, title: "   " }, "Give the report a title"],
    ["description", { ...valid, description: "" }, "Describe what this report covers"],
  ])("requires a %s", async (_field, input, message) => {
    await expect(createReportSchema.validate(input)).rejects.toThrow(message);
  });

  it("rejects an over-long title", async () => {
    await expect(
      createReportSchema.validate({ ...valid, title: "x".repeat(121) }),
    ).rejects.toThrow("Keep the title under 120 characters");
  });
});
