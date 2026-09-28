import { getDomain } from "tldts";

function isIpAddress(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

export function normalizeDomain(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter a domain or URL.");
  }

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid domain or HTTP/HTTPS URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS websites are supported.");
  }

  if (url.username || url.password) {
    throw new Error("URLs containing usernames or passwords are not supported.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname) {
    throw new Error("Enter a valid website hostname.");
  }

  if (hostname === "localhost" || isIpAddress(hostname)) {
    return hostname;
  }

  const registrableDomain = getDomain(hostname, { allowPrivateDomains: true });
  if (!registrableDomain) {
    throw new Error("Enter a valid public website domain.");
  }

  return registrableDomain.toLowerCase();
}

export function hostMatchesDomain(hostname: string, domain: string): boolean {
  const normalizedHost = hostname.toLowerCase().replace(/\.$/, "");
  return normalizedHost === domain || normalizedHost.endsWith(`.${domain}`);
}
