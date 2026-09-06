UPDATE loans
SET due_at=GREATEST(DATE_ADD(opened_at, INTERVAL 7 DAY), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 DAY))
WHERE due_at IS NULL;
UPDATE item_definitions SET released=TRUE, price=10000000 WHERE id='hacker';
UPDATE item_definitions SET released=TRUE, price=2000000 WHERE id='positive';
UPDATE item_definitions SET released=TRUE, price=3000000 WHERE id='information';
