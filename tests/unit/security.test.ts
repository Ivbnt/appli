import { describe, expect, it } from "vitest";
import { decrypt, encrypt, generateToken, hashToken, safeEqual } from "@/server/auth/crypto";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { safeRedirectPath } from "@/server/auth/request";
import { parsePlaylistId } from "@/server/integrations/spotify";
import { assertSafeKey, keyOwner, storageKeys } from "@/server/storage/keys";
import { signFileUrl, verifyFileUrl } from "@/server/storage/signing";

describe("mots de passe", () => {
  it("hache en Argon2id et vérifie", async () => {
    const hash = await hashPassword("un mot de passe solide");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash, "un mot de passe solide")).toBe(true);
    expect(await verifyPassword(hash, "mauvais")).toBe(false);
    expect(await verifyPassword("hash-invalide", "x")).toBe(false);
  });
});

describe("jetons et chiffrement", () => {
  it("génère des jetons uniques et stocke uniquement leur hash", () => {
    const a = generateToken();
    expect(a).not.toBe(generateToken());
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).not.toContain(a);
  });

  it("chiffre de façon authentifiée (toute altération est détectée)", () => {
    const encrypted = encrypt("jeton-oauth");
    expect(encrypted).not.toContain("jeton-oauth");
    expect(decrypt(encrypted)).toBe("jeton-oauth");
    const tampered = encrypted.slice(0, -2) + (encrypted.endsWith("A") ? "BB" : "AA");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("compare en temps constant", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("URLs de fichiers signées", () => {
  it("accepte une URL émise par le serveur et refuse toute modification", () => {
    const key = "w/ws-1/photos/p1/thumb.webp";
    const url = new URL(signFileUrl(key), "http://localhost");
    const exp = url.searchParams.get("exp");
    const sig = url.searchParams.get("sig");
    expect(verifyFileUrl(key, exp, sig, null)).toBe(true);
    expect(verifyFileUrl("w/ws-2/photos/p1/thumb.webp", exp, sig, null)).toBe(false);
    expect(verifyFileUrl(key, String(Number(exp) + 3600), sig, null)).toBe(false);
    expect(verifyFileUrl(key, exp, "faux", null)).toBe(false);
    expect(verifyFileUrl(key, "1", sig, null)).toBe(false);
  });

  it("refuse les clés de stockage dangereuses", () => {
    expect(() => assertSafeKey("../etc/passwd")).toThrow();
    expect(() => assertSafeKey("w/a/../../x")).toThrow();
    expect(() => assertSafeKey("/absolu")).toThrow();
    expect(() => assertSafeKey(storageKeys.photo("ws", "p", "thumb", "webp"))).not.toThrow();
    expect(keyOwner("w/ws-1/photos/x")).toEqual({ kind: "workspace", id: "ws-1" });
    expect(keyOwner("u/user-1/avatar.webp")).toEqual({ kind: "user", id: "user-1" });
    expect(keyOwner("x/y")).toBeNull();
  });
});

describe("redirections", () => {
  it("n'accepte que des chemins internes", () => {
    expect(safeRedirectPath("/tasks?x=1")).toBe("/tasks?x=1");
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
  });
});

describe("Spotify", () => {
  it("extrait l'identifiant d'une playlist", () => {
    expect(parsePlaylistId("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc")).toBe("37i9dQZF1DXcBWIGoYBM5M");
    expect(parsePlaylistId("https://open.spotify.com/intl-fr/playlist/37i9dQZF1DXcBWIGoYBM5M")).toBe("37i9dQZF1DXcBWIGoYBM5M");
    expect(parsePlaylistId("spotify:playlist:37i9dQZF1DXcBWIGoYBM5M")).toBe("37i9dQZF1DXcBWIGoYBM5M");
    expect(parsePlaylistId("https://evil.com/playlist/x")).toBeNull();
  });
});
