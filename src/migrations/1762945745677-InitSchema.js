"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitSchema1762945745677 = void 0;
class InitSchema1762945745677 {
    constructor() {
        this.name = 'InitSchema1762945745677';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "orgId" uuid NOT NULL, "name" character varying(200) NOT NULL, "key" character varying(50) NOT NULL, CONSTRAINT "UQ_project_org_key" UNIQUE ("orgId", "key"), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_project_org" ON "projects" ("orgId") `);
        await queryRunner.query(`CREATE TABLE "todo_dependencies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "todoId" uuid NOT NULL, "dependsOnTodoId" uuid NOT NULL, "dependsOnId" uuid, CONSTRAINT "UQ_dep_pair" UNIQUE ("todoId", "dependsOnTodoId"), CONSTRAINT "PK_5bb8d110ce8c84a6f2505b05c1e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_dep_depends_on" ON "todo_dependencies" ("dependsOnTodoId") `);
        await queryRunner.query(`CREATE TYPE "public"."todo_items_status_enum" AS ENUM('NEW', 'IN_PROGRESS', 'DONE', 'BLOCKED')`);
        await queryRunner.query(`CREATE TYPE "public"."todo_items_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH')`);
        await queryRunner.query(`CREATE TABLE "todo_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "orgId" uuid NOT NULL, "projectId" uuid NOT NULL, "title" character varying(300) NOT NULL, "description" text, "status" "public"."todo_items_status_enum" NOT NULL DEFAULT 'NEW', "dueAt" TIMESTAMP WITH TIME ZONE, "priority" "public"."todo_items_priority_enum" NOT NULL DEFAULT 'MEDIUM', "assigneeId" uuid, "version" integer NOT NULL, CONSTRAINT "PK_7ad331e73b03da55c148c2b5595" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_todo_assignee" ON "todo_items" ("assigneeId") `);
        await queryRunner.query(`CREATE INDEX "IX_todo_project" ON "todo_items" ("projectId") `);
        await queryRunner.query(`CREATE INDEX "IX_todo_org" ON "todo_items" ("orgId") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "orgId" uuid NOT NULL, "email" character varying(320) NOT NULL, "passwordHash" character varying(200) NOT NULL, "roles" text array NOT NULL DEFAULT '{}', CONSTRAINT "UQ_user_org_email" UNIQUE ("orgId", "email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_user_org" ON "users" ("orgId") `);
        await queryRunner.query(`CREATE TABLE "audit_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "orgId" uuid NOT NULL, "actorUserId" uuid, "action" character varying(200) NOT NULL, "entityType" character varying(100) NOT NULL, "entityId" uuid NOT NULL, "payload" jsonb NOT NULL, CONSTRAINT "PK_910f64d901a5c3e9878f0d4a407" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IX_audit_entity" ON "audit_events" ("entityType", "entityId") `);
        await queryRunner.query(`CREATE INDEX "IX_audit_org" ON "audit_events" ("orgId") `);
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(200) NOT NULL, CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_437871db24fde89a64c077162cb" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "todo_dependencies" ADD CONSTRAINT "FK_9bde100d4ae345b6dcb978b23fc" FOREIGN KEY ("todoId") REFERENCES "todo_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "todo_dependencies" ADD CONSTRAINT "FK_e964f8e8de3f320aa7f7f889c87" FOREIGN KEY ("dependsOnId") REFERENCES "todo_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "todo_items" ADD CONSTRAINT "FK_2079b9ead8537efeff1b8c48680" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "todo_items" ADD CONSTRAINT "FK_aac721bbb76dbbb6217bb27c47a" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_1890588e47e133fd85670f187d6" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_events" ADD CONSTRAINT "FK_a2b26df102c3d0f61d3ee31b960" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "audit_events" DROP CONSTRAINT "FK_a2b26df102c3d0f61d3ee31b960"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_1890588e47e133fd85670f187d6"`);
        await queryRunner.query(`ALTER TABLE "todo_items" DROP CONSTRAINT "FK_aac721bbb76dbbb6217bb27c47a"`);
        await queryRunner.query(`ALTER TABLE "todo_items" DROP CONSTRAINT "FK_2079b9ead8537efeff1b8c48680"`);
        await queryRunner.query(`ALTER TABLE "todo_dependencies" DROP CONSTRAINT "FK_e964f8e8de3f320aa7f7f889c87"`);
        await queryRunner.query(`ALTER TABLE "todo_dependencies" DROP CONSTRAINT "FK_9bde100d4ae345b6dcb978b23fc"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_437871db24fde89a64c077162cb"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
        await queryRunner.query(`DROP INDEX "public"."IX_audit_org"`);
        await queryRunner.query(`DROP INDEX "public"."IX_audit_entity"`);
        await queryRunner.query(`DROP TABLE "audit_events"`);
        await queryRunner.query(`DROP INDEX "public"."IX_user_org"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IX_todo_org"`);
        await queryRunner.query(`DROP INDEX "public"."IX_todo_project"`);
        await queryRunner.query(`DROP INDEX "public"."IX_todo_assignee"`);
        await queryRunner.query(`DROP TABLE "todo_items"`);
        await queryRunner.query(`DROP TYPE "public"."todo_items_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."todo_items_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IX_dep_depends_on"`);
        await queryRunner.query(`DROP TABLE "todo_dependencies"`);
        await queryRunner.query(`DROP INDEX "public"."IX_project_org"`);
        await queryRunner.query(`DROP TABLE "projects"`);
    }
}
exports.InitSchema1762945745677 = InitSchema1762945745677;
//# sourceMappingURL=1762945745677-InitSchema.js.map