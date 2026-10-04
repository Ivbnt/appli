import { describe, expect, it } from "vitest";
import { compile, sql } from "@/server/db/sql";

describe("sql", () => {
  it("transforme chaque valeur en paramètre (aucune concaténation)", () => {
    const evil = "x'; DROP TABLE users; --";
    const { text, values } = compile(sql`SELECT * FROM tasks WHERE workspace_id = ${"w1"} AND title = ${evil}`);
    expect(text).toBe("SELECT * FROM tasks WHERE workspace_id = $1 AND title = $2");
    expect(values).toEqual(["w1", evil]);
  });

  it("numérote correctement les fragments imbriqués", () => {
    const filter = sql`status = ${"done"}`;
    const { text, values } = compile(sql`SELECT 1 WHERE a = ${1} AND ${filter} AND b = ${2}`);
    expect(text).toBe("SELECT 1 WHERE a = $1 AND status = $2 AND b = $3");
    expect(values).toEqual([1, "done", 2]);
  });

  it("assemble des conditions avec sql.and en ignorant les vides", () => {
    const { text, values } = compile(sql`WHERE ${sql.and([sql`a = ${1}`, false, null, "", sql`b = ${2}`])}`);
    expect(text).toBe("WHERE (a = $1) AND (b = $2)");
    expect(values).toEqual([1, 2]);
    expect(compile(sql.and([])).text).toBe("TRUE");
  });

  it("sql.join et sql.raw", () => {
    const { text, values } = compile(sql`SELECT ${sql.join([sql`${1}`, sql`${2}`])} FROM ${sql.raw("tasks")}`);
    expect(text).toBe("SELECT $1, $2 FROM tasks");
    expect(values).toEqual([1, 2]);
  });

  it("convertit undefined en NULL", () => {
    expect(compile(sql`SELECT ${undefined}`).values).toEqual([null]);
  });
});
