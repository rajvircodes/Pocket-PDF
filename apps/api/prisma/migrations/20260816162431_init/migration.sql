-- CreateTable
CREATE TABLE "Conversion" (
    "id" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);
