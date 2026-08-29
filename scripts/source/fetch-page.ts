import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const USER_AGENT = "OfficeSales76PrivateDemo/1.0";
const DEFAULT_SOURCE_HOSTNAMES = ["офиспродаж76.рф"] as const;
const MAX_REDIRECTS = 5;
const MAX_PAGE_BYTES = 10 * 1024 * 1024;

export class SourcePolicyError extends Error {}
export class ResponseSizeError extends Error {}

export interface SourceNetworkOptions {
  allowedHostnames?: readonly string[];
  fetchImpl?: typeof fetch;
  resolveHost?: (hostname: string) => Promise<readonly string[]>;
}

function canonicalHostname(hostname: string): string {
  return new URL(`https://${hostname}`).hostname.toLowerCase().replace(/\.$/, "");
}

export function validateSourceUrl(
  value: string | URL,
  allowedHostnames: readonly string[] = DEFAULT_SOURCE_HOSTNAMES,
): URL {
  const url = value instanceof URL ? new URL(value.href) : new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SourcePolicyError(`Source URL must use HTTP(S): ${url.href}`);
  }
  if (url.username || url.password) {
    throw new SourcePolicyError(`Source URL must not contain credentials: ${url.href}`);
  }
  const allowed = new Set(allowedHostnames.map(canonicalHostname));
  if (!allowed.has(canonicalHostname(url.hostname))) {
    throw new SourcePolicyError(`Source host is not allowlisted: ${url.hostname}`);
  }
  if (url.port && !(
    (url.protocol === "https:" && url.port === "443")
    || (url.protocol === "http:" && url.port === "80")
  )) {
    throw new SourcePolicyError(`Source URL uses a non-default port: ${url.href}`);
  }
  return url;
}

function ipv4Number(address: string): number | undefined {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return undefined;
  }
  return (((octets[0]! << 24) >>> 0) + (octets[1]! << 16) + (octets[2]! << 8) + octets[3]!) >>> 0;
}

function ipv6Words(address: string): number[] | undefined {
  let normalized = address.toLowerCase().split("%")[0]!;
  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    const ipv4 = ipv4Number(normalized.slice(lastColon + 1));
    if (ipv4 === undefined) return undefined;
    normalized = `${normalized.slice(0, lastColon)}:${(ipv4 >>> 16).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }
  const halves = normalized.split("::");
  if (halves.length > 2) return undefined;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return undefined;
  const words = [
    ...left,
    ...Array.from({ length: halves.length === 2 ? missing : 0 }, () => "0"),
    ...right,
  ].map((part) => Number.parseInt(part || "0", 16));
  return words.length === 8 && words.every((word) => Number.isInteger(word) && word >= 0 && word <= 0xffff)
    ? words
    : undefined;
}

export function isUnsafeNetworkAddress(address: string): boolean {
  const family = isIP(address.split("%")[0]!);
  if (family === 4) {
    const value = ipv4Number(address)!;
    return value < 0x01000000
      || (value >= 0x0a000000 && value <= 0x0affffff)
      || (value >= 0x64400000 && value <= 0x647fffff)
      || (value >= 0x7f000000 && value <= 0x7fffffff)
      || (value >= 0xa9fe0000 && value <= 0xa9feffff)
      || (value >= 0xac100000 && value <= 0xac1fffff)
      || (value >= 0xc0a80000 && value <= 0xc0a8ffff)
      || value >= 0xe0000000;
  }
  if (family === 6) {
    const words = ipv6Words(address);
    if (!words) return true;
    const allZero = words.every((word) => word === 0);
    const loopback = words.slice(0, 7).every((word) => word === 0) && words[7] === 1;
    const uniqueLocal = (words[0]! & 0xfe00) === 0xfc00;
    const linkLocal = (words[0]! & 0xffc0) === 0xfe80;
    const multicast = (words[0]! & 0xff00) === 0xff00;
    const ipv4Mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
    const ipv4Compatible = words.slice(0, 6).every((word) => word === 0);
    if (ipv4Mapped || ipv4Compatible) {
      const mapped = `${words[6]! >>> 8}.${words[6]! & 255}.${words[7]! >>> 8}.${words[7]! & 255}`;
      return isUnsafeNetworkAddress(mapped);
    }
    return allZero || loopback || uniqueLocal || linkLocal || multicast;
  }
  return true;
}

async function defaultResolveHost(hostname: string): Promise<readonly string[]> {
  return (await lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address);
}

async function assertPublicResolution(
  hostname: string,
  resolveHost: NonNullable<SourceNetworkOptions["resolveHost"]>,
): Promise<void> {
  const addresses = await resolveHost(hostname);
  if (addresses.length === 0) throw new SourcePolicyError(`Source host did not resolve: ${hostname}`);
  const unsafe = addresses.find(isUnsafeNetworkAddress);
  if (unsafe) throw new SourcePolicyError(`Source host resolved to unsafe address ${unsafe}: ${hostname}`);
}

export async function fetchSourceResponse(
  value: string | URL,
  init: RequestInit = {},
  options: SourceNetworkOptions = {},
): Promise<Response> {
  const allowedHostnames = options.allowedHostnames ?? DEFAULT_SOURCE_HOSTNAMES;
  const resolveHost = options.resolveHost ?? defaultResolveHost;
  const fetchImpl = options.fetchImpl ?? fetch;
  let current = validateSourceUrl(value, allowedHostnames);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertPublicResolution(current.hostname, resolveHost);
    const response = await fetchImpl(current, { ...init, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new Error(`Redirect without Location from ${current.href}`);
    if (redirect === MAX_REDIRECTS) throw new Error(`Too many source redirects from ${value}`);
    current = validateSourceUrl(new URL(location, current), allowedHostnames);
  }
  throw new Error(`Too many source redirects from ${value}`);
}

export function sourceRequestHeaders(): Readonly<Record<string, string>> {
  return { "user-agent": USER_AGENT };
}

export async function readResponseBytes(
  response: Response,
  maximumBytes: number,
  description: string,
): Promise<Buffer> {
  const lengthLabel = response.headers.get("content-length");
  const contentLength = lengthLabel === null ? undefined : Number(lengthLabel);
  if (contentLength !== undefined && Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new ResponseSizeError(`${description} exceeds ${maximumBytes} bytes by Content-Length: ${contentLength}`);
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maximumBytes) {
        await reader.cancel();
        throw new ResponseSizeError(`${description} exceeds ${maximumBytes} streamed bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), received);
}

export async function fetchPage(
  url: string,
  attempts = 3,
  network: SourceNetworkOptions = {},
): Promise<string> {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError("attempts must be a positive integer");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchSourceResponse(url, {
        headers: sourceRequestHeaders(),
        signal: AbortSignal.timeout(20_000),
      }, network);
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return new TextDecoder().decode(await readResponseBytes(response, MAX_PAGE_BYTES, `Page ${url}`));
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }
  throw lastError;
}
