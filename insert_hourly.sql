-- Snapshot insert for Channel 1 at 1:00 PM
INSERT INTO channel_1_hourly_logs (DATE_TIME, BLACK_MARK_IN_IR_BORE, BLACK_MARK_ON_OD, CIRCULAR_MARK_ON_OD)
VALUES ('2026-05-28 13:00:00', 8, 1, 1);

-- Snapshot insert for Channel 2 at 1:00 PM
INSERT INTO channel_2_hourly_logs (DATE_TIME, OR_FACE_UNCLEAR, OR_FACE_DAMAGED)
VALUES ('2026-05-28 13:00:00', 12, 0);

-- Snapshot insert for Channel 3 at 1:00 PM
INSERT INTO channel_3_hourly_logs (DATE_TIME, OR_OD_UNCLEAN, OR_FORG_DEFECT)
VALUES ('2026-05-28 13:00:00', 3, 2);