import { db } from "@/db/client";
import { coffeeFaqs } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function getFaqs() {
  return db.select().from(coffeeFaqs).orderBy(desc(coffeeFaqs.createdAt));
}
