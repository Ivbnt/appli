import { describe, expect, it } from "vitest";
import { rateLimit } from "@/server/auth/rate-limit";
import { db, sql } from "@/server/db";
import { UserError } from "@/server/errors";
import { consumeAuthToken, createAuthToken, registerUser } from "@/server/services/auth";
import { evaluateBadges } from "@/server/services/badges";
import { createTrip } from "@/server/services/trips";
import { acceptInvitation, createInvitation, leaveWorkspace, previewInvitation } from "@/server/services/workspace";
import { createCouple, createUser } from "./helpers";

const tokenFrom = (url: string) => url.split("/invite/")[1]!;

describe("espace du couple", () => {
  it("invitation par lien : à usage unique et limitée à deux membres", async () => {
    const { user, workspaceId } = await createCouple("Alice");
    const partner = await createUser("Bruno");
    const third = await createUser("Chloé");

    const { url } = await createInvitation(workspaceId, user, null);
    const token = tokenFrom(url);
    expect((await previewInvitation(token))?.status).toBe("valid");
    await acceptInvitation(token, partner);
    expect(await db.count(sql`SELECT count(*) FROM workspace_members WHERE workspace_id = ${workspaceId}`)).toBe(2);

    // Le lien ne peut pas être réutilisé, et l'espace est complet.
    await expect(acceptInvitation(token, third)).rejects.toBeInstanceOf(UserError);
    await expect(createInvitation(workspaceId, user, null)).rejects.toThrow("complet");
  });

  it("une invitation nominative ne peut être acceptée que par la bonne adresse", async () => {
    const { user, workspaceId } = await createCouple("Alice");
    const intruder = await createUser("Intrus");
    const { url } = await createInvitation(workspaceId, user, "bonne-adresse@exemple.fr");
    await expect(acceptInvitation(tokenFrom(url), intruder)).rejects.toThrow("destinée");
  });

  it("une nouvelle invitation révoque la précédente", async () => {
    const { user, workspaceId } = await createCouple("Alice");
    const first = tokenFrom((await createInvitation(workspaceId, user, null)).url);
    await createInvitation(workspaceId, user, null);
    expect((await previewInvitation(first))?.status).toBe("used");
  });

  it("quitter l'espace : l'autre membre conserve les données ; seul, l'espace est supprimé", async () => {
    const { user, workspaceId } = await createCouple("Alice");
    const partner = await createUser("Bruno");
    await acceptInvitation(tokenFrom((await createInvitation(workspaceId, user, null)).url), partner);

    expect(await leaveWorkspace(user.id)).toEqual({ deletedWorkspace: false });
    expect(await db.maybe(sql`SELECT role FROM workspace_members WHERE user_id = ${partner.id}`)).toEqual({ role: "owner" });
    expect(await leaveWorkspace(partner.id)).toEqual({ deletedWorkspace: true });
    expect(await db.count(sql`SELECT count(*) FROM workspaces WHERE id = ${workspaceId}`)).toBe(0);
  });
});

describe("comptes", () => {
  it("refuse une adresse déjà utilisée", async () => {
    await registerUser({ name: "Alice", email: "doublon@exemple.fr", password: "0123456789" });
    await expect(registerUser({ name: "Alice", email: "doublon@exemple.fr", password: "0123456789" })).rejects.toBeInstanceOf(UserError);
  });

  it("les jetons de réinitialisation sont à usage unique", async () => {
    const user = await createUser("Alice");
    const token = await createAuthToken(user.id, "password_reset");
    expect(await consumeAuthToken(token, "password_reset")).toBe(user.id);
    expect(await consumeAuthToken(token, "password_reset")).toBeNull();
    // Un jeton d'un type ne vaut pas pour un autre.
    const verify = await createAuthToken(user.id, "email_verification");
    expect(await consumeAuthToken(verify, "password_reset")).toBeNull();
  });

  it("limite le nombre de tentatives (rate limiting)", async () => {
    const key = `test:${Date.now()}`;
    for (let i = 0; i < 3; i++) expect((await rateLimit(key, 3, 60)).allowed).toBe(true);
    const blocked = await rateLimit(key, 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("badges", () => {
  it("attribue « Premier voyage » une seule fois", async () => {
    const { user, workspaceId } = await createCouple("Alice");
    await createTrip(workspaceId, user.id, { title: "Lisbonne", destination: "Lisbonne", startDate: "2023-09-18", endDate: "2023-09-24", description: null, latitude: null, longitude: null });
    expect((await evaluateBadges(workspaceId)).map((b) => b.name)).toContain("Premier voyage");
    expect(await evaluateBadges(workspaceId)).toEqual([]);
  });
});
