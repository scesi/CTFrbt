-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_success_createdAt_idx" ON "LoginAttempt"("ip", "success", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_alias_success_createdAt_idx" ON "LoginAttempt"("alias", "success", "createdAt");
