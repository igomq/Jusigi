CREATE TABLE users (
 id VARCHAR(32) PRIMARY KEY,
 status ENUM('active','withdrawn') NOT NULL DEFAULT 'active',
 balance BIGINT NOT NULL DEFAULT 100000 CHECK (balance >= 0),
 credit TINYINT NOT NULL DEFAULT 2 CHECK (credit BETWEEN 1 AND 4),
 joined_at DATETIME(3) NOT NULL,
 credit_changed_at DATETIME(3) NOT NULL,
 economic_at DATETIME(3) NOT NULL,
 last_loan_at DATETIME(3) NULL,
 withdrawn_at DATETIME(3) NULL,
 donations BIGINT NOT NULL DEFAULT 0 CHECK (donations >= 0),
 INDEX (status, economic_at)
) ENGINE=InnoDB;
CREATE TABLE requests (
 id VARCHAR(100) PRIMARY KEY, user_id VARCHAR(32) NOT NULL,
 operation VARCHAR(64) NOT NULL, fingerprint CHAR(64) NOT NULL,
 result JSON NULL, created_at DATETIME(3) NOT NULL,
 INDEX (user_id, created_at)
) ENGINE=InnoDB;
CREATE TABLE credit_history (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(32) NOT NULL,
 old_credit TINYINT NOT NULL, new_credit TINYINT NOT NULL,
 reason VARCHAR(64) NOT NULL, created_at DATETIME(3) NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 INDEX (user_id, created_at)
) ENGINE=InnoDB;
CREATE TABLE economic_events (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(32) NOT NULL,
 request_id VARCHAR(100) NOT NULL, type VARCHAR(64) NOT NULL,
 balance_delta BIGINT NOT NULL, details JSON NOT NULL, created_at DATETIME(3) NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE RESTRICT,
 INDEX (user_id, type, created_at)
) ENGINE=InnoDB;
CREATE TABLE loans (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(32) NOT NULL,
 principal BIGINT NOT NULL CHECK (principal >= 0),
 balance BIGINT NOT NULL CHECK (balance >= 0),
 rate INT NOT NULL CHECK (rate > 0),
 opened_at DATETIME(3) NOT NULL, accrued_at DATETIME(3) NOT NULL, due_at DATETIME(3) NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 INDEX (user_id, opened_at), INDEX (user_id, due_at)
) ENGINE=InnoDB;
CREATE TABLE savings (
 user_id VARCHAR(32) PRIMARY KEY, principal BIGINT NOT NULL CHECK (principal >= 0),
 rate INT NOT NULL, started_at DATETIME(3) NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE term_deposits (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(32) NOT NULL,
 principal BIGINT NOT NULL CHECK (principal > 0), rate INT NOT NULL,
 period INT NOT NULL CHECK (period > 0), opened_at DATETIME(3) NOT NULL, matures_at DATETIME(3) NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 INDEX (user_id, matures_at)
) ENGINE=InnoDB;
CREATE TABLE stock_definitions (
 symbol VARCHAR(64) PRIMARY KEY, color VARCHAR(40) NOT NULL, initial_price BIGINT NOT NULL CHECK(initial_price > 0)
) ENGINE=InnoDB;
CREATE TABLE stock_prices (
 symbol VARCHAR(64) PRIMARY KEY, price BIGINT NOT NULL CHECK (price > 0), updated_at DATETIME(3) NOT NULL,
 FOREIGN KEY (symbol) REFERENCES stock_definitions(symbol) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE stock_history (
 symbol VARCHAR(64) NOT NULL, tick BIGINT NOT NULL, price BIGINT NOT NULL CHECK(price > 0), created_at DATETIME(3) NOT NULL,
 PRIMARY KEY (symbol, tick), FOREIGN KEY (symbol) REFERENCES stock_definitions(symbol) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE holdings (
 user_id VARCHAR(32) NOT NULL, symbol VARCHAR(64) NOT NULL,
 quantity BIGINT NOT NULL CHECK (quantity > 0), total_cost BIGINT NOT NULL CHECK (total_cost >= 0),
 PRIMARY KEY (user_id, symbol),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY (symbol) REFERENCES stock_definitions(symbol) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE stock_trades (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(32) NOT NULL, symbol VARCHAR(64) NOT NULL,
 request_id VARCHAR(100) NOT NULL UNIQUE, side ENUM('buy','sell') NOT NULL,
 quantity BIGINT NOT NULL, price BIGINT NOT NULL, cost BIGINT NOT NULL, fee BIGINT NOT NULL,
 item_effect BIGINT NOT NULL, realized BIGINT NOT NULL, credit TINYINT NOT NULL, created_at DATETIME(3) NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY (symbol) REFERENCES stock_definitions(symbol) ON DELETE RESTRICT,
 FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE RESTRICT,
 INDEX (user_id, created_at)
) ENGINE=InnoDB;
CREATE TABLE news (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, symbol VARCHAR(64) NOT NULL, sentiment VARCHAR(16) NOT NULL,
 title VARCHAR(200) NOT NULL, summary VARCHAR(1000) NOT NULL, tick BIGINT NOT NULL UNIQUE, created_at DATETIME(3) NOT NULL,
 FOREIGN KEY (symbol) REFERENCES stock_definitions(symbol) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE market_state (
 id TINYINT PRIMARY KEY CHECK(id = 1), tick BIGINT NOT NULL DEFAULT 0,
 last_update_at DATETIME(3) NOT NULL, next_update_at DATETIME(3) NOT NULL,
 interval_ms INT NOT NULL, news_id BIGINT NULL,
 FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE casino_state (
 user_id VARCHAR(32) NOT NULL, type ENUM('oddeven','slots') NOT NULL,
 last_played_at DATETIME(3) NOT NULL, PRIMARY KEY(user_id,type),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE gambling_history (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(32) NOT NULL, type ENUM('oddeven','slots') NOT NULL,
 bet BIGINT NOT NULL, gross BIGINT NOT NULL, tax BIGINT NOT NULL, net BIGINT NOT NULL,
 outcome JSON NOT NULL, created_at DATETIME(3) NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
 INDEX (user_id, created_at)
) ENGINE=InnoDB;
CREATE TABLE entitlements (
 user_id VARCHAR(32) NOT NULL, type VARCHAR(32) NOT NULL, purchased_at DATETIME(3) NOT NULL,
 PRIMARY KEY(user_id,type), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE item_definitions (
 id VARCHAR(64) PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE,
 type ENUM('consumable','passive') NOT NULL, effect ENUM('credit','loss','profit') NOT NULL,
 base_rate INT NOT NULL DEFAULT 0, uses INT NOT NULL DEFAULT 1 CHECK(uses > 0),
 price BIGINT NULL CHECK(price > 0), released BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB;
CREATE TABLE inventory (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(32) NOT NULL, item_id VARCHAR(64) NOT NULL,
 grade TINYINT NOT NULL CHECK(grade BETWEEN 0 AND 10), uses_left INT NOT NULL CHECK(uses_left > 0), acquired_at DATETIME(3) NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(item_id) REFERENCES item_definitions(id) ON DELETE RESTRICT,
 INDEX(user_id,item_id)
) ENGINE=InnoDB;
