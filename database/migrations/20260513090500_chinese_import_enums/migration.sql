ALTER TYPE "RoleCode" ADD VALUE IF NOT EXISTS 'manager';

ALTER TYPE "IssueTargetType" ADD VALUE IF NOT EXISTS 'company_department';
ALTER TYPE "IssueTargetType" ADD VALUE IF NOT EXISTS 'company_person';
