import { prisma } from "@/lib/prisma";

function pair(u1: string, u2: string): [string, string] {
  return u1 < u2 ? [u1, u2] : [u2, u1];
}

export async function friendIdsOf(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ aId: userId }, { bId: userId }] },
    select: { aId: true, bId: true },
  });
  return rows.map((r) => (r.aId === userId ? r.bId : r.aId));
}

export async function friendsOf(userId: string) {
  const ids = await friendIdsOf(userId);
  return prisma.user.findMany({
    where: { id: { in: ids } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, image: true },
  });
}

export async function areFriends(u1: string, u2: string): Promise<boolean> {
  const [aId, bId] = pair(u1, u2);
  const row = await prisma.friendship.findUnique({ where: { aId_bId: { aId, bId } } });
  return row !== null;
}

export async function makeFriends(u1: string, u2: string) {
  if (u1 === u2) return;
  const [aId, bId] = pair(u1, u2);
  await prisma.friendship.upsert({
    where: { aId_bId: { aId, bId } },
    update: {},
    create: { aId, bId },
  });
}
