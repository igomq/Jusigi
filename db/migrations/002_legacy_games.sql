ALTER TABLE casino_state MODIFY type ENUM('oddeven','slots','fiveask','nonsense') NOT NULL;
ALTER TABLE gambling_history MODIFY type ENUM('oddeven','slots','fiveask','nonsense') NOT NULL;
CREATE TABLE games (
 user_id VARCHAR(32) NOT NULL,
 type ENUM('fiveask','nonsense') NOT NULL,
 session_id CHAR(36) NOT NULL UNIQUE,
 bet BIGINT NOT NULL CHECK(bet >= 100000),
 state JSON NOT NULL,
 created_at DATETIME(3) NOT NULL,
 updated_at DATETIME(3) NOT NULL,
 PRIMARY KEY(user_id,type),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
