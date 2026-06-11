const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');

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
  console.log(`🚀 System Online! Access Web Dashboard at: http://localhost:${PORT}`);
});