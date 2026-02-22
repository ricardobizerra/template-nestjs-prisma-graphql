CREATE TYPE "public"."OAuthProvider" AS ENUM('GOOGLE', 'GITHUB');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('ADMIN', 'USER');--> statement-breakpoint
CREATE TABLE "OAuthAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "OAuthProvider" NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "PasswordResetToken" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"userId" text NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "PasswordResetToken_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"name" text NOT NULL,
	"image" text,
	"role" "Role" NOT NULL,
	"tokenVersion" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3),
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "OAuthAccount_provider_providerId_key" ON "OAuthAccount" USING btree ("provider","providerId");--> statement-breakpoint
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "OAuthAccount_deletedAt_idx" ON "OAuthAccount" USING btree ("deletedAt");--> statement-breakpoint
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "User_deletedAt_idx" ON "User" USING btree ("deletedAt");