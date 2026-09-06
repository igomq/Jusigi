CREATE TABLE minigame_sessions (
 user_id VARCHAR(32) NOT NULL,
 type ENUM('arithmetic','memory') NOT NULL,
 session_id CHAR(36) NOT NULL UNIQUE,
 status ENUM('active','complete') NOT NULL,
 state JSON NOT NULL,
 started_at DATETIME(3) NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 available_at DATETIME(3) NOT NULL,
 finished_at DATETIME(3) NULL,
 PRIMARY KEY(user_id,type),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
