import { nextPageParam } from "../pagination";
import type { ReportListData } from "../types";

const page = (over: Partial<ReportListData["pagination"]>): ReportListData => ({
  reports: [],
  pagination: {
    current_page: 1,
    has_next: false,
    next_page: null,
    has_prev: false,
    prev_page: null,
    limit: 10,
    ...over,
  },
});

describe("nextPageParam", () => {
  it("returns the next page while more remain", () => {
    expect(nextPageParam(page({ has_next: true, next_page: 2 }))).toBe(2);
  });

  it("returns undefined on the last page, which stops infinite scroll", () => {
    expect(nextPageParam(page({ has_next: false, next_page: null }))).toBeUndefined();
  });

  it("trusts has_next over a stale next_page value", () => {
    // Guards against paging forever if the API ever sends both.
    expect(nextPageParam(page({ has_next: false, next_page: 5 }))).toBeUndefined();
  });

  it("stops rather than guessing when has_next is true but no page is given", () => {
    expect(nextPageParam(page({ has_next: true, next_page: null }))).toBeUndefined();
  });
});
