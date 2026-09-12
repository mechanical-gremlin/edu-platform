-- CreateEnum
CREATE TYPE "GradeSource" AS ENUM ('manual', 'autograder');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "autograderCodeMatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autograderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autograderOutputMatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autograderReferenceOutput" TEXT,
ADD COLUMN     "autograderReferenceSolution" TEXT,
ADD COLUMN     "autograderTestCases" JSONB;

-- AlterTable
ALTER TABLE "Grade" ADD COLUMN     "autograderResult" JSONB,
ADD COLUMN     "gradingSource" "GradeSource" NOT NULL DEFAULT 'manual';

