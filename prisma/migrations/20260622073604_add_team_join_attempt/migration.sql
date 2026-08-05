-- CreateTable
CREATE TABLE "TeamJoinAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamJoinAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamJoinAttempt_userId_createdAt_idx" ON "TeamJoinAttempt"("userId", "createdAt");
