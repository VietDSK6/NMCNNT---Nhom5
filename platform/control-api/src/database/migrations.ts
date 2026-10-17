import type { DatabaseSync } from "node:sqlite";

interface Migration {
  readonly version: number;
  readonly sql: string;
}

const migrations: readonly Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );
      CREATE INDEX sessions_token_hash_idx ON sessions(token_hash);
      CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

      CREATE TABLE applications (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        route_path TEXT NOT NULL UNIQUE,
        health_path TEXT NOT NULL,
        version_path TEXT NOT NULL,
        desired_version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        actor_username TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        outcome TEXT NOT NULL,
        detail TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX audit_events_created_at_idx ON audit_events(created_at DESC);
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE operations (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
        action TEXT NOT NULL CHECK(action IN ('start', 'stop', 'restart', 'update')),
        requested_version TEXT,
        status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'succeeded', 'failed')),
        message TEXT,
        requested_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        started_at TEXT,
        finished_at TEXT
      );
      CREATE INDEX operations_created_at_idx ON operations(created_at DESC);
      CREATE UNIQUE INDEX operations_one_active_per_app_idx
        ON operations(application_id)
        WHERE status IN ('queued', 'running');
    `,
  },
  {
    version: 3,
    sql: `
      CREATE TABLE deployments (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
        source_id TEXT NOT NULL,
        repository_url TEXT NOT NULL,
        commit_sha TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'succeeded', 'failed')),
        version TEXT,
        image_reference TEXT,
        image_id TEXT,
        build_log TEXT,
        message TEXT,
        requested_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        started_at TEXT,
        finished_at TEXT
      );
      CREATE INDEX deployments_created_at_idx ON deployments(created_at DESC);
      CREATE UNIQUE INDEX deployments_one_active_per_app_idx
        ON deployments(application_id)
        WHERE status IN ('queued', 'running');
    `,
  },
  {
    version: 4,
    sql: `
      CREATE TABLE application_environment_variables (
        application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        encrypted_value TEXT NOT NULL,
        sensitive INTEGER NOT NULL CHECK(sensitive IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (application_id, key)
      );
      CREATE INDEX application_environment_variables_application_idx
        ON application_environment_variables(application_id);
    `,
  },
  {
    version: 5,
    sql: `
      CREATE TABLE releases (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
        origin TEXT NOT NULL CHECK(origin IN ('catalog', 'source', 'rollback')),
        version TEXT NOT NULL,
        image_reference TEXT NOT NULL,
        image_id TEXT NOT NULL,
        source_id TEXT,
        commit_sha TEXT,
        deployment_id TEXT UNIQUE REFERENCES deployments(id) ON DELETE SET NULL,
        rollback_of_release_id TEXT REFERENCES releases(id) ON DELETE SET NULL,
        requested_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX releases_application_created_idx
        ON releases(application_id, created_at DESC);

      INSERT INTO releases (
        id, application_id, origin, version, image_reference, image_id,
        source_id, commit_sha, deployment_id, requested_by, created_at
      )
      SELECT
        lower(hex(randomblob(16))), application_id, 'source', version,
        image_reference, image_id, source_id, commit_sha, id, requested_by,
        COALESCE(finished_at, created_at)
      FROM deployments
      WHERE status = 'succeeded'
        AND version IS NOT NULL
        AND image_reference IS NOT NULL
        AND image_id IS NOT NULL;
    `,
  },
  {
    version: 6,
    sql: `
      ALTER TABLE applications ADD COLUMN kind TEXT NOT NULL DEFAULT 'catalog'
        CHECK(kind IN ('catalog', 'git'));
      ALTER TABLE applications ADD COLUMN repository_url TEXT;
      ALTER TABLE applications ADD COLUMN default_branch TEXT;
      ALTER TABLE applications ADD COLUMN build_context TEXT;
      ALTER TABLE applications ADD COLUMN public_host TEXT;
      ALTER TABLE applications ADD COLUMN internal_port INTEGER NOT NULL DEFAULT 3000;
      CREATE UNIQUE INDEX applications_public_host_idx
        ON applications(public_host) WHERE public_host IS NOT NULL;
    `,
  },
];

export function runMigrations(database: DatabaseSync): void {
  const current = database.prepare("PRAGMA user_version").get() as { user_version: number };
  for (const migration of migrations) {
    if (current.user_version >= migration.version) continue;

    database.exec("BEGIN IMMEDIATE;");
    try {
      database.exec(migration.sql);
      database.exec(`PRAGMA user_version = ${migration.version};`);
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }
}
