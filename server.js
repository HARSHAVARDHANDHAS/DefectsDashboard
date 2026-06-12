const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
// --- NEW: Import OPC UA ---
const { OPCUAClient, AttributeIds, DataType, ClientSubscription, TimestampsToReturn } = require('node-opcua');

const app = express();
app.use(cors());
app.use(express.json());

// Serve your image assets and index.html dashboard directly
app.use(express.static(path.join(__dirname)));

// 1. DATABASE CONFIGURATION
const dbConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'Admin@123',
  database: process.env.DB_NAME     || 'factory_defects_db',
  // TiDB Cloud requires SSL — enabled via DB_SSL=true env var
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false
};

// 2. LIVE IN-MEMORY TALLY COUNTS
let liveCounts = {
    channel1: {},
    channel2: {},
    channel3: {}
};

// Initialize empty counters based on parameter size
for (let i = 1; i <= 24; i++) liveCounts.channel1[`defect${i}`] = 0;
for (let i = 1; i <= 35; i++) liveCounts.channel2[`defect${i}`] = 0;
for (let i = 1; i <= 24; i++) liveCounts.channel3[`defect${i}`] = 0;

// Mapping to match frontend defect IDs to your exact SQL column names
const columnMappings = {
    channel1: {
        defect1: 'BLACK_MARK_IN_IR_BORE', defect2: 'BLACK_MARK_ON_OD', defect3: 'CIRCULAR_MARK_ON_OD',
        defect4: 'CUT_MARK_ON_IR_FACE', defect5: 'EXCESS_SEAL_PRESSING', defect6: 'FLINGER_MISSING',
        defect7: 'SEAL_MISSING', defect8: 'FLINGER_OUT', defect9: 'IR_FACE_UNCLEAN', defect10: 'RUSTY',
        defect11: 'LINE_MARK_ON_OD', defect12: 'SEAL_OUT', defect13: 'WRONG_MARKING', defect14: 'SEAL_BEND',
        defect15: 'FLAT_MARK_ON_OD', defect16: 'DENT_MARK_ON_IR', defect17: 'DOUBLE_MARKING',
        defect18: 'REVERSE_SEAL_FITMENT', defect19: 'SIMILAR_VARIANT', defect20: 'WITHOUT_MARKING',
        defect21: 'OD_GRINDING_MARK', defect22: 'BOTH_SIDE_ABS_SEAL', defect23: 'IR_CHATTER_MARK', defect24: 'ROLLER_MISSING'
    },
    channel2: {
        defect1: 'OR_FACE_UNCLEAR', defect2: 'OR_FACE_DAMAGED', defect3: 'FLOWERING_MARK', defect4: 'SHOE_ROLLER_MARK',
        defect5: 'OD_MARK', defect6: 'OR_FACE_MARK', defect7: 'OR_FACE_DENT', defect8: 'OR_GROOVE_DENT',
        defect9: 'UN_EVEN_OR_RADIUS', defect10: 'CAGEFILL', defect11: 'IR_FACE_DAMAGE', defect12: 'IR_FACE_UNCLEAR',
        defect13: 'DENT_IN_IR_FACE', defect14: 'IR_FACE_MARK', defect15: 'EXCESSIVE_BORE_RADIUS', defect16: 'BORE_RADIUS_MISSING',
        defect17: 'CAGE_CRACK', defect18: 'RUSTY_MARK', defect19: 'RIVET_HEAD_NOT_FORMED', defect20: 'IMPROPER_RIVETING',
        defect21: 'CAGE_MISSING', defect22: 'RIVET_MISSING', defect23: 'REVERSE_SEALING', defect24: 'UNPRESSED_SEAL',
        defect25: 'SEAL_DAMAGE', defect26: 'SHIELD_DENT', defect27: 'SHIELD_BEND', defect28: 'REVERSE_SHIELDING',
        defect29: 'DOUBLE_ETCHING', defect30: 'LETTERS_MISSING', defect31: 'BEARING_WITH_IR_CLIT_MARK',
        defect32: 'BEARING_WITH_IR_CHAMFER_MISSING', defect33: 'MARKING_MISSING', defect34: 'DEFECTIVE_RIVET_HEAD_FORM', defect35: 'OTHER_DEFECT'
    },
    channel3: {
        defect1: 'OR_OD_UNCLEAN', defect2: 'OR_FORG_DEFECT', defect3: 'OR_BURNING', defect4: 'OR_TRACK_UNCLEAN',
        defect5: 'OR_RUSTY_MARK', defect6: 'OR_CHAMF_N_OK', defect7: 'BORE_CHAMF_N_OK', defect8: 'BAD_MARKING',
        defect9: 'BURNING_MARK', defect10: 'FACE_MARK', defect11: 'ROLLER_DIMPLE_MISSING', defect12: 'ROLLER_DAMAGED',
        defect13: 'FORGING_DEFECT_ON_FACE', defect14: 'FACE_UNCLEAN', defect15: 'ROLLER_MATERIAL_DEFECT',
        defect16: 'DENT_MARK_ON_IR', defect17: 'INVERTED_ROLLER', defect18: 'FACE_CUT', defect19: 'BORE_BLACK',
        defect20: 'OR_BAD_ETCHING', defect21: 'OR_BAD_HONING', defect22: 'OR_OD_MARK', defect23: 'OR_FACE_MARK', defect24: 'ROLLER_MISSING'
    }
};

