import { describe, expect, it } from "vitest";
import { hostMatchesDomain, normalizeDomain } from "./domains";

describe("normalizeDomain", () => {
  it("normalizes a full URL to its registrable domain", () => {
    expect(normalizeDomain("https://www.facebook.com/messages?id=1")).toBe(
      "facebook.com",
    );
  });

  it("accepts a bare domain", () => {
    expect(normalizeDomain("X.COM")).toBe("x.com");
  });

  it("keeps localhost and IP hosts", () => {
    expect(normalizeDomain("http://localhost:3000/path")).toBe("localhost");
    expect(normalizeDomain("192.168.1.10")).toBe("192.168.1.10");
  });

  it("rejects unsupported schemes", () => {
    expect(() => normalizeDomain("chrome://extensions")).toThrow(
      "Only HTTP and HTTPS websites are supported.",
    );
  });
});

describe("hostMatchesDomain", () => {
  it("matches the exact domain and its subdomains", () => {
    expect(hostMatchesDomain("facebook.com", "facebook.com")).toBe(true);
    expect(hostMatchesDomain("m.facebook.com", "facebook.com")).toBe(true);
    expect(hostMatchesDomain("notfacebook.com", "facebook.com")).toBe(false);
  });
});
