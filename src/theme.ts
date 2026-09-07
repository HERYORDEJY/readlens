export const colors = {
    primary: "#208AEF",
    primaryPressed: "#1B72C6",
    danger: "#D92D20",
    background: "#FFFFFF",
    surface: "#F7F8FA",
    border: "#E4E7EC",
    text: "#101828",
    textMuted: "#667085",
    textInverse: "#FFFFFF",
    disabled: "#B4C7DA",
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
} as const;

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

export const typography = {
    title: { fontSize: 26, fontWeight: "700" },
    heading: { fontSize: 18, fontWeight: "600" },
    body: { fontSize: 15, fontWeight: "400" },
    label: { fontSize: 13, fontWeight: "600" },
    caption: { fontSize: 12, fontWeight: "400" },
} as const;
