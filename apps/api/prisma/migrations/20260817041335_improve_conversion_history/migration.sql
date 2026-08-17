-- DropForeignKey
ALTER TABLE "Conversion" DROP CONSTRAINT "Conversion_userId_fkey";

-- AlterTable
ALTER TABLE "Conversion" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "originalFilename" TEXT;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
