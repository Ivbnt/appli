import "server-only";
import { sql, type Tx } from "../db";

/** Toutes les clés de fichiers rattachées à un espace (pour une suppression complète). */
export async function collectWorkspaceFileKeys(tx: Tx, workspaceId: string): Promise<string[]> {
  const rows = await tx.many<{ key: string }>(sql`
    SELECT unnest(ARRAY[storage_key, thumbnail_key, preview_key]) AS key FROM photos WHERE workspace_id = ${workspaceId}
    UNION ALL
    SELECT document_key FROM reservations WHERE workspace_id = ${workspaceId} AND document_key IS NOT NULL
    UNION ALL
    SELECT cover_key FROM trips WHERE workspace_id = ${workspaceId} AND cover_key IS NOT NULL`);
  return rows.map((row) => row.key);
}