// --- NEW: KEPWARE OPC UA CONFIGURATION ---
const KEPWARE_ENDPOINT = process.env.OPCUA_ENDPOINT || "opc.tcp://127.0.0.1:49320"; 

// Complete tag catalog mapped to match your exact liveCounts IDs dynamically
const opcTagConfig = [
    // CHANNEL 1 TAG DEFINITIONS
    { nodeId: "ns=2;s=Channel1.Device1.BlackMarkIRBore", channel: "channel1", defectId: "defect1", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.BlackMarkOD", channel: "channel1", defectId: "defect2", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.CircularMarkOD", channel: "channel1", defectId: "defect3", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.CutMarkIRFace", channel: "channel1", defectId: "defect4", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.ExcessSealPressing", channel: "channel1", defectId: "defect5", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.FlingerMissing", channel: "channel1", defectId: "defect6", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.SealMissing", channel: "channel1", defectId: "defect7", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.FlingerOut", channel: "channel1", defectId: "defect8", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.IRFaceUnclean", channel: "channel1", defectId: "defect9", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.Rusty", channel: "channel1", defectId: "defect10", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.LineMarkOD", channel: "channel1", defectId: "defect11", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.SealOut", channel: "channel1", defectId: "defect12", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.WrongMarking", channel: "channel1", defectId: "defect13", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.SealBend", channel: "channel1", defectId: "defect14", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.FlatMarkOD", channel: "channel1", defectId: "defect15", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.DentMarkIR", channel: "channel1", defectId: "defect16", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.DoubleMarking", channel: "channel1", defectId: "defect17", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.ReverseSealFitment", channel: "channel1", defectId: "defect18", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.SimilarVariant", channel: "channel1", defectId: "defect19", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.WithoutMarking", channel: "channel1", defectId: "defect20", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.ODGrindingMark", channel: "channel1", defectId: "defect21", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.BothSideABSSeal", channel: "channel1", defectId: "defect22", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.IRChatterMark", channel: "channel1", defectId: "defect23", lastValue: false },
    { nodeId: "ns=2;s=Channel1.Device1.RollerMissing", channel: "channel1", defectId: "defect24", lastValue: false },

    // CHANNEL 2 TAG DEFINITIONS
    { nodeId: "ns=2;s=Channel2.Device1.ORFaceUnclear", channel: "channel2", defectId: "defect1", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.ORFaceDamaged", channel: "channel2", defectId: "defect2", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.FloweringMark", channel: "channel2", defectId: "defect3", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.ShoeRollerMark", channel: "channel2", defectId: "defect4", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.ODMark", channel: "channel2", defectId: "defect5", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.ORFaceMark", channel: "channel2", defectId: "defect6", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.ORFaceDent", channel: "channel2", defectId: "defect7", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.ORGrooveDent", channel: "channel2", defectId: "defect8", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.UnevenORRadius", channel: "channel2", defectId: "defect9", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.CageFill", channel: "channel2", defectId: "defect10", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.IRFaceDamage", channel: "channel2", defectId: "defect11", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.IRFaceUnclear", channel: "channel2", defectId: "defect12", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.DentInIRFace", channel: "channel2", defectId: "defect13", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.IRFaceMark", channel: "channel2", defectId: "defect14", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.ExcessiveBoreRadius", channel: "channel2", defectId: "defect15", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.BoreRadiusMissing", channel: "channel2", defectId: "defect16", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.CageCrack", channel: "channel2", defectId: "defect17", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.RustyMark", channel: "channel2", defectId: "defect18", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.RivetHeadNotFormed", channel: "channel2", defectId: "defect19", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.ImproperRiveting", channel: "channel2", defectId: "defect20", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.CageMissing", channel: "channel2", defectId: "defect21", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.RivetMissing", channel: "channel2", defectId: "defect22", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.ReverseSealing", channel: "channel2", defectId: "defect23", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.UnpressedSeal", channel: "channel2", defectId: "defect24", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.SealDamage", channel: "channel2", defectId: "defect25", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.ShieldDent", channel: "channel2", defectId: "defect26", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.ShieldBend", channel: "channel2", defectId: "defect27", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.ReverseShielding", channel: "channel2", defectId: "defect28", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.DoubleEtching", channel: "channel2", defectId: "defect29", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.LettersMissing", channel: "channel2", defectId: "defect30", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.IRClitMark", channel: "channel2", defectId: "defect31", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.IRChamferMissing", channel: "channel2", defectId: "defect32", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.MarkingMissing", channel: "channel2", defectId: "defect33", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.DefectiveRivetHeadForm", channel: "channel2", defectId: "defect34", lastValue: false },
    { nodeId: "ns=2;s=Channel2.Device1.OtherDefect", channel: "channel2", defectId: "defect35", lastValue: false },

    // CHANNEL 3 TAG DEFINITIONS
    { nodeId: "ns=2;s=Channel3.Device1.ORODUnclean", channel: "channel3", defectId: "defect1", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.ORForgDefect", channel: "channel3", defectId: "defect2", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.ORBurning", channel: "channel3", defectId: "defect3", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.ORTrackUnclean", channel: "channel3", defectId: "defect4", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.ORRustyMark", channel: "channel3", defectId: "defect5", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.ORChamfNOK", channel: "channel3", defectId: "defect6", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.BoreChamfNOK", channel: "channel3", defectId: "defect7", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.BadMarking", channel: "channel3", defectId: "defect8", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.BurningMark", channel: "channel3", defectId: "defect9", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.FaceMark", channel: "channel3", defectId: "defect10", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.RollerDimpleMissing", channel: "channel3", defectId: "defect11", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.RollerDamaged", channel: "channel3", defectId: "defect12", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.ForgingDefectOnFace", channel: "channel3", defectId: "defect13", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.FaceUnclean", channel: "channel3", defectId: "defect14", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.RollerMaterialDefect", channel: "channel3", defectId: "defect15", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.DentMarkOnIR", channel: "channel3", defectId: "defect16", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.InvertedRoller", channel: "channel3", defectId: "defect17", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.FaceCut", channel: "channel3", defectId: "defect18", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.BoreBlack", channel: "channel3", defectId: "defect19", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.ORBadEtching", channel: "channel3", defectId: "defect20", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.ORBadHoning", channel: "channel3", defectId: "defect21", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.ORODMark", channel: "channel3", defectId: "defect22", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.ORFaceMark", channel: "channel3", defectId: "defect23", lastValue: false },
    { nodeId: "ns=2;s=Channel3.Device1.RollerMissing", channel: "channel3", defectId: "defect24", lastValue: false }
];

async function initializeOPCUA() {
    const client = OPCUAClient.create({
        endpointMustExist: false,
        keepSessionAlive: true,
        connectionStrategy: {
            maxRetry: 100000,
            initialDelay: 2000,
            maxDelay: 10000
        }
    });

    try {
        console.log(`🔌 Connecting to Kepware OPC UA at: ${KEPWARE_ENDPOINT}...`);
        await client.connect(KEPWARE_ENDPOINT);
        console.log("🔗 OPC UA Client Connected Successfully!");

        const session = await client.createSession();
        console.log("🎫 OPC UA Session Created!");

        const subscription = ClientSubscription.create(session, {
            requestedPublishingInterval: 100, // Check for data changes every 100ms
            requestedLifetimeCount: 100,
            requestedMaxKeepAliveCount: 10,
            maxNotificationsPerPublish: 100,
            publishingEnabled: true,
            priority: 10
        });

        subscription.on("started", () => {
            console.log(`📡 OPC UA Subscription active. Monitoring ${opcTagConfig.length} industrial signals...`);
        });

        // Loop and establish active monitors for every mapped Kepware Node
        for (const tag of opcTagConfig) {
            const itemToMonitor = {
                nodeId: tag.nodeId,
                attributeId: AttributeIds.Value
            };
            const parameters = {
                samplingInterval: 50, // fast scan rate for short pulses
                discardOldest: true,
                queueSize: 1
            };

            const monitoredItem = await subscription.monitor(itemToMonitor, parameters, TimestampsToReturn.Both);

            monitoredItem.on("changed", (dataValue) => {
                const newValue = !!dataValue.value.value; // Coerce incoming value to Boolean safely
                const previousValue = tag.lastValue;
                tag.lastValue = newValue; // Update in-memory tag record state

                // Rising Edge Detection: strictly execute step logic only when transition reads false -> true
                if (newValue === true && previousValue === false) {
                    if (liveCounts[tag.channel] && liveCounts[tag.channel][tag.defectId] !== undefined) {
                        liveCounts[tag.channel][tag.defectId]++;
                        console.log(`⚡ [PLC PULSE] ${tag.channel.toUpperCase()} - ${tag.defectId} (${columnMappings[tag.channel][tag.defectId]}) incremented to: ${liveCounts[tag.channel][tag.defectId]}`);
                    }
                }
            });
        }
    } catch (err) {
        console.error("❌ Failed to bind or sustain Kepware OPC UA connection:", err.message);
        console.log("🔄 Retrying configuration lifecycle in 10 seconds...");
        setTimeout(initializeOPCUA, 10000);
    }
}

// 3. API ENDPOINTS FOR THE FRONTEND DASHBOARD
app.get('/api/counts', (req, res) => {
    const channel = req.query.channel || 'channel1';
    res.json({ counts: liveCounts[channel] });
});

app.post('/api/counts/:id/increment', (req, res) => {
    const { id } = req.params;
    const channel = req.query.channel || 'channel1';

    if (liveCounts[channel] && liveCounts[channel][id] !== undefined) {
        liveCounts[channel][id]++;
        res.json({ value: liveCounts[channel][id] });
    } else {
        res.status(400).json({ error: "Invalid defect ID or channel selection" });
    }
});

// Serve frontend main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 4. COMMIT HOURLY SNAPSHOTS TO DB
async function saveDataToSQL() {
    console.log("⏰ Initiating hourly snapshot commit to SQL Database...");
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const timestamp = new Date();
        const tableMap = {
            channel1: 'channel_1_hourly_logs',
            channel2: 'channel_2_hourly_logs',
            channel3: 'channel_3_hourly_logs'
        };
        for (const channel of ['channel1', 'channel2', 'channel3']) {
            const mappings = columnMappings[channel];
            const columns = ['DATE_TIME'];
            const values = [timestamp];
            Object.keys(liveCounts[channel]).forEach(defectId => {
                const dbColumnName = mappings[defectId];
                if (dbColumnName) {
                    columns.push(dbColumnName);
                    values.push(liveCounts[channel][defectId]);
                }
            });
            const placeholders = columns.map(() => '?').join(', ');
            const tableName = tableMap[channel];
            const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
            await connection.execute(query, values);
            console.log(`✅ Hourly snapshot saved for ${channel.toUpperCase()}`);
            // Reset tally only after successful hourly commit
            Object.keys(liveCounts[channel]).forEach(key => liveCounts[channel][key] = 0);
        }
    } catch (error) {
        console.error("❌ Database Error during hourly auto-commit:", error);
    } finally {
        if (connection) await connection.end();
    }
}

