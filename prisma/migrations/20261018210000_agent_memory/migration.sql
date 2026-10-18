-- CreateTable
CREATE TABLE "AgentMemory" (
    "documentCode" TEXT NOT NULL,
    "recipe" JSONB,
    "recipeAt" TIMESTAMP(3),
    "successes" INTEGER NOT NULL DEFAULT 0,
    "lessons" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("documentCode")
);
