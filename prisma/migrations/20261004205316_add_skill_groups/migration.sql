-- CreateTable
CREATE TABLE "SkillGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGroupItem" (
    "groupId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillGroupItem_groupId_skillId_key" ON "SkillGroupItem"("groupId", "skillId");

-- AddForeignKey
ALTER TABLE "SkillGroup" ADD CONSTRAINT "SkillGroup_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGroupItem" ADD CONSTRAINT "SkillGroupItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SkillGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGroupItem" ADD CONSTRAINT "SkillGroupItem_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