// 5. RESTORE COUNTS FROM DB ON STARTUP (survives page refreshes & server restarts)
async function loadCountsFromDB() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const tableMap = {
            channel1: 'channel_1_hourly_logs',
            channel2: 'channel_2_hourly_logs',
            channel3: 'channel_3_hourly_logs'
        };
        for (const channel of ['channel1', 'channel2', 'channel3']) {
            const tableName = tableMap[channel];
            const mappings = columnMappings[channel];
            const [rows] = await connection.execute(
                `SELECT * FROM ${tableName} ORDER BY DATE_TIME DESC LIMIT 1`
            );
            if (rows.length > 0) {
                const row = rows[0];
                Object.keys(mappings).forEach(defectId => {
                    const colName = mappings[defectId];
                    if (row[colName] !== undefined) {
                        liveCounts[channel][defectId] = row[colName];
                    }
                });
                console.log(`📦 Restored counts for ${channel.toUpperCase()} from DB`);
            } else {
                console.log(`ℹ️  No existing data for ${channel.toUpperCase()}, starting fresh`);
            }
        }
    } catch (err) {
        console.error('⚠️  Could not restore counts from DB (starting fresh):', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

// Run hourly snapshot every 1 hour (3600000 ms)
setInterval(saveDataToSQL, 3600000);

async function testDB() {
  try {
      const connection = await mysql.createConnection(dbConfig);
      console.log("✅ MySQL Connected Successfully");
      await connection.end();
  } catch (err) {
      console.error("❌ MySQL Connection Failed:", err);
  }
}

// Launch Node server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await testDB();
  await loadCountsFromDB(); // Restore last known counts from DB on startup
  initializeOPCUA();       // --- NEW: Start tracking Kepware OPC UA Pulses ---
  console.log(`🚀 System Online! Access Web Dashboard at: http://localhost:${PORT}`);
});
