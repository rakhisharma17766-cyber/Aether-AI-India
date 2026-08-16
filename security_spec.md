# Security Specification & Threat Model for Aether AI

## 1. Data Invariants
1. **User Invariant**: A user profile document in `/users/{userId}` can only be created, read, or updated by the authenticated user whose `request.auth.uid == userId`.
2. **Conversation Ownership**: A conversation in `/conversations/{conversationId}` must have `userId == request.auth.uid` (or authenticated owner). Only the owner can read, query, create, update, or delete their conversations.
3. **Immutability of Identifiers**: The `id`, `userId`, and `createdAt` properties are immutable once written.
4. **Validation Blueprints**: Every create/update operation must pass structural type, boundary, and length validations.
5. **PII Isolation**: User email and profile data are protected and never queryable by unauthenticated users or third parties.
6. **60-Day Retention Invariant**: Any records older than 60 days can be pruned by the owner.

## 2. The "Dirty Dozen" Threat Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read of User PII**: Request `GET /users/user_abc123` with no auth token.
2. **Cross-Tenant Conversation Hijacking**: User A (`auth.uid == user_a`) attempts to `GET /conversations/conv_user_b`.
3. **Ghost Field Injection (Shadow Write)**: User creates a conversation with extra unverified administrative property `{ isAdmin: true }`.
4. **Identity Spoofing**: User A creates a conversation setting `userId: "user_victim"`.
5. **Path Poisoning**: Malicious user passes a 10KB string as `conversationId` containing SQL/shell characters.
6. **Denial-of-Wallet Long String**: User posts a 50MB string in the `title` or `comment` field.
7. **Cross-Tenant Session Listing**: User attempts a list query on `/conversations` without filtering `userId == request.auth.uid`.
8. **Feedback PII Leak**: Unauthenticated user queries `/feedbacks` list to harvest submitter emails.
9. **Update-Gap Immutable Overwrite**: User attempts to update `userId` or `createdAt` on an existing conversation document.
10. **Array Explosion Attack**: Malicious payload submits an unbounded array of 100,000 items.
11. **Negative / NaN Rating Attack**: Malicious payload submits `rating: -9999` or `rating: "five"` in Feedback.
12. **Foreign Profile Mutation**: User B attempts `SET /users/user_a` to overwrite another user's display name.
