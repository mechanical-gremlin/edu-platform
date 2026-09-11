-- Add Monaco/Judge0 fields to Activity
ALTER TABLE "Activity" ADD COLUMN "starterCode" TEXT;
ALTER TABLE "Activity" ADD COLUMN "expectedOutput" TEXT;

-- Add admin roles to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'school_admin';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'system_admin';
