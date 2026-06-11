-- ========================================================================
-- CHANNEL 1 SCHEMA (24 Defect Parameters)
-- Naming format matches: IMG_4620_1.jpg to IMG_4620_24.jpg
-- ========================================================================
CREATE TABLE channel_1_hourly_logs (
    DATE_TIME TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    BLACK_MARK_IN_IR_BORE             INT DEFAULT 0,
    BLACK_MARK_ON_OD                  INT DEFAULT 0,
    CIRCULAR_MARK_ON_OD               INT DEFAULT 0,
    CUT_MARK_ON_IR_FACE               INT DEFAULT 0,
    EXCESS_SEAL_PRESSING              INT DEFAULT 0,
    FLINGER_MISSING                   INT DEFAULT 0,
    SEAL_MISSING                      INT DEFAULT 0,
    FLINGER_OUT                       INT DEFAULT 0,
    IR_FACE_UNCLEAN                   INT DEFAULT 0,
    RUSTY                             INT DEFAULT 0,
    LINE_MARK_ON_OD                   INT DEFAULT 0,
    SEAL_OUT                          INT DEFAULT 0,
    WRONG_MARKING                     INT DEFAULT 0,
    SEAL_BEND                         INT DEFAULT 0,
    FLAT_MARK_ON_OD                   INT DEFAULT 0,
    DENT_MARK_ON_IR                   INT DEFAULT 0,
    DOUBLE_MARKING                    INT DEFAULT 0,
    REVERSE_SEAL_FITMENT              INT DEFAULT 0,
    SIMILAR_VARIANT                   INT DEFAULT 0,
    WITHOUT_MARKING                   INT DEFAULT 0,
    OD_GRINDING_MARK                  INT DEFAULT 0,
    BOTH_SIDE_ABS_SEAL                INT DEFAULT 0,
    IR_CHATTER_MARK                   INT DEFAULT 0,
    ROLLER_MISSING                    INT DEFAULT 0,
    PRIMARY KEY (DATE_TIME)
);

-- ========================================================================
-- CHANNEL 2 SCHEMA (35 Defect Parameters)
-- Naming format matches: defect-01.jpeg to defect-35.jpeg
-- ========================================================================
CREATE TABLE channel_2_hourly_logs (
    DATE_TIME TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    OR_FACE_UNCLEAR                   INT DEFAULT 0,
    OR_FACE_DAMAGED                   INT DEFAULT 0,
    FLOWERING_MARK                    INT DEFAULT 0,
    SHOE_ROLLER_MARK                  INT DEFAULT 0,
    OD_MARK                           INT DEFAULT 0,
    OR_FACE_MARK                      INT DEFAULT 0,
    OR_FACE_DENT                      INT DEFAULT 0,
    OR_GROOVE_DENT                    INT DEFAULT 0,
    UN_EVEN_OR_RADIUS                 INT DEFAULT 0,
    CAGEFILL                          INT DEFAULT 0,
    IR_FACE_DAMAGE                    INT DEFAULT 0,
    IR_FACE_UNCLEAR                   INT DEFAULT 0,
    DENT_IN_IR_FACE                   INT DEFAULT 0,
    IR_FACE_MARK                      INT DEFAULT 0,
    EXCESSIVE_BORE_RADIUS             INT DEFAULT 0,
    BORE_RADIUS_MISSING               INT DEFAULT 0,
    CAGE_CRACK                        INT DEFAULT 0,
    RUSTY_MARK                        INT DEFAULT 0,
    RIVET_HEAD_NOT_FORMED             INT DEFAULT 0,
    IMPROPER_RIVETING                 INT DEFAULT 0,
    CAGE_MISSING                      INT DEFAULT 0,
    RIVET_MISSING                     INT DEFAULT 0,
    REVERSE_SEALING                   INT DEFAULT 0,
    UNPRESSED_SEAL                    INT DEFAULT 0,
    SEAL_DAMAGE                       INT DEFAULT 0,
    SHIELD_DENT                       INT DEFAULT 0,
    SHIELD_BEND                       INT DEFAULT 0,
    REVERSE_SHIELDING                 INT DEFAULT 0,
    DOUBLE_ETCHING                    INT DEFAULT 0,
    LETTERS_MISSING                   INT DEFAULT 0,
    BEARING_WITH_IR_CLIT_MARK         INT DEFAULT 0,
    BEARING_WITH_IR_CHAMFER_MISSING   INT DEFAULT 0,
    MARKING_MISSING                   INT DEFAULT 0,
    DEFECTIVE_RIVET_HEAD_FORM         INT DEFAULT 0,
    OTHER_DEFECT                      INT DEFAULT 0,
    PRIMARY KEY (DATE_TIME)
);

-- ========================================================================
-- CHANNEL 3 SCHEMA (24 Defect Parameters)
-- Naming format matches: IMG_4619_1.jpg to IMG_4619_24.jpg
-- ========================================================================
CREATE TABLE channel_3_hourly_logs (
    DATE_TIME TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    OR_OD_UNCLEAN                     INT DEFAULT 0,
    OR_FORG_DEFECT                    INT DEFAULT 0,
    OR_BURNING                        INT DEFAULT 0,
    OR_TRACK_UNCLEAN                  INT DEFAULT 0,
    OR_RUSTY_MARK                     INT DEFAULT 0,
    OR_CHAMF_N_OK                     INT DEFAULT 0,
    BORE_CHAMF_N_OK                   INT DEFAULT 0,
    BAD_MARKING                       INT DEFAULT 0,
    BURNING_MARK                      INT DEFAULT 0,
    FACE_MARK                         INT DEFAULT 0,
    ROLLER_DIMPLE_MISSING             INT DEFAULT 0,
    ROLLER_DAMAGED                    INT DEFAULT 0,
    FORGING_DEFECT_ON_FACE            INT DEFAULT 0,
    FACE_UNCLEAN                      INT DEFAULT 0,
    ROLLER_MATERIAL_DEFECT            INT DEFAULT 0,
    DENT_MARK_ON_IR                   INT DEFAULT 0,
    INVERTED_ROLLER                   INT DEFAULT 0,
    FACE_CUT                          INT DEFAULT 0,
    BORE_BLACK                        INT DEFAULT 0,
    OR_BAD_ETCHING                    INT DEFAULT 0,
    OR_BAD_HONING                     INT DEFAULT 0,
    OR_OD_MARK                        INT DEFAULT 0,
    OR_FACE_MARK                      INT DEFAULT 0,
    ROLLER_MISSING                    INT DEFAULT 0,
    PRIMARY KEY (DATE_TIME)
);












